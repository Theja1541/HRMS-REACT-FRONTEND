import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { BookOpen, Loader2 } from 'lucide-react';
import { employeeApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import SeparationKtPanel from '../../components/separation/SeparationKtPanel';
import { KT_PLAN_STATUSES, KT_PLAN_STATUS_LABELS } from '../../constants/hr';
import { cn } from '../../utils/helpers';

function fmtDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
}

function fmtName(emp) {
  if (!emp) return '—';
  return `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.emp_code || '—';
}

export default function MeKtPage() {
  const [selectedId, setSelectedId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-kt-plans'],
    queryFn: () => employeeApi.listMyKtPlans(),
  });

  const plans = data?.data?.plans || [];
  const activeId = selectedId || plans[0]?.id;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="My Work · Knowledge Transfer"
        title="My Knowledge Transfer"
        subtitle="Complete handover tasks, upload documents, and track manager approval"
      />

      {isLoading ? (
        <div className="card flex items-center justify-center gap-2 py-16 text-slate-400 text-xs">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : plans.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-xs">
          <BookOpen size={28} className="mx-auto mb-3 text-slate-300" />
          No knowledge transfer plans assigned to you yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  'w-full text-left card p-3 border transition-colors',
                  activeId === p.id ? 'border-brand-500 ring-1 ring-brand-200' : 'border-transparent'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-800 truncate">{p.title}</p>
                  <span
                    className={cn(
                      'text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0',
                      KT_PLAN_STATUSES[p.status]
                    )}
                  >
                    {KT_PLAN_STATUS_LABELS[p.status]}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Leaving: {fmtName(p.employee)} · Due {fmtDate(p.due_date)}
                </p>
                <p className="text-[10px] text-slate-500">Progress {p.progress_percent || 0}%</p>
              </button>
            ))}
          </div>
          <div className="lg:col-span-2 card p-4">
            {activeId ? <SeparationKtPanel planId={activeId} enabled /> : null}
          </div>
        </div>
      )}
    </div>
  );
}
