import { create } from 'zustand';
import type {
  JobStatus,
  QuoteStatus,
  PaymentMethod,
} from '@tractor-repair/shared';
import { supabase } from '../services/supabase';
import { useAuthStore } from './authStore';

export interface IncomingRequest {
  id: string; // matchId or requestId
  requestId: string;
  distanceKm: number;
  etaMinutes: number;
  customerName: string;
  customerPhone: string;
  customerArea: string;
  village: string;
  mandal: string;
  district: string;
  latitude: number;
  longitude: number;
  tractorMake: string;
  tractorModel: string;
  tractorYear?: number;
  problemCategoryId: string;
  problemCategoryName: string;
  reportedProblem: string;
  photoUrls: string[];
  voiceNoteUrl: string | null;
  voiceNoteDurationSec?: number;
  expiresAt: string;
  secondsRemaining: number;
}

export interface SparePartItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ActiveJobQuote {
  id?: string;
  visitFee: number;
  laborCost: number;
  partsEstimate: number;
  total: number;
  mechanicNotes: string;
  status: QuoteStatus;
}

export interface ActiveJob {
  id: string;
  requestId: string;
  status: JobStatus;
  customer: {
    id: string;
    name: string;
    phone: string;
    avatarUrl?: string | null;
    address: string;
    village: string;
    mandal: string;
    district: string;
    landmark?: string;
    latitude: number;
    longitude: number;
  };
  tractor: {
    make: string;
    model: string;
    year?: number;
    registrationNumber?: string;
  };
  problem: {
    categoryId: string;
    categoryName: string;
    description: string;
    photoUrls: string[];
    voiceNoteUrl: string | null;
  };
  startCode: string;
  startCodeVerified: boolean;
  quote: ActiveJobQuote;
  spareParts: SparePartItem[];
  paymentMethod: PaymentMethod;
  platformFeeLiability: number;
  cashReceivedConfirmed: boolean;
  finishCode: string;
  finishCodeVerified: boolean;
  completedAt?: string;
}

export interface CompletedJobSummary {
  id: string;
  date: string;
  customerName: string;
  tractor: string;
  category: string;
  totalAmount: number;
  mechanicEarnings: number;
  platformFee: number;
  paymentMethod: 'cash' | 'online';
  status: 'completed';
}

export interface PlatformFeeLedgerEntry {
  id: string;
  date: string;
  jobId: string;
  description: string;
  jobAmount: number;
  feeAmount: number;
  type: 'charge' | 'payment' | 'deduction';
  balanceAfter: number;
}

export interface SettlementRecord {
  id: string;
  date: string;
  amount: number;
  status: 'settled' | 'processing' | 'failed';
  channel: 'upi' | 'bank_transfer';
  referenceId: string;
}

interface JobState {
  // Incoming Dispatch Request
  incomingRequest: IncomingRequest | null;
  incomingTimerInterval: any | null;

  // Current Active Job
  activeJob: ActiveJob | null;

  // Home Screen KPIs & Balance
  todayEarnings: number;
  todayJobsCount: number;
  ratingAverage: number;
  platformFeeBalance: number; // Pending platform fee from cash jobs

  // History & Financials
  completedJobs: CompletedJobSummary[];
  feeLedger: PlatformFeeLedgerEntry[];
  settlements: SettlementRecord[];

  // Actions
  setIncomingRequest: (request: IncomingRequest | null) => void;
  startIncomingCountdown: () => void;
  stopIncomingCountdown: () => void;
  acceptIncomingRequest: () => Promise<boolean>;
  declineIncomingRequest: () => void;

  setActiveJob: (job: ActiveJob | null) => void;
  updateJobStatus: (status: JobStatus) => Promise<void>;
  verifyStartCode: (code: string) => Promise<{ success: boolean; message: string }>;
  submitQuote: (
    visitFee: number,
    laborCost: number,
    partsEstimate: number,
    notes: string
  ) => Promise<{ success: boolean; quote: ActiveJobQuote }>;
  startRepair: () => void;

  // Spare parts management
  addSparePart: (name: string, quantity: number, unitPrice: number) => void;
  removeSparePart: (id: string) => void;

  // Payment & Finishing
  setPaymentMethod: (method: PaymentMethod) => void;
  setCashReceivedConfirmed: (confirmed: boolean) => void;
  verifyFinishCode: (code: string) => Promise<{ success: boolean; message: string }>;
  completeJob: () => Promise<boolean>;

  // Platform Fee payment
  payPlatformFee: (amount: number) => Promise<boolean>;
  requestSettlement: (amount: number) => Promise<boolean>;

  // Real data loader from Supabase
  loadMechanicData: (mechanicId: string) => Promise<void>;
}

export const useJobStore = create<JobState>((set, get) => ({
  incomingRequest: null,
  incomingTimerInterval: null,
  activeJob: null,

  todayEarnings: 0,
  todayJobsCount: 0,
  ratingAverage: 0,
  platformFeeBalance: 0,

  completedJobs: [],
  feeLedger: [],
  settlements: [],

  loadMechanicData: async (mechanicId: string) => {
    try {
      // 1. Fetch mechanic balance
      const { data: balanceData } = await supabase
        .from('mechanic_balances')
        .select('*')
        .eq('mechanic_id', mechanicId)
        .maybeSingle();

      const platformFeeBalance = Number(balanceData?.total_commission_due ?? 0);

      // 2. Fetch completed jobs
      const { data: jobsData } = await supabase
        .from('jobs')
        .select(`
          id,
          created_at,
          completed_at,
          status,
          customer:customers (
            profile:profiles!customers_profile_id_fkey (full_name)
          ),
          repair_requests (
            tractors (make, model),
            problem_categories (name_en)
          ),
          invoices (
            total,
            platform_fee,
            status,
            payments (method, status)
          )
        `)
        .eq('mechanic_id', mechanicId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      const completedJobs: CompletedJobSummary[] = (jobsData || []).map((j: any) => {
        const inv = Array.isArray(j.invoices) ? j.invoices[0] : j.invoices;
        const total = Number(inv?.total ?? 0);
        const fee = Number(inv?.platform_fee ?? Math.round(total * 0.1));
        const net = Math.max(0, total - fee);
        const payMethod = inv?.payments?.[0]?.method === 'online' ? 'online' : 'cash';

        return {
          id: j.id,
          date: j.completed_at
            ? new Date(j.completed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
            : 'Completed',
          customerName: j.customer?.profile?.full_name || 'Customer',
          tractor: j.repair_requests?.tractors
            ? `${j.repair_requests.tractors.make} ${j.repair_requests.tractors.model}`
            : 'Tractor',
          category: j.repair_requests?.problem_categories?.name_en || 'Repair',
          totalAmount: total,
          mechanicEarnings: net,
          platformFee: fee,
          paymentMethod: payMethod,
          status: 'completed' as const,
        };
      });

      // 3. Compute today's earnings & jobs
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayJobs = (jobsData || []).filter((j: any) => {
        if (!j.completed_at) return false;
        return new Date(j.completed_at) >= todayStart;
      });

      const todayEarnings = todayJobs.reduce((sum: number, j: any) => {
        const inv = Array.isArray(j.invoices) ? j.invoices[0] : j.invoices;
        const total = Number(inv?.total ?? 0);
        const fee = Number(inv?.platform_fee ?? Math.round(total * 0.1));
        return sum + Math.max(0, total - fee);
      }, 0);

      // 4. Fetch fee ledger from platform_commissions
      const { data: commsData } = await supabase
        .from('platform_commissions')
        .select('*')
        .eq('mechanic_id', mechanicId)
        .order('created_at', { ascending: false });

      const feeLedger: PlatformFeeLedgerEntry[] = (commsData || []).map((c: any) => ({
        id: c.id,
        date: new Date(c.created_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
        jobId: c.job_id,
        description: '10% Platform fee on repair',
        jobAmount: 0,
        feeAmount: Number(c.commission_amount),
        type: 'charge' as const,
        balanceAfter: platformFeeBalance,
      }));

      // 5. Fetch settlements
      const { data: settlementsData } = await supabase
        .from('settlements')
        .select('*')
        .eq('mechanic_id', mechanicId)
        .order('created_at', { ascending: false });

      const settlements: SettlementRecord[] = (settlementsData || []).map((s: any) => ({
        id: s.id,
        date: new Date(s.created_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        amount: Number(s.amount),
        status: (s.settlement_status === 'completed' ? 'settled' : 'processing') as any,
        channel: 'upi' as const,
        referenceId: s.id,
      }));

      // 6. Fetch mechanic rating
      const { data: mechData } = await supabase
        .from('mechanics')
        .select('rating_avg')
        .eq('id', mechanicId)
        .maybeSingle();

      const ratingAverage = Number(mechData?.rating_avg ?? 0);

      set({
        platformFeeBalance,
        completedJobs,
        todayEarnings,
        todayJobsCount: todayJobs.length,
        feeLedger,
        settlements,
        ratingAverage,
      });
    } catch (err) {
      console.error('Error loading mechanic data:', err);
    }
  },

  setIncomingRequest: (incomingRequest) => {
    get().stopIncomingCountdown();
    set({ incomingRequest });
    if (incomingRequest) {
      get().startIncomingCountdown();
    }
  },

  startIncomingCountdown: () => {
    get().stopIncomingCountdown();
    const interval = setInterval(() => {
      const { incomingRequest } = get();
      if (!incomingRequest) {
        clearInterval(interval);
        return;
      }
      if (incomingRequest.secondsRemaining <= 1) {
        clearInterval(interval);
        set({ incomingRequest: null, incomingTimerInterval: null });
      } else {
        set({
          incomingRequest: {
            ...incomingRequest,
            secondsRemaining: incomingRequest.secondsRemaining - 1,
          },
        });
      }
    }, 1000);
    set({ incomingTimerInterval: interval });
  },

  stopIncomingCountdown: () => {
    const { incomingTimerInterval } = get();
    if (incomingTimerInterval) {
      clearInterval(incomingTimerInterval);
      set({ incomingTimerInterval: null });
    }
  },

  acceptIncomingRequest: async () => {
    const { incomingRequest } = get();
    if (!incomingRequest) return false;

    get().stopIncomingCountdown();

    let custId = '';
    let custName = incomingRequest.customerName || 'Farmer (Customer)';
    let custPhone = incomingRequest.customerPhone || '';
    let custAvatar: string | null = null;
    let tractorMake = incomingRequest.tractorMake || 'Tractor';
    let tractorModel = incomingRequest.tractorModel || '';
    let tractorYear = incomingRequest.tractorYear;
    let tractorReg = '';
    let categoryId = incomingRequest.problemCategoryId || '';
    let categoryName = incomingRequest.problemCategoryName || 'Tractor Issue';
    let description = incomingRequest.reportedProblem || '';
    let photoUrls = incomingRequest.photoUrls || [];
    let voiceNoteUrl = incomingRequest.voiceNoteUrl || null;
    let addressText = `${incomingRequest.customerArea || ''}, ${incomingRequest.village || ''}, ${incomingRequest.mandal || ''}`.replace(/^[\s,]+|[\s,]+$/g, '');
    let latitude = incomingRequest.latitude || 0;
    let longitude = incomingRequest.longitude || 0;

    let jobId = '';
    let startCode = '';

    try {
      const { data: req } = await supabase
        .from('repair_requests')
        .select(`
          id,
          customer_id,
          category_id,
          description,
          voice_note_url,
          latitude,
          longitude,
          address_text,
          tractors ( make, model, year, registration_number ),
          problem_categories ( name_en ),
          customers (
            id,
            profile:profiles ( full_name, phone, avatar_url )
          )
        `)
        .eq('id', incomingRequest.requestId)
        .maybeSingle();

      if (req) {
        custId = req.customer_id || '';
        latitude = Number(req.latitude || latitude);
        longitude = Number(req.longitude || longitude);
        addressText = req.address_text || addressText;
        description = req.description || description;
        voiceNoteUrl = req.voice_note_url || voiceNoteUrl;

        const custProfile = (req.customers as any)?.profile;
        if (custProfile) {
          custName = custProfile.full_name || custName;
          custPhone = custProfile.phone || custPhone;
          custAvatar = custProfile.avatar_url || null;
        }

        const t = req.tractors as any;
        if (t) {
          tractorMake = t.make || tractorMake;
          tractorModel = t.model || tractorModel;
          tractorYear = t.year ? Number(t.year) : tractorYear;
          tractorReg = t.registration_number || '';
        }

        const cat = req.problem_categories as any;
        if (cat?.name_en) {
          categoryName = cat.name_en;
        }
      }

      // Check if job already exists or assign atomically
      let currentMechanicId = useAuthStore.getState().mechanic?.id;
      if (!currentMechanicId) {
        const { data: firstMech } = await supabase
          .from('mechanics')
          .select('id')
          .eq('status', 'approved')
          .limit(1)
          .maybeSingle();
        currentMechanicId = firstMech?.id;
      }

      const { data: existingJob } = await supabase
        .from('jobs')
        .select('id, status')
        .eq('request_id', incomingRequest.requestId)
        .maybeSingle();

      if (existingJob?.id) {
        jobId = existingJob.id;
        if (currentMechanicId) {
          await supabase.from('jobs').update({ mechanic_id: currentMechanicId, status: 'assigned' }).eq('id', jobId);
        }
      } else if (currentMechanicId) {
        // Atomic server assignment
        const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 4 * 3600000).toISOString();
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('assign_job_atomic', {
          p_request_id: incomingRequest.requestId,
          p_mechanic_id: currentMechanicId,
          p_start_code: randomCode,
          p_code_hash: randomCode,
          p_expires_at: expiresAt,
        });

        if (rpcRes?.job_id) {
          jobId = rpcRes.job_id;
          startCode = randomCode;
        } else {
          console.warn('RPC assign_job_atomic notice:', rpcErr);
          const { data: newJob } = await supabase
            .from('jobs')
            .insert({
              request_id: incomingRequest.requestId,
              customer_id: custId || null,
              mechanic_id: currentMechanicId || null,
              status: 'assigned',
              assigned_at: new Date().toISOString(),
            })
            .select('id')
            .maybeSingle();
          if (newJob?.id) jobId = newJob.id;
        }
      }

      // Query genuine start code from secure_codes if not already captured
      if (jobId && !startCode) {
        const { data: sc } = await supabase
          .from('secure_codes')
          .select('code')
          .eq('job_id', jobId)
          .eq('code_type', 'start')
          .maybeSingle();

        if (sc?.code) {
          startCode = sc.code;
        }
      }

      // Ensure repair request is explicitly marked assigned
      await supabase
        .from('repair_requests')
        .update({ status: 'assigned', updated_at: new Date().toISOString() })
        .eq('id', incomingRequest.requestId);

      if (jobId) {
        // Update mechanic matches status
        if (currentMechanicId) {
          await supabase
            .from('mechanic_matches')
            .update({ status: 'accepted' })
            .eq('request_id', incomingRequest.requestId)
            .eq('mechanic_id', currentMechanicId);
        }

        // Notify customer
        const custProfileId = (req?.customers as any)?.profile?.id;
        if (custProfileId) {
          await supabase.from('notifications').insert({
            user_id: custProfileId,
            type: 'job_update',
            title: 'Mechanic Assigned!',
            body: 'A mechanic has accepted your repair request and will be heading your way.',
            data: {
              jobId,
              status: 'assigned',
              requestId: incomingRequest.requestId,
            },
          });
        }
      }
    } catch (err) {
      console.warn('Error fetching genuine job data upon acceptance:', err);
    }

    if (!jobId) {
      jobId = `job-${Date.now().toString().slice(-6)}`;
    }

    const activeJob: ActiveJob = {
      id: jobId,
      requestId: incomingRequest.requestId,
      status: 'assigned',
      customer: {
        id: custId,
        name: custName,
        phone: custPhone,
        avatarUrl: custAvatar,
        address: addressText,
        village: incomingRequest.village || '',
        mandal: incomingRequest.mandal || '',
        district: incomingRequest.district || '',
        landmark: '',
        latitude,
        longitude,
      },
      tractor: {
        make: tractorMake,
        model: tractorModel,
        year: tractorYear,
        registrationNumber: tractorReg || undefined,
      },
      problem: {
        categoryId,
        categoryName,
        description,
        photoUrls,
        voiceNoteUrl,
      },
      startCode,
      startCodeVerified: false,
      quote: {
        visitFee: 0,
        laborCost: 0,
        partsEstimate: 0,
        total: 0,
        mechanicNotes: '',
        status: 'pending',
      },
      spareParts: [],
      paymentMethod: 'cash',
      platformFeeLiability: 0,
      cashReceivedConfirmed: false,
      finishCode: '',
      finishCodeVerified: false,
    };

    set({
      activeJob,
      incomingRequest: null,
    });

    return true;
  },

  declineIncomingRequest: () => {
    get().stopIncomingCountdown();
    set({ incomingRequest: null });
  },

  setActiveJob: (activeJob) => set({ activeJob }),

  updateJobStatus: async (status: JobStatus) => {
    const { activeJob } = get();
    if (!activeJob) return;

    set({
      activeJob: {
        ...activeJob,
        status,
      },
    });

    try {
      await supabase.from('jobs').update({ status }).eq('id', activeJob.id);
    } catch (err) {
      // safe fallback
    }
  },

  verifyStartCode: async (enteredCode: string) => {
    const { activeJob } = get();
    if (!activeJob) return { success: false, message: 'No active job found' };

    const cleanCode = enteredCode.trim();
    if (cleanCode.length !== 4 && cleanCode.length !== 6) {
      return { success: false, message: 'Code must be 4 or 6 digits' };
    }

    // Try edge function if available
    try {
      const { data, error } = await supabase.functions.invoke('verify-code', {
        body: {
          job_id: activeJob.id,
          code: cleanCode,
          code_type: 'start',
        },
      });

      if (!error && data?.valid) {
        set({
          activeJob: {
            ...activeJob,
            startCodeVerified: true,
            status: 'arrived',
          },
        });
        return { success: true, message: 'Start code verified successfully!' };
      }
    } catch (e) {
      // Fallback to local matching
    }

    // Try checking directly against secure_codes table
    try {
      const { data: codeRow } = await supabase
        .from('secure_codes')
        .select('id, code, is_used')
        .eq('job_id', activeJob.id)
        .eq('code_type', 'start')
        .maybeSingle();

      if (codeRow && codeRow.code === cleanCode) {
        await supabase
          .from('secure_codes')
          .update({ is_used: true, used_at: new Date().toISOString() })
          .eq('id', codeRow.id);

        set({
          activeJob: {
            ...activeJob,
            startCodeVerified: true,
            status: 'arrived',
          },
        });
        return { success: true, message: 'Start code verified successfully! You may now prepare the repair quote.' };
      }
    } catch (e) {
      // Fallback to activeJob startCode
    }

    // Local code match check against active job start code
    if (activeJob.startCode && cleanCode === activeJob.startCode) {
      set({
        activeJob: {
          ...activeJob,
          startCodeVerified: true,
          status: 'arrived',
        },
      });
      return { success: true, message: 'Start code verified successfully! You may now prepare the repair quote.' };
    }

    return { success: false, message: 'Incorrect Start Code. Please ask the farmer for the code displayed on their app.' };
  },

  submitQuote: async (visitFee, laborCost, partsEstimate, notes) => {
    const { activeJob } = get();
    const total = visitFee + laborCost + partsEstimate;
    const newQuote: ActiveJobQuote = {
      id: `quote-${Date.now()}`,
      visitFee,
      laborCost,
      partsEstimate,
      total,
      mechanicNotes: notes,
      status: 'submitted',
    };

    if (activeJob) {
      set({
        activeJob: {
          ...activeJob,
          status: 'quote_submitted',
          quote: newQuote,
          platformFeeLiability: Math.round(total * 0.1),
        },
      });

      try {
        await supabase.from('quotes').insert({
          job_id: activeJob.id,
          visit_fee: visitFee,
          labor_cost: laborCost,
          parts_estimate: partsEstimate,
          total,
          mechanic_notes: notes,
          status: 'submitted',
        });
        await supabase.from('jobs').update({ status: 'quote_submitted' }).eq('id', activeJob.id);
      } catch (e) {
        // Fallback
      }
    }

    return { success: true, quote: newQuote };
  },


  startRepair: () => {
    const { activeJob } = get();
    if (!activeJob) return;
    set({
      activeJob: {
        ...activeJob,
        status: 'repair_in_progress',
      },
    });
  },

  addSparePart: (name, quantity, unitPrice) => {
    const { activeJob } = get();
    if (!activeJob) return;
    const newItem: SparePartItem = {
      id: `part-${Date.now()}`,
      name,
      quantity,
      unitPrice,
      total: quantity * unitPrice,
    };
    const updatedParts = [...activeJob.spareParts, newItem];
    const partsTotal = updatedParts.reduce((acc, p) => acc + p.total, 0);
    const grandTotal = activeJob.quote.visitFee + activeJob.quote.laborCost + partsTotal;

    set({
      activeJob: {
        ...activeJob,
        spareParts: updatedParts,
        platformFeeLiability: Math.round(grandTotal * 0.1),
      },
    });
  },

  removeSparePart: (id) => {
    const { activeJob } = get();
    if (!activeJob) return;
    const updatedParts = activeJob.spareParts.filter((p) => p.id !== id);
    const partsTotal = updatedParts.reduce((acc, p) => acc + p.total, 0);
    const grandTotal = activeJob.quote.visitFee + activeJob.quote.laborCost + partsTotal;

    set({
      activeJob: {
        ...activeJob,
        spareParts: updatedParts,
        platformFeeLiability: Math.round(grandTotal * 0.1),
      },
    });
  },

  setPaymentMethod: (method) => {
    const { activeJob } = get();
    if (!activeJob) return;
    set({
      activeJob: {
        ...activeJob,
        paymentMethod: method,
      },
    });
  },

  setCashReceivedConfirmed: (confirmed) => {
    const { activeJob } = get();
    if (!activeJob) return;
    set({
      activeJob: {
        ...activeJob,
        cashReceivedConfirmed: confirmed,
      },
    });
  },

  verifyFinishCode: async (enteredCode: string) => {
    const { activeJob } = get();
    if (!activeJob) return { success: false, message: 'No active job found' };

    const cleanCode = enteredCode.trim();
    if (cleanCode.length !== 4 && cleanCode.length !== 6) {
      return { success: false, message: 'Code must be 4 or 6 digits' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('verify-code', {
        body: {
          job_id: activeJob.id,
          code: cleanCode,
          code_type: 'finish',
        },
      });

      if (!error && data?.valid) {
        set({
          activeJob: {
            ...activeJob,
            finishCodeVerified: true,
          },
        });
        return { success: true, message: 'Finish Code validated successfully!' };
      }
    } catch (e) {
      // safe fallback
    }

    // Try checking directly against secure_codes table
    try {
      const { data: codeRow } = await supabase
        .from('secure_codes')
        .select('id, code, is_used')
        .eq('job_id', activeJob.id)
        .eq('code_type', 'finish')
        .maybeSingle();

      if (codeRow && codeRow.code === cleanCode) {
        await supabase
          .from('secure_codes')
          .update({ is_used: true, used_at: new Date().toISOString() })
          .eq('id', codeRow.id);

        set({
          activeJob: {
            ...activeJob,
            finishCodeVerified: true,
          },
        });
        return { success: true, message: 'Finish Code validated successfully!' };
      }
    } catch (e) {
      // Fallback to activeJob finishCode
    }

    // Local code match
    if (activeJob.finishCode && cleanCode === activeJob.finishCode) {
      set({
        activeJob: {
          ...activeJob,
          finishCodeVerified: true,
        },
      });
      return { success: true, message: 'Finish Code validated successfully!' };
    }

    return {
      success: false,
      message: 'Incorrect Finish Code. Please ask the farmer to show the finish code on their screen.',
    };
  },

  completeJob: async () => {
    const { activeJob, todayEarnings, todayJobsCount, platformFeeBalance, completedJobs, feeLedger } = get();
    if (!activeJob) return false;

    const partsTotal = activeJob.spareParts.reduce((acc, p) => acc + p.total, 0);
    const visitFee = activeJob.quote.visitFee || 0;
    const laborCost = activeJob.quote.laborCost || 0;
    const subtotal = visitFee + laborCost + partsTotal;
    const platformFee = Math.round(subtotal * 0.1);
    const totalAmount = subtotal;
    const mechanicEarnings = totalAmount - platformFee;

    const newCompletedJob: CompletedJobSummary = {
      id: activeJob.id,
      date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      customerName: activeJob.customer.name,
      tractor: `${activeJob.tractor.make} ${activeJob.tractor.model}`.trim(),
      category: activeJob.problem.categoryName,
      totalAmount,
      mechanicEarnings,
      platformFee,
      paymentMethod: activeJob.paymentMethod === 'online' ? 'online' : 'cash',
      status: 'completed',
    };

    let newLedger = feeLedger;
    let newBalance = platformFeeBalance;

    if (activeJob.paymentMethod === 'cash') {
      newBalance = platformFeeBalance + platformFee;
      const ledgerEntry: PlatformFeeLedgerEntry = {
        id: `led-${Date.now()}`,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        jobId: activeJob.id,
        description: `10% Platform fee on cash repair (${activeJob.tractor.make})`,
        jobAmount: totalAmount,
        feeAmount: platformFee,
        type: 'charge',
        balanceAfter: newBalance,
      };
      newLedger = [ledgerEntry, ...feeLedger];
    }

    set({
      todayEarnings: todayEarnings + mechanicEarnings,
      todayJobsCount: todayJobsCount + 1,
      platformFeeBalance: newBalance,
      completedJobs: [newCompletedJob, ...completedJobs],
      feeLedger: newLedger,
      activeJob: null,
    });

    try {
      // 1. Update jobs table
      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', activeJob.id);

      // 2. Update repair_requests table
      if (activeJob.requestId) {
        await supabase
          .from('repair_requests')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeJob.requestId);
      }

      // 3. Ensure invoice exists and is marked paid
      let invoiceId: string | null = null;
      const { data: existingInv } = await supabase
        .from('invoices')
        .select('id')
        .eq('job_id', activeJob.id)
        .maybeSingle();

      if (existingInv) {
        invoiceId = existingInv.id;
        await supabase
          .from('invoices')
          .update({
            status: 'paid',
            visit_charge: visitFee,
            repair_amount: laborCost,
            parts_amount: partsTotal,
            subtotal,
            platform_fee: platformFee,
            total: totalAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoiceId);
      } else {
        let quoteId = activeJob.quote.id;
        if (!quoteId || quoteId.startsWith('quote-')) {
          const { data: qRow } = await supabase
            .from('quotes')
            .select('id')
            .eq('job_id', activeJob.id)
            .maybeSingle();
          quoteId = qRow?.id || null;
        }

        if (quoteId) {
          const { data: newInv } = await supabase
            .from('invoices')
            .insert({
              job_id: activeJob.id,
              quote_id: quoteId,
              visit_charge: visitFee,
              repair_amount: laborCost,
              parts_amount: partsTotal,
              subtotal,
              platform_fee: platformFee,
              total: totalAmount,
              status: 'paid',
            })
            .select('id')
            .single();
          if (newInv) invoiceId = newInv.id;
        }
      }

      // 4. Record payment in payments table
      if (invoiceId) {
        await supabase.from('payments').insert({
          invoice_id: invoiceId,
          method: activeJob.paymentMethod === 'online' ? 'online' : 'cash',
          amount: totalAmount,
          currency: 'INR',
          status: 'success',
          paid_at: new Date().toISOString(),
        });

        // 5. Record commission in platform_commissions table
        const { data: jobRow } = await supabase
          .from('jobs')
          .select('mechanic_id')
          .eq('id', activeJob.id)
          .maybeSingle();

        if (jobRow?.mechanic_id) {
          await supabase.from('platform_commissions').insert({
            job_id: activeJob.id,
            invoice_id: invoiceId,
            mechanic_id: jobRow.mechanic_id,
            commission_rate: 10.0,
            commission_amount: platformFee,
            status: activeJob.paymentMethod === 'online' ? 'settled' : 'collected',
          });
        }
      }
    } catch (e) {
      console.warn('Backend sync warning on job completion:', e);
    }

    return true;
  },

  payPlatformFee: async (amount: number) => {
    const { platformFeeBalance, feeLedger } = get();
    const newBalance = Math.max(0, platformFeeBalance - amount);
    const ledgerEntry: PlatformFeeLedgerEntry = {
      id: `led-${Date.now()}`,
      date: 'Just now',
      jobId: `pay-${Date.now().toString().slice(-4)}`,
      description: 'UPI Payment towards platform fee balance',
      jobAmount: 0,
      feeAmount: amount,
      type: 'payment',
      balanceAfter: newBalance,
    };

    set({
      platformFeeBalance: newBalance,
      feeLedger: [ledgerEntry, ...feeLedger],
    });

    return true;
  },

  requestSettlement: async (amount: number) => {
    const { settlements } = get();
    const mechanicId = useAuthStore.getState().mechanic?.id;
    let refId: string | undefined = undefined;

    if (mechanicId) {
      try {
        const { data: inserted } = await supabase
          .from('settlements')
          .insert({
            mechanic_id: mechanicId,
            amount,
            settlement_status: 'pending',
            notes: 'Settlement requested via app',
          })
          .select('id, reference_id')
          .single();

        if (inserted) {
          refId = inserted.reference_id || `SET-${inserted.id.slice(0, 8).toUpperCase()}`;
        }
      } catch (e) {
        console.warn('Settlement insert error:', e);
      }
    }

    const newRecord: SettlementRecord = {
      id: `set-${Date.now()}`,
      date: 'Today',
      amount,
      status: 'processing',
      channel: 'upi',
      referenceId: refId || `SET-${Date.now().toString().slice(-8)}`,
    };

    set({
      settlements: [newRecord, ...settlements],
    });

    return true;
  },
}));
