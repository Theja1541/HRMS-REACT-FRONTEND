import { format, parseISO } from 'date-fns';
import { History } from 'lucide-react';
import { cn } from '../../utils/helpers';

const ACTION_LABELS = {
  started: 'Started',
  extended: 'Extended',
  confirmed: 'Confirmed',
  unsuccessful: 'Unsuccessful',
};

const ACTION_STYLES = {
  started:      'bg-amber-50  text-amber-700',
  extended:     'bg-blue-50   text-blue-700',
  confirmed:    'bg-emerald-50 text-emerald-700',
  unsuccessful: 'bg-red-50    text-red-700',
};

function fmtDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(String(value).slice(0, 10)), 'dd MMM yyyy');
  } catch {
    return value;
  }
}

function fmtDateTime(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy, h:mm a');
  } catch {
    return value;
  }
}

function performerName(entry) {
  const p = entry.performer;
  if (!p) return '—';
  return `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.emp_code || '—';
}

export default function ProbationHistoryPanel({ history = [] }) {
  if (!history.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <History size={28} className="text-slate-300 mb-2" />
        <p className="text-sm text-slate-400">No probation history recorded</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Date</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-600">Action</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Previous End Date</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">New End Date</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-600">Remarks</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Performed By</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {history.map((entry) => (
            <tr key={entry.id} className="hover:bg-slate-50">
              <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                {fmtDateTime(entry.created_at)}
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={cn(
                    'inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize',
                    ACTION_STYLES[entry.action] || 'bg-slate-100 text-slate-600'
                  )}
                >
                  {ACTION_LABELS[entry.action] || entry.action}
                </span>
              </td>
              <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                {fmtDate(entry.previous_end_date)}
              </td>
              <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                {fmtDate(entry.new_end_date)}
              </td>
              <td className="px-4 py-2.5 text-slate-600 max-w-[200px]">
                <span className="line-clamp-2">{entry.remarks || '—'}</span>
              </td>
              <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                {performerName(entry)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
