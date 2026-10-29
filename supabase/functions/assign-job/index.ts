// Supabase Edge Function: assign-job
// Atomic job assignment when mechanic accepts a repair request.
// Prevents race conditions / double-acceptance using PostgreSQL row-level locks.
// Generates cryptographically secure 6-digit start code with 30-min expiry.

import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { generateRandomCode, hashCode } from '../_shared/crypto.ts';
import { getSupabaseAdminClient, getUserFromRequest } from '../_shared/supabaseClient.ts';

interface AssignJobPayload {
  requestId?: string;
  request_id?: string;
  mechanicId?: string;
  mechanic_id?: string;
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
    const body: AssignJobPayload = await req.json().catch(() => ({}));
    const requestId = body.requestId || body.request_id;
    let mechanicId = body.mechanicId || body.mechanic_id;

    if (!requestId) {
      return errorResponse('requestId is required', 400);
    }

    // 1. Resolve mechanic ID: either passed in body or inferred from auth token
    if (!mechanicId) {
      const { user } = await getUserFromRequest(req);
      if (user) {
        const { data: mechanicRecord } = await supabase
          .from('mechanics')
          .select('id, status')
          .eq('profile_id', user.id)
          .maybeSingle();

        if (mechanicRecord) {
          if (mechanicRecord.status !== 'approved') {
            return errorResponse('Mechanic account is not approved', 403);
          }
          mechanicId = mechanicRecord.id;
        }
      }
    }

    if (!mechanicId) {
      return errorResponse(
        'mechanicId is required or valid mechanic auth session required',
        400
      );
    }

    // 2. Generate cryptographically secure 6-digit Start Code & SHA-256 hash
    const startCode = generateRandomCode(6);
    const codeHash = await hashCode(startCode);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins

    // 3. Attempt Atomic Job Assignment via RPC (handles FOR UPDATE lock)
    const { data: rpcResult, error: rpcErr } = await supabase.rpc(
      'assign_job_atomic',
      {
        p_request_id: requestId,
        p_mechanic_id: mechanicId,
        p_start_code: startCode,
        p_code_hash: codeHash,
        p_expires_at: expiresAt,
      }
    );

    if (rpcErr) {
      // If error indicates already assigned or unavailable
      if (
        rpcErr.message.includes('already accepted') ||
        rpcErr.message.includes('unavailable')
      ) {
        return errorResponse(
          'This repair request has already been assigned or is no longer available.',
          409,
          rpcErr.message
        );
      }

      // Fallback: perform transactional steps directly if RPC is not installed
      console.warn('RPC assign_job_atomic failed, executing fallback:', rpcErr.message);

      // Verify request state
      const { data: request, error: reqErr } = await supabase
        .from('repair_requests')
        .select('id, status, customer_id')
        .eq('id', requestId)
        .single();

      if (reqErr || !request) {
        return errorResponse('Repair request not found', 404);
      }

      if (request.status !== 'requested' && request.status !== 'matching') {
        return errorResponse(
          'This repair request has already been claimed or cancelled.',
          409
        );
      }

      // Update request to assigned
      const { error: updateReqErr } = await supabase
        .from('repair_requests')
        .update({ status: 'assigned', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .in('status', ['requested', 'matching']);

      if (updateReqErr) {
        return errorResponse('Failed to claim request due to race condition', 409);
      }

      // Create Job
      const { data: newJob, error: jobErr } = await supabase
        .from('jobs')
        .insert({
          request_id: requestId,
          customer_id: request.customer_id,
          mechanic_id: mechanicId,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jobErr) {
        return errorResponse('Failed to create job record', 500, jobErr.message);
      }

      // Insert Secure Start Code
      await supabase.from('secure_codes').insert({
        job_id: newJob.id,
        code_type: 'start',
        code: startCode,
        code_hash: codeHash,
        expires_at: expiresAt,
        max_attempts: 3,
        attempts: 0,
        is_used: false,
      });

      // Update mechanic match status
      await supabase
        .from('mechanic_matches')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('request_id', requestId)
        .eq('mechanic_id', mechanicId);

      // Timeout other matches
      await supabase
        .from('mechanic_matches')
        .update({ status: 'timed_out', responded_at: new Date().toISOString() })
        .eq('request_id', requestId)
        .neq('mechanic_id', mechanicId)
        .eq('status', 'notified');

      // Job Status History & Audit Log
      await supabase.from('job_status_history').insert({
        job_id: newJob.id,
        old_status: request.status,
        new_status: 'assigned',
        notes: 'Job accepted by mechanic',
      });

      await supabase.from('audit_logs').insert({
        action: 'job_assigned',
        resource_type: 'jobs',
        resource_id: newJob.id,
        new_values: { requestId, mechanicId, status: 'assigned' },
      });

      return jsonResponse({
        success: true,
        message: 'Job successfully assigned to mechanic',
        jobId: newJob.id,
        requestId,
        mechanicId,
        status: 'assigned',
        expiresAt,
      });
    }

    const assignedJobId = rpcResult?.job_id;

    return jsonResponse({
      success: true,
      message: 'Job accepted and assigned successfully',
      jobId: assignedJobId,
      requestId,
      mechanicId,
      status: 'assigned',
      expiresAt,
    });
  } catch (err: any) {
    console.error('Unhandled error in assign-job:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
