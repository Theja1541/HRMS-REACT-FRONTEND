import { CALENDAR_COLUMN_LEGEND } from '../../utils/calendarGrid.utils';
import { cn } from '../../utils/helpers';

export default function CalendarColumnLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
      <span className="font-semibold uppercase tracking-wide text-slate-400">Column highlights</span>
      {CALENDAR_COLUMN_LEGEND.map((item) => (
        <span key={item.day_type} className="inline-flex items-center gap-1.5">
          <span className={cn('w-4 h-4 rounded border', item.sample)} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
