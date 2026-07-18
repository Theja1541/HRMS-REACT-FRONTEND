import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { X } from 'lucide-react';
import SeparationClearancePanel from './SeparationClearancePanel';
import SeparationFnfPanel from './SeparationFnfPanel';
import SeparationKtPanel from './SeparationKtPanel';
import SeparationExitInterviewPanel from './SeparationExitInterviewPanel';
import RelievingLetterPanel from './RelievingLetterPanel';
import ExperienceLetterPanel from './ExperienceLetterPanel';
import { Avatar } from '../shared/StatusBadge';
import { hrApi } from '../../api';
import { SEPARATION_STATUSES } from '../../constants/hr';
import { cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { resolvePortalRole } from '../../utils/portalContext';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'kt', label: 'Knowledge Transfer' },
  { id: 'exit_interview', label: 'Exit Interview' },
  { id: 'clearance', label: 'Clearance' },
  { id: 'fnf', label: 'F&F' },
  { id: 'relieving', label: 'Relieving Letter' },
  { id: 'experience', label: 'Experience Certificate' },
];

const HR_ADMIN_ROLES = ['super_admin', 'owner', 'hr', 'admin'];

function formatDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
}

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy, h:mm a');
  } catch {
    return value;
  }
}

function HiringEligibilitySection({ request, onUpdate, isUpdating, canEdit }) {
  const [rehireEligible, setRehireEligible] = useState(request.rehire_eligible !== false);
  const [blacklisted, setBlacklisted] = useState(!!request.is_blacklisted);
  const [rehireBlockReason, setRehireBlockReason] = useState(request.rehire_block_reason || '');
  const [blacklistReason, setBlacklistReason] = useState(request.blacklist_reason || '');
  const [formError, setFormError] = useState('');
  const [saveOk, setSaveOk] = useState(false);

  useEffect(() => {
    setRehireEligible(request.rehire_eligible !== false);
    setBlacklisted(!!request.is_blacklisted);
    setRehireBlockReason(request.rehire_block_reason || '');
    setBlacklistReason(request.blacklist_reason || '');
  }, [
    request.id,
    request.rehire_eligible,
    request.is_blacklisted,
    request.rehire_block_reason,
    request.blacklist_reason,
  ]);

  const { data: eventsData } = useQuery({
    queryKey: ['separation-hiring-eligibility-events', request.id],
    queryFn: () => hrApi.listSeparationHiringEligibilityEvents(request.id),
  });
  const events = eventsData?.data?.events || [];

  const save = async () => {
    setFormError('');
    setSaveOk(false);
    if (blacklisted && !blacklistReason.trim()) {
      setFormError('Blacklist reason is required');
      return;
    }
    if (!rehireEligible && !blacklisted && !rehireBlockReason.trim()) {
      setFormError('Provide a reason when marking not rehireable');
      return;
    }
    try {
      await onUpdate({
        id: request.id,
        rehire_eligible: blacklisted ? false : rehireEligible,
        is_blacklisted: blacklisted,
        rehire_block_reason: blacklisted || !rehireEligible ? rehireBlockReason.trim() || blacklistReason.trim() : null,
        blacklist_reason: blacklisted ? blacklistReason.trim() : null,
      });
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
    } catch (err) {
      setFormError(err?.response?.data?.error?.message || 'Failed to save hiring eligibility');
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
            Rehire &amp; blacklist
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Controls future hiring validation. Blacklisted identities cannot be hired again.
          </p>
        </div>
        <div className="flex gap-1.5">
          {request.is_blacklisted ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
              Blacklisted
            </span>
          ) : request.rehire_eligible === false ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
              Not rehireable
            </span>
          ) : (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              Rehireable
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <label className="flex items-center gap-2 text-slate-700">
          <input
            type="checkbox"
            checked={rehireEligible && !blacklisted}
            disabled={!canEdit || blacklisted}
            onChange={(e) => setRehireEligible(e.target.checked)}
          />
          Eligible for rehire
        </label>
        <label className="flex items-center gap-2 text-slate-700">
          <input
            type="checkbox"
            checked={blacklisted}
            disabled={!canEdit}
            onChange={(e) => {
              setBlacklisted(e.target.checked);
              if (e.target.checked) setRehireEligible(false);
            }}
          />
          Blacklist (block all future hiring)
        </label>
      </div>

      {(!rehireEligible || blacklisted) && (
        <div>
          <label className="text-[10px] text-slate-500">
            {blacklisted ? 'Blacklist reason *' : 'Not-rehireable reason *'}
          </label>
          <textarea
            rows={2}
            className="input text-xs w-full mt-1 resize-none"
            value={blacklisted ? blacklistReason : rehireBlockReason}
            disabled={!canEdit}
            onChange={(e) =>
              blacklisted ? setBlacklistReason(e.target.value) : setRehireBlockReason(e.target.value)
            }
            placeholder="Document why this person should not be hired again"
          />
        </div>
      )}

      {formError && <p className="text-xs text-red-600">{formError}</p>}
      {saveOk && !formError && (
        <p className="text-xs text-emerald-600">Hiring eligibility saved</p>
      )}

      {canEdit && (
        <button type="button" className="btn-primary text-xs" disabled={isUpdating} onClick={save}>
          {isUpdating ? 'Saving…' : 'Save hiring eligibility'}
        </button>
      )}

      {events.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <p className="text-[10px] uppercase text-slate-400 mb-2">Eligibility audit log</p>
          <ul className="space-y-1.5 max-h-40 overflow-y-auto">
            {events.slice(0, 10).map((ev) => (
              <li key={ev.id} className="text-[11px] text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5">
                <span className="font-medium capitalize">{ev.action.replace(/_/g, ' ')}</span>
                <span className="text-slate-400"> · {formatDateTime(ev.created_at)}</span>
                {(ev.blacklist_reason || ev.rehire_block_reason || ev.notes) && (
                  <p className="text-slate-500 mt-0.5">
                    {ev.blacklist_reason || ev.rehire_block_reason || ev.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function SeparationDetailDrawer({
  request,
  onClose,
  onUpdate,
  isUpdating,
  onRefresh,
  updateError,
}) {
  const [tab, setTab] = useState('overview');
  const { user, workspace, roles, selectedRole, accessToken } = useAuthStore();
  const role = resolvePortalRole({ accessToken, workspace, user, roles, selectedRole });
  const isHrAdmin = HR_ADMIN_ROLES.includes(role);

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

              {updateError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {updateError}
                </div>
              )}

              <HiringEligibilitySection
                request={request}
                onUpdate={onUpdate}
                isUpdating={isUpdating}
                canEdit={isHrAdmin}
              />

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                {isHrAdmin && request.status === 'initiated' && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onUpdate({ id: request.id, status: 'approved' })}
                    className="btn-secondary text-xs"
                  >
                    Approve &amp; Start Exit Workflow
                  </button>
                )}
                {isHrAdmin && request.status === 'approved' && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onUpdate({ id: request.id, status: 'clearance_pending' })}
                    className="btn-secondary text-xs"
                    title="Creates clearance, KT, exit interview, asset returns, and F&F draft if missing"
                  >
                    Start / Repair Exit Workflow
                  </button>
                )}
                {isHrAdmin && request.status === 'clearance_pending' && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onUpdate({ id: request.id, status: 'completed', fnf_status: 'processing' })}
                    className="btn-primary text-xs"
                  >
                    Complete Separation
                  </button>
                )}
                <button type="button" onClick={() => setTab('kt')} className="btn-secondary text-xs">
                  View KT
                </button>
                <button
                  type="button"
                  onClick={() => setTab('exit_interview')}
                  className="btn-secondary text-xs"
                >
                  Exit Interview
                </button>
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

          {tab === 'kt' && (
            <SeparationKtPanel separationRequestId={request.id} enabled={tab === 'kt'} />
          )}

          {tab === 'exit_interview' && (
            <SeparationExitInterviewPanel
              separationRequestId={request.id}
              enabled={tab === 'exit_interview'}
            />
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
