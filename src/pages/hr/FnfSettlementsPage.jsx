import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Banknote, CheckCircle2, X } from 'lucide-react';
import { hrApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import SeparationFnfPanel from '../../components/separation/SeparationFnfPanel';
import {
  FNF_PAYMENT_MODE_LABELS,
  FNF_PAYMENT_STATUS_CLASSES,
  FNF_PAYMENT_STATUS_LABELS,
  FNF_RECON_STATUS_LABELS,
  FNF_SETTLEMENT_STATUSES,
  FNF_SETTLEMENT_STATUS_LABELS,
} from '../../constants/hr';
import { cn } from '../../utils/helpers';
import { useTablePagination } from '../../hooks/useTablePagination';

const STATUS_CARDS = [
  { status: 'draft',          label: 'Draft',          color: 'text-slate-700'   },
  { status: 'calculated',     label: 'Calculated',     color: 'text-blue-700'    },
  { status: 'pending_approval', label: 'Pending Approval', color: 'text-amber-700' },
  { status: 'approved',       label: 'Approved',       color: 'text-indigo-700'  },
  { status: 'partially_paid', label: 'Partially Paid', color: 'text-orange-600'  },
  { status: 'paid',           label: 'Paid',           color: 'text-emerald-700' },
];

function fmtDate(value) {
  if (!value) return '—';
  try { return format(parseISO(value), 'dd MMM yyyy'); } catch { return value; }
}

function fmtInr(amount) {
  if (amount == null || amount === '') return '—';
  const num = Number(amount);
  if (Number.isNaN(num)) return '—';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function FnfDrawer({ settlement, onClose, onSettlementChange }) {
  const emp = settlement.employee;
  const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : '—';
  const exitType = settlement.separationRequest?.exit_type;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative bg-white w-full max-w-3xl h-full shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 truncate">{empName}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {[
                emp?.emp_code,
                emp?.department?.name,
                exitType && `${exitType} exit`,
              ].filter(Boolean).join(' · ')}
            </p>
            {settlement.settlement_ref && (
              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{settlement.settlement_ref}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <SeparationFnfPanel
            settlementId={settlement.id}
            enabled
            onSettlementChange={onSettlementChange}
          />
        </div>
      </div>
    </div>
  );
}

export default function FnfSettlementsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [view, setView] = useState('settlements');

  const { setPage, setLimit, paginateClient } = useTablePagination({
    resetDeps: [search, statusFilter],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['fnf-settlements-page'],
    queryFn: () => hrApi.listFnfSettlements({ limit: 500, page: 1 }),
    enabled: view === 'settlements',
  });

  const { data: reconData, isLoading: reconLoading } = useQuery({
    queryKey: ['fnf-finance-reconciliation'],
    queryFn: () => hrApi.getFnfFinanceReconciliation(),
    enabled: view === 'reconciliation',
  });

  const approvePaymentMutation = useMutation({
    mutationFn: ({ settlementId, paymentId }) =>
      hrApi.approveFnfPayment(settlementId, paymentId, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnf-finance-reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['fnf-settlements-page'] });
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: ({ settlementId, paymentId, reconciliation_status }) =>
      hrApi.reconcileFnfPayment(settlementId, paymentId, { reconciliation_status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnf-finance-reconciliation'] });
    },
  });

  const allSettlements = data?.data?.settlements || [];
  const reconSummary = reconData?.data?.summary;
  const reconPayments = reconData?.data?.payments || [];

  const counts = useMemo(() => {
    const c = {
      draft: 0,
      calculated: 0,
      pending_approval: 0,
      approved: 0,
      partially_paid: 0,
      paid: 0,
    };
    allSettlements.forEach((s) => {
      if (c[s.status] !== undefined) c[s.status]++;
    });
    return c;
  }, [allSettlements]);

  const filtered = useMemo(() => {
    let list = allSettlements;
    if (statusFilter) list = list.filter((s) => s.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => {
        const name = `${s.employee?.first_name || ''} ${s.employee?.last_name || ''}`.toLowerCase();
        const code = (s.employee?.emp_code || '').toLowerCase();
        const ref = (s.settlement_ref || '').toLowerCase();
        return name.includes(q) || code.includes(q) || ref.includes(q);
      });
    }
    return list;
  }, [allSettlements, search, statusFilter]);

  const { items, pagination } = paginateClient(filtered);

  const invalidatePage = () => {
    queryClient.invalidateQueries({ queryKey: ['fnf-settlements-page'] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="F&F Settlements"
        subtitle="Advances, loans, reimbursements, gratuity, tax, payment approvals and finance reconciliation"
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              className={cn('btn-secondary text-xs', view === 'settlements' && 'bg-slate-100')}
              onClick={() => setView('settlements')}
            >
              Settlements
            </button>
            <button
              type="button"
              className={cn('btn-secondary text-xs', view === 'reconciliation' && 'bg-slate-100')}
              onClick={() => setView('reconciliation')}
            >
              Finance reconciliation
            </button>
          </div>
        }
      />

      {view === 'reconciliation' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              ['Pending approval', reconSummary?.pending_approval],
              ['Completed', reconSummary?.completed],
              ['Unreconciled', reconSummary?.unreconciled],
              ['Matched', reconSummary?.matched],
              ['Pending ₹', reconSummary?.pending_amount],
              ['Paid ₹', reconSummary?.completed_amount],
            ].map(([label, value]) => (
              <div key={label} className="card p-3">
                <p className="text-[10px] uppercase text-slate-500 font-medium">{label}</p>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  {reconLoading
                    ? '…'
                    : typeof value === 'number' && label.includes('₹')
                      ? fmtInr(value)
                      : value ?? 0}
                </p>
              </div>
            ))}
          </div>

          <div className="card overflow-x-auto">
            {reconLoading ? (
              <p className="p-8 text-center text-slate-400 text-sm">Loading reconciliation…</p>
            ) : reconPayments.length === 0 ? (
              <p className="p-12 text-center text-slate-400 text-sm">No F&F payments yet</p>
            ) : (
              <table className="w-full text-xs min-w-[900px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Employee</th>
                    <th className="text-left px-4 py-3 font-semibold">Settlement</th>
                    <th className="text-left px-4 py-3 font-semibold">Date</th>
                    <th className="text-right px-4 py-3 font-semibold">Amount</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Recon</th>
                    <th className="text-left px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reconPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {`${payment.settlement?.employee?.first_name || ''} ${payment.settlement?.employee?.last_name || ''}`.trim() ||
                          '—'}
                        <p className="text-slate-400">{payment.settlement?.employee?.emp_code}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {payment.settlement?.settlement_ref || `#${payment.settlement_id}`}
                      </td>
                      <td className="px-4 py-3">{fmtDate(payment.payment_date)}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmtInr(payment.amount)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                            FNF_PAYMENT_STATUS_CLASSES[payment.status]
                          )}
                        >
                          {FNF_PAYMENT_STATUS_LABELS[payment.status] || payment.status}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {FNF_PAYMENT_MODE_LABELS[payment.payment_mode] || payment.payment_mode}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {FNF_RECON_STATUS_LABELS[payment.reconciliation_status] || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {payment.status === 'pending' && (
                            <button
                              type="button"
                              className="btn-secondary text-[10px] py-0.5 inline-flex items-center gap-1"
                              onClick={() =>
                                approvePaymentMutation.mutate({
                                  settlementId: payment.settlement_id,
                                  paymentId: payment.id,
                                })
                              }
                            >
                              <CheckCircle2 size={11} /> Approve
                            </button>
                          )}
                          {payment.status === 'completed' &&
                            payment.reconciliation_status !== 'matched' && (
                              <button
                                type="button"
                                className="btn-secondary text-[10px] py-0.5"
                                onClick={() =>
                                  reconcileMutation.mutate({
                                    settlementId: payment.settlement_id,
                                    paymentId: payment.id,
                                    reconciliation_status: 'matched',
                                  })
                                }
                              >
                                Mark matched
                              </button>
                            )}
                          {payment.status === 'completed' &&
                            payment.reconciliation_status !== 'discrepancy' && (
                              <button
                                type="button"
                                className="btn-secondary text-[10px] py-0.5 text-red-600"
                                onClick={() =>
                                  reconcileMutation.mutate({
                                    settlementId: payment.settlement_id,
                                    paymentId: payment.id,
                                    reconciliation_status: 'discrepancy',
                                  })
                                }
                              >
                                Flag
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
        </div>
      ) : (
        <>
      {/* Status stat cards (clickable as filters) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STATUS_CARDS.map((card) => (
          <button
            key={card.status}
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === card.status ? '' : card.status))}
            className={cn(
              'stat-card text-left transition-shadow',
              statusFilter === card.status && 'ring-2 ring-brand-500 shadow-sm'
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {card.label}
            </p>
            <p className={cn('text-2xl font-bold', card.color)}>
              {isLoading ? '…' : counts[card.status]}
            </p>
          </button>
        ))}
      </div>

      {/* Search + active filter chip */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          placeholder="Search by employee, code or ref…"
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-64"
        />
        {statusFilter && (
          <button
            type="button"
            onClick={() => setStatusFilter('')}
            className="btn-secondary text-xs py-1 inline-flex items-center gap-1"
          >
            <X size={11} />
            {FNF_SETTLEMENT_STATUS_LABELS[statusFilter]}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto overscroll-x-contain">
        {isLoading ? (
          <p className="p-8 text-center text-slate-400 text-sm">Loading settlements…</p>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Banknote size={28} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">
              {search || statusFilter
                ? 'No settlements match your filters'
                : 'No F&F settlements yet'}
            </p>
          </div>
        ) : (
          <table className="w-full text-xs min-w-[800px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Employee</th>
                <th className="text-left px-4 py-3 font-semibold">Exit Type</th>
                <th className="text-left px-4 py-3 font-semibold">LWD</th>
                <th className="text-right px-4 py-3 font-semibold">Net Payable</th>
                <th className="text-right px-4 py-3 font-semibold">Balance Due</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => setSelectedSettlement(s)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {s.employee?.first_name} {s.employee?.last_name}
                    </p>
                    <p className="text-slate-400">
                      {[s.employee?.emp_code, s.employee?.department?.name]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {s.separationRequest?.exit_type || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {fmtDate(s.last_working_date)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {fmtInr(s.net_payable)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={Number(s.balance_due) > 0 ? 'text-orange-600 font-medium' : 'text-slate-400'}>
                      {fmtInr(s.balance_due)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full',
                        FNF_SETTLEMENT_STATUSES[s.status]
                      )}
                    >
                      {FNF_SETTLEMENT_STATUS_LABELS[s.status] || s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedSettlement(s); }}
                      className="btn-secondary text-[10px] py-1 px-2"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && filtered.length > 0 && (
        <TablePagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}

      {selectedSettlement && (
        <FnfDrawer
          settlement={selectedSettlement}
          onClose={() => setSelectedSettlement(null)}
          onSettlementChange={invalidatePage}
        />
      )}
        </>
      )}
    </div>
  );
}
