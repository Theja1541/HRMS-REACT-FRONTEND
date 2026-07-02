import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '../../api';
import { validatePasswordStrength, PASSWORD_HINT } from '../../utils/passwordValidation';
import { cn } from '../../utils/helpers';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [show, setShow] = useState({ new: false, confirm: false });

  const { isLoading: validating, isError: validateError, error: validateQueryError } = useQuery({
    queryKey: ['reset-token', token],
    queryFn: () => authApi.validateResetToken(token),
    enabled: !!token,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (payload) => authApi.resetPassword(payload),
    onSuccess: (res) => {
      setError('');
      setMessage(res?.message || 'Password reset successfully. You can now sign in.');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    },
    onError: (err) => {
      const field = err.response?.data?.error?.field;
      const msg = err.response?.data?.error?.message || 'Failed to reset password';
      if (field === 'password') {
        setFieldErrors({ password: msg });
        setError('');
      } else {
        setFieldErrors({});
        setError(msg);
      }
    },
  });

  useEffect(() => {
    if (!token) setError('Reset link is invalid. Request a new password reset email.');
  }, [token]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setFieldErrors({});

    const errors = {};
    const strengthError = validatePasswordStrength(password);
    if (strengthError) errors.password = strengthError;
    if (!confirmPassword) errors.confirm_password = 'Please confirm your password';
    else if (password !== confirmPassword) errors.confirm_password = 'Passwords do not match';

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    mutation.mutate({ token, password });
  };

  const validateErrorMessage =
    validateQueryError?.response?.data?.error?.message || 'This reset link is invalid or has expired.';

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
            H
          </div>
          <h1 className="text-2xl font-bold text-white">Reset password</h1>
          <p className="text-slate-400 text-sm mt-1">Choose a new password for your account</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl space-y-4">
          {validating && <p className="text-sm text-slate-400 text-center py-4">Validating reset link…</p>}

          {!validating && (validateError || !token) && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-red-600">{!token ? error : validateErrorMessage}</p>
              <Link to="/forgot-password" className="btn-primary text-xs inline-flex">Request new link</Link>
            </div>
          )}

          {!validating && !validateError && token && (
            <>
              <p className="text-xs text-slate-500 text-center">
                Your reset link is valid. Enter a new password below.
              </p>

              {message && (
                <div className="bg-emerald-50 text-emerald-800 text-sm px-3 py-2 rounded-lg border border-emerald-100">
                  {message}
                </div>
              )}
              {error && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-xs text-slate-500">{PASSWORD_HINT}</p>

                <div>
                  <label className="text-xs font-medium text-slate-600">New password</label>
                  <div className="relative mt-1">
                    <input
                      type={show.new ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className={cn(
                        'w-full px-3 py-2 pr-10 border rounded-lg text-sm',
                        fieldErrors.password ? 'border-red-300' : 'border-slate-200'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => ({ ...s, new: !s.new }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400"
                    >
                      {show.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600">Confirm password</label>
                  <div className="relative mt-1">
                    <input
                      type={show.confirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className={cn(
                        'w-full px-3 py-2 pr-10 border rounded-lg text-sm',
                        fieldErrors.confirm_password ? 'border-red-300' : 'border-slate-200'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400"
                    >
                      {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {fieldErrors.confirm_password && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.confirm_password}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={mutation.isPending || !!message}
                  className="btn-primary w-full justify-center py-2.5"
                >
                  {mutation.isPending ? 'Resetting…' : 'Reset password'}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-xs text-slate-500 pt-2">
            <Link to="/login" className="text-brand-600 hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
