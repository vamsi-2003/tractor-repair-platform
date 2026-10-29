'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Search,
  Filter,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  FileCode,
  Network,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function AuditView({
  logs,
  count,
  currentAction,
  currentEntity,
  currentSearch,
}: {
  logs: any[];
  count: number;
  currentAction: string;
  currentEntity: string;
  currentSearch: string;
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(currentSearch);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim());
    } else {
      params.delete('q');
    }
    params.set('page', '1');
    router.push(`/audit?${params.toString()}`);
  };

  const toggleExpand = (id: string) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Security & Compliance Audit Trail
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Immutable, read-only ledger capturing all administrative verifications, payouts, and system overrides.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action, entity ID, or IP..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-xs"
          />
        </form>
      </div>

      <div className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{logs.length}</span> of{' '}
        <span className="font-semibold text-slate-700">{count}</span> audit log entries
      </div>

      {logs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
          <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-700">No audit logs found</h4>
          <p className="text-xs text-slate-400 mt-1">
            No entries match your search query or audit criteria.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Performer / Admin</th>
                  <th className="px-6 py-3">Action Performed</th>
                  <th className="px-6 py-3">Entity Type & Target</th>
                  <th className="px-6 py-3">Client Network IP</th>
                  <th className="px-6 py-3 text-right">State Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const hasDiff = log.old_values || log.new_values;

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-[11px] text-slate-500">
                          {formatDateTime(log.created_at)}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                              {log.user?.full_name?.charAt(0) || 'A'}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 text-xs">
                                {log.user?.full_name || 'System Administrator'}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Role: {log.user?.role || 'admin'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-semibold">
                            {log.action}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-800 capitalize">
                            {log.entity_type || log.resource_type || 'system'}
                          </span>
                          {(log.entity_id || log.resource_id) && (
                            <span className="block font-mono text-[10px] text-slate-400 mt-0.5">
                              #{(log.entity_id || log.resource_id).slice(0, 12)}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 font-mono text-[11px] text-slate-500">
                          {log.ip_address || '127.0.0.1 (local)'}
                        </td>

                        <td className="px-6 py-4 text-right">
                          {hasDiff ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpand(log.id)}
                            >
                              <FileCode className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              Inspect Payload
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 ml-1" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 ml-1" />
                              )}
                            </Button>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">
                              No payload
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable JSON State Diff Row */}
                      {isExpanded && (
                        <tr className="bg-slate-900 text-white">
                          <td colSpan={6} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                              <div>
                                <span className="text-slate-400 block mb-1 text-[10px] uppercase font-bold tracking-wider">
                                  Previous State (old_values)
                                </span>
                                <pre className="p-3 bg-slate-950 rounded-lg text-rose-300 overflow-x-auto text-[11px]">
                                  {log.old_values
                                    ? JSON.stringify(log.old_values, null, 2)
                                    : 'null'}
                                </pre>
                              </div>

                              <div>
                                <span className="text-emerald-400 block mb-1 text-[10px] uppercase font-bold tracking-wider">
                                  Updated State (new_values)
                                </span>
                                <pre className="p-3 bg-slate-950 rounded-lg text-emerald-300 overflow-x-auto text-[11px]">
                                  {log.new_values
                                    ? JSON.stringify(log.new_values, null, 2)
                                    : 'null'}
                                </pre>
                              </div>
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
        </div>
      )}
    </div>
  );
}
