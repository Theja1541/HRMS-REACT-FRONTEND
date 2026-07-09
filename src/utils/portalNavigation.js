import { getDefaultHomeRoute } from '../constants/routeAccess';

export const PORTAL_CONFIG = {
  employee: {
    title: 'Employee Portal',
    description: 'Self-service — attendance, leaves, payslips, and your profile.',
  },
  manager: {
    title: 'Manager Portal',
    description: 'Team workflows, approvals, and your manager workspace.',
  },
  hr: {
    title: 'HR Portal',
    description: 'People operations, payroll, and HR administration.',
  },
  owner: {
    title: 'Company Admin',
    description: 'Tenant administration, analytics, and business overview.',
  },
  pf_team: {
    title: 'PF Team Portal',
    description: 'Provident fund, ESI compliance, and statutory summaries.',
  },
  auditor: {
    title: 'Auditor Portal',
    description: 'Read-only finance, day book, and audit views.',
  },
  super_admin: {
    title: 'Platform Admin',
    description: 'Multi-tenant platform and organization management.',
  },
};

export function needsPortalSelection(roles) {
  return Array.isArray(roles) && roles.length > 1;
}

/**
 * Resolve where an authenticated user should land.
 * Post-login with multiple roles always uses forcePortalSelection.
 */
export function resolveAuthenticatedLanding({
  roles = [],
  defaultRole,
  selectedRole,
  userRole,
  mustChangePassword,
  forcePortalSelection = false,
}) {
  const legacyRole = userRole || defaultRole || 'employee';

  if (mustChangePassword && legacyRole !== 'super_admin') {
    return '/me/change-password';
  }

  const assignedRoles = roles.length ? roles : [legacyRole];

  if (assignedRoles.length <= 1) {
    return getDefaultHomeRoute(assignedRoles[0] || legacyRole);
  }

  if (forcePortalSelection) {
    return '/select-portal';
  }

  if (selectedRole && assignedRoles.includes(selectedRole)) {
    return getDefaultHomeRoute(selectedRole);
  }

  return '/select-portal';
}

export function getPortalHomeRoute(role) {
  return getDefaultHomeRoute(role);
}
