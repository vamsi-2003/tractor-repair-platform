import type { JobStatus } from '../types/database';

// ============================================================================
// APP IDENTITY
// ============================================================================

export const APP_NAME = "AppName";

// ============================================================================
// JOB STATUS TRANSITIONS
// ============================================================================

export const JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  // Canonical PostgreSQL statuses
  requested: ['matching', 'cancelled'],
  matching: ['assigned', 'no_mechanic_available', 'cancelled'],
  assigned: ['mechanic_en_route', 'accepted', 'matching', 'cancelled'],
  mechanic_en_route: ['arrived', 'cancelled'],
  arrived: ['quote_submitted', 'repair_in_progress', 'diagnosing', 'in_progress', 'cancelled'],
  quote_submitted: ['quote_approved', 'quote_rejected', 'quote_modified', 'cancelled'],
  quote_approved: ['repair_in_progress', 'in_progress', 'cancelled'],
  quote_rejected: ['cancelled', 'quote_modified', 'diagnosing', 'quote_submitted'],
  quote_modified: ['quote_approved', 'quote_rejected', 'cancelled'],
  repair_in_progress: ['repair_completed', 'work_completed', 'cancelled', 'disputed'],
  repair_completed: ['payment_pending', 'paid', 'completed'],
  payment_pending: ['paid', 'payment_failed', 'completed'],
  payment_failed: ['payment_pending', 'paid', 'cancelled', 'disputed'],
  paid: ['completed'],
  completed: [],
  cancelled: [],
  disputed: ['completed', 'cancelled'],
  no_mechanic_available: ['matching', 'cancelled'],

  // App aliases
  pending: ['searching', 'matching', 'cancelled'],
  searching: ['assigned', 'no_mechanic_available', 'cancelled'],
  accepted: ['en_route', 'mechanic_en_route', 'started', 'cancelled'],
  en_route: ['arrived', 'started', 'cancelled'],
  diagnosing: ['quote_submitted', 'quote_sent', 'cancelled'],
  in_progress: ['work_completed', 'repair_completed', 'bill_ready', 'cancelled'],
  work_completed: ['payment_pending', 'bill_ready', 'completed'],

  // Flow status transitions
  offered: ['accepted', 'declined', 'matching', 'no_mechanic_found', 'cancelled'],
  started: ['quote_sent', 'quote_submitted', 'in_progress', 'repair_in_progress', 'cancelled'],
  quote_sent: ['quote_approved', 'quote_declined', 'quote_rejected', 'cancelled'],
  quote_declined: ['completed', 'cancelled'],
  bill_ready: ['paid', 'completed', 'disputed', 'cancelled'],
  declined: ['offered', 'matching', 'no_mechanic_found', 'cancelled'],
  no_mechanic_found: ['requested', 'matching', 'cancelled'],
};

// ============================================================================
// PROBLEM CATEGORIES
// ============================================================================

export interface ProblemCategoryItem {
  id: string;
  name: string;
  name_te: string;
  name_hi: string;
  icon: string;
  description: string;
  base_price_estimate: number;
}

export const PROBLEM_CATEGORIES: readonly ProblemCategoryItem[] = [
  {
    id: 'engine',
    name: 'Engine',
    name_te: 'ఇంజన్',
    name_hi: 'इंजन',
    icon: 'engine',
    description: 'Starting issues, abnormal smoke, overheating, oil leakage, fuel pump problems',
    base_price_estimate: 500,
  },
  {
    id: 'hydraulics',
    name: 'Hydraulics',
    name_te: 'హైడ్రాలిక్స్',
    name_hi: 'हाइड्रोलिक्स',
    icon: 'water-pump',
    description: 'Lift not raising, hydraulic oil leak, pressure valve or cylinder failure',
    base_price_estimate: 400,
  },
  {
    id: 'clutch_gearbox',
    name: 'Clutch / Gearbox',
    name_te: 'క్లచ్ / గేర్‌బాక్స్',
    name_hi: 'क्लच / गियरबॉक्स',
    icon: 'cog',
    description: 'Clutch slipping, gear shifting difficulty, transmission noise',
    base_price_estimate: 600,
  },
  {
    id: 'tyres',
    name: 'Tyres & Brakes',
    name_te: 'టైర్లు & బ్రేకులు',
    name_hi: 'टायर और ब्रेक',
    icon: 'circle-slice-8',
    description: 'Puncture repair, tyre replacement, brake failure, brake shoe wear',
    base_price_estimate: 300,
  },
  {
    id: 'electrical',
    name: 'Electrical',
    name_te: 'ఎలక్ట్రికల్',
    name_hi: 'इलेक्ट्रिकल',
    icon: 'flash',
    description: 'Battery dead, starter motor, alternator charging, headlights & wiring fault',
    base_price_estimate: 250,
  },
  {
    id: 'other',
    name: 'Other',
    name_te: 'ఇతరం',
    name_hi: 'अन्य',
    icon: 'wrench',
    description: 'Steering alignment, radiator repair, general servicing or custom repairs',
    base_price_estimate: 200,
  },
] as const;

// ============================================================================
// LANGUAGES
// ============================================================================

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

export const DEFAULT_SETTINGS = {
  commissionRate: 10, // 10%
  visitCharge: 200, // ₹200
  serviceRadiusKm: 25, // 25 km
  assignmentTimeoutSeconds: 30, // 30s
} as const;

// ============================================================================
// REVIEW & RATING
// ============================================================================

export const RATING_TAGS = [
  'arrived_on_time',
  'fixed_properly',
  'fair_price',
  'polite',
  'quick_service',
  'quality_parts',
] as const;

export type RatingTag = (typeof RATING_TAGS)[number];

// ============================================================================
// APP CONSTANTS & LIMITS
// ============================================================================

export const MAX_MEDIA_ATTACHMENTS = 5;
export const MAX_CODE_ATTEMPTS = 3;
export const CODE_EXPIRY_MINUTES = 30;
export const PAYMENT_CURRENCY = 'INR';
