import { useState } from 'react';
import { useTablePagination, normalizePagination } from '../../hooks/useTablePagination';
import TablePagination from '../../components/shared/TablePagination';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  UserPlus,
  Eye,
  Pencil,
  UserX,
  UserCheck,
  Users,
  Archive,
  Building2,
  Briefcase,
  BadgeCheck,
  X,
} from 'lucide-react';
import { employeeApi, departmentApi, designationApi } from '../../api';
import { StatCard } from '../../components/shared/PageHeader';
import DashboardHero, { DashboardSection } from '../../components/shared/DashboardHero';
import ExportExcelButton from '../../components/shared/ExportExcelButton';
import StatusBadge, { Avatar } from '../../components/shared/StatusBadge';
import { exportEmployeesFromApi } from '../../utils/excelExports';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';
import { ROLE_LABELS } from '../../constants/routes';
import { cn } from '../../utils/helpers';
import AddEmployeeWizard from './AddEmployeeWizard';

const EMPLOYMENT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'probation', label: 'Probation' },
  { value: 'on_notice', label: 'On Notice' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'separated', label: 'Separated' },
];

const STATUS_FILTER_CHIPS = [
  { value: '', label: 'All', tone: 'brand' },
  { value: 'active', label: 'Active', tone: 'emerald' },
  { value: 'probation', label: 'Probation', tone: 'amber' },
  { value: 'on_notice', label: 'On Notice', tone: 'sky' },
  { value: 'portal_deactivated', label: 'Portal Off', tone: 'rose' },
];

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const { selectedTenantId, user } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;
  const canManageEmployees = ['super_admin', 'owner', 'hr'].includes(role);
  const isManager = role === 'manager';
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editEmployeeId, setEditEmployeeId] = useState(null);
  const [viewEmployeeId, setViewEmployeeId] = useState(null);
  const [createNotice, setCreateNotice] = useState(null);
  const { page, limit, setPage, setLimit, queryParams } = useTablePagination({
    resetDeps: [search, departmentFilter, designationFilter, statusFilter, selectedTenantId],
  });

  const listFilters = {
    search: search || undefined,
    tenant_id: selectedTenantId,
    department_id: departmentFilter || undefined,
    designation_id: designationFilter || undefined,
    ...(statusFilter === 'portal_deactivated'
      ? { is_portal_active: false }
      : statusFilter
        ? { status: statusFilter }
        : {}),
  };

  const { data: deptData } = useQuery({
    queryKey: ['departments', selectedTenantId],
    queryFn: () => departmentApi.list({ tenant_id: selectedTenantId, status: 'active' }),
    enabled: !tenantRequired,
  });
  const { data: desigData } = useQuery({
    queryKey: ['designations', selectedTenantId],
    queryFn: () => designationApi.list({ tenant_id: selectedTenantId, status: 'active' }),
    enabled: !tenantRequired,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', selectedTenantId, search, departmentFilter, designationFilter, statusFilter, queryParams],
    queryFn: () =>
      employeeApi.list({
        ...listFilters,
        ...queryParams,
      }),
    enabled: !tenantRequired,
  });

  const deactivateMutation = useMutation({
    mutationFn: employeeApi.deactivate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });

  const reactivateMutation = useMutation({
    mutationFn: employeeApi.reactivate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });

  const employees = data?.data?.employees || [];
  const pagination = normalizePagination(data?.pagination, limit);
  const departments = deptData?.data?.departments || [];
  const designations = desigData?.data?.designations || [];
  const hasActiveFilters = Boolean(search || departmentFilter || designationFilter || statusFilter);

  const handleDeactivate = (emp) => {
    if (!emp.is_portal_active) return;
    if (String(emp.id) === String(user?.id)) {
      window.alert('You cannot deactivate your own portal access.');
      return;
    }
    const confirmed = window.confirm(
      `Deactivate ${emp.first_name} ${emp.last_name} (${emp.emp_code})?\n\nThey will not be able to sign in, and they will be excluded from payroll runs.`
    );
    if (confirmed) deactivateMutation.mutate(emp.id);
  };

  const handleReactivate = (emp) => {
    if (emp.is_portal_active) return;
    const confirmed = window.confirm(
      `Reactivate portal access for ${emp.first_name} ${emp.last_name} (${emp.emp_code})? They will be able to sign in again.`
    );
    if (confirmed) reactivateMutation.mutate(emp.id);
  };

  const clearFilters = () => {
    setSearch('');
    setDepartmentFilter('');
    setDesignationFilter('');
    setStatusFilter('');
  };

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-sky-50" aria-hidden />
        <div className="relative">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <UserPlus size={26} />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Select a tenant</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Go to Tenants and select an organization to manage employees.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHero
        badge={isManager ? 'People · Team' : 'People · Workforce'}
        title="Employees"
        subtitle={
          isManager
            ? 'Your direct reports and team roster'
            : 'Manage workforce profiles, roles, and portal access'
        }
        chips={[
          {
            label: isManager ? 'Reports' : 'Employees',
            value: pagination.total,
            tone: 'sky',
          },
          { label: 'Departments', value: departments.length, tone: 'default' },
          { label: 'Roles', value: designations.length, tone: 'teal' },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/employees/archive"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 transition-colors"
            >
              <Archive size={14} /> Archive
            </Link>
            <ExportExcelButton
              onExport={() => exportEmployeesFromApi({ ...listFilters })}
              className="!bg-white !text-brand-700 !border-0 hover:!bg-sky-50"
            />
            {canManageEmployees && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-brand-700 shadow-sm hover:bg-sky-50 transition-colors"
              >
                <Plus size={14} /> Add Employee
              </button>
            )}
          </div>
        }
      />

      {createNotice && (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2',
            createNotice.email_sent
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          )}
        >
          <div className="min-w-0">
            {createNotice.email_sent ? (
              <p className="flex items-start gap-2">
                <BadgeCheck size={16} className="shrink-0 mt-0.5" />
                Employee created. Welcome email with temporary password was sent.
              </p>
            ) : (
              <p>
                Employee created. Welcome email could not be sent — configure SMTP in Settings.
                {createNotice.temporary_password && (
                  <>
                    {' '}
                    Temporary password:{' '}
                    <span className="font-mono font-semibold">{createNotice.temporary_password}</span>
                  </>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCreateNotice(null)}
            className="text-xs font-semibold underline shrink-0 self-start"
          >
            Dismiss
          </button>
        </div>
      )}

      <DashboardSection title="Overview">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label={isManager ? 'Direct reports' : 'Total employees'}
            value={pagination.total}
            icon={Users}
            tone="brand"
            delta={hasActiveFilters ? 'Filtered result' : 'Current roster'}
            deltaType="neutral"
          />
          <StatCard
            label="Departments"
            value={departments.length}
            icon={Building2}
            tone="sky"
            delta="Active units"
            deltaType="neutral"
          />
          <StatCard
            label="Designations"
            value={designations.length}
            icon={Briefcase}
            tone="violet"
            delta="Role titles"
            deltaType="neutral"
          />
        </div>
      </DashboardSection>

      <DashboardSection title="Directory" accent="bg-brand-600">
        <div className="card overflow-hidden">
          {/* Status chips + filters */}
          <div className="px-4 pt-4 pb-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_FILTER_CHIPS.map((chip) => {
                const selected = statusFilter === chip.value;
                return (
                  <button
                    key={chip.value || 'all'}
                    type="button"
                    onClick={() => setStatusFilter(chip.value)}
                    className={cn(
                      'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-all ring-1',
                      selected
                        ? 'bg-brand-600 text-white ring-brand-600 shadow-sm shadow-brand-600/20'
                        : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:text-slate-800'
                    )}
                  >
                    {chip.label}
                  </button>
                );
              })}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X size={12} /> Clear filters
                </button>
              )}
            </div>

            <div className="toolbar-row">
              <div className="relative flex-1 min-w-0 sm:max-w-sm">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, code, email…"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 transition-shadow"
                />
              </div>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 w-full sm:w-auto sm:min-w-[150px] outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <select
                value={designationFilter}
                onChange={(e) => setDesignationFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 w-full sm:w-auto sm:min-w-[150px] outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
              >
                <option value="">All designations</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 w-full sm:w-auto sm:min-w-[150px] outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
              >
                <option value="">All statuses</option>
                {EMPLOYMENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
                <option value="portal_deactivated">Portal deactivated</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="p-14 text-center">
              <div className="mx-auto mb-3 h-8 w-8 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
              <p className="text-sm text-slate-400">Loading employees…</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-sm text-red-600 font-medium">
                {error.response?.data?.error?.message || error.message}
              </p>
            </div>
          ) : employees.length === 0 ? (
            <div className="p-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <Users size={24} />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {isManager ? 'No direct reports found' : 'No employees found'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'Try adjusting search or filters.'
                  : canManageEmployees
                    ? 'Add your first employee to build the workforce roster.'
                    : 'No records match this view yet.'}
              </p>
              {!hasActiveFilters && canManageEmployees && (
                <button type="button" onClick={() => setShowForm(true)} className="btn-primary mt-5">
                  <Plus size={14} /> Add Employee
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/90 text-left">
                    <Th>Employee</Th>
                    <Th>Employee ID</Th>
                    <Th>Department</Th>
                    <Th>Designation</Th>
                    <Th>Status</Th>
                    <Th>Role</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                    <tr
                      key={emp.id}
                      className={cn(
                        'group hover:bg-brand-50/35 transition-colors',
                        !emp.is_portal_active && 'opacity-70'
                      )}
                    >
                      <td className="px-4 py-3">
                        <Link to={`/employees/${emp.id}`} className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={`${emp.first_name} ${emp.last_name}`} size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate group-hover:text-brand-700 transition-colors">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{emp.email}</p>
                            {emp.personal_email && emp.personal_email !== emp.email && (
                              <p className="text-[10px] text-slate-400 truncate">{emp.personal_email}</p>
                            )}
                            {!emp.is_portal_active && (
                              <span className="inline-flex mt-0.5 text-[10px] font-semibold text-red-600">
                                Portal deactivated
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex font-mono text-[11px] font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md ring-1 ring-slate-200/80">
                          {emp.emp_code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {emp.department?.name ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2 py-1 text-xs text-sky-800 ring-1 ring-sky-100">
                            <Building2 size={11} className="text-sky-500" />
                            {emp.department.name}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {emp.designation?.name ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2 py-1 text-xs text-violet-800 ring-1 ring-violet-100">
                            <Briefcase size={11} className="text-violet-500" />
                            {emp.designation.name}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={emp.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-slate-500">
                          {ROLE_LABELS[emp.system_role] || emp.system_role || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <ActionBtn title="View" onClick={() => setViewEmployeeId(emp.id)}>
                            <Eye size={15} />
                          </ActionBtn>
                          {canManageEmployees && (
                            <>
                              <ActionBtn title="Edit" onClick={() => setEditEmployeeId(emp.id)}>
                                <Pencil size={15} />
                              </ActionBtn>
                              <ActionBtn
                                title={emp.is_portal_active ? 'Deactivate' : 'Reactivate portal'}
                                disabled={
                                  emp.is_portal_active
                                    ? deactivateMutation.isPending
                                    : reactivateMutation.isPending
                                }
                                onClick={() =>
                                  emp.is_portal_active ? handleDeactivate(emp) : handleReactivate(emp)
                                }
                                danger={emp.is_portal_active}
                                success={!emp.is_portal_active}
                              >
                                {emp.is_portal_active ? <UserX size={15} /> : <UserCheck size={15} />}
                              </ActionBtn>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePagination
                page={pagination.page}
                limit={pagination.limit}
                total={pagination.total}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            </div>
          )}
        </div>
      </DashboardSection>

      {showForm && (
        <AddEmployeeWizard
          onClose={() => setShowForm(false)}
          onSuccess={(result) => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            setShowForm(false);
            if (result?.temporary_password || result?.email_sent) {
              setCreateNotice({
                email_sent: result.email_sent,
                temporary_password: result.temporary_password,
                message: result.message,
              });
            }
          }}
        />
      )}

      {editEmployeeId && (
        <AddEmployeeWizard
          mode="edit"
          employeeId={editEmployeeId}
          onClose={() => setEditEmployeeId(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['employee', editEmployeeId] });
            queryClient.invalidateQueries({ queryKey: ['employee-salary-history', editEmployeeId] });
            setEditEmployeeId(null);
          }}
        />
      )}

      {viewEmployeeId && (
        <AddEmployeeWizard
          mode="view"
          employeeId={viewEmployeeId}
          onClose={() => setViewEmployeeId(null)}
        />
      )}
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

function ActionBtn({ title, onClick, disabled, children, danger, success }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'p-1.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed',
        danger
          ? 'text-slate-500 hover:text-red-600 hover:bg-red-50'
          : success
            ? 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
            : 'text-slate-500 hover:text-brand-600 hover:bg-brand-50'
      )}
    >
      {children}
    </button>
  );
}
