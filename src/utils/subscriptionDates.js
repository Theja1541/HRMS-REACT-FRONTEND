export const BILLING_CYCLE_VALUES = ['monthly', 'yearly'];

function toDateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateOnlyParts(dateOnly) {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return { year, month, day };
}

function formatDateOnlyParts({ year, month, day }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function addCalendarMonths({ year, month, day }, months) {
  const totalZeroBased = year * 12 + (month - 1) + months;
  const newYear = Math.floor(totalZeroBased / 12);
  const newMonth = (totalZeroBased % 12) + 1;
  const newDay = Math.min(day, daysInMonth(newYear, newMonth));
  return { year: newYear, month: newMonth, day: newDay };
}

function addCalendarYears({ year, month, day }, years) {
  const newYear = year + years;
  const newDay = Math.min(day, daysInMonth(newYear, month));
  return { year: newYear, month, day: newDay };
}

/** Mirrors Backend/src/utils/subscriptionDates.js for UI previews. */
export function calculateSubscriptionEndDate(startDate, billingCycle) {
  const start = toDateOnly(startDate);
  if (!start) return null;
  if (!BILLING_CYCLE_VALUES.includes(billingCycle)) return null;

  const parts = parseDateOnlyParts(start);
  const endParts =
    billingCycle === 'yearly' ? addCalendarYears(parts, 1) : addCalendarMonths(parts, 1);

  return formatDateOnlyParts(endParts);
}

export function formatSubscriptionDateDisplay(dateOnly) {
  if (!dateOnly) return '—';
  return new Date(`${dateOnly}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
