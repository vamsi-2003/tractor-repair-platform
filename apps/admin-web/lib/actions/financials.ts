'use server';

import { createAdminClient } from '../supabase/admin';
import { revalidatePath } from 'next/cache';

export async function getFinancialSummary() {
  const adminClient = createAdminClient();

  // 1. Invoices aggregations
  const { data: invoices } = await adminClient
    .from('invoices')
    .select('id, total, platform_fee, status, created_at');

  const paidInvoices = (invoices || []).filter((inv) => inv.status === 'paid');
  const totalGrossVolume = paidInvoices.reduce(
    (sum, inv) => sum + (Number(inv.total) || 0),
    0
  );
  const totalCommission = paidInvoices.reduce(
    (sum, inv) => sum + (Number(inv.platform_fee) || 0),
    0
  );

  // 2. Payments (Online Razorpay vs Cash Breakdown)
  const { data: payments } = await adminClient
    .from('payments')
    .select('id, amount, method, status, paid_at');

  let totalOnlineAmount = 0;
  let totalCashAmount = 0;
  let totalOnlineCount = 0;
  let totalCashCount = 0;

  (payments || []).forEach((p) => {
    const amt = Number(p.amount) || 0;
    const isCash = p.method === 'cash';
    if (isCash) {
      totalCashAmount += amt;
      totalCashCount++;
    } else {
      totalOnlineAmount += amt;
      totalOnlineCount++;
    }
  });

  // 3. Mechanic Balances Aggregation
  const { data: balances } = await adminClient
    .from('mechanic_balances')
    .select('total_earnings, platform_fee_due, total_settled, balance_due');

  const totalPendingPayout = (balances || []).reduce(
    (sum, b) => sum + (Number(b.balance_due) || 0),
    0
  );
  const totalPlatformFeesDue = (balances || []).reduce(
    (sum, b) => sum + (Number(b.platform_fee_due) || 0),
    0
  );

  return {
    totalGrossVolume,
    totalCommission,
    totalOnlineAmount,
    totalCashAmount,
    totalOnlineCount,
    totalCashCount,
    totalPendingPayout,
    totalPlatformFeesDue,
  };
}

export async function getInvoices(options?: {
  status?: string;
  paymentMethod?: string;
  page?: number;
  limit?: number;
}) {
  const adminClient = createAdminClient();
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = adminClient
    .from('invoices')
    .select(
      `
      *,
      job:jobs (
        id,
        status,
        customer:customers (
          id,
          profile:profiles (full_name, phone)
        ),
        mechanic:mechanics (
          id,
          profile:profiles!mechanics_profile_id_fkey (full_name, phone)
        )
      ),
      payments:payments (
        id,
        amount,
        method,
        status,
        razorpay_payment_id,
        paid_at
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching invoices:', error);
    return { invoices: [], count: 0, error: error.message };
  }

  return { invoices: data || [], count: count || 0 };
}

export async function getMechanicLedger() {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('mechanic_balances')
    .select(
      `
      *,
      mechanic:mechanics (
        id,
        upi_id,
        bank_account_number,
        bank_ifsc,
        workshop_address,
        profile:profiles!mechanics_profile_id_fkey (
          id,
          full_name,
          phone
        )
      )
    `
    )
    .order('balance_due', { ascending: false });

  if (error) {
    console.error('Error fetching mechanic balances:', error);
    return [];
  }

  return data || [];
}

export async function getRecentSettlements() {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('settlements')
    .select(
      `
      *,
      mechanic:mechanics (
        id,
        profile:profiles!mechanics_profile_id_fkey (full_name, phone)
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching settlements:', error);
    return [];
  }

  return data || [];
}

export async function processBatchSettlements(
  settlementItems: { mechanicId: string; amount: number; payoutChannel?: string }[],
  adminUserId?: string
) {
  const adminClient = createAdminClient();
  const results = [];

  for (const item of settlementItems) {
    if (item.amount <= 0) continue;

    const refId = `SETTLE_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    // Create settlement record
    const { data: settlement, error } = await adminClient
      .from('settlements')
      .insert({
        mechanic_id: item.mechanicId,
        amount: item.amount,
        status: 'completed',
        payout_channel: item.payoutChannel || 'upi',
        reference_id: refId,
        settled_at: new Date().toISOString(),
        notes: 'Batch platform payout processed by admin',
      })
      .select()
      .single();

    if (!error && settlement) {
      // Update mechanic balance
      const { data: curBal } = await adminClient
        .from('mechanic_balances')
        .select('*')
        .eq('mechanic_id', item.mechanicId)
        .single();

      if (curBal) {
        const newSettled = (Number(curBal.total_settled) || 0) + item.amount;
        const newBalanceDue = Math.max(
          0,
          (Number(curBal.balance_due) || 0) - item.amount
        );

        await adminClient
          .from('mechanic_balances')
          .update({
            total_settled: newSettled,
            balance_due: newBalanceDue,
            last_settlement_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('mechanic_id', item.mechanicId);
      }

      // Audit log
      try {
        await adminClient.from('audit_logs').insert({
          user_id: adminUserId || null,
          action: 'batch_settlement_processed',
          entity_type: 'settlement',
          entity_id: settlement.id,
          new_values: {
            mechanic_id: item.mechanicId,
            amount: item.amount,
            reference_id: refId,
          },
        });
      } catch (err) {
        console.error('Audit log failed:', err);
      }

      results.push(settlement);
    }
  }

  revalidatePath('/financials');
  return { success: true, count: results.length };
}

export async function recordMechanicFeePayment(
  mechanicId: string,
  amount: number,
  method: 'cash' | 'upi' | 'bank_transfer' = 'cash',
  referenceNotes?: string,
  adminUserId?: string
) {
  if (amount <= 0) {
    return { success: false, error: 'Payment amount must be greater than zero.' };
  }

  const adminClient = createAdminClient();

  // 1. Fetch current mechanic balance
  const { data: curBal, error: balErr } = await adminClient
    .from('mechanic_balances')
    .select('*')
    .eq('mechanic_id', mechanicId)
    .single();

  if (balErr || !curBal) {
    return { success: false, error: 'Mechanic balance record not found.' };
  }

  const currentFeeDue = Number(curBal.platform_fee_due) || 0;
  const newFeeDue = Math.max(0, currentFeeDue - amount);

  // 2. Update mechanic balance
  const { error: updateErr } = await adminClient
    .from('mechanic_balances')
    .update({
      platform_fee_due: newFeeDue,
      updated_at: new Date().toISOString(),
    })
    .eq('mechanic_id', mechanicId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // 3. Record settlement / payment entry
  const refId = `FEE_RECV_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  await adminClient.from('settlements').insert({
    mechanic_id: mechanicId,
    amount,
    status: 'completed',
    payout_channel: method,
    reference_id: refId,
    settled_at: new Date().toISOString(),
    notes: `Fee payment received by platform from mechanic. ${referenceNotes || ''}`.trim(),
  });

  // 4. Audit log
  try {
    await adminClient.from('audit_logs').insert({
      user_id: adminUserId || null,
      action: 'mechanic_fee_payment_received',
      entity_type: 'mechanic_balance',
      entity_id: curBal.id,
      old_values: { platform_fee_due: currentFeeDue },
      new_values: {
        platform_fee_due: newFeeDue,
        amount_paid: amount,
        payment_method: method,
        notes: referenceNotes,
      },
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }

  revalidatePath('/financials');
  revalidatePath('/mechanics');
  revalidatePath(`/mechanics/${mechanicId}`);
  return { success: true, newFeeDue };
}

