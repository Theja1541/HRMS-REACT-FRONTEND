import { MONTHS } from '../../constants/payroll';

export default function PeriodSelector({ month, year, onMonthChange, onYearChange }) {
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="flex items-center gap-2">
      <select
        value={month}
        onChange={(e) => onMonthChange(parseInt(e.target.value, 10))}
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
      >
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => onYearChange(parseInt(e.target.value, 10))}
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
