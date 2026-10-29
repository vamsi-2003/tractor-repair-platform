// Supabase Edge Function: submit-quote
// Handles mechanic quote submission with visit fee, labor cost, parts estimate, and line items.
// Calculates totals, upserts quote and line items, creates draft invoice, and transitions job to 'quote_submitted'.

import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getSupabaseAdminClient, getUserFromRequest } from '../_shared/supabaseClient.ts';

interface QuoteLineItemInput {
  description: string;
  quantity?: number;
  unitPrice?: number;
  unit_price?: number;
  total?: number;
  item_type?: 'visit' | 'labor' | 'part' | 'other';
}

interface SubmitQuotePayload {
  jobId?: string;
  job_id?: string;
  visitFee?: number;
  visit_fee?: number;
  laborCost?: number;
  labor_cost?: number;
  labor_charge?: number;
  partsEstimate?: number;
  parts_estimate?: number;
  parts_cost?: number;
  notes?: string;
  mechanicNotes?: string;
  mechanic_notes?: string;
  lineItems?: QuoteLineItemInput[];
  line_items?: QuoteLineItemInput[];
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
    const body: SubmitQuotePayload = await req.json().catch(() => ({}));

    const jobId = body.jobId || body.job_id;
    if (!jobId) {
      return errorResponse('jobId is required', 400);
    }

    const visitFee = Math.max(0, Number(body.visitFee ?? body.visit_fee ?? 200));
    const laborCost = Math.max(0, Number(body.laborCost ?? body.labor_cost ?? body.labor_charge ?? 0));
    const partsEstimate = Math.max(0, Number(body.partsEstimate ?? body.parts_estimate ?? body.parts_cost ?? 0));
    const notes = (body.mechanicNotes || body.mechanic_notes || body.notes || '').trim();
    const lineItemsInput = body.lineItems || body.line_items || [];

    // 1. Authenticate mechanic
    const { user } = await getUserFromRequest(req);

    // 2. Fetch Job and Customer details
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select(`
        id,
        status,
        mechanic_id,
        customer_id,
        customers (
          profile_id
        ),
        mechanics (
          id,
          profile_id
        )
      `)
      .eq('id', jobId)
      .single();

    if (jobErr || !job) {
      return errorResponse('Job not found', 404);
    }

    // Verify mechanic authorization if user token is provided
    if (user) {
      const mechanicProfileId = (job as any).mechanics?.profile_id;
      if (mechanicProfileId && mechanicProfileId !== user.id) {
        // Check if admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role !== 'admin') {
          return errorResponse('Only the assigned mechanic can submit a quote for this job', 403);
        }
      }
    }

    // 3. Calculate Totals
    const total = Math.round((visitFee + laborCost + partsEstimate) * 100) / 100;

    // 4. Check for existing quote
    const { data: existingQuote } = await supabase
      .from('quotes')
      .select('id, version, status')
      .eq('job_id', jobId)
      .maybeSingle();

    let quoteId: string;
    let nextVersion = 1;

    if (existingQuote) {
      quoteId = existingQuote.id;
      nextVersion = (existingQuote.version || 1) + 1;

      const { error: quoteUpdateErr } = await supabase
        .from('quotes')
        .update({
          visit_fee: visitFee,
          labor_cost: laborCost,
          parts_estimate: partsEstimate,
          total,
          mechanic_notes: notes,
          status: 'pending',
          version: nextVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quoteId);

      if (quoteUpdateErr) {
        return errorResponse('Failed to update quote', 500, quoteUpdateErr.message);
      }

      // Delete existing line items to replace with updated list
      await supabase.from('quote_line_items').delete().eq('quote_id', quoteId);
    } else {
      const { data: newQuote, error: quoteInsertErr } = await supabase
        .from('quotes')
        .insert({
          job_id: jobId,
          mechanic_id: job.mechanic_id,
          visit_fee: visitFee,
          labor_cost: laborCost,
          parts_estimate: partsEstimate,
          total,
          mechanic_notes: notes,
          status: 'pending',
          version: 1,
        })
        .select('id')
        .single();

      if (quoteInsertErr || !newQuote) {
        return errorResponse('Failed to create quote', 500, quoteInsertErr?.message);
      }
      quoteId = newQuote.id;
    }

    // 5. Insert Line Items
    const formattedLineItems = lineItemsInput.length > 0
      ? lineItemsInput.map((item, index) => {
          const qty = Math.max(1, item.quantity || 1);
          const price = Math.max(0, Number(item.unitPrice ?? item.unit_price ?? 0));
          const lineTotal = item.total ? Number(item.total) : qty * price;
          return {
            quote_id: quoteId,
            description: item.description,
            quantity: qty,
            unit_price: price,
            total: lineTotal,
            sort_order: index + 1,
          };
        })
      : [
          {
            quote_id: quoteId,
            description: 'Mechanic Visit & Diagnostic Charge',
            quantity: 1,
            unit_price: visitFee,
            total: visitFee,
            sort_order: 1,
          },
          ...(laborCost > 0
            ? [
                {
                  quote_id: quoteId,
                  description: 'Repair Labor Service',
                  quantity: 1,
                  unit_price: laborCost,
                  total: laborCost,
                  sort_order: 2,
                },
              ]
            : []),
          ...(partsEstimate > 0
            ? [
                {
                  quote_id: quoteId,
                  description: 'Replacement Parts Estimate',
                  quantity: 1,
                  unit_price: partsEstimate,
                  total: partsEstimate,
                  sort_order: 3,
                },
              ]
            : []),
        ];

    if (formattedLineItems.length > 0) {
      await supabase.from('quote_line_items').insert(formattedLineItems);
    }

    // 6. Upsert Invoice Draft Record
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('job_id', jobId)
      .maybeSingle();

    if (existingInvoice) {
      await supabase
        .from('invoices')
        .update({
          quote_id: quoteId,
          visit_charge: visitFee,
          repair_amount: laborCost,
          parts_amount: partsEstimate,
          subtotal: total,
          total,
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingInvoice.id);
    } else {
      await supabase.from('invoices').insert({
        job_id: jobId,
        quote_id: quoteId,
        visit_charge: visitFee,
        repair_amount: laborCost,
        parts_amount: partsEstimate,
        subtotal: total,
        platform_fee: 0,
        total,
        status: 'pending',
      });
    }

    // 7. Transition Job Status to 'quote_submitted'
    const oldJobStatus = job.status;
    await supabase
      .from('jobs')
      .update({
        status: 'quote_submitted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    await supabase.from('job_status_history').insert({
      job_id: jobId,
      old_status: oldJobStatus,
      new_status: 'quote_submitted',
      changed_by: user?.id || null,
      notes: `Quote submitted: Total ₹${total.toFixed(2)} (v${nextVersion})`,
    });

    // 8. Send Notification to Customer
    const customerProfileId = (job as any).customers?.profile_id;
    if (customerProfileId) {
      await supabase.from('notifications').insert({
        user_id: customerProfileId,
        type: 'job_update',
        title: 'Quote Submitted for Approval',
        body: `The mechanic has submitted a repair estimate of ₹${total.toFixed(2)}. Please review and approve.`,
        data: {
          jobId,
          quoteId,
          total,
          status: 'quote_submitted',
        },
      });
    }

    // 9. Audit Log
    await supabase.from('audit_logs').insert({
      user_id: user?.id || null,
      action: 'quote_submitted',
      resource_type: 'quotes',
      resource_id: quoteId,
      new_values: {
        jobId,
        visitFee,
        laborCost,
        partsEstimate,
        total,
        version: nextVersion,
      },
    });

    return jsonResponse({
      success: true,
      message: 'Quote submitted successfully',
      quote: {
        id: quoteId,
        jobId,
        visitFee,
        laborCost,
        partsEstimate,
        total,
        notes,
        status: 'pending',
        version: nextVersion,
        lineItems: formattedLineItems,
      },
      jobStatus: 'quote_submitted',
    });
  } catch (err: any) {
    console.error('Unhandled error in submit-quote:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
