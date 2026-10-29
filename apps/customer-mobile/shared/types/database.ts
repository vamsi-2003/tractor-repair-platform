/**
 * Database Schema Types for Tractor Repair Marketplace
 * Corresponds to all 29 PostgreSQL / Supabase tables and enums.
 */

// ============================================================================
// ENUMS & CONSTANT UNIONS
// ============================================================================

export const UserRole = {
  CUSTOMER: 'customer',
  MECHANIC: 'mechanic',
  ADMIN: 'admin',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const MechanicStatus = {
  PENDING: 'pending',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
  OFFLINE: 'offline',
  ONLINE: 'online',
  BUSY: 'busy',
} as const;
export type MechanicStatus = (typeof MechanicStatus)[keyof typeof MechanicStatus];

export const JobStatus = {
  // Canonical PostgreSQL enum values
  REQUESTED: 'requested',
  MATCHING: 'matching',
  ASSIGNED: 'assigned',
  MECHANIC_EN_ROUTE: 'mechanic_en_route',
  ARRIVED: 'arrived',
  QUOTE_SUBMITTED: 'quote_submitted',
  QUOTE_APPROVED: 'quote_approved',
  QUOTE_REJECTED: 'quote_rejected',
  QUOTE_MODIFIED: 'quote_modified',
  REPAIR_IN_PROGRESS: 'repair_in_progress',
  REPAIR_COMPLETED: 'repair_completed',
  PAYMENT_PENDING: 'payment_pending',
  PAYMENT_FAILED: 'payment_failed',
  PAID: 'paid',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
  NO_MECHANIC_AVAILABLE: 'no_mechanic_available',

  // Convenience aliases and prompt 2 required status transitions
  OFFERED: 'offered',
  STARTED: 'started',
  QUOTE_SENT: 'quote_sent',
  QUOTE_DECLINED: 'quote_declined',
  BILL_READY: 'bill_ready',
  DECLINED: 'declined',
  NO_MECHANIC_FOUND: 'no_mechanic_found',
  PENDING: 'pending',
  SEARCHING: 'searching',
  ACCEPTED: 'accepted',
  EN_ROUTE: 'en_route',
  DIAGNOSING: 'diagnosing',
  IN_PROGRESS: 'in_progress',
  WORK_COMPLETED: 'work_completed',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const PaymentMethod = {
  ONLINE: 'online',
  CASH: 'cash',
  UPI: 'upi',
  CARD: 'card',
  NETBANKING: 'netbanking',
  WALLET: 'wallet',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PENDING: 'pending',
  CREATED: 'created',
  PROCESSING: 'processing',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const QuoteStatus = {
  PENDING: 'pending',
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  MODIFIED: 'modified',
  EXPIRED: 'expired',
} as const;
export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

export const MatchStatus = {
  NOTIFIED: 'notified',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  TIMED_OUT: 'timed_out',
  CANCELLED: 'cancelled',
} as const;
export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];

export const DocumentStatus = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const CodeType = {
  START: 'start',
  FINISH: 'finish',
} as const;
export type CodeType = (typeof CodeType)[keyof typeof CodeType];

export const NotificationType = {
  // DB enum values
  JOB_UPDATE: 'job_update',
  PAYMENT: 'payment',
  SYSTEM: 'system',
  PROMOTION: 'promotion',

  // Event aliases
  JOB_REQUEST: 'job_request',
  JOB_ACCEPTED: 'job_accepted',
  JOB_DECLINED: 'job_declined',
  MECHANIC_EN_ROUTE: 'mechanic_en_route',
  MECHANIC_ARRIVED: 'mechanic_arrived',
  QUOTE_RECEIVED: 'quote_received',
  QUOTE_APPROVED: 'quote_approved',
  QUOTE_REJECTED: 'quote_rejected',
  REPAIR_STARTED: 'repair_started',
  REPAIR_COMPLETED: 'repair_completed',
  PAYMENT_RECEIVED: 'payment_received',
  REVIEW_RECEIVED: 'review_received',
  ACCOUNT_APPROVED: 'account_approved',
  ACCOUNT_SUSPENDED: 'account_suspended',
  GENERAL: 'general',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const TicketStatus = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const SettlementStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SETTLED: 'settled',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
export type SettlementStatus = (typeof SettlementStatus)[keyof typeof SettlementStatus];

// ============================================================================
// TABLE INTERFACES (29 TABLES)
// ============================================================================

/**
 * 1. profiles: Core user accounts linked to Supabase auth.users
 */
export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  preferred_language: 'en' | 'te' | 'hi' | string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 2. customers: Farmer / Tractor owner profile details
 */
export interface Customer {
  id: string;
  profile_id?: string;
  default_tractor_id?: string | null;
  address?: string | null;
  village?: string | null;
  mandal?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * 3. mechanics: Verified mechanic profile, location & verification details
 */
export interface Mechanic {
  id: string;
  profile_id?: string;
  status: MechanicStatus;
  experience_years: number;
  workshop_address?: string | null;
  service_radius_km: number;
  is_online?: boolean;
  current_location?: unknown;
  rating_avg?: number;
  rating_average?: number;
  total_jobs?: number;
  completed_jobs_count?: number;
  total_reviews?: number;
  admin_notes?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  specialization?: string | null;
  current_latitude?: number | null;
  current_longitude?: number | null;
  last_location_updated_at?: string | null;
  is_verified?: boolean;
  verified_at?: string | null;
  upi_id?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 4. tractors: Tractors owned by customers
 */
export interface Tractor {
  id: string;
  customer_id: string;
  make: string;
  model: string;
  year: number | null;
  registration_number: string | null;
  hours_run?: number | null;
  fuel_type?: string | null;
  horsepower?: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * 5. problem_categories: Repair categories (Engine, Hydraulics, Clutch, etc.)
 */
export interface ProblemCategory {
  id: string;
  name?: string;
  name_en?: string;
  name_te: string;
  name_hi: string;
  description?: string | null;
  icon: string | null;
  sort_order?: number;
  display_order?: number;
  base_price_estimate?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

/**
 * 6. mechanic_skills: Problem categories a mechanic is skilled to fix
 */
export interface MechanicSkill {
  id?: string;
  mechanic_id: string;
  category_id: string;
  is_primary?: boolean;
  created_at?: string;
}

/**
 * 7. mechanic_documents: Verification docs (Aadhaar, DL, certificates)
 */
export interface MechanicDocument {
  id: string;
  mechanic_id: string;
  document_type: 'aadhaar' | 'driving_license' | 'mechanic_certificate' | 'pan_card' | string;
  document_number?: string | null;
  file_path?: string;
  file_url?: string;
  status: DocumentStatus;
  rejection_reason?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * 8. repair_requests: Customer-created service requests
 */
export interface RepairRequest {
  id: string;
  customer_id: string;
  tractor_id: string | null;
  tractor_make?: string;
  tractor_model?: string;
  category_id: string;
  description: string | null;
  voice_note_url: string | null;
  latitude: number;
  longitude: number;
  location?: unknown;
  address_text?: string;
  address?: string | null;
  landmark?: string | null;
  status: JobStatus;
  preferred_date?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 9. request_media: Photos/audio attached to a repair request
 */
export interface RequestMedia {
  id: string;
  request_id: string;
  media_type: 'photo' | 'video' | 'audio' | string;
  file_path?: string;
  url?: string;
  thumbnail_path?: string | null;
  thumbnail_url?: string | null;
  file_size?: number | null;
  created_at: string;
}

/**
 * 10. mechanic_matches: Dispatch match candidates notified for a request
 */
export interface MechanicMatch {
  id: string;
  request_id: string;
  mechanic_id: string;
  distance_km: number | null;
  status: MatchStatus;
  notified_at?: string;
  expires_at?: string;
  responded_at: string | null;
  created_at: string;
}

/**
 * 11. jobs: An active or completed repair assignment between customer & mechanic
 */
export interface Job {
  id: string;
  request_id: string;
  customer_id: string;
  mechanic_id: string;
  status: JobStatus;
  assigned_at?: string;
  en_route_at?: string | null;
  arrived_at?: string | null;
  repair_started_at?: string | null;
  repair_completed_at?: string | null;
  payment_received_at?: string | null;
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason?: string | null;
  cancel_reason?: string | null;
  cancelled_by?: string | null;
  initial_quote_id?: string | null;
  final_invoice_id?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 12. job_status_history: Audit trail of job state transitions
 */
export interface JobStatusHistory {
  id: string;
  job_id: string;
  old_status?: JobStatus | null;
  new_status?: JobStatus;
  from_status?: JobStatus | null;
  to_status?: JobStatus;
  changed_by: string | null;
  notes: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
}

/**
 * 13. secure_codes: 4-6 digit OTPs for start-repair and finish-job
 */
export interface SecureCode {
  id: string;
  job_id: string;
  code_type: CodeType;
  code?: string;
  code_hash?: string;
  max_attempts?: number;
  attempts: number;
  is_used?: boolean;
  is_verified?: boolean;
  used_at?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  expires_at: string;
  created_at: string;
}

/**
 * 14. quotes: Mechanic repair estimates provided on-site or beforehand
 */
export interface Quote {
  id: string;
  job_id: string;
  mechanic_id: string;
  visit_fee: number;
  labor_cost?: number;
  labor_charge?: number;
  parts_estimate?: number;
  parts_cost?: number;
  total?: number;
  estimated_total?: number;
  mechanic_notes?: string | null;
  notes?: string | null;
  status: QuoteStatus;
  customer_response_at?: string | null;
  responded_at?: string | null;
  rejection_reason?: string | null;
  submitted_at?: string | null;
  version?: number;
  created_at: string;
  updated_at: string;
}

/**
 * 15. quote_line_items: Itemized parts and labor lines in a quote
 */
export interface QuoteLineItem {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total?: number;
  total_price?: number;
  item_type?: 'labor' | 'part' | 'fee' | 'other' | string;
  sort_order?: number;
  created_at: string;
}

/**
 * 16. invoices: Final payable bill for completed repair work
 */
export interface Invoice {
  id: string;
  job_id: string;
  quote_id?: string;
  customer_id?: string;
  mechanic_id?: string;
  invoice_number?: string;
  visit_charge?: number;
  visit_fee?: number;
  repair_amount?: number;
  labor_charge?: number;
  parts_amount?: number;
  parts_charge?: number;
  subtotal?: number;
  platform_fee?: number;
  discount?: number;
  tax?: number;
  total?: number;
  total_amount?: number;
  status?: string;
  payment_status?: PaymentStatus;
  issued_at?: string;
  paid_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 17. invoice_items: Itemized billing entries for an invoice
 */
export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total?: number;
  total_price?: number;
  item_type?: 'visit' | 'visit_fee' | 'labor' | 'part' | 'tax' | 'discount' | 'other' | string;
  created_at: string;
}

/**
 * 18. payments: Payment transaction records (UPI, Card, Cash)
 */
export interface Payment {
  id: string;
  invoice_id: string;
  job_id?: string;
  customer_id?: string;
  mechanic_id?: string;
  amount: number;
  currency: string;
  method?: PaymentMethod;
  payment_method?: PaymentMethod;
  status?: PaymentStatus;
  payment_status?: PaymentStatus;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_signature?: string | null;
  gateway_order_id?: string | null;
  gateway_payment_id?: string | null;
  gateway_signature?: string | null;
  cash_collected_by_mechanic?: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 19. payment_events: Raw webhook events from payment gateway (Razorpay)
 */
export interface PaymentEvent {
  id: string;
  payment_id: string | null;
  event_type: string;
  razorpay_event_id?: string | null;
  gateway?: 'razorpay' | 'cash' | 'system' | string;
  payload: Record<string, unknown>;
  processed_at?: string | null;
  created_at: string;
}

/**
 * 20. platform_commissions: Platform fee calculation per completed job
 */
export interface PlatformCommission {
  id: string;
  job_id: string;
  invoice_id?: string;
  payment_id?: string;
  mechanic_id: string;
  commission_rate: number;
  commission_amount: number;
  total_job_amount?: number;
  mechanic_earnings?: number;
  is_settled?: boolean;
  status?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * 21. mechanic_balances: Ledger tracking net earnings and pending platform fee
 */
export interface MechanicBalance {
  id: string;
  mechanic_id: string;
  total_earned?: number;
  total_earnings?: number;
  total_commission_due?: number;
  platform_fee_due?: number;
  total_settled?: number;
  settled_payout?: number;
  balance_due?: number;
  pending_payout?: number;
  last_settlement_at?: string | null;
  updated_at: string;
}

/**
 * 22. settlements: Payout batches sent to mechanic's bank/UPI
 */
export interface Settlement {
  id: string;
  mechanic_id: string;
  amount: number;
  fee_deducted?: number;
  net_amount?: number;
  status?: SettlementStatus;
  settlement_status?: SettlementStatus;
  payout_channel?: 'upi' | 'bank_transfer' | string;
  reference_id?: string | null;
  transaction_reference?: string | null;
  notes?: string | null;
  settled_at?: string | null;
  processed_at?: string | null;
  failure_reason?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 23. refunds: Customer refunds on cancellations or overcharges
 */
export interface Refund {
  id: string;
  payment_id: string;
  job_id?: string;
  amount: number;
  reason: string | null;
  razorpay_refund_id?: string | null;
  gateway_refund_id?: string | null;
  status: 'pending' | 'processed' | 'failed' | string;
  processed_at: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * 24. reviews: Farmer reviews and ratings for mechanics
 */
export interface Review {
  id: string;
  job_id: string;
  customer_id: string;
  mechanic_id: string;
  rating: number;
  tags: string[];
  comment: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * 25. notifications: Push & in-app alerts sent to users
 */
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

/**
 * 26. support_tickets: Customer/Mechanic issue resolution tickets
 */
export interface SupportTicket {
  id: string;
  job_id: string | null;
  reporter_id?: string;
  user_id?: string;
  assigned_to: string | null;
  category?: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  resolution?: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 27. app_settings: Configurable platform parameters
 */
export interface AppSetting {
  id?: string;
  key: string;
  value: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

/**
 * 28. service_regions: Operational geographic zones
 */
export interface ServiceRegion {
  id: string;
  name: string;
  state: string;
  district: string;
  is_active: boolean;
  boundary?: unknown;
  center_latitude?: number;
  center_longitude?: number;
  radius_km?: number;
  created_at: string;
  updated_at: string;
}

/**
 * 29. audit_logs: System activity log for security & compliance
 */
export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type?: string;
  entity_type?: string;
  resource_id?: string | null;
  entity_id?: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent?: string | null;
  created_at: string;
}
