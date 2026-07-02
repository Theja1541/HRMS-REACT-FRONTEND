import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { FINANCE_PAGE_GUIDES } from '../../constants/finance';

const QUICK_LINKS = [
  { to: '/finance/payment-modes', label: 'Payment Modes' },
  { to: '/categories', label: 'Categories' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/daybook', label: 'Day Book' },
  { to: '/account-ledger', label: 'Account Ledger' },
  { to: '/trial-balance', label: 'Trial Balance' },
];

export default function FinanceModuleGuide({ page, showQuickLinks = true }) {
  const guide = FINANCE_PAGE_GUIDES[page];
  if (!guide) return null;

  return (
    <div className="card p-4 border border-slate-200 bg-slate-50/80">
      <div className="flex items-start gap-3">
        <BookOpen size={20} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">{guide.title}</p>
          <p className="text-xs text-slate-600 mt-1">{guide.summary}</p>
          <p className="text-xs text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2 mt-3">
            {guide.current}
          </p>
          <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {guide.steps.map(({ n, title, text }) => (
              <li key={n} className="rounded-lg bg-white border border-slate-200 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Step {n}</p>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{title}</p>
                <p className="text-xs text-slate-500 mt-1">{text}</p>
              </li>
            ))}
          </ol>
          {showQuickLinks && (
            <p className="text-xs text-slate-500 mt-3 flex flex-wrap gap-x-3 gap-y-1">
              <span className="font-medium text-slate-600">Quick links:</span>
              {QUICK_LINKS.map((link) => (
                <Link key={link.to} to={link.to} className="text-blue-600 hover:underline">
                  {link.label}
                </Link>
              ))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
