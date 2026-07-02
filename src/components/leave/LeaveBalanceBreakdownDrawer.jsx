import { useQuery } from '@tanstack/react-query';
import { X, Equal, Minus, Plus } from 'lucide-react';
import { leaveApi } from '../../api';

function formatDays(value) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function BreakdownRow({ label, value, sign }) {
  const n = parseFloat(value) || 0;
  if (sign === 'subtract' && n === 0) {
    return (
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span className="flex items-center gap-2">
          <Minus size={12} className="opacity-40" />
          {label}
        </span>
        <span className="font-mono">0</span>
      </div>
    );
  }
  if (sign === 'add' && n === 0) {
    return (
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span className="flex items-center gap-2">
          <Plus size={12} className="opacity-40" />
          {label}
        </span>
        <span className="font-mono">0</span>
      </div>
    );
  }

  const color =
    sign === 'subtract' ? 'text-red-600' : sign === 'result' ? 'text-brand-700' : 'text-emerald-700';

  return (
    <div className={`flex items-center justify-between text-sm ${sign === 'result' ? 'font-semibold' : ''}`}>
      <span className="flex items-center gap-2 text-slate-700">
        {sign === 'add' && <Plus size={12} className="text-emerald-500" />}
        {sign === 'subtract' && <Minus size={12} className="text-red-500" />}
        {sign === 'result' && <Equal size={12} className="text-brand-600" />}
        {label}
      </span>
      <span className={`font-mono ${color}`}>
        {sign === 'subtract' ? `−${formatDays(n)}` : formatDays(n)}
      </span>
    </div>
  );
}

export default function LeaveBalanceBreakdownDrawer({
  employeeId,
  leaveTypeId,
  leaveTypeLabel,
  year,
  onClose,
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['leave-balance-breakdown', employeeId, leaveTypeId, year],
    queryFn: () =>
      leaveApi.getBalanceBreakdown(employeeId, leaveTypeId, year ? { year } : undefined),
    enabled: !!employeeId && !!leaveTypeId,
  });

  if (!employeeId || !leaveTypeId) return null;

  const record = data?.data?.breakdown;
  const components = record?.breakdown;
  const displayYear = data?.data?.year ?? year ?? new Date().getFullYear();
  const title = record?.leaveType?.name || leaveTypeLabel || record?.leave_type || 'Leave balance';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-md bg-white shadow-xl h-full overflow-y-auto flex flex-col">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 leading-tight">
              {isLoading ? 'Loading balance…' : title}
            </h2>
            <p className="text-xs text-slate-500 mt-1">Balance breakdown · {displayYear}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <p className="p-8 text-center text-slate-400 text-sm">Loading…</p>
        ) : error || !components ? (
          <p className="p-8 text-center text-red-500 text-sm">
            {error?.response?.data?.error?.message || 'Failed to load balance breakdown'}
          </p>
        ) : (
          <div className="flex-1 p-5 space-y-6">
            <div className="rounded-xl bg-brand-50 border border-brand-100 px-4 py-4 text-center">
              <p className="text-[10px] uppercase font-semibold text-brand-600 tracking-wide">Available</p>
              <p className="text-3xl font-bold text-brand-800 mt-1">{formatDays(components.current_balance)}</p>
              <p className="text-[10px] text-brand-600/80 mt-1">days</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-700">How this balance is calculated</p>
              <div className="rounded-lg border border-slate-200 px-4 py-4 space-y-2.5 bg-slate-50/50">
                <BreakdownRow label="Opening balance" value={components.opening_balance} sign="add" />
                <BreakdownRow label="Accrued" value={components.accrued} sign="add" />
                <BreakdownRow label="Carried forward" value={components.carried_forward} sign="add" />
                <div className="border-t border-slate-200 my-2" />
                <BreakdownRow label="Used" value={components.used} sign="subtract" />
                <BreakdownRow label="Encashed" value={components.encashed} sign="subtract" />
                <BreakdownRow label="Lapsed" value={components.lapsed} sign="subtract" />
                <div className="border-t border-slate-300 my-2" />
                <BreakdownRow label="Current balance" value={components.current_balance} sign="result" />
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                opening + accrued + carried forward − used − encashed − lapsed = current balance
              </p>
            </div>

            {record?.allocated != null && (
              <div className="text-xs text-slate-500">
                <span className="font-medium text-slate-600">Allocated (opening + accrued):</span>{' '}
                {formatDays(record.allocated)} days
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
