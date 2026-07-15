import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ShieldAlert, Eye, EyeOff, Info } from 'lucide-react';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../utils/helpers';

export default function MfaSettings() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const workspace = useAuthStore((s) => s.workspace);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [formMessage, setFormMessage] = useState('');

  // MFA settings apply to the workspace identity (Employee or SuperAdmin), not the global Person.
  // A workspace must be selected (i.e. user.type !== 'person') to manage MFA.
  const hasWorkspace = !!workspace && user?.type !== 'person';

  // mfa_enabled is now surfaced per-workspace from /me endpoint
  const isCurrentlyEnabled = hasWorkspace && !!user?.mfa_enabled;

  const enableMutation = useMutation({
    mutationFn: (pwd) => authApi.enableMfa({ password: pwd }),
    onSuccess: () => {
      setFormMessage('MFA has been enabled for this workspace.');
      setFormError('');
      setPassword('');
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      // Optimistically update the store so UI reflects immediately
      useAuthStore.setState((state) => ({
        user: state.user ? { ...state.user, mfa_enabled: true } : state.user,
      }));
    },
    onError: (err) => {
      setFormError(err.response?.data?.error?.message || 'Failed to enable MFA.');
      setFormMessage('');
    },
  });

  const disableMutation = useMutation({
    mutationFn: (pwd) => authApi.disableMfa({ password: pwd }),
    onSuccess: () => {
      setFormMessage('MFA has been disabled for this workspace.');
      setFormError('');
      setPassword('');
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      useAuthStore.setState((state) => ({
        user: state.user ? { ...state.user, mfa_enabled: false } : state.user,
      }));
    },
    onError: (err) => {
      setFormError(err.response?.data?.error?.message || 'Failed to disable MFA.');
      setFormMessage('');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setFormMessage('');

    if (!password.trim()) {
      setFormError('Please enter your current password to confirm.');
      return;
    }

    if (isCurrentlyEnabled) {
      disableMutation.mutate(password);
    } else {
      enableMutation.mutate(password);
    }
  };

  const isBusy = enableMutation.isPending || disableMutation.isPending;

  // Guard: MFA settings are per-workspace. If no workspace is active, show an informational message.
  if (!hasWorkspace) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <Info size={16} className="shrink-0 mt-0.5 text-slate-400" />
        <p className="text-sm text-slate-500">
          MFA settings are tied to a specific workspace. Please select a workspace to manage your MFA preferences.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {formMessage && (
        <div className="text-sm text-emerald-800 border border-emerald-200 bg-emerald-50/50 rounded-lg p-4">
          {formMessage}
        </div>
      )}
      {formError && (
        <div className="text-sm text-red-600 border border-red-200 bg-red-50/50 rounded-lg p-4">
          {formError}
        </div>
      )}

      <div className={cn('flex items-start gap-3 p-4 rounded-lg', isCurrentlyEnabled ? 'bg-emerald-50/80 border border-emerald-100' : 'bg-slate-50')}>
        {isCurrentlyEnabled ? (
          <ShieldCheck size={18} className="text-emerald-500 shrink-0 mt-0.5" />
        ) : (
          <ShieldAlert size={18} className="text-slate-400 shrink-0 mt-0.5" />
        )}
        <div>
          <p className="text-sm font-medium text-slate-800">
            Two-Step Verification (MFA)
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {isCurrentlyEnabled
              ? 'MFA is currently active for this workspace. You will need to enter a 6-digit code sent to your email during login.'
              : 'Protect your workspace with an extra layer of security. A 6-digit code will be sent to your email during login.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div>
          <label className="text-xs font-medium text-slate-600">
            Confirm Password to {isCurrentlyEnabled ? 'Disable' : 'Enable'}
          </label>
          <div className="relative mt-1">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
              placeholder="Enter current password"
              disabled={isBusy}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isBusy}
            className={cn(
              'inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg text-white transition-colors',
              isCurrentlyEnabled
                ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400'
            )}
          >
            {isCurrentlyEnabled ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
            {isBusy ? 'Processing…' : (isCurrentlyEnabled ? 'Disable MFA' : 'Enable MFA')}
          </button>
        </div>
      </form>
    </div>
  );
}
