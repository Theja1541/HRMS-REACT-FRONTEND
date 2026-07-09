import { authApi } from '../api';
import { useAuthStore } from '../store/auth.store';
import { isPersonSessionToken, isWorkspaceSessionToken, decodeJwtPayload, workspaceIdFromToken, workspaceIdFromAnyToken } from './jwt';
import { setLastTenantSlug } from './lastTenantSlug';

export function normalizeAuthUser(raw) {
  if (!raw) return null;
  return {
    ...raw,
    name: raw.name || `${raw.first_name || ''} ${raw.last_name || ''}`.trim(),
    role: raw.role || raw.system_role,
    tenant: raw.tenant || raw.Tenant,
    must_change_password: !!raw.must_change_password,
  };
}

/**
 * Activate a workspace and load the authenticated session (/me).
 * @param {string} workspaceId
 * @returns {Promise<{ accessToken: string, workspace: object, user: object, entitlements: object|null, roles: string[], defaultRole: string }>}
 */
export async function activateAndHydrateWorkspace(workspaceId) {
  const activateRes = await authApi.activateWorkspace(workspaceId);
  const accessToken = activateRes.data.accessToken;
  useAuthStore.getState().setAccessToken(accessToken);

  const workspace = {
    ...activateRes.data.workspace,
    ...workspaceFromAccessToken(accessToken),
  };

  const meRes = await authApi.me(accessToken);
  const user = normalizeAuthUser(meRes.data.user);
  const roles = meRes.data.roles?.length ? meRes.data.roles : workspace.roles;
  const defaultRole = meRes.data.defaultRole || workspace.defaultRole;

  if (user?.type !== 'super_admin' && workspace?.slug) {
    setLastTenantSlug(workspace.slug);
  }

  return {
    accessToken,
    workspace,
    user,
    entitlements: meRes.data.entitlements || null,
    roles,
    defaultRole,
  };
}

export function getWorkspaceLabel(workspace) {
  if (!workspace) return 'Workspace';
  if (workspace.type === 'platform') {
    return workspace.label || 'Platform';
  }
  return workspace.label || workspace.slug || 'Company';
}

export function getWorkspaceSublabel(workspace) {
  if (!workspace) return '';
  if (workspace.type === 'platform') {
    return 'Platform administration';
  }
  return workspace.slug ? `@${workspace.slug}` : workspace.primaryRoleLabel || '';
}

export function workspaceFromAccessToken(accessToken) {
  const payload = decodeJwtPayload(accessToken);
  if (!isWorkspaceSessionToken(accessToken) || !payload?.workspaceId) {
    return null;
  }

  return {
    id: payload.workspaceId,
    type: payload.workspaceType,
    tenantId: payload.tenantId ?? null,
    employeeId: payload.employeeId ?? null,
    roles: payload.roles ?? [],
    defaultRole: payload.defaultRole ?? null,
  };
}

export function resolveActiveWorkspaceId(workspace, user, accessToken = null) {
  const token = accessToken || useAuthStore.getState().accessToken;
  if (token && isPersonSessionToken(token)) {
    return null;
  }

  const workspaceIdFromJwt = token ? workspaceIdFromAnyToken(token) : null;
  if (workspaceIdFromJwt) {
    return workspaceIdFromJwt;
  }

  if (workspace?.id) {
    return workspace.id;
  }

  if (workspace?.type === 'company') {
    const tenantId = workspace.tenantId || user?.tenant?.id || user?.tenant_id;
    if (tenantId) {
      return `tenant:${tenantId}`;
    }
  }

  if (workspace?.type === 'platform') {
    return 'platform';
  }

  const tenantId = user?.tenant?.id || user?.tenant_id;
  if (tenantId) {
    return `tenant:${tenantId}`;
  }

  return null;
}

/**
 * After refresh (legacy/person access token), re-issue a workspace JWT when a workspace is active.
 * Refresh cookie / endpoint behavior is unchanged — promotion happens client-side only.
 * @param {string} accessToken
 * @returns {Promise<string>}
 */
export async function promoteToWorkspaceAccessToken(accessToken) {
  if (!accessToken) {
    return accessToken;
  }

  if (isPersonSessionToken(accessToken)) {
    return accessToken;
  }

  const state = useAuthStore.getState();
  const workspaceId = resolveActiveWorkspaceId(state.workspace, state.user, accessToken);
  const previousSelectedRole = state.selectedRole;
  if (!workspaceId) {
    return accessToken;
  }

  if (isWorkspaceSessionToken(accessToken) && workspaceIdFromToken(accessToken) === workspaceId) {
    return accessToken;
  }

  // Allow person/legacy refresh tokens to rehydrate the previously active workspace.
  useAuthStore.getState().setAccessToken(accessToken);

  const session = await activateAndHydrateWorkspace(workspaceId);
  const selectedRole = session.roles?.includes(previousSelectedRole)
    ? previousSelectedRole
    : session.defaultRole;
  useAuthStore.getState().login({
    accessToken: session.accessToken,
    workspace: session.workspace,
    user: session.user,
    entitlements: session.entitlements,
    roles: session.roles,
    defaultRole: session.defaultRole,
    selectedRole,
  });

  return session.accessToken;
}
