# Tractor Repair Marketplace — Architecture

## Overview

A three-application marketplace connecting farmers needing tractor repairs to verified nearby mechanics, with admin oversight.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Customer     │  │  Mechanic    │  │  Admin Web           │  │
│  │  Mobile App   │  │  Mobile App  │  │  Dashboard           │  │
│  │  (Expo/RN)    │  │  (Expo/RN)   │  │  (Next.js)           │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
└─────────┼─────────────────┼──────────────────────┼──────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE BACKEND                            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Auth        │  │  Realtime   │  │  Edge Functions         │ │
│  │  (Phone OTP) │  │  (WebSocket)│  │  (Deno)                 │ │
│  └─────────────┘  └─────────────┘  │  - create-repair-request│ │
│                                     │  - match-mechanic       │ │
│  ┌─────────────┐  ┌─────────────┐  │  - verify-code          │ │
│  │  Storage     │  │  PostgreSQL │  │  - submit-quote         │ │
│  │  (Private)   │  │  + PostGIS  │  │  - create-payment      │ │
│  │  - ID docs   │  │  + RLS      │  │  - process-webhook     │ │
│  │  - Photos    │  │             │  │  - assign-job           │ │
│  │  - Voice     │  │             │  │  - update-job-status    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                             │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Razorpay    │  │  Google     │  │  Expo Push              │ │
│  │  (Payments)  │  │  Maps       │  │  Notifications          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
tractor-repair/
├── apps/
│   ├── customer-mobile/     # React Native + Expo (TypeScript)
│   │   ├── app/             # Expo Router screens
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom hooks (auth, location, etc.)
│   │   ├── services/        # API client, Supabase client
│   │   ├── store/           # State management (Zustand)
│   │   └── assets/          # Images, fonts
│   │
│   ├── mechanic-mobile/     # React Native + Expo (TypeScript)
│   │   ├── app/             # Expo Router screens
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   └── assets/
│   │
│   └── admin-web/           # Next.js 14 (TypeScript)
│       ├── app/             # App Router pages
│       ├── components/      # UI components (shadcn/ui)
│       ├── lib/             # Server utilities, auth
│       └── public/          # Static assets
│
├── packages/
│   └── shared/              # Shared code
│       └── src/
│           ├── types/       # TypeScript interfaces & enums
│           ├── validation/  # Zod schemas
│           ├── i18n/        # Translations (en, te, hi)
│           ├── constants/   # App constants, status transitions
│           └── utils/       # Formatting, job helpers
│
├── supabase/
│   ├── migrations/          # Versioned SQL migrations
│   ├── functions/           # Deno Edge Functions
│   ├── tests/               # pgTAP RLS tests
│   └── config.toml          # Supabase project config
│
└── docs/                    # Documentation
```

## Technology Decisions

### Why React Native + Expo?
- Single codebase for Android (primary) and iOS (future)
- Expo SDK provides camera, location, audio recording, push notifications
- Expo Router for file-based routing
- Over-the-air updates for quick fixes

### Why Supabase?
- PostgreSQL with PostGIS for geospatial queries (mechanic matching)
- Built-in phone OTP authentication
- Row Level Security for fine-grained access control
- Realtime subscriptions for live job updates
- Storage with signed URLs for private documents
- Edge Functions for secure server-side logic

### Why Next.js for Admin?
- Server-side rendering for security (no API keys in browser)
- App Router with server components
- Middleware for auth protection
- shadcn/ui for rapid, accessible UI development

### Why Razorpay?
- India-focused payment gateway
- Supports UPI and card payments
- Server-side order creation and webhook verification
- Standard for Indian marketplace applications

## Data Flow

### Repair Request Flow
```
Customer App                    Supabase                     Mechanic App
    │                              │                              │
    ├─ Create repair request ─────►│                              │
    │                              ├─ Save to DB                  │
    │                              ├─ Find nearby mechanics       │
    │                              ├─ Notify candidates ─────────►│
    │                              │                              │
    │                              │◄── Accept job ──────────────┤
    │                              ├─ Atomic assignment           │
    │◄── Assignment notification ──┤                              │
    │                              ├─ Generate start code         │
    │◄── Start code ──────────────┤                              │
    │                              │                              │
    │  Tell mechanic code ────────────────────────────────────────►│
    │                              │◄── Verify start code ───────┤
    │                              ├─ Validate & mark used        │
    │                              │                              │
    │                              │◄── Submit quote ────────────┤
    │◄── Quote for approval ──────┤                              │
    │── Approve quote ────────────►│                              │
    │                              ├─ Notify mechanic ───────────►│
    │                              │                              │
    │                              │◄── Complete repair ─────────┤
    │◄── Bill + finish code ──────┤                              │
    │                              │                              │
    │── Pay online ───────────────►│                              │
    │                              ├─ Create Razorpay order       │
    │◄── Payment page ────────────┤                              │
    │── Payment complete ─────────►│                              │
    │                              ├─ Verify webhook              │
    │                              ├─ Update payment status       │
    │                              ├─ Calculate commission        │
    │                              ├─ Generate finish code        │
    │◄── Receipt ─────────────────┤                              │
    │                              ├─ Notify mechanic ───────────►│
    │                              │                              │
    │── Submit rating ────────────►│                              │
    │                              ├─ Update mechanic rating      │
    └                              └                              └
```

## Security Architecture

See [SECURITY.md](./SECURITY.md) for complete security documentation.

Key principles:
1. **RLS on every table** — PostgreSQL enforces access at the database level
2. **Server-side business logic** — Edge Functions handle state transitions, codes, payments
3. **No secrets in client code** — Only anon key in mobile apps
4. **Signed URLs for private media** — ID documents never publicly accessible
5. **Secure codes** — Hashed, expiring, single-use, rate-limited
6. **Audit trail** — Every sensitive operation logged
