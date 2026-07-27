import { cn } from '../../../utils/helpers';

export function inputClass(error) {
  return cn(
    'ds-input',
    error && 'border-red-300 focus:border-red-400 focus:ring-red-200'
  );
}

export function readOnlyClass(disabled) {
  return disabled ? 'bg-slate-50 text-slate-700 cursor-default' : '';
}

export default function WizardField({ label, required, error, children, className, hint }) {
  return (
    <div className={className}>
      <label className={cn('ds-label', required && 'ds-label-required')}>
        {label}
      </label>
      <div>{children}</div>
      {hint && !error && <p className="ds-field-hint">{hint}</p>}
      {error && <p className="ds-field-error">{error}</p>}
    </div>
  );
}
