'use server';

import { createAdminClient } from '../supabase/admin';
import { revalidatePath } from 'next/cache';

export async function getMechanics(options?: {
  status?: string;
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
    .from('mechanics')
    .select(
      `
      *,
      profile:profiles!mechanics_profile_id_fkey (
        id,
        full_name,
        phone,
        avatar_url,
        is_active,
        preferred_language,
        created_at
      ),
      documents:mechanic_documents (
        id,
        document_type,
        status,
        created_at
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options?.search) {
    const s = options.search.trim();
    query = query.or(
      `profile.full_name.ilike.%${s}%,profile.phone.ilike.%${s}%,workshop_address.ilike.%${s}%`
    );
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching mechanics:', error);
    return { mechanics: [], count: 0, error: error.message };
  }

  return { mechanics: data || [], count: count || 0 };
}

export async function getMechanicById(id: string) {
  const adminClient = createAdminClient();

  const { data: mechanic, error } = await adminClient
    .from('mechanics')
    .select(
      `
      *,
      profile:profiles!mechanics_profile_id_fkey (
        id,
        full_name,
        phone,
        avatar_url,
        is_active,
        preferred_language,
        created_at
      ),
      skills:mechanic_skills (
        category_id,
        category:problem_categories (
          id,
          name_en,
          name_te,
          name_hi,
          icon
        )
      ),
      documents:mechanic_documents (
        id,
        document_type,
        document_number,
        file_path,
        file_url,
        status,
        rejection_reason,
        verified_by,
        verified_at,
        created_at
      ),
      balance:mechanic_balances (
        id,
        total_earnings,
        platform_fee_due,
        total_settled,
        balance_due,
        last_settlement_at
      )
    `
    )
    .eq('id', id)
    .single();

  if (error || !mechanic) {
    console.error('Error getting mechanic details:', error);
    return null;
  }

  // Generate private signed URLs for all documents
  const docsWithSignedUrls = await Promise.all(
    (mechanic.documents || []).map(async (doc: any) => {
      let signedUrl = doc.file_url || null;
      if (doc.file_path) {
        try {
          const { data: signData } = await adminClient.storage
            .from('mechanic-documents')
            .createSignedUrl(doc.file_path, 3600);
          if (signData?.signedUrl) {
            signedUrl = signData.signedUrl;
          }
        } catch (e) {
          console.error('Could not sign URL for doc:', doc.id, e);
        }
      }
      return {
        ...doc,
        signed_url: signedUrl,
      };
    })
  );

  // Fetch recent jobs for this mechanic
  const { data: recentJobs } = await adminClient
    .from('jobs')
    .select(
      `
      id,
      status,
      created_at,
      completed_at,
      request:repair_requests (
        category_id,
        description,
        tractor:tractors (make, model)
      ),
      customer:profiles!jobs_customer_id_fkey (full_name, phone)
    `
    )
    .eq('mechanic_id', id)
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    ...mechanic,
    documents: docsWithSignedUrls,
    recentJobs: recentJobs || [],
  };
}

export async function verifyMechanic(
  mechanicId: string,
  newStatus: 'approved' | 'rejected' | 'suspended',
  adminNotes?: string,
  adminUserId?: string
) {
  const adminClient = createAdminClient();

  // Fetch old data for audit
  const { data: oldMechanic } = await adminClient
    .from('mechanics')
    .select('status, admin_notes, is_verified')
    .eq('id', mechanicId)
    .single();

  const updates: Record<string, any> = {
    status: newStatus,
    admin_notes: adminNotes !== undefined ? adminNotes : oldMechanic?.admin_notes,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === 'approved') {
    updates.is_verified = true;
    updates.verified_at = new Date().toISOString();
    updates.approved_at = new Date().toISOString();
    if (adminUserId) updates.approved_by = adminUserId;
  } else if (newStatus === 'rejected') {
    updates.is_verified = false;
  }

  const { data, error } = await adminClient
    .from('mechanics')
    .update(updates)
    .eq('id', mechanicId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Audit log
  try {
    await adminClient.from('audit_logs').insert({
      user_id: adminUserId || null,
      action: `mechanic_status_${newStatus}`,
      entity_type: 'mechanic',
      entity_id: mechanicId,
      old_values: oldMechanic || null,
      new_values: updates,
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }

  // Notify the mechanic
  try {
    const title =
      newStatus === 'approved'
        ? 'Application Approved!'
        : newStatus === 'rejected'
        ? 'Application Rejected'
        : 'Account Suspended';
    const body =
      newStatus === 'approved'
        ? 'Your mechanic profile has been verified and approved. You can now toggle online and start receiving repair requests!'
        : newStatus === 'rejected'
        ? `Your mechanic registration was rejected. Reason: ${adminNotes || 'Verification criteria not met.'}`
        : `Your mechanic account has been suspended. Reason: ${adminNotes || 'Administrative review.'}`;

    await adminClient.from('notifications').insert({
      user_id: data.profile_id,
      title,
      body,
      type: 'system',
      data: { mechanic_id: mechanicId, status: newStatus, admin_notes: adminNotes || null },
    });
  } catch (notifErr) {
    console.error('Failed to notify mechanic of status change:', notifErr);
  }

  revalidatePath('/mechanics');
  revalidatePath(`/mechanics/${mechanicId}`);
  revalidatePath('/');

  return { success: true, mechanic: data };
}

export async function verifyDocument(
  documentId: string,
  mechanicId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string,
  adminUserId?: string
) {
  const adminClient = createAdminClient();

  const updates: Record<string, any> = {
    status,
    verified_at: new Date().toISOString(),
    verified_by: adminUserId || null,
    rejection_reason: status === 'rejected' ? rejectionReason || null : null,
  };

  const { error } = await adminClient
    .from('mechanic_documents')
    .update(updates)
    .eq('id', documentId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Audit log
  try {
    await adminClient.from('audit_logs').insert({
      user_id: adminUserId || null,
      action: `document_verification_${status}`,
      entity_type: 'mechanic_document',
      entity_id: documentId,
      new_values: { mechanicId, status, rejectionReason },
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }

  revalidatePath(`/mechanics/${mechanicId}`);
  return { success: true };
}
