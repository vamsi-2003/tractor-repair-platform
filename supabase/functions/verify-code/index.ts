// Supabase Edge Function: verify-code
// Validates start or finish codes entered by the mechanic.
// Rate limits attempts (max 3), enforces expiry, and transitions job status.

import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { verifyCodeHash } from '../_shared/crypto.ts';
import { getSupabaseAdminClient, getUserFromRequest } from '../_shared/supabaseClient.ts';

interface VerifyCodePayload {
  jobId?: string;
  job_id?: string;
  code?: string;
  codeType?: 'start' | 'finish';
  code_type?: 'start' | 'finish';
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
    const body: VerifyCodePayload = await req.json().catch(() => ({}));
    const jobId = body.jobId || body.job_id;
    const rawCode = body.code?.toString().trim();
    const codeType = body.codeType || body.code_type || 'start';

    if (!jobId) {
      return errorResponse('jobId is required', 400);
    }
    if (!rawCode) {
      return errorResponse('code is required', 400);
    }

    // 1. Get authenticated user context (if provided)
    const { user } = await getUserFromRequest(req);

    // 2. Fetch Job details
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select(`
        id,
        status,
        customer_id,
        mechanic_id,
        customers (
          profile_id
        ),
        mechanics (
          profile_id
        )
      `)
      .eq('id', jobId)
      .single();

    if (jobErr || !job) {
      return errorResponse('Job not found', 404);
    }

    // 3. Find the active secure code
    const { data: codeRecord, error: codeErr } = await supabase
      .from('secure_codes')
      .select('*')
      .eq('job_id', jobId)
      .eq('code_type', codeType)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeErr || !codeRecord) {
      return errorResponse(
        `No active ${codeType} code found for this job.`,
        404
      );
    }

    // 4. Check if max attempts (3) exceeded
    if (codeRecord.attempts >= codeRecord.max_attempts) {
      return errorResponse(
        `Maximum verification attempts (${codeRecord.max_attempts}) exceeded. Code is locked.`,
        429
      );
    }

    // 5. Check if expired
    const now = new Date();
    const expiresAt = new Date(codeRecord.expires_at);
    if (now > expiresAt) {
      return errorResponse(
        `This ${codeType} code has expired. Please request a new code.`,
        400
      );
    }

    // 6. Verify Code Hash
    let isValid = false;
    if (codeRecord.code && codeRecord.code.trim() === rawCode) {
      isValid = true;
    } else if (codeRecord.code_hash) {
      isValid = await verifyCodeHash(rawCode, codeRecord.code_hash);
    }

    if (!isValid) {
      const newAttempts = codeRecord.attempts + 1;
      await supabase
        .from('secure_codes')
        .update({ attempts: newAttempts })
        .eq('id', codeRecord.id);

      const attemptsRemaining = Math.max(0, codeRecord.max_attempts - newAttempts);

      await supabase.from('audit_logs').insert({
        user_id: user?.id || null,
        action: 'code_verification_failed',
        resource_type: 'secure_codes',
        resource_id: codeRecord.id,
        new_values: {
          jobId,
          codeType,
          attempts: newAttempts,
          attemptsRemaining,
        },
      });

      return errorResponse(
        `Invalid ${codeType} code. ${attemptsRemaining} attempt(s) remaining.`,
        400,
        { attemptsRemaining }
      );
    }

    // 7. Mark Code as Used
    await supabase
      .from('secure_codes')
      .update({
        is_used: true,
        used_at: now.toISOString(),
        verified_by: user?.id || null,
      })
      .eq('id', codeRecord.id);

    const customerProfileId = (job as any).customers?.profile_id;
    const mechanicProfileId = (job as any).mechanics?.profile_id;

    let targetJobStatus = job.status;

    // 8. Handle 'start' code logic
    if (codeType === 'start') {
      targetJobStatus = 'repair_in_progress';

      await supabase
        .from('jobs')
        .update({
          status: 'repair_in_progress',
          repair_started_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', jobId);

      await supabase.from('job_status_history').insert({
        job_id: jobId,
        old_status: job.status,
        new_status: 'repair_in_progress',
        changed_by: user?.id || null,
        notes: 'Start code verified by mechanic. Work began.',
      });

      if (customerProfileId) {
        await supabase.from('notifications').insert({
          user_id: customerProfileId,
          type: 'job_update',
          title: 'Repair Started',
          body: 'The mechanic has verified your start code and began repairing your tractor.',
          data: { jobId, status: 'repair_in_progress' },
        });
      }

      await supabase.from('audit_logs').insert({
        user_id: user?.id || null,
        action: 'start_code_verified',
        resource_type: 'jobs',
        resource_id: jobId,
        new_values: { status: 'repair_in_progress' },
      });
    }

    // 9. Handle 'finish' code logic
    if (codeType === 'finish') {
      targetJobStatus = 'completed';

      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: now.toISOString(),
          repair_completed_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', jobId);

      // If an invoice exists in pending status (e.g. cash payment), mark it paid
      const { data: invoice } = await supabase
        .from('invoices')
        .select('id, status')
        .eq('job_id', jobId)
        .maybeSingle();

      if (invoice && invoice.status === 'pending') {
        await supabase
          .from('invoices')
          .update({
            status: 'paid',
            updated_at: now.toISOString(),
          })
          .eq('id', invoice.id);
      }

      await supabase.from('job_status_history').insert({
        job_id: jobId,
        old_status: job.status,
        new_status: 'completed',
        changed_by: user?.id || null,
        notes: 'Finish code verified. Repair completed successfully.',
      });

      if (customerProfileId) {
        await supabase.from('notifications').insert({
          user_id: customerProfileId,
          type: 'job_update',
          title: 'Job Completed!',
          body: 'Your tractor repair has been marked complete. Please rate your mechanic.',
          data: { jobId, status: 'completed' },
        });
      }

      await supabase.from('audit_logs').insert({
        user_id: user?.id || null,
        action: 'finish_code_verified',
        resource_type: 'jobs',
        resource_id: jobId,
        new_values: { status: 'completed' },
      });
    }

    return jsonResponse({
      success: true,
      message: `${codeType === 'start' ? 'Start' : 'Finish'} code verified successfully.`,
      jobId,
      codeType,
      jobStatus: targetJobStatus,
    });
  } catch (err: any) {
    console.error('Unhandled error in verify-code:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
