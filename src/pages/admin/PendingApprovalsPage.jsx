import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Check, X } from 'lucide-react';
import { billingApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import StatusBadge from '../../components/shared/StatusBadge';
import { useTablePagination, normalizePagination } from '../../hooks/useTablePagination';
import { cn } from '../../utils/helpers';
import { usePortalRole } from '../../hooks/usePortalRole';

const STATUS_TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: '', label: 'All' },
];

const TYPE_LABELS = {
  upgrade: 'Upgrade Request',
  renewal: 'Renewal Request',
  employee_limit_increase: 'Employee Limit Increase',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RequestDetail({ row }) {
  if (row.request_type === 'upgrade') {
    return (
      <span className="text-slate-600">
        {row.currentPlan?.name || 'No plan'} → <strong>{row.requestedPlan?.name || '—'}</strong>
      </span>
    );
  }
  if (row.request_type === 'renewal') {
    return (
      <span className="text-slate-600">
        Extend by <strong>{row.extend_days || 365}</strong> days
        {row.currentPlan?.name ? ` · ${row.currentPlan.name}` : ''}
      </span>
    );
  }
  if (row.request_type === 'employee_limit_increase') {
    return (
      <span className="text-slate-600">
        {row.current_employee_limit ?? '—'} → <strong>{row.requested_employee_limit ?? '—'}</strong> employees
      </span>
    );
  }
  return '—';
}

function ReviewModal({ request, action, onClose, onConfirm, isPending }) {
  const [adminNotes, setAdminNotes] = useState('');

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">
            {action === 'approve' ? 'Approve' : 'Reject'} Request
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {TYPE_LABELS[request.request_type]} · {request.tenant?.name}
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
            <RequestDetail row={request} />
            {request.notes && <p className="mt-2 text-slate-500">Note: {request.notes}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Admin notes (optional)</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
              placeholder={action === 'reject' ? 'Reason for rejection…' : 'Internal notes…'}
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => onConfirm(adminNotes)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50',
              action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            )}
          >
            {isPending ? 'Processing…' : action === 'approve' ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PendingApprovalsPage() {
  const role = usePortalRole();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewModal, setReviewModal] = useState(null);
  const [actionError, setActionError] = useState('');
  const { page, limit, setPage, setLimit, queryParams } = useTablePagination({
    resetDeps: [search, statusFilter],
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['subscription-requests', queryParams, search, statusFilter],
    queryFn: () =>
      billingApi.listSubscriptionRequests({
        ...queryParams,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
  });

  const rows = data?.data?.requests || [];
  const pagination = normalizePagination(data?.pagination, limit);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['subscription-requests'] });
    queryClient.invalidateQueries({ queryKey: ['subscription-requests-pending-count'] });
    queryClient.invalidateQueries({ queryKey: ['tenant-subscriptions'] });
    queryClient.invalidateQueries({ queryKey: ['tenants'] });
  };

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, admin_notes }) =>
      action === 'approve'
        ? billingApi.approveSubscriptionRequest(id, { admin_notes })
        : billingApi.rejectSubscriptionRequest(id, { admin_notes }),
    onSuccess: () => {
      setReviewModal(null);
      setActionError('');
      invalidate();
    },
    onError: (err) => {
      setActionError(err?.response?.data?.error?.message || 'Action failed');
    },
  });

  if (role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        badge="Admin · Approvals"
        title="Pending Approvals"
        subtitle="Review and action subscription upgrade, renewal, and employee limit requests"
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="ds-toolbar border-b border-slate-100">
          <div className="toolbar-row w-full">
          <div className="ds-tabs scroll-tabs" role="tablist">
            {STATUS_TABS.map((tabItem) => (
              <button
                key={tabItem.id || 'all'}
                type="button"
                role="tab"
                aria-selected={statusFilter === tabItem.id}
                onClick={() => setStatusFilter(tabItem.id)}
                className={cn(statusFilter === tabItem.id && 'ds-tab-active')}
              >
                {tabItem.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-xs ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tenant…"
              className="ds-input pl-8 w-full text-xs"
            />
          </div>
          </div>
        </div>

        {actionError && (
          <div className="mx-4 mt-3 px-3 py-2 bg-red-50 text-red-700 text-xs rounded-lg">{actionError}</div>
        )}

        {isLoading ? (
          <p className="p-12 text-center text-slate-400 text-sm">Loading requests…</p>
        ) : isError ? (
          <p className="p-12 text-center text-red-500 text-sm">
            {error?.response?.data?.error?.message || 'Failed to load requests'}
          </p>
        ) : rows.length === 0 ? (
          <p className="p-12 text-center text-slate-400 text-sm">
            {statusFilter === 'pending' ? 'No pending approvals' : 'No requests found'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-2.5 font-semibold">Tenant</th>
                  <th className="px-4 py-2.5 font-semibold">Request</th>
                  <th className="px-4 py-2.5 font-semibold">Details</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Submitted</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{row.tenant?.name || '—'}</div>
                      <div className="text-slate-400">{row.tenant?.company_code}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {TYPE_LABELS[row.request_type] || row.request_type_label}
                    </td>
                    <td className="px-4 py-3">
                      <RequestDetail row={row} />
                      {row.notes && (
                        <p className="text-slate-400 mt-0.5 truncate max-w-[240px]" title={row.notes}>
                          {row.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={row.status}
                        className={
                          row.status === 'pending'
                            ? 'bg-amber-50 text-amber-700'
                            : row.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-700'
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {row.status === 'pending' ? (
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            title="Approve"
                            onClick={() => setReviewModal({ request: row, action: 'approve' })}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Reject"
                            onClick={() => setReviewModal({ request: row, action: 'reject' })}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">
                          {row.reviewer?.name ? `By ${row.reviewer.name}` : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <TablePagination
          page={page}
          limit={limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      </div>

      <ReviewModal
        request={reviewModal?.request}
        action={reviewModal?.action}
        onClose={() => {
          setReviewModal(null);
          setActionError('');
        }}
        onConfirm={(admin_notes) =>
          reviewMutation.mutate({
            id: reviewModal.request.id,
            action: reviewModal.action,
            admin_notes,
          })
        }
        isPending={reviewMutation.isPending}
      />
    </div>
  );
}
