import { useEffect, useMemo, useState } from 'react';
import { Clock, Pencil, LogIn, LogOut, X } from 'lucide-react';
import { cn } from '../../utils/helpers';

const BULK_STATUSES = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'on_leave', label: 'Paid Leave' },
  { value: 'wfh', label: 'Work From Home' },
  { value: 'late', label: 'Late' },
  { value: 'comp_off', label: 'Comp Off' },
];

function toIsoOnDate(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}

/**
 * Bulk edit / check-in / check-out toolbar for Monthly Register.
 * Applies to all employees currently shown in the register grid for the chosen date.
 */
export default function MonthlyBulkEditBar({
  dates = [],
  employeeCount = 0,
  disabled = false,
  isPending = false,
  onApply,
}) {
  const [panel, setPanel] = useState(null); // 'status' | 'check_in' | 'check_out' | null
  const defaultDate = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (dates.includes(today)) return today;
    return dates[0] || '';
  }, [dates]);

  const [date, setDate] = useState(defaultDate);
  const [status, setStatus] = useState('present');
  const [checkIn, setCheckIn] = useState('09:30');
  const [checkOut, setCheckOut] = useState('18:30');

  useEffect(() => {
    if (dates.length && !dates.includes(date)) {
      setDate(defaultDate);
    }
  }, [dates, date, defaultDate]);

  if (disabled) {
    return (
      <div className="text-xs px-3 py-2 rounded-lg border bg-slate-50 text-slate-500 border-slate-200">
        Attendance is finalized — unlock the month to edit or bulk-update punches.
      </div>
    );
  }

  const openPanel = (next) => {
    setPanel((prev) => (prev === next ? null : next));
    if (dates.length && !dates.includes(date)) setDate(defaultDate);
  };

  const handleApply = () => {
    if (!date || !employeeCount || !onApply) return;

    if (panel === 'status') {
      onApply({
        mode: 'status',
        date,
        status,
      });
      return;
    }

    if (panel === 'check_in') {
      if (!checkIn) return;
      onApply({
        mode: 'check_in',
        date,
        status: 'present',
        check_in: toIsoOnDate(date, checkIn),
      });
      return;
    }

    if (panel === 'check_out') {
      if (!checkOut) return;
      onApply({
        mode: 'check_out',
        date,
        check_out: toIsoOnDate(date, checkOut),
      });
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-700 mr-1">Edit attendance</span>
        <button
          type="button"
          onClick={() => openPanel('status')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            panel === 'status'
              ? 'bg-brand-50 text-brand-700 border-brand-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          )}
        >
          <Pencil size={13} />
          Bulk Edit
        </button>
        <button
          type="button"
          onClick={() => openPanel('check_in')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            panel === 'check_in'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          )}
        >
          <LogIn size={13} />
          Bulk Check-in
        </button>
        <button
          type="button"
          onClick={() => openPanel('check_out')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            panel === 'check_out'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          )}
        >
          <LogOut size={13} />
          Bulk Check-out
        </button>
        <span className="text-[11px] text-slate-400 ml-auto">
          Click a day cell to edit one employee · {employeeCount} employee{employeeCount === 1 ? '' : 's'} in view
        </span>
      </div>

      {panel && (
        <div className="flex flex-wrap items-end gap-3 px-4 py-3 bg-slate-50/80">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Date</label>
            <select
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 min-w-[140px]"
            >
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d} ({new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })})
                </option>
              ))}
            </select>
          </div>

          {panel === 'status' && (
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 min-w-[140px]"
              >
                {BULK_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {panel === 'check_in' && (
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <Clock size={11} />
                Check-in time
              </label>
              <input
                type="time"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700"
              />
            </div>
          )}

          {panel === 'check_out' && (
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <Clock size={11} />
                Check-out time
              </label>
              <input
                type="time"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700"
              />
            </div>
          )}

          <button
            type="button"
            disabled={isPending || !employeeCount || !date}
            onClick={handleApply}
            className="btn-primary text-xs"
          >
            {isPending
              ? 'Applying…'
              : panel === 'status'
                ? `Apply status to ${employeeCount}`
                : panel === 'check_in'
                  ? `Apply check-in to ${employeeCount}`
                  : `Apply check-out to ${employeeCount}`}
          </button>

          <button
            type="button"
            onClick={() => setPanel(null)}
            className="inline-flex items-center gap-1 px-2.5 py-2 text-xs text-slate-500 hover:text-slate-700"
          >
            <X size={13} />
            Close
          </button>
        </div>
      )}
    </div>
  );
}
