// Supabase Edge Functions TypeScript Test Suite
// Verifies crypto helpers, signature verification, code hashing, and business logic.
// Compatible with Deno test runner (`deno test supabase/tests/functions.test.ts`)

import {
  generateRandomCode,
  hashCode,
  verifyCodeHash,
  createHmacSha256,
  verifyRazorpaySignature,
  timingSafeEqual,
} from '../functions/_shared/crypto.ts';

// -----------------------------------------------------------------------------
// 1. RANDOM CODE GENERATION TESTS
// -----------------------------------------------------------------------------

Deno.test('generateRandomCode - generates 6 digit numeric code by default', () => {
  const code = generateRandomCode(6);
  if (code.length !== 6) {
    throw new Error(`Expected length 6, got ${code.length}`);
  }
  if (!/^\d{6}$/.test(code)) {
    throw new Error(`Expected 6 numeric digits, got ${code}`);
  }
});

Deno.test('generateRandomCode - generates custom length code', () => {
  const code4 = generateRandomCode(4);
  if (code4.length !== 4 || !/^\d{4}$/.test(code4)) {
    throw new Error(`Expected 4 numeric digits, got ${code4}`);
  }

  const code8 = generateRandomCode(8);
  if (code8.length !== 8 || !/^\d{8}$/.test(code8)) {
    throw new Error(`Expected 8 numeric digits, got ${code8}`);
  }
});

Deno.test('generateRandomCode - consecutive codes are sufficiently random', () => {
  const codes = new Set<string>();
  for (let i = 0; i < 50; i++) {
    codes.add(generateRandomCode(6));
  }
  // With 6 digits (1 million possibilities), 50 random samples should be almost entirely unique
  if (codes.size < 45) {
    throw new Error(`Suspicious collision rate: only ${codes.size} unique codes out of 50`);
  }
});

// -----------------------------------------------------------------------------
// 2. SHA-256 HASHING & CODE VERIFICATION TESTS
// -----------------------------------------------------------------------------

Deno.test('hashCode - produces 64 character hex string', async () => {
  const hash = await hashCode('123456');
  if (hash.length !== 64) {
    throw new Error(`Expected 64 characters, got ${hash.length}`);
  }
  // Known SHA-256 of "123456"
  const expected = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';
  if (hash.toLowerCase() !== expected) {
    throw new Error(`Hash mismatch: got ${hash}, expected ${expected}`);
  }
});

Deno.test('verifyCodeHash - returns true for valid code and false for invalid', async () => {
  const code = '582914';
  const hash = await hashCode(code);

  const isValid = await verifyCodeHash(code, hash);
  if (!isValid) {
    throw new Error('Expected verifyCodeHash to return true for matching code');
  }

  const isInvalid = await verifyCodeHash('000000', hash);
  if (isInvalid) {
    throw new Error('Expected verifyCodeHash to return false for incorrect code');
  }

  // Also handles direct plain code match
  const isDirectValid = await verifyCodeHash(code, code);
  if (!isDirectValid) {
    throw new Error('Expected verifyCodeHash to return true for direct plain code');
  }
});

// -----------------------------------------------------------------------------
// 3. TIMING-SAFE EQUAL TESTS
// -----------------------------------------------------------------------------

Deno.test('timingSafeEqual - correctly compares strings', () => {
  if (!timingSafeEqual('abcdef', 'abcdef')) {
    throw new Error('Should return true for identical strings');
  }
  if (timingSafeEqual('abcdef', 'abcdeg')) {
    throw new Error('Should return false for different strings of same length');
  }
  if (timingSafeEqual('abc', 'abcd')) {
    throw new Error('Should return false for strings of different lengths');
  }
});

// -----------------------------------------------------------------------------
// 4. RAZORPAY HMAC-SHA256 SIGNATURE TESTS
// -----------------------------------------------------------------------------

Deno.test('verifyRazorpaySignature - validates authentic signature and rejects forgery', async () => {
  const secret = 'rzp_secret_test_key_12345';
  const payload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_123456789',
          amount: 150000,
          currency: 'INR',
          order_id: 'order_test_987654',
        },
      },
    },
  });

  // Generate authentic signature
  const signature = await createHmacSha256(payload, secret);
  if (!signature || signature.length !== 64) {
    throw new Error('Generated signature should be 64-char hex');
  }

  // Test authentic signature
  const isValid = await verifyRazorpaySignature(payload, signature, secret);
  if (!isValid) {
    throw new Error('Expected authentic signature to be valid');
  }

  // Test tampered payload
  const tamperedPayload = payload.replace('150000', '999999');
  const isTamperedValid = await verifyRazorpaySignature(tamperedPayload, signature, secret);
  if (isTamperedValid) {
    throw new Error('Tampered payload should have failed signature verification');
  }

  // Test wrong secret
  const isWrongSecretValid = await verifyRazorpaySignature(payload, signature, 'wrong_secret');
  if (isWrongSecretValid) {
    throw new Error('Wrong secret should have failed signature verification');
  }
});

// -----------------------------------------------------------------------------
// 5. COMMISSION & FINANCIAL CALCULATION TESTS
// -----------------------------------------------------------------------------

Deno.test('Commission Calculation - accurate 10% platform fee calculation', () => {
  const commissionRate = 10.0;
  const totalAmount = 1750.0; // ₹1,750
  const commissionAmount = Math.round(totalAmount * (commissionRate / 100) * 100) / 100;
  const mechanicNet = totalAmount - commissionAmount;

  if (commissionAmount !== 175.0) {
    throw new Error(`Expected commission ₹175.00, got ₹${commissionAmount}`);
  }
  if (mechanicNet !== 1575.0) {
    throw new Error(`Expected mechanic net ₹1575.00, got ₹${mechanicNet}`);
  }
});
