import { matchPath } from 'react-router-dom';
import { NAV_ITEMS } from './routes';

export const ADMIN_ROLES = ['super_admin', 'owner', 'admin', 'hr'];

/** Roles that may only reach explicitly allow-listed routes (read-only UI; writes blocked by API). */
export const RESTRICTED_ROLES = ['auditor', 'pf_team'];

export const READ_ONLY_ROLES = RESTRICTED_ROLES;

/**
 * Direct-URL policy:
 * - auditor / pf_team: read-only on allow-listed routes only; all other paths blocked
 * - everyone else: must match a rule; owner/admin fall back to allow for unlisted admin paths
 */
export const ROUTE_ACCESS_POLICY = {
  auditor: {
    mode: 'read_only',
    summary: 'Day Book dashboard and transactions (read-only). All other URLs blocked.',
  },
  pf_team: {
    mode: 'read_only',
    summary: 'Salaries, payslips, and PF/ESI summary (read-only). All other URLs blocked.',
  },
};

function roleMatches(roles, role) {
  if (roles === 'all') return true;
  return Array.isArray(roles) && roles.includes(role);
}

/** Paths not covered by sidebar nav — explicit RBAC. */
const EXPLICIT_ROUTE_RULES = [
  { path: '/leaves/settings', roles: ADMIN_ROLES },
  { path: '/payroll/tax-settings', roles: ADMIN_ROLES },
  { path: '/payroll/structures', roles: ADMIN_ROLES },
  { path: '/employees/:id', roles: [...ADMIN_ROLES, 'manager', 'pf_team'] },
  { path: '/transactions/:id/receipt', roles: [...ADMIN_ROLES, 'auditor'] },
  { path: '/transactions/:id/invoice', roles: [...ADMIN_ROLES, 'auditor'] },
  { path: '/transactions/:id/edit', roles: ADMIN_ROLES },
  { path: '/transactions/:id', roles: [...ADMIN_ROLES, 'auditor'] },
  { path: '/transactions/add', roles: ADMIN_ROLES },
  { path: '/resignations', roles: [...ADMIN_ROLES, 'manager'] },
  { path: '/me/change-password', roles: ['employee', 'manager', 'owner', 'hr'] },
  { path: '/me/reimbursements/new', roles: ['employee', 'manager'] },
  { path: '/me/reimbursements/:id/edit', roles: ['employee', 'manager'] },
  { path: '/me/reimbursements/:id', roles: ['employee', 'manager'] },
  { path: '/people/designations', roles: ADMIN_ROLES },
  { path: '/people/branches', roles: ADMIN_ROLES },
  { path: '/salary-feed', roles: ADMIN_ROLES },
  { path: '/payroll/reimbursements', roles: ADMIN_ROLES },
  { path: '/roles', roles: ADMIN_ROLES },
  { path: '/tenants', roles: ['super_admin'] },
  { path: '/subscriptions', roles: ['super_admin'] },
  { path: '/pending-approvals', roles: ['super_admin'] },
  { path: '/billing', roles: ['super_admin'] },
  { path: '/settings', roles: ['super_admin', 'owner', 'hr', 'manager', 'employee', 'pf_team', 'auditor'] },
  { path: '/settings/subscription', roles: ['owner', 'hr'] },
];

function buildNavRouteRules() {
  const seen = new Set();
  const rules = [];
  for (const group of NAV_ITEMS) {
    for (const item of group.items) {
      if (seen.has(item.path)) continue;
      seen.add(item.path);
      rules.push({ path: item.path, roles: item.roles });
    }
  }
  return rules;
}

const NAV_ROUTE_RULES = buildNavRouteRules();

function findRouteRule(pathname) {
  for (const rule of EXPLICIT_ROUTE_RULES) {
    if (matchPath({ path: rule.path, end: true }, pathname)) return rule;
  }
  for (const rule of NAV_ROUTE_RULES) {
    if (matchPath({ path: rule.path, end: true }, pathname)) return rule;
  }
  return null;
}

export function canAccessRoute(pathname, role) {
  if (!role) return false;
  if (role === 'super_admin') return true;

  const rule = findRouteRule(pathname);

  if (rule) {
    return roleMatches(rule.roles, role);
  }

  if (RESTRICTED_ROLES.includes(role)) {
    return false;
  }

  if (ADMIN_ROLES.includes(role)) {
    return true;
  }

  return false;
}

export function isReadOnlyRole(role) {
  return READ_ONLY_ROLES.includes(role);
}

const DEFAULT_HOME_BY_ROLE = {
  pf_team: '/pf-summary',
  auditor: '/daybook/dashboard',
  employee: '/me',
  manager: '/me',
};

export function getDefaultHomeRoute(role) {
  if (!role) return '/login';
  if (role === 'super_admin') return '/tenants';
  return DEFAULT_HOME_BY_ROLE[role] || '/dashboard';
}
