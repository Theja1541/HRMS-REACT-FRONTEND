import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Play, Check, Lock, Unlock, FileText, Mail, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { payrollApi, portalApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import ExportExcelButton from '../../components/shared/ExportExcelButton';
import PayslipView from '../../components/payroll/PayslipView';
import Form16Panel from '../../components/payroll/Form16Panel';
import { exportPayslipsExcel } from '../../utils/excelExports';
import { PAYROLL_STATUS, MONTHS } from '../../constants/payroll';
import { cn, formatINR } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';

export default function PayslipsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isSelfService = location.pathname.startsWith('/me/');
  const { user } = useAuthStore();
  const isAdmin = ['super_admin', 'owner', 'hr'].includes(user?.role);
  const now = new Date();
  const initialMonth = parseInt(searchParams.get('month'), 10);
  const initialYear = parseInt(searchParams.get('year'), 10);
  const [month, setMonth] = useState(Number.isFinite(initialMonth) ? initialMonth : now.getMonth() + 1);
  const [year, setYear] = useState(Number.isFinite(initialYear) ? initialYear : now.getFullYear());
  const [selectedPayslipId, setSelectedPayslipId] = useState(null);
  const [processMessage, setProcessMessage] = useState(null);
  const [emailAllMessage, setEmailAllMessage] = useState(null);
  const [precheckModal, setPrecheckModal] = useState(null);
  const [precheckLoading, setPrecheckLoading] = useState(false);
  const [daybookMessage, setDaybookMessage] = useState(null);
  const [unlockMessage, setUnlockMessage] = useState(null);

  const yearOptions = useMemo(() => {
    const current = now.getFullYear();
    return Array.from({ length: 5 }, (_, i) => current - 2 + i);
  }, []);

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
      const skipped = res?.data?.skipped?.length ?? 0;
      setProcessMessage(
        skipped > 0
          ? `Payroll generated for ${count} employees. ${skipped} skipped (no salary for this period).`
          : `Payroll generated for ${count} employees.`
      );
      const first = res?.data?.payslips?.[0];
      if (first?.id) setSelectedPayslipId(first.id);
    },
  });

  const handleRunPayroll = async () => {
    if (!isAdmin || processMutation.isPending || precheckLoading) return;
    setPrecheckLoading(true);
    try {
      const pre = await payrollApi.precheckRun({ month, year });
      const incomplete = pre?.data?.incomplete || [];
      if (incomplete.length > 0) {
        setPrecheckModal({ incomplete });
        return;
      }
      processMutation.mutate(false);
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
        link: isSetupError ? '/finance/payment-modes' : '/daybook',
        linkLabel: isSetupError ? 'Configure Finance Setup' : 'Open Day Book',
      });
      return;
    }
    if (sync.already_synced) {
      setDaybookMessage({
        type: 'success',
        text: `Already synced: accrual ${sync.accrual_voucher_number || '—'}${sync.disbursement_voucher_number ? `, disbursement ${sync.disbursement_voucher_number}` : ''}.`,
        link: '/daybook',
        linkLabel: 'Open Day Book',
      });
      return;
    }
    setDaybookMessage({
      type: 'success',
      text: `Day Book updated: accrual ${sync.accrual_voucher_number || '—'}${sync.disbursement_voucher_number ? `, disbursement ${sync.disbursement_voucher_number}` : ''}.`,
      link: '/daybook',
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
        link: isUnbalanced ? undefined : '/finance/payment-modes',
        linkLabel: isUnbalanced ? undefined : 'Configure Finance Setup',
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
    mutationFn: (runId) => payrollApi.emailRunPayslips(runId),
    onSuccess: (res) => {
      const s = res?.data?.summary;
      setEmailAllMessage(
        s
          ? `Payslip emails: ${s.sent} sent, ${s.failed} failed${s.skipped ? `, ${s.skipped} skipped (no email)` : ''}.`
          : 'Payslip emails sent.'
      );
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
    const payslipEmpIds = new Set(payslips.map((p) => p.employee_id));
    const salaried = (salariesData?.data?.employees || []).filter((e) => e.salary);
    return salaried.filter((e) => !payslipEmpIds.has(e.id));
  }, [payslips, salariesData, isAdmin, isSelfService]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isSelfService ? 'My Payslips' : 'Payslips'}
        subtitle={isSelfService ? 'Your payslip history' : isAdmin ? 'Run payroll, review and approve payslips' : 'Payslip history'}
        actions={
          isAdmin && !isSelfService && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRunPayroll}
                disabled={processMutation.isPending || precheckLoading || currentRun?.status === 'locked'}
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
                >
                  <Mail size={14} /> {emailAllMutation.isPending ? 'Emailing…' : 'Email All Payslips'}
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

      <div className="flex items-center gap-3 flex-wrap">
        <select value={month} onChange={(e) => { setMonth(parseInt(e.target.value, 10)); setProcessMessage(null); setUnlockMessage(null); setSelectedPayslipId(null); }} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => { setYear(parseInt(e.target.value, 10)); setProcessMessage(null); setUnlockMessage(null); setSelectedPayslipId(null); }} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
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
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
          <p className="font-medium">
            {missingFromRun.length} employee{missingFromRun.length > 1 ? 's' : ''} with assigned salary not in this run
          </p>
          <p className="text-xs mt-1 text-amber-700">
            {missingFromRun.map((e) => `${e.first_name} ${e.last_name} (${e.emp_code})`).join(', ')}
            {' — '}
            Salary is assigned for {MONTHS[month - 1]} {year} but they were not included when this draft was last generated.
            Click <strong>Run Payroll</strong> to refresh the run and add them.
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
            <div className="p-8 text-center text-slate-400">Loading…</div>
          ) : payslips.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No payslips for {MONTHS[month - 1]} {year}</p>
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
            <div className="card p-12 text-center text-slate-400 text-sm">
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
