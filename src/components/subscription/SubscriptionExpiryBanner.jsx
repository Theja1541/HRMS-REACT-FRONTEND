import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../utils/helpers';
import {
  getSubscriptionExpiryBannerMessage,
  getSubscriptionExpiryBannerSeverity,
  shouldShowSubscriptionExpiryBanner,
} from '../../utils/subscriptionExpiryBanner';

const SEVERITY_STYLES = {
  notice: 'bg-amber-50 border-amber-200 text-amber-900',
  warning: 'bg-orange-50 border-orange-200 text-orange-900',
  urgent: 'bg-orange-100 border-orange-300 text-orange-950',
  critical: 'bg-red-50 border-red-200 text-red-900',
};

const ICON_STYLES = {
  notice: 'text-amber-600',
  warning: 'text-orange-600',
  urgent: 'text-orange-700',
  critical: 'text-red-600',
};

export default function SubscriptionExpiryBanner({ className }) {
  const user = useAuthStore((s) => s.user);
  const entitlements = useAuthStore((s) => s.entitlements);

  if (!shouldShowSubscriptionExpiryBanner(user, entitlements)) {
    return null;
  }

  const daysRemaining = entitlements.subscription.days_remaining;
  const message = getSubscriptionExpiryBannerMessage(daysRemaining);
  const severity = getSubscriptionExpiryBannerSeverity(daysRemaining);
  const canRequestRenewal = user?.role === 'owner' || user?.role === 'hr';
  const endDate = entitlements.subscription?.end_date;

  if (!message) return null;

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm',
        SEVERITY_STYLES[severity],
        className
      )}
    >
      <AlertTriangle className={cn('w-4 h-4 shrink-0', ICON_STYLES[severity])} aria-hidden />
      <div className="flex-1 min-w-[200px]">
        <p className="font-semibold">{message}</p>
        <p className="text-xs opacity-80 mt-0.5">
          Your subscription{endDate ? ` ends on ${new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ' is expiring soon'}.
          {canRequestRenewal ? ' Request a renewal to avoid interruption.' : ' Contact your administrator to renew.'}
        </p>
      </div>
      {canRequestRenewal && (
        <Link
          to="/settings/subscription"
          className={cn(
            'shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors',
            severity === 'critical'
              ? 'bg-red-600 border-red-600 text-white hover:bg-red-700'
              : 'bg-white/80 border-current hover:bg-white'
          )}
        >
          Request Renewal
        </Link>
      )}
    </div>
  );
}
