import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { leaveEncashmentApi } from '../../api';
import { LEAVE_STATUS } from '../../constants/hr';
import { MONTHS } from '../../constants/payroll';
import { cn, formatINR } from '../../utils/helpers';
import { Avatar } from '../../components/shared/StatusBadge';

const now = new Date();

const emptyForm = {
  leave_type_id: '',
  days: '',
  payout_month: now.getMonth() + 1,
  payout_year: now.getFullYear(),
  reason: '',
};

function formatDayCount(days) {
  const n = parseFloat(days);
  if (Number.isNaN(n)) return '—';
  return n === 1 ? '1 day' : `${n} days`;
}

export default function LeaveEncashmentPanel({ canApprove = false }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [applyError, setApplyError] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectError, setRejectError] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['leave-encashment-requests'] });
    queryClient.invalidateQueries({ queryKey: ['leave-encashment-approvals'] });
    queryClient.invalidateQueries({ queryKey: ['leave-encashment-eligible'] });
    queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
  };

  const { data: eligibleData, isLoading: eligibleLoading } = useQuery({
    queryKey: ['leave-encashment-eligible'],
    queryFn: () => leaveEncashmentApi.getEligible(),
  });

  const eligible = eligibleData?.data?.eligible || [];
  const selected = eligible.find((e) => String(e.leaveType.id) === String(form.leave_type_id));

  useEffect(() => {
    if (eligibleLoading || eligible.length === 0) return;
    setForm((prev) => {
      const stillValid = eligible.some((e) => String(e.leaveType.id) === String(prev.leave_type_id));
      if (stillValid) return prev;
      return { ...prev, leave_type_id: String(eligible[0].leaveType.id) };
    });
  }, [eligibleLoading, eligible]);

  const canPreview =
    !!form.leave_type_id && !!form.days && parseFloat(form.days) > 0 && !!form.payout_month && !!form.payout_year;

  const { data: previewData, isLoading: previewLoading } = useQuery({
    queryKey: ['leave-encashment-preview', form.days, form.payout_month, form.payout_year],
    queryFn: () =>
      leaveEncashmentApi.preview({
        days: parseFloat(form.days),
        payout_month: form.payout_month,
        payout_year: form.payout_year,
      }),
    enabled: canPreview,
    staleTime: 30_000,
  });

  const preview = previewData?.data?.preview;

  const { data: approvalsData, isLoading: approvalsLoading, isError: approvalsError, refetch: refetchApprovals } = useQuery({
    queryKey: ['leave-encashment-approvals'],
    queryFn: () => leaveEncashmentApi.approvalQueue({ limit: 50 }),
    enabled: canApprove,
  });

  const { data: requestsData, isLoading: requestsLoading, isError: requestsError, refetch: refetchRequests } = useQuery({
    queryKey: ['leave-encashment-requests'],
    queryFn: () => leaveEncashmentApi.myRequests({ limit: 50 }),
  });

  const pendingApprovals = approvalsData?.data?.requests || [];
  const requests = requestsData?.data?.requests || [];

  const applyMutation = useMutation({
    mutationFn: leaveEncashmentApi.apply,
    onSuccess: () => {
      invalidate();
      setForm(emptyForm);
      setApplyError('');
    },
    onError: (err) => {
      setApplyError(err.response?.data?.error?.message || 'Failed to submit encashment request');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => leaveEncashmentApi.approve(id),
    onSuccess: invalidate,
    onError: (err) => {
      window.alert(err.response?.data?.error?.message || 'Failed to approve encashment');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, rejection_note }) =>
      leaveEncashmentApi.reject(id, rejection_note ? { rejection_note } : undefined),
    onSuccess: () => {
      invalidate();
      setRejectTarget(null);
      setRejectNote('');
      setRejectError('');
    },
    onError: (err) => {
      setRejectError(err.response?.data?.error?.message || 'Failed to reject encashment');
    },
  });

  const maxDays = selected?.policy?.encashment_max_days ?? selected?.available_days;
  const availableDays = selected?.available_days ?? 0;
  const daysNum = parseFloat(form.days);
  const daysValid = !Number.isNaN(daysNum) && daysNum > 0 && daysNum <= availableDays;
  const canSubmit =
    eligible.length > 0 && form.leave_type_id && daysValid && !applyMutation.isPending;

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
            <h3 className="text-sm font-semibold text-slate-800">Pending encashment approvals</h3>
            <span className="text-xs text-slate-500">{pendingApprovals.length} awaiting action</span>
          </div>
          {approvalsLoading ? (
            <div className="p-10 text-center text-sm text-slate-400">Loading approval queue…</div>
          ) : approvalsError ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-red-600">Could not load approvals</p>
              <button type="button" onClick={() => refetchApprovals()} className="btn-secondary text-xs">Retry</button>
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">No pending encashment requests</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Employee</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Leave type</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Days</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Est. payout</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Payroll month</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingApprovals.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={`${req.employee?.first_name} ${req.employee?.last_name}`} size="sm" />
                          <div>
                            <span className="text-xs font-medium block">{req.employee?.first_name} {req.employee?.last_name}</span>
                            {req.employee?.emp_code && (
                              <span className="text-[10px] font-mono text-slate-400">{req.employee.emp_code}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">{req.leaveType?.code}</td>
                      <td className="px-4 py-3 text-xs">{formatDayCount(req.days)}</td>
                      <td className="px-4 py-3 text-xs font-mono">{formatINR(req.payout_amount)}</td>
                      <td className="px-4 py-3 text-xs">{MONTHS[req.payout_month - 1]} {req.payout_year}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => approveMutation.mutate(req.id)}
                            disabled={approveMutation.isPending}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectTarget(req)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Request leave encashment</h3>
          <p className="text-xs text-slate-500 mt-1">
            Convert unused leave balance to cash. Approved requests are queued in Salary Feed for the selected payroll month.
          </p>
        </div>

        {eligibleLoading ? (
          <p className="text-sm text-slate-400">Loading eligible leave types…</p>
        ) : eligible.length === 0 ? (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            No leave types are eligible for encashment under your current policies.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setApplyError('');
              applyMutation.mutate({
                leave_type_id: parseInt(form.leave_type_id, 10),
                days: parseFloat(form.days),
                payout_month: form.payout_month,
                payout_year: form.payout_year,
                balance_year: selected?.balance_year,
                reason: form.reason.trim() || undefined,
              });
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div>
              <label className="text-xs font-medium text-slate-600">Leave type</label>
              <select
                required
                value={form.leave_type_id}
                onChange={(e) => setForm({ ...form, leave_type_id: e.target.value, days: '' })}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                {eligible.map((entry) => (
                  <option key={entry.leaveType.id} value={entry.leaveType.id}>
                    {entry.leaveType.name} ({entry.leaveType.code}) — {entry.available_days} available
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Days to encash</label>
              <input
                type="number"
                required
                min="0.5"
                step="0.5"
                max={availableDays}
                value={form.days}
                onChange={(e) => setForm({ ...form, days: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Max {maxDays ?? availableDays} day(s) per request · {availableDays} encashable now
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Payout payroll month</label>
              <div className="mt-1 flex gap-2">
                <select
                  value={form.payout_month}
                  onChange={(e) => setForm({ ...form, payout_month: parseInt(e.target.value, 10) })}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={form.payout_year}
                  onChange={(e) => setForm({ ...form, payout_year: parseInt(e.target.value, 10) })}
                  className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  {[now.getFullYear(), now.getFullYear() + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Reason (optional)</label>
              <textarea
                rows={2}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>

            {canPreview && (
              <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                {previewLoading ? (
                  <p className="text-sm text-slate-500">Estimating payout…</p>
                ) : preview ? (
                  <p className="text-sm text-slate-700">
                    Estimated payout: <span className="font-semibold">{formatINR(preview.payout_amount)}</span>
                    {' '}(₹{preview.per_day_amount?.toLocaleString('en-IN')} × {form.days} days, gross ÷ {preview.working_days} working days)
                  </p>
                ) : null}
              </div>
            )}

            {applyError && (
              <p className="sm:col-span-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {applyError}
              </p>
            )}

            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={!canSubmit} className="btn-primary text-xs">
                {applyMutation.isPending ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800">My encashment requests</h3>
        </div>
        {requestsLoading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading requests…</div>
        ) : requestsError ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-red-600">Could not load requests</p>
            <button type="button" onClick={() => refetchRequests()} className="btn-secondary text-xs">Retry</button>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No encashment requests yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Leave type</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Days</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Payout</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Payroll</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs font-semibold">{req.leaveType?.code}</td>
                    <td className="px-4 py-3 text-xs">{formatDayCount(req.days)}</td>
                    <td className="px-4 py-3 text-xs font-mono">
                      {req.payout_amount ? formatINR(req.payout_amount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">{MONTHS[req.payout_month - 1]} {req.payout_year}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize', LEAVE_STATUS[req.status])}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold">Reject Encashment Request</h3>
              <p className="text-xs text-slate-500 mt-1">
                {rejectTarget.employee?.emp_code && (
                  <span className="font-mono">{rejectTarget.employee.emp_code} · </span>
                )}
                {rejectTarget.employee?.first_name} {rejectTarget.employee?.last_name} · {rejectTarget.leaveType?.code} · {rejectTarget.days} day(s)
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setRejectError('');
                rejectMutation.mutate({ id: rejectTarget.id, rejection_note: rejectNote.trim() });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-slate-600">Rejection note (optional)</label>
                <textarea
                  rows={3}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              {rejectError && <p className="text-sm text-red-600">{rejectError}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeRejectModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={rejectMutation.isPending} className="btn-primary bg-red-600 hover:bg-red-700 border-red-600">
                  {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
