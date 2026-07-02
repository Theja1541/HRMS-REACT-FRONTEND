import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Search, Pencil } from 'lucide-react';
import { departmentApi, designationApi, branchApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { useTablePagination } from '../../hooks/useTablePagination';
import { useAuthStore } from '../../store/auth.store';
import { INDIAN_STATES } from '../../constants/tenant';
import { cn } from '../../utils/helpers';

const TABS = [
  { id: 'departments', label: 'Departments' },
  { id: 'designations', label: 'Designations' },
  { id: 'branches', label: 'Branches' },
];

const EMPTY_BRANCH_FORM = {
  name: '',
  code: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  pt_state: '',
  is_head_office: false,
};

function resolveSection(tab) {
  if (tab === 'designations') return 'designations';
  if (tab === 'branches') return 'branches';
  return 'departments';
}

export default function OrgStructurePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;

  const section = resolveSection(searchParams.get('tab'));
  const [search, setSearch] = useState('');
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [showDesigForm, setShowDesigForm] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [editingDesig, setEditingDesig] = useState(null);
  const [editingBranch, setEditingBranch] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [desigForm, setDesigForm] = useState({ name: '', department_id: '' });
  const [branchForm, setBranchForm] = useState(EMPTY_BRANCH_FORM);
  const [formError, setFormError] = useState('');
  const [branchFieldErrors, setBranchFieldErrors] = useState({});
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [section, search] });

  const listParams = { search: search || undefined, tenant_id: selectedTenantId };

  const { data: deptData, isLoading: deptLoading, error: deptError } = useQuery({
    queryKey: ['departments', selectedTenantId, search],
    queryFn: () => departmentApi.list(listParams),
    enabled: !tenantRequired,
  });
  const { data: desigData, isLoading: desigLoading, error: desigError } = useQuery({
    queryKey: ['designations', selectedTenantId, search],
    queryFn: () => designationApi.list(listParams),
    enabled: !tenantRequired,
  });
  const { data: branchData, isLoading: branchLoading, error: branchError } = useQuery({
    queryKey: ['branches', selectedTenantId, search],
    queryFn: () => branchApi.list(listParams),
    enabled: !tenantRequired,
  });

  const departments = deptData?.data?.departments || [];
  const designations = desigData?.data?.designations || [];
  const branches = branchData?.data?.branches || [];

  const invalidateDept = () => queryClient.invalidateQueries({ queryKey: ['departments'] });
  const invalidateDesig = () => queryClient.invalidateQueries({ queryKey: ['designations'] });
  const invalidateBranch = () => queryClient.invalidateQueries({ queryKey: ['branches'] });

  const createDept = useMutation({
    mutationFn: departmentApi.create,
    onSuccess: () => {
      invalidateDept();
      setShowDeptForm(false);
      setDeptForm({ name: '', code: '' });
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to create department'),
  });

  const updateDept = useMutation({
    mutationFn: ({ id, payload }) => departmentApi.update(id, payload),
    onSuccess: () => {
      invalidateDept();
      setEditingDept(null);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to update department'),
  });

  const toggleDept = useMutation({
    mutationFn: ({ id, is_active }) => departmentApi.update(id, { is_active }),
    onSuccess: invalidateDept,
  });

  const createDesig = useMutation({
    mutationFn: designationApi.create,
    onSuccess: () => {
      invalidateDesig();
      setShowDesigForm(false);
      setDesigForm({ name: '', department_id: '' });
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to create designation'),
  });

  const updateDesig = useMutation({
    mutationFn: ({ id, payload }) => designationApi.update(id, payload),
    onSuccess: () => {
      invalidateDesig();
      setEditingDesig(null);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to update designation'),
  });

  const toggleDesig = useMutation({
    mutationFn: ({ id, is_active }) => designationApi.update(id, { is_active }),
    onSuccess: invalidateDesig,
  });

  const createBranch = useMutation({
    mutationFn: branchApi.create,
    onSuccess: () => {
      invalidateBranch();
      setShowBranchForm(false);
      setBranchForm(EMPTY_BRANCH_FORM);
      clearBranchFormErrors();
    },
    onError: (err) => handleBranchMutationError(err, 'Failed to create branch'),
  });

  const updateBranch = useMutation({
    mutationFn: ({ id, payload }) => branchApi.update(id, payload),
    onSuccess: () => {
      invalidateBranch();
      setEditingBranch(null);
      clearBranchFormErrors();
    },
    onError: (err) => handleBranchMutationError(err, 'Failed to update branch'),
  });

  const toggleBranch = useMutation({
    mutationFn: ({ id, is_active }) => branchApi.update(id, { is_active }),
    onSuccess: invalidateBranch,
  });

  const clearBranchFormErrors = () => {
    setFormError('');
    setBranchFieldErrors({});
  };

  const handleBranchMutationError = (err, fallbackMessage) => {
    const apiError = err.response?.data?.error;
    const message = apiError?.message || fallbackMessage;
    setFormError(message);
    if (apiError?.field) {
      setBranchFieldErrors({ [apiError.field]: message });
    }
  };

  const setSection = (tab) => {
    setSearch('');
    setSearchParams(tab === 'departments' ? {} : { tab });
  };

  const openAddDept = () => {
    setFormError('');
    setDeptForm({ name: '', code: '' });
    setShowDeptForm(true);
  };

  const openEditDept = (dept) => {
    setFormError('');
    setEditingDept(dept);
    setDeptForm({ name: dept.name, code: dept.code || '' });
  };

  const openAddDesig = () => {
    setFormError('');
    setDesigForm({ name: '', department_id: '' });
    setShowDesigForm(true);
  };

  const openEditDesig = (desig) => {
    setFormError('');
    setEditingDesig(desig);
    setDesigForm({ name: desig.name, department_id: desig.department_id || '' });
  };

  const openAddBranch = () => {
    clearBranchFormErrors();
    setBranchForm(EMPTY_BRANCH_FORM);
    setShowBranchForm(true);
  };

  const openEditBranch = (branch) => {
    clearBranchFormErrors();
    setEditingBranch(branch);
    setBranchForm({
      name: branch.name || '',
      code: branch.code || '',
      address: branch.address || '',
      city: branch.city || '',
      state: branch.state || '',
      pincode: branch.pincode || '',
      pt_state: branch.pt_state || '',
      is_head_office: Boolean(branch.is_head_office),
    });
  };

  const buildBranchPayload = () => ({
    name: branchForm.name.trim(),
    code: branchForm.code.trim() || null,
    address: branchForm.address.trim() || null,
    city: branchForm.city.trim() || null,
    state: branchForm.state || null,
    pincode: branchForm.pincode.trim() || null,
    pt_state: branchForm.pt_state || null,
    is_head_office: branchForm.is_head_office,
  });

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center">
        <Building2 size={40} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700">Select a tenant</h3>
        <p className="text-sm text-slate-500 mt-2">Go to Tenants and select an organization to manage departments, designations, and branches.</p>
      </div>
    );
  }

  const isLoading = section === 'departments' ? deptLoading : section === 'designations' ? desigLoading : branchLoading;
  const error = section === 'departments' ? deptError : section === 'designations' ? desigError : branchError;
  const isEmpty =
    section === 'departments' ? departments.length === 0 : section === 'designations' ? designations.length === 0 : branches.length === 0;

  const sectionLabel = section === 'departments' ? 'departments' : section === 'designations' ? 'designations' : 'branches';
  const sectionRows = section === 'departments' ? departments : section === 'designations' ? designations : branches;
  const { items: visibleRows, pagination } = paginateClient(sectionRows);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Structure"
        subtitle="Manage departments, designations, and branch locations"
        actions={
          section === 'departments' ? (
            <button type="button" onClick={openAddDept} className="btn-primary">
              <Plus size={14} /> Add Department
            </button>
          ) : section === 'designations' ? (
            <button type="button" onClick={openAddDesig} className="btn-primary">
              <Plus size={14} /> Add Designation
            </button>
          ) : (
            <button type="button" onClick={openAddBranch} className="btn-primary">
              <Plus size={14} /> Add Branch
            </button>
          )
        }
      />

      <div className="flex gap-1 border-b border-slate-200 scroll-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSection(t.id)}
            className={cn(
              'px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
              section === t.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto overscroll-x-contain">
        <div className="px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 max-w-sm">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                section === 'departments'
                  ? 'Search by name or code…'
                  : section === 'designations'
                    ? 'Search by name…'
                    : 'Search by name, code, or location…'
              }
              className="border-none bg-transparent text-xs outline-none w-full"
            />
          </div>
        </div>

        {isLoading ? (
          <p className="p-8 text-center text-slate-400 text-sm">Loading…</p>
        ) : error ? (
          <p className="p-8 text-center text-red-500 text-sm">
            {error.response?.data?.error?.message || error.message}
          </p>
        ) : isEmpty ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 text-sm">
              {search ? 'No results match your search' : `No ${sectionLabel} yet`}
            </p>
            {!search && (
              <button
                type="button"
                onClick={
                  section === 'departments' ? openAddDept : section === 'designations' ? openAddDesig : openAddBranch
                }
                className="btn-primary mt-4"
              >
                <Plus size={14} />{' '}
                {section === 'departments'
                  ? 'Add Department'
                  : section === 'designations'
                    ? 'Add Designation'
                    : 'Add Branch'}
              </button>
            )}
          </div>
        ) : section === 'branches' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Name</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Code</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Location</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-center">Employees</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((b) => (
                  <tr key={b.id} className={cn('hover:bg-slate-50 transition-colors', !b.is_active && 'opacity-60')}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{b.name}</span>
                        {b.is_head_office && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-50 text-brand-700">
                            Head office
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{b.code || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {[b.city, b.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-700">
                        {b.employee_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ActiveToggle
                        active={b.is_active !== false}
                        disabled={toggleBranch.isPending}
                        onChange={(is_active) => toggleBranch.mutate({ id: b.id, is_active })}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => openEditBranch(b)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : section === 'departments' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Name</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Code</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-center">Employees</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((d) => (
                  <tr key={d.id} className={cn('hover:bg-slate-50 transition-colors', !d.is_active && 'opacity-60')}>
                    <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{d.code || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-700">
                        {d.employee_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ActiveToggle
                        active={d.is_active}
                        disabled={toggleDept.isPending}
                        onChange={(is_active) => toggleDept.mutate({ id: d.id, is_active })}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => openEditDept(d)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Name</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Department</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((d) => (
                  <tr key={d.id} className={cn('hover:bg-slate-50 transition-colors', !d.is_active && 'opacity-60')}>
                    <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
                    <td className="px-4 py-3 text-slate-600">{d.department?.name || 'All departments'}</td>
                    <td className="px-4 py-3">
                      <ActiveToggle
                        active={d.is_active}
                        disabled={toggleDesig.isPending}
                        onChange={(is_active) => toggleDesig.mutate({ id: d.id, is_active })}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => openEditDesig(d)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && !error && !isEmpty && (
          <TablePagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        )}
      </div>

      {showDeptForm && (
        <Modal title="Add Department" onClose={() => setShowDeptForm(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setFormError('');
              createDept.mutate({ name: deptForm.name.trim(), code: deptForm.code.trim() || null });
            }}
            className="space-y-4"
          >
            {formError && <FormError message={formError} />}
            <Field label="Name" value={deptForm.name} onChange={(v) => setDeptForm({ ...deptForm, name: v })} required />
            <Field label="Code" value={deptForm.code} onChange={(v) => setDeptForm({ ...deptForm, code: v })} placeholder="e.g. ENG" />
            <FormActions onCancel={() => setShowDeptForm(false)} loading={createDept.isPending} submitLabel="Add Department" />
          </form>
        </Modal>
      )}

      {editingDept && (
        <Modal title="Edit Department" onClose={() => setEditingDept(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setFormError('');
              updateDept.mutate({
                id: editingDept.id,
                payload: { name: deptForm.name.trim(), code: deptForm.code.trim() || null },
              });
            }}
            className="space-y-4"
          >
            {formError && <FormError message={formError} />}
            <Field label="Name" value={deptForm.name} onChange={(v) => setDeptForm({ ...deptForm, name: v })} required />
            <Field label="Code" value={deptForm.code} onChange={(v) => setDeptForm({ ...deptForm, code: v })} placeholder="e.g. ENG" />
            <FormActions onCancel={() => setEditingDept(null)} loading={updateDept.isPending} submitLabel="Save Changes" />
          </form>
        </Modal>
      )}

      {showDesigForm && (
        <Modal title="Add Designation" onClose={() => setShowDesigForm(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setFormError('');
              createDesig.mutate({
                name: desigForm.name.trim(),
                department_id: desigForm.department_id ? parseInt(desigForm.department_id, 10) : null,
              });
            }}
            className="space-y-4"
          >
            {formError && <FormError message={formError} />}
            <Field label="Name" value={desigForm.name} onChange={(v) => setDesigForm({ ...desigForm, name: v })} required />
            <Select
              label="Department"
              value={desigForm.department_id}
              onChange={(v) => setDesigForm({ ...desigForm, department_id: v })}
              options={departments.filter((d) => d.is_active).map((d) => ({ value: d.id, label: d.name }))}
              placeholder="All departments (optional)"
            />
            <FormActions onCancel={() => setShowDesigForm(false)} loading={createDesig.isPending} submitLabel="Add Designation" />
          </form>
        </Modal>
      )}

      {editingDesig && (
        <Modal title="Edit Designation" onClose={() => setEditingDesig(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setFormError('');
              updateDesig.mutate({
                id: editingDesig.id,
                payload: {
                  name: desigForm.name.trim(),
                  department_id: desigForm.department_id ? parseInt(desigForm.department_id, 10) : null,
                },
              });
            }}
            className="space-y-4"
          >
            {formError && <FormError message={formError} />}
            <Field label="Name" value={desigForm.name} onChange={(v) => setDesigForm({ ...desigForm, name: v })} required />
            <Select
              label="Department"
              value={desigForm.department_id}
              onChange={(v) => setDesigForm({ ...desigForm, department_id: v })}
              options={departments.filter((d) => d.is_active).map((d) => ({ value: d.id, label: d.name }))}
              placeholder="All departments (optional)"
            />
            <FormActions onCancel={() => setEditingDesig(null)} loading={updateDesig.isPending} submitLabel="Save Changes" />
          </form>
        </Modal>
      )}

      {showBranchForm && (
        <Modal title="Add Branch" onClose={() => setShowBranchForm(false)}>
          <BranchForm
            form={branchForm}
            setForm={setBranchForm}
            formError={formError}
            fieldErrors={branchFieldErrors}
            onClearFieldError={(field) => {
              setBranchFieldErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
              });
              setFormError('');
            }}
            onSubmit={(e) => {
              e.preventDefault();
              clearBranchFormErrors();
              createBranch.mutate(buildBranchPayload());
            }}
            onCancel={() => setShowBranchForm(false)}
            loading={createBranch.isPending}
            submitLabel="Add Branch"
          />
        </Modal>
      )}

      {editingBranch && (
        <Modal title="Edit Branch" onClose={() => setEditingBranch(null)}>
          <BranchForm
            form={branchForm}
            setForm={setBranchForm}
            formError={formError}
            fieldErrors={branchFieldErrors}
            onClearFieldError={(field) => {
              setBranchFieldErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
              });
              setFormError('');
            }}
            onSubmit={(e) => {
              e.preventDefault();
              clearBranchFormErrors();
              updateBranch.mutate({ id: editingBranch.id, payload: buildBranchPayload() });
            }}
            onCancel={() => setEditingBranch(null)}
            loading={updateBranch.isPending}
            submitLabel="Save Changes"
          />
        </Modal>
      )}
    </div>
  );
}

function BranchForm({ form, setForm, formError, fieldErrors = {}, onClearFieldError, onSubmit, onCancel, loading, submitLabel }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {formError && <FormError message={formError} />}
      <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
      <Field
        label="Code"
        value={form.code}
        onChange={(v) => {
          setForm({ ...form, code: v });
          if (fieldErrors.code) onClearFieldError?.('code');
        }}
        placeholder="e.g. BLR"
        error={fieldErrors.code}
      />
      <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
        <Select
          label="State"
          value={form.state}
          onChange={(v) => setForm({ ...form, state: v })}
          options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
          placeholder="Select state"
        />
      </div>
      <Field label="PIN Code" value={form.pincode} onChange={(v) => setForm({ ...form, pincode: v })} />
      <Select
        label="PT State"
        value={form.pt_state}
        onChange={(v) => setForm({ ...form, pt_state: v })}
        options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
        placeholder="For professional tax (optional)"
      />
      <Checkbox
        label="Mark as head office"
        checked={form.is_head_office}
        onChange={(v) => setForm({ ...form, is_head_office: v })}
      />
      <FormActions onCancel={onCancel} loading={loading} submitLabel={submitLabel} />
    </form>
  );
}

function ActiveToggle({ active, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!active)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50',
        active ? 'bg-emerald-500' : 'bg-slate-300'
      )}
      title={active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          active ? 'translate-x-4' : 'translate-x-0'
        )}
      />
      <span className="sr-only">{active ? 'Active' : 'Inactive'}</span>
    </button>
  );
}

function FormError({ message }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs border border-red-100">{message}</div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required, placeholder, error }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'mt-1 w-full px-3 py-2 border rounded-lg text-sm',
          error ? 'border-red-300 focus:border-red-400' : 'border-slate-200'
        )}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder = 'Select…' }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function FormActions({ onCancel, loading, submitLabel = 'Save' }) {
  return (
    <div className="flex gap-2 justify-end pt-2">
      <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : submitLabel}</button>
    </div>
  );
}
