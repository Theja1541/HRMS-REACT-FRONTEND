import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';
import { getDefaultHomeRoute } from '../../constants/routeAccess';

export default function PlanAccessDeniedPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = usePortalRole();
  const tenantName = user?.tenant?.name || user?.Tenant?.name;

  const handleBackToDashboard = () => {
    navigate(getDefaultHomeRoute(role) || '/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-14 h-14 bg-violet-500/15 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-7 h-7 text-violet-400" aria-hidden />
        </div>

        <h1 className="text-2xl font-bold text-white">Access Restricted</h1>
        <p className="text-slate-400 text-sm mt-3 leading-relaxed">
          Your current subscription plan does not include access to this module or feature.
        </p>

        {tenantName && (
          <p className="text-slate-500 text-xs mt-4">
            Organization: <span className="text-slate-300 font-medium">{tenantName}</span>
          </p>
        )}

        <button
          type="button"
          onClick={handleBackToDashboard}
          className="mt-8 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
