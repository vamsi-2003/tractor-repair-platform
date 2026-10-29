'use client';

import React, { useEffect } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error?: Error & { digest?: string };
  reset?: () => void;
}) {
  useEffect(() => {
    if (error) {
      console.error('Unhandled Admin Console Error:', error);
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-8 shadow-sm space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Operation Error</h2>
        <p className="text-xs text-slate-500">
          An unexpected administrative application error occurred.
        </p>
        {error?.message && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-left text-[11px] font-mono text-slate-700 break-all">
            {error.message}
          </div>
        )}
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={() => reset?.()} className="w-full">
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Retry Action
          </Button>
        </div>
      </div>
    </div>
  );
}
