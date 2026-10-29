'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  ExternalLink,
  Shield,
  Star,
  MapPin,
  Phone,
  Briefcase,
  Building,
  CreditCard,
  Eye,
  Check,
  X,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { verifyMechanic, verifyDocument } from '@/lib/actions/mechanics';
import { toggleUserBlockStatus } from '@/lib/actions/settings';
import { formatDate, formatDateTime } from '@/lib/utils';

export function MechanicDetailView({ mechanic }: { mechanic: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Status Action Modal State
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'approved' | 'rejected' | 'suspended';
    notes: string;
  }>({
    isOpen: false,
    type: 'approved',
    notes: '',
  });

  // Document Reject Modal State
  const [docRejectModal, setDocRejectModal] = useState<{
    isOpen: boolean;
    docId: string | null;
    reason: string;
  }>({
    isOpen: false,
    docId: null,
    reason: '',
  });

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  const handleStatusSubmit = async () => {
    startTransition(async () => {
      await verifyMechanic(mechanic.id, actionModal.type, actionModal.notes);
      setActionModal((prev) => ({ ...prev, isOpen: false }));
      router.refresh();
    });
  };

  const handleDocApprove = async (docId: string) => {
    startTransition(async () => {
      await verifyDocument(docId, mechanic.id, 'approved');
      router.refresh();
    });
  };

  const handleDocRejectSubmit = async () => {
    if (!docRejectModal.docId) return;
    startTransition(async () => {
      await verifyDocument(
        docRejectModal.docId!,
        mechanic.id,
        'rejected',
        docRejectModal.reason
      );
      setDocRejectModal({ isOpen: false, docId: null, reason: '' });
      router.refresh();
    });
  };

  const isProfileActive = mechanic.profile?.is_active !== false;

  const handleToggleBlock = () => {
    if (!mechanic.profile?.id) return;
    startTransition(async () => {
      await toggleUserBlockStatus(
        mechanic.profile.id,
        !isProfileActive,
        'Admin manual moderation from mechanic profile'
      );
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link href="/mechanics">
            <button className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                {mechanic.profile?.full_name || 'Mechanic'}
              </h2>
              <StatusBadge type="mechanic" status={mechanic.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Mechanic ID: <span className="font-mono">{mechanic.id}</span> • Registered {formatDate(mechanic.created_at)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {mechanic.status !== 'approved' && (
            <Button
              variant="success"
              size="sm"
              onClick={() =>
                setActionModal({
                  isOpen: true,
                  type: 'approved',
                  notes: 'Identity verified and certified for dispatch.',
                })
              }
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Approve & Verify
            </Button>
          )}

          {mechanic.status !== 'rejected' && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-700 hover:bg-red-50 hover:border-red-300"
              onClick={() =>
                setActionModal({
                  isOpen: true,
                  type: 'rejected',
                  notes: '',
                })
              }
            >
              <XCircle className="w-4 h-4 mr-1.5 text-red-500" />
              Reject Application
            </Button>
          )}

          {mechanic.status !== 'suspended' && (
            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                setActionModal({
                  isOpen: true,
                  type: 'suspended',
                  notes: '',
                })
              }
            >
              <AlertCircle className="w-4 h-4 mr-1.5" />
              Suspend Account
            </Button>
          )}

          {mechanic.profile?.id && (
            <Button
              variant={isProfileActive ? 'outline' : 'success'}
              size="sm"
              isLoading={isPending}
              onClick={handleToggleBlock}
              className={
                isProfileActive
                  ? 'border-rose-300 text-rose-700 hover:bg-rose-50'
                  : 'bg-emerald-600 text-white'
              }
            >
              {isProfileActive ? 'Block User' : 'Unblock User'}
            </Button>
          )}
        </div>
      </div>

      {/* Grid: 2 Cols Left (KYC Documents + Skills), 1 Col Right (Profile, Banking, Stats) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identity Documents Inspection */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Submitted KYC Identity Documents</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Securely generated private signed URLs valid for 1 hour. Inspect document clarity and authenticity.
                </p>
              </div>
              <Shield className="w-5 h-5 text-emerald-600" />
            </CardHeader>
            <CardContent className="p-6">
              {(!mechanic.documents || mechanic.documents.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">
                    No documents uploaded
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    This applicant has not uploaded Aadhaar or Certificate documents yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mechanic.documents.map((doc: any) => {
                    const isDocApproved = doc.status === 'approved' || doc.status === 'verified';
                    const isDocRejected = doc.status === 'rejected';

                    return (
                      <div
                        key={doc.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Document Type
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 capitalize">
                              {doc.document_type?.replace(/_/g, ' ') || 'ID Document'}
                            </h4>
                            {doc.document_number && (
                              <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                                #{doc.document_number}
                              </p>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              isDocApproved
                                ? 'bg-emerald-100 text-emerald-800'
                                : isDocRejected
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {doc.status || 'Pending'}
                          </span>
                        </div>

                        {/* Document Preview Box */}
                        <div className="h-40 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center relative group">
                          {doc.signed_url ? (
                            <>
                              <img
                                src={doc.signed_url}
                                alt={doc.document_type}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  // Fallback for PDF or non-image
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(doc)}
                                  className="p-2 bg-white text-slate-900 rounded-lg text-xs font-medium shadow-md hover:bg-slate-50 flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Preview
                                </button>
                                <a
                                  href={doc.signed_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-emerald-600 text-white rounded-lg text-xs font-medium shadow-md hover:bg-emerald-700 flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Open
                                </a>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-4">
                              <FileText className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                              <p className="text-[11px] text-slate-500">
                                File path: {doc.file_path || 'No path'}
                              </p>
                            </div>
                          )}
                        </div>

                        {doc.rejection_reason && (
                          <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-700">
                            <span className="font-semibold">Rejection note:</span>{' '}
                            {doc.rejection_reason}
                          </div>
                        )}

                        {/* Document Level Verification Controls */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400">
                            Uploaded {formatDate(doc.created_at)}
                          </span>

                          <div className="flex items-center gap-1">
                            {!isDocApproved && (
                              <button
                                type="button"
                                onClick={() => handleDocApprove(doc.id)}
                                disabled={isPending}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                Verify
                              </button>
                            )}

                            {!isDocRejected && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDocRejectModal({
                                    isOpen: true,
                                    docId: doc.id,
                                    reason: '',
                                  })
                                }
                                disabled={isPending}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                              >
                                <X className="w-3 h-3" />
                                Reject
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mechanic Skills & Problem Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Certified Repair Categories & Specializations</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {(!mechanic.skills || mechanic.skills.length === 0) ? (
                <p className="text-xs text-slate-500">No skill categories tagged.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {mechanic.skills.map((skill: any) => (
                    <div
                      key={skill.id || skill.category_id}
                      className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 flex items-center gap-2"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{skill.category?.name_en || 'Skill'}</span>
                      {skill.category?.name_te && (
                        <span className="text-slate-400 text-[10px]">
                          ({skill.category.name_te})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Jobs History */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Recent Service Dispatch History</CardTitle>
              <span className="text-xs text-slate-500">
                {mechanic.completed_jobs_count || 0} total completed
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {(!mechanic.recentJobs || mechanic.recentJobs.length === 0) ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No jobs logged for this mechanic yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {mechanic.recentJobs.map((j: any) => (
                    <div
                      key={j.id}
                      className="p-4 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <StatusBadge type="job" status={j.status} />
                          <span className="font-mono text-slate-400 text-[11px]">
                            #{j.id.slice(0, 8)}
                          </span>
                        </div>
                        <p className="text-slate-900 font-medium mt-1">
                          Farmer: {j.customer?.full_name || 'Farmer'} •{' '}
                          <span className="text-slate-500">
                            {j.request?.tractor?.make} {j.request?.tractor?.model}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[11px]">
                          {formatDate(j.created_at)}
                        </span>
                        <div className="mt-1">
                          <Link href={`/jobs/${j.id}`}>
                            <span className="text-emerald-600 font-semibold hover:underline">
                              View Job →
                            </span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Profile & Banking Overview (1 col) */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Full Name
                </span>
                <span className="font-semibold text-slate-900 text-sm">
                  {mechanic.profile?.full_name || '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Mobile Phone
                </span>
                <span className="text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {mechanic.profile?.phone || 'Not registered'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Workshop Location
                </span>
                <span className="text-slate-800 flex items-start gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  {mechanic.workshop_address || 'Unspecified location'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 block uppercase">
                    Experience
                  </span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {mechanic.experience_years || 0} Years
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 block uppercase">
                    Service Radius
                  </span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {mechanic.service_radius_km || 25} km
                  </span>
                </div>
              </div>

              {mechanic.admin_notes && (
                <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-lg text-amber-900">
                  <span className="font-bold block mb-0.5 text-[11px]">
                    Internal Admin Notes:
                  </span>
                  <p className="text-[11px] leading-relaxed">{mechanic.admin_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Banking & Payout Ledger */}
          <Card>
            <CardHeader>
              <CardTitle>Banking & Payout Accounts</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  UPI VPA Identifier
                </span>
                <span className="font-mono text-slate-900 font-medium">
                  {mechanic.upi_id || 'Not provided'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Bank Account Number
                </span>
                <span className="font-mono text-slate-900">
                  {mechanic.bank_account_number
                    ? `•••• •••• ${mechanic.bank_account_number.slice(-4)}`
                    : 'Not provided'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  IFSC Code
                </span>
                <span className="font-mono text-slate-900">
                  {mechanic.bank_ifsc || 'Not provided'}
                </span>
              </div>

              {mechanic.balance && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Lifetime Earned:</span>
                    <span className="font-semibold text-slate-900">
                      ₹{mechanic.balance.total_earnings || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Platform Fees Due:</span>
                    <span className="font-semibold text-amber-700">
                      ₹{mechanic.balance.platform_fee_due || 0}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100">
                    <span className="font-bold text-slate-900">
                      Current Net Balance:
                    </span>
                    <span className="font-bold text-emerald-700">
                      ₹{mechanic.balance.balance_due || 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Confirmation Modal */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
        title={
          actionModal.type === 'approved'
            ? 'Certify & Approve Mechanic'
            : actionModal.type === 'rejected'
            ? 'Reject Mechanic Application'
            : 'Suspend Mechanic Fleet Account'
        }
        description="This action updates the mechanic's status and logs an immutable audit event."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Admin Evaluation Notes / Reason
            </label>
            <textarea
              rows={3}
              value={actionModal.notes}
              onChange={(e) =>
                setActionModal((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Enter details for the audit record..."
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setActionModal((prev) => ({ ...prev, isOpen: false }))
              }
            >
              Cancel
            </Button>
            <Button
              variant={
                actionModal.type === 'approved'
                  ? 'success'
                  : actionModal.type === 'rejected'
                  ? 'danger'
                  : 'danger'
              }
              size="sm"
              isLoading={isPending}
              onClick={handleStatusSubmit}
            >
              Confirm Status Change
            </Button>
          </div>
        </div>
      </Modal>

      {/* Document Reject Modal */}
      <Modal
        isOpen={docRejectModal.isOpen}
        onClose={() =>
          setDocRejectModal({ isOpen: false, docId: null, reason: '' })
        }
        title="Reject Identity Document"
        description="Provide a clear reason (e.g. document blurred, expired, name mismatch)."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Rejection Reason
            </label>
            <input
              type="text"
              value={docRejectModal.reason}
              onChange={(e) =>
                setDocRejectModal((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="e.g. Blurred photo, number unreadable..."
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDocRejectModal({ isOpen: false, docId: null, reason: '' })
              }
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isPending}
              onClick={handleDocRejectSubmit}
            >
              Confirm Document Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Document Preview Lightbox Modal */}
      {previewDoc && (
        <Modal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          title={`Document Preview: ${previewDoc.document_type?.replace(/_/g, ' ')}`}
          maxWidth="2xl"
        >
          <div className="flex flex-col items-center">
            {previewDoc.signed_url ? (
              <img
                src={previewDoc.signed_url}
                alt="Document Preview"
                className="max-h-[70vh] w-auto object-contain rounded-lg border border-slate-200"
              />
            ) : (
              <p className="text-xs text-slate-500">No signed URL available</p>
            )}
            <div className="mt-4 flex justify-end w-full">
              <a
                href={previewDoc.signed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Open in new tab <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
