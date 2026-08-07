import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Pencil, Plus, Search, Trash2, Wrench } from 'lucide-react';
import { financeApi, hrApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import {
  EMPTY_ASSET_MAINTENANCE_FORM,
  MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_BADGES,
  MAINTENANCE_TYPES,
  MAINTENANCE_TYPE_LABELS,
} from '../../constants/hr';
import { cn, formatINR } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';
import { useTablePagination } from '../../hooks/useTablePagination';

function formatDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(String(value).slice(0, 10)), 'dd MMM yyyy');
  } catch {
    return String(value).slice(0, 10);
  }
}

function recordToForm(record) {
  return {
    asset_id: String(record.asset_id || record.asset?.id || ''),
    maintenance_type: record.maintenance_type || 'service',
    vendor_id: record.vendor_id ? String(record.vendor_id) : '',
    scheduled_date: record.scheduled_date ? String(record.scheduled_date).slice(0, 10) : '',
    completed_date: record.completed_date ? String(record.completed_date).slice(0, 10) : '',
    cost: record.cost != null ? String(record.cost) : '',
    description: record.description || '',
    status: record.status || 'scheduled',
    next_due_date: record.next_due_date ? String(record.next_due_date).slice(0, 10) : '',
  };
}

function buildPayload(form) {
  return {
    asset_id: parseInt(form.asset_id, 10),
    maintenance_type: form.maintenance_type,
    vendor_id: form.vendor_id ? parseInt(form.vendor_id, 10) : null,
    scheduled_date: form.scheduled_date,
    completed_date: form.completed_date || null,
    cost: form.cost !== '' ? parseFloat(form.cost) : null,
    description: form.description.trim() || null,
    status: form.status,
    next_due_date: form.next_due_date || null,
  };
}

export default function AssetMaintenancePage() {
  const queryClient = useQueryClient();
  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assetFilter, setAssetFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_ASSET_MAINTENANCE_FORM);
  const [formError, setFormError] = useState('');
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [search, statusFilter, assetFilter] });

  const listParams = useMemo(
    () => ({
      status: statusFilter || undefined,
      asset_id: assetFilter || undefined,
    }),
    [statusFilter, assetFilter]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['asset-maintenance', selectedTenantId, listParams],
    queryFn: () => hrApi.listAssetMaintenance(listParams),
    enabled: !tenantRequired,
  });

  const { data: assetsData } = useQuery({
    queryKey: ['assets-maintenance-picker', selectedTenantId],
    queryFn: () => hrApi.listAssets({ limit: 500 }),
    enabled: !tenantRequired,
  });

  const { data: vendorsData } = useQuery({
    queryKey: ['finance-vendors', selectedTenantId, 'active'],
    queryFn: () => financeApi.listVendors({ active_only: 'true' }),
    enabled: !tenantRequired,
  });

  const records = data?.data?.maintenance || [];
  const assets = assetsData?.data?.assets || [];
  const vendors = vendorsData?.data?.vendors || [];

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const hay = [
        r.asset?.asset_code,
        r.asset?.name,
        r.vendor?.name,
        r.description,
        MAINTENANCE_TYPE_LABELS[r.maintenance_type],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [records, search]);
  const { items: visibleRecords, pagination } = paginateClient(filtered);

  const openCount = records.filter((r) => ['scheduled', 'in_progress'].includes(r.status)).length;
  const completedCount = records.filter((r) => r.status === 'completed').length;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['asset-maintenance'] });
    queryClient.invalidateQueries({ queryKey: ['asset-dashboard'] });
  };

  const createMutation = useMutation({
    mutationFn: hrApi.createAssetMaintenance,
    onSuccess: () => {
      invalidate();
      setModal(null);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to create record'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => hrApi.updateAssetMaintenance(id, payload),
    onSuccess: () => {
      invalidate();
      setModal(null);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to update record'),
  });

  const deleteMutation = useMutation({
    mutationFn: hrApi.deleteAssetMaintenance,
    onSuccess: invalidate,
    onError: (err) => window.alert(err.response?.data?.error?.message || 'Failed to delete record'),
  });

  const openCreate = () => {
    setForm({
      ...EMPTY_ASSET_MAINTENANCE_FORM,
      asset_id: assets[0]?.id ? String(assets[0].id) : '',
    });
    setFormError('');
    setModal('create');
  };

  const openEdit = (record) => {
    setForm(recordToForm(record));
    setFormError('');
    setModal({ mode: 'edit', id: record.id });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.asset_id) {
      setFormError('Select an asset');
      return;
    }
    if (!form.scheduled_date) {
      setFormError('Scheduled date is required');
      return;
    }
    const payload = buildPayload(form);
    if (modal === 'create') {
      createMutation.mutate(payload);
    } else if (modal?.mode === 'edit') {
      updateMutation.mutate({ id: modal.id, payload });
    }
  };

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to manage asset maintenance.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Assets · Maintenance"
        title="Asset Maintenance"
        subtitle="Schedule repairs, services, and inspections"
        actions={
          <div className="flex items-center gap-2">
            <Link to="/assets/dashboard" className="btn-secondary text-xs">
              Dashboard
            </Link>
            <button type="button" onClick={openCreate} className="btn-primary" disabled={!assets.length}>
              <Plus size={14} /> Log Maintenance
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Open Records" value={openCount} icon={Wrench} delta="Scheduled or in progress" deltaType="neutral" />
        <StatCard label="Completed" value={completedCount} icon={Wrench} deltaType="neutral" />
        <StatCard label="Total Logged" value={records.length} icon={Wrench} deltaType="neutral" />
      </div>

      <div className="card overflow-hidden">
        <div className="ds-toolbar">
          <div className="toolbar-row">
          <div className="relative flex-1 min-w-0 sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search asset, vendor, description…"
              className="ds-input pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ds-select sm:min-w-[140px]"
          >
            <option value="">All statuses</option>
            {MAINTENANCE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value)}
            className="ds-select sm:min-w-[180px]"
          >
            <option value="">All assets</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.asset_code} — {a.name}
              </option>
            ))}
          </select>
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <p className="py-16 text-center text-slate-400 text-sm">Loading maintenance records…</p>
        ) : error ? (
          <p className="py-16 text-center text-red-500 text-sm">Failed to load maintenance records</p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-slate-400 text-sm">No maintenance records found</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Asset</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Scheduled</th>
                <th className="text-left px-4 py-3 font-semibold">Vendor</th>
                <th className="text-right px-4 py-3 font-semibold">Cost</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.asset?.name || '—'}</p>
                    <p className="text-slate-400 font-mono">{r.asset?.asset_code}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{MAINTENANCE_TYPE_LABELS[r.maintenance_type] || r.maintenance_type}</td>
                  <td className="px-4 py-3">{formatDate(r.scheduled_date)}</td>
                  <td className="px-4 py-3">{r.vendor?.name || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.cost != null ? formatINR(r.cost) : '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
                        MAINTENANCE_STATUS_BADGES[r.status]
                      )}
                    >
                      {r.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="p-1.5 text-slate-400 hover:text-brand-600"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Delete this maintenance record?')) {
                            deleteMutation.mutate(r.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!isLoading && filtered.length > 0 && (
        <TablePagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}

      {modal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[92dvh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
              <h3 className="font-semibold">{modal === 'create' ? 'Log Maintenance' : 'Edit Maintenance'}</h3>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 text-lg">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs border border-red-100">{formError}</div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-600">Asset</label>
                <select
                  required
                  value={form.asset_id}
                  onChange={(e) => setForm({ ...form, asset_id: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  disabled={modal?.mode === 'edit'}
                >
                  <option value="">Select asset…</option>
                  {assets.filter((a) => a.status !== 'retired').map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.asset_code} — {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600">Type</label>
                  <select
                    value={form.maintenance_type}
                    onChange={(e) => setForm({ ...form, maintenance_type: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    {MAINTENANCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {MAINTENANCE_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    {MAINTENANCE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Scheduled date</label>
                  <input
                    type="date"
                    required
                    value={form.scheduled_date}
                    onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Completed date</label>
                  <input
                    type="date"
                    value={form.completed_date}
                    onChange={(e) => setForm({ ...form, completed_date: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Vendor (optional)</label>
                  <select
                    value={form.vendor_id}
                    onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">None</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Cost</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-600">Next due date</label>
                  <input
                    type="date"
                    value={form.next_due_date}
                    onChange={(e) => setForm({ ...form, next_due_date: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-600">Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
