import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { normalizeAuthUser, workspaceFromAccessToken } from '../../utils/workspaceSession';
import AuthBrandPanel from '../../components/auth/AuthBrandPanel';

export default function MfaVerificationPage() {
  const navigate = useNavigate();
  const [tempToken] = useState(() => sessionStorage.getItem('mfa_temp_token'));
  
  const login = useAuthStore((s) => s.login);
  const beginPersonSession = useAuthStore((s) => s.beginPersonSession);
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!tempToken) {
      navigate('/login', { replace: true });
    }
  }, [tempToken, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const verifyMutation = useMutation({
    mutationFn: (otpString) =>
      authApi.verifyMfa({ otp: otpString }, tempToken),
    onSuccess: async (res) => {
      sessionStorage.removeItem('mfa_temp_token');

      if (res.data?.requiresWorkspaceSelection) {
        beginPersonSession(res.data.accessToken, res.data.workspaces || null);
        navigate('/select-workspace', { replace: true });
        return;
      }

      if (!res.data?.accessToken) {
        setError('MFA verification succeeded, but workspace activation failed.');
        return;
      }

      useAuthStore.getState().setAccessToken(res.data.accessToken);
      const meRes = await authApi.me();
      const workspace = res.data.workspace || workspaceFromAccessToken(res.data.accessToken);
      const user = normalizeAuthUser(meRes.data.user);
      const roles = meRes.data.roles?.length ? meRes.data.roles : workspace?.roles || [];
      const defaultRole = meRes.data.defaultRole || workspace?.defaultRole || user?.role;

      login({
        accessToken: res.data.accessToken,
        user,
        entitlements: meRes.data.entitlements,
        roles,
        defaultRole,
        selectedRole: defaultRole,
        workspace,
      });
      navigate('/', { replace: true });
    },
    onError: (err) => {
      setError(err.response?.data?.error?.message || 'Invalid verification code');
      // Clear inputs on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  });

  const resendMutation = useMutation({
    mutationFn: () => authApi.resendMfa(tempToken),
    onSuccess: () => {
      setCountdown(60);
      setError('');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    },
    onError: (err) => {
      setError(err.response?.data?.error?.message || 'Failed to resend code');
    }
  });

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '');
    if (!pastedData) return;
    
    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }
    setError('');
    verifyMutation.mutate(otpString);
  };

  const handleCancel = () => {
    sessionStorage.removeItem('mfa_temp_token');
    navigate('/login', { replace: true });
  };

  const isBusy = verifyMutation.isPending || resendMutation.isPending;

  if (!tempToken) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Branded panel (reused design from Login) */}
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
              Enhanced Security
            </h2>
            <p className="mt-4 text-md text-white/70 leading-relaxed">
              We've added an extra layer of security to your account.
              Please verify your identity to continue.
            </p>
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

          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
              <ShieldCheck className="h-6 w-6 text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Two-Step Verification</h1>
            <p className="mt-2 text-sm text-slate-500">
              We've sent a verification code to your email.
              Enter the 6-digit code below to continue.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="flex justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={isBusy}
                  className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg border border-slate-200 bg-white text-center text-xl font-bold text-slate-900 transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isBusy || otp.some(d => !d)}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-md font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
            >
              {verifyMutation.isPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Verifying…
                </>
              ) : (
                <>
                  Verify Code
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            <p className="text-slate-500">
              Didn't receive the code?{' '}
              {countdown > 0 ? (
                <span className="font-medium text-slate-400">
                  Resend in {countdown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => resendMutation.mutate()}
                  disabled={isBusy}
                  className="font-medium text-brand-600 hover:text-brand-700 hover:underline disabled:opacity-50"
                >
                  {resendMutation.isPending ? (
                    <span className="flex items-center justify-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Click to resend'
                  )}
                </button>
              )}
            </p>
          </div>
          
          <div className="mt-6 text-center">
             <button 
                type="button"
                onClick={handleCancel}
                className="text-sm font-medium text-slate-500 hover:text-slate-700 hover:underline"
             >
                Return to Login
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
