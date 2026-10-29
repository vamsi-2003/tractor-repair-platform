import React from 'react';
import { cn, MECHANIC_STATUS_MAP, JOB_STATUS_MAP, TICKET_PRIORITY_MAP } from '@/lib/utils';

export interface StatusBadgeProps {
  type: 'mechanic' | 'job' | 'priority' | 'generic';
  status: string | null | undefined;
  className?: string;
}

export function StatusBadge({ type, status, className }: StatusBadgeProps) {
  if (!status) return <span className="text-slate-400 text-xs">—</span>;

  let config = {
    label: status.replace(/_/g, ' '),
    color: 'text-slate-700',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
  };

  if (type === 'mechanic') {
    const found = MECHANIC_STATUS_MAP[status.toLowerCase()];
    if (found) config = found;
  } else if (type === 'job') {
    const found = JOB_STATUS_MAP[status.toLowerCase()];
    if (found) config = found;
  } else if (type === 'priority') {
    const found = TICKET_PRIORITY_MAP[status.toLowerCase()];
    if (found) {
      config = {
        label: found.label,
        color: found.color,
        bg: found.bg,
        border: 'border-transparent',
      };
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize',
        config.bg,
        config.color,
        config.border,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {config.label}
    </span>
  );
}
