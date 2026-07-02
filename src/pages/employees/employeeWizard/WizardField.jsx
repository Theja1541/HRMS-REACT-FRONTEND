import { cn } from '../../../utils/helpers';

export function inputClass(error) {
  return cn(
    'w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600',
    error ? 'border-red-300' : 'border-slate-200'
  );
}

export function readOnlyClass(disabled) {
  return disabled ? 'bg-slate-50 text-slate-700 cursor-default' : '';
}

export default function WizardField({ label, required, error, children, className, hint }) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="mt-1">{children}</div>
      {hint && !error && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}
