import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Download, Pencil, Printer, Send, X } from 'lucide-react';
import { financeApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import QuotationStatusBadge from '../../components/finance/QuotationStatusBadge';
import QuotationTotals from '../../components/finance/QuotationTotals';
import QuotationPrintDocument from '../../components/finance/QuotationPrintDocument';
import CreateQuotationDrawer from '../../components/finance/CreateQuotationDrawer';
import {
  FINANCE_WRITE_ROLES,
  QUOTATION_UNIT_LABELS,
  computeQuotationLineAmounts,
  formatQuotationCreatedBy,
  quotationDetailToFormValues,
  quotationFormValuesToApiPayload,
} from '../../constants/finance';
import { formatINR, cn } from '../../utils/helpers';
import { printElementById } from '../../utils/printDocument';
import { buildQuotationPdfFilename, exportQuotationPdf } from '../../utils/exportQuotationPdf';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';

function DetailItem({ label, value, mono, className, multiline }) {
  const display = value == null || String(value).trim() === '' ? '—' : value;
  return (
    <div className={className}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 font-medium text-slate-900',
          mono && 'font-mono',
          multiline && 'whitespace-pre-wrap break-words'
        )}
      >
        {display}
      </dd>
    </div>
  );
}

function QuotationViewContent({ quotation }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Quotation Details</h3>
            <QuotationStatusBadge status={quotation.status} />
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <DetailItem label="Quotation Number" value={quotation.quotation_no} mono />
            <DetailItem label="Date" value={quotation.date} />
            <DetailItem label="Valid Until" value={quotation.valid_until} />
            <DetailItem label="Created By" value={formatQuotationCreatedBy(quotation)} className="sm:col-span-2" />
          </dl>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Customer Details</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <DetailItem label="Customer Name" value={quotation.customer_name} className="sm:col-span-2" />
            <DetailItem label="Company Name" value={quotation.company_name} className="sm:col-span-2" />
            <DetailItem label="Contact Person" value={quotation.contact_person} />
            <DetailItem label="Phone" value={quotation.phone} />
            <DetailItem label="Email" value={quotation.email} className="sm:col-span-2" />
            <DetailItem label="Address" value={quotation.address} className="sm:col-span-2" multiline />
          </dl>
        </div>
      </div>

      <div className="card overflow-x-auto overscroll-x-contain">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">#</th>
                <th className="text-left px-4 py-3 font-semibold">Item Name</th>
                <th className="text-left px-4 py-3 font-semibold">Description</th>
                <th className="text-right px-4 py-3 font-semibold">Qty</th>
                <th className="text-left px-4 py-3 font-semibold">Unit</th>
                <th className="text-right px-4 py-3 font-semibold">Rate</th>
                <th className="text-right px-4 py-3 font-semibold">Discount</th>
                <th className="text-right px-4 py-3 font-semibold">GST %</th>
                <th className="text-right px-4 py-3 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotation.line_items.map((item, index) => {
                const { amount } = computeQuotationLineAmounts(item);
                return (
                  <tr key={`${item.item_name}-${index}`}>
                    <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.item_name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.description || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono">{item.qty}</td>
                    <td className="px-4 py-3">{QUOTATION_UNIT_LABELS[item.unit] || item.unit}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatINR(item.rate)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatINR(item.discount || 0)}</td>
                    <td className="px-4 py-3 text-right font-mono">{item.gst_percent}%</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">{formatINR(amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <QuotationTotals lineItems={quotation.line_items} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Notes</h3>
          {quotation.notes ? (
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{quotation.notes}</p>
          ) : (
            <p className="text-sm text-slate-400">No notes added.</p>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Terms & Conditions</h3>
          {quotation.terms_and_conditions ? (
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{quotation.terms_and_conditions}</p>
          ) : (
            <p className="text-sm text-slate-400">No terms specified.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ViewQuotationPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;
  const canWrite = FINANCE_WRITE_ROLES.includes(role);

  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [formError, setFormError] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['finance-quotation', selectedTenantId, id],
    queryFn: () => financeApi.getQuotation(id),
    enabled: !tenantRequired && Boolean(id),
  });

  const quotation = data?.data?.quotation;

  const updateMutation = useMutation({
    mutationFn: (payload) => financeApi.updateQuotation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-quotation', selectedTenantId, id] });
      queryClient.invalidateQueries({ queryKey: ['finance-quotations'] });
      setFormError('');
      setEditDrawerOpen(false);
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to update quotation'),
  });

  const statusMutation = useMutation({
    mutationFn: (status) => financeApi.updateQuotation(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-quotation', selectedTenantId, id] });
      queryClient.invalidateQueries({ queryKey: ['finance-quotations'] });
    },
    onError: (err) => {
      window.alert(err.response?.data?.error?.message || 'Failed to update quotation status');
    },
  });

  useEffect(() => {
    document.body.classList.add('document-print-page');
    return () => document.body.classList.remove('document-print-page');
  }, []);

  const tenant = user?.tenant;
  const editInitialValues = quotation ? quotationDetailToFormValues(quotation) : null;

  const handlePrint = () => {
    printElementById('quotation-view-print', { title: quotation?.quotation_no || 'Quotation' });
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('quotation-view-print');
    if (!element || exportingPdf) return;

    setExportingPdf(true);
    setPdfError(null);
    try {
      await exportQuotationPdf(element, buildQuotationPdfFilename(quotation?.quotation_no));
    } catch {
      setPdfError('Could not generate PDF. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleUpdate = (values) => {
    updateMutation.mutate(quotationFormValuesToApiPayload(values));
  };

  const handleStatusChange = (status) => {
    if (statusMutation.isPending) return;
    statusMutation.mutate(status);
  };

  const statusActionPending = statusMutation.isPending;
  const currentStatus = quotation?.status;

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to view quotations.
      </div>
    );
  }

  if (isLoading) {
    return <div className="card p-12 text-center text-slate-400 text-sm">Loading quotation…</div>;
  }

  if (error || !quotation) {
    return (
      <div className="card p-12 text-center text-red-500">
        {error?.response?.data?.error?.message || 'Quotation not found'}
        <div className="mt-4">
          <Link to="/quotations" className="btn-secondary">
            Back to quotations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Finance · Quotation"
        title="View Quotation"
        subtitle={quotation.quotation_no}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/quotations" className="btn-secondary">
              <ArrowLeft size={14} /> Back
            </Link>
            {canWrite && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setFormError('');
                  setEditDrawerOpen(true);
                }}
              >
                <Pencil size={14} /> Edit
              </button>
            )}
            <button type="button" onClick={handlePrint} className="btn-secondary">
              <Printer size={14} /> Print
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={exportingPdf}
              className="btn-primary"
            >
              <Download size={14} /> {exportingPdf ? 'Generating…' : 'Download PDF'}
            </button>
          </div>
        }
      />

      {pdfError && <p className="text-xs text-red-600">{pdfError}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Status</span>
          <QuotationStatusBadge status={quotation.status} />
        </div>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            {currentStatus === 'draft' && (
              <button
                type="button"
                onClick={() => handleStatusChange('sent')}
                disabled={statusActionPending}
                className="btn-secondary text-xs"
              >
                <Send size={14} /> Mark as Sent
              </button>
            )}
            {currentStatus === 'sent' && (
              <>
                <button
                  type="button"
                  onClick={() => handleStatusChange('accepted')}
                  disabled={statusActionPending}
                  className="btn-primary text-xs"
                >
                  <Check size={14} /> Accept
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('rejected')}
                  disabled={statusActionPending}
                  className="btn-secondary text-xs text-red-600 border-red-200 hover:bg-red-50"
                >
                  <X size={14} /> Reject
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <QuotationViewContent quotation={quotation} />

      <div className="quotation-page-preview bg-slate-100 p-4 md:p-8 rounded-xl flex flex-col items-center">
        <p className="text-xs font-medium text-slate-500 mb-3">Print preview</p>
        <QuotationPrintDocument quotation={quotation} tenant={tenant} />
      </div>

      <CreateQuotationDrawer
        open={editDrawerOpen}
        mode="edit"
        quotationId={quotation.id}
        initialValues={editInitialValues}
        saving={updateMutation.isPending}
        error={formError}
        onClose={() => {
          setEditDrawerOpen(false);
          setFormError('');
        }}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
