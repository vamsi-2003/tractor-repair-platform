// Supabase Edge Functions Shared Crypto Utilities

/**
 * Generate a cryptographically secure numeric OTP code of specified length.
 * Default length: 6 digits (e.g. "482910").
 */
export function generateRandomCode(length = 6): string {
  const digits = new Uint32Array(length);
  crypto.getRandomValues(digits);
  return Array.from(digits)
    .map((val) => (val % 10).toString())
    .join('');
}

/**
 * Compute SHA-256 hex digest of a string using Web Crypto API.
 */
export async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify a plain numeric code against a stored hash (or plain code).
 */
export async function verifyCodeHash(plainCode: string, storedHash: string): Promise<boolean> {
  const cleanCode = plainCode.trim();
  const cleanStored = storedHash.trim();

  // If stored as direct plain code (e.g. 6 digits)
  if (cleanStored === cleanCode) {
    return true;
  }

  // Otherwise calculate SHA-256 hash and compare in timing-safe manner
  const computedHash = await hashCode(cleanCode);
  return timingSafeEqual(computedHash.toLowerCase(), cleanStored.toLowerCase());
}

/**
 * Generate HMAC SHA256 hex digest.
 */
export async function createHmacSha256(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify Razorpay HMAC SHA256 signature using Web Crypto API.
 */
export async function verifyRazorpaySignature(
  bodyText: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) {
    return false;
  }
  const calculatedSignature = await createHmacSha256(bodyText, secret);
  return timingSafeEqual(calculatedSignature.toLowerCase(), signature.trim().toLowerCase());
}
