import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { attendanceApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import { ATTENDANCE_STATUS } from '../../constants/hr';
import { cn } from '../../utils/helpers';

export default function MeAttendancePage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const todayStr = now.toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ['my-attendance', month, year],
    queryFn: () => attendanceApi.list({ month, year }),
  });

  const records = data?.data?.records || [];
  const recordMap = Object.fromEntries(records.map((r) => [r.date, r]));
  const daysInMonth = new Date(year, month, 0).getDate();

  const shiftMonth = (delta) => {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Attendance"
        subtitle={`${new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => shiftMonth(-1)} className="btn-secondary p-2">
              <ChevronLeft size={14} />
            </button>
            <button type="button" onClick={() => shiftMonth(1)} className="btn-secondary p-2">
              <ChevronRight size={14} />
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="card p-12 text-center text-slate-400">Loading attendance…</div>
      ) : (
        <div className="card p-5">
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-semibold text-slate-400 uppercase mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const rec = recordMap[dateStr];
              const status = rec?.status;
              const meta = status ? ATTENDANCE_STATUS[status] : null;
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={dateStr}
                  className={cn(
                    'rounded-lg border p-2 min-h-[64px] text-left',
                    isToday ? 'border-brand-500 bg-brand-50/30' : 'border-slate-100'
                  )}
                >
                  <p className="text-[10px] font-medium text-slate-500">{day}</p>
                  {meta ? (
                    <span className={cn('inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded', meta.color)}>
                      {meta.label}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-300 mt-1 block">—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-3">This Month Summary</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(ATTENDANCE_STATUS).map(([key, val]) => {
            const count = records.filter((r) => r.status === key).length;
            if (!count) return null;
            return (
              <span key={key} className={cn('text-xs font-medium px-2 py-1 rounded', val.color)}>
                {val.full}: {count}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
