import { MONTHS } from '../../constants/payroll';

export default function PeriodSelector({ month, year, onMonthChange, onYearChange, className = '' }) {
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <select
        value={month}
        onChange={(e) => onMonthChange(parseInt(e.target.value, 10))}
        aria-label="Month"
        className="ds-select min-w-[7.5rem] text-slate-800 bg-white"
      >
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => onYearChange(parseInt(e.target.value, 10))}
        aria-label="Year"
        className="ds-select min-w-[5.5rem] text-slate-800 bg-white"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
