import { Link } from 'react-router-dom';
import DashboardHero from './DashboardHero';

/**
 * App-wide page header — matches Organization Structure / Employees hero design.
 * Existing btn-primary / btn-secondary actions are restyled via `.page-hero-actions`.
 */
export default function PageHeader({ title, subtitle, actions, breadcrumbs, badge, chips = [] }) {
  const heroBadge =
    badge ||
    (Array.isArray(breadcrumbs) && breadcrumbs.length ? breadcrumbs.join(' · ') : 'HRMS');

  return (
    <div className="mb-4 sm:mb-6">
      <DashboardHero
        badge={heroBadge}
        title={title}
        subtitle={subtitle}
        chips={chips}
        actions={actions}
      />
    </div>
  );
}

/** Semantic color tones for metric cards — optional; default keeps classic white look */
export const STAT_TONES = {
  indigo: {
    card: 'bg-gradient-to-br from-indigo-50 via-white to-white border-indigo-100/80 shadow-indigo-100/40',
    icon: 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25',
    label: 'text-indigo-600',
    accent: 'bg-indigo-500',
  },
  emerald: {
    card: 'bg-gradient-to-br from-emerald-50 via-white to-white border-emerald-100/80 shadow-emerald-100/40',
    icon: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25',
    label: 'text-emerald-700',
    accent: 'bg-emerald-500',
  },
  violet: {
    card: 'bg-gradient-to-br from-violet-50 via-white to-white border-violet-100/80 shadow-violet-100/40',
    icon: 'bg-violet-500 text-white shadow-md shadow-violet-500/25',
    label: 'text-violet-600',
    accent: 'bg-violet-500',
  },
  amber: {
    card: 'bg-gradient-to-br from-amber-50 via-white to-white border-amber-100/80 shadow-amber-100/40',
    icon: 'bg-amber-500 text-white shadow-md shadow-amber-500/25',
    label: 'text-amber-700',
    accent: 'bg-amber-500',
  },
  sky: {
    card: 'bg-gradient-to-br from-sky-50 via-white to-white border-sky-100/80 shadow-sky-100/40',
    icon: 'bg-sky-500 text-white shadow-md shadow-sky-500/25',
    label: 'text-sky-700',
    accent: 'bg-sky-500',
  },
  orange: {
    card: 'bg-gradient-to-br from-orange-50 via-white to-white border-orange-100/80 shadow-orange-100/40',
    icon: 'bg-orange-500 text-white shadow-md shadow-orange-500/25',
    label: 'text-orange-700',
    accent: 'bg-orange-500',
  },
  rose: {
    card: 'bg-gradient-to-br from-rose-50 via-white to-white border-rose-100/80 shadow-rose-100/40',
    icon: 'bg-rose-500 text-white shadow-md shadow-rose-500/25',
    label: 'text-rose-600',
    accent: 'bg-rose-500',
  },
  teal: {
    card: 'bg-gradient-to-br from-teal-50 via-white to-white border-teal-100/80 shadow-teal-100/40',
    icon: 'bg-teal-500 text-white shadow-md shadow-teal-500/25',
    label: 'text-teal-700',
    accent: 'bg-teal-500',
  },
  brand: {
    card: 'bg-gradient-to-br from-brand-50 via-white to-white border-blue-100/80 shadow-blue-100/40',
    icon: 'bg-brand-600 text-white shadow-md shadow-brand-600/25',
    label: 'text-brand-600',
    accent: 'bg-brand-600',
  },
  slate: {
    card: 'bg-gradient-to-br from-slate-50 via-white to-white border-slate-200/80',
    icon: 'bg-slate-500 text-white shadow-md shadow-slate-500/20',
    label: 'text-slate-600',
    accent: 'bg-slate-500',
  },
};

export function StatCard({ label, value, delta, deltaType = 'up', icon: Icon, tone, to }) {
  const t = tone ? STAT_TONES[tone] : null;
  const clickable = Boolean(to);
  const Wrapper = clickable ? Link : 'div';
  const wrapperProps = clickable ? { to, 'aria-label': `View ${label}` } : {};

  if (!t) {
    return (
      <Wrapper
        {...wrapperProps}
        className={cn(
          'stat-card min-w-0 block',
          clickable &&
            'cursor-pointer hover:border-brand-600/40 hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30'
        )}
      >
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          {Icon && <Icon size={14} className="text-brand-600 shrink-0" />}
          <span className="truncate">{label}</span>
        </p>
        <p className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">{value}</p>
        {delta && (
          <p
            className={cn(
              'text-xs sm:text-sm flex items-center gap-1 mt-2',
              deltaType === 'up' ? 'text-emerald-600' : deltaType === 'down' ? 'text-rose-500' : 'text-slate-400'
            )}
          >
            {delta}
          </p>
        )}
      </Wrapper>
    );
  }

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        'stat-card min-w-0 relative overflow-hidden transition-all block',
        t.card,
        clickable &&
          'cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30'
      )}
    >
      <span className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-xl', t.accent)} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn('text-xs font-medium uppercase tracking-wider mb-2 truncate', t.label)}>{label}</p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">{value}</p>
          {delta && (
            <p
              className={cn(
                'text-xs sm:text-sm flex items-center gap-1 mt-2',
                deltaType === 'up' ? 'text-emerald-600' : deltaType === 'down' ? 'text-rose-500' : 'text-slate-400'
              )}
            >
              {delta}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn('shrink-0 w-10 h-10 rounded-xl flex items-center justify-center', t.icon)}>
            <Icon size={18} strokeWidth={2.25} />
          </div>
        )}
      </div>
    </Wrapper>
  );
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
