import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { getLoginErrorMessage } from '../../utils/authErrors';
import { resolveAuthenticatedLanding } from '../../utils/portalNavigation';
import { isTenantSubscriptionBlocked } from '../../utils/subscriptionAccess';
import { workspaceFromAccessToken } from '../../utils/workspaceSession';
import AuthBrandPanel from '../../components/auth/AuthBrandPanel';

const SUPERADMIN_LOGIN_EMAIL = (
  import.meta.env.VITE_SUPERADMIN_EMAIL || 'superadmin@hrms.app'
).trim().toLowerCase();

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
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

function SupportDetails() {
  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-xs leading-6 text-slate-500 shadow-sm">
      <p>
        Support Email:{' '}
        <a className="font-medium text-brand-600 hover:text-brand-700 hover:underline" href="mailto:Support@geniusmindstech.com">
          Support@geniusmindstech.com
        </a>
      </p>
      <p>
        Support Mobile:{' '}
        <a className="font-medium text-brand-600 hover:text-brand-700 hover:underline" href="tel:+917893985329">
          +91 78939 85329
        </a>
      </p>
      <p>© 2025 Genius Minds Making Code Pvt. Ltd.</p>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const beginPersonSession = useAuthStore((s) => s.beginPersonSession);
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
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => {
      if (res.data?.requiresMfa) {
        sessionStorage.setItem('mfa_temp_token', res.data.tempToken);
        navigate('/mfa-verify', { replace: true });
        return;
      }

      if (res.data?.requiresWorkspaceSelection) {
        beginPersonSession(res.data.accessToken, res.data.workspaces || null);
        navigate('/select-workspace', { replace: true });
        return;
      }

      const user = res.data.user;
      login({
        accessToken: res.data.accessToken,
        user,
        entitlements: res.data.entitlements,
        roles: res.data.roles,
        defaultRole: res.data.defaultRole,
        selectedRole: res.data.defaultRole,
        workspace: res.data.workspace || workspaceFromAccessToken(res.data.accessToken),
      });

      if (isTenantSubscriptionBlocked(res.data.user, res.data.entitlements)) {
        navigate('/subscription-expired', { replace: true });
        return;
      }

      if (res.data.user?.must_change_password) {
        navigate('/me/change-password', { replace: true });
        return;
      }

      const roles = res.data.roles?.length ? res.data.roles : [res.data.user?.role].filter(Boolean);
      navigate(
        resolveAuthenticatedLanding({
          roles,
          defaultRole: res.data.defaultRole,
          selectedRole: res.data.defaultRole,
          userRole: res.data.user?.role,
          forcePortalSelection: roles.length > 1,
        }),
        { replace: true }
      );
    },
    onError: (err, variables) => {
      const isSuperAdminAttempt =
        variables?.email?.trim().toLowerCase() === SUPERADMIN_LOGIN_EMAIL;
      const isInvalidCredentials =
        err.response?.status === 401 &&
        err.response?.data?.error?.code === 'INVALID_CREDENTIALS';

      if (isInvalidCredentials && !isSuperAdminAttempt) {
        // Keep message generic.
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
      <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-slate-900 to-slate-950" />
        <div
          className="absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white">
          <AuthBrandPanel variant="dark" size="large" />

          <div className="max-w-md">
            <h2 className="text-4xl font-bold leading-tight">
              Manage your people,
              <br />
              all in one place.
            </h2>
            <p className="mt-5 text-base text-white/75 leading-7">
              A unified HR, payroll and compliance platform built for modern,
              multi-tenant organisations.
            </p>

            <ul className="mt-10 space-y-5">
              {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                    <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-base font-semibold">{title}</p>
                    <p className="text-sm text-white/65 mt-0.5">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div />
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
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
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800" role="status" aria-live="polite">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700" role="alert" aria-live="assertive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email address
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
                  disabled={isBusy}
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

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
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
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="password"
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`${inputClass} pr-10`}
                  disabled={isBusy}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  disabled={isBusy}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1.5 text-xs text-red-500" role="alert">
                  {errors.password.message}
                </p>
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
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <SupportDetails />
        </div>
      </div>
    </div>
  );
}
