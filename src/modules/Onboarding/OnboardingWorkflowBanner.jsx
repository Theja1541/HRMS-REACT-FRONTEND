import { CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { WORKFLOW_STEPS } from './onboarding.constants';

export default function OnboardingWorkflowBanner({ templatesReady, hasActiveOnboarding }) {
  const stepState = (step) => {
    if (step === 1) return templatesReady ? 'done' : 'current';
    if (step === 2) {
      if (!templatesReady) return 'upcoming';
      return hasActiveOnboarding ? 'done' : 'current';
    }
    if (step === 3) {
      if (!templatesReady) return 'upcoming';
      return hasActiveOnboarding ? 'current' : 'upcoming';
    }
    return 'upcoming';
  };

  return (
    <div className="card p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">How onboarding works</p>
      <p className="text-sm text-slate-600 mb-4">
        First define your <strong>master checklist</strong>, then assign it to each new joiner. This matches how GreytHR, Zoho People, and similar HRMS products work.
      </p>
      <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {WORKFLOW_STEPS.map(({ step, title, description }) => {
          const state = stepState(step);
          return (
            <li
              key={step}
              className={cn(
                'rounded-xl border p-4 transition-colors',
                state === 'done' && 'border-emerald-200 bg-emerald-50/50',
                state === 'current' && 'border-brand-300 bg-brand-50/40 ring-1 ring-brand-200',
                state === 'upcoming' && 'border-slate-200 bg-slate-50/50'
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    state === 'done' && 'bg-emerald-600 text-white',
                    state === 'current' && 'bg-brand-600 text-white',
                    state === 'upcoming' && 'bg-slate-200 text-slate-500'
                  )}
                >
                  {state === 'done' ? <CheckCircle2 size={16} /> : step}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{title}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
