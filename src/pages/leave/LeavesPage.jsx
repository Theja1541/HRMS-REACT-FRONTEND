import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, X, Settings2, Ban } from 'lucide-react';
import { leaveApi, compOffApi, leaveEncashmentApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import LeaveRequestDetailDrawer from '../../components/leave/LeaveRequestDetailDrawer';
import LeaveBalanceBreakdownDrawer from '../../components/leave/LeaveBalanceBreakdownDrawer';
import CompOffPanel from '../../components/leave/CompOffPanel';
import LeaveEncashmentPanel from '../../components/leave/LeaveEncashmentPanel';
import TablePagination from '../../components/shared/TablePagination';
import DocumentDropzone from '../employees/employeeWizard/DocumentDropzone';
import StatusBadge, { Avatar } from '../../components/shared/StatusBadge';
import { LEAVE_STATUS } from '../../constants/hr';
import { cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { format, parseISO } from 'date-fns';
import { useTablePagination } from '../../hooks/useTablePagination';
import { formatLeaveDays, leaveBalanceSubtitle } from '../../utils/leaveFormat';

const CANCELLABLE_STATUSES = new Set(['pending', 'approved']);

const emptyApplyForm = {
  leave_type_id: '',
  from_date: '',
  to_date: '',
  is_half_day: false,
  reason: '',
};

export default function LeavesPage({ selfService = false }) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isManager = !selfService && ['super_admin', 'owner', 'hr', 'manager'].includes(user?.role);
  const isAdmin = !selfService && ['super_admin', 'owner', 'hr'].includes(user?.role);
  const isEmployee = user?.role === 'employee';
  const isManagerRole = !selfService && user?.role === 'manager';
  const [tab, setTab] = useState('requests');
  const [pageSection, setPageSection] = useState('leave');
  const [scope, setScope] = useState('my');
  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState(emptyApplyForm);
  const [applyError, setApplyError] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [detailRequestId, setDetailRequestId] = useState(null);
  const [balanceBreakdown, setBalanceBreakdown] = useState(null);

  const effectiveScope = selfService || isEmployee ? 'my' : isAdmin ? 'all' : scope;

  const { setPage, setLimit, paginateClient } = useTablePagination({
    resetDeps: [pageSection, tab, effectiveScope],
  });

  const { data: requestsData, isLoading: requestsLoading, isError: requestsError, error: requestsQueryError, refetch: refetchRequests } = useQuery({
    queryKey: ['leave-requests', effectiveScope, user?.id],
    queryFn: () => {
      const params = { limit: 50 };
      if (effectiveScope === 'my') return leaveApi.myRequests(params);
      if (effectiveScope === 'team') return leaveApi.teamRequests(params);
      return leaveApi.listRequests(params);
    },
    enabled: !!user?.id,
  });

  const { data: approvalsData } = useQuery({
    queryKey: ['leave-approvals', user?.id],
    queryFn: () => leaveApi.approvalQueue({ limit: 50 }),
    enabled: isManager && !!user?.id,
  });

  const { data: compOffApprovalsData } = useQuery({
    queryKey: ['comp-off-approvals', user?.id],
    queryFn: () => compOffApi.approvalQueue({ limit: 50 }),
    enabled: isManager && !!user?.id,
  });

  const { data: encashmentApprovalsData } = useQuery({
    queryKey: ['leave-encashment-approvals', user?.id],
    queryFn: () => leaveEncashmentApi.approvalQueue({ limit: 50 }),
    enabled: isManager && !!user?.id,
  });

  const invalidateLeaveQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    queryClient.invalidateQueries({ queryKey: ['leave-approvals'] });
    queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
    queryClient.invalidateQueries({ queryKey: ['leave-request'] });
    if (selfService) {
      queryClient.invalidateQueries({ queryKey: ['portal-summary'] });
    }
  };

  const {
    data: balancesData,
    isLoading: balancesLoading,
    isError: balancesError,
    error: balancesQueryError,
    refetch: refetchBalances,
  } = useQuery({
    queryKey: ['leave-balances', user?.id],
    queryFn: () => leaveApi.getBalances({ employee_id: user?.id }),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const {
    data: eligibleData,
    isLoading: eligibleLoading,
    isError: eligibleError,
  } = useQuery({
    queryKey: ['leave-eligible-types', user?.id],
    queryFn: () => leaveApi.getEligibleTypes({ employee_id: user?.id }),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const eligibleTypes = eligibleData?.data?.eligible || [];

  const canPreviewDays =
    showApply &&
    !!form.leave_type_id &&
    !!form.from_date &&
    !!form.to_date &&
    form.from_date <= form.to_date;

  const {
    data: previewData,
    isLoading: previewLoading,
    isError: previewError,
  } = useQuery({
    queryKey: [
      'leave-preview-days',
      user?.id,
      form.leave_type_id,
      form.from_date,
      form.to_date,
      form.is_half_day,
    ],
    queryFn: () =>
      leaveApi.previewDays({
        employee_id: user.id,
        leave_type_id: parseInt(form.leave_type_id, 10),
        from_date: form.from_date,
        to_date: form.to_date,
        is_half_day: form.is_half_day,
      }),
    enabled: canPreviewDays && !!user?.id,
    staleTime: 30_000,
  });

  const dayPreview = previewData?.data?.calculation;

  const selectedEligible = eligibleTypes.find(
    (e) => String(e.leaveType?.id) === String(form.leave_type_id)
  );
  const attachmentThreshold = Number(selectedEligible?.policy?.attachment_required_after_days) || 0;
  const previewDayCount =
    dayPreview && !previewLoading && !previewError ? parseFloat(dayPreview.totalDays) : null;
  const attachmentRequired =
    attachmentThreshold > 0 &&
    previewDayCount != null &&
    !Number.isNaN(previewDayCount) &&
    previewDayCount > attachmentThreshold;

  useEffect(() => {
    if (!showApply || eligibleLoading || eligibleTypes.length === 0) return;
    setForm((prev) => {
      const stillValid = eligibleTypes.some(
        (e) => String(e.leaveType?.id) === String(prev.leave_type_id)
      );
      if (stillValid) return prev;
      return { ...prev, leave_type_id: String(eligibleTypes[0].leaveType.id) };
    });
  }, [showApply, eligibleLoading, eligibleTypes]);

  const applyMutation = useMutation({
    mutationFn: ({ payload, file }) => leaveApi.apply(payload, file),
    onSuccess: () => {
      invalidateLeaveQueries();
      setShowApply(false);
      setForm(emptyApplyForm);
      setAttachmentFile(null);
      setApplyError('');
    },
    onError: (err) => {
      setApplyError(err.response?.data?.error?.message || 'Failed to submit leave request');
    },
  });

  const approveMutation = useMutation({
    mutationFn: leaveApi.approve,
    onSuccess: invalidateLeaveQueries,
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, rejection_note }) => leaveApi.reject(id, { rejection_note }),
    onSuccess: () => {
      invalidateLeaveQueries();
      setRejectTarget(null);
      setRejectNote('');
      setRejectError('');
    },
    onError: (err) => {
      setRejectError(err.response?.data?.error?.message || 'Failed to reject leave request');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => leaveApi.cancel(id, reason ? { reason } : undefined),
    onSuccess: invalidateLeaveQueries,
    onError: (err) => {
      window.alert(err.response?.data?.error?.message || 'Failed to cancel leave request');
    },
  });

  const requests = requestsData?.data?.requests || [];
  const balances = balancesData?.data?.balances || [];
  const balanceYear = balancesData?.data?.year ?? new Date().getFullYear();
  const pending = requests.filter((r) => r.status === 'pending');
  const displayedRequests = tab === 'pending' ? pending : requests;
  const { items: visibleRequests, pagination: requestPagination } = paginateClient(displayedRequests);
  const pendingApprovalCount = approvalsData?.data?.requests?.length ?? 0;
  const pendingCompOffCount = compOffApprovalsData?.data?.requests?.length ?? 0;
  const pendingEncashmentCount = encashmentApprovalsData?.data?.requests?.length ?? 0;
  const showEmployeeColumn = !selfService && effectiveScope !== 'my';

  const pageSubtitle = selfService || isEmployee
    ? `${pending.length} pending`
    : [
        pendingApprovalCount > 0 && `${pendingApprovalCount} leave approval${pendingApprovalCount === 1 ? '' : 's'}`,
        pendingCompOffCount > 0 && `${pendingCompOffCount} comp-off`,
        pendingEncashmentCount > 0 && `${pendingEncashmentCount} encashment`,
      ]
        .filter(Boolean)
        .join(' · ') || 'No pending approvals';

  const pageTitle = selfService ? 'My Leaves' : 'Leave Management';

  const openApplyModal = () => {
    setForm(emptyApplyForm);
    setAttachmentFile(null);
    setApplyError('');
    setShowApply(true);
  };

  const datesValid = form.from_date && form.to_date && form.from_date <= form.to_date;

  const previewBlocksSubmit =
    canPreviewDays &&
    !previewLoading &&
    !previewError &&
    dayPreview &&
    parseFloat(dayPreview.totalDays) <= 0;

  const previewPending = canPreviewDays && previewLoading;

  const canSubmitApply =
    eligibleTypes.length > 0 &&
    form.leave_type_id &&
    datesValid &&
    form.reason.trim() &&
    !previewPending &&
    !previewBlocksSubmit &&
    (!attachmentRequired || attachmentFile);

  const submitDisabledReason = (() => {
    if (eligibleLoading && eligibleTypes.length === 0) return 'Loading leave types…';
    if (eligibleTypes.length === 0) return 'No leave policy assigned — contact HR.';
    if (!form.leave_type_id) return 'Select a leave type.';
    if (!form.from_date || !form.to_date) return 'Select from and to dates.';
    if (form.from_date > form.to_date) return 'End date must be on or after start date.';
    if (!form.reason.trim()) return 'Enter a reason for leave.';
    if (previewPending) return 'Calculating working days…';
    if (previewBlocksSubmit) return 'No working days in selected range — adjust dates.';
    if (attachmentRequired && !attachmentFile) return 'Attach a supporting document to continue.';
    return '';
  })();

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleFromDateChange = (from_date) => {
    setForm((prev) => ({
      ...prev,
      from_date,
      to_date: prev.is_half_day ? from_date : prev.to_date || from_date,
    }));
  };

  const handleHalfDayChange = (is_half_day) => {
    setForm((prev) => ({
      ...prev,
      is_half_day,
      to_date: is_half_day && prev.from_date ? prev.from_date : prev.to_date,
    }));
  };

  const formatDayCount = (days) => {
    const n = parseFloat(days);
    if (Number.isNaN(n)) return '—';
    return n === 1 ? '1 day' : `${n} days`;
  };

  const previewExcluded =
    dayPreview?.breakdown?.filter((d) => d.counted === 0) ?? [];
  const previewWeekends = previewExcluded.filter((d) => d.type === 'weekend').length;
  const previewHolidays = previewExcluded.filter((d) => d.type === 'holiday').length;

  const canCancelRequest = (req) => {
    if (!CANCELLABLE_STATUSES.has(req.status)) return false;
    if (selfService) return true;
    if (isManager) return true;
    return req.employee_id === user?.id;
  };

  const canApproveReject = (req) => isManager && req.status === 'pending';

  const showActionsColumn =
    isManager || requests.some((req) => canCancelRequest(req));

  const handleCancelRequest = (req) => {
    const message =
      req.status === 'approved'
        ? 'Cancel this approved leave? Your balance will be restored and synced attendance will be reverted.'
        : 'Cancel this pending leave request?';
    if (!window.confirm(message)) return;
    cancelMutation.mutate({ id: req.id });
  };

  const openRejectModal = (req) => {
    setRejectTarget(req);
    setRejectNote('');
    setRejectError('');
  };

  const closeRejectModal = () => {
    if (rejectMutation.isPending) return;
    setRejectTarget(null);
    setRejectNote('');
    setRejectError('');
  };

  const balancesEmptyMessage = selfService
    ? 'No leave balances assigned yet. Contact HR if you expect leave to be allocated.'
    : 'No leave balances yet. Assign a leave policy in Leave Settings or ask HR to set one up.';

  const getRequestsEmptyMessage = () => {
    if (tab === 'pending') {
      if (requests.length === 0) {
        return selfService || effectiveScope === 'my'
          ? 'No leave requests yet. Use Apply Leave to submit your first request.'
          : effectiveScope === 'team'
            ? 'No team leave requests yet.'
            : 'No leave requests in the organization yet.';
      }
      return 'No pending requests in this view — everything here is already decided.';
    }
    if (selfService || effectiveScope === 'my') {
      return 'No leave requests yet. Use Apply Leave to submit your first request.';
    }
    if (effectiveScope === 'team') {
      return 'No leave requests from your direct reports yet.';
    }
    return 'No leave requests in the organization yet.';
  };

  const requestsErrorMessage =
    requestsQueryError?.response?.data?.error?.message || 'Could not load leave requests.';

  const balancesErrorMessage =
    balancesQueryError?.response?.data?.error?.message || 'Could not load leave balances.';

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={
          <div className="flex gap-2">
            {isAdmin && (
              <Link to="/leaves/settings" className="btn-secondary text-xs">
                <Settings2 size={14} /> Leave Settings
              </Link>
            )}
            {selfService && user?.role === 'manager' && (
              <Link to="/leaves" className="btn-secondary text-xs">
                Team approvals →
              </Link>
            )}
            {pageSection === 'leave' && (
              <button type="button" onClick={openApplyModal} className="btn-primary">
                <Plus size={14} /> Apply Leave
              </button>
            )}
          </div>
        }
      />

      <div className="flex gap-1 border-b border-slate-200 scroll-tabs">
        {[
          { id: 'leave', label: 'Leave Requests' },
          { id: 'comp-off', label: 'Comp-off' },
          { id: 'encashment', label: 'Encashment' },
        ].map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setPageSection(section.id)}
            className={cn(
              'px-4 py-2.5 text-xs font-medium border-b-2 -mb-px',
              pageSection === section.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            )}
          >
            {section.label}
          </button>
        ))}
      </div>

      {pageSection === 'comp-off' ? (
        <CompOffPanel canApprove={isManager} />
      ) : pageSection === 'encashment' ? (
        <LeaveEncashmentPanel canApprove={isManager} />
      ) : (
        <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {balancesLoading ? (
          <div className="col-span-full stat-card py-8 text-center">
            <p className="text-sm text-slate-400">Loading leave balances…</p>
          </div>
        ) : balancesError ? (
          <div className="col-span-full stat-card py-8 text-center space-y-3">
            <p className="text-sm text-red-600">{balancesErrorMessage}</p>
            <button type="button" onClick={() => refetchBalances()} className="btn-secondary text-xs">
              Retry
            </button>
          </div>
        ) : balances.length === 0 ? (
          <div className="col-span-full stat-card py-8 text-center">
            <p className="text-sm font-medium text-slate-600">No balances to show</p>
            <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">{balancesEmptyMessage}</p>
          </div>
        ) : (
          balances.map((b) => (
            <button
              key={b.leave_type}
              type="button"
              onClick={() =>
                setBalanceBreakdown({
                  employeeId: user.id,
                  leaveTypeId: b.leave_type_id,
                  leaveTypeLabel: b.leave_type,
                  year: balanceYear,
                })
              }
              className="stat-card py-4 text-left w-full hover:ring-2 hover:ring-brand-200 transition-shadow cursor-pointer"
              title="View balance breakdown"
            >
              <p className="text-xs text-slate-500 font-medium">
                {b.leaveType?.name || b.leave_type}
                {b.leaveType?.code && b.leaveType?.name ? (
                  <span className="text-slate-400 font-normal"> ({b.leaveType.code})</span>
                ) : null}
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatLeaveDays(b.available ?? 0)}</p>
              <p className="text-[10px] text-slate-400 mt-1">{leaveBalanceSubtitle(b)}</p>
            </button>
          ))
        )}
      </div>

      <div className="card">
        {isManagerRole && (
          <div className="px-4 border-b border-slate-200 flex gap-4">
            {[
              { id: 'my', label: 'My Requests' },
              { id: 'team', label: 'Team Requests' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScope(s.id)}
                className={cn(
                  'py-3 text-xs font-medium border-b-2 -mb-px',
                  scope === s.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        <div className="px-4 border-b border-slate-200 flex gap-4">
          {['requests', 'pending'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'py-3 text-xs font-medium border-b-2 -mb-px capitalize',
                tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400'
              )}
            >
              {t === 'pending' ? `Pending (${pending.length})` : selfService ? 'My Requests' : 'All Requests'}
            </button>
          ))}
        </div>

        {requestsLoading ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-400">Loading leave requests…</p>
          </div>
        ) : requestsError ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700">Couldn&apos;t load requests</p>
            <p className="text-sm text-red-600">{requestsErrorMessage}</p>
            <button type="button" onClick={() => refetchRequests()} className="btn-secondary text-xs">
              Retry
            </button>
          </div>
        ) : displayedRequests.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-medium text-slate-600">
              {tab === 'pending' ? 'No pending requests' : 'No requests yet'}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">{getRequestsEmptyMessage()}</p>
            {(selfService || effectiveScope === 'my') && tab === 'requests' && (
              <button type="button" onClick={openApplyModal} className="btn-primary text-xs mt-2">
                <Plus size={14} className="inline mr-1" />
                Apply Leave
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  {showEmployeeColumn && (
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Employee</th>
                  )}
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Type</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Dates</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Days</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Reason</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Status</th>
                  {showActionsColumn && (
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setDetailRequestId(req.id)}
                  >
                    {showEmployeeColumn && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={`${req.employee?.first_name} ${req.employee?.last_name}`}
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
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700">{req.leave_type}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {format(parseISO(req.from_date), 'dd MMM')}
                      {req.from_date !== req.to_date && ` – ${format(parseISO(req.to_date), 'dd MMM')}`}
                    </td>
                    <td className="px-4 py-3 text-xs">{req.days}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">{req.reason}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize', LEAVE_STATUS[req.status])}>
                          {req.status}
                        </span>
                        {req.status === 'rejected' && req.rejection_note && (
                          <p
                            className="text-[10px] text-red-600 max-w-[180px] line-clamp-2"
                            title={req.rejection_note}
                          >
                            {req.rejection_note}
                          </p>
                        )}
                      </div>
                    </td>
                    {showActionsColumn && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {canApproveReject(req) && (
                            <>
                              <button
                                type="button"
                                onClick={() => approveMutation.mutate(req.id)}
                                title="Approve"
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => openRejectModal(req)}
                                title="Reject"
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                              >
                                <X size={14} />
                              </button>
                            </>
                          )}
                          {canCancelRequest(req) && (
                            <button
                              type="button"
                              onClick={() => handleCancelRequest(req)}
                              disabled={cancelMutation.isPending}
                              title="Cancel request"
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                            >
                              <Ban size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <TablePagination
          page={requestPagination.page}
          limit={requestPagination.limit}
          total={requestPagination.total}
          totalPages={requestPagination.totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      </div>
        </>
      )}

      {showApply && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold">Apply for Leave</h3>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setApplyError('');
                applyMutation.mutate({
                  payload: {
                    leave_type_id: parseInt(form.leave_type_id, 10),
                    from_date: form.from_date,
                    to_date: form.to_date,
                    is_half_day: form.is_half_day,
                    reason: form.reason.trim(),
                  },
                  file: attachmentFile,
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-slate-600">Leave Type</label>
                {eligibleLoading ? (
                  <p className="mt-2 text-sm text-slate-400">Loading eligible leave types…</p>
                ) : eligibleError ? (
                  <p className="mt-2 text-sm text-red-500">Could not load leave types. Try again.</p>
                ) : eligibleTypes.length === 0 ? (
                  <p className="mt-2 text-sm text-amber-600">
                    No leave policy assigned — contact HR.
                  </p>
                ) : (
                  <select
                    required
                    value={form.leave_type_id}
                    onChange={(e) => {
                      updateForm({ leave_type_id: e.target.value });
                      setAttachmentFile(null);
                    }}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    {eligibleTypes.map((entry) => (
                      <option key={entry.leaveType.id} value={entry.leaveType.id}>
                        {entry.leaveType.name} ({entry.leaveType.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">From</label>
                  <input
                    type="date"
                    required
                    value={form.from_date}
                    onChange={(e) => handleFromDateChange(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">To</label>
                  <input
                    type="date"
                    required
                    value={form.to_date}
                    onChange={(e) => updateForm({ to_date: e.target.value })}
                    disabled={form.is_half_day}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={form.is_half_day}
                  onChange={(e) => handleHalfDayChange(e.target.checked)}
                />
                Half day
              </label>
              {form.from_date && form.to_date && form.from_date > form.to_date && (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  End date must be on or after the start date.
                </p>
              )}
              {canPreviewDays && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 space-y-1">
                  {previewLoading ? (
                    <p className="text-sm text-slate-500">Calculating working days…</p>
                  ) : previewError ? (
                    <p className="text-sm text-red-600">Could not calculate leave days. Check dates and try again.</p>
                  ) : dayPreview ? (
                    <>
                      <p className="text-sm font-medium text-slate-800">
                        {formatDayCount(dayPreview.totalDays)} will be deducted
                        {dayPreview.sandwichRuleEnabled ? ' (sandwich rule applies)' : ''}
                      </p>
                      {(previewWeekends > 0 || previewHolidays > 0) && !dayPreview.sandwichRuleEnabled && (
                        <p className="text-xs text-slate-500">
                          Excluded from count:
                          {previewWeekends > 0 && ` ${previewWeekends} weekend day${previewWeekends === 1 ? '' : 's'}`}
                          {previewWeekends > 0 && previewHolidays > 0 && ','}
                          {previewHolidays > 0 && ` ${previewHolidays} holiday${previewHolidays === 1 ? '' : 's'}`}
                        </p>
                      )}
                      {dayPreview.totalDays === 0 && (
                        <p className="text-xs text-amber-700">
                          No working days in this range — adjust your dates before submitting.
                        </p>
                      )}
                    </>
                  ) : null}
                </div>
              )}
              {attachmentRequired && (
                <div className="space-y-1">
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    Medical certificate or supporting document required for leave exceeding{' '}
                    {attachmentThreshold} day{attachmentThreshold === 1 ? '' : 's'}.
                  </p>
                  <DocumentDropzone
                    label="Supporting document"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,image/*,application/pdf"
                    file={attachmentFile}
                    onFile={setAttachmentFile}
                    onClear={() => setAttachmentFile(null)}
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-600">Reason</label>
                <textarea
                  required
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              {applyError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {applyError}
                </p>
              )}
              {submitDisabledReason && !applyMutation.isPending && (
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  {submitDisabledReason}
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setShowApply(false); setAttachmentFile(null); }} className="btn-secondary">Cancel</button>
                <button
                  type="submit"
                  disabled={applyMutation.isPending || !canSubmitApply}
                  className="btn-primary"
                  title={submitDisabledReason || undefined}
                >
                  {applyMutation.isPending ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold">Reject Leave Request</h3>
              <p className="text-xs text-slate-500 mt-1">
                {rejectTarget.employee?.emp_code && (
                  <span className="font-mono">{rejectTarget.employee.emp_code} · </span>
                )}
                {rejectTarget.employee?.first_name} {rejectTarget.employee?.last_name} ·{' '}
                {rejectTarget.leave_type} · {rejectTarget.days} day(s)
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setRejectError('');
                rejectMutation.mutate({
                  id: rejectTarget.id,
                  rejection_note: rejectNote.trim(),
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Rejection note <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Explain why this leave request is being rejected…"
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  The employee will see this note on their request.
                </p>
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
                  disabled={rejectMutation.isPending || !rejectNote.trim()}
                  className="btn-primary bg-red-600 hover:bg-red-700 border-red-600"
                >
                  {rejectMutation.isPending ? 'Rejecting…' : 'Reject request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <LeaveRequestDetailDrawer
        requestId={detailRequestId}
        onClose={() => setDetailRequestId(null)}
      />

      <LeaveBalanceBreakdownDrawer
        employeeId={balanceBreakdown?.employeeId}
        leaveTypeId={balanceBreakdown?.leaveTypeId}
        leaveTypeLabel={balanceBreakdown?.leaveTypeLabel}
        year={balanceBreakdown?.year}
        onClose={() => setBalanceBreakdown(null)}
      />
    </div>
  );
}
