'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  IndianRupee,
  CreditCard,
  Banknote,
  Coins,
  Send,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Receipt,
  Building,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { processBatchSettlements, recordMechanicFeePayment } from '@/lib/actions/financials';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

export function FinancialsView({
  summary,
  invoices,
  invoicesCount,
  mechanicBalances,
  recentSettlements,
}: {
  summary: any;
  invoices: any[];
  invoicesCount: number;
  mechanicBalances: any[];
  recentSettlements: any[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Selection of mechanics for batch settlement
  const [selectedMechanics, setSelectedMechanics] = useState<string[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [payoutChannel, setPayoutChannel] = useState<'upi' | 'bank_transfer'>('upi');

  const toggleSelectMechanic = (mechanicId: string) => {
    setSelectedMechanics((prev) =>
      prev.includes(mechanicId)
        ? prev.filter((id) => id !== mechanicId)
        : [...prev, mechanicId]
    );
  };

  const selectAllMechanics = () => {
    if (selectedMechanics.length === mechanicBalances.length) {
      setSelectedMechanics([]);
    } else {
      setSelectedMechanics(
        mechanicBalances
          .filter((b) => (b.balance_due || 0) > 0)
          .map((b) => b.mechanic_id)
      );
    }
  };

  const handleBatchPayoutSubmit = () => {
    const items = selectedMechanics.map((id) => {
      const bal = mechanicBalances.find((b) => b.mechanic_id === id);
      return {
        mechanicId: id,
        amount: bal?.balance_due || 0,
        payoutChannel,
      };
    });

    startTransition(async () => {
      await processBatchSettlements(items);
      setSelectedMechanics([]);
      setBatchModalOpen(false);
      router.refresh();
    });
  };

  const [feeModal, setFeeModal] = useState<{
    isOpen: boolean;
    mechanicId: string;
    mechanicName: string;
    platformFeeDue: number;
    amount: string;
    method: 'cash' | 'upi' | 'bank_transfer';
    notes: string;
  }>({
    isOpen: false,
    mechanicId: '',
    mechanicName: '',
    platformFeeDue: 0,
    amount: '',
    method: 'cash',
    notes: '',
  });

  const handleRecordFeeSubmit = () => {
    const amt = parseFloat(feeModal.amount);
    if (isNaN(amt) || amt <= 0) return;

    startTransition(async () => {
      await recordMechanicFeePayment(
        feeModal.mechanicId,
        amt,
        feeModal.method,
        feeModal.notes
      );
      setFeeModal((prev) => ({ ...prev, isOpen: false }));
      router.refresh();
    });
  };

  const selectedTotalAmount = selectedMechanics.reduce((sum, id) => {
    const bal = mechanicBalances.find((b) => b.mechanic_id === id);
    return sum + (bal?.balance_due || 0);
  }, 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Financial Ledger & Mechanic Settlements
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Monitor platform revenue streams, online gateway vs cash receipts, and execute batch UPI payouts.
        </p>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Total Gross GMV</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(summary.totalGrossVolume)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Total repairs invoiced across platform
          </p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Commission Accrued</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(summary.totalCommission)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Standard platform service take rate
          </p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Online (Razorpay)</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(summary.totalOnlineAmount)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            {summary.totalOnlineCount} digital UPI/Card payments
          </p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Cash Collected by Fleet</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(summary.totalCashAmount)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            {summary.totalCashCount} direct cash receipts
          </p>
        </div>
      </div>

      {/* Batch Settlement Processor Section */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle>Mechanic Fee Balances & Batch Settlement</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Net earnings payable to mechanics after platform commission deduction. Select mechanics to batch payout.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedMechanics.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setBatchModalOpen(true)}
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Process Payout ({selectedMechanics.length} •{' '}
                {formatCurrency(selectedTotalAmount)})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {mechanicBalances.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No mechanic balances currently recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-6 py-3">
                      <input
                        type="checkbox"
                        checked={
                          selectedMechanics.length > 0 &&
                          selectedMechanics.length ===
                            mechanicBalances.filter(
                              (b) => (b.balance_due || 0) > 0
                            ).length
                        }
                        onChange={selectAllMechanics}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </th>
                    <th className="px-6 py-3">Mechanic</th>
                    <th className="px-6 py-3">Payment Route (UPI / Bank)</th>
                    <th className="px-6 py-3">Lifetime Earned</th>
                    <th className="px-6 py-3">Commission Due</th>
                    <th className="px-6 py-3">Settled to Date</th>
                    <th className="px-6 py-3 text-right">Net Payable Balance</th>
                    <th className="px-6 py-3 text-right">Fee Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mechanicBalances.map((b) => {
                    const balanceDue = Number(b.balance_due) || 0;
                    const feeDue = Number(b.platform_fee_due) || 0;
                    const isSelected = selectedMechanics.includes(b.mechanic_id);

                    return (
                      <tr
                        key={b.id || b.mechanic_id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            disabled={balanceDue <= 0}
                            checked={isSelected}
                            onChange={() => toggleSelectMechanic(b.mechanic_id)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-30"
                          />
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">
                            {b.mechanic?.profile?.full_name || 'Mechanic'}
                          </p>
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            {b.mechanic?.profile?.phone || 'No phone'}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          {b.mechanic?.upi_id ? (
                            <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              UPI: {b.mechanic.upi_id}
                            </span>
                          ) : b.mechanic?.bank_account_number ? (
                            <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              A/C: ••••{b.mechanic.bank_account_number.slice(-4)}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No account configured</span>
                          )}
                        </td>

                        <td className="px-6 py-4 font-medium text-slate-800">
                          {formatCurrency(b.total_earnings || 0)}
                        </td>

                        <td className="px-6 py-4 text-amber-700 font-medium">
                          {formatCurrency(b.platform_fee_due || 0)}
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {formatCurrency(b.total_settled || 0)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span
                            className={`font-bold text-sm ${
                              balanceDue > 0
                                ? 'text-emerald-700'
                                : 'text-slate-400'
                            }`}
                          >
                            {formatCurrency(balanceDue)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          {feeDue > 0 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs py-1 px-2.5 whitespace-nowrap"
                              onClick={() =>
                                setFeeModal({
                                  isOpen: true,
                                  mechanicId: b.mechanic_id,
                                  mechanicName: b.mechanic?.profile?.full_name || 'Mechanic',
                                  platformFeeDue: feeDue,
                                  amount: String(feeDue),
                                  method: 'cash',
                                  notes: '',
                                })
                              }
                            >
                              Record Fee Received
                            </Button>
                          ) : (
                            <span className="text-slate-400 text-xs">Cleared</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Repair Invoices Ledger ({invoicesCount})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No invoices generated yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Invoice Number</th>
                    <th className="px-6 py-3">Customer / Farmer</th>
                    <th className="px-6 py-3">Mechanic</th>
                    <th className="px-6 py-3">Visit Charge</th>
                    <th className="px-6 py-3">Labor Charge</th>
                    <th className="px-6 py-3">Platform Fee</th>
                    <th className="px-6 py-3">Total Amount</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-semibold text-slate-900">
                        {inv.invoice_number || `#INV-${inv.id.slice(0, 6)}`}
                      </td>
                      <td className="px-6 py-3.5">
                        {inv.job?.customer?.profile?.full_name ||
                          (inv.job?.customer?.profile?.phone ? `Farmer (+${inv.job.customer.profile.phone})` : 'Farmer')}
                      </td>
                      <td className="px-6 py-3.5">
                        {inv.job?.mechanic?.profile?.full_name || 'Mechanic'}
                      </td>
                      <td className="px-6 py-3.5">
                        {formatCurrency(inv.visit_charge || 0)}
                      </td>
                      <td className="px-6 py-3.5">
                        {formatCurrency(inv.repair_amount || inv.labor_charge || 0)}
                      </td>
                      <td className="px-6 py-3.5 text-amber-700 font-medium">
                        {formatCurrency(inv.platform_fee || 0)}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-slate-900">
                        {formatCurrency(inv.total || inv.total_amount || 0)}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                            (inv.status || inv.payment_status) === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {inv.status || inv.payment_status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-400 text-[11px]">
                        {formatDate(inv.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Settlement Modal */}
      <Modal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        title="Execute Batch Mechanic Settlements"
        description={`You are about to settle net fee balances for ${selectedMechanics.length} mechanics totaling ${formatCurrency(selectedTotalAmount)}.`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Select Payout Channel
            </label>
            <select
              value={payoutChannel}
              onChange={(e) =>
                setPayoutChannel(e.target.value as 'upi' | 'bank_transfer')
              }
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="upi">UPI Auto-Payout (Instant Settlement)</option>
              <option value="bank_transfer">Direct IMPS/NEFT Bank Transfer</option>
            </select>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Selected Fleet Mechanics:</span>
              <span className="font-bold text-slate-900">
                {selectedMechanics.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Net Amount:</span>
              <span className="font-bold text-emerald-700 text-sm">
                {formatCurrency(selectedTotalAmount)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBatchModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isPending}
              onClick={handleBatchPayoutSubmit}
            >
              Confirm & Execute Batch Payout
            </Button>
          </div>
        </div>
      </Modal>

      {/* Record Fee Payment Received Modal */}
      <Modal
        isOpen={feeModal.isOpen}
        onClose={() => setFeeModal((prev) => ({ ...prev, isOpen: false }))}
        title="Record Platform Fee Received"
        description={`Record platform fee payment received from ${feeModal.mechanicName} for cash jobs.`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs flex justify-between items-center">
            <span className="text-amber-800 font-medium">Current Platform Fee Owed:</span>
            <span className="font-bold text-amber-900 text-sm">
              {formatCurrency(feeModal.platformFeeDue)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Amount Received (₹)
            </label>
            <input
              type="number"
              min="1"
              max={feeModal.platformFeeDue}
              value={feeModal.amount}
              onChange={(e) =>
                setFeeModal((prev) => ({ ...prev, amount: e.target.value }))
              }
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Payment Method
            </label>
            <select
              value={feeModal.method}
              onChange={(e) =>
                setFeeModal((prev) => ({
                  ...prev,
                  method: e.target.value as 'cash' | 'upi' | 'bank_transfer',
                }))
              }
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="cash">Cash Received in Hand / Office</option>
              <option value="upi">UPI Transfer to Platform</option>
              <option value="bank_transfer">Direct Bank Deposit / IMPS</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Transaction Notes / Reference (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. UTR number, receipt slip number"
              value={feeModal.notes}
              onChange={(e) =>
                setFeeModal((prev) => ({ ...prev, notes: e.target.value }))
              }
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFeeModal((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isPending}
              onClick={handleRecordFeeSubmit}
            >
              Confirm Fee Received
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
