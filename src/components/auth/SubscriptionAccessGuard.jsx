import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { isTenantSubscriptionBlocked } from '../../utils/subscriptionAccess';

export default function SubscriptionAccessGuard({ children }) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const entitlements = useAuthStore((s) => s.entitlements);

  if (isTenantSubscriptionBlocked(user, entitlements)) {
    return <Navigate to="/subscription-expired" replace state={{ from: location.pathname }} />;
  }

  return children;
}
