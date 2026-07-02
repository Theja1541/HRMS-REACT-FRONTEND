const STORAGE_PREFIX = 'hrms_reimbursement_drafts_v1';

function storageKey(userId, tenantId) {
  return `${STORAGE_PREFIX}_${userId}_${tenantId || 'default'}`;
}

export function listDraftClaims(userId, tenantId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(storageKey(userId, tenantId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getDraftClaim(userId, tenantId, draftId) {
  return listDraftClaims(userId, tenantId).find((d) => String(d.id) === String(draftId)) || null;
}

export function saveDraftClaim(userId, tenantId, draft) {
  const drafts = listDraftClaims(userId, tenantId);
  const idx = drafts.findIndex((d) => d.id === draft.id);
  const next = { ...draft, status: 'draft', updated_at: new Date().toISOString() };
  if (idx >= 0) drafts[idx] = next;
  else drafts.push(next);
  localStorage.setItem(storageKey(userId, tenantId), JSON.stringify(drafts));
  return next;
}

export function deleteDraftClaim(userId, tenantId, draftId) {
  const drafts = listDraftClaims(userId, tenantId).filter((d) => String(d.id) !== String(draftId));
  localStorage.setItem(storageKey(userId, tenantId), JSON.stringify(drafts));
}

export function createDraftId() {
  return `draft-${crypto.randomUUID()}`;
}
