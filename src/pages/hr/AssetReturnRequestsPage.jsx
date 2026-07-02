import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Check, Laptop, RotateCcw, X } from 'lucide-react';
import { hrApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { Avatar } from '../../components/shared/StatusBadge';
import { ASSET_RETURN_STATUS } from '../../constants/hr';
import { cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { useTablePagination } from '../../hooks/useTablePagination';

function assetCategoryLabel(asset) {
  if (!asset) return '—';
  if (typeof asset.category === 'string') return asset.category;
  return asset.category_name || asset.category?.name || asset.category_info?.name || '—';
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
}

export default function AssetReturnRequestsPage() {
  const queryClient = useQueryClient();
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectError, setRejectError] = useState('');
  const { setPage, setLimit, paginateClient } = useTablePagination();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['asset-return-requests', selectedTenantId],
    queryFn: hrApi.listAssetReturnRequests,
    enabled: !tenantRequired,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['asset-return-requests'] });
    queryClient.invalidateQueries({ queryKey: ['asset-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['assets'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id) => hrApi.approveAssetReturnRequest(id),
    onSuccess: invalidate,
    onError: (err) => {
      window.alert(err.response?.data?.error?.message || 'Failed to approve return request');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, rejection_note }) =>
      hrApi.rejectAssetReturnRequest(id, rejection_note ? { rejection_note } : {}),
    onSuccess: () => {
      invalidate();
      closeRejectModal();
    },
    onError: (err) => {
      setRejectError(err.response?.data?.error?.message || 'Failed to reject return request');
    },
  });

  const requests = data?.data?.requests || [];
  const { items: visibleRequests, pagination } = paginateClient(requests);
  const actionPending = approveMutation.isPending || rejectMutation.isPending;

  const closeRejectModal = () => {
    if (rejectMutation.isPending) return;
    setRejectTarget(null);
    setRejectNote('');
    setRejectError('');
  };

  const handleApprove = (req) => {
    const assetName = req.asset?.name || 'this asset';
    const employeeName = req.employee
      ? `${req.employee.first_name} ${req.employee.last_name}`
      : 'the employee';
    if (
      !window.confirm(
        `Approve return of "${assetName}" from ${employeeName}? The asset will be marked available.`
      )
    ) {
      return;
    }
    approveMutation.mutate(req.id);
  };

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to review asset return requests.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Return Requests"
        subtitle="Review employee return requests and release assets back to inventory"
        actions={
          <Link to="/assets" className="btn-secondary text-xs">
            <Laptop size={14} /> Asset Registry
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Pending Returns"
          value={requests.length}
          icon={RotateCcw}
          delta={requests.length > 0 ? 'Awaiting your action' : 'Queue is clear'}
          deltaType={requests.length > 0 ? 'up' : 'neutral'}
        />
      </div>

      <div className="card overflow-x-auto overscroll-x-contain">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Pending approval queue</h3>
          <span className="text-xs text-slate-500">{requests.length} request(s)</span>
        </div>

        {isLoading ? (
          <p className="text-center py-12 text-slate-400">Loading return requests…</p>
        ) : error ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-red-500">Failed to load return requests</p>
            <button type="button" onClick={() => refetch()} className="btn-secondary text-xs">
              Retry
            </button>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <RotateCcw size={28} className="mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No pending return requests</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When employees submit return requests from My Assets, they will appear here for approval.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Employee</th>
                  <th className="text-left px-4 py-3 font-semibold">Asset</th>
                  <th className="text-left px-4 py-3 font-semibold">Category</th>
                  <th className="text-left px-4 py-3 font-semibold">Assigned</th>
                  <th className="text-left px-4 py-3 font-semibold">Requested</th>
                  <th className="text-left px-4 py-3 font-semibold">Reason</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={`${req.employee?.first_name || ''} ${req.employee?.last_name || ''}`}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium text-slate-900">
                            {req.employee?.first_name} {req.employee?.last_name}
                          </p>
                          <p className="text-slate-400 font-mono">{req.employee?.emp_code || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{req.asset?.name || '—'}</p>
                      <p className="text-slate-400 font-mono">{req.asset?.asset_code || '—'}</p>
                      {req.asset?.serial_number && (
                        <p className="text-slate-400 font-mono mt-0.5">SN: {req.asset.serial_number}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize">{assetCategoryLabel(req.asset)}</td>
                    <td className="px-4 py-3">{formatDate(req.assignment?.assigned_date)}</td>
                    <td className="px-4 py-3">{formatDate(req.requested_at)}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[220px]">
                      <p className="line-clamp-3">{req.reason || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
                          ASSET_RETURN_STATUS[req.status] || ASSET_RETURN_STATUS.pending
                        )}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={actionPending}
                          onClick={() => handleApprove(req)}
                          className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          title="Approve return"
                        >
                          <Check size={12} /> Approve
                        </button>
                        <button
                          type="button"
                          disabled={actionPending}
                          onClick={() => {
                            setRejectTarget(req);
                            setRejectNote('');
                            setRejectError('');
                          }}
                          className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          title="Reject return"
                        >
                          <X size={12} /> Reject
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
      {!isLoading && requests.length > 0 && (
        <TablePagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}

      {rejectTarget && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold">Reject Return Request</h3>
              <p className="text-xs text-slate-500 mt-1">
                {rejectTarget.employee?.first_name} {rejectTarget.employee?.last_name} ·{' '}
                {rejectTarget.asset?.name}
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setRejectError('');
                rejectMutation.mutate({
                  id: rejectTarget.id,
                  rejection_note: rejectNote.trim() || undefined,
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-slate-600">Rejection note (optional)</label>
                <textarea
                  rows={3}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Explain why this return request is being rejected…"
                  maxLength={500}
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
