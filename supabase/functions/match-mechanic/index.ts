// Supabase Edge Function: match-mechanic
// Matches an incoming repair request to the closest approved, online mechanic with matching skills.

import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getSupabaseAdminClient } from '../_shared/supabaseClient.ts';

interface MatchMechanicPayload {
  requestId?: string;
  request_id?: string;
}

interface MechanicCandidate {
  mechanic_id: string;
  profile_id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  rating_avg: number;
  total_jobs: number;
  workshop_address: string | null;
  service_radius_km: number;
  distance_km: number;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
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
    const body: MatchMechanicPayload = await req.json().catch(() => ({}));
    const requestId = body.requestId || body.request_id;

    if (!requestId) {
      return errorResponse('requestId is required', 400);
    }

    // 1. Fetch Repair Request details
    const { data: request, error: requestErr } = await supabase
      .from('repair_requests')
      .select('id, customer_id, category_id, latitude, longitude, status, address_text')
      .eq('id', requestId)
      .single();

    if (requestErr || !request) {
      return errorResponse('Repair request not found', 404, requestErr?.message);
    }

    if (request.status !== 'requested' && request.status !== 'matching') {
      return errorResponse(
        `Cannot match request with status '${request.status}'`,
        400
      );
    }

    // Set request status to 'matching' if currently 'requested'
    if (request.status === 'requested') {
      await supabase
        .from('repair_requests')
        .update({ status: 'matching', updated_at: new Date().toISOString() })
        .eq('id', requestId);
    }

    // 2. Query candidates via PostGIS RPC function
    let candidates: MechanicCandidate[] = [];
    const { data: rpcCandidates, error: rpcErr } = await supabase.rpc(
      'find_matching_mechanics',
      { p_request_id: requestId }
    );

    if (!rpcErr && Array.isArray(rpcCandidates) && rpcCandidates.length > 0) {
      candidates = rpcCandidates as MechanicCandidate[];
    } else {
      // Robust Fallback: query online, approved mechanics with matching skill
      const { data: mechanicsWithSkills, error: queryErr } = await supabase
        .from('mechanics')
        .select(`
          id,
          profile_id,
          rating_avg,
          total_jobs,
          workshop_address,
          service_radius_km,
          is_online,
          status,
          current_latitude,
          current_longitude,
          profiles!inner (
            id,
            full_name,
            phone,
            avatar_url
          ),
          mechanic_skills!inner (
            category_id
          )
        `)
        .eq('status', 'approved')
        .eq('is_online', true)
        .eq('mechanic_skills.category_id', request.category_id);

      if (!queryErr && mechanicsWithSkills) {
        for (const m of mechanicsWithSkills) {
          const profile = (m as any).profiles;
          let distKm = 10.0;
          if (request.latitude && request.longitude && (m as any).current_latitude && (m as any).current_longitude) {
            distKm = haversineDistanceKm(
              Number(request.latitude),
              Number(request.longitude),
              Number((m as any).current_latitude),
              Number((m as any).current_longitude)
            );
          }
          if (distKm <= (m.service_radius_km || 50)) {
            candidates.push({
              mechanic_id: m.id,
              profile_id: profile?.id || m.profile_id,
              full_name: profile?.full_name || 'Mechanic',
              phone: profile?.phone || null,
              avatar_url: profile?.avatar_url || null,
              rating_avg: Number(m.rating_avg || 5.0),
              total_jobs: Number(m.total_jobs || 0),
              workshop_address: m.workshop_address || null,
              service_radius_km: Number(m.service_radius_km || 25),
              distance_km: distKm,
            });
          }
        }
        candidates.sort((a, b) => a.distance_km - b.distance_km);
      }
    }

    // 3. Handle No Mechanics Found
    if (candidates.length === 0) {
      await supabase
        .from('repair_requests')
        .update({
          status: 'no_mechanic_available',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      // Notify customer of unavailability
      const { data: customer } = await supabase
        .from('customers')
        .select('profile_id')
        .eq('id', request.customer_id)
        .single();

      if (customer?.profile_id) {
        await supabase.from('notifications').insert({
          user_id: customer.profile_id,
          type: 'job_update',
          title: 'No Mechanics Available',
          body: 'We could not find an available mechanic in your area at this time. Please try again later.',
          data: { requestId, status: 'no_mechanic_available' },
        });
      }

      return jsonResponse({
        success: false,
        message: 'No mechanics available in your area matching this category',
        requestStatus: 'no_mechanic_available',
        candidatesFound: 0,
      });
    }

    // 4. Select closest candidate mechanic and create match
    const primaryCandidate = candidates[0];

    // Check if match record already exists
    const { data: existingMatch } = await supabase
      .from('mechanic_matches')
      .select('id, status')
      .eq('request_id', requestId)
      .eq('mechanic_id', primaryCandidate.mechanic_id)
      .maybeSingle();

    let matchRecordId = existingMatch?.id;

    if (!existingMatch) {
      const { data: insertedMatch, error: matchInsertErr } = await supabase
        .from('mechanic_matches')
        .insert({
          request_id: requestId,
          mechanic_id: primaryCandidate.mechanic_id,
          status: 'notified',
          distance_km: primaryCandidate.distance_km,
          notified_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (matchInsertErr) {
        console.error('Failed to create mechanic match:', matchInsertErr);
      } else {
        matchRecordId = insertedMatch?.id;
      }
    }

    // 5. Read timeout settings from app_settings (default 30 seconds)
    const { data: timeoutSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'assignment_timeout_seconds')
      .maybeSingle();

    const timeoutSeconds = timeoutSetting?.value ? parseInt(timeoutSetting.value, 10) : 30;

    // 6. Generate Notification to the candidate mechanic
    await supabase.from('notifications').insert({
      user_id: primaryCandidate.profile_id,
      type: 'job_update',
      title: 'New Tractor Repair Request!',
      body: `New repair request is approx. ${primaryCandidate.distance_km} km away. You have ${timeoutSeconds}s to accept.`,
      data: {
        requestId,
        matchId: matchRecordId,
        distanceKm: primaryCandidate.distance_km,
        timeoutSeconds,
      },
    });

    // 7. Record in audit_logs
    await supabase.from('audit_logs').insert({
      action: 'mechanic_matched',
      resource_type: 'repair_requests',
      resource_id: requestId,
      new_values: {
        mechanic_id: primaryCandidate.mechanic_id,
        distance_km: primaryCandidate.distance_km,
        timeout_seconds: timeoutSeconds,
        total_candidates: candidates.length,
      },
    });

    return jsonResponse({
      success: true,
      message: 'Mechanic candidate matched successfully',
      requestId,
      matchId: matchRecordId,
      mechanic: {
        id: primaryCandidate.mechanic_id,
        fullName: primaryCandidate.full_name,
        phone: primaryCandidate.phone,
        avatarUrl: primaryCandidate.avatar_url,
        rating: primaryCandidate.rating_avg,
        totalJobs: primaryCandidate.total_jobs,
        distanceKm: primaryCandidate.distance_km,
      },
      timeoutSeconds,
      totalCandidatesFound: candidates.length,
    });
  } catch (err: any) {
    console.error('Unhandled error in match-mechanic:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
