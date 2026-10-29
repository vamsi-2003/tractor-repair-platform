'use server';

import { createAdminClient } from '../supabase/admin';
import { revalidatePath } from 'next/cache';

export async function getDisputesAndTickets(options?: {
  status?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const adminClient = createAdminClient();
  const page = options?.page || 1;
  const limit = options?.limit || 25;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = adminClient
    .from('support_tickets')
    .select(
      `
      *,
      reporter:profiles!support_tickets_reporter_id_fkey (
        id,
        full_name,
        phone,
        role
      ),
      job:jobs (
        id,
        status,
        created_at,
        customer:customers (
          id,
          profile:profiles (full_name, phone)
        ),
        mechanic:mechanics (
          id,
          profile:profiles!mechanics_profile_id_fkey (full_name, phone)
        ),
        invoice:invoices (
          id,
          total,
          status
        ),
        payments:payments (
          id,
          amount,
          method,
          status,
          razorpay_payment_id
        )
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options?.priority && options.priority !== 'all') {
    query = query.eq('priority', options.priority);
  }

  if (options?.search) {
    const s = options.search.trim();
    query = query.or(
      `subject.ilike.%${s}%,description.ilike.%${s}%,category.ilike.%${s}%`
    );
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching support tickets:', error);
    return { tickets: [], count: 0, error: error.message };
  }

  return { tickets: data || [], count: count || 0 };
}

export async function resolveSupportTicket(
  ticketId: string,
  resolution: string,
  status: 'resolved' | 'closed' | 'in_progress',
  adminUserId?: string
) {
  const adminClient = createAdminClient();

  const updates: Record<string, any> = {
    status,
    resolution,
    updated_at: new Date().toISOString(),
  };

  if (status === 'resolved' || status === 'closed') {
    updates.resolved_at = new Date().toISOString();
    updates.assigned_to = adminUserId || null;
  }

  const { error } = await adminClient
    .from('support_tickets')
    .update(updates)
    .eq('id', ticketId);

  if (error) {
    return { success: false, error: error.message };
  }

  try {
    await adminClient.from('audit_logs').insert({
      user_id: adminUserId || null,
      action: `ticket_${status}`,
      entity_type: 'support_ticket',
      entity_id: ticketId,
      new_values: updates,
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }

  revalidatePath('/disputes');
  return { success: true };
}

export async function processRefund(
  paymentId: string,
  jobId: string,
  amount: number,
  reason: string,
  adminUserId?: string
) {
  const adminClient = createAdminClient();

  // Create refund record
  const { data: refund, error: refundErr } = await adminClient
    .from('refunds')
    .insert({
      payment_id: paymentId,
      job_id: jobId,
      amount,
      reason,
      status: 'processed',
      processed_at: new Date().toISOString(),
      gateway_refund_id: `rfnd_${Date.now()}`,
    })
    .select()
    .single();

  if (refundErr) {
    return { success: false, error: refundErr.message };
  }

  // Update payment status to refunded
  await adminClient
    .from('payments')
    .update({ payment_status: 'refunded', updated_at: new Date().toISOString() })
    .eq('id', paymentId);

  // Update job status if needed
  await adminClient
    .from('jobs')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', jobId);

  // Audit log
  try {
    await adminClient.from('audit_logs').insert({
      user_id: adminUserId || null,
      action: 'process_refund',
      entity_type: 'refund',
      entity_id: refund.id,
      new_values: { payment_id: paymentId, job_id: jobId, amount, reason },
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }

  revalidatePath('/disputes');
  revalidatePath('/financials');
  revalidatePath(`/jobs/${jobId}`);
  return { success: true, refund };
}
