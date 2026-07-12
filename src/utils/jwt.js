export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(normalized);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isPersonSessionToken(token) {
  const payload = decodeJwtPayload(token);
  return payload?.tokenKind === 'person' || payload?.type === 'person';
}

export function isWorkspaceSessionToken(token) {
  const payload = decodeJwtPayload(token);
  return payload?.tokenKind === 'workspace';
}

export function workspaceIdFromToken(token) {
  const payload = decodeJwtPayload(token);
  if (!isWorkspaceSessionToken(token)) return null;
  return payload?.workspaceId ?? null;
}

/** Resolve workspace id from workspace JWT or legacy access/refresh-derived access tokens. */
export function workspaceIdFromAnyToken(token) {
  if (!token || isPersonSessionToken(token)) return null;

  const workspaceId = workspaceIdFromToken(token);
  if (workspaceId) return workspaceId;

  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  if (payload.type === 'super_admin') return 'platform';
  if (payload.type === 'employee' && payload.tenant_id) {
    return `tenant:${payload.tenant_id}`;
  }
  return null;
}
