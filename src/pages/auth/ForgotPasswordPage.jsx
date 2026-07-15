import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Mail, Building2, ArrowLeft, CheckCircle2, AlertCircle, KeyRound, ShieldCheck, Clock } from 'lucide-react';
import { authApi } from '../../api';

import AuthBrandPanel from '../../components/auth/AuthBrandPanel';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

const HIGHLIGHTS = [
  {
    icon: KeyRound,
    title: 'Temporary password',
    text: 'A one-time temporary password is sent to your registered work email.',
  },
  {
    icon: Clock,
    title: 'Immediate password change',
    text: 'You must set a new permanent password right after signing in with the temporary one.',
  },
  {
    icon: ShieldCheck,
    title: 'Account stays secure',
    text: 'Your old password is replaced and access is restored only after you set a new one.',
  },
];

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: (res) => {
      setError('');
      setMessage(res?.message || 'If an account exists with that email, a temporary password has been sent. You will be prompted to set a new permanent password when you sign in.');
    },
    onError: (err) => {
      setMessage('');
      setError(err.response?.data?.error?.message || 'Could not process request');
    },
  });

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-10 pr-3 py-2.5 text-md ' +
    'text-slate-900 placeholder:text-slate-400 transition-colors ' +
    'focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Branded panel */}
      <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-slate-900 to-slate-950" />
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/3 translate-y-1/3 rounded-full bg-brand-600/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white">
          <AuthBrandPanel variant="dark" />

          <div className="max-w-md">
            <h2 className="text-3xl xl:text-[34px] font-bold leading-tight">
              Reset your password
            </h2>
            <p className="mt-4 text-md text-white/70 leading-relaxed">
              Enter your work email and we'll send you a temporary password to regain access to your account.
            </p>

            <ul className="mt-10 space-y-5">
              {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                    <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-md font-semibold">{title}</p>
                    <p className="text-sm text-white/60 mt-0.5">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-white/40">
            © 2025 Genius Minds Making Code Pvt. Ltd.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="mb-8 lg:hidden">
            <AuthBrandPanel variant="light" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Forgot password</h1>
            <p className="mt-1.5 text-md text-slate-500">
              Enter your registered email address to receive a temporary password.
            </p>
          </div>

          {message && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800" role="status" aria-live="polite">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700" role="alert" aria-live="assertive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit((data) => mutation.mutate(data))}
            className="space-y-5"
          >
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Work email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="email"
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className={inputClass}
                  disabled={mutation.isPending}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="mt-1.5 text-xs text-red-500" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>



            <button
              type="submit"
              disabled={mutation.isPending}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-md font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
            >
              {mutation.isPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Sending…
                </>
              ) : (
                'Send temporary password'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Remember your password?{' '}
            <Link
              to="/login"
              className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
