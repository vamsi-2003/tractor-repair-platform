import { create } from 'zustand';
import type { JobStatus } from '@tractor-repair/shared';

interface RepairState {
  // Current request
  currentRequest: {
    id: string;
    tractorMake: string;
    tractorModel: string;
    categoryId: string;
    categoryName: string;
    description: string;
    voiceNoteUri: string | null;
    mediaUris: string[];
    latitude: number;
    longitude: number;
    status: JobStatus;
  } | null;

  // Current job
  currentJob: {
    id: string;
    requestId: string;
    status: JobStatus;
    mechanic: {
      id: string;
      name: string;
      phone: string;
      avatarUrl: string | null;
      rating: number;
      totalJobs: number;
      workshopAddress: string;
      latitude: number | null;
      longitude: number | null;
    } | null;
    startCode: string | null;
    finishCode: string | null;
    quote: {
      id: string;
      visitFee: number;
      laborCost: number;
      partsEstimate: number;
      total: number;
      mechanicNotes: string;
      status: string;
    } | null;
    invoice: {
      id: string;
      visitCharge: number;
      repairAmount: number;
      partsAmount: number;
      total: number;
    } | null;
  } | null;

  // Actions
  setCurrentRequest: (request: RepairState['currentRequest']) => void;
  setCurrentJob: (job: RepairState['currentJob']) => void;
  updateJobStatus: (status: JobStatus) => void;
  setStartCode: (code: string) => void;
  setFinishCode: (code: string) => void;
  setQuote: (quote: NonNullable<RepairState['currentJob']>['quote']) => void;
  setInvoice: (invoice: NonNullable<RepairState['currentJob']>['invoice']) => void;
  reset: () => void;
}

export const useRepairStore = create<RepairState>((set) => ({
  currentRequest: null,
  currentJob: null,

  setCurrentRequest: (request) => set({ currentRequest: request }),

  setCurrentJob: (job) => set({ currentJob: job }),

  updateJobStatus: (status) =>
    set((state) => ({
      currentJob: state.currentJob ? { ...state.currentJob, status } : null,
      currentRequest: state.currentRequest
        ? { ...state.currentRequest, status }
        : null,
    })),

  setStartCode: (code) =>
    set((state) => ({
      currentJob: state.currentJob
        ? { ...state.currentJob, startCode: code }
        : null,
    })),

  setFinishCode: (code) =>
    set((state) => ({
      currentJob: state.currentJob
        ? { ...state.currentJob, finishCode: code }
        : null,
    })),

  setQuote: (quote) =>
    set((state) => ({
      currentJob: state.currentJob
        ? { ...state.currentJob, quote }
        : null,
    })),

  setInvoice: (invoice) =>
    set((state) => ({
      currentJob: state.currentJob
        ? { ...state.currentJob, invoice }
        : null,
    })),

  reset: () => set({ currentRequest: null, currentJob: null }),
}));
