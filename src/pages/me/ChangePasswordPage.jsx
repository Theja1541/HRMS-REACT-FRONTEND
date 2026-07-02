import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import ChangePasswordForm from '../../components/auth/ChangePasswordForm';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const forced = !!user?.must_change_password;

  const handleSuccess = async () => {
    if (!forced) return;

    try {
      await authApi.logout();
    } catch {
      // Session cookies may already be cleared; still send user to login.
    } finally {
      useAuthStore.getState().logout();
      navigate('/login', {
        replace: true,
        state: {
          notice: 'Your password has been updated. Please sign in with your new password.',
        },
      });
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader
        title={forced ? 'Set your password' : 'Change password'}
        subtitle={
          forced
            ? 'Replace your temporary password, then you will be redirected to sign in again'
            : 'Update your portal sign-in password'
        }
      />

      <div className="card p-6">
        <ChangePasswordForm
          forced={forced}
          showIntro={!forced}
          submitLabel={forced ? 'Save & sign in' : 'Update Password'}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}
