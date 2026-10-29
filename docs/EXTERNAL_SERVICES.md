# Tractor Repair Marketplace — External Services

## Required Services

### 1. Supabase
- **Purpose**: Backend (Database, Auth, Storage, Realtime, Edge Functions)
- **Setup**: Create project at https://supabase.com
- **Required Config**:
  - `SUPABASE_URL` — Project URL
  - `SUPABASE_ANON_KEY` — Public anon key (safe for client)
  - `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-side ONLY)
- **Phone Auth**: Enable Phone provider in Dashboard → Authentication → Providers
  - Configure SMS provider (Twilio, MessageBird, Vonage, or MSG91)
  - See: https://supabase.com/docs/guides/auth/phone-login

### 2. Razorpay
- **Purpose**: Online payments (UPI, cards)
- **Setup**: Create account at https://razorpay.com
- **Required Config**:
  - `RAZORPAY_KEY_ID` — API key ID (starts with `rzp_`)
  - `RAZORPAY_KEY_SECRET` — API key secret (server-side ONLY)
  - `RAZORPAY_WEBHOOK_SECRET` — Webhook signing secret
- **Webhook URL**: Configure at Razorpay Dashboard → Settings → Webhooks
  - URL: `https://<project-ref>.supabase.co/functions/v1/payment-webhook`
  - Events: `payment.authorized`, `payment.captured`, `payment.failed`, `refund.processed`
- **Test Mode**: Use `rzp_test_*` keys for development
- **Documentation**: https://razorpay.com/docs/api/

### 3. Google Maps Platform
- **Purpose**: Maps display, GPS, geocoding, directions
- **Setup**: Enable APIs at https://console.cloud.google.com
- **Required APIs**:
  - Maps SDK for Android
  - Maps SDK for iOS
  - Geocoding API
  - Directions API
- **Required Config**:
  - `GOOGLE_MAPS_API_KEY` — Restricted API key
- **Key Restrictions**:
  - Android: Restrict by package name and SHA-1
  - Web: Restrict by HTTP referrer
  - API: Restrict to only enabled APIs

### 4. Expo Push Notifications
- **Purpose**: Push notifications to mobile apps
- **Setup**: Configure at https://expo.dev
- **Required Config**:
  - `EXPO_ACCESS_TOKEN` — Access token for push API
- **Documentation**: https://docs.expo.dev/push-notifications/overview/

## Development Without Credentials

### Supabase
- Run locally: `supabase start` (Docker required)
- Local dashboard: http://localhost:54323
- Local API: http://localhost:54321
- Default anon key provided by local setup

### Razorpay
- Use test mode keys (`rzp_test_*`)
- Test card: 4111 1111 1111 1111
- Test UPI: success@razorpay
- Without keys: Payment flows show "payment provider not configured" message

### Google Maps
- Without key: Map components show placeholder with message
- Location services still work (GPS)
- Geocoding falls back to coordinates display

### Push Notifications
- Without token: Notifications logged to console
- Realtime subscriptions still deliver in-app updates

## Production Checklist

- [ ] Supabase project created and configured
- [ ] Phone SMS provider configured and tested
- [ ] Razorpay production keys obtained and verified
- [ ] Razorpay webhook URL configured
- [ ] Google Maps APIs enabled with key restrictions
- [ ] Expo push notification credentials configured
- [ ] All environment variables set in production
- [ ] No test/mock data in production database
- [ ] SSL/HTTPS enforced
- [ ] API key restrictions applied
