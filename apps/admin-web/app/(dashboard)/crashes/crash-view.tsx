'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CrashLogItem } from '@/lib/actions/crashes';
import {
  AlertTriangle,
  Bug,
  Search,
  Smartphone,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface CrashViewProps {
  logs: CrashLogItem[];
  count: number;
  currentSeverity: string;
  currentRole: string;
  currentSearch: string;
}

export function CrashView({
  logs,
  count,
  currentSeverity,
  currentRole,
  currentSearch,
}: CrashViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(currentSearch);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleFilter = (key: string, val: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (val === 'all' || !val) {
      params.delete(key);
    } else {
      params.set(key, val);
    }
    params.delete('page');
    router.push(`/crashes?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilter('q', searchTerm);
  };

  const fatalCount = logs.filter((l) => l.severity === 'fatal').length;
  const errorCount = logs.filter((l) => l.severity === 'error').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Bug className="h-6 w-6 text-rose-600" />
            App Crashes & Health Telemetry
          </h1>
          <p className="text-sm text-slate-500">
            Real-time uncaught exception monitoring, React render crashes, and field error diagnostics across farmer & mechanic devices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Telemetry Active
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Recorded</span>
            <Bug className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{count}</p>
          <span className="text-xs text-slate-500">Across v1.2.0 client builds</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-sm bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-700 uppercase tracking-wider">Fatal Exceptions</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-700">{fatalCount}</p>
          <span className="text-xs text-rose-600">Component unmount crashes</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 uppercase tracking-wider">Unhandled Errors</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">{errorCount}</p>
          <span className="text-xs text-amber-600">Handled API / promise errors</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Target App</span>
            <Smartphone className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">v1.2.0</p>
          <span className="text-xs text-slate-500">Tractor Seva unified client</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search error or screen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
          />
        </form>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Severity filter */}
          <select
            value={currentSeverity}
            onChange={(e) => handleFilter('severity', e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700"
          >
            <option value="all">All Severities</option>
            <option value="fatal">Fatal</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
          </select>

          {/* Role filter */}
          <select
            value={currentRole}
            onChange={(e) => handleFilter('role', e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700"
          >
            <option value="all">All Roles</option>
            <option value="customer">Farmer (Customer)</option>
            <option value="mechanic">Mechanic</option>
            <option value="anonymous">Unauthenticated / Splash</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h3 className="mt-3 text-base font-semibold text-slate-900">Zero Active Crash Reports</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              All field devices running Tractor Seva v1.2.0 are stable with no unhandled crashes reported.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-left">Severity</th>
                  <th className="py-3 px-4 text-left">Error Message</th>
                  <th className="py-3 px-4 text-left">Screen</th>
                  <th className="py-3 px-4 text-left">Role & Platform</th>
                  <th className="py-3 px-4 text-left">Logged At</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const platform = log.device_info?.platform || 'android';
                  const osVer = log.device_info?.osVersion || '';

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          {log.severity === 'fatal' ? (
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-100 text-rose-800">
                              FATAL
                            </span>
                          ) : log.severity === 'error' ? (
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-100 text-amber-800">
                              ERROR
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-100 text-blue-800">
                              WARN
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 max-w-md">
                          <p className="font-semibold text-slate-900 truncate">{log.error_message}</p>
                          <p className="text-xs text-slate-500">v{log.app_version}</p>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-xs">
                          {log.screen_name || 'root'}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                          <span className="capitalize font-medium text-slate-800">{log.role}</span>
                          <span className="text-xs text-slate-500 block">
                            {platform} {osVer ? `(OS ${osVer})` : ''}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500">
                          {new Date(log.created_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            className="inline-flex items-center text-xs text-cyan-700 font-semibold hover:text-cyan-900"
                          >
                            {isExpanded ? (
                              <>
                                Hide <ChevronDown className="w-3.5 h-3.5 ml-1" />
                              </>
                            ) : (
                              <>
                                View Stack <ChevronRight className="w-3.5 h-3.5 ml-1" />
                              </>
                            )}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={6} className="p-4 border-t border-slate-200">
                            <div className="space-y-3 max-w-4xl">
                              <div>
                                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                  Full Error & Component Stack
                                </h4>
                                <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-60">
                                  {log.stack_trace || log.component_stack || log.error_message}
                                </pre>
                              </div>

                              {log.device_info && Object.keys(log.device_info).length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                    Device Telemetry Metadata
                                  </h4>
                                  <pre className="bg-slate-100 text-slate-800 p-2.5 rounded-lg text-xs font-mono">
                                    {JSON.stringify(log.device_info, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
