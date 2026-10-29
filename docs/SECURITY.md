# Tractor Repair Marketplace — Security

## Authentication

### Customer Authentication
- **Method**: Phone OTP via Supabase Auth
- **Flow**: Customer enters +91 mobile → receives 4-digit SMS OTP → verifies → session created
- **Session**: JWT tokens managed by Supabase client SDK
- **Token refresh**: Automatic via Supabase client

### Mechanic Authentication
- **Method**: Phone OTP (same as customer) with additional registration/approval gate
- **Registration**: Submit profile, skills, ID documents → admin reviews → approve/reject
- **Gate**: Only `approved` mechanics can access job-related features
- **Status checks**: Backend verifies `mechanic.status = 'approved'` on every protected operation

### Admin Authentication
- **Method**: Email/password via Supabase Auth
- **Role check**: Admin role verified server-side on every request
- **Dashboard**: Next.js middleware checks auth before serving pages

## Row Level Security (RLS)

RLS is enabled on **every table**. Policies follow least-privilege:

| Table | Customer Access | Mechanic Access | Admin Access |
|-------|----------------|-----------------|--------------|
| profiles | Own only | Own only | All |
| customers | Own only | — | All |
| mechanics | View approved | Own only | All |
| mechanic_documents | — | Own only | All |
| repair_requests | Own only | Assigned jobs only | All |
| jobs | Own only | Assigned only | All |
| quotes | Own jobs | Own jobs | All |
| invoices | Own only | Own jobs | All |
| payments | Own only | Own jobs | All |
| secure_codes | — | — | — (service role only) |
| reviews | Read all | Read all | All |
| notifications | Own only | Own only | All |
| app_settings | Read only | Read only | Read/Write |
| audit_logs | — | — | Read only |

## Secure Codes

### Generation
- Server-side only (Edge Function)
- Cryptographically random (crypto.randomInt)
- 6-digit numeric codes
- Stored as bcrypt hash (never plaintext)
- Expiry: 30 minutes (configurable)

### Verification
- Maximum 3 attempts per code
- Rate limited (5 attempts per minute per IP)
- Single-use (marked used after verification)
- Must match job_id and authorized user
- Audit logged on every attempt

### Start Code
- Generated when mechanic is assigned
- Displayed to customer only
- Mechanic enters to begin work
- Prevents unauthorized service start

### Finish Code
- Generated when repair is completed and payment recorded
- Displayed to customer after payment
- Mechanic enters to confirm job completion
- Prevents premature job closure

## Payment Security

### Server-Side Only
- Razorpay key_secret NEVER sent to client
- Payment orders created via Edge Function
- Webhook signatures verified server-side
- Payment status confirmed via Razorpay API, not client callbacks

### Webhook Processing
- Signature verification using HMAC SHA256
- Idempotent processing (event ID tracked)
- Duplicate events safely ignored
- Failed webhooks do not corrupt state

### Data Protection
- No card numbers stored
- No sensitive payment credentials in database
- Only Razorpay order/payment IDs stored for reconciliation

## Storage Security

### Private Bucket (mechanic-documents)
- No public access
- Signed URLs with 5-minute expiry for admin viewing
- RLS on storage objects
- Only mechanic can upload their own documents
- Only admins can view documents

### Public Bucket (request-media)
- Photos/videos attached to repair requests
- Access controlled by RLS on request_media table
- Only request owner and assigned mechanic can view

## Input Validation

- All inputs validated server-side via Zod schemas
- Phone numbers: Indian format (+91, 10 digits)
- Coordinates: Valid lat/lng ranges
- Monetary amounts: Positive, max 2 decimal places
- File uploads: Type and size restricted
- SQL injection: Prevented by parameterized queries (Supabase client)
- XSS: React auto-escapes, no dangerouslySetInnerHTML

## Rate Limiting

- OTP requests: 3 per phone per 10 minutes
- Code verification: 5 attempts per minute per IP
- API requests: Standard Supabase rate limits
- Payment creation: 1 per job per minute

## Audit Trail

Every sensitive operation is logged to `audit_logs`:
- User authentication events
- Mechanic approval/rejection
- Job status transitions
- Code verification attempts
- Payment events
- Admin configuration changes
- Document access

## Environment Security

- `.env.example` contains only placeholders
- Real secrets in `.env.local` (gitignored)
- Service role key: server-side only
- Anon key: safe for client (RLS enforces access)
- Razorpay secrets: Edge Functions only
- Google Maps key: restricted by API key restrictions in Google Cloud Console
