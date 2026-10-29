# Tractor Repair App - Project Conversation & Development History

> **Session Timestamp**: October 28, 2026  
> **Repository**: `D:\my\web projects\Tractor_Repair_App`  
> **Monorepo Architecture**: Turborepo + pnpm workspaces  
> **Mobile App**: `apps/customer-mobile` (Unified Customer & Mechanic Mobile App - Expo SDK 52)  
> **Admin Dashboard**: `apps/admin-web` (Next.js 14 Web Portal)  
> **Shared Library**: `packages/shared` (`@tractor-repair/shared`)  
> **Database & Backend**: Supabase PostgreSQL (`https://clkukpyeqphgeaiikaru.supabase.co`)  
> **Raw Transcript Logs**: [transcript.jsonl](./chat/transcript.jsonl) | [transcript_full.jsonl](./chat/transcript_full.jsonl)

---

## Table of Contents
1. [User Prompts & Objectives](#1-user-prompts--objectives)
2. [Phase 1: App Comparison & Merge (Prompt 1)](#2-phase-1-app-comparison--merge-prompt-1)
3. [Phase 2: 14-Page Prototype UI & Server Rules (Prompt 2)](#3-phase-2-14-page-prototype-ui--server-rules-prompt-2)
4. [Phase 3: Admin Web Dashboard Upgrades (Prompt 3)](#4-phase-3-admin-web-dashboard-upgrades-prompt-3)
5. [Phase 4: Two-Phone Testing Setup & Test Credentials (Prompt 4)](#5-phase-4-two-phone-testing-setup--test-credentials-prompt-4)
6. [Database Migrations & RPC Documentation](#6-database-migrations--rpc-documentation)
7. [Step-by-Step Two-Phone Testing Checklist](#7-step-by-step-two-phone-testing-checklist)
8. [Pending Decisions & Test Data Cleanup](#8-pending-decisions--test-data-cleanup)

---

## 1. User Prompts & Objectives

### User Request Context
The client requested the consolidation and productionization of an end-to-end tractor repair marketplace connecting farmers with nearby certified mechanics:

#### PROMPT 1: Compare and merge the two apps
- Compare `customer-mobile` and `mechanic-mobile` (screens, code quality, state management, backend integration).
- Establish the better base app, obtain confirmation, and merge both apps into ONE unified app under `apps/customer-mobile`.
- Preserve placeholder app name `APP_NAME = "AppName"`. Do not invent names.
- Merge permissions (location, camera, microphone, notifications), package name `com.tractorrepair.app`.
- **Real data only**: eliminate all mock arrays, hardcoded JSON, `Math.random()`, fake ratings, and prototype dummy buttons.

#### PROMPT 2: Build full flow from UI design prototype
- Source of truth: 14-page UI prototype (`Tractor Repair App(prototype).pdf`).
- Single app, two roles: Language screen (English / Telugu / Hindi) → Role selection ("I need a mechanic" / "I'm a mechanic") → 6-digit phone OTP authentication.
- Mechanic registration flow with "Pending Approval" review screen.
- Customer repair flow: saved tractors, problem areas, 60s voice note recording (`expo-av`), photo/video picker, GPS pin card + "Move pin" modal, text-to-speech screen reader (`expo-speech`).
- Server dispatch state machine: 30-second offer timeout per mechanic, "No mechanic available" screen with Retry and Cancel.
- Mechanic assigned with live ETA, call button, green Start Code card, cancellation reason tracking.
- Quote approval & decline flow: if customer declines after arrival, visit charge (default ₹200) is collected in cash and job closes as `quote_declined`.
- Itemized bill screen with green Finish Code card, cash vs feature-flagged online payment.
- 5-star rating and review feedback with "Report a problem" dispute modal.
- Status progression: `requested → offered → accepted → started → quote_sent → quote_approved → in_progress → bill_ready → paid → completed`.

#### PROMPT 3: Admin web dashboard
- Update existing Next.js admin dashboard to work with merged database without rewriting working code.
- Admin authentication with real role check (`role === 'admin'`).
- Mechanic approvals: list pending mechanics, private KYC documents viewed via short-lived signed URLs (1 hour), approve/reject/suspend with reason and in-app system notification.
- Repair requests directory: filter by status, date, problem area, mechanic; view status history, quote, bill, and customer ratings.
- Reported problems: manage customer support tickets, mark open/resolved with admin resolution notes.
- Mechanic fee balances: view `platform_fee_due` from cash jobs with modal to record fee payments received.
- User moderation: 1-click Block/Unblock toggle on customers, mechanics, and settings.
- Real summary KPI cards: active jobs, gross revenue, platform commission, online mechanics, pending approvals.
- Settings page: view and edit `platform_fee_percent` (10%) and `visit_charge_amount` (₹200) from `app_settings` with timestamp change tracking and cancellation governance shield.

#### PROMPT 4: Two-phone testing setup
- Detect framework (React Native / Expo SDK 52) and configure standalone APK build (`buildType: "apk"`).
- Visible version number: `AppName • v1.0.0 (Build 1)` inside app.
- Provide installation steps via USB `adb`, Google Drive, and Firebase App Distribution.
- Pre-seed test customer (`+91 99999 99901`) and approved test mechanic (`+91 99999 99902`) with fixed OTP `123456`.
- Detailed two-phone verification checklist covering all happy and failure scenarios.

---

## 2. Phase 1: App Comparison & Merge (Prompt 1)

### Technical Analysis & Decision
- **Customer App (`apps/customer-mobile`)**: Clean Expo SDK 52 structure, complete customer tab layout, modular booking flow, robust Zustand store integration.
- **Mechanic App (`apps/mechanic-mobile`)**: Had specialized mechanic components (job timers, quote composer) but duplicate configuration and conflicting package names.
- **Verdict**: `apps/customer-mobile` was chosen as the primary base.

### Execution
1. Migrated mechanic screens (`home.tsx`, `active-job.tsx`, `finish-job.tsx`, `incoming-request.tsx`, `earnings.tsx`, `history.tsx`, `profile.tsx`) into `apps/customer-mobile/app/mechanic/`.
2. Created shared config constant [`APP_NAME = "AppName"`](file:///D:/my/web%20projects/Tractor_Repair_App/packages/shared/src/constants/app.ts#L7).
3. Consolidated Android package name to `com.tractorrepair.app` in `app.json`.
4. Merged permissions: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `CAMERA`, `RECORD_AUDIO`, `READ_EXTERNAL_STORAGE`, `POST_NOTIFICATIONS`.
5. Terminated locking Node processes and completely purged `apps/mechanic-mobile`.

---

## 3. Phase 2: 14-Page Prototype UI & Server Rules (Prompt 2)

### UI Design Implementation
All 14 screens from the prototype PDF were implemented with real database queries:
- **Terracotta Brand Accent**: `#C63C14` / `#B73212` applied to primary action buttons.
- **Start Code & Finish Code**: Formatted in green bordered cards (`#2E7D32` with `#F1F8E9` background).
- **Customer Privacy**: Customer mobile numbers remain strictly hidden on incoming job alerts and are only revealed after the mechanic accepts.
- **Multilingual Support**: English, Telugu, and Hindi strings managed via `@tractor-repair/shared`. Device text-to-speech speaker icon added to screen headers.
- **Voice Notes**: `expo-av` audio recording component supporting up to 60 seconds with play/pause/delete controls.
- **GPS Coordinates**: Embedded map coordinate display with "Move pin" manual adjustment modal.

---

## 4. Phase 3: Admin Web Dashboard Upgrades (Prompt 3)

### Upgrades Implemented in `apps/admin-web`:
1. **Real Auth & Middleware**:
   - [`middleware.ts`](file:///D:/my/web%20projects/Tractor_Repair_App/apps/admin-web/middleware.ts) validates sessions and role `admin`.
   - [`signInAdmin`](file:///D:/my/web%20projects/Tractor_Repair_App/apps/admin-web/lib/actions/auth.ts) logs audit events into `audit_logs`.
2. **Mechanic Approvals with Signed URLs**:
   - Private storage bucket `mechanic-documents` queried using `createSignedUrl(path, 3600)`.
   - Approval/rejection/suspension updates mechanic status, records audit logs, and inserts real-time system notifications.
3. **Multi-Filter Repair Directory**:
   - Status tabs, date picker, mechanic selector, and search bar.
   - Comprehensive detail page displaying lifecycle history, itemized quote, invoice, and customer rating/review feedback.
4. **Disputes & Support Tickets**:
   - Support ticket triage with admin resolution notes and refund processing.
5. **Mechanic Fee Balances**:
   - Replaced `Math.random()` with `crypto.randomUUID()`.
   - Added `recordMechanicFeePayment()` action and modal in `financials-view.tsx` to record fee collections from cash jobs.
6. **Cancellation Governance & Risk Shield**:
   - Added top-cancelling customers and mechanics table in `settings-view.tsx`.
   - 1-click `toggleUserBlockStatus` to block repeat offenders.
   - Live editing of `platform_fee_percent` and `visit_charge_amount` from `app_settings`.

---

## 5. Phase 4: Two-Phone Testing Setup & Test Credentials (Prompt 4)

### App Versioning
- Configured version in `app.json` to `1.0.0`.
- Displayed `AppName • v1.0.0 (Build 1)` on:
  - Sign-in screen (`app/auth/sign-in.tsx`)
  - Customer settings screen (`app/customer/(tabs)/settings.tsx`)
  - Mechanic profile screen (`app/mechanic/(tabs)/profile.tsx`)

### Build Configuration (`eas.json`)
Created [`apps/customer-mobile/eas.json`](file:///D:/my/web%20projects/Tractor_Repair_App/apps/customer-mobile/eas.json):
```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### Building the APK
Run the following in `apps/customer-mobile`:
```powershell
cd "D:\my\web projects\Tractor_Repair_App\apps\customer-mobile"
npx eas-cli login
npx eas-cli build --platform android --profile preview
```
Download the resulting APK to `D:\my\web projects\Tractor_Repair_App\builds\app-preview.apk`.

### Pre-Seeded Test Credentials

| Device | User Role | Name | Phone Number | Fixed OTP | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Phone 1** | Customer | `[TEST] Ramesh Farmer` | `+91 99999 99901` | `123456` | Active | Pre-loaded Tractor: *John Deere 5050 D* (`AP 07 TJ 1234`) |
| **Phone 2** | Mechanic | `[TEST] Suresh Certified Mechanic` | `+91 99999 99902` | `123456` | **Approved** | Online: `true`, All 6 skill categories certified, 4.9★ |

---

## 6. Database Migrations & RPC Documentation

### Applied Database Migrations
- **`00005_cancellations_settings_and_statuses.sql`**
  - Added `cancellation_count` column to `customers` and `mechanics`.
  - Added `voice_note` and `audio` types to `request_media`.
  - Seeded `platform_fee_percent` (10) and `visit_charge_amount` (200) in `app_settings`.
- **`00006_server_rules_and_status_enforcement.sql`**
  - `cancel_job_by_customer(p_job_id, p_reason)`
  - `cancel_job_by_mechanic(p_job_id, p_reason)`
  - `record_visit_charge_collected(p_job_id)`
  - `complete_job_cash_server(p_job_id, p_spare_parts_amount, p_finish_code)`

---

## 7. Step-by-Step Two-Phone Testing Checklist

### Scenario A: Happy Path (End-to-End Cash Repair)
1. **Phone 1 (Customer)**:
   - Select Language → Role: **I need a mechanic** → Sign in with `9999999901` / `123456`.
   - Tap **Book Tractor Repair** → Choose *John Deere 5050 D* → Category **Engine** → Record 5s voice note → Confirm pin.
   - Tap **Find Nearby Mechanic**. Radar screen starts pulsing.
2. **Phone 2 (Mechanic)**:
   - Select Role: **I'm a mechanic** → Sign in with `9999999902` / `123456`.
   - Ensure online toggle is **ON**.
   - Incoming offer appears with 30s countdown. Customer phone number is hidden.
   - Tap **Accept Job**.
3. **Arrival & Start Code**:
   - Phone 1 displays green **Start Code** (e.g. `481920`).
   - Phone 2 shows active job screen with customer phone number revealed, Navigate button, and Start Code input.
   - Enter Start Code on Phone 2 and tap **Verify & Arrive**.
4. **Quote & Approval**:
   - Phone 2: Enter Labor ₹300. Tap **Send Quote to Farmer**.
   - Phone 1: Quote screen displays Visit Charge (₹200) + Labor (₹300) = ₹500. Tap **Approve Quote**.
5. **Completion & Payment**:
   - Phone 2: Enter spare parts ₹150. Total is auto-calculated to ₹650.
   - Phone 1: Shows green **Finish Code** (e.g. `829103`).
   - Phone 2: Enter Finish Code and tap **Cash received · mark job done**.
   - Phone 1: Rate mechanic 5 stars and submit review.
6. **Admin Verification**:
   - Open Admin Web (`http://localhost:3000`).
   - In **Requests & Live Dispatches**, verify the job is `completed`.
   - In **Financials**, verify 10% platform fee (₹65) was added to `platform_fee_due`.
   - Test **Record Fee Received** modal to clear the fee balance.

### Scenario B: 30-Second Timeout & Decline
1. Phone 1 creates a request.
2. Phone 2 receives the alert. Let the 30-second timer expire or tap **Decline**.
3. Server transitions offer to next nearby mechanic. If none available, Phone 1 shows **"No mechanic available"** with **Retry** and **Cancel**.

### Scenario C: Quote Declined After Arrival
1. Complete arrival with Start Code.
2. Mechanic sends high quote.
3. Customer taps **Decline Quote**.
4. Screen notifies customer that doorstep visit charge (₹200) is owed.
5. Mechanic collects ₹200 cash. Job closes as `quote_declined`. Platform commission (₹20) is recorded.

### Scenario D: Cancellation Tracking
1. **Customer Cancel Before Arrival**: Customer cancels before Start Code is entered. Fee is ₹0; Customer Cancellation Count increases by 1.
2. **Mechanic Cancel**: Mechanic cancels accepted job. Customer owes nothing; Mechanic Cancellation Count increases by 1.
3. **Admin Moderation**: In Admin Settings, verify cancellation counts and test the **Block User** toggle.

---

## 8. Pending Decisions & Test Data Cleanup

The database currently holds 4 legacy repair requests and 3 legacy jobs from development:
- **Legacy Requests**: `e009b9fd`, `4458e81e`, `2ff3f456`, `1fb8c21a`
- **Legacy Jobs**: `6100ff69`, `5081c3ef`, `226d8c36`

*To start your two-phone field testing with a clean database, confirm deletion of these 7 test rows.*
