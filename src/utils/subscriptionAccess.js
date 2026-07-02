import { useAuthStore } from '../store/auth.store';

/** Subscription states that block all tenant portal access (not per-module denials). */
export const SUBSCRIPTION_BLOCK_CODES = new Set([
  'SUBSCRIPTION_EXPIRED',
  'SUBSCRIPTION_SUSPENDED',
  'SUBSCRIPTION_INACTIVE',
  'NO_SUBSCRIPTION',
]);

export function isTenantSubscriptionBlocked(user, entitlements) {
  if (!user) return false;
  if (user.role === 'super_admin' || user.type === 'super_admin') return false;
  if (!entitlements) return false;

  if (
    entitlements.access_allowed === false &&
    SUBSCRIPTION_BLOCK_CODES.has(entitlements.access_denied_reason)
  ) {
    return true;
  }

  const status = entitlements.subscription?.subscription_status;
  return status === 'expired' || status === 'suspended';
}

export function markSubscriptionBlocked(code) {
  const state = useAuthStore.getState();
  if (!state.user || state.user.role === 'super_admin') return;

  useAuthStore.getState().setEntitlements({
    ...(state.entitlements || {}),
    access_allowed: false,
    access_denied_reason: code,
  });
}
