import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, ClipboardList, Plus, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { hrApi, employeeApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import SeparationDetailDrawer from '../../components/separation/SeparationDetailDrawer';
import { SEPARATION_STATUSES } from '../../constants/hr';
import { cn } from '../../utils/helpers';
import { useTablePagination } from '../../hooks/useTablePagination';

export default function SeparationPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [completeError, setCompleteError] = useState(null);
  const { setPage, setLimit, paginateClient } = useTablePagination();
  const [form, setForm] = useState({
    employee_id: '', resignation_date: new Date().toISOString().slice(0, 10),
    last_working_date: '', reason: '', exit_type: 'resignation',
  });

  const { data, isLoading } = useQuery({ queryKey: ['separations'], queryFn: () => hrApi.listSeparations() });
  const { data: empData } = useQuery({ queryKey: ['employees-active'], queryFn: () => employeeApi.list({ status: 'active' }) });

  const createMutation = useMutation({
    mutationFn: hrApi.createSeparation,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['separations'] }); setShowForm(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }) => hrApi.updateSeparation(id, payload),
    onSuccess: (data, variables) => {
      setCompleteError(null);
      queryClient.invalidateQueries({ queryKey: ['separations'] });
      queryClient.invalidateQueries({ queryKey: ['separation-clearance', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['separation-fnf', variables.id] });
      const updated = data?.data?.request;
      if (updated) setSelectedRequest(updated);
    },
    onError: (err) => {
      const code = err?.response?.data?.error?.code;
      const msg = err?.response?.data?.error?.message;
      if (code === 'CLEARANCE_PENDING' || code === 'CLEARANCE_INCOMPLETE' || code === 'CLEARANCE_REJECTED') {
        setCompleteError(msg || 'Cannot complete: mandatory clearance items are still pending.');
      }
    },
  });

  const requests = data?.data?.requests || [];
  const { items: visibleRequests, pagination } = paginateClient(requests);
  const employees = empData?.data?.employees || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Separation"
        subtitle="Exit workflow, clearance and F&F tracking"
        actions={
          <div className="flex items-center gap-2">
            <Link to="/clearance-templates" className="btn-secondary text-xs">
              <ClipboardList size={14} /> Manage Templates
            </Link>
            <Link to="/fnf-settlements" className="btn-secondary text-xs">
              <Banknote size={14} /> F&amp;F Queue
            </Link>
            <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={14} /> Initiate Exit
            </button>
          </div>
        }
      />

      <div className="card overflow-x-auto overscroll-x-contain">
        {isLoading ? <p className="p-8 text-center text-slate-400">Loading…</p> : requests.length === 0 ? (
          <p className="p-12 text-center text-slate-400">No separation requests</p>
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
                      {r.status === 'initiated' && (
                        <button type="button" onClick={() => updateMutation.mutate({ id: r.id, status: 'approved' })} className="btn-secondary text-[10px] py-1">Approve</button>
                      )}
                      {r.status === 'approved' && (
                        <button type="button" onClick={() => updateMutation.mutate({ id: r.id, status: 'clearance_pending' })} className="btn-secondary text-[10px] py-1">Clearance</button>
                      )}
                      {r.status === 'clearance_pending' && (
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
          <span className="font-semibold shrink-0">Cannot complete:</span>
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
          onUpdate={(payload) => updateMutation.mutate(payload)}
          isUpdating={updateMutation.isPending}
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
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.emp_code} — {e.first_name} {e.last_name}</option>)}
                </select>
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
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="button" disabled={!form.employee_id || !form.last_working_date || createMutation.isPending} onClick={() => createMutation.mutate({ ...form, employee_id: parseInt(form.employee_id, 10) })} className="btn-primary">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
