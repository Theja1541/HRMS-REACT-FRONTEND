import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Users, X, Crown, UserCog, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { hrApi, employeeApi } from '../../api';
import {
  PROJECT_MEMBER_ROLES,
  PROJECT_MEMBER_ROLE_LABELS,
  PROJECT_MEMBER_ROLE_BADGE,
} from '../../constants/hr';
import { cn } from '../../utils/helpers';

function formatJoinedDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(String(value)), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

function EmployeeRow({ emp, badge, badgeClass, subtitle, actions }) {
  const name = emp ? `${emp.first_name} ${emp.last_name}` : '—';
  return (
    <tr className="hover:bg-slate-50/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold shrink-0">
            {emp?.first_name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-medium text-slate-800">{name}</p>
            {subtitle && <p className="text-[10px] text-slate-400">{subtitle}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-slate-600">{emp?.emp_code || '—'}</td>
      <td className="px-4 py-3">
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded', badgeClass)}>{badge}</span>
      </td>
      {actions}
    </tr>
  );
}

function MembersTable({ title, icon: Icon, members, managerId, canManage, onRemove, onRoleChange, removePending }) {
  if (!members.length) return null;

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
        <Icon size={14} className="text-slate-500" />
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{title}</h4>
        <span className="text-[10px] text-slate-400">({members.length})</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Role</th>
              {canManage && <th className="px-4 py-2 w-40">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((member) => {
              const emp = member.employee;
              const isManager = managerId && emp?.id === managerId;
              return (
                <EmployeeRow
                  key={member.id}
                  emp={emp}
                  badge={PROJECT_MEMBER_ROLE_LABELS[member.role] || member.role}
                  badgeClass={PROJECT_MEMBER_ROLE_BADGE[member.role] || PROJECT_MEMBER_ROLE_BADGE.member}
                  subtitle={formatJoinedDate(member.added_at)}
                  actions={canManage && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!isManager && (
                          <select
                            value={member.role}
                            onChange={(e) => onRoleChange(member, e.target.value)}
                            className="text-xs border border-slate-200 rounded px-2 py-1"
                          >
                            {PROJECT_MEMBER_ROLES.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        )}
                        {!isManager && (
                          <button
                            type="button"
                            onClick={() => onRemove(member)}
                            disabled={removePending}
                            className="text-slate-400 hover:text-red-600 p-1"
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {isManager && <span className="text-[10px] text-slate-400">Set in Settings</span>}
                      </div>
                    </td>
                  )}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ProjectMembersPanel({ projectId, project, canManage }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_id: '', role: 'member' });
  const [formError, setFormError] = useState('');
  const [removeError, setRemoveError] = useState('');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => hrApi.listProjectMembers(projectId),
    enabled: !!projectId,
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-project-members'],
    queryFn: () => employeeApi.list({ limit: 200, status: 'active' }),
    enabled: canManage && showForm,
  });

  const members = data?.data?.members || [];
  const employees = empData?.data?.employees || [];
  const manager = project?.manager;

  const memberEmployeeIds = useMemo(
    () => new Set(members.map((m) => m.employee_id)),
    [members]
  );

  const availableEmployees = useMemo(
    () => employees.filter((emp) => !memberEmployeeIds.has(emp.id)),
    [employees, memberEmployeeIds]
  );

  const grouped = useMemo(() => {
    const teamLeaders = members.filter((m) => m.role === 'team_leader');
    const teamMembers = members.filter((m) => m.role === 'member');
    const admins = members.filter((m) => m.role === 'admin' && m.employee_id !== manager?.id);
    return { teamLeaders, teamMembers, admins };
  }, [members, manager?.id]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
  };

  const addMutation = useMutation({
    mutationFn: (payload) => hrApi.addProjectMember(projectId, payload),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setForm({ employee_id: '', role: 'member' });
      setFormError('');
    },
    onError: (err) => {
      setFormError(err.response?.data?.error?.message || 'Failed to add member');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (employeeId) => hrApi.removeProjectMember(projectId, employeeId),
    onSuccess: () => {
      setRemoveError('');
      invalidate();
    },
    onError: (err) => {
      setRemoveError(err.response?.data?.error?.message || 'Failed to remove member');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ employeeId, role }) => hrApi.updateProjectMember(projectId, employeeId, { role }),
    onSuccess: invalidate,
    onError: (err) => {
      setRemoveError(err.response?.data?.error?.message || 'Failed to update role');
    },
  });

  const handleAdd = (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.employee_id) {
      setFormError('Select an employee');
      return;
    }
    addMutation.mutate({
      employee_id: parseInt(form.employee_id, 10),
      role: form.role,
    });
  };

  const handleRemove = (member) => {
    const name = member.employee
      ? `${member.employee.first_name} ${member.employee.last_name}`
      : 'this member';
    if (!window.confirm(`Remove ${name} from the project team?`)) return;
    removeMutation.mutate(member.employee_id);
  };

  if (isLoading) {
    return <div className="card p-12 text-center text-slate-400">Loading team…</div>;
  }

  if (isError) {
    return (
      <div className="card p-12 text-center">
        <p className="text-red-600 text-sm mb-3">
          {error?.response?.data?.error?.message || 'Failed to load project team'}
        </p>
        <button type="button" onClick={() => refetch()} className="btn-secondary text-xs">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 border border-slate-200 bg-slate-50/80">
        <p className="text-sm font-semibold text-slate-900">Project team structure</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Crown, title: 'Project Manager', text: 'Accountable for delivery, budget, and stakeholder updates. Set in Project Settings.' },
            { icon: UserCog, title: 'Team Leader', text: 'Leads day-to-day execution; assigns tasks and guides the squad.' },
            { icon: User, title: 'Team Member', text: 'Contributes to tasks assigned on the board or list view.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-lg bg-white border border-slate-200 px-3 py-2.5">
              <p className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                <Icon size={12} className="text-brand-600" /> {title}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-slate-800">Team roster</h3>
        {canManage && (
          <button
            type="button"
            onClick={() => { setShowForm(true); setFormError(''); }}
            className="btn-primary text-xs inline-flex items-center gap-1"
          >
            <Plus size={12} /> Add to team
          </button>
        )}
      </div>

      {removeError && (
        <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">{removeError}</div>
      )}

      {manager && (
        <div className="card p-4 border-l-4 border-amber-400">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Project Manager</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-semibold">
              {manager.first_name?.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{manager.first_name} {manager.last_name}</p>
              <p className="text-xs text-slate-500">{manager.emp_code} · {manager.email || '—'}</p>
            </div>
          </div>
        </div>
      )}

      {!manager && (
        <div className="card p-4 border border-dashed border-slate-200 text-sm text-slate-500">
          No project manager assigned. Set one in the <strong>Settings</strong> tab.
        </div>
      )}

      {members.length === 0 && !manager ? (
        <div className="card p-12 text-center">
          <Users size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">No team members yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          <MembersTable
            title="Team Leaders"
            icon={UserCog}
            members={grouped.teamLeaders}
            managerId={manager?.id}
            canManage={canManage}
            onRemove={handleRemove}
            onRoleChange={(member, role) => updateRoleMutation.mutate({ employeeId: member.employee_id, role })}
            removePending={removeMutation.isPending || updateRoleMutation.isPending}
          />
          <MembersTable
            title="Team Members"
            icon={User}
            members={grouped.teamMembers}
            managerId={manager?.id}
            canManage={canManage}
            onRemove={handleRemove}
            onRoleChange={(member, role) => updateRoleMutation.mutate({ employeeId: member.employee_id, role })}
            removePending={removeMutation.isPending || updateRoleMutation.isPending}
          />
          <MembersTable
            title="Project Admins"
            icon={Crown}
            members={grouped.admins}
            managerId={manager?.id}
            canManage={canManage}
            onRemove={handleRemove}
            onRoleChange={(member, role) => updateRoleMutation.mutate({ employeeId: member.employee_id, role })}
            removePending={removeMutation.isPending || updateRoleMutation.isPending}
          />
          {!grouped.teamLeaders.length && !grouped.teamMembers.length && !grouped.admins.length && manager && (
            <p className="text-sm text-slate-400 text-center py-6">Only the project manager is on the team. Add team leaders and members.</p>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAdd} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-slate-900">Add to project team</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">{formError}</div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-600">Employee</label>
              <select
                required
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select employee…</option>
                {availableEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.emp_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Project role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {PROJECT_MEMBER_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                {PROJECT_MEMBER_ROLES.find((r) => r.value === form.role)?.description}
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs">Cancel</button>
              <button type="submit" disabled={addMutation.isPending} className="btn-primary text-xs">
                {addMutation.isPending ? 'Adding…' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
