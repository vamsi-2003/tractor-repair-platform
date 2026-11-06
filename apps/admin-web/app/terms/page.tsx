import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | Tractor Seva',
  description:
    'Official terms of service for the Tractor Seva platform detailing booking conditions, standard visit charges, and dispute policies.',
};

export default function TermsOfServicePage() {
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
              <span className="text-xs text-slate-500 block">Terms of Service & Operational Standards</span>
            </div>
          </div>
          <Link
            href="/privacy"
            className="text-xs font-semibold text-[#006376] hover:underline flex items-center gap-1"
          >
            Privacy Policy
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8">
          <div className="border-b border-slate-100 pb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200 mb-3">
              <FileText className="w-3.5 h-3.5" />
              Standard Platform Terms • v1.2.0
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Terms of Service</h1>
            <p className="text-sm text-slate-500 mt-2">
              Last Updated: November 6, 2026 • Effective Date: November 6, 2026
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              By downloading, accessing, or using the Tractor Seva mobile application or web portal, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">2. Service Scope & Doorstep Pricing Model</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Tractor Seva acts as a technology intermediary connecting agricultural equipment owners (Farmers) with independent, verified technicians (Mechanics):
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-2">
              <li>
                <strong>Fixed Doorstep Visit Charge:</strong> A standard inspection fee of <strong>₹200</strong> applies once the technician reaches your field, covering diagnostic travel and initial assessment.
              </li>
              <li>
                <strong>Mandatory Itemized Quotation:</strong> No mechanic may begin replacement of components or major repairs without presenting a digital quotation itemizing labor costs and spare parts. Work commences only after the customer explicitly taps &ldquo;Approve&rdquo;.
              </li>
              <li>
                <strong>Start & Finish Codes:</strong> Customers must retain the 6-digit cryptographic security code. Sharing the code validates the physical presence and completion of the job.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">3. Technician Requirements & KYC</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              All partner mechanics must undergo mandatory identity and background verification (Government Aadhaar card, trade experience certificates, and workshop inspection) before receiving job dispatch permissions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">4. Dispute Resolution & Customer Support</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              If an unsatisfactory repair occurs, customers can raise a dispute via the in-app <strong>Disputes & Support</strong> tab within 48 hours of job completion. Our operations team reviews mechanic notes, timestamps, and quotes to initiate remediation.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-xl font-bold text-slate-900">5. Contact Information</h2>
            <p className="text-sm text-slate-600">
              For legal inquiries regarding these terms, contact us at <a href="mailto:legal@tractorseva.com" className="text-[#006376] font-semibold underline">legal@tractorseva.com</a>.
            </p>
          </section>
        </div>

        <div className="text-center py-8 text-xs text-slate-400">
          © {new Date().getFullYear()} Tractor Seva Technologies. All rights reserved. • v1.2.0
        </div>
      </main>
    </div>
  );
}
