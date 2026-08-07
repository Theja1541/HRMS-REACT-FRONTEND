import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft } from 'lucide-react';
import { financeApi } from '../../api';
import PaymentReceiptDocument from '../../components/finance/PaymentReceiptDocument';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';
import { printElementById } from '../../utils/printDocument';

export default function TransactionReceiptPage() {
  const { id } = useParams();
  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;

  const handlePrint = () => {
    printElementById('payment-receipt-print', { title: ' ' });
  };

  useEffect(() => {
    document.body.classList.add('document-print-page');
    return () => document.body.classList.remove('document-print-page');
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['finance-transaction-receipt', selectedTenantId, id],
    queryFn: () => financeApi.getTransactionReceipt(id),
    enabled: !tenantRequired && Boolean(id),
  });

  const payload = data?.data;

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to view receipts.
      </div>
    );
  }

  if (isLoading) {
    return <div className="card p-12 text-center text-slate-400">Loading receipt…</div>;
  }

  if (error || !payload) {
    return (
      <div className="card p-12 text-center text-red-500">
        {error?.response?.data?.error?.message || 'Receipt not found'}
        <div className="mt-4">
          <Link to="/transactions" className="btn-secondary">Back to transactions</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="receipt-page">
      <div className="receipt-page-toolbar flex flex-wrap items-center justify-between gap-3 mb-4">
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

      <div className="receipt-page-preview bg-slate-100 p-4 md:p-8 rounded-xl flex justify-center">
        <div className="receipt-print-shell w-full shadow-lg rounded-lg overflow-hidden">
          <PaymentReceiptDocument
            receipt={payload.receipt}
            tenant={payload.tenant}
            vendor={payload.vendor}
          />
        </div>
      </div>
    </div>
  );
}
