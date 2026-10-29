'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Briefcase,
  User,
  Wrench,
  Tractor,
  MapPin,
  Clock,
  IndianRupee,
  AlertTriangle,
  RotateCcw,
  XCircle,
  CheckCircle2,
  FileText,
  Phone,
  Shield,
  Send,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { reassignJobMechanic, cancelJob, updateJobStatus } from '@/lib/actions/jobs';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export function JobDetailView({
  job,
  approvedMechanics,
}: {
  job: any;
  approvedMechanics: any[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Reassign Modal
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedMechanicId, setSelectedMechanicId] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  // Cancel Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Status Override Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState(job.status);
  const [overrideNotes, setOverrideNotes] = useState('');

  const handleReassignSubmit = () => {
    if (!selectedMechanicId) return;
    startTransition(async () => {
      await reassignJobMechanic(job.id, selectedMechanicId, reassignReason);
      setReassignModalOpen(false);
      router.refresh();
    });
  };

  const handleCancelSubmit = () => {
    if (!cancelReason) return;
    startTransition(async () => {
      await cancelJob(job.id, cancelReason);
      setCancelModalOpen(false);
      router.refresh();
    });
  };

  const handleStatusOverrideSubmit = () => {
    startTransition(async () => {
      await updateJobStatus(job.id, overrideStatus, overrideNotes);
      setStatusModalOpen(false);
      router.refresh();
    });
  };

  const latestQuote = job.quotes?.[0];
  const invoice = job.invoice;
  const statusHistory = job.status_history || [];

  return (
    <div className="space-y-6">
      {/* Top Header & Intervention Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link href="/jobs">
            <button className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Job #{job.id.slice(0, 8)}
              </h2>
              <StatusBadge type="job" status={job.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Initiated {formatDateTime(job.created_at)} • Request ID:{' '}
              <span className="font-mono">{job.request_id?.slice(0, 8)}</span>
            </p>
          </div>
        </div>

        {/* Administrative Intervention Actions */}
        <div className="flex items-center gap-2">
          {job.status !== 'completed' && job.status !== 'cancelled' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReassignModalOpen(true)}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1 text-slate-600" />
                Reassign Mechanic
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusModalOpen(true)}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-blue-600" />
                Override Status
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => setCancelModalOpen(true)}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Cancel Job
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Grid: 2 Cols Left (Timeline, Quote & Invoice), 1 Col Right (Parties, Equipment, Location) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Repair Request Details */}
          <Card>
            <CardHeader>
              <CardTitle>Reported Problem & Diagnostics</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    Problem Category
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {job.request?.category?.name_en || 'General Repair'}
                    {job.request?.category?.name_te && (
                      <span className="text-slate-500 font-normal ml-2 text-xs">
                        ({job.request.category.name_te})
                      </span>
                    )}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                  <Briefcase className="w-5 h-5" />
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  Farmer Description
                </span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1 leading-relaxed">
                  {job.request?.description || 'No additional text description provided.'}
                </p>
              </div>

              {job.request?.voice_note_url && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                    Recorded Audio Voice Note
                  </span>
                  <audio controls className="w-full h-8">
                    <source src={job.request.voice_note_url} type="audio/mpeg" />
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quotes & Line Items */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Mechanic Repair Quotes</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visit charges, labor, and itemized spare parts
                </p>
              </div>
              {latestQuote && (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 capitalize">
                  Status: {latestQuote.status}
                </span>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {!latestQuote ? (
                <p className="text-xs text-slate-500 italic">
                  No quote has been generated yet for this repair job.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Visit Fee
                      </span>
                      <p className="font-bold text-slate-900 mt-0.5 text-xs">
                        {formatCurrency(latestQuote.visit_fee)}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Labor Cost
                      </span>
                      <p className="font-bold text-slate-900 mt-0.5 text-xs">
                        {formatCurrency(latestQuote.labor_cost)}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-emerald-700 uppercase font-bold">
                        Total Quote
                      </span>
                      <p className="font-bold text-emerald-800 mt-0.5 text-xs">
                        {formatCurrency(latestQuote.total)}
                      </p>
                    </div>
                  </div>

                  {latestQuote.items && latestQuote.items.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-2">
                        Itemized Breakdown
                      </span>
                      <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-semibold">
                            <tr>
                              <th className="px-3 py-2">Item Description</th>
                              <th className="px-3 py-2">Type</th>
                              <th className="px-3 py-2">Qty</th>
                              <th className="px-3 py-2 text-right">Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {latestQuote.items.map((item: any) => (
                              <tr key={item.id}>
                                <td className="px-3 py-2 font-medium text-slate-800">
                                  {item.description}
                                </td>
                                <td className="px-3 py-2 capitalize text-slate-500 text-[11px]">
                                  {item.item_type || 'Part'}
                                </td>
                                <td className="px-3 py-2 text-slate-600">
                                  {item.quantity}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-slate-900">
                                  {formatCurrency(item.total_price || item.unit_price)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Final Invoice & Payment */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Invoice & Payment Resolution</CardTitle>
              {invoice?.payment_status && (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                  {invoice.payment_status}
                </span>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {!invoice ? (
                <p className="text-xs text-slate-500 italic">
                  Invoice will be generated upon job completion by the mechanic.
                </p>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Visit & Inspection Fee:</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(invoice.visit_charge)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Labor Charge:</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(invoice.labor_charge)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Parts & Materials:</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(invoice.parts_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-amber-700">
                    <span>Platform Commission Deducted:</span>
                    <span className="font-semibold">
                      {formatCurrency(invoice.platform_fee)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 text-sm font-bold text-slate-900">
                    <span>Total Billable Amount:</span>
                    <span className="text-emerald-700">
                      {formatCurrency(invoice.total_amount)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline History */}
          <Card>
            <CardHeader>
              <CardTitle>Lifecycle Status Transition History</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {statusHistory.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  No status transitions logged yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {statusHistory.map((item: any, idx: number) => (
                    <div key={item.id || idx} className="flex gap-3 text-xs">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0 mt-1" />
                        {idx !== statusHistory.length - 1 && (
                          <div className="w-0.5 h-full bg-slate-200 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 capitalize">
                            {item.to_status?.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDateTime(item.created_at)}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Rating & Review */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Customer Rating & Feedback</CardTitle>
              {job.reviews && job.reviews.length > 0 && (
                <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                  <span>★</span>
                  <span>{job.reviews[0].rating} / 5</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {!job.reviews || job.reviews.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  No review submitted yet for this completed job.
                </p>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-1 text-amber-500 text-base">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={i < job.reviews[0].rating ? 'text-amber-500' : 'text-slate-200'}>
                        ★
                      </span>
                    ))}
                  </div>
                  {job.reviews[0].tags && job.reviews[0].tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {job.reviews[0].tags.map((tag: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded-full font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {job.reviews[0].comment && (
                    <p className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 italic">
                      "{job.reviews[0].comment}"
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400">
                    Submitted: {formatDateTime(job.reviews[0].created_at)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Parties, Equipment, Intervention) */}
        <div className="space-y-6">
          {/* Customer Card */}
          <Card>
            <CardHeader>
              <CardTitle>Farmer / Customer</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">
                  {job.customer?.full_name?.charAt(0) || 'F'}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">
                    {job.customer?.full_name || 'Farmer'}
                  </h4>
                  <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {job.customer?.phone || 'No phone'}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-slate-600">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Service Location
                </span>
                <p className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  {job.request?.address || job.request?.landmark || 'Location coordinates on file'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Mechanic Card */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Assigned Mechanic</CardTitle>
              {job.mechanic && (
                <Link
                  href={`/mechanics/${job.mechanic.id}`}
                  className="text-[11px] text-emerald-600 font-semibold hover:underline"
                >
                  View Profile →
                </Link>
              )}
            </CardHeader>
            <CardContent className="p-6 space-y-3 text-xs">
              {!job.mechanic ? (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs text-center">
                  <p className="font-semibold">No Mechanic Currently Assigned</p>
                  <p className="text-[11px] mt-1">
                    System is actively matching candidates or waiting for reassign.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setReassignModalOpen(true)}
                    className="mt-3 w-full"
                  >
                    Assign Mechanic Now
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                      {job.mechanic.profile?.full_name?.charAt(0) || 'M'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">
                        {job.mechanic.profile?.full_name || 'Mechanic'}
                      </h4>
                      <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {job.mechanic.profile?.phone || 'No phone'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                      Workshop
                    </span>
                    <p className="text-slate-700">
                      {job.mechanic.workshop_address || 'Unspecified'}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Equipment Card */}
          <Card>
            <CardHeader>
              <CardTitle>Tractor Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Make & Model:</span>
                <span className="font-bold text-slate-900">
                  {job.request?.tractor?.make} {job.request?.tractor?.model}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Registration Number:</span>
                <span className="font-mono text-slate-900 font-medium">
                  {job.request?.tractor?.registration_number || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Model Year:</span>
                <span className="text-slate-900">
                  {job.request?.tractor?.year || 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reassign Mechanic Modal */}
      <Modal
        isOpen={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        title="Reassign Mechanic"
        description="Select a verified mechanic from the pilot fleet to take over this repair."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Select Certified Mechanic
            </label>
            <select
              value={selectedMechanicId}
              onChange={(e) => setSelectedMechanicId(e.target.value)}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Choose Mechanic --</option>
              {approvedMechanics.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.profile?.full_name} ({m.workshop_address || 'Workshop location not set'}) - {m.rating_avg ? `${m.rating_avg}★` : 'New'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Reassignment Reason
            </label>
            <input
              type="text"
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              placeholder="e.g. Previous mechanic vehicle breakdown / unresponsive"
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReassignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isPending}
              onClick={handleReassignSubmit}
            >
              Confirm Reassignment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Job Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Administrative Job Cancellation"
        description="This will cancel the active job and related customer request."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Cancellation Reason
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Farmer requested cancellation, tractor already moved to dealership..."
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelModalOpen(false)}
            >
              Dismiss
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isPending}
              onClick={handleCancelSubmit}
            >
              Confirm Cancel Job
            </Button>
          </div>
        </div>
      </Modal>

      {/* Status Override Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Manual Lifecycle Status Override"
        description="Bypasses normal state machine transition for operational recovery."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              New Lifecycle Status
            </label>
            <select
              value={overrideStatus}
              onChange={(e) => setOverrideStatus(e.target.value)}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
            >
              <option value="matching">Matching</option>
              <option value="assigned">Assigned</option>
              <option value="mechanic_en_route">Mechanic En Route</option>
              <option value="arrived">Arrived</option>
              <option value="quote_submitted">Quote Submitted</option>
              <option value="repair_in_progress">Repair In Progress</option>
              <option value="completed">Completed</option>
              <option value="disputed">Disputed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Override Notes
            </label>
            <input
              type="text"
              value={overrideNotes}
              onChange={(e) => setOverrideNotes(e.target.value)}
              placeholder="e.g. Overriding status upon customer phone confirmation"
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isPending}
              onClick={handleStatusOverrideSubmit}
            >
              Save Override
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
