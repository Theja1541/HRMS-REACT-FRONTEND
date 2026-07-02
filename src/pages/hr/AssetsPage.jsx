import { useMemo, useState } from 'react';
import { useTablePagination, normalizePagination } from '../../hooks/useTablePagination';
import TablePagination from '../../components/shared/TablePagination';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, Laptop, Pencil, Plus, Search } from 'lucide-react';
import { assetCategoryApi, employeeApi, financeApi, hrApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import ExportExcelButton from '../../components/shared/ExportExcelButton';
import { ASSET_STATUSES, ASSET_STATUS_OPTIONS, EMPTY_ASSET_FORM } from '../../constants/hr';
import { formatINR, cn } from '../../utils/helpers';
import { exportAssetsCsvFromApi } from '../../utils/assetExports';
import { useAuthStore } from '../../store/auth.store';

function categoryLabel(asset) {
  return asset.category_name || asset.category_info?.name || asset.category || '—';
}

function assetToForm(asset) {
  return {
    asset_code: asset.asset_code || '',
    name: asset.name || '',
    category_id: String(asset.category_id || asset.category_info?.id || ''),
    brand: asset.brand || '',
    model: asset.model || '',
    serial_number: asset.serial_number || '',
    purchase_value: asset.purchase_value != null ? String(asset.purchase_value) : '',
    purchase_date: asset.purchase_date ? String(asset.purchase_date).slice(0, 10) : '',
    warranty_expires: asset.warranty_expires ? String(asset.warranty_expires).slice(0, 10) : '',
    vendor_id: asset.vendor_id ? String(asset.vendor_id) : '',
    condition_notes: asset.condition_notes || '',
  };
}

function buildPayload(form) {
  return {
    asset_code: form.asset_code.trim(),
    name: form.name.trim(),
    category_id: parseInt(form.category_id, 10),
    brand: form.brand.trim() || null,
    model: form.model.trim() || null,
    serial_number: form.serial_number.trim() || null,
    purchase_value: form.purchase_value !== '' ? parseFloat(form.purchase_value) : null,
    purchase_date: form.purchase_date || null,
    warranty_expires: form.warranty_expires || null,
    vendor_id: form.vendor_id ? parseInt(form.vendor_id, 10) : null,
    condition_notes: form.condition_notes.trim() || null,
  };
}

export default function AssetsPage() {
  const queryClient = useQueryClient();
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const { page, limit, setPage, setLimit, queryParams } = useTablePagination({
    resetDeps: [search, statusFilter, categoryFilter, brandFilter, selectedTenantId],
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editAsset, setEditAsset] = useState(null);
  const [form, setForm] = useState(EMPTY_ASSET_FORM);
  const [formError, setFormError] = useState('');

  const [assignAsset, setAssignAsset] = useState(null);
  const [assignForm, setAssignForm] = useState({
    employee_id: '',
    assigned_date: new Date().toISOString().slice(0, 10),
    condition_at_assign: 'Good',
  });

  const listParams = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: statusFilter || undefined,
      category_id: categoryFilter || undefined,
      brand: brandFilter.trim() || undefined,
      ...queryParams,
    }),
    [search, statusFilter, categoryFilter, brandFilter, queryParams]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['assets', selectedTenantId, listParams],
    queryFn: () => hrApi.listAssets(listParams),
    enabled: !tenantRequired,
  });

  const { data: categoryData } = useQuery({
    queryKey: ['asset-categories', selectedTenantId, 'active'],
    queryFn: () => assetCategoryApi.list({ status: 'active' }),
    enabled: !tenantRequired,
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-assets', selectedTenantId],
    queryFn: () => employeeApi.list({ limit: 500 }),
    enabled: !tenantRequired,
  });

  const { data: vendorData } = useQuery({
    queryKey: ['finance-vendors', selectedTenantId, 'asset-form'],
    queryFn: () => financeApi.listVendors({ active_only: 'true' }),
    enabled: !tenantRequired && (createOpen || Boolean(editAsset)),
  });

  const categories = categoryData?.data?.categories || [];
  const assets = data?.data?.assets || [];
  const pagination = normalizePagination(data?.data?.pagination, limit);
  const employees = empData?.data?.employees || [];
  const vendors = vendorData?.data?.vendors || [];

  const exportParams = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: statusFilter || undefined,
      category_id: categoryFilter || undefined,
      brand: brandFilter.trim() || undefined,
    }),
    [search, statusFilter, categoryFilter, brandFilter]
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    queryClient.invalidateQueries({ queryKey: ['asset-dashboard'] });
  };

  const createMutation = useMutation({
    mutationFn: hrApi.createAsset,
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to create asset'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => hrApi.updateAsset(id, payload),
    onSuccess: () => {
      invalidate();
      setEditAsset(null);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to update asset'),
  });

  const retireMutation = useMutation({
    mutationFn: hrApi.retireAsset,
    onSuccess: invalidate,
    onError: (err) => {
      window.alert(err.response?.data?.error?.message || 'Failed to retire asset');
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, ...payload }) => hrApi.assignAsset(id, payload),
    onSuccess: () => {
      invalidate();
      setAssignAsset(null);
    },
  });

  const returnMutation = useMutation({
    mutationFn: (id) => hrApi.returnAsset(id, {}),
    onSuccess: invalidate,
  });

  const openCreate = () => {
    setForm({
      ...EMPTY_ASSET_FORM,
      category_id: categories[0]?.id ? String(categories[0].id) : '',
    });
    setFormError('');
    setCreateOpen(true);
  };

  const openEdit = (asset) => {
    setForm(assetToForm(asset));
    setFormError('');
    setEditAsset(asset);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.asset_code.trim() || !form.name.trim()) {
      setFormError('Asset code and name are required');
      return;
    }
    if (!form.category_id) {
      setFormError('Select a category');
      return;
    }

    const payload = buildPayload(form);
    if (createOpen) {
      createMutation.mutate(payload);
    } else if (editAsset) {
      updateMutation.mutate({ id: editAsset.id, payload });
    }
  };

  const handleRetire = (asset) => {
    if (asset.status === 'assigned') {
      window.alert('Return the asset before retiring it.');
      return;
    }
    if (asset.status === 'retired') return;
    if (!window.confirm(`Retire "${asset.name}" (${asset.asset_code})? It will be removed from active inventory.`)) {
      return;
    }
    retireMutation.mutate(asset.id);
  };

  const handleReturn = (asset) => {
    if (!window.confirm(`Mark "${asset.name}" as returned and available?`)) return;
    returnMutation.mutate(asset.id);
  };

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to manage the asset registry.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Registry"
        subtitle={
          pagination
            ? `${pagination.total} asset${pagination.total === 1 ? '' : 's'}`
            : 'Company assets and employee assignments'
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/assets/dashboard" className="btn-secondary text-xs">
              Dashboard
            </Link>
            <ExportExcelButton
              label="Export CSV"
              onExport={() => exportAssetsCsvFromApi(exportParams)}
            />
            <button type="button" onClick={openCreate} className="btn-primary" disabled={!categories.length}>
              <Plus size={14} /> Add Asset
            </button>
          </div>
        }
      />

      {!categories.length && (
        <div className="card px-4 py-3 text-sm text-amber-800 bg-amber-50 border border-amber-200">
          No active asset categories found.{' '}
          <Link to="/assets/categories" className="font-medium underline">
            Add categories
          </Link>{' '}
          before registering assets.
        </div>
      )}

      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, name, brand, model, serial…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">All statuses</option>
            {ASSET_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            placeholder="Filter by brand…"
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm min-w-[140px]"
          />
        </div>
      </div>

      <div className="card overflow-x-auto overscroll-x-contain">
        {isLoading ? (
          <p className="p-8 text-center text-slate-400">Loading assets…</p>
        ) : error ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-red-500">Failed to load assets</p>
            <button type="button" onClick={() => refetch()} className="btn-secondary text-xs">
              Retry
            </button>
          </div>
        ) : assets.length === 0 ? (
          <p className="p-12 text-center text-slate-400">No assets match your filters</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Asset</th>
                    <th className="text-left px-4 py-3 font-semibold">Category</th>
                    <th className="text-left px-4 py-3 font-semibold">Brand</th>
                    <th className="text-left px-4 py-3 font-semibold">Serial</th>
                    <th className="text-right px-4 py-3 font-semibold">Value</th>
                    <th className="text-left px-4 py-3 font-semibold">Assigned To</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.map((a) => {
                    const activeAssign = a.assignments?.[0];
                    const isRetired = a.status === 'retired';
                    return (
                      <tr key={a.id} className={cn('hover:bg-slate-50', isRetired && 'opacity-60')}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Laptop size={14} className="text-brand-600 shrink-0" />
                            <div>
                              <p className="font-medium">{a.name}</p>
                              <p className="text-slate-400 font-mono">{a.asset_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{categoryLabel(a)}</td>
                        <td className="px-4 py-3 text-slate-600">{a.brand || '—'}</td>
                        <td className="px-4 py-3 font-mono text-slate-500">{a.serial_number || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          {a.purchase_value ? formatINR(a.purchase_value) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {activeAssign?.employee
                            ? `${activeAssign.employee.first_name} ${activeAssign.employee.last_name}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
                              ASSET_STATUSES[a.status]
                            )}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {!isRetired && (
                              <button
                                type="button"
                                onClick={() => openEdit(a)}
                                className="p-1.5 text-slate-400 hover:text-brand-600"
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                            {!isRetired && a.status !== 'assigned' && (
                              <button
                                type="button"
                                onClick={() => handleRetire(a)}
                                disabled={retireMutation.isPending}
                                className="p-1.5 text-slate-400 hover:text-red-600"
                                title="Retire"
                              >
                                <Archive size={14} />
                              </button>
                            )}
                            {a.status === 'available' && (
                              <button
                                type="button"
                                onClick={() => setAssignAsset(a)}
                                className="btn-secondary text-[10px] py-1"
                              >
                                Assign
                              </button>
                            )}
                            {a.status === 'assigned' && (
                              <button
                                type="button"
                                onClick={() => handleReturn(a)}
                                disabled={returnMutation.isPending}
                                className="btn-secondary text-[10px] py-1"
                              >
                                Return
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          </>
        )}
      </div>

      {(createOpen || editAsset) && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold">{createOpen ? 'Register Asset' : 'Edit Asset'}</h3>
              <button
                type="button"
                onClick={() => {
                  setCreateOpen(false);
                  setEditAsset(null);
                  setFormError('');
                }}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs border border-red-100">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Asset Code" value={form.asset_code} onChange={(v) => setForm({ ...form, asset_code: v })} required />
                <div>
                  <label className="text-xs font-medium text-slate-600">Category</label>
                  <select
                    required
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">Select…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
                </div>
                <Field label="Brand" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} />
                <Field label="Model" value={form.model} onChange={(v) => setForm({ ...form, model: v })} />
                <Field label="Serial Number" value={form.serial_number} onChange={(v) => setForm({ ...form, serial_number: v })} />
                <Field
                  label="Purchase Value"
                  type="number"
                  value={form.purchase_value}
                  onChange={(v) => setForm({ ...form, purchase_value: v })}
                />
                <Field
                  label="Purchase Date"
                  type="date"
                  value={form.purchase_date}
                  onChange={(v) => setForm({ ...form, purchase_date: v })}
                />
                <Field
                  label="Warranty Expires"
                  type="date"
                  value={form.warranty_expires}
                  onChange={(v) => setForm({ ...form, warranty_expires: v })}
                />
                <div className="col-span-2">
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
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-600">Condition notes</label>
                  <textarea
                    value={form.condition_notes}
                    onChange={(e) => setForm({ ...form, condition_notes: e.target.value })}
                    rows={2}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreateOpen(false);
                    setEditAsset(null);
                    setFormError('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving…' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assignAsset && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <h3 className="font-semibold mb-4">Assign {assignAsset.name}</h3>
            <select
              value={assignForm.employee_id}
              onChange={(e) => setAssignForm({ ...assignForm, employee_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-3"
            >
              <option value="">Select employee…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.emp_code} — {e.first_name} {e.last_name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={assignForm.assigned_date}
              onChange={(e) => setAssignForm({ ...assignForm, assigned_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setAssignAsset(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                disabled={!assignForm.employee_id || assignMutation.isPending}
                onClick={() =>
                  assignMutation.mutate({
                    id: assignAsset.id,
                    ...assignForm,
                    employee_id: parseInt(assignForm.employee_id, 10),
                  })
                }
                className="btn-primary"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, required, type = 'text' }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
      />
    </div>
  );
}
