import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Play, Check, Lock, Unlock, FileText, Mail, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { payrollApi, portalApi, attendanceApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import ExportExcelButton from '../../components/shared/ExportExcelButton';
import PayslipView from '../../components/payroll/PayslipView';
import Form16Panel from '../../components/payroll/Form16Panel';
import { exportPayslipsExcel } from '../../utils/excelExports';
import { generateAndStorePayslipPdf } from '../../utils/generatePayslipPdfFromView';
import { PAYROLL_STATUS, MONTHS } from '../../constants/payroll';
import { cn, formatINR } from '../../utils/helpers';
import { usePortalRole } from '../../hooks/usePortalRole';

export default function PayslipsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isSelfService = location.pathname.startsWith('/me/');
  const role = usePortalRole();
  const isAdmin = ['super_admin', 'owner', 'hr'].includes(role);
  const now = new Date();
  const initialMonth = parseInt(searchParams.get('month'), 10);
  const initialYear = parseInt(searchParams.get('year'), 10);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const [month, setMonth] = useState(() => {
    const m = Number.isFinite(initialMonth) ? initialMonth : currentMonth;
    const y = Number.isFinite(initialYear) ? initialYear : currentYear;
    if (y > currentYear || (y === currentYear && m > currentMonth)) return currentMonth;
    return m;
  });
  const [year, setYear] = useState(() => {
    const y = Number.isFinite(initialYear) ? initialYear : currentYear;
    return Math.min(y, currentYear);
  });
  const [selectedPayslipId, setSelectedPayslipId] = useState(null);
  const [processMessage, setProcessMessage] = useState(null);
  const [emailAllMessage, setEmailAllMessage] = useState(null);
  const [precheckModal, setPrecheckModal] = useState(null);
  const [precheckLoading, setPrecheckLoading] = useState(false);
  const [daybookMessage, setDaybookMessage] = useState(null);
  const [unlockMessage, setUnlockMessage] = useState(null);

  const yearOptions = useMemo(() => {
    // Past 2 years through current year only — no future years for payroll runs.
    return Array.from({ length: 3 }, (_, i) => currentYear - 2 + i);
  }, [currentYear]);

  const isFuturePeriod = useMemo(() => {
    const nowDate = new Date();
    const cm = nowDate.getMonth() + 1;
    const cy = nowDate.getFullYear();
    return year > cy || (year === cy && month > cm);
  }, [month, year]);

  const { data: runsData } = useQuery({
    queryKey: ['payroll-runs'],
    queryFn: () => payrollApi.listRuns(),
    enabled: isAdmin,
  });

  const { data: payslipsData, isLoading } = useQuery({
    queryKey: ['payslips', month, year, isSelfService],
    queryFn: () =>
      isSelfService
        ? portalApi.listMyPayslips({ month, year })
        : payrollApi.listPayslips({ month, year }),
  });

  const { data: salariesData } = useQuery({
    queryKey: ['salaries-registry', month, year],
    queryFn: () => payrollApi.listSalaries({ month, year }),
    enabled: isAdmin && !isSelfService,
  });

  const { data: finalizationData } = useQuery({
    queryKey: ['attendance-finalization', month, year],
    queryFn: () => attendanceApi.getFinalization({ month, year }),
    enabled: isAdmin && !isSelfService,
    staleTime: 30_000,
  });
  const attendanceFinalized = !!finalizationData?.data?.finalized;

  const { data: detailData } = useQuery({
    queryKey: ['payslip', selectedPayslipId, isSelfService],
    queryFn: () =>
      isSelfService
        ? portalApi.getMyPayslip(selectedPayslipId)
        : payrollApi.getPayslip(selectedPayslipId),
    enabled: !!selectedPayslipId,
  });

  const processMutation = useMutation({
    mutationFn: (acknowledge) =>
      payrollApi.processRun({ month, year, acknowledge_incomplete_attendance: !!acknowledge }),
    onSuccess: (res) => {
      setPrecheckModal(null);
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['salaries-registry'] });
      const count = res?.data?.payslips?.length ?? res?.data?.run?.total_employees ?? 0;
      const skippedRows = res?.data?.skipped || [];
      const skipped = skippedRows.length;
      if (skipped > 0) {
        const noSalary = skippedRows.filter((s) => s.reason === 'no_salary_assigned').length;
        const joinedAfter = skippedRows.filter((s) => s.reason === 'joined_after_period').length;
        const notPayable = skippedRows.filter((s) => s.reason === 'not_payable_this_period').length;
        const parts = [`Payroll generated for ${count} employees.`];
        if (noSalary) parts.push(`${noSalary} skipped (no salary for this period).`);
        if (joinedAfter) {
          parts.push(
            `${joinedAfter} skipped (joined after this payroll month — will appear from their joining month).`
          );
        }
        if (notPayable) {
          parts.push(
            `${notPayable} skipped (salary assigned but no payable days in this period — check joining/exit/salary effective dates).`
          );
        }
        if (!noSalary && !joinedAfter && !notPayable) parts.push(`${skipped} skipped.`);
        setProcessMessage(parts.join(' '));
      } else {
        setProcessMessage(`Payroll generated for ${count} employees.`);
      }
      const first = res?.data?.payslips?.[0];
      if (first?.id) setSelectedPayslipId(first.id);
    },
    onError: (err) => {
      setPrecheckModal(null);
      window.alert(err.response?.data?.error?.message || 'Failed to run payroll');
    },
  });

  const handleRunPayroll = async () => {
    if (!isAdmin || processMutation.isPending || precheckLoading) return;
    if (isFuturePeriod) {
      setProcessMessage(null);
      window.alert('Cannot run payroll for a future month. Select the current month or an earlier period.');
      return;
    }
    setPrecheckLoading(true);
    try {
      const pre = await payrollApi.precheckRun({ month, year });
      if (!pre?.data?.attendance_finalized) {
        window.alert(
          `Attendance for ${month}/${year} is not finalized. Finalize attendance on the Attendance → Monthly Register tab before running payroll.`
        );
        return;
      }
      const incomplete = pre?.data?.incomplete || [];
      if (incomplete.length > 0) {
        setPrecheckModal({ incomplete });
        return;
      }
      processMutation.mutate(false);
    } catch (err) {
      window.alert(err.response?.data?.error?.message || 'Failed to run payroll precheck');
    } finally {
      setPrecheckLoading(false);
    }
  };

  const handleDaybookSyncResult = (res) => {
    const sync = res?.data?.daybook_sync;
    queryClient.invalidateQueries({ queryKey: ['finance-vouchers'] });
    queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
    if (!sync) {
      setDaybookMessage(null);
      return;
    }
    if (sync.success === false) {
      const errText = sync.error || 'Day Book sync failed';
      const isSetupError = /chart of accounts|payment mode|mapping|missing/i.test(errText);
      setDaybookMessage({
        type: 'error',
        text: errText,
        link: isSetupError ? '/categories' : '/transactions',
        linkLabel: isSetupError ? 'Setup Categories' : 'Open Day Book',
      });
      return;
    }
    if (sync.already_synced) {
      setDaybookMessage({
        type: 'success',
        text: `Already synced: accrual ${sync.accrual_voucher_number || '—'}${sync.disbursement_voucher_number ? `, disbursement ${sync.disbursement_voucher_number}` : ''}.`,
        link: '/transactions',
        linkLabel: 'Open Day Book',
      });
      return;
    }
    setDaybookMessage({
      type: 'success',
      text: `Payroll posted to accounts: accrual ${sync.accrual_voucher_number || '—'}${sync.disbursement_voucher_number ? `, disbursement ${sync.disbursement_voucher_number}` : ''}.`,
      link: '/transactions',
      linkLabel: 'Open Day Book',
    });
  };

  const approveMutation = useMutation({
    mutationFn: (runId) => payrollApi.approveRun(runId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      setUnlockMessage(null);
      handleDaybookSyncResult(res);
    },
  });

  const lockMutation = useMutation({
    mutationFn: (runId) => payrollApi.lockRun(runId, {}),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      handleDaybookSyncResult(res);
    },
  });

  const syncDaybookMutation = useMutation({
    mutationFn: (runId) => payrollApi.syncDayBookRun(runId),
    onSuccess: (res) => handleDaybookSyncResult(res),
    onError: (err) => {
      const errText = err.response?.data?.error?.message || 'Failed to sync payroll to Day Book';
      const isUnbalanced = /unbalanced/i.test(errText);
      setDaybookMessage({
        type: 'error',
        text: errText,
        link: isUnbalanced ? undefined : '/transactions',
        linkLabel: isUnbalanced ? undefined : 'Open Day Book',
      });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: (runId) => payrollApi.unlockRun(runId, { reason: 'Unlocked for corrections' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      setDaybookMessage(null);
      setUnlockMessage(
        res?.message
          || 'Payroll reopened for corrections. This payroll is now in Draft status and must be approved again before payment or Day Book sync.'
      );
    },
    onError: (err) => {
      setUnlockMessage(err.response?.data?.error?.message || 'Failed to unlock payroll');
    },
  });

  const emailAllMutation = useMutation({
    mutationFn: async (runId) => {
      // Generate view-matching PDFs for every payslip, then email with attachments
      const list = payslipsData?.data?.payslips || [];
      let pdfPrepared = 0;
      let pdfFailed = 0;

      for (const row of list) {
        try {
          const detail = await payrollApi.getPayslip(row.id);
          const full = detail?.data?.payslip;
          if (!full) throw new Error('Payslip detail missing');
          await generateAndStorePayslipPdf(full, { force: true });
          pdfPrepared += 1;
        } catch {
          pdfFailed += 1;
        }
      }

      const res = await payrollApi.emailRunPayslips(runId);
      return { ...res, pdfPrepared, pdfFailed };
    },
    onSuccess: (res) => {
      const s = res?.data?.summary;
      const pdfNote =
        typeof res?.pdfPrepared === 'number'
          ? ` PDFs prepared: ${res.pdfPrepared}${res.pdfFailed ? `, ${res.pdfFailed} PDF failed` : ''}.`
          : '';
      setEmailAllMessage(
        s
          ? `Bulk email: ${s.sent} sent, ${s.failed} failed${s.skipped ? `, ${s.skipped} skipped (no email)` : ''}.${pdfNote}`
          : `Payslip emails sent.${pdfNote}`
      );
      queryClient.invalidateQueries({ queryKey: ['payslips', month, year] });
      if (selectedPayslipId) {
        queryClient.invalidateQueries({ queryKey: ['payslip', selectedPayslipId] });
      }
    },
    onError: (err) => {
      setEmailAllMessage(err.response?.data?.error?.message || 'Failed to send payslip emails');
    },
  });

  const payslips = payslipsData?.data?.payslips || [];
  const currentRun = runsData?.data?.runs?.find((r) => r.month === month && r.year === year);
  const reopenedForCorrections =
    currentRun?.status === 'draft' && String(currentRun?.notes || '').startsWith('Unlocked:');
  const unlockNotice =
    unlockMessage
    || (reopenedForCorrections
      ? 'Payroll reopened for corrections. This payroll is now in Draft status and must be approved again before payment or Day Book sync.'
      : null);

  const missingFromRun = useMemo(() => {
    if (!isAdmin || isSelfService) return [];
    const payslipEmpIds = new Set(payslips.map((p) => Number(p.employee_id)));
    const salaried = (salariesData?.data?.employees || []).filter((e) => e.salary);
    // Only flag people who are actually payable this month but missing from the draft
    return salaried.filter(
      (e) => e.payable_in_period !== false && !payslipEmpIds.has(Number(e.id))
    );
  }, [payslips, salariesData, isAdmin, isSelfService]);

  const notPayableThisPeriod = useMemo(() => {
    if (!isAdmin || isSelfService) return [];
    const payslipEmpIds = new Set(payslips.map((p) => Number(p.employee_id)));
    return (salariesData?.data?.employees || []).filter(
      (e) =>
        e.salary &&
        e.payable_in_period === false &&
        !payslipEmpIds.has(Number(e.id))
    );
  }, [payslips, salariesData, isAdmin, isSelfService]);

  return (
    <div className="space-y-6">
      <PageHeader
        badge={isSelfService ? 'Payroll · My Payslips' : 'Payroll · Payslips'}
        title={isSelfService ? 'My Payslips' : 'Payslips'}
        subtitle={isSelfService ? 'Your payslip history' : isAdmin ? 'Run payroll, review and approve payslips' : 'Payslip history'}
        actions={
          isAdmin && !isSelfService && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRunPayroll}
                disabled={
                  processMutation.isPending ||
                  precheckLoading ||
                  currentRun?.status === 'locked' ||
                  isFuturePeriod
                }
                title={isFuturePeriod ? 'Cannot run payroll for a future month' : undefined}
                className="btn-primary"
              >
                <Play size={14} /> {processMutation.isPending || precheckLoading ? 'Processing…' : 'Run Payroll'}
              </button>
              {currentRun && currentRun.status === 'draft' && (
                <button type="button" onClick={() => approveMutation.mutate(currentRun.id)} className="btn-secondary">
                  <Check size={14} /> Approve
                </button>
              )}
              {currentRun && currentRun.status === 'approved' && (
                <button type="button" onClick={() => lockMutation.mutate(currentRun.id)} className="btn-secondary">
                  <Lock size={14} /> Lock & Pay
                </button>
              )}
              {currentRun && ['approved', 'locked', 'paid'].includes(currentRun.status) && (
                <button
                  type="button"
                  onClick={() => {
                    setDaybookMessage(null);
                    syncDaybookMutation.mutate(currentRun.id);
                  }}
                  disabled={syncDaybookMutation.isPending}
                  className="btn-secondary"
                >
                  <BookOpen size={14} /> {syncDaybookMutation.isPending ? 'Syncing…' : 'Sync to Day Book'}
                </button>
              )}
              {currentRun && (currentRun.status === 'approved' || currentRun.status === 'locked') && payslips.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setEmailAllMessage(null);
                    emailAllMutation.mutate(currentRun.id);
                  }}
                  disabled={emailAllMutation.isPending}
                  className="btn-secondary"
                  title="Generate view-matching PDFs and email every payslip in this run"
                >
                  <Mail size={14} />{' '}
                  {emailAllMutation.isPending ? 'Preparing & emailing…' : 'Bulk Email Payslips'}
                </button>
              )}
              {currentRun && currentRun.status === 'locked' && (
                <button
                  type="button"
                  onClick={() => unlockMutation.mutate(currentRun.id)}
                  disabled={unlockMutation.isPending}
                  className="btn-secondary"
                >
                  <Unlock size={14} /> {unlockMutation.isPending ? 'Unlocking…' : 'Unlock Payroll'}
                </button>
              )}
            </div>
          )
        }
      />

      <div className="card overflow-hidden">
        <div className="ds-toolbar">
          <div className="toolbar-row items-center">
        <select value={month} onChange={(e) => { setMonth(parseInt(e.target.value, 10)); setProcessMessage(null); setUnlockMessage(null); setSelectedPayslipId(null); }} className="ds-select sm:min-w-[120px]">
          {MONTHS.map((m, i) => {
            const optionMonth = i + 1;
            const disabledFuture =
              year > now.getFullYear() ||
              (year === now.getFullYear() && optionMonth > now.getMonth() + 1);
            return (
              <option key={m} value={optionMonth} disabled={disabledFuture}>
                {m}{disabledFuture ? ' (future)' : ''}
              </option>
            );
          })}
        </select>
        <select
          value={year}
          onChange={(e) => {
            const nextYear = parseInt(e.target.value, 10);
            const nowDate = new Date();
            const cm = nowDate.getMonth() + 1;
            const cy = nowDate.getFullYear();
            setYear(nextYear);
            if (nextYear === cy && month > cm) setMonth(cm);
            setProcessMessage(null);
            setUnlockMessage(null);
            setSelectedPayslipId(null);
          }}
          className="ds-select sm:min-w-[100px]"
        >
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {isFuturePeriod && isAdmin && !isSelfService && (
          <span className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
            Future month selected — payroll cannot be run for this period.
          </span>
        )}
        <ExportExcelButton
          label="Export Payslips"
          disabled={payslips.length === 0 || isLoading}
          onExport={() => exportPayslipsExcel(payslips, { month, year })}
        />
        {currentRun && !isSelfService && (
          <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold capitalize', PAYROLL_STATUS[currentRun.status])}>
            Run: {currentRun.status} · {currentRun.total_employees} employees · {formatINR(currentRun.total_net)} net
          </span>
        )}
          </div>
        </div>
      </div>

      {unlockNotice && !isSelfService && (
        <p className="text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2">
          {unlockNotice}
        </p>
      )}

      {daybookMessage && (
        <p
          className={cn(
            'text-sm rounded-lg px-4 py-2 border',
            daybookMessage.type === 'success'
              ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
              : 'text-amber-800 bg-amber-50 border-amber-100'
          )}
        >
          {daybookMessage.text}
          {daybookMessage.link && daybookMessage.linkLabel && (
            <Link to={daybookMessage.link} className="underline font-medium ml-1">
              {daybookMessage.linkLabel}
            </Link>
          )}
        </p>
      )}

      {emailAllMessage && (
        <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
          {emailAllMessage}
        </p>
      )}

      {processMessage && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2">
          {processMessage}
        </p>
      )}

      {isAdmin && !isSelfService && missingFromRun.length > 0 && (
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 space-y-2">
          <p className="font-medium">
            {missingFromRun.length} employee{missingFromRun.length > 1 ? 's' : ''} with assigned salary not in this run
          </p>
          <p className="text-xs text-amber-700">
            {missingFromRun.map((e) => `${e.first_name} ${e.last_name} (${e.emp_code})`).join(', ')}
          </p>
          <p className="text-xs text-amber-800">
            These employees are payable for {MONTHS[month - 1]} {year} but are missing from the current draft.
            {!attendanceFinalized ? (
              <>
                {' '}
                First <strong>finalize attendance</strong> for {MONTHS[month - 1]} {year} on{' '}
                <Link to="/attendance?tab=monthly" className="underline font-semibold">
                  Attendance → Monthly Register
                </Link>
                , then click <strong>Run Payroll</strong> to regenerate.
              </>
            ) : (
              <>
                {' '}
                Click <strong>Run Payroll</strong> to regenerate this draft and include them
                {currentRun?.status && currentRun.status !== 'draft'
                  ? ' (unlock the run first if it is approved/locked)'
                  : ''}
                .
              </>
            )}
          </p>
        </div>
      )}

      {isAdmin && !isSelfService && notPayableThisPeriod.length > 0 && (
        <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 space-y-2">
          <p className="font-medium">
            {notPayableThisPeriod.length} employee{notPayableThisPeriod.length > 1 ? 's' : ''} have salary
            but are not payable in {MONTHS[month - 1]} {year}
          </p>
          <ul className="text-xs text-slate-600 space-y-1">
            {notPayableThisPeriod.map((e) => {
              const doj = e.date_of_joining ? String(e.date_of_joining).slice(0, 10) : null;
              const reason =
                e.not_payable_reason === 'joined_after_period'
                  ? `joined ${doj} — after this payroll month`
                  : `no payable days in this month (joining/exit/salary effective window)`;
              return (
                <li key={e.id}>
                  <span className="font-medium text-slate-800">
                    {e.first_name} {e.last_name}
                  </span>{' '}
                  <span className="font-mono text-slate-400">({e.emp_code})</span>
                  {' — '}
                  {reason}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-slate-500">
            They will appear automatically in the payroll month that covers their joining / salary effective date
            (e.g. July 2026). No need to re-run this month for them.
          </p>
        </div>
      )}

      {precheckModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Incomplete attendance</h3>
            <p className="text-sm text-slate-600">
              {precheckModal.incomplete.length} employee(s) have unmarked working days for{' '}
              {MONTHS[month - 1]} {year}. Unmarked days will be treated as <strong>full pay</strong> unless
              attendance is corrected first.
            </p>
            <ul className="max-h-40 overflow-y-auto text-sm border border-slate-200 rounded-lg divide-y divide-slate-100">
              {precheckModal.incomplete.map((e) => (
                <li key={e.employee_id} className="px-3 py-2 flex justify-between">
                  <span>
                    {e.name} <span className="text-slate-400 font-mono text-xs">({e.emp_code})</span>
                  </span>
                  <span className="text-amber-700 font-medium">{e.unmarked_days} unmarked</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 justify-end pt-2">
              <a
                href={`/attendance?tab=monthly`}
                className="btn-secondary text-sm"
                onClick={() => setPrecheckModal(null)}
              >
                Go fix attendance
              </a>
              <button type="button" className="btn-secondary text-sm" onClick={() => setPrecheckModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={processMutation.isPending}
                onClick={() => processMutation.mutate(true)}
              >
                Proceed anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading payslips…</div>
          ) : payslips.length === 0 ? (
            <div className="py-16 text-center">
              <FileText size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 text-sm">No payslips for {MONTHS[month - 1]} {year}</p>
              {isAdmin && <p className="text-xs text-slate-400 mt-1">Click "Run Payroll" to generate</p>}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {payslips.map((ps) => (
                <button
                  key={ps.id}
                  type="button"
                  onClick={() => setSelectedPayslipId(ps.id)}
                  className={cn(
                    'w-full px-5 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors',
                    selectedPayslipId === ps.id && 'bg-brand-50'
                  )}
                >
                  <div>
                    {isSelfService ? (
                      <>
                        <p className="text-sm font-medium">{MONTHS[month - 1]} {year}</p>
                        <p className="text-xs text-slate-400">Net pay</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium">{ps.employee?.first_name} {ps.employee?.last_name}</p>
                        <p className="text-xs text-slate-400 font-mono">{ps.employee?.emp_code}</p>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-emerald-700">{formatINR(ps.net_salary)}</p>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded capitalize', PAYROLL_STATUS[ps.status] || 'bg-slate-100')}>
                      {ps.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {selectedPayslipId && detailData?.data?.payslip ? (
            <PayslipView
              payslip={detailData.data.payslip}
              showEmail={isAdmin && !isSelfService}
              onPdfStored={() => {
                queryClient.invalidateQueries({ queryKey: ['payslip', selectedPayslipId] });
                queryClient.invalidateQueries({ queryKey: ['payslips', month, year] });
              }}
            />
          ) : (
            <div className="card py-16 text-center text-slate-400 text-sm">
              Select a payslip to preview
            </div>
          )}
        </div>
      </div>

      {isSelfService && (
        <div className="card p-6">
          <Form16Panel mode="self" />
        </div>
      )}
    </div>
  );
}
