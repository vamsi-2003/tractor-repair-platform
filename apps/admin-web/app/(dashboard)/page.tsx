import React from 'react';
import Link from 'next/link';
import {
  Briefcase,
  IndianRupee,
  Coins,
  Radio,
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  Tractor,
  Users,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { getDashboardOverviewMetrics } from '@/lib/actions/overview';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export const revalidate = 10; // refresh every 10 seconds or on demand

export default async function DashboardPage() {
  const { kpis, recentJobs, pendingMechanics } =
    await getDashboardOverviewMetrics();

  return (
    <div className="space-y-8">
      {/* Top Banner / Pilot Status */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-800 rounded-2xl p-6 text-white shadow-md shadow-emerald-950/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Fleet Operations • Active Telemetry
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Tractor Repair Dispatch Operations
          </h2>
          <p className="text-emerald-100/80 text-xs sm:text-sm mt-1 max-w-2xl">
            Real-time dispatch and fleet management. Connect farmers with certified mechanics with end-to-end transparent billing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/jobs">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
            >
              <Briefcase className="w-3.5 h-3.5 mr-1" />
              Live Jobs
            </Button>
          </Link>
          <Link href="/mechanics">
            <Button
              variant="primary"
              size="sm"
              className="bg-white hover:bg-emerald-50 text-emerald-900 border-transparent font-semibold shadow-sm"
            >
              <FileCheck2 className="w-3.5 h-3.5 mr-1" />
              Verify Mechanics ({kpis.pendingApprovals})
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Active Repairs"
          value={kpis.activeJobs}
          subtitle={`${kpis.completedJobs} completed all-time`}
          icon={<Briefcase className="w-5 h-5" />}
          iconBg="bg-blue-50 text-blue-600 border border-blue-100"
        />

        <StatCard
          title="Gross Revenue"
          value={formatCurrency(kpis.totalRevenue)}
          subtitle="Processed via invoices"
          icon={<IndianRupee className="w-5 h-5" />}
          iconBg="bg-emerald-50 text-emerald-600 border border-emerald-100"
        />

        <StatCard
          title="Platform Commission"
          value={formatCurrency(kpis.totalCommission)}
          subtitle="Platform net fees"
          icon={<Coins className="w-5 h-5" />}
          iconBg="bg-amber-50 text-amber-600 border border-amber-100"
        />

        <StatCard
          title="Online Mechanics"
          value={kpis.onlineMechanics}
          subtitle={`${kpis.totalMechanics} registered fleet`}
          icon={<Radio className="w-5 h-5" />}
          iconBg="bg-cyan-50 text-cyan-600 border border-cyan-100"
        />

        <StatCard
          title="Pending Approvals"
          value={kpis.pendingApprovals}
          subtitle="Identity docs to review"
          icon={<FileCheck2 className="w-5 h-5" />}
          iconBg={
            kpis.pendingApprovals > 0
              ? 'bg-amber-50 text-amber-600 border border-amber-200'
              : 'bg-slate-50 text-slate-500 border border-slate-200'
          }
        />

        <StatCard
          title="Active Disputes"
          value={kpis.activeDisputes}
          subtitle="Support tickets open"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBg={
            kpis.activeDisputes > 0
              ? 'bg-rose-50 text-rose-600 border border-rose-200'
              : 'bg-slate-50 text-slate-500 border border-slate-200'
          }
        />
      </div>

      {/* Main Grid: Recent Jobs + Pending Verifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Jobs Stream (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Repair Requests & Jobs</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Latest job status updates and matching lifecycle
                </p>
              </div>
              <Link
                href="/jobs"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                View all jobs
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentJobs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No repair jobs recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-x-auto">
                  {recentJobs.map((job: any) => (
                    <div
                      key={job.id}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge type="job" status={job.status} />
                          <span className="text-[11px] text-slate-400 font-mono">
                            #{job.id.slice(0, 8)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-900 font-medium truncate">
                          <span>
                            {job.customer?.profile?.full_name ||
                              (job.customer?.profile?.phone ? `Farmer (+${job.customer.profile.phone})` : 'Farmer')}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600">
                            {job.request?.category?.name_en || 'General Repair'}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 text-[11px]">
                            Mechanic: {job.mechanic?.profile?.full_name || 'Unassigned'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-slate-900">
                          {job.invoice?.total || job.invoice?.[0]?.total
                            ? formatCurrency(job.invoice?.total || job.invoice?.[0]?.total)
                            : '—'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatDateTime(job.created_at)}
                        </p>
                      </div>

                      <Link href={`/jobs/${job.id}`}>
                        <Button variant="ghost" size="sm">
                          Details
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Operations Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/financials" className="block">
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-xs transition-all flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Mechanic Settlements
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Batch pay balances via UPI
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/settings" className="block">
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-xs transition-all flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
                  <Tractor className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Pilot Parameters
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Radius & visit charges
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/audit" className="block">
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-xs transition-all flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Audit Trail</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Security log of overrides
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Verification Queue (1 col) */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Mechanic Approvals</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pending KYC document review
                </p>
              </div>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                {kpis.pendingApprovals} waiting
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {pendingMechanics.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-medium text-slate-700">
                    No pending verifications
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    All submitted mechanic documents are verified.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingMechanics.map((m: any) => (
                    <div key={m.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            {m.profile?.full_name || 'Mechanic Applicant'}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {m.profile?.phone || 'No phone'}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {formatDateTime(m.created_at)}
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="font-medium text-slate-700">
                          Experience:
                        </span>{' '}
                        {m.experience_years || 0} years •{' '}
                        <span className="font-medium text-slate-700">Workshop:</span>{' '}
                        {m.workshop_address || 'Not specified'}
                      </div>

                      <div className="mt-3 flex justify-end">
                        <Link href={`/mechanics/${m.id}`}>
                          <Button variant="primary" size="sm">
                            Inspect ID Documents
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Dispatch Parameters Card */}
          <Card className="bg-slate-900 text-white border-slate-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <Tractor className="w-4 h-4" />
                Live Dispatch Network
              </div>
              <h4 className="text-sm font-bold text-white">Real-Time GPS Matching</h4>
              <p className="text-xs text-slate-400 mt-1">
                Dynamic geolocation telemetry matches incoming farmer requests with the closest available fleet mechanic.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-slate-800/80 p-2 rounded-lg">
                  <p className="text-[10px] text-slate-400 uppercase">Search Radius</p>
                  <p className="font-bold text-emerald-400 mt-0.5">25 km</p>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-lg">
                  <p className="text-[10px] text-slate-400 uppercase">Timeout</p>
                  <p className="font-bold text-emerald-400 mt-0.5">30s</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
