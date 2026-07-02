import { format, parseISO } from 'date-fns';
import { isEarlyLwd } from '../../utils/resignationLwd';

function formatDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
}

export default function LwdPolicyHint({
  resignationDate,
  noticePeriodDays,
  expectedLwd,
  lastWorkingDate,
  canWaiveEarly = false,
  className = '',
}) {
  const early = isEarlyLwd(lastWorkingDate, expectedLwd);

  return (
    <div className={`rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs space-y-1.5 ${className}`}>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
        <span>
          Resignation: <strong className="text-slate-800">{formatDate(resignationDate)}</strong>
        </span>
        <span>
          Notice: <strong className="text-slate-800">{noticePeriodDays ?? '—'} days</strong>
        </span>
        <span>
          Expected LWD: <strong className="text-slate-800">{formatDate(expectedLwd)}</strong>
        </span>
      </div>
      {early && canWaiveEarly && (
        <p className="text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1">
          Early release — LWD is before the {noticePeriodDays}-day notice minimum. HR/Admin override.
        </p>
      )}
      {early && !canWaiveEarly && (
        <p className="text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1">
          Last working date cannot be before {formatDate(expectedLwd)}.
        </p>
      )}
    </div>
  );
}

export function LwdDateField({
  label,
  resignationDate,
  expectedLwd,
  value,
  onChange,
  canWaiveEarly = false,
  required = true,
}) {
  const minDate = canWaiveEarly ? resignationDate : expectedLwd;

  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input
        type="date"
        required={required}
        min={minDate || undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
      />
    </div>
  );
}
