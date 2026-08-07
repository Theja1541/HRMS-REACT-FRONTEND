import { Sparkles } from 'lucide-react';

/**
 * Shared gradient hero used across portal dashboards.
 * Chips: [{ label, value, tone?: 'default' | 'emerald' | 'amber' | 'rose' | 'sky' | 'teal' }]
 */
export default function DashboardHero({ badge = 'Overview', title, subtitle, chips = [], actions }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-brand-700 to-sky-500 p-5 sm:p-6 text-white shadow-lg shadow-brand-600/25">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, #fff 0.8px, transparent 1px), radial-gradient(circle at 80% 60%, #fff 0.8px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-sky-300/25 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-teal-300/20 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm">
            <Sparkles size={12} />
            {badge}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-sky-100/90">{subtitle}</p>}
          {actions && <div className="mt-3 page-hero-actions flex flex-wrap gap-2">{actions}</div>}
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {chips.map((chip) => (
              <HeroChip key={chip.label} {...chip} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const CHIP_TONES = {
  default: 'bg-white/15 text-sky-100/80',
  emerald: 'bg-emerald-400/20 ring-1 ring-emerald-300/30 text-emerald-100',
  amber: 'bg-amber-400/20 ring-1 ring-amber-300/30 text-amber-100',
  rose: 'bg-rose-400/20 ring-1 ring-rose-300/30 text-rose-100',
  sky: 'bg-sky-400/20 ring-1 ring-sky-300/30 text-sky-100',
  teal: 'bg-teal-400/20 ring-1 ring-teal-300/30 text-teal-100',
};

function HeroChip({ label, value, tone = 'default' }) {
  const toneClass = CHIP_TONES[tone] || CHIP_TONES.default;
  return (
    <div className={`rounded-xl px-3.5 py-2.5 backdrop-blur-sm min-w-[5.5rem] ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-wider opacity-90">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

/** Small section label with colored dot — matches main dashboard sections */
export function DashboardSection({ title, accent = 'bg-brand-600', children }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${accent}`} />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      </div>
      {children}
    </section>
  );
}
