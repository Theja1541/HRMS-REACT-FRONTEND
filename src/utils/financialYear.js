/** Indian financial year helpers (April–March). */

export function getFinancialYear(month, year) {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (m >= 4) return `${y}-${String(y + 1).slice(-2)}`;
  return `${y - 1}-${String(y).slice(-2)}`;
}

export function getCurrentFinancialYear(asOf = new Date()) {
  return getFinancialYear(asOf.getMonth() + 1, asOf.getFullYear());
}

export function listRecentFinancialYears(count = 6, asOf = new Date()) {
  const current = getCurrentFinancialYear(asOf);
  const startYear = parseInt(current.split('-')[0], 10);
  return Array.from({ length: count }, (_, i) => {
    const y = startYear - i;
    return `${y}-${String(y + 1).slice(-2)}`;
  });
}
