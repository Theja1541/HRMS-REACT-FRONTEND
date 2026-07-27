import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Check, Eye, Laptop, RotateCcw, Upload, X } from 'lucide-react';
import { hrApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { Avatar } from '../../components/shared/StatusBadge';
import {
  ASSET_ACCESSORY_CONDITION_LABELS,
  ASSET_DAMAGE_SEVERITY_LABELS,
  ASSET_RETURN_CONDITION_LABELS,
  ASSET_RETURN_CONDITIONS,
  ASSET_RETURN_STATUS,
  ASSET_RETURN_STATUS_LABELS,
} from '../../constants/hr';
import { cn, formatINR } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';
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

function VerifyDrawer({ request, onClose, onSuccess }) {
  const purchaseValue = Number(request.asset?.purchase_value || 0);
  const seedChecklist = useMemo(() => {
    const existing = request.accessories_checklist;
    if (Array.isArray(existing) && existing.length) {
      return existing.map((item) => ({
        key: item.key,
        label: item.label,
        returned: Boolean(item.returned),
        applicable: item.applicable !== false,
        condition: item.condition || (item.returned ? 'good' : 'missing'),
        recovery_amount: Number(item.recovery_amount || 0),
        notes: item.notes || '',
      }));
    }
    return [];
  }, [request]);

  const [condition, setCondition] = useState(request.condition || 'good');
  const [severity, setSeverity] = useState(
    request.damage_severity || (request.condition === 'lost' ? 'total' : request.condition === 'damaged' ? 'moderate' : 'none')
  );
  const [checklist, setChecklist] = useState(seedChecklist);
  const [remarks, setRemarks] = useState('');
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [recovery, setRecovery] = useState('');
  const [applyFnf, setApplyFnf] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [autoRecovery, setAutoRecovery] = useState(true);

  useEffect(() => {
    setChecklist(seedChecklist);
    setCondition(request.condition || 'good');
  }, [request, seedChecklist]);

  const accessoryRecovery = useMemo(
    () =>
      checklist
        .filter((i) => i.applicable !== false)
        .reduce((sum, i) => sum + Number(i.recovery_amount || 0), 0),
    [checklist]
  );

  useEffect(() => {
    if (!autoRecovery) return;
    if (condition === 'good') {
      setRecovery(String(accessoryRecovery || 0));
      setSeverity('none');
      return;
    }
    const mult = { none: 0, minor: 0.15, moderate: 0.35, major: 0.6, total: 1 }[severity] ?? 0.35;
    const assetPart = condition === 'lost' ? purchaseValue : purchaseValue * mult;
    setRecovery(String(Math.round((assetPart + accessoryRecovery) * 100) / 100));
  }, [condition, severity, purchaseValue, accessoryRecovery, autoRecovery]);

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('verified_condition', condition);
      fd.append('damage_severity', severity);
      if (remarks.trim()) fd.append('verifier_remarks', remarks.trim());
      if (assessmentNotes.trim()) fd.append('damage_assessment_notes', assessmentNotes.trim());
      fd.append('damage_recovery_amount', recovery === '' ? '0' : String(recovery));
      fd.append('apply_to_fnf', applyFnf ? 'true' : 'false');
      if (checklist.length) fd.append('accessories_checklist', JSON.stringify(checklist));
      photos.forEach((file) => fd.append('photos', file));
      return hrApi.completeAssetReturnRequest(request.id, fd);
    },
    onSuccess: (data) => onSuccess(data),
    onError: (err) => {
      setError(err.response?.data?.error?.message || 'Failed to verify return');
    },
  });

  const missingAccessories = checklist.filter((i) => i.applicable !== false && !i.returned);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white w-full max-w-xl h-full shadow-xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b flex items-start justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Verify &amp; Complete Return</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {request.employee?.first_name} {request.employee?.last_name} · {request.asset?.name}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] uppercase text-slate-400">Asset</p>
              <p className="font-medium mt-1">{request.asset?.name}</p>
              <p className="font-mono text-slate-400">{request.asset?.asset_code}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] uppercase text-slate-400">Purchase value</p>
              <p className="font-medium mt-1">{formatINR(purchaseValue)}</p>
              <p className="text-slate-400 mt-0.5">
                Employee reported: {ASSET_RETURN_CONDITION_LABELS[request.condition] || '—'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase text-slate-400 mb-1">Employee reason</p>
            <p className="text-slate-700 bg-slate-50 rounded-lg p-3">{request.reason || '—'}</p>
            {request.employee_remarks && (
              <p className="text-slate-600 mt-2 bg-amber-50 rounded-lg p-3">Remarks: {request.employee_remarks}</p>
            )}
          </div>

          {request.photos?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-slate-400 mb-2">Photos</p>
              <div className="flex flex-wrap gap-2">
                {request.photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={photo.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
                  >
                    <img src={photo.file_url} alt={photo.file_name} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="font-medium text-slate-700">Verified condition</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {Object.entries(ASSET_RETURN_CONDITION_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCondition(key)}
                  className={cn(
                    'font-semibold px-3 py-1.5 rounded-lg border',
                    condition === key
                      ? ASSET_RETURN_CONDITIONS[key] + ' border-current'
                      : 'bg-white text-slate-600 border-slate-200'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {condition === 'damaged' && (
            <div>
              <label className="font-medium text-slate-700">Damage severity</label>
              <select
                className="input mt-1 text-xs"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                {Object.entries(ASSET_DAMAGE_SEVERITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}

          {checklist.length > 0 && (
            <div>
              <label className="font-medium text-slate-700">Accessory-level verification</label>
              <ul className="mt-1.5 border border-slate-100 rounded-lg divide-y">
                {checklist.map((item, idx) => (
                  <li key={item.key} className="px-3 py-2 space-y-1.5">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.returned}
                          onChange={(e) => {
                            const next = [...checklist];
                            const returned = e.target.checked;
                            next[idx] = {
                              ...item,
                              returned,
                              condition: returned ? 'good' : 'missing',
                              recovery_amount: returned ? 0 : item.recovery_amount || 0,
                            };
                            setChecklist(next);
                          }}
                        />
                        <span>{item.label}</span>
                      </label>
                      <select
                        className="text-[10px] border border-slate-200 rounded px-1.5 py-1"
                        value={item.condition || 'missing'}
                        onChange={(e) => {
                          const next = [...checklist];
                          const cond = e.target.value;
                          next[idx] = {
                            ...item,
                            condition: cond,
                            returned: cond === 'good',
                          };
                          setChecklist(next);
                        }}
                      >
                        {Object.entries(ASSET_ACCESSORY_CONDITION_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-20 text-[10px] border border-slate-200 rounded px-1.5 py-1"
                        placeholder="₹"
                        value={item.recovery_amount || ''}
                        onChange={(e) => {
                          const next = [...checklist];
                          next[idx] = { ...item, recovery_amount: Number(e.target.value || 0) };
                          setChecklist(next);
                        }}
                      />
                    </div>
                    <input
                      className="w-full text-[10px] border border-slate-100 rounded px-2 py-1"
                      placeholder="Accessory notes"
                      value={item.notes || ''}
                      onChange={(e) => {
                        const next = [...checklist];
                        next[idx] = { ...item, notes: e.target.value };
                        setChecklist(next);
                      }}
                    />
                  </li>
                ))}
              </ul>
              {missingAccessories.length > 0 && (
                <p className="text-amber-700 mt-1.5">
                  {missingAccessories.length} accessory item(s) not returned · accessory recovery{' '}
                  {formatINR(accessoryRecovery)}
                </p>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-2">
              <label className="font-medium text-slate-700">Total damage / loss recovery (₹)</label>
              <label className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <input type="checkbox" checked={autoRecovery} onChange={(e) => setAutoRecovery(e.target.checked)} />
                Auto-calculate
              </label>
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={recovery}
              onChange={(e) => {
                setAutoRecovery(false);
                setRecovery(e.target.value);
              }}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg"
              placeholder="0.00"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Includes asset condition recovery + accessory recoveries. Applied to open F&amp;F automatically.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={applyFnf} onChange={(e) => setApplyFnf(e.target.checked)} />
            <span className="text-slate-700">Automatically add recovery to F&amp;F settlement</span>
          </label>

          <div>
            <label className="font-medium text-slate-700">Damage assessment notes</label>
            <textarea
              rows={2}
              value={assessmentNotes}
              onChange={(e) => setAssessmentNotes(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg"
              placeholder="Repair estimate, missing parts, charge basis…"
            />
          </div>

          <div>
            <label className="font-medium text-slate-700">Verifier remarks</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg"
              placeholder="Inspection notes…"
            />
          </div>

          <div>
            <label className="btn-secondary text-xs inline-flex cursor-pointer">
              <Upload size={12} /> Add verification photos
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setPhotos((prev) => [...prev, ...files].slice(0, 8));
                  e.target.value = '';
                }}
              />
            </label>
            {photos.length > 0 && (
              <p className="text-[10px] text-slate-400 mt-1">{photos.length} file(s) selected</p>
            )}
          </div>

          {error && (
            <p className="text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="px-5 py-4 border-t flex justify-end gap-2 shrink-0">
          <button type="button" className="btn-secondary text-xs" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary text-xs"
            disabled={mutation.isPending}
            onClick={() => {
              setError('');
              mutation.mutate();
            }}
          >
            <Check size={12} />
            {mutation.isPending ? 'Processing…' : 'Verify & Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssetReturnRequestsPage() {
  const queryClient = useQueryClient();
  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const { setPage, setLimit, paginateClient } = useTablePagination({
    resetDeps: [statusFilter, selectedTenantId],
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['asset-return-requests', selectedTenantId, statusFilter],
    queryFn: () => hrApi.listAssetReturnRequests({ status: statusFilter }),
    enabled: !tenantRequired,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['asset-return-requests'] });
    queryClient.invalidateQueries({ queryKey: ['asset-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    queryClient.invalidateQueries({ queryKey: ['fnf-settlements'] });
  };

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

  const softApproveMutation = useMutation({
    mutationFn: (id) => hrApi.softApproveAssetReturnRequest(id, {}),
    onSuccess: () => invalidate(),
  });

  const requests = data?.data?.requests || [];
  const { items: visibleRequests, pagination } = paginateClient(requests);

  const closeRejectModal = () => {
    if (rejectMutation.isPending) return;
    setRejectTarget(null);
    setRejectNote('');
    setRejectError('');
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
        badge="Assets · Returns"
        title="Asset Return Requests"
        subtitle="Verify condition, accessories, photos, and apply damage recovery to F&F"
        actions={
          <Link to="/assets" className="btn-secondary text-xs">
            <Laptop size={14} /> Asset Registry
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="In queue"
          value={requests.length}
          icon={RotateCcw}
          delta={statusFilter === 'pending' ? 'Awaiting verification' : `Status: ${statusFilter}`}
          deltaType={requests.length > 0 ? 'up' : 'neutral'}
        />
      </div>

      <div className="ds-tabs scroll-tabs flex-wrap" role="tablist">
        {['pending', 'approved', 'completed', 'rejected', 'all'].map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={statusFilter === s}
            onClick={() => setStatusFilter(s)}
            className={cn(statusFilter === s && 'ds-tab-active', 'capitalize')}
          >
            {ASSET_RETURN_STATUS_LABELS[s] || s}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto overscroll-x-contain">
        <div className="ds-toolbar flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Return verification queue</h3>
          <span className="text-xs text-slate-500">{requests.length} request(s)</span>
        </div>

        {isLoading ? (
          <p className="text-center py-16 text-slate-400 text-sm">Loading return requests…</p>
        ) : error ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-red-500 text-sm">Failed to load return requests</p>
            <button type="button" onClick={() => refetch()} className="btn-secondary text-xs">
              Retry
            </button>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <RotateCcw size={28} className="mx-auto text-slate-200" />
            <p className="text-slate-400 text-sm">No return requests</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Employee return requests with checklist, condition, and photos appear here for verification.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Employee</th>
                  <th className="text-left px-4 py-3 font-semibold">Asset</th>
                  <th className="text-left px-4 py-3 font-semibold">Condition</th>
                  <th className="text-left px-4 py-3 font-semibold">Requested</th>
                  <th className="text-left px-4 py-3 font-semibold">Recovery</th>
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
                      <p className="text-slate-400 capitalize">{assetCategoryLabel(req.asset)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          ASSET_RETURN_CONDITIONS[req.verified_condition || req.condition] ||
                            'bg-slate-100 text-slate-600'
                        )}
                      >
                        {ASSET_RETURN_CONDITION_LABELS[req.verified_condition || req.condition] || '—'}
                      </span>
                      {req.photos?.length > 0 && (
                        <p className="text-[10px] text-slate-400 mt-1">{req.photos.length} photo(s)</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatDate(req.requested_at)}</td>
                    <td className="px-4 py-3">
                      {Number(req.damage_recovery_amount) > 0
                        ? formatINR(req.damage_recovery_amount)
                        : '—'}
                      {req.damage_recovery_applied && (
                        <p className="text-[10px] text-emerald-600 mt-0.5">Applied to F&amp;F</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
                          ASSET_RETURN_STATUS[req.status] || ASSET_RETURN_STATUS.pending
                        )}
                      >
                        {ASSET_RETURN_STATUS_LABELS[req.status] || req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {req.status === 'pending' && (
                          <button
                            type="button"
                            disabled={softApproveMutation.isPending}
                            onClick={() => softApproveMutation.mutate(req.id)}
                            className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                          >
                            <Check size={12} /> Approve
                          </button>
                        )}
                        {['pending', 'approved'].includes(req.status) ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setVerifyTarget(req)}
                              className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            >
                              <Eye size={12} /> Verify
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectTarget(req);
                                setRejectNote('');
                                setRejectError('');
                              }}
                              className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <X size={12} /> Reject
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setVerifyTarget(req)}
                            className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1"
                          >
                            <Eye size={12} /> View
                          </button>
                        )}
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

      {verifyTarget && ['pending', 'approved'].includes(verifyTarget.status) && (
        <VerifyDrawer
          request={verifyTarget}
          onClose={() => setVerifyTarget(null)}
          onSuccess={(data) => {
            invalidate();
            setVerifyTarget(null);
            const fnf = data?.data?.fnf;
            if (fnf?.applied) {
              window.alert(
                `Return completed. Asset recovery ₹${Number(fnf.amount).toLocaleString('en-IN')} added to F&F settlement #${fnf.settlement_id}.`
              );
            }
          }}
        />
      )}

      {verifyTarget && verifyTarget.status !== 'pending' && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setVerifyTarget(null)}
            aria-label="Close"
          />
          <div className="relative bg-white w-full max-w-md h-full shadow-xl p-5 overflow-y-auto text-xs space-y-3">
            <div className="flex justify-between items-start">
              <h2 className="text-sm font-semibold">Return details</h2>
              <button type="button" onClick={() => setVerifyTarget(null)}>
                <X size={16} />
              </button>
            </div>
            <p>
              <span className="text-slate-400">Status:</span> {verifyTarget.status}
            </p>
            <p>
              <span className="text-slate-400">Condition:</span>{' '}
              {ASSET_RETURN_CONDITION_LABELS[verifyTarget.verified_condition] || '—'}
            </p>
            <p>
              <span className="text-slate-400">Recovery:</span>{' '}
              {formatINR(verifyTarget.damage_recovery_amount)}
              {verifyTarget.damage_recovery_applied ? ' (applied to F&F)' : ''}
            </p>
            {verifyTarget.verifier_remarks && (
              <p className="bg-slate-50 rounded-lg p-3">{verifyTarget.verifier_remarks}</p>
            )}
            {verifyTarget.photos?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {verifyTarget.photos.map((photo) => (
                  <a key={photo.id} href={photo.file_url} target="_blank" rel="noreferrer">
                    <img
                      src={photo.file_url}
                      alt=""
                      className="w-20 h-20 object-cover rounded-lg border"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
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
