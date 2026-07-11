import { decodeJwtPayload } from './jwt';

/**
 * True only when the active workspace is the platform (not merely a super_admin role on a company workspace).
 */
export function isPlatformPortal(accessToken, workspace) {
  if (workspace?.type === 'platform') {
    return true;
  }
  const payload = decodeJwtPayload(accessToken);
  return payload?.tokenKind === 'workspace' && payload?.workspaceType === 'platform';
}

/**
 * Resolve the role used for navigation/RBAC in the current workspace context.
 */
export function resolvePortalRole({
  accessToken,
  workspace,
  user,
  roles = [],
  selectedRole,
}) {
  if (isPlatformPortal(accessToken, workspace)) {
    return 'super_admin';
  }

  if (selectedRole && roles.includes(selectedRole)) {
    return selectedRole;
  }

  const payload = decodeJwtPayload(accessToken);
  if (payload?.tokenKind === 'workspace' && payload?.defaultRole) {
    return payload.defaultRole;
  }

  if (workspace?.defaultRole) {
    return workspace.defaultRole;
  }

  if (roles.length) {
    return roles[0];
  }

  return user?.role || user?.system_role || 'employee';
}
