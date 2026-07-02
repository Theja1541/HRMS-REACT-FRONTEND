import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock,
  IndianRupee,
  Loader2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { employeeApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import {
  FNF_PAYMENT_MODE_LABELS,
  FNF_SETTLEMENT_STATUSES,
  FNF_SETTLEMENT_STATUS_LABELS,
} from '../../constants/hr';
import { cn } from '../../utils/helpers';

function fmtDate(value) {
  if (!value) return '—';
  try { return format(parseISO(value), 'dd MMM yyyy'); } catch { return value; }
}

function fmtDateTime(value) {
  if (!value) return '—';
  try { return format(parseISO(value), 'dd MMM yyyy, h:mm a'); } catch { return value; }
}

function fmtInr(amount) {
  if (amount == null || amount === '') return '—';
  const num = Number(amount);
  if (Number.isNaN(num)) return '—';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtName(user) {
  if (!user) return null;
  return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.emp_code || null;
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

function AmountCard({ label, amount, colorBg, colorBorder, colorText }) {
  return (
    <div className={cn('rounded-xl border p-4 flex flex-col gap-1', colorBg, colorBorder)}>
      <p className={cn('text-[10px] font-semibold uppercase tracking-wide', colorText)}>{label}</p>
      <p className={cn('text-lg font-bold tabular-nums', colorText)}>{fmtInr(amount)}</p>
    </div>
  );
}

function ComponentTable({ title, items, amountClass }) {
  if (items.length === 0) return null;
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <h4 className="text-xs font-semibold text-slate-800">{title}</h4>
      </div>
      <table className="w-full text-xs">
        <tbody className="divide-y divide-slate-100">
          {items.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="px-4 py-2.5 text-slate-700">{c.label}</td>
              <td className={cn('px-4 py-2.5 text-right font-medium tabular-nums', amountClass)}>
                {fmtInr(c.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentHistory({ payments }) {
  if (!payments.length) return null;

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);

  return (
    <SectionCard title="Payment History" icon={Banknote} iconClass="text-emerald-600">
      <div className="space-y-3">
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-800">{fmtDate(p.payment_date)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {FNF_PAYMENT_MODE_LABELS[p.payment_mode] || p.payment_mode}
                    {p.reference_number && ` · ${p.reference_number}`}
                  </p>
                  {p.notes && <p className="text-[11px] text-slate-400">{p.notes}</p>}
                </div>
              </div>
              <p className="text-sm font-semibold text-emerald-700 tabular-nums shrink-0">
                {fmtInr(p.amount)}
              </p>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center px-1 text-xs font-semibold text-slate-700">
          <span>Total paid</span>
          <span className="text-emerald-700 tabular-nums">{fmtInr(totalPaid)}</span>
        </div>
      </div>
    </SectionCard>
  );
}

export default function MeFnfPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['me-fnf-settlement'],
    queryFn: employeeApi.getMyFnfSettlement,
    staleTime: 60_000,
  });

  const settlement = data?.data?.settlement ?? null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Full &amp; Final" subtitle="Your F&amp;F settlement details" />
        <div className="card p-14 flex items-center justify-center gap-2 text-slate-400 text-sm">
          <Loader2 size={16} className="animate-spin" /> Loading settlement…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Full &amp; Final" subtitle="Your F&amp;F settlement details" />
        <div className="card p-10 flex items-center gap-4 bg-red-50 border border-red-100">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700">Failed to load your F&amp;F settlement. Please try again later.</p>
        </div>
      </div>
    );
  }

  if (!settlement) {
    return (
      <div className="space-y-6">
        <PageHeader title="Full &amp; Final" subtitle="Your F&amp;F settlement details" />
        <div className="card p-14 text-center">
          <IndianRupee size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">No F&amp;F settlement yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Your Full &amp; Final settlement will appear here after your separation is processed by HR.
          </p>
        </div>
      </div>
    );
  }

  const earnings = (settlement.components ?? []).filter((c) => c.component_type === 'earning');
  const deductions = (settlement.components ?? []).filter((c) => c.component_type === 'deduction');
  const payments = settlement.payments ?? [];
  const netPayable = Number(settlement.net_payable ?? 0);
  const balanceDue = Number(settlement.balance_due ?? 0);
  const isDraft = settlement.status === 'draft';

  return (
    <div className="space-y-6">
      <PageHeader title="Full &amp; Final" subtitle="Your F&amp;F settlement details" />

      {isDraft && (
        <div className="card p-4 flex items-center gap-3 bg-amber-50 border border-amber-100">
          <Clock size={16} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-800">
            Your F&amp;F settlement is being calculated. Figures will be finalised by HR before payment.
          </p>
        </div>
      )}

      {/* ── Status + ref ── */}
      <SectionCard title="Settlement Summary" icon={IndianRupee} iconClass="text-emerald-600">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                'text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize',
                FNF_SETTLEMENT_STATUSES[settlement.status]
              )}
            >
              {FNF_SETTLEMENT_STATUS_LABELS[settlement.status] ?? settlement.status}
            </span>
            {settlement.settlement_ref && (
              <span className="text-[10px] font-mono text-slate-400">#{settlement.settlement_ref}</span>
            )}
          </div>

          {/* Amount cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AmountCard
              label="Earnings"
              amount={settlement.total_earnings}
              colorBg="bg-emerald-50"
              colorBorder="border-emerald-100"
              colorText="text-emerald-800"
            />
            <AmountCard
              label="Deductions"
              amount={settlement.total_deductions}
              colorBg="bg-red-50"
              colorBorder="border-red-100"
              colorText="text-red-800"
            />
            <AmountCard
              label="Net Payable"
              amount={netPayable}
              colorBg="bg-brand-50"
              colorBorder="border-brand-100"
              colorText="text-brand-800"
            />
            <AmountCard
              label="Balance Due"
              amount={balanceDue}
              colorBg={balanceDue > 0 ? 'bg-orange-50' : 'bg-slate-50'}
              colorBorder={balanceDue > 0 ? 'border-orange-100' : 'border-slate-200'}
              colorText={balanceDue > 0 ? 'text-orange-700' : 'text-slate-700'}
            />
          </div>

          {/* Totals bar */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-5 py-3">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <TrendingUp size={13} /> Earnings: {fmtInr(settlement.total_earnings)}
              </span>
              <span className="text-slate-300">−</span>
              <span className="flex items-center gap-1.5 text-red-600 font-medium">
                <TrendingDown size={13} /> Deductions: {fmtInr(settlement.total_deductions)}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Net Payable</p>
              <p className="text-base font-bold text-brand-700 tabular-nums">{fmtInr(netPayable)}</p>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-slate-400">
            {settlement.last_working_date && (
              <span>Last working date: <span className="font-medium text-slate-600">{fmtDate(settlement.last_working_date)}</span></span>
            )}
            {settlement.calculated_at && (
              <span>Calculated: <span className="font-medium text-slate-600">{fmtDateTime(settlement.calculated_at)}</span></span>
            )}
            {settlement.approved_at && (
              <span>
                Approved: <span className="font-medium text-slate-600">{fmtDateTime(settlement.approved_at)}</span>
                {fmtName(settlement.approver) && ` · ${fmtName(settlement.approver)}`}
              </span>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── Component breakdown ── */}
      {(earnings.length > 0 || deductions.length > 0) && (
        <SectionCard title="Component Breakdown" icon={IndianRupee} iconClass="text-slate-400">
          <div className="grid md:grid-cols-2 gap-4">
            <ComponentTable title="Earnings" items={earnings} amountClass="text-emerald-700" />
            <ComponentTable title="Deductions" items={deductions} amountClass="text-red-600" />
          </div>
        </SectionCard>
      )}

      {/* ── Payment history ── */}
      <PaymentHistory payments={payments} />

      {/* ── Pending payment note ── */}
      {balanceDue > 0 && (
        <div className="card p-4 flex items-center gap-3 bg-orange-50 border border-orange-100">
          <AlertCircle size={16} className="text-orange-500 shrink-0" />
          <p className="text-xs text-orange-800">
            A balance of <strong>{fmtInr(balanceDue)}</strong> is pending. HR / Finance will process the payment.
          </p>
        </div>
      )}
    </div>
  );
}
