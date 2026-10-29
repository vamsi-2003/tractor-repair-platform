'use server';

import { createAdminClient } from '../supabase/admin';
import { revalidatePath } from 'next/cache';

export async function getJobs(options?: {
  status?: string;
  search?: string;
  problemArea?: string;
  mechanicId?: string;
  date?: string;
  page?: number;
  limit?: number;
}) {
  const adminClient = createAdminClient();
  const page = options?.page || 1;
  const limit = options?.limit || 25;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = adminClient
    .from('jobs')
    .select(
      `
      *,
      customer:customers (
        id,
        profile:profiles (
          id,
          full_name,
          phone,
          avatar_url
        )
      ),
      mechanic:mechanics (
        id,
        workshop_address,
        rating_avg,
        profile:profiles!mechanics_profile_id_fkey (
          id,
          full_name,
          phone
        )
      ),
      request:repair_requests (
        id,
        category_id,
        description,
        address_text,
        latitude,
        longitude,
        category:problem_categories (
          id,
          name_en,
          name_te,
          name_hi,
          icon
        ),
        tractor:tractors (
          id,
          make,
          model,
          registration_number
        )
      ),
      final_invoice:invoices (
        id,
        total,
        status
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options?.mechanicId && options.mechanicId !== 'all') {
    query = query.eq('mechanic_id', options.mechanicId);
  }

  if (options?.date) {
    query = query
      .gte('created_at', `${options.date}T00:00:00.000Z`)
      .lte('created_at', `${options.date}T23:59:59.999Z`);
  }

  if (options?.search) {
    const s = options.search.trim();
    query = query.or(
      `id.ilike.%${s}%,customer.full_name.ilike.%${s}%,customer.phone.ilike.%${s}%`
    );
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching jobs:', error);
    return { jobs: [], count: 0, error: error.message };
  }

  return { jobs: data || [], count: count || 0 };
}

export async function getJobById(id: string) {
  const adminClient = createAdminClient();

  const { data: job, error } = await adminClient
    .from('jobs')
    .select(
      `
      *,
      customer:customers (
        id,
        profile:profiles (
          id,
          full_name,
          phone,
          avatar_url,
          preferred_language
        )
      ),
      mechanic:mechanics (
        id,
        status,
        workshop_address,
        experience_years,
        rating_avg,
        service_radius_km,
        profile:profiles!mechanics_profile_id_fkey (
          id,
          full_name,
          phone,
          avatar_url
        )
      ),
      request:repair_requests (
        id,
        category_id,
        description,
        voice_note_url,
        address_text,
        latitude,
        longitude,
        created_at,
        category:problem_categories (
          id,
          name_en,
          name_te,
          name_hi,
          icon
        ),
        tractor:tractors (
          id,
          make,
          model,
          year,
          registration_number
        ),
        media:request_media (
          id,
          media_type,
          file_path
        )
      ),
      quotes:quotes (
        id,
        visit_fee,
        labor_cost,
        parts_estimate,
        total,
        status,
        mechanic_notes,
        created_at
      ),
      invoice:invoices (
        id,
        visit_charge,
        repair_amount,
        parts_amount,
        subtotal,
        platform_fee,
        total,
        status,
        created_at
      ),
      payments:payments (
        id,
        amount,
        payment_method,
        payment_status,
        razorpay_payment_id,
        razorpay_order_id,
        cash_collected_by_mechanic,
        paid_at,
        created_at
      ),
      status_history:job_status_history (
        id,
        from_status,
        to_status,
        changed_by,
        notes,
        created_at
      ),
      secure_codes:secure_codes (
        id,
        code_type,
        code,
        attempts,
        is_used,
        verified_at,
        expires_at
      ),
      reviews:reviews (
        id,
        rating,
        tags,
        comment,
        created_at
      )
    `
    )
    .eq('id', id)
    .single();

  if (error || !job) {
    console.error('Error fetching job details:', error);
    return null;
  }

  return job;
}

export async function reassignJobMechanic(
  jobId: string,
  newMechanicId: string,
  reason?: string,
  adminUserId?: string
) {
  const adminClient = createAdminClient();

  // Get current job info
  const { data: job, error: jobErr } = await adminClient
    .from('jobs')
    .select('id, mechanic_id, status, request_id')
    .eq('id', jobId)
    .single();

  if (jobErr || !job) {
    return { success: false, error: 'Job not found' };
  }

  const oldMechanicId = job.mechanic_id;

  // Update job record
  const { error: updateErr } = await adminClient
    .from('jobs')
    .update({
      mechanic_id: newMechanicId,
      status: 'assigned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // Insert status history
  await adminClient.from('job_status_history').insert({
    job_id: jobId,
    from_status: job.status,
    to_status: 'assigned',
    changed_by: adminUserId || null,
    notes: `Admin reassigned mechanic. Previous mechanic: ${oldMechanicId}. Reason: ${
      reason || 'Administrative intervention'
    }`,
  });

  // Log audit
  try {
    await adminClient.from('audit_logs').insert({
      user_id: adminUserId || null,
      action: 'job_reassigned',
      entity_type: 'job',
      entity_id: jobId,
      old_values: { mechanic_id: oldMechanicId },
      new_values: { mechanic_id: newMechanicId, reason },
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }

  revalidatePath('/jobs');
  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

export async function cancelJob(
  jobId: string,
  reason: string,
  adminUserId?: string
) {
  const adminClient = createAdminClient();

  const { data: job } = await adminClient
    .from('jobs')
    .select('id, status, request_id')
    .eq('id', jobId)
    .single();

  const { error } = await adminClient
    .from('jobs')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      cancelled_by: adminUserId || 'admin',
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    return { success: false, error: error.message };
  }

  // If there's an associated repair_request, mark it cancelled too
  if (job?.request_id) {
    await adminClient
      .from('repair_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', job.request_id);
  }

  // Record status history
  await adminClient.from('job_status_history').insert({
    job_id: jobId,
    from_status: job?.status || null,
    to_status: 'cancelled',
    changed_by: adminUserId || null,
    notes: `Cancelled by admin. Reason: ${reason}`,
  });

  // Audit log
  try {
    await adminClient.from('audit_logs').insert({
      user_id: adminUserId || null,
      action: 'job_cancelled_by_admin',
      entity_type: 'job',
      entity_id: jobId,
      old_values: { status: job?.status },
      new_values: { status: 'cancelled', cancellation_reason: reason },
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }

  revalidatePath('/jobs');
  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

export async function updateJobStatus(
  jobId: string,
  newStatus: string,
  notes?: string,
  adminUserId?: string
) {
  const adminClient = createAdminClient();

  const { data: job } = await adminClient
    .from('jobs')
    .select('id, status')
    .eq('id', jobId)
    .single();

  const updates: Record<string, any> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === 'completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await adminClient
    .from('jobs')
    .update(updates)
    .eq('id', jobId);

  if (error) {
    return { success: false, error: error.message };
  }

  await adminClient.from('job_status_history').insert({
    job_id: jobId,
    from_status: job?.status || null,
    to_status: newStatus,
    changed_by: adminUserId || null,
    notes: notes || `Admin updated status to ${newStatus}`,
  });

  try {
    await adminClient.from('audit_logs').insert({
      user_id: adminUserId || null,
      action: 'job_status_updated_by_admin',
      entity_type: 'job',
      entity_id: jobId,
      old_values: { status: job?.status },
      new_values: updates,
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }

  revalidatePath('/jobs');
  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

export async function getApprovedMechanics() {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('mechanics')
    .select(
      `
      id,
      workshop_address,
      service_radius_km,
      rating_avg,
      profile:profiles (
        id,
        full_name,
        phone
      )
    `
    )
    .eq('status', 'approved');

  if (error) return [];
  return data || [];
}
