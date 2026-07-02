import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { getDefaultHomeRoute } from '../../constants/routeAccess';
import { isTenantSubscriptionBlocked } from '../../utils/subscriptionAccess';

export default function SubscriptionExpiredPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const entitlements = useAuthStore((s) => s.entitlements);
  const tenantName = user?.tenant?.name || user?.Tenant?.name;
  const blocked = isTenantSubscriptionBlocked(user, entitlements);

  useEffect(() => {
    if (user && !blocked) {
      navigate(getDefaultHomeRoute(user.role), { replace: true });
    }
  }, [user, blocked, navigate]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      useAuthStore.getState().logout();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-14 h-14 bg-amber-500/15 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7 text-amber-400" aria-hidden />
        </div>

        <h1 className="text-2xl font-bold text-white">Subscription Expired</h1>
        <p className="text-slate-400 text-sm mt-3 leading-relaxed">
          Your subscription has expired or been suspended.
          <br />
          Contact administrator or renew subscription.
        </p>

        {tenantName && (
          <p className="text-slate-500 text-xs mt-4">
            Organization: <span className="text-slate-300 font-medium">{tenantName}</span>
          </p>
        )}

        {(user?.role === 'owner' || user?.role === 'hr') && (
          <Link
            to="/settings/subscription"
            className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" aria-hidden />
            Request Renewal
          </Link>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="mt-8 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 transition-colors"
        >
          <LogOut className="w-4 h-4" aria-hidden />
          Logout
        </button>
      </div>
    </div>
  );
}
