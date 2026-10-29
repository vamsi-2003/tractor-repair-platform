import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useRepairStore } from '../store/repairStore';
import { useJobStore } from '../store/jobStore';
import type { JobStatus } from '@tractor-repair/shared';

export interface UseRealtimeSyncOptions {
  jobId?: string | null;
  requestId?: string | null;
  role?: 'customer' | 'mechanic';
  enabled?: boolean;
  onJobChange?: (job: any) => void;
  onQuoteChange?: (quote: any) => void;
  onRequestChange?: (request: any) => void;
}

/**
 * Robust Supabase Realtime synchronization hook with a 4s fallback polling mechanism.
 * Subscribes to:
 *   - public:jobs (filtered by id or request_id)
 *   - public:quotes (filtered by job_id)
 *   - public:repair_requests (filtered by id)
 */
export function useRealtimeSync({
  jobId,
  requestId,
  role = 'customer',
  enabled = true,
  onJobChange,
  onQuoteChange,
  onRequestChange,
}: UseRealtimeSyncOptions) {
  const onJobChangeRef = useRef(onJobChange);
  const onQuoteChangeRef = useRef(onQuoteChange);
  const onRequestChangeRef = useRef(onRequestChange);

  onJobChangeRef.current = onJobChange;
  onQuoteChangeRef.current = onQuoteChange;
  onRequestChangeRef.current = onRequestChange;

  useEffect(() => {
    if (!enabled || (!jobId && !requestId)) {
      return;
    }

    const channelId = `sync_${role}_${jobId || 'nojob'}_${requestId || 'noreq'}_${Date.now()}`;
    const channel = supabase.channel(channelId);

    // 1. Listen to jobs updates
    if (jobId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const newJob = payload.new as any;
          if (!newJob || !newJob.status) return;

          if (role === 'customer') {
            useRepairStore.getState().updateJobStatus(newJob.status as JobStatus);
          } else {
            const currentActive = useJobStore.getState().activeJob;
            if (currentActive && currentActive.id === newJob.id) {
              useJobStore.setState({
                activeJob: {
                  ...currentActive,
                  status: newJob.status as JobStatus,
                },
              });
            }
          }

          onJobChangeRef.current?.(newJob);
        }
      );
    } else if (requestId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          const newJob = payload.new as any;
          if (!newJob) return;

          if (role === 'customer') {
            useRepairStore.getState().updateJobStatus(newJob.status as JobStatus);
          }
          onJobChangeRef.current?.(newJob);
        }
      );
    }

    // 2. Listen to quotes updates
    if (jobId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const newQuote = payload.new as any;
          if (!newQuote) return;

          const formattedQuote = {
            id: newQuote.id,
            visitFee: Number(newQuote.visit_fee),
            laborCost: Number(newQuote.labor_cost),
            partsEstimate: Number(newQuote.parts_estimate),
            total: Number(newQuote.total),
            mechanicNotes: newQuote.mechanic_notes || '',
            status: newQuote.status,
          };

          if (role === 'customer') {
            useRepairStore.getState().setQuote(formattedQuote);
          } else {
            const currentActive = useJobStore.getState().activeJob;
            if (currentActive && currentActive.id === jobId) {
              useJobStore.setState({
                activeJob: {
                  ...currentActive,
                  quote: {
                    ...currentActive.quote,
                    id: newQuote.id,
                    visitFee: Number(newQuote.visit_fee),
                    laborCost: Number(newQuote.labor_cost),
                    partsEstimate: Number(newQuote.parts_estimate),
                    total: Number(newQuote.total),
                    mechanicNotes: newQuote.mechanic_notes || '',
                    status: newQuote.status,
                  },
                },
              });
            }
          }

          onQuoteChangeRef.current?.(newQuote);
        }
      );
    }

    // 3. Listen to repair_requests updates
    if (requestId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'repair_requests',
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          const newReq = payload.new as any;
          if (!newReq || !newReq.status) return;

          if (role === 'customer') {
            useRepairStore.getState().updateJobStatus(newReq.status as JobStatus);
          }
          onRequestChangeRef.current?.(newReq);
        }
      );
    }

    // Subscribe to Realtime channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Connected to Realtime
      }
    });

    // 4. Fallback Polling Mechanism (every 4000ms) for resilient eventual consistency
    const pollInterval = setInterval(async () => {
      try {
        if (jobId) {
          const { data: jobData } = await supabase
            .from('jobs')
            .select('id, status, mechanic_id')
            .eq('id', jobId)
            .maybeSingle();

          if (jobData?.status) {
            if (role === 'customer') {
              useRepairStore.getState().updateJobStatus(jobData.status as JobStatus);
            } else {
              const currentActive = useJobStore.getState().activeJob;
              if (currentActive && currentActive.id === jobData.id && currentActive.status !== jobData.status) {
                useJobStore.setState({
                  activeJob: {
                    ...currentActive,
                    status: jobData.status as JobStatus,
                  },
                });
              }
            }
            onJobChangeRef.current?.(jobData);
          }

          const { data: quoteData } = await supabase
            .from('quotes')
            .select('*')
            .eq('job_id', jobId)
            .maybeSingle();

          if (quoteData) {
            const formattedQuote = {
              id: quoteData.id,
              visitFee: Number(quoteData.visit_fee),
              laborCost: Number(quoteData.labor_cost),
              partsEstimate: Number(quoteData.parts_estimate),
              total: Number(quoteData.total),
              mechanicNotes: quoteData.mechanic_notes || '',
              status: quoteData.status,
            };

            if (role === 'customer') {
              useRepairStore.getState().setQuote(formattedQuote);
            }
            onQuoteChangeRef.current?.(quoteData);
          }
        }

        if (requestId) {
          const { data: reqData } = await supabase
            .from('repair_requests')
            .select('id, status')
            .eq('id', requestId)
            .maybeSingle();

          if (reqData?.status) {
            if (role === 'customer') {
              useRepairStore.getState().updateJobStatus(reqData.status as JobStatus);
            }
            onRequestChangeRef.current?.(reqData);
          }
        }
      } catch (err) {
        // Silent catch for intermittent network blips during polling
      }
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [jobId, requestId, role, enabled]);
}
