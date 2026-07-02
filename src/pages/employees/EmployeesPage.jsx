import { useState } from 'react';
import { useTablePagination, normalizePagination } from '../../hooks/useTablePagination';
import TablePagination from '../../components/shared/TablePagination';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserPlus, Eye, Pencil, UserX, UserCheck } from 'lucide-react';
import { employeeApi, departmentApi, designationApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import ExportExcelButton from '../../components/shared/ExportExcelButton';
import StatusBadge, { Avatar } from '../../components/shared/StatusBadge';
import { exportEmployeesFromApi } from '../../utils/excelExports';
import { useAuthStore } from '../../store/auth.store';
import { ROLE_LABELS } from '../../constants/routes';
import AddEmployeeWizard from './AddEmployeeWizard';

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;
  const canManageEmployees = ['super_admin', 'owner', 'hr'].includes(user?.role);
  const isManager = user?.role === 'manager';
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editEmployeeId, setEditEmployeeId] = useState(null);
  const [viewEmployeeId, setViewEmployeeId] = useState(null);
  const [createNotice, setCreateNotice] = useState(null);
  const { page, limit, setPage, setLimit, queryParams } = useTablePagination({
    resetDeps: [search, departmentFilter, designationFilter, selectedTenantId],
  });

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
    queryKey: ['employees', selectedTenantId, search, departmentFilter, designationFilter, queryParams],
    queryFn: () =>
      employeeApi.list({
        search,
        tenant_id: selectedTenantId,
        department_id: departmentFilter || undefined,
        designation_id: designationFilter || undefined,
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

  const handleDeactivate = (emp) => {
    if (!emp.is_portal_active) return;
    if (String(emp.id) === String(user?.id)) {
      window.alert('You cannot deactivate your own portal access.');
      return;
    }
    const confirmed = window.confirm(
      `Deactivate portal access for ${emp.first_name} ${emp.last_name} (${emp.emp_code})? They will no longer be able to sign in.`
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

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center">
        <UserPlus size={40} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700">Select a tenant</h3>
        <p className="text-sm text-slate-500 mt-2">Go to Tenants and select an organization to manage employees.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        subtitle={
          isManager
            ? `${pagination.total} direct report${pagination.total === 1 ? '' : 's'}`
            : `${pagination.total} employees`
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportExcelButton
              onExport={() =>
                exportEmployeesFromApi({
                  search: search || undefined,
                  tenant_id: selectedTenantId,
                  department_id: departmentFilter || undefined,
                  designation_id: designationFilter || undefined,
                })
              }
            />
            {canManageEmployees && (
              <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
                <Plus size={14} /> Add Employee
              </button>
            )}
          </div>
        }
      />

      {createNotice && (
        <div
          className={
            createNotice.email_sent
              ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'
              : 'rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'
          }
        >
          {createNotice.email_sent ? (
            <p>Employee created. Welcome email with temporary password was sent.</p>
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
          <button
            type="button"
            onClick={() => setCreateNotice(null)}
            className="mt-2 text-xs font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200 toolbar-row">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex-1 min-w-0 sm:max-w-sm">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code, email…"
              className="border-none bg-transparent text-xs outline-none w-full"
            />
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 w-full sm:w-auto sm:min-w-[140px]"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            value={designationFilter}
            onChange={(e) => setDesignationFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 w-full sm:w-auto sm:min-w-[140px]"
          >
            <option value="">All designations</option>
            {designations.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading employees…</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 text-sm">
            {error.response?.data?.error?.message || error.message}
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 text-sm">
              {isManager ? 'No direct reports found' : 'No employees found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Employee</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Employee ID</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Department</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Designation</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Role</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/employees/${emp.id}`} className="flex items-center gap-2.5">
                        <Avatar name={`${emp.first_name} ${emp.last_name}`} size="sm" />
                        <div>
                          <p className="font-medium text-slate-900">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-slate-400">{emp.email}</p>
                          {emp.personal_email && emp.personal_email !== emp.email && (
                            <p className="text-[10px] text-slate-400">{emp.personal_email}</p>
                          )}
                          {!emp.is_portal_active && (
                            <span className="text-[10px] font-medium text-red-600">Portal deactivated</span>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{emp.emp_code}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.department?.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.designation?.name || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={emp.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{ROLE_LABELS[emp.system_role] || emp.system_role || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="View"
                          onClick={() => setViewEmployeeId(emp.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                        {canManageEmployees && (
                          <>
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => setEditEmployeeId(emp.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          title={emp.is_portal_active ? 'Deactivate' : 'Reactivate portal'}
                          disabled={
                            (emp.is_portal_active ? deactivateMutation.isPending : reactivateMutation.isPending)
                          }
                          onClick={() => (emp.is_portal_active ? handleDeactivate(emp) : handleReactivate(emp))}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            emp.is_portal_active
                              ? 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                              : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {emp.is_portal_active ? <UserX size={15} /> : <UserCheck size={15} />}
                        </button>
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
