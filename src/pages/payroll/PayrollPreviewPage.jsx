import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlayCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { payrollApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import { formatINR } from '../../utils/helpers';

export default function PayrollPreviewPage() {
  const queryClient = useQueryClient();
  const d = new Date();
  const [month, setMonth] = useState(d.getMonth() === 0 ? 12 : d.getMonth());
  const [year, setYear] = useState(d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear());
  const [acknowledgeIncomplete, setAcknowledgeIncomplete] = useState(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [processSuccess, setProcessSuccess] = useState(false);
  const [processError, setProcessError] = useState('');

  const isFuturePeriod = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    return year > currentYear || (year === currentYear && month > currentMonth);
  }, [month, year]);

  const { data: precheckData, isLoading: precheckLoading, error: precheckError, refetch: runPrecheck, isFetching: isPrechecking } = useQuery({
    queryKey: ['payroll-precheck', month, year],
    queryFn: () => payrollApi.precheckRun({ month, year }),
    enabled: false, // only run when clicked
  });

  const processMutation = useMutation({
    mutationFn: payrollApi.processRun,
    onSuccess: () => {
      setProcessSuccess(true);
      setShowIncompleteWarning(false);
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
    },
    onError: (err) => {
      const errCode = err.response?.data?.error?.code;
      if (errCode === 'ATTENDANCE_INCOMPLETE') {
        setShowIncompleteWarning(true);
      } else {
        setProcessError(err.response?.data?.error?.message || 'Failed to process payroll');
      }
    },
  });

  const handlePrecheck = () => {
    setProcessSuccess(false);
    setProcessError('');
    setShowIncompleteWarning(false);
    setAcknowledgeIncomplete(false);
    if (isFuturePeriod) {
      setProcessError('Cannot run payroll for a future month. Select the current month or an earlier period.');
      return;
    }
    runPrecheck();
  };

  const handleProcess = () => {
    setProcessSuccess(false);
    setProcessError('');
    if (isFuturePeriod) {
      setProcessError('Cannot run payroll for a future month. Select the current month or an earlier period.');
      return;
    }
    processMutation.mutate({ month, year, acknowledge_incomplete_attendance: acknowledgeIncomplete });
  };

  const precheck = precheckData?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Generation"
        subtitle="Precheck and process monthly payroll"
      />

      <div className="card p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              className="mt-1 w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              {Array.from({ length: 12 }).map((_, i) => {
                const optionMonth = i + 1;
                const disabledFuture =
                  year > d.getFullYear() ||
                  (year === d.getFullYear() && optionMonth > d.getMonth() + 1);
                return (
                  <option key={i + 1} value={optionMonth} disabled={disabledFuture}>
                    {new Date(0, i).toLocaleString('en-US', { month: 'long' })}
                    {disabledFuture ? ' (future)' : ''}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="mt-1 w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm"
              min={2000}
              max={d.getFullYear()}
            />
          </div>
          <button
            type="button"
            onClick={handlePrecheck}
            disabled={isPrechecking || isFuturePeriod}
            title={isFuturePeriod ? 'Cannot precheck a future month' : undefined}
            className="btn-secondary whitespace-nowrap"
          >
            {isPrechecking ? 'Analyzing...' : 'Run Precheck'}
          </button>
        </div>

        {isFuturePeriod && (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">
            Future month selected — payroll cannot be run for this period. Choose the current month or an earlier one.
          </div>
        )}

        {precheckError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            {precheckError.response?.data?.error?.message || 'Failed to run precheck'}
          </div>
        )}

        {precheck && !isPrechecking && (
          <div className="space-y-6 mt-6 border-t border-slate-100 pt-6">
            {!precheck.attendance_finalized && (
              <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-semibold block mb-1">Attendance not finalized</span>
                  Finalize attendance for this month on Attendance → Monthly Register before generating payroll.
                </div>
              </div>
            )}
            {precheck.attendance_finalized && (
              <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span>Attendance is finalized for this period.</span>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <p className="text-[10px] uppercase font-semibold tracking-wide text-slate-500">Employees Total</p>
                <p className="text-2xl font-semibold text-slate-800 mt-1">{precheck.total_employees}</p>
              </div>
              <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
                <p className="text-[10px] uppercase font-semibold tracking-wide text-brand-600">Eligible for Payroll</p>
                <p className="text-2xl font-semibold text-brand-800 mt-1">{precheck.eligible_employees}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="text-[10px] uppercase font-semibold tracking-wide text-emerald-600">Total Net Est.</p>
                <p className="text-xl font-semibold text-emerald-800 mt-1">{formatINR(precheck.total_net_payable)}</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-[10px] uppercase font-semibold tracking-wide text-amber-600">Incomplete Attendance</p>
                <p className="text-2xl font-semibold text-amber-800 mt-1">{precheck.incomplete?.length || 0}</p>
              </div>
            </div>

            {precheck.incomplete?.length > 0 && (
              <div className="rounded-xl border border-amber-200 overflow-hidden">
                <div className="bg-amber-50 p-3 border-b border-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h4 className="text-sm font-semibold text-amber-800">Action Required: Incomplete Attendance</h4>
                </div>
                <div className="p-4 bg-white">
                  <p className="text-xs text-slate-600 mb-4">
                    The following employees have missing checkouts or unapproved leave/comp-off requests. 
                    If you proceed, missing checkouts may be automatically marked based on the assigned Attendance Policy.
                  </p>
                  <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 max-h-40 overflow-y-auto">
                    {precheck.incomplete.map((e) => (
                      <li key={e.employee_id}>
                        <span className="font-medium">{e.emp_code} - {e.first_name} {e.last_name}</span>
                        <span className="text-slate-500 ml-2 text-xs">(Missing checkouts: {e.missing_checkouts_count})</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acknowledgeIncomplete}
                        onChange={(e) => setAcknowledgeIncomplete(e.target.checked)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        Acknowledge incomplete attendance and apply default policy penalties
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {showIncompleteWarning && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-semibold block mb-1">Cannot Proceed</span>
                  You must acknowledge incomplete attendance to generate payroll for these employees.
                </div>
              </div>
            )}

            {processError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                {processError}
              </div>
            )}

            {processSuccess && (
              <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
                <div>
                  <span className="font-semibold block">Payroll Processed Successfully!</span>
                  <p className="text-emerald-600 text-xs mt-0.5">The payroll run has been drafted. Review payslips before approving.</p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="button"
                disabled={
                  processMutation.isPending ||
                  isFuturePeriod ||
                  !precheck.attendance_finalized ||
                  (precheck.incomplete?.length > 0 && !acknowledgeIncomplete) ||
                  processSuccess
                }
                title={
                  isFuturePeriod
                    ? 'Cannot run payroll for a future month'
                    : !precheck.attendance_finalized
                      ? 'Finalize attendance before processing payroll'
                      : undefined
                }
                onClick={handleProcess}
                className="btn-primary"
              >
                <PlayCircle className="w-4 h-4 mr-2 inline" />
                {processMutation.isPending ? 'Processing...' : 'Process Payroll'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
