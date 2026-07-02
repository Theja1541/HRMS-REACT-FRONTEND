import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { employeeApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../utils/helpers';
import { validatePasswordStrength, PASSWORD_HINT } from '../../utils/passwordValidation';

const EMPTY_FORM = {
  current_password: '',
  password: '',
  confirm_password: '',
};

function PasswordField({ label, name, value, onChange, show, onToggleShow, error, autoComplete, hint }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
      <div className="relative mt-1">
        <input
          type={show ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={cn(
            'w-full px-3 py-2 pr-10 border rounded-lg text-sm',
            error ? 'border-red-300 focus:border-red-400' : 'border-slate-200'
          )}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export default function ChangePasswordForm({
  forced = false,
  onSuccess,
  showIntro = true,
  submitLabel = 'Update Password',
}) {
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  const mutation = useMutation({
    mutationFn: (payload) =>
      employeeApi.updateSelf({
        current_password: payload.current_password,
        password: payload.password,
      }),
    onSuccess: async (res) => {
      setForm(EMPTY_FORM);
      setFieldErrors({});
      setFormError('');
      setShowPasswords({ current: false, new: false, confirm: false });
      const message = res?.message || 'Password updated successfully';
      setFormMessage(message);

      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        setUser({ ...currentUser, must_change_password: false });
      }

      await onSuccess?.(message);
    },
    onError: (err) => {
      const field = err.response?.data?.error?.field;
      const msg = err.response?.data?.error?.message || 'Failed to update password';
      if (field === 'current_password') {
        setFieldErrors({ current_password: msg });
        setFormError('');
      } else if (field === 'password') {
        setFieldErrors({ password: msg });
        setFormError('');
      } else {
        setFieldErrors({});
        setFormError(msg);
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setFormMessage('');
    setFieldErrors({});

    const errors = {};
    if (!form.current_password.trim()) {
      errors.current_password = 'Current password is required';
    }

    const strengthError = validatePasswordStrength(form.password);
    if (strengthError) errors.password = strengthError;

    if (!form.confirm_password) {
      errors.confirm_password = 'Please confirm your new password';
    } else if (form.password !== form.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    mutation.mutate({
      current_password: form.current_password,
      password: form.password,
    });
  };

  return (
    <div className="space-y-4">
      {forced && (
        <div className="flex items-start gap-2 border border-amber-200 bg-amber-50/80 rounded-lg p-4 text-sm text-amber-900">
          <Lock size={16} className="shrink-0 mt-0.5" />
          <p>You signed in with a temporary password. Please set a new password before continuing.</p>
        </div>
      )}

      {formMessage && (
        <div className="text-sm text-emerald-800 border border-emerald-200 bg-emerald-50/50 rounded-lg p-4">
          {formMessage}
        </div>
      )}
      {formError && (
        <div className="text-sm text-red-600 border border-red-200 bg-red-50/50 rounded-lg p-4">{formError}</div>
      )}

      {showIntro && !forced && (
        <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
          <Lock size={18} className="text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-slate-800">Change portal password</p>
            <p className="text-xs text-slate-500 mt-1">{PASSWORD_HINT}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          label="Current Password"
          name="current_password"
          value={form.current_password}
          onChange={(e) => setForm({ ...form, current_password: e.target.value })}
          show={showPasswords.current}
          onToggleShow={() => setShowPasswords((s) => ({ ...s, current: !s.current }))}
          error={fieldErrors.current_password}
          autoComplete="current-password"
        />
        <PasswordField
          label="New Password"
          name="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          show={showPasswords.new}
          onToggleShow={() => setShowPasswords((s) => ({ ...s, new: !s.new }))}
          error={fieldErrors.password}
          autoComplete="new-password"
          hint={forced ? PASSWORD_HINT : undefined}
        />
        <PasswordField
          label="Confirm Password"
          name="confirm_password"
          value={form.confirm_password}
          onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
          show={showPasswords.confirm}
          onToggleShow={() => setShowPasswords((s) => ({ ...s, confirm: !s.confirm }))}
          error={fieldErrors.confirm_password}
          autoComplete="new-password"
        />

        <div className="pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary inline-flex items-center gap-2 text-xs"
          >
            <Lock size={14} />
            {mutation.isPending ? 'Updating…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
