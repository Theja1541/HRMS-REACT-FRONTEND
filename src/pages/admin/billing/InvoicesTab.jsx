import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { billingApi } from '../../../api';
import TablePagination from '../../../components/shared/TablePagination';
import StatusBadge from '../../../components/shared/StatusBadge';
import { useTablePagination, normalizePagination } from '../../../hooks/useTablePagination';
import { formatINR } from '../../../utils/helpers';
import { INVOICE_STATUS_OPTIONS, formatBillingDate } from '../../../constants/billingTabs';
import CreateInvoiceModal from './CreateInvoiceModal';

function selectClass() {
  return 'px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600';
}

export default function InvoicesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { page, limit, setPage, setLimit, queryParams } = useTablePagination({ resetDeps: [search, status] });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['billing-invoices', queryParams, search, status],
    queryFn: () =>
      billingApi.listInvoices({
        ...queryParams,
        search: search || undefined,
        status: status || undefined,
      }),
  });

  const invoices = data?.data?.invoices || [];
  const pagination = normalizePagination(data?.pagination, limit);

  const createMutation = useMutation({
    mutationFn: billingApi.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-alerts'] });
      setModalOpen(false);
    },
  });

  const voidMutation = useMutation({
    mutationFn: (id) => billingApi.updateInvoiceStatus(id, { status: 'void' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-alerts'] });
    },
  });

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Subscription Invoices</h3>
          <p className="text-xs text-slate-500 mt-1">Generate GST invoices for tenant subscription billing.</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus size={14} /> Generate Invoice
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice no. or tenant…"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass()}>
          {INVOICE_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-center text-slate-400 py-16 text-sm">Loading invoices…</p>
      ) : isError ? (
        <p className="text-center text-red-500 py-16 text-sm">
          {error?.response?.data?.error?.message || 'Failed to load invoices'}
        </p>
      ) : invoices.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-xl p-12 text-center">
          <p className="text-slate-400 text-sm">No invoices generated yet</p>
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary mt-4">
            <Plus size={14} /> Generate Invoice
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Invoice</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Tenant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">GST</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-900">{invoice.invoice_no}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{invoice.tenant?.name || '—'}</p>
                      <p className="text-xs text-slate-400">{invoice.tenant?.gstin || 'No GSTIN'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {invoice.plan?.name || '—'}
                      <span className="text-slate-400"> · {invoice.billing_cycle}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{formatBillingDate(invoice.invoice_date)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatINR(invoice.total)}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {invoice.gst_rate}% · {formatINR(invoice.gst_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={
                          invoice.status === 'paid'
                            ? 'active'
                            : invoice.status === 'void'
                              ? 'suspended'
                              : invoice.status
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {invoice.status === 'issued' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Void invoice ${invoice.invoice_no}?`)) {
                              voidMutation.mutate(invoice.id);
                            }
                          }}
                          disabled={voidMutation.isPending}
                          className="btn-secondary text-xs py-1.5 text-red-600 border-red-100 hover:bg-red-50"
                        >
                          Void
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      )}

      <CreateInvoiceModal
        open={modalOpen}
        saving={createMutation.isPending}
        error={createMutation.error?.response?.data?.error?.message || ''}
        onClose={() => setModalOpen(false)}
        onSave={(payload) => createMutation.mutate(payload)}
      />
    </div>
  );
}
