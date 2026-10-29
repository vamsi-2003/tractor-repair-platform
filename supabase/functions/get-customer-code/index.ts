// Supabase Edge Function: get-customer-code
// Securely returns the active plaintext start or finish code
// strictly to the authenticated customer who owns the job (or platform admin).

import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { generateRandomCode, hashCode } from '../_shared/crypto.ts';
import { getSupabaseAdminClient, getUserFromRequest } from '../_shared/supabaseClient.ts';

interface GetCodePayload {
  jobId?: string;
  job_id?: string;
  codeType?: 'start' | 'finish';
  code_type?: 'start' | 'finish';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const supabase = getSupabaseAdminClient();

    // Parse parameters from body or URL search params
    let jobId: string | null = null;
    let codeType: 'start' | 'finish' = 'start';

    if (req.method === 'POST') {
      const body: GetCodePayload = await req.json().catch(() => ({}));
      jobId = body.jobId || body.job_id || null;
      codeType = body.codeType || body.code_type || 'start';
    } else {
      const url = new URL(req.url);
      jobId = url.searchParams.get('jobId') || url.searchParams.get('job_id');
      const paramType = url.searchParams.get('codeType') || url.searchParams.get('code_type');
      if (paramType === 'finish') codeType = 'finish';
    }

    if (!jobId) {
      return errorResponse('jobId is required', 400);
    }

    // 1. Authenticate Caller
    const { user, error: authErr } = await getUserFromRequest(req);
    if (authErr || !user) {
      return errorResponse('Authentication required to view secure code', 401, authErr);
    }

    // 2. Fetch Job and verify ownership
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select(`
        id,
        status,
        customer_id,
        customers!inner (
          profile_id
        )
      `)
      .eq('id', jobId)
      .single();

    if (jobErr || !job) {
      return errorResponse('Job not found', 404);
    }

    // Verify user role or ownership
    const customerProfileId = (job as any).customers?.profile_id;
    const isOwner = customerProfileId === user.id;

    if (!isOwner) {
      // Check if caller is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return errorResponse(
          'Forbidden. Only the customer who requested this job can view the secure code.',
          403
        );
      }
    }

    // 3. Query Active Secure Code
    let { data: codeRecord } = await supabase
      .from('secure_codes')
      .select('*')
      .eq('job_id', jobId)
      .eq('code_type', codeType)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If finish code does not exist yet and job is in eligible status, generate on-demand
    if (!codeRecord && codeType === 'finish') {
      const eligibleStatuses = ['repair_completed', 'payment_pending', 'paid', 'work_completed'];
      if (eligibleStatuses.includes(job.status)) {
        const plainFinishCode = generateRandomCode(6);
        const codeHash = await hashCode(plainFinishCode);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

        const { data: inserted, error: insertErr } = await supabase
          .from('secure_codes')
          .insert({
            job_id: jobId,
            code_type: 'finish',
            code: plainFinishCode,
            code_hash: codeHash,
            expires_at: expiresAt,
            max_attempts: 3,
            attempts: 0,
            is_used: false,
          })
          .select()
          .single();

        if (!insertErr && inserted) {
          codeRecord = inserted;
        }
      }
    }

    if (!codeRecord) {
      return errorResponse(
        `No active ${codeType} code available for this job.`,
        404
      );
    }

    // Check expiration
    const isExpired = new Date() > new Date(codeRecord.expires_at);
    if (isExpired) {
      return errorResponse(
        `The ${codeType} code for this job has expired.`,
        410,
        { expired: true, expiresAt: codeRecord.expires_at }
      );
    }

    // Audit view
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'customer_code_viewed',
      resource_type: 'secure_codes',
      resource_id: codeRecord.id,
      new_values: { jobId, codeType },
    });

    return jsonResponse({
      success: true,
      jobId,
      codeType,
      code: codeRecord.code || null,
      expiresAt: codeRecord.expires_at,
      attemptsRemaining: Math.max(0, codeRecord.max_attempts - codeRecord.attempts),
    });
  } catch (err: any) {
    console.error('Unhandled error in get-customer-code:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
