/** Milestone labels shown as subscription nears expiry (days_remaining <= 30). */
export const EXPIRY_BANNER_THRESHOLDS = [30, 15, 7, 3, 1];

/**
 * Returns the banner message for the current days remaining, or null if no banner.
 * Picks the highest milestone still at or below remaining days (e.g. 12 → "7 days remaining").
 */
export function getSubscriptionExpiryBannerMessage(daysRemaining) {
  if (daysRemaining == null || daysRemaining > 30) return null;

  const days = Math.max(0, Math.floor(Number(daysRemaining)));
  if (days === 0) return '1 day remaining';

  const milestone = EXPIRY_BANNER_THRESHOLDS.find((t) => days >= t) ?? 1;
  return milestone === 1 ? '1 day remaining' : `${milestone} days remaining`;
}

export function getSubscriptionExpiryBannerSeverity(daysRemaining) {
  if (daysRemaining == null || daysRemaining > 30) return null;
  const days = Math.max(0, Math.floor(Number(daysRemaining)));
  if (days <= 3) return 'critical';
  if (days <= 7) return 'urgent';
  if (days <= 15) return 'warning';
  return 'notice';
}

export function shouldShowSubscriptionExpiryBanner(user, entitlements) {
  if (!user || !entitlements) return false;
  if (user.role === 'super_admin' || user.type === 'super_admin') return false;

  const status = entitlements.subscription?.subscription_status;
  if (status === 'expired' || status === 'suspended') return false;

  const days = entitlements.subscription?.days_remaining;
  return days != null && days <= 30;
}
