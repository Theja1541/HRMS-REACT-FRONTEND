import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, BookOpen, ClipboardList, Plus, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { hrApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import SeparationDetailDrawer from '../../components/separation/SeparationDetailDrawer';
import { SEPARATION_STATUSES } from '../../constants/hr';
import { cn, localDateString } from '../../utils/helpers';
import { useTablePagination } from '../../hooks/useTablePagination';
import { useAuthStore } from '../../store/auth.store';
import { resolvePortalRole } from '../../utils/portalContext';

export default function SeparationPage() {
  const queryClient = useQueryClient();
  const { user, workspace, roles, selectedRole, accessToken } = useAuthStore();
  const role = resolvePortalRole({ accessToken, workspace, user, roles, selectedRole });
  const isHrAdmin = ['super_admin', 'owner', 'hr', 'admin'].includes(role);
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [completeError, setCompleteError] = useState(null);
  const { setPage, setLimit, paginateClient } = useTablePagination();
  const [form, setForm] = useState({
    employee_id: '', resignation_date: localDateString(),
    last_working_date: '', reason: '', exit_type: 'resignation',
  });

  const { data, isLoading } = useQuery({ queryKey: ['separations'], queryFn: () => hrApi.listSeparations() });
  const { data: empData } = useQuery({
    queryKey: ['separation-eligible-employees'],
    queryFn: () => hrApi.listSeparationEligibleEmployees({ limit: 500 }),
    enabled: isHrAdmin,
  });

  const createMutation = useMutation({
    mutationFn: hrApi.createSeparation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['separations'] });
      queryClient.invalidateQueries({ queryKey: ['separation-eligible-employees'] });
      setShowForm(false);
      setCompleteError(null);
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }) => hrApi.updateSeparation(id, payload),
    onSuccess: (data, variables) => {
      setCompleteError(null);
      const updated = data?.data?.request;
      if (updated) setSelectedRequest(updated);

      const isEligibilityOnly =
        !variables.status &&
        !variables.fnf_status &&
        (variables.rehire_eligible !== undefined ||
          variables.is_blacklisted !== undefined ||
          variables.rehire_block_reason !== undefined ||
          variables.blacklist_reason !== undefined);

      queryClient.invalidateQueries({ queryKey: ['separations'] });
      queryClient.invalidateQueries({ queryKey: ['separation-hiring-eligibility-events', variables.id] });

      // Status transitions bootstrap clearance / KT / F&F — refresh those panels
      if (!isEligibilityOnly) {
        queryClient.invalidateQueries({ queryKey: ['separation-clearance', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['separation-fnf', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['separation-kt', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['kt-plans'] });
        queryClient.invalidateQueries({ queryKey: ['employee-archive'] });
        queryClient.invalidateQueries({ queryKey: ['separation-exit-interview', variables.id] });
      }
    },
    onError: (err) => {
      const code = err?.response?.data?.error?.code;
      const msg = err?.response?.data?.error?.message;
      if (code === 'CLEARANCE_PENDING' || code === 'CLEARANCE_INCOMPLETE' || code === 'CLEARANCE_REJECTED') {
        setCompleteError(msg || 'Cannot complete: mandatory clearance items are still pending.');
        return;
      }
      if (code === 'KT_PENDING' || code === 'KT_INCOMPLETE') {
        setCompleteError(msg || 'Cannot complete: knowledge transfer must be approved first.');
        return;
      }
      if (code === 'EXIT_INTERVIEW_PENDING' || code === 'EXIT_INTERVIEW_INCOMPLETE') {
        setCompleteError(msg || 'Cannot complete: exit interview must be completed or waived by HR.');
        return;
      }
      if (code === 'ASSET_RETURNS_INCOMPLETE') {
        setCompleteError(msg || 'Cannot complete: all assigned assets must be returned first.');
        return;
      }
      if (code === 'VALIDATION_ERROR') {
        setCompleteError(msg || 'Validation failed');
        return;
      }
      setCompleteError(msg || 'Failed to update separation. Check the server logs and try again.');
    },
  });

  const requests = data?.data?.requests || [];
  const { items: visibleRequests, pagination } = paginateClient(requests);
  const employees = empData?.data?.employees || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="People · Exit"
        title="Separation"
        subtitle={isHrAdmin ? 'Exit workflow, clearance and F&F tracking' : 'Team exit status for your direct reports'}
        actions={
          <div className="flex items-center gap-2">
            {isHrAdmin && (
              <Link to="/clearance-templates" className="btn-secondary text-xs">
                <ClipboardList size={14} /> Manage Templates
              </Link>
            )}
            <Link to="/knowledge-transfer" className="btn-secondary text-xs">
              <BookOpen size={14} /> Knowledge Transfer
            </Link>
            <Link to="/exit-interviews" className="btn-secondary text-xs">
              Exit Interviews
            </Link>
            {isHrAdmin && (
              <Link to="/fnf-settlements" className="btn-secondary text-xs">
                <Banknote size={14} /> F&amp;F Queue
              </Link>
            )}
            {isHrAdmin && (
              <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
                <Plus size={14} /> Initiate Exit
              </button>
            )}
          </div>
        }
      />

      <div className="card overflow-x-auto overscroll-x-contain">
        {isLoading ? (
          <p className="p-8 text-center text-slate-400 text-sm">Loading separations…</p>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">No separation requests</p>
            <p className="text-xs text-slate-500 mt-1">Exit workflows appear here once initiated.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b"><tr>
              <th className="text-left px-4 py-3 font-semibold">Employee</th>
              <th className="text-left px-4 py-3 font-semibold">Exit Type</th>
              <th className="text-left px-4 py-3 font-semibold">Resignation</th>
              <th className="text-left px-4 py-3 font-semibold">LWD</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">F&F</th>
              <th className="px-4 py-3" />
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRequests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.employee?.first_name} {r.employee?.last_name}</p>
                    <p className="text-slate-400">{r.employee?.emp_code} · {r.employee?.department?.name}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{r.exit_type}</td>
                  <td className="px-4 py-3">{r.resignation_date}</td>
                  <td className="px-4 py-3 font-medium">{r.last_working_date}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', SEPARATION_STATUSES[r.status])}>{r.status.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3 capitalize">{r.fnf_status}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(r)}
                        className="btn-secondary text-[10px] py-1 px-2"
                      >
                        <Eye size={12} /> View
                      </button>
                      {isHrAdmin && r.status === 'initiated' && (
                        <button type="button" onClick={() => updateMutation.mutate({ id: r.id, status: 'approved' })} className="btn-secondary text-[10px] py-1">Approve</button>
                      )}
                      {isHrAdmin && r.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => updateMutation.mutate({ id: r.id, status: 'clearance_pending' })}
                          className="btn-secondary text-[10px] py-1"
                          title="Bootstrap clearance, KT, exit interview, assets & F&F"
                        >
                          Start Workflow
                        </button>
                      )}
                      {isHrAdmin && r.status === 'clearance_pending' && (
                        <button
                          type="button"
                          disabled={updateMutation.isPending}
                          onClick={() => { setCompleteError(null); updateMutation.mutate({ id: r.id, status: 'completed', fnf_status: 'processing' }); }}
                          className="btn-primary text-[10px] py-1"
                          title="Complete separation — requires all mandatory clearance items to be done"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {completeError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 flex items-start gap-2">
          <span>{completeError}</span>
          <button type="button" onClick={() => setCompleteError(null)} className="ml-auto text-red-400 hover:text-red-700 leading-none">×</button>
        </div>
      )}
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

      {selectedRequest && (
        <SeparationDetailDrawer
          request={requests.find((r) => r.id === selectedRequest.id) || selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={(payload) => updateMutation.mutateAsync(payload)}
          isUpdating={updateMutation.isPending}
          updateError={completeError}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['separations'] })}
        />
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6">
            <h3 className="font-semibold mb-4">Initiate Separation</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600">Employee</label>
                <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="">Select…</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.emp_code} — {e.first_name} {e.last_name}
                      {e.status === 'probation' ? ' (Probation)' : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Active and probation employees who have already joined. Future joiners, resigned, terminated, and archived staff are excluded.
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Exit Type</label>
                <select value={form.exit_type} onChange={(e) => setForm({ ...form, exit_type: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  {['resignation', 'termination', 'retirement', 'absconding'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Resignation Date</label>
                <input type="date" value={form.resignation_date} onChange={(e) => setForm({ ...form, resignation_date: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600">Last Working Date</label>
                <input type="date" required value={form.last_working_date} onChange={(e) => setForm({ ...form, last_working_date: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600">Reason</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" rows={2} />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              {createMutation.isError && (
                <p className="flex-1 text-xs text-rose-600 self-center">
                  {createMutation.error?.response?.data?.error?.message || 'Failed to initiate separation'}
                </p>
              )}
              <button type="button" onClick={() => { setShowForm(false); createMutation.reset(); }} className="btn-secondary">Cancel</button>
              <button type="button" disabled={!form.employee_id || !form.last_working_date || createMutation.isPending} onClick={() => createMutation.mutate({ ...form, employee_id: parseInt(form.employee_id, 10) })} className="btn-primary">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
