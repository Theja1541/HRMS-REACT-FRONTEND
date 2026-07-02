import { useAuthStore } from '../store/auth.store';

/** Frontend route groups mapped to plan module_codes (payroll spans multiple catalog modules). */
export const MODULE_ACCESS_ALIASES = {
  payroll: ['salaries', 'payslips', 'salary_feed'],
};

function resolveModuleCodes(moduleCode) {
  return MODULE_ACCESS_ALIASES[moduleCode] || [moduleCode];
}

/**
 * Returns true if the current user's plan includes the given module.
 * Super admin always has access. Unknown / unloaded entitlements allow access (RBAC still applies).
 */
export function hasModuleAccess(moduleCode) {
  if (!moduleCode) return true;

  const { user, entitlements } = useAuthStore.getState();
  const role = user?.role || user?.type;
  if (role === 'super_admin') return true;

  const planModules = entitlements?.module_codes;
  if (!planModules || !Array.isArray(planModules)) return true;

  const required = resolveModuleCodes(moduleCode);
  return required.some((code) => planModules.includes(code));
}

export function useHasModuleAccess(moduleCode) {
  const user = useAuthStore((s) => s.user);
  const entitlements = useAuthStore((s) => s.entitlements);
  const role = user?.role || user?.type;

  if (role === 'super_admin') return true;
  if (!moduleCode) return true;

  const planModules = entitlements?.module_codes;
  if (!planModules || !Array.isArray(planModules)) return true;

  const required = resolveModuleCodes(moduleCode);
  return required.some((code) => planModules.includes(code));
}
