import Link from 'next/link';
import { Tractor, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-white space-y-4">
        <div className="w-12 h-12 bg-emerald-600/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
          <Tractor className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold">404 - Resource Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested administrative page, dispatch record, or mechanic verification could not be located.
        </p>
        <div className="pt-2">
          <Link href="/">
            <Button variant="primary" size="sm" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Return to Console Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
