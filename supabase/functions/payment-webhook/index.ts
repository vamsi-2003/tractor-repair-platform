// Supabase Edge Function: payment-webhook
// Secure Razorpay Webhook processor.
// 1. Validates HMAC SHA-256 signature using RAZORPAY_WEBHOOK_SECRET.
// 2. Enforces idempotent processing via payment_events table.
// 3. Updates payment, invoice, and job statuses upon 'payment.captured'.
// 4. Calculates platform commission & updates mechanic ledger balance.
// 5. Automatically generates 6-digit Finish Code for customer verification.

import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { generateRandomCode, hashCode, verifyRazorpaySignature } from '../_shared/crypto.ts';
import { getSupabaseAdminClient } from '../_shared/supabaseClient.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const supabase = getSupabaseAdminClient();
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || '';

    // 1. Verify HMAC SHA-256 Signature (if webhook secret is configured)
    if (webhookSecret) {
      if (!signature) {
        return errorResponse('Missing x-razorpay-signature header', 401);
      }
      const isSignatureValid = await verifyRazorpaySignature(rawBody, signature, webhookSecret);
      if (!isSignatureValid) {
        return errorResponse('Invalid webhook signature', 400);
      }
    } else {
      console.warn('RAZORPAY_WEBHOOK_SECRET not set; running in development bypass mode.');
    }

    // 2. Parse Webhook Event JSON
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return errorResponse('Malformed JSON in request body', 400);
    }

    const eventId = event.event_id || event.id || `evt_${Date.now()}`;
    const eventType = event.event || 'payment.captured';

    // 3. Idempotency Check using payment_events table
    const { data: existingEvent } = await supabase
      .from('payment_events')
      .select('id, processed_at')
      .eq('razorpay_event_id', eventId)
      .maybeSingle();

    if (existingEvent && existingEvent.processed_at) {
      // Event already processed; safe duplicate exit
      return jsonResponse({
        received: true,
        alreadyProcessed: true,
        eventId,
      });
    }

    // Record receipt of event in payment_events
    let paymentEventId = existingEvent?.id;
    if (!existingEvent) {
      const { data: insertedEvent } = await supabase
        .from('payment_events')
        .insert({
          event_type: eventType,
          razorpay_event_id: eventId,
          payload: event,
        })
        .select('id')
        .single();
      paymentEventId = insertedEvent?.id;
    }

    // 4. Handle 'payment.captured' or 'order.paid' events
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity || event.entity || event;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;
      const amountInRupees = paymentEntity.amount
        ? Number(paymentEntity.amount) / 100
        : Number(event.amount || 0);

      // Locate payments record by razorpay_order_id
      let paymentRecord: any = null;
      if (orderId) {
        const { data: pRec } = await supabase
          .from('payments')
          .select('id, invoice_id, amount, status')
          .eq('razorpay_order_id', orderId)
          .maybeSingle();
        paymentRecord = pRec;
      }

      // If not found by order_id, locate newest pending payment
      if (!paymentRecord && paymentEntity.notes?.invoiceId) {
        const { data: pRec } = await supabase
          .from('payments')
          .select('id, invoice_id, amount, status')
          .eq('invoice_id', paymentEntity.notes.invoiceId)
          .maybeSingle();
        paymentRecord = pRec;
      }

      let invoiceId = paymentRecord?.invoice_id || paymentEntity.notes?.invoiceId;

      // Update Payments record
      if (paymentRecord) {
        await supabase
          .from('payments')
          .update({
            status: 'captured',
            razorpay_payment_id: paymentId,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentRecord.id);
      } else if (invoiceId) {
        const { data: createdPayment } = await supabase
          .from('payments')
          .insert({
            invoice_id: invoiceId,
            method: 'online',
            amount: amountInRupees,
            currency: 'INR',
            status: 'captured',
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            paid_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        paymentRecord = createdPayment;
      }

      // If we have an invoice, update invoice and job
      if (invoiceId) {
        // Update Invoice status to 'paid'
        await supabase
          .from('invoices')
          .update({
            status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoiceId);

        // Fetch invoice details for job & platform commission
        const { data: invoice } = await supabase
          .from('invoices')
          .select(`
            id,
            job_id,
            total,
            repair_amount,
            visit_charge,
            jobs (
              id,
              status,
              customer_id,
              mechanic_id,
              customers (
                profile_id
              ),
              mechanics (
                id,
                profile_id
              )
            )
          `)
          .eq('id', invoiceId)
          .single();

        if (invoice && invoice.jobs) {
          const job = invoice.jobs as any;
          const jobId = job.id;
          const mechanicId = job.mechanic_id;
          const customerProfileId = job.customers?.profile_id;
          const mechanicProfileId = job.mechanics?.profile_id;

          // 5. Update Job status to 'paid'
          const oldJobStatus = job.status;
          await supabase
            .from('jobs')
            .update({
              status: 'paid',
              payment_received_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', jobId);

          await supabase.from('job_status_history').insert({
            job_id: jobId,
            old_status: oldJobStatus,
            new_status: 'paid',
            notes: `Payment captured online via Razorpay (Payment ID: ${paymentId})`,
          });

          // 6. Calculate Platform Commission
          // Fetch platform commission rate from app_settings (default 10%)
          const { data: commSetting } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'commission_rate')
            .maybeSingle();

          const commissionRate = commSetting?.value ? parseFloat(commSetting.value) : 10.0;
          const baseServiceAmount = Number(invoice.repair_amount || invoice.total);
          const commissionAmount = Math.round(baseServiceAmount * (commissionRate / 100) * 100) / 100;
          const mechanicNetEarnings = Math.max(0, amountInRupees - commissionAmount);

          // Insert or update platform commission
          await supabase.from('platform_commissions').upsert(
            {
              job_id: jobId,
              invoice_id: invoiceId,
              mechanic_id: mechanicId,
              commission_rate: commissionRate,
              commission_amount: commissionAmount,
              status: 'collected',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'job_id' }
          );

          // 7. Update Mechanic Balance
          const { data: balanceRecord } = await supabase
            .from('mechanic_balances')
            .select('*')
            .eq('mechanic_id', mechanicId)
            .maybeSingle();

          if (balanceRecord) {
            const newEarned = Number(balanceRecord.total_earned || 0) + mechanicNetEarnings;
            const newCommission = Number(balanceRecord.total_commission_due || 0) + commissionAmount;
            const newBalanceDue = Number(balanceRecord.balance_due || 0) + mechanicNetEarnings;

            await supabase
              .from('mechanic_balances')
              .update({
                total_earned: newEarned,
                total_commission_due: newCommission,
                balance_due: newBalanceDue,
                updated_at: new Date().toISOString(),
              })
              .eq('mechanic_id', mechanicId);
          } else {
            await supabase.from('mechanic_balances').insert({
              mechanic_id: mechanicId,
              total_earned: mechanicNetEarnings,
              total_commission_due: commissionAmount,
              total_settled: 0,
              balance_due: mechanicNetEarnings,
            });
          }

          // 8. Generate Secure Finish Code
          const finishCode = generateRandomCode(6);
          const finishHash = await hashCode(finishCode);
          const finishExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

          // Upsert finish code
          const { data: existingFinishCode } = await supabase
            .from('secure_codes')
            .select('id')
            .eq('job_id', jobId)
            .eq('code_type', 'finish')
            .eq('is_used', false)
            .maybeSingle();

          if (!existingFinishCode) {
            await supabase.from('secure_codes').insert({
              job_id: jobId,
              code_type: 'finish',
              code: finishCode,
              code_hash: finishHash,
              expires_at: finishExpiresAt,
              max_attempts: 3,
              attempts: 0,
              is_used: false,
            });
          }

          // 9. Send Push / In-App Notifications
          if (customerProfileId) {
            await supabase.from('notifications').insert({
              user_id: customerProfileId,
              type: 'payment',
              title: 'Payment Successful',
              body: `₹${amountInRupees.toFixed(2)} received successfully. Share finish code with your mechanic to conclude repair.`,
              data: {
                jobId,
                amount: amountInRupees,
                status: 'paid',
              },
            });
          }

          if (mechanicProfileId) {
            await supabase.from('notifications').insert({
              user_id: mechanicProfileId,
              type: 'payment',
              title: 'Customer Payment Received',
              body: `Online payment of ₹${amountInRupees.toFixed(2)} received. Enter finish code to close job.`,
              data: {
                jobId,
                amount: amountInRupees,
                status: 'paid',
              },
            });
          }

          // 10. Audit Log
          await supabase.from('audit_logs').insert({
            action: 'payment_captured',
            resource_type: 'payments',
            resource_id: paymentRecord?.id || null,
            new_values: {
              jobId,
              orderId,
              paymentId,
              amount: amountInRupees,
              commissionAmount,
              mechanicNetEarnings,
            },
          });
        }
      }
    }

    // 11. Mark event as processed in payment_events
    if (paymentEventId) {
      await supabase
        .from('payment_events')
        .update({
          processed_at: new Date().toISOString(),
          payment_id: paymentEventId,
        })
        .eq('id', paymentEventId);
    }

    return jsonResponse({
      received: true,
      event: eventType,
      processed: true,
    });
  } catch (err: any) {
    console.error('Unhandled error in payment-webhook:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
