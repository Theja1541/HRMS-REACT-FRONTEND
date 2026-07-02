import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { X } from 'lucide-react';
import SeparationClearancePanel from './SeparationClearancePanel';
import SeparationFnfPanel from './SeparationFnfPanel';
import RelievingLetterPanel from './RelievingLetterPanel';
import ExperienceLetterPanel from './ExperienceLetterPanel';
import { Avatar } from '../shared/StatusBadge';
import { SEPARATION_STATUSES } from '../../constants/hr';
import { cn } from '../../utils/helpers';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'clearance', label: 'Clearance' },
  { id: 'fnf', label: 'F&F' },
  { id: 'relieving', label: 'Relieving Letter' },
  { id: 'experience', label: 'Experience Certificate' },
];

function formatDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
}

export default function SeparationDetailDrawer({ request, onClose, onUpdate, isUpdating, onRefresh }) {
  const [tab, setTab] = useState('overview');

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white w-full max-w-3xl h-full shadow-xl flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Separation Details</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {request.employee?.first_name} {request.employee?.last_name} · #{request.id}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-slate-200 px-5 flex gap-4 overflow-x-auto shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'py-3 text-xs font-medium border-b-2 -mb-px whitespace-nowrap',
                tab === t.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <Avatar
                  name={`${request.employee?.first_name || ''} ${request.employee?.last_name || ''}`}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">
                    {request.employee?.first_name} {request.employee?.last_name}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">{request.employee?.emp_code}</p>
                  <p className="text-xs text-slate-500 mt-1">{request.employee?.department?.name || '—'}</p>
                  <span
                    className={cn(
                      'inline-flex mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
                      SEPARATION_STATUSES[request.status]
                    )}
                  >
                    {request.status?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-400 uppercase text-[10px]">Exit Type</p>
                  <p className="font-medium text-slate-800 mt-1 capitalize">{request.exit_type}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-400 uppercase text-[10px]">F&amp;F Status</p>
                  <p className="font-medium text-slate-800 mt-1 capitalize">{request.fnf_status}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-400 uppercase text-[10px]">Resignation Date</p>
                  <p className="font-medium text-slate-800 mt-1">{formatDate(request.resignation_date)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-400 uppercase text-[10px]">Last Working Date</p>
                  <p className="font-medium text-slate-800 mt-1">{formatDate(request.last_working_date)}</p>
                </div>
              </div>

              {request.reason && (
                <div className="text-xs">
                  <p className="text-slate-400 uppercase text-[10px] mb-1">Reason</p>
                  <p className="text-slate-700 bg-slate-50 rounded-lg p-3">{request.reason}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                {request.status === 'initiated' && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onUpdate({ id: request.id, status: 'approved' })}
                    className="btn-secondary text-xs"
                  >
                    Approve
                  </button>
                )}
                {request.status === 'approved' && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onUpdate({ id: request.id, status: 'clearance_pending' })}
                    className="btn-secondary text-xs"
                  >
                    Mark Clearance Pending
                  </button>
                )}
                {request.status === 'clearance_pending' && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onUpdate({ id: request.id, status: 'completed', fnf_status: 'processing' })}
                    className="btn-primary text-xs"
                  >
                    Complete Separation
                  </button>
                )}
                <button type="button" onClick={() => setTab('clearance')} className="btn-secondary text-xs">
                  View Clearance
                </button>
                {request.status === 'completed' && (
                  <button type="button" onClick={() => setTab('fnf')} className="btn-secondary text-xs">
                    View F&amp;F
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === 'clearance' && (
            <SeparationClearancePanel separationRequestId={request.id} enabled={tab === 'clearance'} />
          )}

          {tab === 'fnf' && (
            <SeparationFnfPanel
              separationRequestId={request.id}
              enabled={tab === 'fnf'}
              onSettlementChange={onRefresh}
            />
          )}

          {tab === 'relieving' && (
            <RelievingLetterPanel
              separationRequestId={request.id}
              separationStatus={request.status}
              enabled={tab === 'relieving'}
            />
          )}

          {tab === 'experience' && (
            <ExperienceLetterPanel
              separationRequestId={request.id}
              separationStatus={request.status}
              enabled={tab === 'experience'}
            />
          )}
        </div>
      </div>
    </div>
  );
}
