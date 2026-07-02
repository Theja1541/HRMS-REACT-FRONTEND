import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft } from 'lucide-react';
import { financeApi } from '../../api';
import TaxInvoiceDocument from '../../components/finance/TaxInvoiceDocument';
import { useAuthStore } from '../../store/auth.store';
import { printElementById } from '../../utils/printDocument';

export default function TransactionInvoicePage() {
  const { id } = useParams();
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;

  useEffect(() => {
    document.body.classList.add('document-print-page');
    return () => document.body.classList.remove('document-print-page');
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['finance-transaction-invoice', selectedTenantId, id],
    queryFn: () => financeApi.getTransactionInvoice(id),
    enabled: !tenantRequired && Boolean(id),
  });

  const payload = data?.data;

  const handlePrint = () => {
    printElementById('tax-invoice-print', { title: ' ' });
  };

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to view invoices.
      </div>
    );
  }

  if (isLoading) {
    return <div className="card p-12 text-center text-slate-400">Loading invoice…</div>;
  }

  if (error || !payload) {
    return (
      <div className="card p-12 text-center text-red-500">
        {error?.response?.data?.error?.message || 'Invoice not found'}
        <div className="mt-4">
          <Link to="/transactions" className="btn-secondary">Back to transactions</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="invoice-page">
      <div className="invoice-page-toolbar flex flex-wrap items-center justify-between gap-3 mb-4">
        <Link to="/transactions" className="btn-secondary">
          <ArrowLeft size={14} /> Back
        </Link>
        <div className="flex gap-2">
          <Link to={`/transactions/${id}`} className="btn-secondary">View Transaction</Link>
          <button type="button" onClick={handlePrint} className="btn-primary">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      <div className="invoice-page-preview bg-slate-100 p-4 md:p-8 rounded-xl">
        <TaxInvoiceDocument
          invoice={payload.invoice}
          tenant={payload.tenant}
          vendor={payload.vendor}
          transaction={payload.transaction}
        />
      </div>
    </div>
  );
}
