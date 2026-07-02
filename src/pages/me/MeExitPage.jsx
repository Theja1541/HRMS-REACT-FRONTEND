import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import {
  AlertCircle,
  Award,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock,
  DoorOpen,
  Download,
  FileText,
  IndianRupee,
  Loader2,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { resignationApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import {
  CLEARANCE_CATEGORY_LABELS,
  CLEARANCE_ITEM_STATUS_LABELS,
  CLEARANCE_ITEM_STATUSES,
  CLEARANCE_STATUSES,
  FNF_PAYMENT_MODE_LABELS,
  FNF_SETTLEMENT_STATUSES,
  FNF_SETTLEMENT_STATUS_LABELS,
  RESIGNATION_STATUS,
  RESIGNATION_STATUS_LABELS,
  SEPARATION_STATUSES,
} from '../../constants/hr';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../utils/helpers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(value) {
  if (!value) return '—';
  try { return format(parseISO(value), 'dd MMM yyyy'); } catch { return value; }
}

function fmtDateTime(value) {
  if (!value) return '—';
  try { return format(parseISO(value), 'dd MMM yyyy, h:mm a'); } catch { return value; }
}

function fmtName(user) {
  if (!user) return '—';
  return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.emp_code || '—';
}

function fmtInr(amount) {
  if (amount == null || amount === '') return '—';
  const num = Number(amount);
  if (Number.isNaN(num)) return '—';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  try { return differenceInCalendarDays(parseISO(dateStr), new Date()); } catch { return null; }
}

const EXIT_TYPE_LABELS = {
  resignation: 'Resignation',
  termination: 'Termination',
  retirement: 'Retirement',
  absconding: 'Absconding',
};

const TERMINAL_ITEM_STATUSES = new Set(['completed', 'waived', 'not_applicable']);

// ─── Shared UI ────────────────────────────────────────────────────────────────

function InfoRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className="text-xs font-medium text-slate-800 text-right">{children ?? '—'}</span>
    </div>
  );
}

function StatusPill({ colorClass, label }) {
  return (
    <span className={cn('inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', colorClass)}>
      {label}
    </span>
  );
}

function SectionCard({ title, icon: Icon, iconClass, children }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
        {Icon && <Icon size={14} className={iconClass ?? 'text-slate-500'} />}
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Countdown card ───────────────────────────────────────────────────────────

function CountdownCard({ lwd }) {
  const days = daysUntil(lwd);

  if (days === null) {
    return (
      <div className="card p-6 flex flex-col items-center justify-center gap-2 text-center h-full">
        <CalendarClock size={28} className="text-slate-300" />
        <p className="text-xs text-slate-400">Last working date not confirmed</p>
      </div>
    );
  }

  const isPast = days < 0;
  const isToday = days === 0;

  return (
    <div className={cn(
      'card p-6 flex flex-col items-center justify-center gap-1 text-center h-full',
      isPast ? 'bg-slate-50' : isToday ? 'bg-amber-50' : 'bg-brand-50'
    )}>
      <p className={cn(
        'text-5xl font-bold tabular-nums',
        isPast ? 'text-slate-400' : isToday ? 'text-amber-600' : 'text-brand-600'
      )}>
        {isPast ? Math.abs(days) : days}
      </p>
      <p className={cn(
        'text-xs font-medium',
        isPast ? 'text-slate-500' : isToday ? 'text-amber-700' : 'text-brand-700'
      )}>
        {isPast ? `day${Math.abs(days) !== 1 ? 's' : ''} since LWD` : isToday ? 'Last working day — today' : 'days remaining'}
      </p>
      <p className="text-[11px] text-slate-500 mt-3">
        LWD: <span className="font-semibold text-slate-700">{fmtDate(lwd)}</span>
      </p>
    </div>
  );
}

// ─── Clearance section ────────────────────────────────────────────────────────

function ClearanceProgress({ progress }) {
  if (!progress) return null;
  const pct = progress.completion_percentage ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-slate-500">Overall completion</p>
          <p className="text-3xl font-bold text-brand-600 mt-0.5">{pct}%</p>
        </div>
        <div className="flex gap-4 text-xs pb-1">
          <span className="flex items-center gap-1 text-emerald-700">
            <CheckCircle2 size={13} /> {progress.completed_tasks ?? 0} done
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <Clock size={13} /> {progress.pending_tasks ?? 0} pending
          </span>
          {(progress.rejected_tasks ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <AlertCircle size={13} /> {progress.rejected_tasks} rejected
            </span>
          )}
        </div>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', pct === 100 ? 'bg-emerald-500' : 'bg-brand-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ClearanceItemRow({ item }) {
  const done = TERMINAL_ITEM_STATUSES.has(item.status);
  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border',
      done ? 'bg-emerald-50/60 border-emerald-100' : 'bg-white border-slate-200'
    )}>
      <div className={cn(
        'mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
        item.status === 'completed' ? 'bg-emerald-500 text-white' :
        item.status === 'waived' || item.status === 'not_applicable' ? 'bg-slate-300 text-white' :
        'border-2 border-slate-300'
      )}>
        {item.status === 'completed' && <CheckCircle2 size={12} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn('text-xs font-medium', done ? 'text-slate-700' : 'text-slate-900')}>
            {item.title}
          </p>
          {item.is_mandatory && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase tracking-wide">
              Required
            </span>
          )}
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', CLEARANCE_ITEM_STATUSES[item.status])}>
            {CLEARANCE_ITEM_STATUS_LABELS[item.status] ?? item.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
          <span className="text-[11px] text-slate-400">
            {CLEARANCE_CATEGORY_LABELS[item.category] ?? item.category ?? '—'}
          </span>
          {item.approver && (
            <span className="text-[11px] text-slate-400">By {fmtName(item.approver)}</span>
          )}
          {item.approved_at && (
            <span className="text-[11px] text-slate-400">{fmtDate(item.approved_at)}</span>
          )}
        </div>
        {(item.remarks || item.waiver_reason) && (
          <p className="text-[11px] text-slate-500 mt-1 italic">
            "{item.remarks?.trim() || item.waiver_reason?.trim()}"
          </p>
        )}
      </div>
    </div>
  );
}

// ─── F&F section ──────────────────────────────────────────────────────────────

function FnfAmountCard({ label, amount, colorBg, colorText, colorBorder }) {
  return (
    <div className={cn('rounded-xl border p-4', colorBg, colorBorder)}>
      <p className={cn('text-[10px] uppercase font-medium tracking-wide', colorText)}>{label}</p>
      <p className={cn('text-xl font-bold mt-1', colorText)}>{fmtInr(amount)}</p>
    </div>
  );
}

function FnfComponentTable({ title, rows, amountClass }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <p className="text-xs font-semibold text-slate-800">{title}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-5 text-xs text-slate-400 text-center">No {title.toLowerCase()} recorded</p>
      ) : (
        <table className="w-full text-xs">
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2.5 text-slate-700">{row.label}</td>
                <td className={cn('px-4 py-2.5 text-right font-semibold tabular-nums', amountClass)}>
                  {fmtInr(row.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function FnfPaymentHistory({ payments }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-800">Payment History</p>
        <span className="text-[10px] text-slate-400">{payments.length} payment{payments.length !== 1 ? 's' : ''}</span>
      </div>
      {payments.length === 0 ? (
        <p className="px-4 py-5 text-xs text-slate-400 text-center">No payments received yet</p>
      ) : (
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full text-xs min-w-[560px]">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Date</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Amount</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Method</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Reference</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 whitespace-nowrap">{fmtDate(p.payment_date)}</td>
                  <td className="px-4 py-2.5 font-semibold text-emerald-700 tabular-nums">
                    {fmtInr(p.amount)}
                  </td>
                  <td className="px-4 py-2.5 capitalize">
                    {FNF_PAYMENT_MODE_LABELS[p.payment_mode] ?? p.payment_mode ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-500">
                    {p.reference_number || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 max-w-[200px] truncate" title={p.notes || ''}>
                    {p.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FnfSection({ resignationId, separationRequestId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['my-resignation-fnf', resignationId],
    queryFn: () => resignationApi.getResignationFnf(resignationId),
    enabled: !!resignationId && !!separationRequestId,
    staleTime: 60_000,
  });

  const settlement = data?.data?.settlement ?? null;

  if (!separationRequestId) {
    return (
      <div className="card p-8 flex items-center gap-4 bg-amber-50 border border-amber-100">
        <IndianRupee size={20} className="text-amber-500 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-900">F&amp;F settlement not available yet</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Full &amp; Final settlement details will appear here after HR approves your resignation.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card p-10 flex items-center justify-center gap-2 text-slate-400 text-sm">
        <Loader2 size={16} className="animate-spin" /> Loading F&amp;F settlement…
      </div>
    );
  }

  if (!settlement) {
    return (
      <div className="card p-10 text-center">
        <IndianRupee size={28} className="text-slate-200 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-600">F&amp;F settlement not initiated</p>
        <p className="text-xs text-slate-400 mt-1">
          Your Full &amp; Final settlement will be calculated once your separation is completed.
        </p>
      </div>
    );
  }

  const earnings = (settlement.components ?? []).filter((c) => c.component_type === 'earning');
  const deductions = (settlement.components ?? []).filter((c) => c.component_type === 'deduction');
  const payments = settlement.payments ?? [];
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const balanceDue = Number(settlement.net_payable ?? 0) - totalPaid;

  return (
    <SectionCard title="Full &amp; Final Settlement" icon={IndianRupee} iconClass="text-emerald-600">
      <div className="space-y-5">
        {/* Status row */}
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill
            colorClass={FNF_SETTLEMENT_STATUSES[settlement.status]}
            label={FNF_SETTLEMENT_STATUS_LABELS[settlement.status] ?? settlement.status}
          />
          {settlement.settlement_ref && (
            <span className="text-[10px] font-mono text-slate-400">#{settlement.settlement_ref}</span>
          )}
          {settlement.approved_at && (
            <span className="text-[11px] text-slate-400">
              Approved {fmtDateTime(settlement.approved_at)}
              {settlement.approver ? ` · ${fmtName(settlement.approver)}` : ''}
            </span>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FnfAmountCard
            label="Earnings"
            amount={settlement.total_earnings}
            colorBg="bg-emerald-50"
            colorBorder="border-emerald-100"
            colorText="text-emerald-800"
          />
          <FnfAmountCard
            label="Deductions"
            amount={settlement.total_deductions}
            colorBg="bg-red-50"
            colorBorder="border-red-100"
            colorText="text-red-800"
          />
          <FnfAmountCard
            label="Net Payable"
            amount={settlement.net_payable}
            colorBg="bg-brand-50"
            colorBorder="border-brand-100"
            colorText="text-brand-800"
          />
          <FnfAmountCard
            label="Balance Due"
            amount={settlement.balance_due ?? balanceDue}
            colorBg="bg-slate-50"
            colorBorder="border-slate-200"
            colorText="text-slate-700"
          />
        </div>

        {/* Earnings / Deductions breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FnfComponentTable
            title="Earnings"
            rows={earnings}
            amountClass="text-emerald-700"
          />
          <FnfComponentTable
            title="Deductions"
            rows={deductions}
            amountClass="text-red-600"
          />
        </div>

        {/* Net summary row */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-5 py-3">
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <TrendingUp size={13} /> Total Earnings: {fmtInr(settlement.total_earnings)}
            </span>
            <span className="text-slate-300">−</span>
            <span className="flex items-center gap-1.5 text-red-600 font-medium">
              <TrendingDown size={13} /> Total Deductions: {fmtInr(settlement.total_deductions)}
            </span>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Net Payable</p>
            <p className="text-base font-bold text-brand-700">{fmtInr(settlement.net_payable)}</p>
          </div>
        </div>

        {/* Payment history */}
        <FnfPaymentHistory payments={payments} />

        {/* Calculated / approved metadata */}
        {settlement.calculated_at && (
          <p className="text-[11px] text-slate-400">
            Calculated: {fmtDateTime(settlement.calculated_at)}
            {settlement.calculator ? ` · ${fmtName(settlement.calculator)}` : ''}
          </p>
        )}
      </div>
    </SectionCard>
  );
}

// ─── Relieving Letter Section ─────────────────────────────────────────────────

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

function RelievingLetterSection({ resignationId, separationRequestId, separationStatus }) {
  const [dlError, setDlError] = useState(null);
  const [dlLoading, setDlLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-relieving-letter', resignationId],
    queryFn: () => resignationApi.getMyRelievingLetter(resignationId),
    enabled: !!resignationId && !!separationRequestId,
    staleTime: 60_000,
  });

  const letter = data?.data?.letter ?? null;
  const isCompleted = separationStatus === 'completed';

  const handleDownload = async () => {
    setDlError(null);
    setDlLoading(true);
    try {
      const res = await resignationApi.downloadMyRelievingLetter(resignationId);
      triggerBlobDownload(res.data, 'relieving_letter.pdf');
    } catch {
      setDlError('Download failed. Please try again or contact HR.');
    } finally {
      setDlLoading(false);
    }
  };

  if (!separationRequestId) return null;

  if (isLoading) {
    return (
      <SectionCard title="Relieving Letter" icon={FileText} iconClass="text-brand-500">
        <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
          <Loader2 size={15} className="animate-spin" /> Loading…
        </div>
      </SectionCard>
    );
  }

  if (!isCompleted) {
    return (
      <SectionCard title="Relieving Letter" icon={FileText} iconClass="text-brand-500">
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>Your relieving letter will be available once your separation process is fully completed.</span>
        </div>
      </SectionCard>
    );
  }

  if (!letter) {
    return (
      <SectionCard title="Relieving Letter" icon={FileText} iconClass="text-brand-500">
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
          <Clock size={14} className="mt-0.5 shrink-0 text-slate-400" />
          <span>
            Your relieving letter has not been generated yet. Please contact HR if you expected it to be ready.
          </span>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Relieving Letter" icon={FileText} iconClass="text-brand-500">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 text-green-800 text-xs font-medium">
            <CheckCircle2 size={13} className="shrink-0" />
            <span>Your relieving letter is ready</span>
          </div>
          <p className="text-[11px] text-slate-500 pl-5">
            Letter date: {fmtDate(letter.letter_date)}
          </p>
          {dlError && <p className="text-xs text-red-600 pl-5">{dlError}</p>}
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={dlLoading}
          className="inline-flex items-center gap-1.5 text-xs bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white px-4 py-2 rounded-md font-medium transition shrink-0"
        >
          {dlLoading
            ? <Loader2 size={13} className="animate-spin" />
            : <Download size={13} />}
          Download PDF
        </button>
      </div>
    </SectionCard>
  );
}

// ─── Experience Letter Section ────────────────────────────────────────────────

function ExperienceLetterSection({ resignationId, separationRequestId, separationStatus }) {
  const [dlError, setDlError] = useState(null);
  const [dlLoading, setDlLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-experience-letter', resignationId],
    queryFn: () => resignationApi.getMyExperienceLetter(resignationId),
    enabled: !!resignationId && !!separationRequestId,
    staleTime: 60_000,
  });

  const letter = data?.data?.letter ?? null;
  const isCompleted = separationStatus === 'completed';

  const handleDownload = async () => {
    setDlError(null);
    setDlLoading(true);
    try {
      const res = await resignationApi.downloadMyExperienceLetter(resignationId);
      triggerBlobDownload(res.data, 'experience_certificate.pdf');
    } catch {
      setDlError('Download failed. Please try again or contact HR.');
    } finally {
      setDlLoading(false);
    }
  };

  if (!separationRequestId) return null;

  if (isLoading) {
    return (
      <SectionCard title="Experience Certificate" icon={Award} iconClass="text-indigo-500">
        <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
          <Loader2 size={15} className="animate-spin" /> Loading…
        </div>
      </SectionCard>
    );
  }

  if (!isCompleted) {
    return (
      <SectionCard title="Experience Certificate" icon={Award} iconClass="text-indigo-500">
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>Your experience certificate will be available once your separation process is fully completed.</span>
        </div>
      </SectionCard>
    );
  }

  if (!letter) {
    return (
      <SectionCard title="Experience Certificate" icon={Award} iconClass="text-indigo-500">
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
          <Clock size={14} className="mt-0.5 shrink-0 text-slate-400" />
          <span>
            Your experience certificate has not been generated yet. Please contact HR if you expected it to be ready.
          </span>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Experience Certificate" icon={Award} iconClass="text-indigo-500">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 text-indigo-800 text-xs font-medium">
            <CheckCircle2 size={13} className="shrink-0" />
            <span>Your experience certificate is ready</span>
          </div>
          <p className="text-[11px] text-slate-500 pl-5">
            Letter date: {fmtDate(letter.letter_date)}
          </p>
          {dlError && <p className="text-xs text-red-600 pl-5">{dlError}</p>}
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={dlLoading}
          className="inline-flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-md font-medium transition shrink-0"
        >
          {dlLoading
            ? <Loader2 size={13} className="animate-spin" />
            : <Download size={13} />}
          Download PDF
        </button>
      </div>
    </SectionCard>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MeExitPage() {
  const { user } = useAuthStore();

  const { data: resignationsData, isLoading: resignationsLoading } = useQuery({
    queryKey: ['my-resignations-exit', user?.id],
    queryFn: () => resignationApi.myRequests({ limit: 20 }),
    enabled: !!user?.id,
  });

  const allResignations = resignationsData?.data?.requests ?? [];

  // Prefer the most recent resignation with a linked separation request.
  // Fall back to the most recent overall.
  const activeResignation = useMemo(() => {
    const withSep = allResignations.filter((r) => r.separationRequest?.id);
    return withSep[0] ?? allResignations[0] ?? null;
  }, [allResignations]);

  const resignationId = activeResignation?.id;
  const separationRequestId = activeResignation?.separationRequest?.id;

  const { data: clearanceData, isLoading: clearanceLoading } = useQuery({
    queryKey: ['my-resignation-clearance', resignationId],
    queryFn: () => resignationApi.getResignationClearance(resignationId),
    enabled: !!resignationId && !!separationRequestId,
    staleTime: 60_000,
  });

  const clearance = clearanceData?.data?.clearance ?? null;
  const allItems = clearanceData?.data?.items ?? [];
  const progress = clearanceData?.data?.progress ?? clearance?.progress ?? null;
  const doneItems = allItems.filter((i) => TERMINAL_ITEM_STATUSES.has(i.status));
  const pendingItems = allItems.filter((i) => !TERMINAL_ITEM_STATUSES.has(i.status));

  const lwd =
    activeResignation?.separationRequest?.last_working_date ||
    activeResignation?.last_working_date ||
    activeResignation?.requested_last_working_date;

  const sepStatus = activeResignation?.separationRequest?.status;
  const exitType = activeResignation?.exit_type ?? 'resignation';

  if (resignationsLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-slate-400 text-sm">
        <Loader2 size={18} className="animate-spin" /> Loading exit status…
      </div>
    );
  }

  if (!activeResignation) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Exit Status" subtitle="Your exit clearance and settlement details" />
        <div className="card p-14 text-center">
          <DoorOpen size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">No active exit process</p>
          <p className="text-xs text-slate-400 mt-1">Submit a resignation to start the exit process.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Exit Status"
        subtitle={`${EXIT_TYPE_LABELS[exitType]} · Read-only view`}
      />

      {/* ── Top grid: resignation details + countdown ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4">
        <div className="card p-5">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Resignation Details
          </h3>

          <InfoRow label="Resignation Date">{fmtDate(activeResignation.resignation_date)}</InfoRow>
          <InfoRow label="Notice Period">
            {activeResignation.notice_period_days != null
              ? `${activeResignation.notice_period_days} days`
              : '—'}
          </InfoRow>
          <InfoRow label="Requested LWD">{fmtDate(activeResignation.requested_last_working_date)}</InfoRow>
          <InfoRow label="Confirmed LWD">{fmtDate(lwd)}</InfoRow>
          <InfoRow label="Resignation Status">
            <StatusPill
              colorClass={RESIGNATION_STATUS[activeResignation.status]}
              label={RESIGNATION_STATUS_LABELS[activeResignation.status] ?? activeResignation.status}
            />
          </InfoRow>
          {sepStatus && (
            <InfoRow label="Separation Status">
              <StatusPill
                colorClass={SEPARATION_STATUSES[sepStatus]}
                label={sepStatus.replace(/_/g, ' ')}
              />
            </InfoRow>
          )}
          {clearance && (
            <InfoRow label="Clearance Status">
              <StatusPill
                colorClass={CLEARANCE_STATUSES[clearance.status]}
                label={clearance.status.replace(/_/g, ' ')}
              />
            </InfoRow>
          )}

          {activeResignation.reason && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Reason</p>
              <p className="text-xs text-slate-700 bg-slate-50 rounded-lg p-3 leading-relaxed">
                {activeResignation.reason}
              </p>
            </div>
          )}
          {activeResignation.rejection_note && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] text-red-500 uppercase tracking-wide mb-1">Rejection Note</p>
              <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
                {activeResignation.rejection_note}
              </p>
            </div>
          )}
        </div>

        <CountdownCard lwd={lwd} />
      </div>

      {/* ── Clearance section ── */}
      {separationRequestId ? (
        clearanceLoading ? (
          <div className="card p-10 flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading clearance…
          </div>
        ) : !clearance ? (
          <div className="card p-10 text-center">
            <ShieldCheck size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">Clearance not started yet</p>
            <p className="text-xs text-slate-400 mt-1">
              HR will initiate your exit clearance checklist after approval.
            </p>
          </div>
        ) : (
          <SectionCard title="Exit Clearance" icon={ShieldCheck} iconClass="text-brand-500">
            <div className="space-y-5">
              <ClearanceProgress progress={progress} />

              {pendingItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-500" /> Pending ({pendingItems.length})
                  </p>
                  {pendingItems.map((item) => <ClearanceItemRow key={item.id} item={item} />)}
                </div>
              )}

              {doneItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-500" /> Completed ({doneItems.length})
                  </p>
                  {doneItems.map((item) => <ClearanceItemRow key={item.id} item={item} />)}
                </div>
              )}

              {allItems.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-4">
                  No clearance tasks assigned yet.
                </p>
              )}
            </div>
          </SectionCard>
        )
      ) : (
        <div className="card p-8 flex items-center gap-4 bg-amber-50 border border-amber-100">
          <AlertCircle size={20} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-900">Clearance pending approval</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Your exit clearance checklist will appear here once your resignation is approved by HR.
            </p>
          </div>
        </div>
      )}

      {/* ── F&F settlement section ── */}
      <FnfSection resignationId={resignationId} separationRequestId={separationRequestId} />

      {/* ── Relieving letter ── */}
      <RelievingLetterSection
        resignationId={resignationId}
        separationRequestId={separationRequestId}
        separationStatus={sepStatus}
      />

      {/* ── Experience certificate ── */}
      <ExperienceLetterSection
        resignationId={resignationId}
        separationRequestId={separationRequestId}
        separationStatus={sepStatus}
      />
    </div>
  );
}
