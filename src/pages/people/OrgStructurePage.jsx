import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Building2,
  Search,
  Pencil,
  Network,
  Briefcase,
  MapPin,
  Users,
  BadgeCheck,
  Layers,
  X,
} from 'lucide-react';
import { departmentApi, designationApi, branchApi } from '../../api';
import { StatCard } from '../../components/shared/PageHeader';
import DashboardHero, { DashboardSection } from '../../components/shared/DashboardHero';
import TablePagination from '../../components/shared/TablePagination';
import { useTablePagination } from '../../hooks/useTablePagination';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';
import { INDIAN_STATES } from '../../constants/tenant';
import { cn } from '../../utils/helpers';

const TABS = [
  {
    id: 'departments',
    label: 'Departments',
    icon: Layers,
    accent: 'bg-brand-600',
    soft: 'bg-brand-50 text-brand-700 ring-brand-100',
    emptyIcon: Layers,
  },
  {
    id: 'designations',
    label: 'Designations',
    icon: Briefcase,
    accent: 'bg-violet-500',
    soft: 'bg-violet-50 text-violet-700 ring-violet-100',
    emptyIcon: Briefcase,
  },
  {
    id: 'branches',
    label: 'Branches',
    icon: MapPin,
    accent: 'bg-teal-500',
    soft: 'bg-teal-50 text-teal-700 ring-teal-100',
    emptyIcon: MapPin,
  },
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

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function OrgStructurePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;

  const section = resolveSection(searchParams.get('tab'));
  const activeTab = TABS.find((t) => t.id === section) || TABS[0];
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

  const activeDepartments = departments.filter((d) => d.is_active !== false).length;
  const activeDesignations = designations.filter((d) => d.is_active !== false).length;
  const activeBranches = branches.filter((b) => b.is_active !== false).length;

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

  const openAddForSection = () => {
    if (section === 'departments') openAddDept();
    else if (section === 'designations') openAddDesig();
    else openAddBranch();
  };

  const addLabel =
    section === 'departments' ? 'Add Department' : section === 'designations' ? 'Add Designation' : 'Add Branch';

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-sky-50"
          aria-hidden
        />
        <div className="relative">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <Building2 size={26} />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Select a tenant</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Go to Tenants and select an organization to manage departments, designations, and branches.
          </p>
        </div>
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
  const EmptyIcon = activeTab.emptyIcon;

  return (
    <div className="space-y-6">
      <DashboardHero
        badge="People · Structure"
        title="Organization Structure"
        subtitle="Define how your company is organized — departments, roles, and locations"
        chips={[
          { label: 'Departments', value: departments.length, tone: 'sky' },
          { label: 'Designations', value: designations.length, tone: 'default' },
          { label: 'Branches', value: branches.length, tone: 'teal' },
        ]}
        actions={
          <button
            type="button"
            onClick={openAddForSection}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-brand-700 shadow-sm hover:bg-sky-50 transition-colors"
          >
            <Plus size={14} /> {addLabel}
          </button>
        }
      />

      <DashboardSection title="At a glance">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button type="button" onClick={() => setSection('departments')} className="text-left">
            <StatCard
              label="Departments"
              value={departments.length}
              icon={Layers}
              tone="brand"
              delta={`${activeDepartments} active`}
              deltaType="neutral"
            />
          </button>
          <button type="button" onClick={() => setSection('designations')} className="text-left">
            <StatCard
              label="Designations"
              value={designations.length}
              icon={Briefcase}
              tone="violet"
              delta={`${activeDesignations} active`}
              deltaType="neutral"
            />
          </button>
          <button type="button" onClick={() => setSection('branches')} className="text-left">
            <StatCard
              label="Branches"
              value={branches.length}
              icon={MapPin}
              tone="teal"
              delta={`${activeBranches} active`}
              deltaType="neutral"
            />
          </button>
        </div>
      </DashboardSection>

      <DashboardSection title="Directory" accent={activeTab.accent}>
        <div className="card overflow-hidden">
          {/* Segmented tabs */}
          <div className="px-4 pt-4 pb-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div
                className="inline-flex p-1 rounded-xl bg-slate-100/90 ring-1 ring-slate-200/80 scroll-tabs max-w-full"
                role="tablist"
              >
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const selected = section === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setSection(t.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all',
                        selected
                          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                          : 'text-slate-500 hover:text-slate-700'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-md',
                          selected ? t.soft : 'bg-transparent text-slate-400'
                        )}
                      >
                        <Icon size={12} />
                      </span>
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 transition-shadow"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-14 text-center">
              <div className="mx-auto mb-3 h-8 w-8 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
              <p className="text-sm text-slate-400">Loading {sectionLabel}…</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-sm text-red-600 font-medium">
                {error.response?.data?.error?.message || error.message}
              </p>
            </div>
          ) : isEmpty ? (
            <div className="p-14 text-center">
              <div
                className={cn(
                  'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ring-1',
                  activeTab.soft
                )}
              >
                <EmptyIcon size={24} />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {search ? 'No results match your search' : `No ${sectionLabel} yet`}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {search
                  ? 'Try a different keyword or clear the search.'
                  : `Create your first ${sectionLabel.slice(0, -1)} to start building the org map.`}
              </p>
              {!search && (
                <button type="button" onClick={openAddForSection} className="btn-primary mt-5">
                  <Plus size={14} /> {addLabel}
                </button>
              )}
            </div>
          ) : section === 'branches' ? (
            <OrgTable>
              <thead>
                <tr className="bg-slate-50/90 text-left">
                  <Th>Name</Th>
                  <Th>Code</Th>
                  <Th>Location</Th>
                  <Th className="text-center">Employees</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((b) => (
                  <tr
                    key={b.id}
                    className={cn(
                      'group hover:bg-teal-50/40 transition-colors',
                      !b.is_active && 'opacity-55'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100 text-[11px] font-bold">
                          {initials(b.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{b.name}</p>
                          {b.is_head_office && (
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 ring-1 ring-brand-100">
                              <BadgeCheck size={10} /> Head office
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <CodeChip value={b.code} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        {[b.city, b.state].filter(Boolean).join(', ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CountChip count={b.employee_count ?? 0} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ActiveToggle
                          active={b.is_active !== false}
                          disabled={toggleBranch.isPending}
                          onChange={(is_active) => toggleBranch.mutate({ id: b.id, is_active })}
                        />
                        <StatusLabel active={b.is_active !== false} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <EditButton onClick={() => openEditBranch(b)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </OrgTable>
          ) : section === 'departments' ? (
            <OrgTable>
              <thead>
                <tr className="bg-slate-50/90 text-left">
                  <Th>Name</Th>
                  <Th>Code</Th>
                  <Th className="text-center">Employees</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((d) => (
                  <tr
                    key={d.id}
                    className={cn(
                      'group hover:bg-brand-50/40 transition-colors',
                      !d.is_active && 'opacity-55'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 text-[11px] font-bold">
                          {initials(d.name)}
                        </span>
                        <p className="font-semibold text-slate-900 truncate">{d.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <CodeChip value={d.code} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CountChip count={d.employee_count ?? 0} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ActiveToggle
                          active={d.is_active}
                          disabled={toggleDept.isPending}
                          onChange={(is_active) => toggleDept.mutate({ id: d.id, is_active })}
                        />
                        <StatusLabel active={d.is_active} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <EditButton onClick={() => openEditDept(d)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </OrgTable>
          ) : (
            <OrgTable>
              <thead>
                <tr className="bg-slate-50/90 text-left">
                  <Th>Name</Th>
                  <Th>Department</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((d) => (
                  <tr
                    key={d.id}
                    className={cn(
                      'group hover:bg-violet-50/40 transition-colors',
                      !d.is_active && 'opacity-55'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100 text-[11px] font-bold">
                          {initials(d.name)}
                        </span>
                        <p className="font-semibold text-slate-900 truncate">{d.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-100">
                        <Network size={11} className="text-slate-400" />
                        {d.department?.name || 'All departments'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ActiveToggle
                          active={d.is_active}
                          disabled={toggleDesig.isPending}
                          onChange={(is_active) => toggleDesig.mutate({ id: d.id, is_active })}
                        />
                        <StatusLabel active={d.is_active} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <EditButton onClick={() => openEditDesig(d)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </OrgTable>
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
      </DashboardSection>

      {showDeptForm && (
        <Modal title="Add Department" subtitle="Create a new team unit" icon={Layers} tone="brand" onClose={() => setShowDeptForm(false)}>
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
        <Modal title="Edit Department" subtitle="Update department details" icon={Layers} tone="brand" onClose={() => setEditingDept(null)}>
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
        <Modal title="Add Designation" subtitle="Define a role title" icon={Briefcase} tone="violet" onClose={() => setShowDesigForm(false)}>
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
        <Modal title="Edit Designation" subtitle="Update role details" icon={Briefcase} tone="violet" onClose={() => setEditingDesig(null)}>
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
        <Modal title="Add Branch" subtitle="Register a work location" icon={MapPin} tone="teal" onClose={() => setShowBranchForm(false)}>
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
        <Modal title="Edit Branch" subtitle="Update branch details" icon={MapPin} tone="teal" onClose={() => setEditingBranch(null)}>
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

function OrgTable({ children }) {
  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function Th({ children, className }) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500',
        className
      )}
    >
      {children}
    </th>
  );
}

function CodeChip({ value }) {
  if (!value) return <span className="text-slate-400">—</span>;
  return (
    <span className="inline-flex font-mono text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md ring-1 ring-slate-200/80">
      {value}
    </span>
  );
}

function CountChip({ count }) {
  return (
    <span className="inline-flex items-center justify-center gap-1 min-w-[2.25rem] px-2 py-0.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
      <Users size={11} className="text-slate-400" />
      {count}
    </span>
  );
}

function StatusLabel({ active }) {
  return (
    <span
      className={cn(
        'hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-wide',
        active ? 'text-emerald-600' : 'text-slate-400'
      )}
    >
      {active ? 'Active' : 'Off'}
    </span>
  );
}

function EditButton({ onClick }) {
  return (
    <button
      type="button"
      title="Edit"
      onClick={onClick}
      className="inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-brand-700 hover:bg-brand-50 ring-1 ring-transparent hover:ring-brand-100 transition-all opacity-80 group-hover:opacity-100"
    >
      <Pencil size={14} />
    </button>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
    <div className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs border border-red-100 flex items-start gap-2">
      <span className="mt-0.5 font-bold">!</span>
      <span>{message}</span>
    </div>
  );
}

const MODAL_TONES = {
  brand: {
    icon: 'bg-brand-600 text-white shadow-brand-600/30',
    bar: 'from-brand-600 to-sky-500',
  },
  violet: {
    icon: 'bg-violet-500 text-white shadow-violet-500/30',
    bar: 'from-violet-500 to-fuchsia-400',
  },
  teal: {
    icon: 'bg-teal-500 text-white shadow-teal-500/30',
    bar: 'from-teal-500 to-emerald-400',
  },
};

function Modal({ title, subtitle, icon: Icon, tone = 'brand', children, onClose }) {
  const t = MODAL_TONES[tone] || MODAL_TONES.brand;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel max-w-md"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-modal-title"
      >
        <div className={cn('h-1 w-full bg-gradient-to-r shrink-0', t.bar)} />
        <div className="modal-panel-header">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md', t.icon)}>
                <Icon size={18} />
              </span>
            )}
            <div className="min-w-0">
              <h3 id="org-modal-title" className="font-semibold text-slate-900 truncate">
                {title}
              </h3>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="modal-panel-body">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required, placeholder, error }) {
  return (
    <div>
      <label className={cn('ds-label', required && 'ds-label-required')}>{label}</label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('ds-input', error && 'border-red-300 focus:border-red-400 focus:ring-red-200')}
      />
      {error && <p className="ds-field-error">{error}</p>}
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder = 'Select…' }) {
  return (
    <div>
      <label className="ds-label">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="ds-select w-full">
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="ds-checkbox-row">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="text-sm text-slate-700 font-medium">{label}</span>
    </label>
  );
}

function FormActions({ onCancel, loading, submitLabel = 'Save' }) {
  return (
    <div className="flex gap-2 justify-end pt-2">
      <button type="button" onClick={onCancel} className="btn-secondary">
        Cancel
      </button>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? 'Saving…' : submitLabel}
      </button>
    </div>
  );
}
