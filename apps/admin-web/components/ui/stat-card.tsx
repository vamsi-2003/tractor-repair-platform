import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from './card';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-primary-50 text-primary-600 border border-primary-100',
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('p-5 hover:border-slate-300 transition-all', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              {trend && (
                <span
                  className={cn(
                    'font-medium inline-flex items-center',
                    trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                  )}
                >
                  {trend.isPositive ? '↑' : '↓'} {trend.value}
                </span>
              )}
              <span>{subtitle}</span>
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
