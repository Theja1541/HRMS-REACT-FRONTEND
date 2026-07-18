import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { MessageSquareQuote, Loader2 } from 'lucide-react';
import { employeeApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import SeparationExitInterviewPanel from '../../components/separation/SeparationExitInterviewPanel';
import {
  EXIT_INTERVIEW_STATUS_LABELS,
  EXIT_INTERVIEW_STATUSES,
} from '../../constants/hr';
import { cn } from '../../utils/helpers';

function fmtDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
}

export default function MeExitInterviewPage() {
  const [selectedId, setSelectedId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-exit-interviews'],
    queryFn: () => employeeApi.listMyExitInterviews(),
  });

  const interviews = data?.data?.interviews || [];
  const activeId = selectedId || interviews[0]?.id;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Exit Interview"
        subtitle="Share your feedback, ratings, and reasons for leaving"
      />

      {isLoading ? (
        <div className="card flex items-center justify-center gap-2 py-16 text-slate-400 text-xs">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : interviews.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-xs">
          <MessageSquareQuote size={28} className="mx-auto mb-3 text-slate-300" />
          No exit interview assigned yet. It is created when your separation is approved.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            {interviews.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  'w-full text-left card p-3 border transition-colors',
                  activeId === item.id ? 'border-brand-500 ring-1 ring-brand-200' : 'border-transparent'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    Exit interview #{item.id}
                  </p>
                  <span
                    className={cn(
                      'text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0',
                      EXIT_INTERVIEW_STATUSES[item.status]
                    )}
                  >
                    {EXIT_INTERVIEW_STATUS_LABELS[item.status]}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Due {fmtDate(item.due_date)}</p>
              </button>
            ))}
          </div>
          <div className="lg:col-span-2 card p-4">
            {activeId ? <SeparationExitInterviewPanel interviewId={activeId} enabled /> : null}
          </div>
        </div>
      )}
    </div>
  );
}
