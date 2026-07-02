const STORAGE_KEY = 'lastTenantSlug';

export function getLastTenantSlug() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value?.trim() || '';
  } catch {
    return '';
  }
}

export function setLastTenantSlug(slug) {
  if (!slug || typeof slug !== 'string') return;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return;
  try {
    localStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    // ignore quota / private mode errors
  }
}

export function clearLastTenantSlug() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore quota / private mode errors
  }
}
