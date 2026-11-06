# Google Play Store Reviewer Guide & Credentials

## 🚜 App Information
* **App Name**: Tractor Seva (ట్రాక్టర్ సేవ)
* **Package Name**: `com.tractorrepair.app`
* **Version**: `1.2.0` (Target SDK 34 / Android 14)
* **Category**: Productivity / Auto & Vehicles / Business
* **Target Audience**: Indian Agricultural Community (Farmers & Local Machinery Technicians)

---

## 🔑 App Access & Reviewer Credentials (Google Play Policy)

Because our production authentication uses SMS OTP with Indian telecom carriers (`+91`), we have configured two dedicated **Sandbox Reviewer Accounts** that bypass live cellular SMS delivery so Google Play reviewers worldwide can thoroughly test all features:

### 1. Farmer / Customer Account
* **Phone Number**: `+91 99999 99901`
* **One-Time Passcode (OTP)**: `123456`
* **Alternate Email Login**: `vamsi@gmail.com` / `Vamsi%123`
* **Role**: Customer / Farmer
* **Key Test Journeys**:
  * Raise breakdown request (select tractor model, issue category, audio description).
  * Live GPS dispatch simulation.
  * Start code exchange with technician.
  * Itemized spare parts quotation review and approval.
  * Finish code verification and 5-star rating submission.
  * In-app account deletion under **Settings > Delete Account**.

### 2. Mechanic / Technician Partner Account
* **Phone Number**: `+91 99999 99902`
* **One-Time Passcode (OTP)**: `123456`
* **Alternate Email Login**: `vamsicoc1@gmail.com` / `Vamsi%123`
* **Role**: Verified Agricultural Mechanic
* **Key Test Journeys**:
  * Receive audible sound and banner notification of incoming breakdown.
  * Accept job and navigate to farmer location.
  * Enter farmer's 4-digit start code to unlock tractor inspection.
  * Submit itemized quote with labor and parts breakdown.
  * Verify finish code upon repair completion.
  * Record cash collection and review commission ledger.
  * In-app account deletion under **Console > Profile > Delete Account**.

---

## 🛡️ Permissions Declaration & Technical Rationale

| Permission in Manifest | Why Tractor Seva Needs It |
| :--- | :--- |
| `ACCESS_FINE_LOCATION`<br>`ACCESS_COARSE_LOCATION` | **Core Dispatch Feature**: Calculates exact distance between stranded tractors in agricultural fields and mobile technicians (within a 35 km operational radius). |
| `CAMERA` | **Machinery Diagnosis & KYC**: Allows farmers to photograph broken engine parts and mechanics to capture ID/Aadhaar documents for trade safety verification. |
| `RECORD_AUDIO` | **Accessibility for Rural Farmers**: Many rural farmers describe mechanical knocking or hydraulic noises via audio note instead of typing. |
| `READ_EXTERNAL_STORAGE` / Media Library | Allows uploading pre-existing tractor machinery photos or workshop verification certificates. |
| `POST_NOTIFICATIONS` (Android 13+) | Notifies mechanics of urgent nearby breakdown requests and alerts farmers when their technician has arrived. |

---

## 📋 Data Safety & Legal URLs

* **Hosted Privacy Policy**: [https://tractorrepair.internal/privacy](http://localhost:3000/privacy)
* **Hosted Terms of Service**: [https://tractorrepair.internal/terms](http://localhost:3000/terms)
* **Account Deletion Web Form**: Users may also request complete erasure by emailing `privacy@tractorseva.com` or directly inside the app under **Settings > Delete Account**.
* **Third-Party Data Sharing**: Tractor Seva **does not sell, rent, or commercialize** user personal data, telemetry, or machinery records to third-party ad networks.

---

## 🧪 Step-by-Step E2E Testing Script for Google Testers

1. **Open Tractor Seva** on an Android phone or emulator.
2. Select preferred language (English, Telugu, or Hindi).
3. On the Sign-In screen, enter `9999999901` and tap **Continue**.
4. Enter test OTP `123456` to access the Farmer dashboard.
5. Tap **"Request Repair"**, select "Mahindra 575 DI", choose "Engine won't start", and submit.
6. To test the Mechanic side, sign out, enter `9999999902` (OTP `123456`), and tap **"Accept Request"**.
