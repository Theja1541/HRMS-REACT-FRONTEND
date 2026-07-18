import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, MoreHorizontal, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { attendanceApi, departmentApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import ExportExcelButton from '../../components/shared/ExportExcelButton';
import TablePagination from '../../components/shared/TablePagination';
import ShiftRosterPanel from '../../modules/Attendance/ShiftRosterPanel';
import { exportAttendanceDailyExcel, exportAttendanceRegisterExcel } from '../../utils/excelExports';
import { useAuthStore } from '../../store/auth.store';
import { ATTENDANCE_STATUS } from '../../constants/hr';
import { cn } from '../../utils/helpers';
import CalendarColumnLegend from '../../components/attendance/CalendarColumnLegend';
import {
  buildDateMetaMap,
  columnTitle,
  dayOfWeekShort,
  getCalendarColumnClasses,
} from '../../utils/calendarGrid.utils';
import { useTablePagination } from '../../hooks/useTablePagination';
import MarkAttendanceModal from '../../components/attendance/MarkAttendanceModal';
import MonthlyBulkEditBar from '../../components/attendance/MonthlyBulkEditBar';

const TABS = [
  { id: 'daily', label: 'Daily Attendance' },
  { id: 'monthly', label: 'Monthly Register' },
  { id: 'roster', label: 'Shift Roster' },
];

const DAILY_BULK_STATUSES = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'on_leave', label: 'Paid Leave' },
];

const MORE_STATUSES = [
  { value: 'half_day', label: 'Half Day' },
  { value: 'on_leave', label: 'Paid Leave' },
  { value: 'absent', label: 'Unpaid Leave (LOP)' },
  { value: 'wfh', label: 'Work From Home' },
  { value: 'late', label: 'Late' },
  { value: 'comp_off', label: 'Comp Off' },
];

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function StatusBadge({ status, source, leaveType }) {
  if (!status) {
    return (
      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 uppercase">
        Unmarked
      </span>
    );
  }
  const cfg = ATTENDANCE_STATUS[status];
  const leaveDot =
    source === 'leave_sync' && leaveType?.color_code ? (
      <span
        className="inline-block w-2 h-2 rounded-full mr-1 shrink-0"
        style={{ backgroundColor: leaveType.color_code }}
        title={`Synced from approved ${leaveType.name || leaveType.code} leave`}
      />
    ) : null;
  if (!cfg) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 capitalize">
        {leaveDot}
        {status.replace(/_/g, ' ')}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase', cfg.color)}>
      {leaveDot}
      {cfg.full}
      {source === 'leave_sync' && <span className="ml-1 opacity-70 normal-case">(leave)</span>}
    </span>
  );
}

function AttendanceStatusCell({ status, dayType, source, leaveType }) {
  if (status) return <StatusBadge status={status} source={source} leaveType={leaveType} />;
  if (dayType === 'weekend') return <StatusBadge status="weekend" />;
  if (dayType === 'holiday') return <StatusBadge status="holiday" />;
  return <StatusBadge status={null} />;
}

function ShiftCell({ shift }) {
  if (!shift) return <span className="text-slate-300 text-xs">—</span>;
  if (shift.week_off) {
    return <span className="text-[10px] font-semibold text-slate-400">OFF</span>;
  }
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold text-white"
      style={{ backgroundColor: shift.color || '#6366f1' }}
      title={`${shift.name} (${String(shift.start_time).slice(0, 5)}–${String(shift.end_time).slice(0, 5)})`}
    >
      {shift.code}
    </span>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', color)}>{value}</p>
    </div>
  );
}

export default function AttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const tabParam = searchParams.get('tab');
  const tab = tabParam === 'monthly' ? 'monthly' : tabParam === 'roster' ? 'roster' : 'daily';

  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [departmentId, setDepartmentId] = useState('');
  const [bulkStatus, setBulkStatus] = useState('present');
  const [openMenu, setOpenMenu] = useState(null);
  const [toast, setToast] = useState(null);
  const [modalState, setModalState] = useState({ isOpen: false, employee: null, status: 'present' });
  const menuRef = useRef(null);
  const {
    setPage: setDailyPage,
    setLimit: setDailyLimit,
    paginateClient: paginateDailyRows,
  } = useTablePagination({ resetDeps: [tab, selectedDate, departmentId] });
  const {
    setPage: setSummaryPage,
    setLimit: setSummaryLimit,
    paginateClient: paginateSummaries,
  } = useTablePagination({ resetDeps: [tab, month, year, departmentId] });

  const isManager = user?.role === 'manager';
  const canFinalize = ['super_admin', 'owner', 'admin', 'hr'].includes(user?.role);
  const canEditAttendance = ['super_admin', 'owner', 'admin', 'manager'].includes(user?.role);
  const { data: deptData } = useQuery({
    queryKey: ['departments', 'active'],
    queryFn: () => departmentApi.list({ status: 'active' }),
    staleTime: 5 * 60_000,
  });

  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ['attendance-daily', selectedDate, departmentId],
    queryFn: () =>
      attendanceApi.daily({
        date: selectedDate,
        ...(departmentId ? { department_id: departmentId } : {}),
      }),
    enabled: tab === 'daily',
    staleTime: 30_000,
    refetchOnMount: 'always',
    placeholderData: (previous) => previous,
  });

  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['attendance-register', month, year, departmentId],
    queryFn: () =>
      attendanceApi.register({
        month,
        year,
        ...(departmentId ? { department_id: departmentId } : {}),
      }),
    enabled: tab === 'monthly',
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });

  const { data: finalizationData } = useQuery({
    queryKey: ['attendance-finalization', month, year],
    queryFn: () => attendanceApi.getFinalization({ month, year }),
    enabled: tab === 'monthly',
    staleTime: 30_000,
  });
  const finalization = finalizationData?.data;
  const incompleteList = finalization?.incomplete || [];
  const incompleteByEmployeeId = Object.fromEntries(
    incompleteList.map((row) => [row.employee_id, row])
  );

  const finalizeMutation = useMutation({
    mutationFn: () => attendanceApi.finalize({ month, year }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-finalization', month, year] });
      setToast('Attendance finalized — payroll can now be generated for this month');
      setTimeout(() => setToast(null), 4000);
    },
    onError: (err) => {
      const incomplete = err.response?.data?.error?.incomplete;
      const message =
        incomplete?.length > 0
          ? `Cannot finalize — ${incomplete.length} employee(s) have incomplete attendance`
          : err.response?.data?.error?.message || 'Failed to finalize attendance';
      setToast(message);
      setTimeout(() => setToast(null), 5000);
    },
  });

  const unfinalizeMutation = useMutation({
    mutationFn: () => attendanceApi.unfinalize({ month, year }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-finalization', month, year] });
      setToast('Attendance unlocked — marking is allowed again');
      setTimeout(() => setToast(null), 4000);
    },
    onError: (err) => {
      setToast(err.response?.data?.error?.message || 'Failed to unlock attendance');
      setTimeout(() => setToast(null), 5000);
    },
  });

  const markMutation = useMutation({
    mutationFn: attendanceApi.mark,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-daily'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-register'] });
      setOpenMenu(null);
      if (res.data?.comp_off?.creditDays) {
        setToast(`Comp-off credited: ${res.data.comp_off.creditDays} day(s)`);
        setTimeout(() => setToast(null), 4000);
      }
    },
    onError: (err) => {
      setToast(err.response?.data?.error?.message || 'Unable to mark attendance');
      setTimeout(() => setToast(null), 5000);
    },
  });

  const revokeWfhMutation = useMutation({
    mutationFn: attendanceApi.revokeWfh,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-daily'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-register'] });
      setOpenMenu(null);
      setToast('WFH revoked — attendance cleared for this date');
      setTimeout(() => setToast(null), 4000);
    },
    onError: (err) => {
      const message = err.response?.data?.error?.message || 'Unable to revoke WFH';
      setToast(message);
      setTimeout(() => setToast(null), 4000);
    },
  });

  const bulkMutation = useMutation({
    mutationFn: attendanceApi.bulkMark,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-daily'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-register'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-finalization', month, year] });
      const updated = res.data?.updated ?? res.data?.count ?? 0;
      const skipped = res.data?.skipped_leave_sync || 0;
      if (res.data?.comp_off_credited) {
        setToast(`Updated ${updated} · Comp-off credited for ${res.data.comp_off_credited}`);
      } else if (skipped) {
        setToast(`Updated ${updated} · Skipped ${skipped} leave-synced day(s)`);
      } else {
        setToast(`Attendance updated for ${updated} employee(s)`);
      }
      setTimeout(() => setToast(null), 4000);
    },
    onError: (err) => {
      setToast(err.response?.data?.error?.message || 'Unable to update attendance');
      setTimeout(() => setToast(null), 5000);
    },
  });

  const dailyRows = dailyData?.data?.rows || [];
  const dayType = dailyData?.data?.day_type || 'working';
  const grid = monthlyData?.data?.grid || [];
  const dates = monthlyData?.data?.dates || [];
  const dateMeta = monthlyData?.data?.date_meta || [];
  const dateMetaMap = buildDateMetaMap(dateMeta.length ? dateMeta : grid[0]?.days?.map((d) => ({ date: d.date, day_type: d.day_type })));
  const summaries = monthlyData?.data?.summaries || [];
  const totals = monthlyData?.data?.totals || { present: 0, absent: 0, leave: 0, lop: 0 };
  const departments = deptData?.data?.departments || [];
  const { items: visibleDailyRows, pagination: dailyPagination } = paginateDailyRows(dailyRows);
  const { items: visibleSummaries, pagination: summaryPagination } = paginateSummaries(summaries);

  const setTab = (next) => {
    if (next === 'daily') setSearchParams({});
    else setSearchParams({ tab: next });
  };

  const shiftMonth = (delta) => {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  };

  const markEmployee = (employeeId, status, row) => {
    if (row?.source === 'leave_sync') {
      if (!window.confirm('This day is synced from an approved leave. Override and change attendance?')) return;
      markMutation.mutate({
        employee_id: employeeId,
        date: selectedDate,
        status,
        force_override: true,
      });
      return;
    }
    setModalState({ isOpen: true, employee: row.employee, status, record: row });
  };

  const handleSaveAttendance = (payload) => {
    const body = {
      ...payload,
      ...(modalState.forceOverride ? { force_override: true } : {}),
    };
    markMutation.mutate(body, {
      onSuccess: () =>
        setModalState({
          isOpen: false,
          employee: null,
          status: 'present',
          record: null,
          date: null,
          forceOverride: false,
        }),
    });
  };

  const revokeWfh = (employeeId) => {
    if (!window.confirm('Revoke WFH for this employee on the selected date?')) return;
    revokeWfhMutation.mutate({ employee_id: employeeId, date: selectedDate });
  };

  const applyToAll = () => {
    const records = dailyRows.map((row) => ({
      employee_id: row.employee.id,
      date: selectedDate,
      status: bulkStatus,
    }));
    if (!records.length) return;
    bulkMutation.mutate({ records });
  };

  const openMonthlyCellEdit = (employee, day) => {
    if (!canEditAttendance || finalization?.finalized) return;
    if (day.source === 'leave_sync') {
      if (!window.confirm('This day is synced from an approved leave. Override and edit attendance?')) return;
    }
    setModalState({
      isOpen: true,
      employee,
      status: day.status || 'present',
      record: day.status
        ? {
            status: day.status,
            check_in: day.check_in,
            check_out: day.check_out,
            notes: day.notes,
            source: day.source,
          }
        : null,
      date: day.date,
      forceOverride: day.source === 'leave_sync',
    });
  };

  const applyMonthlyBulk = ({ mode, date, status, check_in, check_out }) => {
    if (!grid.length || !date) return;

    const eligible = grid.filter(({ days }) => {
      const day = days.find((d) => d.date === date);
      return day && day.day_type !== 'not_employed';
    });
    if (!eligible.length) {
      setToast('No employed staff on this date to update');
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const label =
      mode === 'status'
        ? `Apply "${status.replace(/_/g, ' ')}" to ${eligible.length} employee(s) on ${date}?`
        : mode === 'check_in'
          ? `Set check-in for ${eligible.length} employee(s) on ${date}?`
          : `Set check-out for ${eligible.length} employee(s) on ${date}?`;
    if (!window.confirm(label)) return;

    const records = eligible.map(({ employee }) => {
      const base = { employee_id: employee.id, date };
      if (mode === 'status') return { ...base, status };
      if (mode === 'check_in') return { ...base, status: status || 'present', check_in };
      return { ...base, check_out };
    });

    bulkMutation.mutate({ records });
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (tab === 'daily') {
      queryClient.invalidateQueries({ queryKey: ['attendance-daily'] });
    }
  }, [tab, queryClient]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        subtitle={
          tab === 'roster'
            ? 'Plan rotational shifts and weekly rosters'
            : isManager
              ? 'Mark attendance for your direct reports (including weekends & holidays)'
              : 'Mark attendance for all employees (including weekends & holidays)'
        }
      />

      {toast && (
        <div className="text-xs px-3 py-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-100">
          {toast}
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200 scroll-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
              tab === t.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'roster' ? (
        <ShiftRosterPanel />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 min-w-[160px]"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {tab === 'daily' ? (
              <>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700"
                />
                {(dayType === 'weekend' || dayType === 'holiday') && (
                  <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                    {dayType === 'holiday' ? 'Company holiday' : 'Weekend'} — marking allowed; present work auto-credits comp-off
                  </span>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <ExportExcelButton
                    disabled={!dailyRows.length || dailyLoading}
                    onExport={() => exportAttendanceDailyExcel(dailyData)}
                  />
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
                  >
                    {DAILY_BULK_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={applyToAll}
                    disabled={bulkMutation.isPending || !dailyRows.length}
                    className="btn-primary"
                  >
                    {bulkMutation.isPending ? 'Applying…' : 'Apply to All'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 ml-auto">
                <button type="button" onClick={() => shiftMonth(-1)} className="btn-secondary p-2">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-sm font-medium px-2 min-w-[100px] text-center">
                  {new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                </span>
                <button type="button" onClick={() => shiftMonth(1)} className="btn-secondary p-2">
                  <ChevronRight size={14} />
                </button>
                <ExportExcelButton
                  label="Export Register"
                  disabled={!grid.length || monthlyLoading}
                  onExport={() => exportAttendanceRegisterExcel(monthlyData)}
                />
                {canFinalize && (
                  finalization?.finalized ? (
                    <button
                      type="button"
                      className="btn-secondary text-xs inline-flex items-center gap-1.5"
                      disabled={unfinalizeMutation.isPending}
                      onClick={() => {
                        if (window.confirm('Unlock attendance for this month? Marking will be allowed again until re-finalized.')) {
                          unfinalizeMutation.mutate();
                        }
                      }}
                    >
                      <Unlock size={14} />
                      {unfinalizeMutation.isPending ? 'Unlocking…' : 'Unlock Attendance'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary text-xs inline-flex items-center gap-1.5"
                      disabled={finalizeMutation.isPending}
                      onClick={() => {
                        if (window.confirm('Finalize attendance for this month? Payroll can run only after finalization, and marking will be locked.')) {
                          finalizeMutation.mutate();
                        }
                      }}
                    >
                      <Lock size={14} />
                      {finalizeMutation.isPending ? 'Finalizing…' : 'Finalize Attendance'}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {tab === 'monthly' && finalization && (
            <div
              className={cn(
                'rounded-lg border text-xs',
                finalization.finalized
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                  : 'bg-amber-50 text-amber-900 border-amber-100'
              )}
            >
              <div className="px-3 py-2 flex items-start gap-2">
                {!finalization.finalized && finalization.incomplete_count > 0 && (
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                )}
                <div className="min-w-0 flex-1">
                  {finalization.finalized
                    ? `Attendance finalized${finalization.finalized_at ? ` on ${new Date(finalization.finalized_at).toLocaleString('en-IN')}` : ''} — payroll generation is allowed; marking is locked.`
                    : finalization.incomplete_count > 0
                      ? `Not finalized — ${finalization.incomplete_count} employee(s) have incomplete attendance (unmarked working days and/or missing check-outs). Fix the list below before finalizing.`
                      : 'Not finalized — finalize attendance before generating payroll for this month.'}
                </div>
              </div>

              {!finalization.finalized && incompleteList.length > 0 && (
                <div className="border-t border-amber-200/70 bg-white/60 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-amber-800/80">
                        <th className="px-3 py-2 font-semibold">Employee</th>
                        <th className="px-3 py-2 font-semibold text-center">Unmarked days</th>
                        <th className="px-3 py-2 font-semibold text-center">Missing check-outs</th>
                        <th className="px-3 py-2 font-semibold">Issue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {incompleteList.map((row) => {
                        const parts = [];
                        if (row.unmarked_days > 0) parts.push(`${row.unmarked_days} unmarked`);
                        if (row.missing_checkouts_count > 0) {
                          parts.push(`${row.missing_checkouts_count} missing check-out`);
                        }
                        return (
                          <tr key={row.employee_id} className="bg-white/40">
                            <td className="px-3 py-2">
                              <span className="font-mono text-slate-500 mr-1.5">{row.emp_code}</span>
                              <span className="font-medium text-slate-800">{row.name}</span>
                            </td>
                            <td className="px-3 py-2 text-center font-semibold text-orange-700">
                              {row.unmarked_days || 0}
                            </td>
                            <td className="px-3 py-2 text-center font-semibold text-amber-700">
                              {row.missing_checkouts_count || 0}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {parts.join(' · ') || 'Incomplete'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="px-3 py-2 text-[11px] text-amber-800/80 border-t border-amber-100">
                    Tip: the grid can show Present (P) while check-out is still missing — use Bulk Check-out or click a day cell to set punch times.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === 'daily' && (
            <div className="card overflow-x-auto overscroll-x-contain">
              {dailyLoading && !dailyData ? (
                <div className="p-12 text-center text-slate-400 text-sm">Loading attendance…</div>
              ) : dailyRows.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  {isManager ? 'No direct reports found' : 'No employees found'}
                </div>
              ) : (
                <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Employee Name</th>
                        <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Employee ID</th>
                        <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Department</th>
                        <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Shift</th>
                        <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Attendance Status</th>
                        <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Check In</th>
                        <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Check Out</th>
                        <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Hours</th>
                        <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleDailyRows.map((row) => {
                        const emp = row.employee;
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {emp.first_name} {emp.last_name}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-600">{emp.emp_code}</td>
                            <td className="px-4 py-3 text-slate-600">{emp.department?.name || '—'}</td>
                            <td className="px-4 py-3">
                              <ShiftCell shift={row.shift} />
                            </td>
                            <td className="px-4 py-3">
                              <AttendanceStatusCell
                                status={row.status}
                                dayType={row.day_type}
                                source={row.source}
                                leaveType={row.leave_type}
                              />
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                              {row.check_in ? new Date(row.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                              {row.check_out ? new Date(row.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                            </td>
                            <td className="px-4 py-3 text-xs font-bold text-slate-700">
                              {row.effective_hours != null ? `${row.effective_hours}h` : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5 relative">
                                {row.status === 'wfh' && (
                                  <button
                                    type="button"
                                    disabled={revokeWfhMutation.isPending}
                                    onClick={() => revokeWfh(emp.id)}
                                    className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-40"
                                  >
                                    Revoke WFH
                                  </button>
                                )}
                                {row.source !== 'leave_sync' && (
                                <button
                                  type="button"
                                  disabled={markMutation.isPending}
                                  onClick={() => markEmployee(emp.id, 'present', row)}
                                  className="px-3 py-1 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40"
                                >
                                  Present
                                </button>
                                )}
                                {row.source !== 'leave_sync' && (
                                <button
                                  type="button"
                                  disabled={markMutation.isPending}
                                  onClick={() => markEmployee(emp.id, 'absent', row)}
                                  className="px-3 py-1 rounded-lg text-xs font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-40"
                                >
                                  Absent
                                </button>
                                )}
                                <div className="relative" ref={openMenu === emp.id ? menuRef : null}>
                                  <button
                                    type="button"
                                    onClick={() => setOpenMenu(openMenu === emp.id ? null : emp.id)}
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                                  >
                                    <MoreHorizontal size={16} />
                                  </button>
                                  {openMenu === emp.id && (
                                    <div className="absolute right-0 top-9 z-20 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1">
                                      {row.status === 'wfh' && (
                                        <button
                                          type="button"
                                          onClick={() => revokeWfh(emp.id)}
                                          className="w-full text-left px-3 py-2 text-xs text-blue-700 hover:bg-blue-50 border-b border-slate-100"
                                        >
                                          Revoke WFH
                                        </button>
                                      )}
                                      {MORE_STATUSES.map((s) => (
                                        <button
                                          key={s.value}
                                          type="button"
                                          onClick={() => markEmployee(emp.id, s.value, row)}
                                          className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                                        >
                                          {s.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <TablePagination
                  page={dailyPagination.page}
                  limit={dailyPagination.limit}
                  total={dailyPagination.total}
                  totalPages={dailyPagination.totalPages}
                  onPageChange={setDailyPage}
                  onLimitChange={setDailyLimit}
                />
                </>
              )}
            </div>
          )}

          {tab === 'monthly' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard label="Total Present Days" value={totals.present} color="text-emerald-600" />
                <SummaryCard label="Total Absent Days" value={totals.absent} color="text-red-600" />
                <SummaryCard label="Total Leave Days" value={totals.leave} color="text-purple-600" />
                <SummaryCard label="Total LOP Days" value={totals.lop} color="text-orange-600" />
              </div>

              {canEditAttendance && (
                <MonthlyBulkEditBar
                  dates={dates}
                  employeeCount={grid.length}
                  disabled={!!finalization?.finalized}
                  isPending={bulkMutation.isPending}
                  onApply={applyMonthlyBulk}
                />
              )}

              <div className="card overflow-x-auto overscroll-x-contain">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800">Employee-wise Summary</h3>
                </div>
                {monthlyLoading && !monthlyData ? (
                  <div className="p-8 text-center text-slate-400 text-sm">Loading summary…</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left">
                          <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Employee</th>
                          <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-center">Present</th>
                          <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-center">Absent</th>
                          <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-center">Leave</th>
                          <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-center">LOP</th>
                          <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600 text-center">Total Hours</th>
                          <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 text-center">Issues</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visibleSummaries.map((s) => {
                          const issue = incompleteByEmployeeId[s.employee_id];
                          return (
                            <tr
                              key={s.employee_id}
                              className={cn('hover:bg-slate-50', issue && 'bg-amber-50/70')}
                            >
                              <td className="px-4 py-3">
                                <span className="text-slate-400 font-mono text-xs mr-2">{s.emp_code}</span>
                                <span className="font-medium text-slate-900">{s.name}</span>
                                {issue && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                    Incomplete
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center text-emerald-700 font-medium">{s.present}</td>
                              <td className="px-4 py-3 text-center text-red-600 font-medium">{s.absent}</td>
                              <td className="px-4 py-3 text-center text-purple-600 font-medium">{s.leave}</td>
                              <td className="px-4 py-3 text-center text-orange-600 font-medium">{s.lop}</td>
                              <td className="px-4 py-3 text-center text-brand-700 font-bold">{s.total_hours ? `${s.total_hours}h` : '—'}</td>
                              <td className="px-4 py-3 text-center text-[11px] text-amber-800">
                                {issue
                                  ? [
                                      issue.unmarked_days > 0 ? `${issue.unmarked_days} unmarked` : null,
                                      issue.missing_checkouts_count > 0
                                        ? `${issue.missing_checkouts_count} no check-out`
                                        : null,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ') || '—'
                                  : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <TablePagination
                  page={summaryPagination.page}
                  limit={summaryPagination.limit}
                  total={summaryPagination.total}
                  totalPages={summaryPagination.totalPages}
                  onPageChange={setSummaryPage}
                  onLimitChange={setSummaryLimit}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.entries(ATTENDANCE_STATUS).map(([key, val]) => (
                  <span key={key} className={cn('text-[10px] px-1.5 py-0.5 rounded font-semibold', val.color)}>
                    {val.label} = {val.full}
                  </span>
                ))}
              </div>

              <CalendarColumnLegend />

              <div className="card overflow-x-auto">
                {monthlyLoading && !monthlyData ? (
                  <div className="p-12 text-center text-slate-400 text-sm">Loading register…</div>
                ) : (
                  <table className="w-full text-xs min-w-[800px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-500 min-w-[140px] border-r border-slate-200">
                          Employee
                        </th>
                        {dates.map((d) => {
                          const meta = dateMetaMap[d];
                          const col = getCalendarColumnClasses(meta?.day_type);
                          return (
                            <th
                              key={d}
                              className={cn('px-1 py-2 text-center w-8 min-w-[2rem]', col.header)}
                              title={[dayOfWeekShort(d), columnTitle(meta)].filter(Boolean).join(' · ')}
                            >
                              {parseInt(d.slice(-2), 10)}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {grid.map(({ employee, days }) => {
                        const issue = incompleteByEmployeeId[employee.id];
                        return (
                        <tr key={employee.id} className={issue ? 'bg-amber-50/40' : undefined}>
                          <td
                            className={cn(
                              'sticky left-0 z-10 px-3 py-2 font-medium text-slate-800 whitespace-nowrap border-r border-slate-200',
                              issue ? 'bg-amber-50' : 'bg-white'
                            )}
                          >
                            <span className="text-slate-400 font-mono mr-1">{employee.emp_code}</span>
                            {employee.first_name} {employee.last_name}
                            {issue && (
                              <span
                                className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-500 align-middle"
                                title={[
                                  issue.unmarked_days > 0 ? `${issue.unmarked_days} unmarked` : null,
                                  issue.missing_checkouts_count > 0
                                    ? `${issue.missing_checkouts_count} missing check-out`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              />
                            )}
                          </td>
                          {days.map((day) => {
                            const meta = dateMetaMap[day.date];
                            const col = getCalendarColumnClasses(meta?.day_type);
                            const notEmployed = day.day_type === 'not_employed';
                            const displayStatus = day.status || (day.day_type === 'weekend' ? 'weekend' : day.day_type === 'holiday' ? 'holiday' : null);
                            const cfg = displayStatus ? ATTENDANCE_STATUS[displayStatus] : null;
                            const shiftLabel = day.shift?.week_off ? 'O' : day.shift?.code;
                            const editable = canEditAttendance && !finalization?.finalized && !notEmployed;
                            const punchStatuses = ['present', 'half_day', 'late', 'wfh'];
                            const missingCheckout =
                              punchStatuses.includes(day.status) && day.check_in && !day.check_out;
                            const unmarkedWorking =
                              !day.status && day.day_type === 'working' && !day.shift?.week_off;
                            return (
                              <td
                                key={day.date}
                                className={cn('px-0.5 py-1 text-center', col.cell, notEmployed && 'opacity-40')}
                                title={[
                                  columnTitle(meta),
                                  notEmployed ? 'Not employed on this date (before joining / after exit)' : null,
                                  day.shift?.name,
                                  day.check_in || day.check_out
                                    ? `In ${day.check_in ? new Date(day.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'} · Out ${day.check_out ? new Date(day.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}`
                                    : null,
                                  missingCheckout ? 'Missing check-out' : null,
                                  unmarkedWorking ? 'Unmarked working day' : null,
                                  editable ? 'Click to edit' : null,
                                ].filter(Boolean).join(' · ')}
                              >
                                <button
                                  type="button"
                                  disabled={!editable}
                                  onClick={() => openMonthlyCellEdit(employee, day)}
                                  className={cn(
                                    'w-7 h-7 rounded text-[10px] font-bold mx-auto flex items-center justify-center relative transition-shadow',
                                    notEmployed
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      : day.status && cfg
                                        ? cfg.color
                                        : 'bg-white/80 text-slate-600 ring-1 ring-slate-200/60',
                                    (missingCheckout || unmarkedWorking) && 'ring-2 ring-amber-400',
                                    editable && 'hover:ring-2 hover:ring-brand-400 cursor-pointer',
                                    !editable && 'cursor-default'
                                  )}
                                >
                                  {day.source === 'leave_sync' && day.leave_type?.color_code && (
                                    <span
                                      className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full ring-1 ring-white"
                                      style={{ backgroundColor: day.leave_type.color_code }}
                                    />
                                  )}
                                  {missingCheckout && (
                                    <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-amber-500 ring-1 ring-white" />
                                  )}
                                  {notEmployed
                                    ? '—'
                                    : day.status
                                      ? ATTENDANCE_STATUS[day.status]?.label || '?'
                                      : shiftLabel || (meta?.day_type === 'holiday' ? 'H' : meta?.day_type === 'weekend' ? '—' : '+')}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </>
      )}
      <MarkAttendanceModal
        isOpen={modalState.isOpen}
        onClose={() =>
          setModalState({
            isOpen: false,
            employee: null,
            status: 'present',
            record: null,
            date: null,
            forceOverride: false,
          })
        }
        employee={modalState.employee || {}}
        existingRecord={modalState.record}
        selectedDate={modalState.date || selectedDate}
        initialStatus={modalState.status}
        onSave={handleSaveAttendance}
        isPending={markMutation.isPending}
      />
    </div>
  );
}
