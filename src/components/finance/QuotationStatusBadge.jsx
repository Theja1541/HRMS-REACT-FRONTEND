import { QUOTATION_STATUS_LABELS, QUOTATION_STATUS_STYLES } from '../../constants/finance';
import { cn } from '../../utils/helpers';

/**
 * Status pill for quotations — matches Finance module badge styling
 * (text-[10px], rounded-full, soft background + foreground pairs).
 */
export default function QuotationStatusBadge({ status, className }) {
  const normalized = status?.toLowerCase?.() || '';
  const label = QUOTATION_STATUS_LABELS[normalized] || status || '—';

  return (
    <span
      className={cn(
        'inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full',
        QUOTATION_STATUS_STYLES[normalized] || 'bg-slate-100 text-slate-600',
        className
      )}
    >
      {label}
    </span>
  );
}
