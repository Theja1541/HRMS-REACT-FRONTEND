import {
  CircleDot,
  UserCheck,
  ArrowRightLeft,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Lock,
  Star,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../../utils/helpers';

const EVENT_STYLES = {
  created: { icon: CircleDot, dot: 'border-brand-500', iconClass: 'text-brand-600' },
  assigned: { icon: UserCheck, dot: 'border-violet-500', iconClass: 'text-violet-600' },
  status_changed: { icon: ArrowRightLeft, dot: 'border-amber-500', iconClass: 'text-amber-600' },
  reply: { icon: MessageSquare, dot: 'border-slate-400', iconClass: 'text-slate-600' },
  resolved: { icon: CheckCircle2, dot: 'border-emerald-500', iconClass: 'text-emerald-600' },
  escalated: { icon: AlertTriangle, dot: 'border-red-500', iconClass: 'text-red-600' },
  closed: { icon: XCircle, dot: 'border-slate-500', iconClass: 'text-slate-600' },
  rated: { icon: Star, dot: 'border-amber-500', iconClass: 'text-amber-500' },
};

function formatEventDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TicketActivityTimeline({ events = [] }) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-400">No activity yet</p>;
  }

  return (
    <div className="relative border-l border-slate-200 ml-1.5 space-y-4 pl-5">
      {events.map((event) => {
        const style = EVENT_STYLES[event.type] || EVENT_STYLES.reply;
        const Icon = style.icon;
        return (
          <div key={event.id} className="relative">
            <span
              className={cn(
                'absolute -left-[26px] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white border-2',
                style.dot
              )}
            >
              <Icon size={10} className={style.iconClass} />
            </span>
            <div className={cn(event.isInternal && 'rounded-lg bg-amber-50/60 border border-amber-100 px-2 py-1.5 -mx-2')}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-slate-800">{event.title}</p>
                {event.isInternal && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                    <Lock size={10} />
                    Staff only
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap break-words">{event.description}</p>
              <p className="text-[10px] text-slate-400 mt-1">{formatEventDate(event.at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
