import { useEffect, useState } from 'react';
import { getWorkingCalendar, updateWorkingCalendar } from '../../api/workingCalendar';

const DAYS = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

function buildDays(existing = []) {
  return DAYS.map(({ value }) => {
    const row = existing.find((d) => d.day_of_week === value);
    return {
      day_of_week: value,
      is_working: row?.is_working ?? (value >= 1 && value <= 5),
      start_time: row?.start_time ?? '09:00',
      end_time: row?.end_time ?? '18:00',
      break_minutes: row?.break_minutes ?? 60,
      standard_hours: row?.standard_hours ?? 8,
    };
  });
}

export default function WorkingCalendarPage() {
  const [calendar, setCalendar] = useState(null);
  const [days, setDays] = useState([]);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await getWorkingCalendar();
      const cal = data?.data?.calendar;
      if (cal) {
        setCalendar(cal);
        setName(cal.name || 'Default Calendar');
        setTimezone(cal.timezone || 'Asia/Kolkata');
        setDays(buildDays(cal.days || []));
      }
    } catch {
      setError('Unable to load working calendar');
    } finally {
      setLoading(false);
    }
  };

  const setDay = (dow, field, value) =>
    setDays((prev) => prev.map((d) => d.day_of_week === dow ? { ...d, [field]: value } : d));

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateWorkingCalendar({ name, timezone, days });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Unable to save working calendar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading working calendar…</div>;

  if (!calendar) return (
    <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">
      No working calendar configured for this tenant.
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Calendar Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Timezone</label>
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left">Day</th>
              <th className="px-4 py-2 text-center">Working</th>
              <th className="px-4 py-2 text-center">Start</th>
              <th className="px-4 py-2 text-center">End</th>
              <th className="px-4 py-2 text-center">Break (min)</th>
              <th className="px-4 py-2 text-center">Std Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {days.map((row) => {
              const dayLabel = DAYS.find((d) => d.value === row.day_of_week)?.label;
              return (
                <tr key={row.day_of_week} className={row.is_working ? '' : 'bg-slate-50 text-slate-400'}>
                  <td className="px-4 py-2 font-medium text-slate-700">{dayLabel}</td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.is_working}
                      onChange={(e) => setDay(row.day_of_week, 'is_working', e.target.checked)}
                      className="h-4 w-4 accent-brand-600"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="time"
                      value={row.start_time ?? '09:00'}
                      disabled={!row.is_working}
                      onChange={(e) => setDay(row.day_of_week, 'start_time', e.target.value)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="time"
                      value={row.end_time ?? '18:00'}
                      disabled={!row.is_working}
                      onChange={(e) => setDay(row.day_of_week, 'end_time', e.target.value)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="number"
                      value={row.break_minutes ?? 60}
                      min={0}
                      disabled={!row.is_working}
                      onChange={(e) => setDay(row.day_of_week, 'break_minutes', parseInt(e.target.value, 10))}
                      className="w-16 rounded border border-slate-300 px-2 py-1 text-xs text-right disabled:opacity-40"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="number"
                      value={row.standard_hours ?? 8}
                      min={0}
                      step={0.5}
                      disabled={!row.is_working}
                      onChange={(e) => setDay(row.day_of_week, 'standard_hours', parseFloat(e.target.value))}
                      className="w-16 rounded border border-slate-300 px-2 py-1 text-xs text-right disabled:opacity-40"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary text-sm px-4 py-2"
        >
          {saving ? 'Saving…' : 'Save Calendar'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved successfully</span>}
      </div>
    </div>
  );
}
