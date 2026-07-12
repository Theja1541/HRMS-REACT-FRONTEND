import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { canAccessRoute, getDefaultHomeRoute } from '../../constants/routeAccess';
import { resolvePortalRole } from '../../utils/portalContext';

export default function RouteAccessGuard({ children }) {
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const workspace = useAuthStore((s) => s.workspace);
  const roles = useAuthStore((s) => s.roles);
  const selectedRole = useAuthStore((s) => s.selectedRole);

  const role = resolvePortalRole({
    accessToken,
    workspace,
    user,
    roles,
    selectedRole,
  });

  if (!canAccessRoute(location.pathname, role)) {
    const fallback = getDefaultHomeRoute(role);
    const target = canAccessRoute(fallback, role) ? fallback : '/login';
    return <Navigate to={target} replace state={{ accessDenied: true, from: location.pathname }} />;
  }

  return children;
}
