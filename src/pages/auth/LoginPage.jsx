import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import {
  Mail,
  Lock,
  Building2,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  BarChart3,
  Users,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { getDefaultHomeRoute } from '../../constants/routeAccess';
import { isTenantSubscriptionBlocked } from '../../utils/subscriptionAccess';
import {
  clearLastTenantSlug,
  getLastTenantSlug,
  setLastTenantSlug,
} from '../../utils/lastTenantSlug';
import { getLoginErrorMessage } from '../../utils/authErrors';
import AuthBrandPanel from '../../components/auth/AuthBrandPanel';

const SUPERADMIN_LOGIN_EMAIL = (
  import.meta.env.VITE_SUPERADMIN_EMAIL || 'superadmin@hrms.app'
).trim().toLowerCase();

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
  tenant_slug: z.string().trim().min(1, 'Organization slug is required'),
});

const HIGHLIGHTS = [
  {
    icon: Users,
    title: 'People, organised',
    text: 'Employees, attendance and leave in one secure workspace.',
  },
  {
    icon: BarChart3,
    title: 'Insightful payroll',
    text: 'Run payroll and statutory filings with real-time visibility.',
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise-grade security',
    text: 'Role-based access and tenant isolation by design.',
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const tenantFromUrl = searchParams.get('tenant')?.trim().toLowerCase() || '';
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (location.state?.notice) {
      setNotice(location.state.notice);
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [location.pathname, location.search, location.state?.notice, navigate]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      tenant_slug: tenantFromUrl || getLastTenantSlug() || '',
    },
  });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (res, variables) => {
      const user = res.data.user;
      if (user?.type !== 'super_admin') {
        setLastTenantSlug(user?.tenant?.slug || variables.tenant_slug);
      }
      login({ accessToken: res.data.accessToken, user, entitlements: res.data.entitlements });
      if (isTenantSubscriptionBlocked(res.data.user, res.data.entitlements)) {
        navigate('/subscription-expired', { replace: true });
        return;
      }
      if (res.data.user?.must_change_password) {
        navigate('/me/change-password', { replace: true });
        return;
      }
      navigate(getDefaultHomeRoute(res.data.user?.role));
    },
    onError: (err, variables) => {
      const isSuperAdminAttempt =
        variables?.email?.trim().toLowerCase() === SUPERADMIN_LOGIN_EMAIL;
      const isInvalidCredentials =
        err.response?.status === 401 &&
        err.response?.data?.error?.code === 'INVALID_CREDENTIALS';

      if (isInvalidCredentials && !isSuperAdminAttempt) {
        clearLastTenantSlug();
      }

      setError(getLoginErrorMessage(err));
    },
  });

  const onSubmit = (data) => {
    setError('');
    mutation.mutate(data);
  };

  const isBusy = isSubmitting || mutation.isPending;
  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-10 pr-3 py-2.5 text-md ' +
    'text-slate-900 placeholder:text-slate-400 transition-colors ' +
    'focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Branded panel */}
      <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-slate-900 to-slate-950" />
        {/* Decorative glows */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/3 translate-y-1/3 rounded-full bg-brand-600/20 blur-3xl" />
        {/* Subtle grid */}
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
              Manage your people,<br />all in one place.
            </h2>
            <p className="mt-4 text-md text-white/70 leading-relaxed">
              A unified HR, payroll and compliance platform built for modern,
              multi-tenant organisations.
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
            © {new Date().getFullYear()} HRMS. All rights reserved.
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
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="mt-1.5 text-md text-slate-500">
              Sign in to your organisation workspace to continue.
            </p>
          </div>

          {notice && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className={inputClass}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Organization slug
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  {...register('tenant_slug')}
                  placeholder="technova"
                  className={inputClass}
                />
              </div>
              {errors.tenant_slug && (
                <p className="mt-1.5 text-xs text-red-500">{errors.tenant_slug.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-md font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
            >
              {mutation.isPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Demo credentials — hidden for now
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Demo credentials
            </p>
            <dl className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between gap-3">
                <dt className="font-medium text-slate-700">Admin</dt>
                <dd className="text-slate-500">arjun@technova.com / Welcome@123</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="font-medium text-slate-700">PF Team</dt>
                <dd className="text-slate-500">deepa@technova.com / Welcome@123</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="font-medium text-slate-700">Super Admin</dt>
                <dd className="text-slate-500">superadmin@hrms.app / SuperSecure@123</dd>
              </div>
            </dl>
          </div>
          */}
        </div>
      </div>
    </div>
  );
}
