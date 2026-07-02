import { Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';

export default function RecruitmentWorkflowBanner({ careersSlug }) {
  const steps = [
    { n: 1, title: 'Publish opening', text: 'Set internal, external, or both. Enable referrals for external hiring.' },
    { n: 2, title: 'Sources', text: 'Employees apply internally, refer friends, or candidates apply on careers page.' },
    { n: 3, title: 'Pipeline', text: 'Screen → Interview → Offer → Hired / Rejected.' },
    { n: 4, title: 'Onboard', text: 'Convert hired candidates to employees.' },
  ];

  return (
    <div className="card p-4 border border-slate-200 bg-slate-50/80">
      <div className="flex items-start gap-3">
        <Briefcase size={20} className="text-brand-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">How recruitment works</p>
          <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ n, title, text }) => (
              <li key={n} className="rounded-lg bg-white border border-slate-200 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-brand-600">Step {n}</p>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{title}</p>
                <p className="text-xs text-slate-500 mt-1">{text}</p>
              </li>
            ))}
          </ol>
          {careersSlug && (
            <p className="text-xs text-slate-500 mt-3">
              Public careers page:{' '}
              <Link to={`/careers/${careersSlug}`} className="text-brand-600 underline font-medium" target="_blank">
                /careers/{careersSlug}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
