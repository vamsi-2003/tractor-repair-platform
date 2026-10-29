/**
 * Job Status and Lifecycle Utilities for Tractor Repair Marketplace
 */

import { JOB_STATUS_TRANSITIONS } from '../constants/app';
import type { JobStatus } from '../types/database';

/**
 * Validates whether transition from one JobStatus to another is allowed.
 */
export function isValidTransition(from: JobStatus, to: JobStatus): boolean {
  const allowed = JOB_STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Returns the list of valid next statuses reachable from the current status.
 */
export function getNextStatuses(status: JobStatus): JobStatus[] {
  return JOB_STATUS_TRANSITIONS[status] ?? [];
}

/**
 * Checks if a status represents a final, closed state of a job.
 */
export function isTerminalStatus(status: JobStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

/**
 * Statuses during which the customer can initiate a cancellation.
 * Once repair work is started or completed, customer cannot cancel directly.
 */
const CUSTOMER_CANCELLABLE_STATUSES: readonly JobStatus[] = [
  // Canonical PostgreSQL statuses
  'requested',
  'matching',
  'assigned',
  'mechanic_en_route',
  'arrived',
  'quote_submitted',
  'quote_rejected',
  'quote_modified',
  'no_mechanic_available',

  // App aliases
  'pending',
  'searching',
  'accepted',
  'en_route',
  'diagnosing',
];

/**
 * Determines whether a customer is allowed to cancel the job in its current status.
 */
export function canCustomerCancel(status: JobStatus): boolean {
  return CUSTOMER_CANCELLABLE_STATUSES.includes(status);
}

/**
 * Checks if transitioning into the specified status requires a secure code verification.
 * - 'repair_in_progress' / 'in_progress' requires Start Code verification.
 * - 'repair_completed' / 'work_completed' / 'completed' requires Finish Code verification.
 */
export function requiresCode(status: JobStatus): boolean {
  return (
    status === 'in_progress' ||
    status === 'repair_in_progress' ||
    status === 'work_completed' ||
    status === 'repair_completed' ||
    status === 'completed'
  );
}

/**
 * Returns the expected code type ('start' | 'finish') for the given target status,
 * or null if no code is required.
 */
export function getRequiredCodeType(status: JobStatus): 'start' | 'finish' | null {
  if (status === 'in_progress' || status === 'repair_in_progress') return 'start';
  if (status === 'work_completed' || status === 'repair_completed' || status === 'completed') {
    return 'finish';
  }
  return null;
}
