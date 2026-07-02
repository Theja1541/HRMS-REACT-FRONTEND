import { cn } from '../../../utils/helpers';

export function FormError({ message }) {
  if (!message) return null;
  return (
    <div className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs border border-red-100">{message}</div>
  );
}

export function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="modal-backdrop">
      <div className={cn('modal-panel', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="modal-panel-header">
          <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate pr-2">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none shrink-0" aria-label="Close">✕</button>
        </div>
        <div className="modal-panel-body">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, value, onChange, type = 'text', required, placeholder, hint, min, max, step, disabled }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input
        type={type}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        value={value ?? ''}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(type === 'number' ? (e.target.value === '' ? '' : parseFloat(e.target.value)) : e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50 disabled:text-slate-400"
      />
      {hint && <p className="mt-1 text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

export function TextArea({ label, value, onChange, rows = 3, placeholder }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <textarea
        rows={rows}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
      />
    </div>
  );
}

export function Select({ label, value, onChange, options, placeholder = 'Select…', required }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <select
        required={required}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function Checkbox({ label, checked, onChange, hint }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 rounded border-slate-300" />
      <span>
        <span className="text-sm text-slate-700">{label}</span>
        {hint && <span className="block text-[10px] text-slate-400">{hint}</span>}
      </span>
    </label>
  );
}

export function FormActions({ onCancel, loading, submitLabel = 'Save' }) {
  return (
    <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 mt-4">
      <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : submitLabel}</button>
    </div>
  );
}

export function SectionTitle({ children }) {
  return <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 pt-2">{children}</h4>;
}

export function ActiveToggle({ active, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!active)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50',
        active ? 'bg-emerald-500' : 'bg-slate-300'
      )}
      title={active ? 'Active' : 'Inactive'}
    >
      <span className={cn('pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', active ? 'translate-x-4' : 'translate-x-0')} />
    </button>
  );
}

export function EmptyState({ message, actionLabel, onAction }) {
  return (
    <div className="p-12 text-center">
      <p className="text-slate-500 text-sm">{message}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="btn-primary mt-4">{actionLabel}</button>
      )}
    </div>
  );
}
