import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { canAccessRoute, getDefaultHomeRoute } from '../../constants/routeAccess';

export default function RouteAccessGuard({ children }) {
  const location = useLocation();
  const role = useAuthStore((s) => s.user?.role);

  if (!canAccessRoute(location.pathname, role)) {
    const fallback = getDefaultHomeRoute(role);
    const target = canAccessRoute(fallback, role) ? fallback : '/login';
    return <Navigate to={target} replace state={{ accessDenied: true, from: location.pathname }} />;
  }

  return children;
}
