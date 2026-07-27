import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, subMonths } from 'date-fns';
import { Check, X } from 'lucide-react';
import { compOffApi, attendanceApi, leaveApi } from '../../api';
import { LEAVE_STATUS } from '../../constants/hr';
import { cn, localDateString } from '../../utils/helpers';
import { Avatar } from '../../components/shared/StatusBadge';

const WORK_STATUSES = new Set(['present', 'wfh', 'late', 'half_day']);

const emptyForm = {
  worked_date: '',
  reason: '',
  is_half_day: false,
};

function todayStr() {
  return localDateString();
}

function monthYearPairs(lookback = 3) {
  const pairs = [];
  const now = new Date();
  for (let i = 0; i < lookback; i += 1) {
    const d = subMonths(now, i);
    pairs.push({ month: d.getMonth() + 1, year: d.getFullYear() });
  }
  return pairs;
}

function creditLabel(req, pending = false) {
  const days = req.is_half_day ? '0.5 day' : '1 day';
  return pending ? `${days} (if approved)` : days;
}

function RequestsTable({ requests, showEmployee, showActions, onApprove, onReject, pendingActions }) {
  if (!requests.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left">
            {showEmployee && (
              <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Employee</th>
            )}
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Worked date</th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Credit</th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Status</th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Valid until</th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Reason</th>
            {showActions && (
              <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Actions</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {requests.map((req) => (
            <tr key={req.id} className="hover:bg-slate-50">
              {showEmployee && (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={`${req.employee?.first_name || ''} ${req.employee?.last_name || ''}`}
                      size="sm"
                    />
                    <div>
                      <span className="font-medium text-xs block">
                        {req.employee?.first_name} {req.employee?.last_name}
                      </span>
                      {req.employee?.emp_code && (
                        <span className="text-[10px] font-mono text-slate-400">{req.employee.emp_code}</span>
                      )}
                    </div>
                  </div>
                </td>
              )}
              <td className="px-4 py-3 text-xs text-slate-700 font-medium">
                {format(parseISO(req.worked_date), 'dd MMM yyyy')}
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">
                {req.status === 'approved'
                  ? creditLabel(req)
                  : creditLabel(req, req.status === 'pending')}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize',
                    LEAVE_STATUS[req.status]
                  )}
                >
                  {req.status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {req.expiry_date ? format(parseISO(req.expiry_date), 'dd MMM yyyy') : '—'}
              </td>
              <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">
                {req.reason || '—'}
              </td>
              {showActions && (
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onApprove(req.id)}
                      disabled={pendingActions}
                      title="Approve"
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject(req)}
                      disabled={pendingActions}
                      title="Reject"
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CompOffPanel({ canApprove = false }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [applyError, setApplyError] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectError, setRejectError] = useState('');

  const invalidateCompOff = () => {
    queryClient.invalidateQueries({ queryKey: ['comp-off-requests'] });
    queryClient.invalidateQueries({ queryKey: ['comp-off-approvals'] });
    queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
  };

  const {
    data: approvalsData,
    isLoading: approvalsLoading,
    isError: approvalsError,
    error: approvalsQueryError,
    refetch: refetchApprovals,
  } = useQuery({
    queryKey: ['comp-off-approvals'],
    queryFn: () => compOffApi.approvalQueue({ limit: 50 }),
    enabled: canApprove,
  });

  const {
    data: requestsData,
    isLoading: requestsLoading,
    isError: requestsError,
    error: requestsQueryError,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ['comp-off-requests'],
    queryFn: () => compOffApi.myRequests({ limit: 50 }),
  });

  const { data: eligibleData } = useQuery({
    queryKey: ['comp-off-policy'],
    queryFn: () => leaveApi.getEligibleTypes(),
  });

  const coPolicy = (eligibleData?.data?.eligible || []).find(
    (entry) => entry.leaveType?.code === 'CO'
  )?.policy;

  const expiryDays = coPolicy?.comp_off_expiry_days ?? 90;
  const halfDayAllowed = coPolicy?.comp_off_half_day_credit !== false;
  const carryForward = !!coPolicy?.comp_off_carry_forward;
  const encashmentAllowed = !!coPolicy?.comp_off_encashment;

  const { data: attendanceBundles } = useQuery({
    queryKey: ['comp-off-attendance-hints', monthYearPairs().map((p) => `${p.year}-${p.month}`).join(',')],
    queryFn: async () => {
      const months = monthYearPairs(3);
      const results = await Promise.all(
        months.map(({ month, year }) => attendanceApi.list({ month, year, limit: 500 }))
      );
      return results.flatMap((r) => r?.data?.records || []);
    },
    staleTime: 60_000,
  });

  const pendingApprovals = approvalsData?.data?.requests || [];
  const requests = requestsData?.data?.requests || [];
  const claimedDates = new Set(
    requests.filter((r) => r.status !== 'rejected').map((r) => r.worked_date)
  );

  const suggestedDates = (attendanceBundles || [])
    .filter((rec) => WORK_STATUSES.has(rec.status) && !claimedDates.has(rec.date))
    .map((rec) => rec.date)
    .filter((date, idx, arr) => arr.indexOf(date) === idx)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 8);

  const applyMutation = useMutation({
    mutationFn: compOffApi.apply,
    onSuccess: () => {
      invalidateCompOff();
      setForm(emptyForm);
      setApplyError('');
    },
    onError: (err) => {
      setApplyError(err.response?.data?.error?.message || 'Failed to submit comp-off request');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => compOffApi.approve(id),
    onSuccess: invalidateCompOff,
    onError: (err) => {
      window.alert(err.response?.data?.error?.message || 'Failed to approve comp-off request');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => compOffApi.reject(id, reason ? { reason } : undefined),
    onSuccess: () => {
      invalidateCompOff();
      setRejectTarget(null);
      setRejectNote('');
      setRejectError('');
    },
    onError: (err) => {
      setRejectError(err.response?.data?.error?.message || 'Failed to reject comp-off request');
    },
  });

  const canSubmit = form.worked_date && form.worked_date <= todayStr();
  const actionPending = approveMutation.isPending || rejectMutation.isPending;

  const requestsErrorMessage =
    requestsQueryError?.response?.data?.error?.message || 'Could not load comp-off requests.';
  const approvalsErrorMessage =
    approvalsQueryError?.response?.data?.error?.message || 'Could not load pending approvals.';

  const closeRejectModal = () => {
    if (rejectMutation.isPending) return;
    setRejectTarget(null);
    setRejectNote('');
    setRejectError('');
  };

  return (
    <div className="space-y-4">
      {canApprove && (
        <div className="card">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Pending approvals</h3>
            <span className="text-xs text-slate-500">{pendingApprovals.length} awaiting action</span>
          </div>

          {approvalsLoading ? (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-400">Loading approval queue…</p>
            </div>
          ) : approvalsError ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm font-medium text-slate-700">Couldn&apos;t load approvals</p>
              <p className="text-sm text-red-600">{approvalsErrorMessage}</p>
              <button type="button" onClick={() => refetchApprovals()} className="btn-secondary text-xs">
                Retry
              </button>
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-medium text-slate-600">No pending comp-off requests</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Team comp-off claims will appear here for your review.
              </p>
            </div>
          ) : (
            <RequestsTable
              requests={pendingApprovals}
              showEmployee
              showActions
              pendingActions={actionPending}
              onApprove={(id) => approveMutation.mutate(id)}
              onReject={setRejectTarget}
            />
          )}
        </div>
      )}

      <div className="card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Request comp-off</h3>
          <p className="text-xs text-slate-500 mt-1">
            Claim credit for work on a weekend, company holiday, or other approved off-day. Your
            manager must approve before balance is credited.
            {coPolicy && (
              <span className="block mt-1 text-slate-400">
                Policy: use within {expiryDays} day{expiryDays === 1 ? '' : 's'} of the worked date
                {!carryForward ? '; unused balance does not carry to the next cycle' : '; unused balance may carry forward at year-end'}
                {encashmentAllowed ? '; encashment allowed per policy' : ''}.
              </span>
            )}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setApplyError('');
            applyMutation.mutate({
              worked_date: form.worked_date,
              reason: form.reason.trim() || undefined,
              is_half_day: halfDayAllowed ? form.is_half_day : false,
            });
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div>
            <label className="text-xs font-medium text-slate-600">Date worked</label>
            <input
              type="date"
              required
              max={todayStr()}
              value={form.worked_date}
              onChange={(e) => setForm({ ...form, worked_date: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div className="flex items-end">
            {halfDayAllowed ? (
              <label className="flex items-center gap-2 text-xs text-slate-600 pb-2">
                <input
                  type="checkbox"
                  checked={form.is_half_day}
                  onChange={(e) => setForm({ ...form, is_half_day: e.target.checked })}
                />
                Half-day work (0.5 day credit)
              </label>
            ) : (
              <p className="text-xs text-slate-400 pb-2">Half-day comp-off credit is disabled by policy.</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600">Reason (optional)</label>
            <textarea
              rows={2}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Production release on Sunday"
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          {suggestedDates.length > 0 && (
            <div className="sm:col-span-2">
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-2">
                Recent worked days (from attendance)
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedDates.map((date) => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, worked_date: date }))}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border transition-colors',
                      form.worked_date === date
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {format(parseISO(date), 'dd MMM yyyy')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {applyError && (
            <p className="sm:col-span-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {applyError}
            </p>
          )}

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={applyMutation.isPending || !canSubmit}
              className="btn-primary text-xs"
            >
              {applyMutation.isPending ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800">My comp-off requests</h3>
        </div>

        {requestsLoading ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-400">Loading comp-off requests…</p>
          </div>
        ) : requestsError ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700">Couldn&apos;t load requests</p>
            <p className="text-sm text-red-600">{requestsErrorMessage}</p>
            <button type="button" onClick={() => refetchRequests()} className="btn-secondary text-xs">
              Retry
            </button>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-medium text-slate-600">No comp-off requests yet</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Submit a request above when you have worked on a weekend or holiday.
            </p>
          </div>
        ) : (
          <RequestsTable requests={requests} />
        )}
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold">Reject Comp-off Request</h3>
              <p className="text-xs text-slate-500 mt-1">
                {rejectTarget.employee?.emp_code && (
                  <span className="font-mono">{rejectTarget.employee.emp_code} · </span>
                )}
                {rejectTarget.employee?.first_name} {rejectTarget.employee?.last_name} ·{' '}
                {format(parseISO(rejectTarget.worked_date), 'dd MMM yyyy')}
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setRejectError('');
                rejectMutation.mutate({
                  id: rejectTarget.id,
                  reason: rejectNote.trim() || undefined,
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-slate-600">Rejection reason (optional)</label>
                <textarea
                  rows={3}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Explain why this comp-off claim is being rejected…"
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              {rejectError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {rejectError}
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeRejectModal} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectMutation.isPending}
                  className="btn-primary bg-red-600 hover:bg-red-700 border-red-600"
                >
                  {rejectMutation.isPending ? 'Rejecting…' : 'Reject request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
