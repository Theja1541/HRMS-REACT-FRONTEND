/** Shared column highlight styles for monthly register & shift roster grids */

export const CALENDAR_COLUMN_LEGEND = [
  { day_type: 'weekend', label: 'Weekend column', sample: 'bg-violet-100 border-violet-200' },
  { day_type: 'holiday', label: 'Holiday column', sample: 'bg-amber-100 border-amber-200' },
];

export function getCalendarColumnClasses(dayType) {
  switch (dayType) {
    case 'holiday':
      return {
        header: 'bg-amber-100 text-amber-900 font-semibold border-x border-amber-200/90',
        cell: 'bg-amber-50/90 border-x border-amber-100',
      };
    case 'weekend':
      return {
        header: 'bg-violet-100 text-violet-800 font-semibold border-x border-violet-200/90',
        cell: 'bg-violet-50/90 border-x border-violet-100',
      };
    default:
      return { header: 'text-slate-400 font-medium', cell: '' };
  }
}

export function buildDateMetaMap(dateMeta = []) {
  return Object.fromEntries((dateMeta || []).map((m) => [m.date, m]));
}

export function dayOfWeekShort(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short' });
}

export function columnTitle(meta) {
  if (!meta) return '';
  if (meta.day_type === 'holiday') return meta.label || 'Company holiday';
  if (meta.day_type === 'weekend') return 'Weekend';
  return '';
}
