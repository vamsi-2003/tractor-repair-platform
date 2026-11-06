import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Lock, MapPin, Camera, Mic, Trash2, FileText, Mail } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | Tractor Seva',
  description:
    'Official privacy policy for the Tractor Seva platform detailing GPS location, camera, audio, and personal data usage.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#006376] flex items-center justify-center text-white font-bold text-lg">
              TS
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight">Tractor Seva</span>
              <span className="text-xs text-slate-500 block">Trust, Transparency & Farmer Mobility</span>
            </div>
          </div>
          <Link
            href="/terms"
            className="text-xs font-semibold text-[#006376] hover:underline flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5" />
            Terms of Service
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8">
          {/* Header */}
          <div className="border-b border-slate-100 pb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              Google Play Compliant • Version 1.2.0
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-slate-500 mt-2">
              Last Updated: November 6, 2026 • Effective Date: November 6, 2026
            </p>
          </div>

          {/* Section 1: Introduction */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              1. Introduction
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Welcome to <strong>Tractor Seva</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). We are dedicated to delivering reliable, doorstep breakdown repair services for agricultural tractors across rural India. This Privacy Policy governs our single unified application serving farmers (&ldquo;Customer&rdquo;) and technicians (&ldquo;Mechanic&rdquo;), as well as our administrative operations platform.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              We operate under a fundamental premise: <em>your personal data and location belong to you</em>. We never sell, rent, or trade your personal or agricultural data to third-party advertisers.
            </p>
          </section>

          {/* Section 2: Data We Collect */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">2. Information We Collect and Why</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Location */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-2 text-[#006376] font-semibold text-sm">
                  <MapPin className="w-4 h-4" />
                  Precise GPS Geolocation
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Collected when a farmer creates a breakdown request or when a mechanic toggles their radar Online. Used solely to calculate on-road distance (within a 35 km radius), route mechanics to agricultural fields, and calculate accurate ETAs.
                </p>
              </div>

              {/* Camera */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-2 text-[#006376] font-semibold text-sm">
                  <Camera className="w-4 h-4" />
                  Camera & Photo Library
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Used when farmers photograph engine leaks, hydraulic failures, or mechanical issues, and when technicians upload Aadhaar ID and workshop trade certificates for KYC verification.
                </p>
              </div>

              {/* Microphone */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-2 text-[#006376] font-semibold text-sm">
                  <Mic className="w-4 h-4" />
                  Voice Problem Descriptions
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Farmers can record brief voice notes describing unusual tractor sounds. Audio files are uploaded to secure cloud storage and played only by the assigned technician.
                </p>
              </div>

              {/* Machinery & Contact */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-2 text-[#006376] font-semibold text-sm">
                  <Lock className="w-4 h-4" />
                  Profile & Tractor Details
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Includes full name, mobile number, village/mandal address, and tractor machinery specs (make, model, manufacturing year, registration number) to ensure the technician brings compatible spare parts.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Customer Privacy & Reveal Safeguards */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">3. Privacy Safeguards in the Repair Dispatch Flow</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              To protect farmers from unsolicited phone calls and privacy violations:
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5">
              <li>
                <strong>Hidden Contact Information:</strong> Nearby mechanics reviewing incoming requests see only the tractor make, problem category, and general village radius. The farmer&rsquo;s phone number and exact farm coordinates are encrypted and hidden.
              </li>
              <li>
                <strong>Cryptographic Start Codes:</strong> When a mechanic accepts a job, a 6-digit start code is issued to the farmer. The repair timer cannot start until the mechanic arrives on the field and the farmer shares this code.
              </li>
              <li>
                <strong>Itemized Digital Invoicing:</strong> Quotes specify a fixed ₹200 doorstep visit charge, labor cost, and spare parts breakdown. No hidden fees or inflated estimates.
              </li>
            </ul>
          </section>

          {/* Section 4: Data Security & Storage */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">4. Data Security & Storage</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              All Tractor Seva data is stored in enterprise-grade Supabase PostgreSQL infrastructure with Row Level Security (RLS) enabled. Communications between your mobile device and our backend use TLS 1.3 encryption. Passwords and authentication tokens are salted and hashed using bcrypt.
            </p>
          </section>

          {/* Section 5: Account Deletion (Google Play Policy §4.8) */}
          <section className="space-y-4 p-5 rounded-xl border border-rose-200 bg-rose-50/30">
            <h2 className="text-xl font-bold text-rose-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              5. Your Rights & Account Deletion Policy
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              In accordance with Google Play Store Developer Guidelines and global privacy laws, you have full control over your personal data. You may request the permanent deletion of your Tractor Seva account at any time:
            </p>
            <div className="space-y-2 text-sm text-slate-700">
              <p>
                <strong>Method 1 (Instant In-App Deletion):</strong> Navigate to <strong>Settings &gt; Farmer Profile &gt; Delete Account</strong>. Confirming will immediately deactivate your credentials and erase your profile.
              </p>
              <p>
                <strong>Method 2 (Web & Email Request):</strong> Send an email to{' '}
                <a href="mailto:privacy@tractorseva.com" className="text-[#006376] font-semibold underline">
                  privacy@tractorseva.com
                </a>{' '}
                from your registered mobile/email address with the subject &ldquo;Account Deletion Request&rdquo;. We will erase your personal record within 7 business days.
              </p>
            </div>
            <p className="text-xs text-slate-500 italic">
              Note: Historical financial receipts and invoice audit records may be retained in anonymized form as required by Indian tax and commercial compliance regulations.
            </p>
          </section>

          {/* Section 6: Grievance Officer & Contact */}
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#006376]" />
              6. Grievance Redressal & Contact Us
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              If you have any questions or concerns regarding our privacy practices, you can reach out to our Grievance Officer:
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-800 text-sm">Tractor Seva Operations Grievance Cell</p>
              <p>Guntur Regional Operations Center, Andhra Pradesh, India</p>
              <p>Email: <a href="mailto:privacy@tractorseva.com" className="text-[#006376] underline font-medium">privacy@tractorseva.com</a></p>
              <p>Support Helpline: +91 99999 99901</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="text-center py-8 text-xs text-slate-400">
          © {new Date().getFullYear()} Tractor Seva Technologies. All rights reserved. • v1.2.0
        </div>
      </main>
    </div>
  );
}
