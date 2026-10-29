/**
 * API Request and Response Types for Tractor Repair Marketplace
 */

import type {
  CodeType,
  JobStatus,
  Mechanic,
  MechanicBalance,
  MechanicDocument,
  MechanicSkill,
  PaymentMethod,
  Profile,
  Quote,
  QuoteLineItem,
  RepairRequest,
  RequestMedia,
} from './database';

// ============================================================================
// API ERROR & PAGINATION
// ============================================================================

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// ============================================================================
// REPAIR REQUEST APIS
// ============================================================================

export interface CreateRepairRequestInput {
  tractor_id?: string;
  tractor_make: string;
  tractor_model: string;
  tractor_year?: number;
  category_id: string;
  description?: string;
  voice_note_url?: string;
  latitude: number;
  longitude: number;
  address?: string;
  landmark?: string;
  media_urls?: string[];
  preferred_date?: string;
}

export interface RepairRequestResponse {
  request: RepairRequest;
  matched_mechanics_count: number;
  media?: RequestMedia[];
}

// ============================================================================
// MECHANIC REGISTRATION & PROFILE APIS
// ============================================================================

export interface MechanicRegistrationInput {
  full_name: string;
  phone: string;
  experience_years: number;
  specialization?: string;
  skills: string[]; // Problem category IDs
  service_radius_km?: number;
  latitude?: number;
  longitude?: number;
  upi_id?: string;
  documents?: Array<{
    document_type: string;
    document_number?: string;
    file_url: string;
  }>;
}

export interface MechanicProfileResponse {
  mechanic: Mechanic;
  profile: Profile;
  skills: MechanicSkill[];
  documents: MechanicDocument[];
  balance?: MechanicBalance;
}

// ============================================================================
// QUOTE APIS
// ============================================================================

export interface SubmitQuoteLineItemInput {
  item_type: 'labor' | 'part' | 'fee' | 'other';
  description: string;
  quantity: number;
  unit_price: number;
}

export interface SubmitQuoteInput {
  job_id: string;
  visit_fee: number;
  labor_charge: number;
  parts_cost: number;
  notes?: string;
  line_items?: SubmitQuoteLineItemInput[];
}

export interface QuoteResponse {
  quote: Quote;
  line_items: QuoteLineItem[];
}

// ============================================================================
// SECURE CODE VERIFICATION APIS
// ============================================================================

export interface VerifyCodeInput {
  job_id: string;
  code: string;
  code_type: CodeType;
}

export interface VerifyCodeResponse {
  valid: boolean;
  job_status: JobStatus;
  message: string;
}

// ============================================================================
// PAYMENT ORDER APIS
// ============================================================================

export interface CreatePaymentOrderInput {
  invoice_id: string;
  payment_method: PaymentMethod;
}

export interface PaymentOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  key_id?: string;
  notes?: Record<string, string>;
}

// ============================================================================
// JOB MANAGEMENT APIS
// ============================================================================

export interface UpdateJobStatusInput {
  job_id: string;
  status: JobStatus;
  notes?: string;
  cancel_reason?: string;
  latitude?: number;
  longitude?: number;
}
