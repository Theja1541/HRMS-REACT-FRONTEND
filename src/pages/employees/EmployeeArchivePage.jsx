import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  Archive,
  Eye,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  UserPlus,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { departmentApi, designationApi, employeeApi } from '../../api';
import GenerateExperienceLetterAction from '../../components/employees/GenerateExperienceLetterAction';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { useTablePagination } from '../../hooks/useTablePagination';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../utils/helpers';

function fmtDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(String(value).slice(0, 10)), 'dd MMM yyyy');
  } catch {
    return value;
  }
}

function fmtName(emp) {
  if (!emp) return '—';
  return `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.emp_code || '—';
}

function apiError(err, fallback) {
  return err?.response?.data?.error?.message || fallback;
}

function StatCard({ label, value, tone }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-800',
    emerald: 'bg-emerald-50 text-emerald-800',
    amber: 'bg-amber-50 text-amber-800',
    red: 'bg-red-50 text-red-800',
  };
  return (
    <div className={cn('rounded-xl px-4 py-3', tones[tone] || tones.slate)}>
      <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-xl font-semibold mt-1">{value ?? 0}</p>
    </div>
  );
}

function RehireModal({ employee, onClose, onSuccess }) {
  const [joining, setJoining] = useState(new Date().toISOString().slice(0, 10));
  const [hasProbation, setHasProbation] = useState(true);
  const [probationDurationMonths, setProbationDurationMonths] = useState(6);
  const [departmentId, setDepartmentId] = useState(employee.department_id || '');
  const [designationId, setDesignationId] = useState(employee.designation_id || '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const PROBATION_DURATION_OPTIONS = [1, 2, 3, 6, 9, 12];

  const { data: deptData } = useQuery({
    queryKey: ['departments-lite'],
    queryFn: () => departmentApi.list({ limit: 200 }),
  });
  const { data: desigData } = useQuery({
    queryKey: ['designations-lite'],
    queryFn: () => designationApi.list({ limit: 200 }),
  });

  const departments = deptData?.data?.departments || [];
  const designations = desigData?.data?.designations || [];

  const mutation = useMutation({
    mutationFn: () =>
      employeeApi.rehire(employee.id, {
        date_of_joining: joining,
        has_probation: hasProbation,
        probation_duration_months: hasProbation ? probationDurationMonths : null,
        status: hasProbation ? 'probation' : 'active',
        department_id: departmentId || undefined,
        designation_id: designationId || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err) => setError(apiError(err, 'Rehire failed')),
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm">Rehire {fmtName(employee)}</h3>
          <p className="text-xs text-slate-500 mt-1">
            Starts a new tenure with a new joining date. Same employee record ({employee.emp_code}) —
            payroll, attendance, leave, assets, documents, and F&amp;F history stay intact.
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-[10px] text-slate-500">New date of joining *</label>
            <input
              type="date"
              className="input text-xs w-full mt-1"
              value={joining}
              onChange={(e) => setJoining(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500">Has Probation</label>
            <select
              className="input text-xs w-full mt-1"
              value={hasProbation ? 'yes' : 'no'}
              onChange={(e) => {
                const enabled = e.target.value === 'yes';
                setHasProbation(enabled);
                if (enabled && !probationDurationMonths) setProbationDurationMonths(6);
              }}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          {hasProbation ? (
            <div>
              <label className="text-[10px] text-slate-500">Probation Duration</label>
              <select
                className="input text-xs w-full mt-1"
                value={probationDurationMonths}
                onChange={(e) => setProbationDurationMonths(parseInt(e.target.value, 10))}
              >
                {PROBATION_DURATION_OPTIONS.map((months) => (
                  <option key={months} value={months}>
                    {months} {months === 1 ? 'month' : 'months'}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Start = joining date · End = joining + {probationDurationMonths} month
                {probationDurationMonths === 1 ? '' : 's'}
              </p>
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
              Employee will be rehired as <span className="font-medium text-slate-600">active</span> with no
              probation period.
            </p>
          )}
          <div>
            <label className="text-[10px] text-slate-500">Department</label>
            <select
              className="input text-xs w-full mt-1"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">Keep current</option>
              {(Array.isArray(departments) ? departments : []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500">Designation</label>
            <select
              className="input text-xs w-full mt-1"
              value={designationId}
              onChange={(e) => setDesignationId(e.target.value)}
            >
              <option value="">Keep current</option>
              {(Array.isArray(designations) ? designations : []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500">Notes</label>
            <textarea
              className="input text-xs w-full mt-1 min-h-[64px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional rehire notes"
            />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" className="btn-secondary text-xs" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary text-xs"
            disabled={!joining || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Rehiring…' : 'Confirm rehire'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RestoreModal({ employee, recommendRehire, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('active');
  const [confirmSep, setConfirmSep] = useState(false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      employeeApi.restore(employee.id, {
        reason,
        status,
        confirm_completed_separation: confirmSep,
      }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err) => {
      const msg = apiError(err, 'Restore failed');
      const field = err?.response?.data?.error?.field;
      if (field === 'confirm_completed_separation') {
        setError(`${msg} Tick the confirmation below to proceed, or use Rehire instead.`);
      } else {
        setError(msg);
      }
    },
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm">Restore {fmtName(employee)}</h3>
          <p className="text-xs text-slate-500 mt-1">
            Undoes archive and continues the <span className="font-medium">same</span> employment
            tenure (original joining date). History is never deleted.
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {recommendRehire && (
            <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
              A completed separation exists. Prefer <strong>Rehire</strong> for a new tenure. Restore
              only if the archive was premature or incorrect.
            </p>
          )}
          <div>
            <label className="text-[10px] text-slate-500">Restore to status</label>
            <select
              className="input text-xs w-full mt-1"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="probation">Probation</option>
              <option value="on_leave">On leave</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500">Reason *</label>
            <textarea
              className="input text-xs w-full mt-1 min-h-[72px]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this employee being restored?"
            />
          </div>
          {recommendRehire && (
            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={confirmSep}
                onChange={(e) => setConfirmSep(e.target.checked)}
              />
              I understand this keeps the original joining date despite a completed separation
            </label>
          )}
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" className="btn-secondary text-xs" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary text-xs"
            disabled={!reason.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Restoring…' : 'Confirm restore'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EligibilityForm({ employee, onSaved }) {
  const [rehireEligible, setRehireEligible] = useState(employee.rehireable !== false);
  const [blacklisted, setBlacklisted] = useState(!!employee.is_blacklisted);
  const [rehireBlockReason, setRehireBlockReason] = useState(employee.rehire_block_reason || '');
  const [blacklistReason, setBlacklistReason] = useState(employee.blacklist_reason || '');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setRehireEligible(employee.rehireable !== false);
    setBlacklisted(!!employee.is_blacklisted);
    setRehireBlockReason(employee.rehire_block_reason || '');
    setBlacklistReason(employee.blacklist_reason || '');
  }, [
    employee.id,
    employee.rehireable,
    employee.is_blacklisted,
    employee.rehire_block_reason,
    employee.blacklist_reason,
  ]);

  const mutation = useMutation({
    mutationFn: () =>
      employeeApi.updateArchiveEligibility(employee.id, {
        rehire_eligible: blacklisted ? false : rehireEligible,
        is_blacklisted: blacklisted,
        rehire_block_reason: rehireBlockReason || null,
        blacklist_reason: blacklistReason || null,
        notes: notes || null,
      }),
    onSuccess: () => {
      setFormError('');
      onSaved();
    },
    onError: (err) => setFormError(apiError(err, 'Failed to update eligibility')),
  });

  const save = () => {
    setFormError('');
    if (blacklisted && !blacklistReason.trim()) {
      setFormError('Blacklist reason is required');
      return;
    }
    if (!rehireEligible && !blacklisted && !rehireBlockReason.trim()) {
      setFormError('Provide a reason when marking not rehireable');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="border border-slate-100 rounded-lg p-3 space-y-3">
      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
        <ShieldAlert size={13} /> Rehire eligibility &amp; blacklist
      </p>
      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={rehireEligible && !blacklisted}
          disabled={blacklisted}
          onChange={(e) => setRehireEligible(e.target.checked)}
        />
        Eligible for rehire
      </label>
      {!rehireEligible && !blacklisted && (
        <input
          className="input text-xs w-full"
          placeholder="Reason not rehireable *"
          value={rehireBlockReason}
          onChange={(e) => setRehireBlockReason(e.target.value)}
        />
      )}
      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={blacklisted}
          onChange={(e) => {
            setBlacklisted(e.target.checked);
            if (e.target.checked) setRehireEligible(false);
          }}
        />
        Blacklisted
      </label>
      {blacklisted && (
        <input
          className="input text-xs w-full"
          placeholder="Blacklist reason *"
          value={blacklistReason}
          onChange={(e) => setBlacklistReason(e.target.value)}
        />
      )}
      <input
        className="input text-xs w-full"
        placeholder="Optional notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      {formError && <p className="text-xs text-red-600">{formError}</p>}
      <button
        type="button"
        className="btn-secondary text-xs"
        disabled={mutation.isPending}
        onClick={save}
      >
        {mutation.isPending ? 'Saving…' : 'Save eligibility'}
      </button>
    </div>
  );
}

function ArchiveDetailDrawer({ employeeId, canManage, onClose, onRehire, onRestore }) {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['employee-archive-detail', employeeId],
    queryFn: () => employeeApi.getArchived(employeeId),
    enabled: !!employeeId,
  });

  const detail = data?.data;
  const employee = detail?.employee;
  const history = detail?.employment_history || [];
  const preserved = detail?.preserved_records || {};
  const events = detail?.eligibility_events || [];
  const payslips = detail?.recent_payslips || [];
  const hints = detail?.restore_hints || {};
  const salary = detail?.salary_at_exit;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white w-full max-w-xl h-full shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {employee ? fmtName(employee) : 'Archived employee'}
            </h2>
            {employee && (
              <p className="text-xs text-slate-500 mt-0.5">
                {employee.emp_code} · Archived {fmtDate(employee.archived_at)}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading || !employee ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] uppercase text-slate-400">Department</p>
                  <p className="font-medium text-slate-800 mt-1">{employee.department?.name || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] uppercase text-slate-400">Designation</p>
                  <p className="font-medium text-slate-800 mt-1">{employee.designation?.name || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] uppercase text-slate-400">Joined</p>
                  <p className="font-medium text-slate-800 mt-1">{fmtDate(employee.date_of_joining)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] uppercase text-slate-400">Exit</p>
                  <p className="font-medium text-slate-800 mt-1">{fmtDate(employee.exit_date)}</p>
                </div>
              </div>

              {employee.exit_reason && (
                <div className="text-xs">
                  <p className="text-[10px] uppercase text-slate-400 mb-1">Exit reason</p>
                  <p className="text-slate-700 bg-slate-50 rounded-lg p-3">{employee.exit_reason}</p>
                </div>
              )}

              {salary && (
                <div className="text-xs bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] uppercase text-slate-400 mb-1">Salary at exit</p>
                  <p className="font-medium text-slate-800">
                    CTC ₹{Number(salary.ctc_monthly || 0).toLocaleString('en-IN')}/mo · ₹
                    {Number(salary.ctc_annual || 0).toLocaleString('en-IN')}/yr
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Preserved records</p>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  {[
                    ['Attendance', preserved.attendance],
                    ['Leaves', preserved.leaves],
                    ['Payslips', preserved.payslips],
                    ['Assets', preserved.asset_assignments],
                    ['Documents', preserved.documents],
                    ['F&F', preserved.fnf_settlements],
                  ].map(([label, count]) => (
                    <div key={label} className="border border-slate-100 rounded-lg p-2 text-center">
                      <p className="font-semibold text-slate-800">{count ?? 0}</p>
                      <p className="text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {payslips.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">Recent payslips</p>
                  <ul className="space-y-1.5 text-xs">
                    {payslips.map((p) => (
                      <li
                        key={p.id}
                        className="flex justify-between border border-slate-100 rounded-lg px-3 py-2"
                      >
                        <span className="text-slate-600">
                          {String(p.month).padStart(2, '0')}/{p.year} · {p.status}
                        </span>
                        <span className="font-medium text-slate-800">
                          ₹{Number(p.net_salary || 0).toLocaleString('en-IN')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Employment history</p>
                {history.length === 0 ? (
                  <p className="text-xs text-slate-400">No prior periods recorded</p>
                ) : (
                  <ul className="space-y-2">
                    {history.map((h) => (
                      <li key={h.id} className="border border-slate-100 rounded-lg p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-slate-800">
                            {fmtDate(h.period_start)} → {fmtDate(h.period_end)}
                          </p>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {h.event_type || 'archive'}
                          </span>
                        </div>
                        <p className="text-slate-500 mt-0.5">
                          {h.department?.name || '—'} · {h.designation?.name || '—'} ·{' '}
                          {h.exit_type || '—'}
                        </p>
                        {(h.ctc_monthly || h.exit_reason) && (
                          <p className="text-slate-400 mt-1">
                            {h.ctc_monthly
                              ? `CTC ₹${Number(h.ctc_monthly).toLocaleString('en-IN')}/mo`
                              : ''}
                            {h.ctc_monthly && h.exit_reason ? ' · ' : ''}
                            {h.exit_reason || ''}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {canManage && (
                <EligibilityForm
                  employee={employee}
                  onSaved={() => {
                    refetch();
                    queryClient.invalidateQueries({ queryKey: ['employee-archive'] });
                    queryClient.invalidateQueries({ queryKey: ['employee-archive-stats'] });
                  }}
                />
              )}

              {events.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">Eligibility timeline</p>
                  <ul className="space-y-1.5 text-[11px]">
                    {events.slice(0, 8).map((ev) => (
                      <li key={ev.id} className="border-l-2 border-slate-200 pl-3 py-1">
                        <p className="font-medium text-slate-700">{ev.action}</p>
                        <p className="text-slate-400">
                          {ev.notes || ev.blacklist_reason || ev.rehire_block_reason || '—'}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <Link to={`/employees/${employee.id}`} className="btn-secondary text-xs">
                  Open profile
                </Link>
                {canManage && (
                  <GenerateExperienceLetterAction
                    employeeId={employee.id}
                    employeeCode={employee.emp_code}
                  />
                )}
                {canManage && hints.can_restore && (
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => onRestore(employee, hints)}
                  >
                    <RotateCcw size={13} /> Restore
                  </button>
                )}
                {canManage && employee.rehireable !== false && !employee.is_blacklisted && (
                  <button type="button" className="btn-primary text-xs" onClick={() => onRehire(employee)}>
                    <UserPlus size={13} /> Rehire
                  </button>
                )}
                {employee.is_blacklisted && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 w-full">
                    Blacklisted: {employee.blacklist_reason || 'Blocked from future hiring'}
                  </p>
                )}
                {employee.rehireable === false && !employee.is_blacklisted && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 w-full">
                    Not rehireable: {employee.rehire_block_reason || '—'}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmployeeArchivePage() {
  const queryClient = useQueryClient();
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;
  const canManage = ['super_admin', 'owner', 'hr'].includes(user?.role) || user?.type === 'super_admin';

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [rehireableFilter, setRehireableFilter] = useState('');
  const [blacklistFilter, setBlacklistFilter] = useState('');
  const [exitTypeFilter, setExitTypeFilter] = useState('');
  const [archivedFrom, setArchivedFrom] = useState('');
  const [archivedTo, setArchivedTo] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [rehireTarget, setRehireTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreHints, setRestoreHints] = useState({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { page, limit, setPage, setLimit, queryParams } = useTablePagination({
    resetDeps: [
      debouncedSearch,
      deptFilter,
      rehireableFilter,
      blacklistFilter,
      exitTypeFilter,
      archivedFrom,
      archivedTo,
    ],
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments-lite'],
    queryFn: () => departmentApi.list({ limit: 200 }),
    enabled: !tenantRequired,
  });

  const { data: statsData } = useQuery({
    queryKey: ['employee-archive-stats', selectedTenantId],
    queryFn: () => employeeApi.getArchiveStats(),
    enabled: !tenantRequired,
  });

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      'employee-archive',
      selectedTenantId,
      debouncedSearch,
      deptFilter,
      rehireableFilter,
      blacklistFilter,
      exitTypeFilter,
      archivedFrom,
      archivedTo,
      page,
      limit,
    ],
    queryFn: () =>
      employeeApi.listArchived({
        search: debouncedSearch || undefined,
        department_id: deptFilter || undefined,
        rehireable: rehireableFilter === '' ? undefined : rehireableFilter === 'true',
        is_blacklisted: blacklistFilter === '' ? undefined : blacklistFilter === 'true',
        exit_type: exitTypeFilter || undefined,
        archived_from: archivedFrom || undefined,
        archived_to: archivedTo || undefined,
        ...queryParams,
      }),
    enabled: !tenantRequired,
  });

  const employees = data?.data?.employees || [];
  const pagination = data?.data?.pagination;
  const departments = deptData?.data?.departments || [];
  const stats = statsData?.data || {};

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['employee-archive'] });
    queryClient.invalidateQueries({ queryKey: ['employee-archive-stats'] });
    queryClient.invalidateQueries({ queryKey: ['employee-archive-detail'] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  };

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to view the employee archive.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Archive"
        subtitle="Complete employment history retained — payroll, attendance, leave, assets, documents, and F&F stay linked to the same employee record"
        actions={
          <div className="flex gap-2">
            <Link to="/employees" className="btn-secondary text-xs">
              Active directory
            </Link>
            <button type="button" className="btn-secondary text-xs" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Archived" value={stats.total} tone="slate" />
        <StatCard label="Rehireable" value={stats.rehireable} tone="emerald" />
        <StatCard label="Not rehireable" value={stats.not_rehireable} tone="amber" />
        <StatCard label="Blacklisted" value={stats.blacklisted} tone="red" />
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              className="pl-7 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs w-56"
              placeholder="Name, code, email, phone, PAN…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All departments</option>
            {(Array.isArray(departments) ? departments : []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            value={exitTypeFilter}
            onChange={(e) => setExitTypeFilter(e.target.value)}
          >
            <option value="">Exit type: all</option>
            <option value="resignation">Resignation</option>
            <option value="termination">Termination</option>
            <option value="retirement">Retirement</option>
            <option value="absconding">Absconding</option>
            <option value="manual_archive">Manual archive</option>
          </select>
          <select
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            value={rehireableFilter}
            onChange={(e) => setRehireableFilter(e.target.value)}
          >
            <option value="">Rehireable: all</option>
            <option value="true">Rehireable only</option>
            <option value="false">Not rehireable</option>
          </select>
          <select
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            value={blacklistFilter}
            onChange={(e) => setBlacklistFilter(e.target.value)}
          >
            <option value="">Blacklist: all</option>
            <option value="true">Blacklisted only</option>
            <option value="false">Not blacklisted</option>
          </select>
          <input
            type="date"
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            value={archivedFrom}
            onChange={(e) => setArchivedFrom(e.target.value)}
            title="Archived from"
          />
          <input
            type="date"
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            value={archivedTo}
            onChange={(e) => setArchivedTo(e.target.value)}
            title="Archived to"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
            <Loader2 size={18} className="animate-spin" /> Loading archive…
          </div>
        ) : employees.length === 0 ? (
          <div className="py-16 text-center">
            <Archive size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No archived employees found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-slate-500">
                    <th className="text-left px-4 py-3 font-semibold">Employee</th>
                    <th className="text-left px-4 py-3 font-semibold">Department</th>
                    <th className="text-left px-4 py-3 font-semibold">Exit</th>
                    <th className="text-left px-4 py-3 font-semibold">Archived</th>
                    <th className="text-left px-4 py-3 font-semibold">Rehireable</th>
                    <th className="text-left px-4 py-3 font-semibold">Blacklist</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{fmtName(emp)}</p>
                        <p className="text-slate-400">{emp.emp_code}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{emp.department?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <p>{fmtDate(emp.exit_date)}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[160px]">
                          {emp.exit_reason || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{fmtDate(emp.archived_at)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                            emp.rehireable !== false
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          )}
                        >
                          {emp.rehireable !== false ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                            emp.is_blacklisted
                              ? 'bg-red-50 text-red-700'
                              : 'bg-slate-100 text-slate-500'
                          )}
                        >
                          {emp.is_blacklisted ? 'Blacklisted' : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="btn-secondary text-[10px] py-1 mr-1"
                          onClick={() => setSelectedId(emp.id)}
                        >
                          <Eye size={12} /> View
                        </button>
                        {canManage && !emp.is_blacklisted && (
                          <button
                            type="button"
                            className="btn-secondary text-[10px] py-1 mr-1"
                            onClick={() => {
                              setRestoreTarget(emp);
                              setRestoreHints({
                                recommend_rehire: false,
                                has_completed_separation: false,
                              });
                            }}
                          >
                            <RotateCcw size={12} /> Restore
                          </button>
                        )}
                        {canManage && emp.rehireable !== false && !emp.is_blacklisted && (
                          <button
                            type="button"
                            className="btn-primary text-[10px] py-1"
                            onClick={() => setRehireTarget(emp)}
                          >
                            <UserPlus size={12} /> Rehire
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && (
              <TablePagination
                page={pagination.page}
                limit={pagination.limit}
                total={pagination.total}
                totalPages={pagination.total_pages}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            )}
          </>
        )}
      </div>

      {selectedId && (
        <ArchiveDetailDrawer
          employeeId={selectedId}
          canManage={canManage}
          onClose={() => setSelectedId(null)}
          onRehire={(emp) => {
            setSelectedId(null);
            setRehireTarget(emp);
          }}
          onRestore={(emp, hints) => {
            setSelectedId(null);
            setRestoreTarget(emp);
            setRestoreHints(hints || {});
          }}
        />
      )}

      {rehireTarget && (
        <RehireModal
          employee={rehireTarget}
          onClose={() => setRehireTarget(null)}
          onSuccess={invalidate}
        />
      )}

      {restoreTarget && (
        <RestoreModal
          employee={restoreTarget}
          recommendRehire={!!restoreHints.recommend_rehire || !!restoreHints.has_completed_separation}
          onClose={() => {
            setRestoreTarget(null);
            setRestoreHints({});
          }}
          onSuccess={invalidate}
        />
      )}
    </div>
  );
}
