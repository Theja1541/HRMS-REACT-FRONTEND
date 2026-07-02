import { addDays, format, parseISO } from 'date-fns';

export function calculateExpectedLwd(resignationDate, noticePeriodDays) {
  const base =
    resignationDate && resignationDate.length >= 10
      ? parseISO(resignationDate.slice(0, 10))
      : new Date();
  const days = Number(noticePeriodDays);
  return format(addDays(base, Number.isFinite(days) ? days : 0), 'yyyy-MM-dd');
}

export function isEarlyLwd(lastWorkingDate, expectedLwd) {
  if (!lastWorkingDate || !expectedLwd) return false;
  return lastWorkingDate < expectedLwd;
}

export function formatLwdHint(expectedLwd, noticePeriodDays) {
  return `${noticePeriodDays}-day notice · expected LWD ${expectedLwd}`;
}
