import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import type {
  Language,
  Profile,
  Mechanic,
  MechanicStatus,
  MechanicDocument,
  MechanicBalance,
} from '@tractor-repair/shared';

export interface VerificationChecklist {
  mobileVerified: boolean;
  idUploaded: boolean;
  approvalStatus: MechanicStatus;
}

export type UserRole = 'customer' | 'mechanic' | 'admin';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  language: Language;
  selectedRole: UserRole | null;

  profile: Profile | null;
  mechanic: Mechanic | null;
  skills: string[];
  documents: MechanicDocument[];
  balance: MechanicBalance | null;
  isOnline: boolean;
  serviceRadiusKm: number;

  verification: VerificationChecklist;

  // Actions
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setMechanic: (mechanic: Mechanic | null) => void;
  setSelectedRole: (role: UserRole | null) => void;
  fetchUserProfile: (userId: string) => Promise<void>;
  setSkills: (skills: string[]) => void;
  setDocuments: (documents: MechanicDocument[]) => void;
  setBalance: (balance: MechanicBalance | null) => void;
  setIsOnline: (isOnline: boolean) => Promise<void>;
  setLanguage: (language: Language) => void;
  setServiceRadiusKm: (radiusKm: number) => void;
  setLoading: (isLoading: boolean) => void;
  updateVerification: (partial: Partial<VerificationChecklist>) => void;
  reset: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  language: 'en' as Language,
  selectedRole: null,

  profile: null,
  mechanic: null,
  skills: [],
  documents: [],
  balance: null,
  isOnline: false,
  serviceRadiusKm: 25,

  verification: {
    mobileVerified: false,
    idUploaded: false,
    approvalStatus: 'pending',
  },

  setSession: (session) =>
    set((state) => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session,
      isLoading: session ? state.isLoading : false,
      verification: {
        ...state.verification,
        mobileVerified: !!session?.user?.phone,
      },
    })),

  setProfile: (profile) =>
    set({
      profile,
      language: (profile?.preferred_language as Language) || get().language,
      selectedRole: (profile?.role as UserRole) || get().selectedRole,
    }),

  setMechanic: (mechanic) =>
    set((state) => ({
      mechanic,
      isOnline: mechanic?.is_online ?? state.isOnline,
      serviceRadiusKm: mechanic?.service_radius_km ?? state.serviceRadiusKm,
      verification: {
        ...state.verification,
        approvalStatus: mechanic?.status || 'pending',
      },
    })),

  setSelectedRole: (selectedRole) => set({ selectedRole }),

  fetchUserProfile: async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      let mechanic: Mechanic | null = null;
      let balance: MechanicBalance | null = null;

      if (profile?.role === 'mechanic') {
        const { data: mech } = await supabase
          .from('mechanics')
          .select('*')
          .eq('profile_id', userId)
          .maybeSingle();

        mechanic = mech as Mechanic | null;

        if (mechanic?.id) {
          const { data: bal } = await supabase
            .from('mechanic_balances')
            .select('*')
            .eq('mechanic_id', mechanic.id)
            .maybeSingle();
          balance = bal as MechanicBalance | null;
        }
      }

      set({
        profile: profile as Profile | null,
        mechanic,
        balance,
        selectedRole: (profile?.role as UserRole) || get().selectedRole,
        language: (profile?.preferred_language as Language) || get().language,
        isOnline: mechanic?.is_online ?? false,
        serviceRadiusKm: mechanic?.service_radius_km ?? 25,
        verification: {
          mobileVerified: !!profile?.phone,
          idUploaded: !!mechanic,
          approvalStatus: mechanic?.status || 'pending',
        },
      });
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  },

  setSkills: (skills) => set({ skills }),

  setDocuments: (documents) =>
    set((state) => ({
      documents,
      verification: {
        ...state.verification,
        idUploaded: documents.length > 0,
      },
    })),

  setBalance: (balance) => set({ balance }),

  setIsOnline: async (isOnline) => {
    const { mechanic } = get();
    set((state) => ({
      isOnline,
      mechanic: state.mechanic ? { ...state.mechanic, is_online: isOnline } : null,
    }));

    if (mechanic?.id) {
      try {
        await supabase
          .from('mechanics')
          .update({ is_online: isOnline, updated_at: new Date().toISOString() })
          .eq('id', mechanic.id);
      } catch (e) {
        console.warn('Failed to update online status in database:', e);
      }
    }
  },

  setLanguage: (language) => set({ language }),

  setServiceRadiusKm: (serviceRadiusKm) =>
    set((state) => ({
      serviceRadiusKm,
      mechanic: state.mechanic ? { ...state.mechanic, service_radius_km: serviceRadiusKm } : null,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  updateVerification: (partial) =>
    set((state) => ({
      verification: { ...state.verification, ...partial },
    })),

  reset: () =>
    set({
      session: null,
      user: null,
      isLoading: false,
      isAuthenticated: false,
      profile: null,
      mechanic: null,
      balance: null,
      skills: [],
      documents: [],
      verification: {
        mobileVerified: false,
        idUploaded: false,
        approvalStatus: 'pending',
      },
    }),

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out warning:', err);
    }
    try {
      const { useRepairStore } = require('./repairStore');
      const { useJobStore } = require('./jobStore');
      useRepairStore.getState().reset();
      useJobStore.setState({
        activeJob: null,
        incomingRequest: null,
        completedJobs: [],
        feeLedger: [],
        settlements: [],
      });
    } catch (e) {
      // Ignored
    }
    get().reset();
  },
}));
