// Supabase Edge Function: create-payment-order
// Creates a Razorpay order securely server-side for customer payment.
// Automatically falls back to deterministic test fixture if Razorpay keys are not configured.

import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getSupabaseAdminClient, getUserFromRequest } from '../_shared/supabaseClient.ts';

interface CreatePaymentOrderPayload {
  jobId?: string;
  job_id?: string;
  amount?: number;
  currency?: string;
  method?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const supabase = getSupabaseAdminClient();
    const body: CreatePaymentOrderPayload = await req.json().catch(() => ({}));

    const jobId = body.jobId || body.job_id;
    if (!jobId) {
      return errorResponse('jobId is required', 400);
    }

    // 1. Authenticate user
    const { user } = await getUserFromRequest(req);

    // 2. Fetch Job and Invoice
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select(`
        id,
        status,
        customer_id,
        mechanic_id,
        customers (
          profile_id
        )
      `)
      .eq('id', jobId)
      .single();

    if (jobErr || !job) {
      return errorResponse('Job not found', 404);
    }

    // Verify customer authorization if token is present
    if (user) {
      const customerProfileId = (job as any).customers?.profile_id;
      if (customerProfileId && customerProfileId !== user.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role !== 'admin') {
          return errorResponse('Forbidden. Only the customer of this job can create payment orders.', 403);
        }
      }
    }

    // 3. Find or create invoice for total amount
    let { data: invoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle();

    let payableAmount = body.amount ? Number(body.amount) : 0;

    if (invoice) {
      if (!payableAmount || payableAmount <= 0) {
        payableAmount = Number(invoice.total);
      }
    } else {
      // Check quote
      const { data: quote } = await supabase
        .from('quotes')
        .select('*')
        .eq('job_id', jobId)
        .maybeSingle();

      if (quote) {
        payableAmount = payableAmount > 0 ? payableAmount : Number(quote.total);

        const { data: newInvoice } = await supabase
          .from('invoices')
          .insert({
            job_id: jobId,
            quote_id: quote.id,
            visit_charge: quote.visit_fee,
            repair_amount: quote.labor_cost,
            parts_amount: quote.parts_estimate,
            subtotal: payableAmount,
            platform_fee: 0,
            total: payableAmount,
            status: 'pending',
          })
          .select()
          .single();

        invoice = newInvoice;
      }
    }

    if (!payableAmount || payableAmount <= 0) {
      payableAmount = 500; // Minimum default service charge in INR
    }

    const currency = (body.currency || 'INR').toUpperCase();
    const amountInPaise = Math.round(payableAmount * 100);

    // 4. Razorpay Configuration
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') || '';
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') || '';

    let orderId: string;
    let isTestFixture = false;

    if (razorpayKeyId && razorpayKeySecret) {
      // Call official Razorpay Orders API
      const authHeader = 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
      const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency,
          receipt: `rcpt_${jobId.replace(/-/g, '').slice(0, 14)}`,
          notes: {
            jobId,
            invoiceId: invoice?.id || null,
          },
        }),
      });

      if (!rzpResponse.ok) {
        const errorText = await rzpResponse.text();
        console.error('Razorpay API error response:', errorText);
        return errorResponse('Failed to create Razorpay payment order', 502, errorText);
      }

      const rzpData = await rzpResponse.json();
      orderId = rzpData.id;
    } else {
      // Deterministic test fixture for development & testing
      isTestFixture = true;
      orderId = `order_test_${Date.now()}_${jobId.replace(/-/g, '').slice(0, 6)}`;
    }

    // 5. Record created payment in database
    if (invoice?.id) {
      await supabase.from('payments').insert({
        invoice_id: invoice.id,
        method: 'online',
        amount: payableAmount,
        currency,
        status: 'created',
        razorpay_order_id: orderId,
      });
    }

    // 6. Update Job Status to payment_pending if applicable
    if (job.status === 'repair_completed' || job.status === 'quote_approved') {
      await supabase
        .from('jobs')
        .update({
          status: 'payment_pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    // 7. Audit Log
    await supabase.from('audit_logs').insert({
      user_id: user?.id || null,
      action: 'payment_order_created',
      resource_type: 'payments',
      resource_id: invoice?.id || null,
      new_values: {
        jobId,
        orderId,
        amount: payableAmount,
        amountInPaise,
        currency,
        isTestFixture,
      },
    });

    return jsonResponse({
      success: true,
      orderId,
      keyId: razorpayKeyId || 'rzp_test_fixture',
      amount: amountInPaise,
      currency,
      amountInRupees: payableAmount,
      invoiceId: invoice?.id || null,
      jobId,
      isTestFixture,
    });
  } catch (err: any) {
    console.error('Unhandled error in create-payment-order:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
