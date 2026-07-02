export default function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-4 sm:mb-6">
      <div className="min-w-0">
        {breadcrumbs && (
          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-1 mb-1">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                <span className={cn(i === breadcrumbs.length - 1 ? 'text-slate-600' : '', 'truncate max-w-[12rem] sm:max-w-none')}>
                  {crumb}
                </span>
              </span>
            ))}
          </div>
        )}
        <h1 className="text-lg sm:text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export function StatCard({ label, value, delta, deltaType = 'up', icon: Icon }) {
  return (
    <div className="stat-card min-w-0">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
        {Icon && <Icon size={14} className="text-brand-600 shrink-0" />}
        <span className="truncate">{label}</span>
      </p>
      <p className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">{value}</p>
      {delta && (
        <p className={cn('text-xs sm:text-sm flex items-center gap-1 mt-2', deltaType === 'up' ? 'text-emerald-600' : 'text-slate-400')}>
          {delta}
        </p>
      )}
    </div>
  );
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
