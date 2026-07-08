import { Info } from 'lucide-react';
import { FINANCE_PAGE_GUIDES } from '../../constants/finance';

/**
 * One-line tip under the page header — keeps Finance screens simple.
 */
export default function FinanceModuleGuide({ page }) {
  const guide = FINANCE_PAGE_GUIDES[page];
  if (!guide?.tip) return null;

  return (
    <p className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
      <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
      <span>{guide.tip}</span>
    </p>
  );
}
