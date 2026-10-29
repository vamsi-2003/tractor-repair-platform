/**
 * Formatting Utilities for Tractor Repair Marketplace
 */

/**
 * Format an amount as Indian Rupees (₹X,XXX).
 * Examples: 200 -> "₹200", 1250 -> "₹1,250", 150000 -> "₹1,50,000"
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '₹0';
  const isNegative = amount < 0;
  const absFormatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

  return isNegative ? `-₹${absFormatted}` : `₹${absFormatted}`;
}

/**
 * Format a phone number as +91 XXXXX XXXXX.
 * Accepts raw digits, with or without leading 0 or +91.
 */
export function formatPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  const last10 = digits.slice(-10);

  if (last10.length === 10) {
    return `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;
  }

  return phone;
}

/**
 * Format a date string or Date object into human-readable format.
 * Defaults to "26 Oct 2026" style in en-IN locale.
 */
export function formatDate(date: string | Date, locale: string = 'en-IN'): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Format distance in kilometers.
 * Under 1 km displays in meters ("500 m"), otherwise "X.X km".
 */
export function formatDistance(km: number): string {
  if (isNaN(km) || km < 0) return '0 km';
  if (km < 0.1) {
    return '< 100 m';
  }
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  const rounded = km % 1 === 0 ? km.toString() : km.toFixed(1);
  return `${rounded} km`;
}

/**
 * Format duration in minutes into friendly string.
 * Examples: 15 -> "15 mins", 60 -> "1 hr", 90 -> "1 hr 30 mins"
 */
export function formatDuration(minutes: number): string {
  if (isNaN(minutes) || minutes <= 0) return '0 mins';
  const rounded = Math.round(minutes);
  if (rounded < 60) {
    return `${rounded} min${rounded === 1 ? '' : 's'}`;
  }

  const hours = Math.floor(rounded / 60);
  const remainingMins = rounded % 60;

  if (remainingMins === 0) {
    return `${hours} hr${hours === 1 ? '' : 's'}`;
  }

  return `${hours} hr${hours === 1 ? '' : 's'} ${remainingMins} min${remainingMins === 1 ? '' : 's'}`;
}

/**
 * Truncate a string to maxLength, appending an ellipsis (...) if truncated.
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  if (maxLength <= 3) return text.slice(0, maxLength);
  return `${text.slice(0, maxLength - 3)}...`;
}
