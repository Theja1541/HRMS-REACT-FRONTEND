import { useMemo } from 'react';
import { computeQuotationTotals } from '../../constants/finance';
import { formatINR } from '../../utils/helpers';

/**
 * Live quotation summary — Subtotal, Discount, GST, Grand Total.
 * Recomputes whenever lineItems change.
 */
export default function QuotationTotals({ lineItems = [], className }) {
  const totals = useMemo(() => computeQuotationTotals(lineItems), [lineItems]);

  const rows = [
    { label: 'Subtotal', value: totals.subtotal },
    { label: 'Discount', value: totals.discount },
    { label: 'GST', value: totals.gst },
  ];

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Quotation Totals</h3>
      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3 max-w-sm ml-auto">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-sm gap-4">
            <span className="text-slate-600">{row.label}</span>
            <span className="font-mono font-medium text-slate-800">{formatINR(row.value)}</span>
          </div>
        ))}
        <div className="border-t border-slate-200 pt-3 flex justify-between gap-4">
          <span className="text-sm font-semibold text-slate-800">Grand Total</span>
          <span className="font-mono font-bold text-emerald-600">{formatINR(totals.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
