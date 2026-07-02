import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

const ALLOWED_PATHS = ['/me/change-password'];

export default function MustChangePasswordGuard({ children }) {
  const location = useLocation();
  const mustChange = useAuthStore((s) => s.user?.must_change_password);
  const role = useAuthStore((s) => s.user?.role);

  if (mustChange && role !== 'super_admin' && !ALLOWED_PATHS.includes(location.pathname)) {
    return <Navigate to="/me/change-password" replace state={{ forcedPasswordChange: true }} />;
  }

  return children;
}
