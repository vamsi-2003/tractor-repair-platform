# Tractor Repair Marketplace — Deployment Guide

## 1. Prerequisites
- Node.js 18+ and `pnpm` (`npm install -g pnpm`)
- Supabase CLI (`npm install -g supabase`)
- EAS CLI for Expo React Native builds (`npm install -g eas-cli`)
- Vercel or Cloudflare Pages account for Admin Web deployment

---

## 2. Supabase Backend Deployment

### Initializing and Linking
```bash
# Login to Supabase CLI
supabase login

# Link local project to Supabase cloud project
supabase link --project-ref <your-supabase-project-id>

# Push database migrations and schemas
supabase db push

# Apply seed data
supabase db seed
```

### Storage Buckets Setup
Ensure storage buckets are configured in the Supabase Dashboard:
1. `request-media`:
   - Public: `true` (Allows media thumbnails for jobs)
   - Max file size: 15MB
   - Allowed MIME: `image/jpeg, image/png, image/webp, video/mp4, audio/m4a, audio/mp3`
2. `mechanic-documents`:
   - Public: `false` (Strictly private identification documents)
   - Max file size: 10MB
   - Allowed MIME: `image/jpeg, image/png, application/pdf`

### Deploying Edge Functions
```bash
# Deploy all secure serverless Edge Functions
supabase functions deploy match-mechanic --no-verify-jwt
supabase functions deploy assign-job
supabase functions deploy verify-code
supabase functions deploy get-customer-code
supabase functions deploy submit-quote
supabase functions deploy create-payment-order
supabase functions deploy payment-webhook --no-verify-jwt

# Set Edge Function secrets
supabase secrets set \
  RAZORPAY_KEY_ID="rzp_live_xxxxxxxx" \
  RAZORPAY_KEY_SECRET="your_razorpay_secret" \
  RAZORPAY_WEBHOOK_SECRET="your_webhook_secret" \
  EXPO_ACCESS_TOKEN="your_expo_token"
```

---

## 3. Customer Mobile App Deployment (`apps/customer-mobile`)

### EAS Build Configuration
```bash
cd apps/customer-mobile

# Log in to Expo Application Services
eas login

# Configure project
eas build:configure
```

### Build Android APK / App Bundle
```bash
# Build Android production bundle (.aab for Google Play Store)
eas build --platform android --profile production

# Or create standalone test APK for immediate sideloading
eas build --platform android --profile preview
```

### Required Android Permissions
Configured in `app.json`:
- `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` (GPS pin for tractor location)
- `CAMERA` (Fault photo capture)
- `RECORD_AUDIO` (Fault voice note recording)
- `READ_EXTERNAL_STORAGE` (Selecting photos from gallery)

---

## 4. Mechanic Mobile App Deployment (`apps/mechanic-mobile`)

```bash
cd apps/mechanic-mobile

# Build Android production bundle
eas build --platform android --profile production

# Or build test APK
eas build --platform android --profile preview
```

---

## 5. Admin Web Dashboard Deployment (`apps/admin-web`)

### Deploy to Vercel
```bash
cd apps/admin-web

# Install Vercel CLI if needed
npm install -g vercel

# Deploy to Vercel
vercel --prod
```

### Production Environment Variables in Vercel
Set in Vercel Project Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`: `https://<project-ref>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `<anon-key>`
- `SUPABASE_SERVICE_ROLE_KEY`: `<service-role-key>` (Server-side ONLY)
- `NEXTAUTH_SECRET`: `<generated-32-char-secret>`

---

## 6. Razorpay Webhook Configuration
1. Go to **Razorpay Dashboard → Settings → Webhooks**.
2. Click **Add New Webhook**.
3. Set Webhook URL:
   `https://<project-ref>.supabase.co/functions/v1/payment-webhook`
4. Enter Secret: matches `RAZORPAY_WEBHOOK_SECRET`.
5. Subscribe to Events:
   - `payment.authorized`
   - `payment.captured`
   - `payment.failed`
   - `refund.processed`
6. Save and test with a simulated event.
