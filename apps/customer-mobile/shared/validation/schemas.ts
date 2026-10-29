import { z } from 'zod';

// ============================================================================
// AUTH & BASIC VALIDATION SCHEMAS
// ============================================================================

/**
 * Indian phone number validation: 10 digits starting with 6-9,
 * optional +91 or 91 country code prefix.
 */
export const phoneNumberSchema = z
  .string()
  .trim()
  .regex(/^(?:\+91[\-\s]?)?[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number');

export type PhoneNumberInput = z.infer<typeof phoneNumberSchema>;

/**
 * OTP validation: 4 to 6 digits numeric.
 */
export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{4,6}$/, 'OTP must be 4 to 6 digits');

export type OtpInput = z.infer<typeof otpSchema>;

// ============================================================================
// PROFILE & USER SCHEMAS
// ============================================================================

export const profileUpdateSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
  preferred_language: z.enum(['en', 'te', 'hi']).optional(),
});

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

// ============================================================================
// TRACTOR SCHEMAS
// ============================================================================

export const tractorSchema = z.object({
  make: z.string().min(1, 'Tractor make is required').max(100),
  model: z.string().min(1, 'Tractor model is required').max(100),
  year: z.number().int().min(1950).max(2100).optional(),
  registration_number: z.string().max(50).optional(),
  hours_run: z.number().min(0).optional(),
  fuel_type: z.string().optional(),
  horsepower: z.number().positive().optional(),
});

export type TractorFormData = z.infer<typeof tractorSchema>;

// ============================================================================
// REPAIR REQUEST SCHEMAS
// ============================================================================

export const repairRequestSchema = z.object({
  tractor_id: z.string().uuid().optional(),
  tractor_make: z.string().min(1, 'Tractor make is required').max(100),
  tractor_model: z.string().min(1, 'Tractor model is required').max(100),
  tractor_year: z.number().int().min(1950).max(2100).optional(),
  category_id: z.string().min(1, 'Problem category is required'),
  description: z.string().max(1000).optional(),
  voice_note_url: z.string().url().optional().or(z.literal('')),
  latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
  address: z.string().max(255).optional(),
  landmark: z.string().max(255).optional(),
  media_urls: z.array(z.string().url()).max(5, 'Maximum 5 media attachments allowed').optional(),
  preferred_date: z.string().optional(),
});

export type RepairRequestFormData = z.infer<typeof repairRequestSchema>;

// ============================================================================
// MECHANIC REGISTRATION SCHEMAS
// ============================================================================

export const mechanicDocumentItemSchema = z.object({
  document_type: z.string().min(1, 'Document type is required'),
  document_number: z.string().optional(),
  file_url: z.string().url('Invalid document URL'),
});

export const mechanicRegistrationSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: phoneNumberSchema,
  skills: z.array(z.string()).min(1, 'Select at least one skill/category'),
  experience_years: z.number().int().min(0, 'Experience must be 0 or more years').max(60),
  specialization: z.string().max(255).optional(),
  service_radius_km: z.number().min(1).max(100).default(25),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  upi_id: z.string().regex(/^[\w.-]+@[\w.-]+$/, 'Invalid UPI ID format').optional().or(z.literal('')),
  documents: z.array(mechanicDocumentItemSchema).optional(),
});

export type MechanicRegistrationFormData = z.infer<typeof mechanicRegistrationSchema>;

// ============================================================================
// QUOTE SCHEMAS
// ============================================================================

export const quoteLineItemSchema = z.object({
  item_type: z.enum(['labor', 'part', 'fee', 'other']).default('labor'),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(1).default(1),
  unit_price: z.number().min(0, 'Price must be >= 0'),
});

export const quoteSchema = z.object({
  job_id: z.string().uuid('Invalid job ID'),
  visit_fee: z.number().min(0, 'Visit charge must be >= 0'),
  labor_charge: z.number().min(0, 'Labor charge must be >= 0'),
  parts_cost: z.number().min(0, 'Parts cost must be >= 0'),
  notes: z.string().max(1000).optional(),
  line_items: z.array(quoteLineItemSchema).optional(),
});

export type QuoteFormData = z.infer<typeof quoteSchema>;

// ============================================================================
// VERIFY SECURE CODE SCHEMAS
// ============================================================================

export const verifyCodeSchema = z.object({
  job_id: z.string().uuid('Invalid job ID'),
  code: z.string().trim().regex(/^\d{4,6}$/, 'Code must be 4 to 6 digits'),
  code_type: z.enum(['start', 'finish']).optional(),
});

export type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>;

// ============================================================================
// REVIEW SCHEMAS
// ============================================================================

export const reviewSchema = z.object({
  job_id: z.string().uuid('Invalid job ID'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  tags: z.array(z.string()).default([]),
  comment: z.string().max(1000).optional(),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;
