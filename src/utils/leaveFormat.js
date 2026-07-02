/** Format leave day counts for display (whole numbers without decimals). */
export function formatLeaveDays(value) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Subtitle for balance cards — avoids misleading "allocated" for monthly accrual. */
export function leaveBalanceSubtitle(balance) {
  const used = formatLeaveDays(balance.used ?? 0);
  const available = formatLeaveDays(balance.available ?? balance.current_balance ?? 0);
  const method = balance.policy_summary?.accrual_method;
  const annual = balance.policy_summary?.annual_quota;
  const cap = balance.policy_summary?.max_balance_cap;

  if (method && method !== 'fixed') {
    const capNote = cap != null ? ` · cap ${formatLeaveDays(cap)}` : '';
    const annualNote = annual > 0 ? ` · ${formatLeaveDays(annual)} days/yr` : '';
    return `${used} used · ${available} available${annualNote}${capNote}`;
  }

  return `${used} used · ${available} available`;
}
