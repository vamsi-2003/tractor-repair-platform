'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Search,
  CheckCircle,
  Clock,
  IndianRupee,
  Phone,
  User,
  ArrowRight,
  MessageSquare,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { resolveSupportTicket, processRefund } from '@/lib/actions/disputes';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export function DisputesView({
  tickets,
  count,
  currentStatus,
  currentPriority,
  currentSearch,
}: {
  tickets: any[];
  count: number;
  currentStatus: string;
  currentPriority: string;
  currentSearch: string;
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(currentSearch);
  const [isPending, startTransition] = useTransition();

  // Resolution Modal State
  const [resolveModal, setResolveModal] = useState<{
    isOpen: boolean;
    ticketId: string | null;
    status: 'resolved' | 'closed' | 'in_progress';
    resolution: string;
  }>({
    isOpen: false,
    ticketId: null,
    status: 'resolved',
    resolution: '',
  });

  // Refund Modal State
  const [refundModal, setRefundModal] = useState<{
    isOpen: boolean;
    ticket: any | null;
    amount: number;
    reason: string;
  }>({
    isOpen: false,
    ticket: null,
    amount: 0,
    reason: '',
  });

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(window.location.search);
    if (status && status !== 'all') {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    params.set('page', '1');
    router.push(`/disputes?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim());
    } else {
      params.delete('q');
    }
    params.set('page', '1');
    router.push(`/disputes?${params.toString()}`);
  };

  const handleResolveSubmit = () => {
    if (!resolveModal.ticketId || !resolveModal.resolution) return;
    startTransition(async () => {
      await resolveSupportTicket(
        resolveModal.ticketId!,
        resolveModal.resolution,
        resolveModal.status
      );
      setResolveModal({
        isOpen: false,
        ticketId: null,
        status: 'resolved',
        resolution: '',
      });
      router.refresh();
    });
  };

  const handleRefundSubmit = () => {
    if (!refundModal.ticket || refundModal.amount <= 0) return;
    const payment = refundModal.ticket.job?.payments?.[0];
    const paymentId = payment?.id || `sim_pay_${Date.now()}`;
    const jobId = refundModal.ticket.job?.id || refundModal.ticket.job_id || 'manual_job';

    startTransition(async () => {
      await processRefund(
        paymentId,
        jobId,
        refundModal.amount,
        refundModal.reason
      );
      setRefundModal({ isOpen: false, ticket: null, amount: 0, reason: '' });
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Disputes & Support Ticket Resolution
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Resolve farmer complaints, address mechanical disputes, and process financial refunds.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search subject, category..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-xs"
          />
        </form>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { label: 'All Tickets', value: 'all' },
          { label: 'Open', value: 'open' },
          { label: 'In Progress', value: 'in_progress' },
          { label: 'Resolved', value: 'resolved' },
          { label: 'Closed', value: 'closed' },
        ].map((tab) => {
          const active =
            currentStatus === tab.value ||
            (!currentStatus && tab.value === 'all');
          return (
            <button
              key={tab.value}
              onClick={() => handleStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                active
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{tickets.length}</span> of{' '}
        <span className="font-semibold text-slate-700">{count}</span> dispute tickets
      </div>

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
          <h4 className="text-sm font-semibold text-slate-800">
            No active disputes found
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            All customer and mechanic support tickets have been addressed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => {
            const isResolved = t.status === 'resolved' || t.status === 'closed';
            const invoiceAmount = t.job?.invoice?.total_amount || 0;

            return (
              <div
                key={t.id}
                className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-4 hover:border-slate-300 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <StatusBadge type="priority" status={t.priority} />
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                        isResolved
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {t.status?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Ticket #{t.id.slice(0, 8)}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    Logged {formatDateTime(t.created_at)}
                  </span>
                </div>

                {/* Complaint Details */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900">{t.subject}</h3>
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                    {t.description}
                  </p>
                </div>

                {/* Parties and Job Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Reporter / User
                    </span>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {t.reporter?.full_name || 'Customer'}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      {t.reporter?.phone || 'No phone'}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Associated Job
                    </span>
                    {t.job ? (
                      <div>
                        <Link href={`/jobs/${t.job.id}`}>
                          <span className="font-semibold text-emerald-600 hover:underline">
                            Job #{t.job.id.slice(0, 8)} →
                          </span>
                        </Link>
                        <p className="text-slate-500 text-[11px]">
                          Mechanic: {t.job.mechanic?.profile?.full_name || 'Assigned'}
                        </p>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No job linked</span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Job Value & Settlement
                    </span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {invoiceAmount > 0 ? formatCurrency(invoiceAmount) : '—'}
                    </p>
                    {t.job?.invoice?.payment_status && (
                      <span className="text-emerald-600 text-[11px] capitalize font-medium">
                        Payment: {t.job.invoice.payment_status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Resolution note if resolved */}
                {t.resolution && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-lg text-xs text-emerald-900">
                    <span className="font-bold block mb-0.5">
                      Resolution Applied:
                    </span>
                    <p className="leading-relaxed">{t.resolution}</p>
                    <span className="text-[10px] text-emerald-700 block mt-1">
                      Resolved {formatDateTime(t.resolved_at)}
                    </span>
                  </div>
                )}

                {/* Dispute Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100">
                  {t.job && invoiceAmount > 0 && !isResolved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setRefundModal({
                          isOpen: true,
                          ticket: t,
                          amount: invoiceAmount,
                          reason: `Dispute refund for ticket #${t.id.slice(0, 8)}`,
                        })
                      }
                      className="text-amber-700 hover:bg-amber-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Issue Customer Refund
                    </Button>
                  )}

                  {!isResolved && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        setResolveModal({
                          isOpen: true,
                          ticketId: t.id,
                          status: 'resolved',
                          resolution: '',
                        })
                      }
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Resolve Ticket
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolve Ticket Modal */}
      <Modal
        isOpen={resolveModal.isOpen}
        onClose={() =>
          setResolveModal({
            isOpen: false,
            ticketId: null,
            status: 'resolved',
            resolution: '',
          })
        }
        title="Resolve Support Ticket"
        description="Record resolution terms and mark the dispute resolved."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Resolution Outcome & Notes
            </label>
            <textarea
              rows={3}
              value={resolveModal.resolution}
              onChange={(e) =>
                setResolveModal((prev) => ({ ...prev, resolution: e.target.value }))
              }
              placeholder="e.g. Mechanic agreed to revisit and re-adjust clutch free of cost, customer satisfied..."
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setResolveModal({
                  isOpen: false,
                  ticketId: null,
                  status: 'resolved',
                  resolution: '',
                })
              }
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isPending}
              onClick={handleResolveSubmit}
            >
              Confirm Resolution
            </Button>
          </div>
        </div>
      </Modal>

      {/* Process Refund Modal */}
      <Modal
        isOpen={refundModal.isOpen}
        onClose={() =>
          setRefundModal({ isOpen: false, ticket: null, amount: 0, reason: '' })
        }
        title="Process Customer Refund"
        description="Records platform refund for this dispute and marks payment refunded."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Refund Amount (INR ₹)
            </label>
            <input
              type="number"
              value={refundModal.amount}
              onChange={(e) =>
                setRefundModal((prev) => ({
                  ...prev,
                  amount: Number(e.target.value),
                }))
              }
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Refund Rationale
            </label>
            <input
              type="text"
              value={refundModal.reason}
              onChange={(e) =>
                setRefundModal((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="Reason for refund..."
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setRefundModal({
                  isOpen: false,
                  ticket: null,
                  amount: 0,
                  reason: '',
                })
              }
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isPending}
              onClick={handleRefundSubmit}
            >
              Process Refund
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
