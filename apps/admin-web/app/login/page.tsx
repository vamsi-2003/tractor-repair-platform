'use client';

import React, { Suspense, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tractor, ShieldCheck, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { signInAdmin } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirectTo') || '/';
  const unauthorizedError = searchParams?.get('error') === 'unauthorized';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(
    unauthorizedError
      ? 'Access Denied: Only profiles with role "admin" can access this portal.'
      : null
  );
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('redirectTo', redirectTo);

    startTransition(async () => {
      const res = await signInAdmin(null, formData);
      if (res && !res.success) {
        setErrorMessage(res.error || 'Failed to sign in.');
      }
    });
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur-md py-8 px-6 sm:px-8 shadow-2xl rounded-2xl border border-slate-700/80">
      <div className="mb-6 flex items-center gap-2 p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-200">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          Restricted portal. Session identity and administrative role verification enforced.
        </span>
      </div>

      {errorMessage && (
        <div className="mb-6 p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-start gap-2.5 text-xs text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium text-slate-300"
          >
            Administrator Email
          </label>
          <div className="mt-1 relative rounded-lg shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@tractorapp.com"
              className="block w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium text-slate-300"
          >
            Password
          </label>
          <div className="mt-1 relative rounded-lg shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="block w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isPending}
          className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 shadow-lg shadow-emerald-900/40"
        >
          Sign In to Console
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glowing decorations */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white shadow-xl shadow-emerald-900/40 border border-emerald-400/30">
            <Tractor className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Tractor Repair Platform
        </h2>
        <p className="mt-1 text-center text-xs font-medium text-emerald-400 uppercase tracking-widest">
          Administrative Operations Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <Suspense
          fallback={
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-800 rounded-2xl">
              Loading security portal...
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} Tractor Repair Marketplace Inc. All administrative actions are logged.
        </p>
      </div>
    </div>
  );
}
