import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { financeApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import {
  EMPTY_LINE_ITEM,
  EMPTY_TRANSACTION_FORM,
  TRANSACTION_TYPES,
  PAYMENT_MODES,
  CATEGORY_TYPE_LABELS,
  PAYMENT_MODE_LABELS,
} from '../../constants/finance';
import { useAuthStore } from '../../store/auth.store';

let lineKey = 0;
function newLineItem() {
  lineKey += 1;
  return { _key: lineKey, ...EMPTY_LINE_ITEM };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function formatMoney(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function lineBaseAmount(item) {
  const qty = parseFloat(item.qty) || 0;
  const unitPrice = parseFloat(item.unit_price) || 0;
  return round2(qty * unitPrice);
}

function lineGstAmount(item) {
  if (!item.gst_applicable) return 0;
  const pct = parseFloat(item.gst_percent) || 0;
  return round2(lineBaseAmount(item) * pct / 100);
}

function lineTotal(item) {
  return round2(lineBaseAmount(item) + lineGstAmount(item));
}

function computeTotals(items) {
  const subtotal = round2(items.reduce((sum, item) => sum + lineBaseAmount(item), 0));
  const totalGst = round2(items.reduce((sum, item) => sum + lineGstAmount(item), 0));
  const grandTotal = round2(subtotal + totalGst);
  return { subtotal, totalGst, grandTotal };
}

function vendorBankDetails(vendor) {
  const bd = vendor?.bank_details || {};
  return {
    bank_name: bd.bank_name || '',
    account_number: bd.account_number || '',
    ifsc_code: bd.ifsc || '',
    account_holder_name: bd.account_name || '',
    upi: bd.upi || '',
  };
}

function hasBankDetails(details) {
  return Boolean(
    details.bank_name || details.account_number || details.ifsc_code || details.account_holder_name
  );
}

function hasUpiDetails(details) {
  return Boolean(details.upi);
}

const VENDOR_REQUIRED_MODES = ['bank', 'upi', 'cheque'];

function transactionToForm(tx) {
  return {
    date: tx.transaction_date,
    transaction_type: tx.transaction_type,
    vendor_id: tx.vendor_id ? String(tx.vendor_id) : '',
    category_id: String(tx.category_id),
    payment_mode: tx.payment_mode,
    cheque_number: tx.cheque_number || '',
    notes: tx.notes || '',
    line_items: (tx.line_items || []).map((item) => ({
      _key: ++lineKey,
      description: item.description,
      qty: String(item.qty),
      unit_price: String(item.unit_price),
      gst_applicable: Boolean(item.gst_applicable ?? parseFloat(item.gst_percent) > 0),
      gst_percent: String(item.gst_percent ?? 18),
    })),
  };
}

function invalidateFinanceQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
  queryClient.invalidateQueries({ queryKey: ['finance-vouchers'] });
  queryClient.invalidateQueries({ queryKey: ['daybook-dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['finance-ledger'] });
  queryClient.invalidateQueries({ queryKey: ['finance-trial-balance'] });
}

export default function AddTransactionPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;

  const [form, setForm] = useState({
    ...EMPTY_TRANSACTION_FORM,
    line_items: [newLineItem()],
  });
  const [formError, setFormError] = useState('');
  const [formReady, setFormReady] = useState(!isEdit);

  const categoryType = form.transaction_type === 'debit' ? 'expense' : 'income';

  const { data: txData, isLoading: txLoading, error: txError } = useQuery({
    queryKey: ['finance-transaction', selectedTenantId, id],
    queryFn: () => financeApi.getTransaction(id),
    enabled: isEdit && !tenantRequired,
  });

  const { data: vendorData } = useQuery({
    queryKey: ['finance-vendors-active', selectedTenantId],
    queryFn: () => financeApi.listVendors({ active_only: true }),
    enabled: !tenantRequired,
  });

  const { data: categoryData } = useQuery({
    queryKey: ['finance-categories-active', selectedTenantId, categoryType],
    queryFn: () => financeApi.listCategories({ active_only: true, type: categoryType }),
    enabled: !tenantRequired,
  });

  const { data: paymentModeData } = useQuery({
    queryKey: ['finance-payment-modes', selectedTenantId],
    queryFn: () => financeApi.listPaymentModes(),
    enabled: !tenantRequired,
  });

  useEffect(() => {
    if (!isEdit || !txData?.data?.transaction) return;
    setForm(transactionToForm(txData.data.transaction));
    setFormReady(true);
  }, [isEdit, txData]);

  const vendors = vendorData?.data?.vendors || [];
  const categories = categoryData?.data?.categories || [];
  const paymentModes = paymentModeData?.data?.modes || [];
  const unmappedModes = paymentModes.filter((m) => !m.mapping?.account_id);
  const selectedModeUnmapped = paymentModes.some(
    (m) => m.payment_mode === form.payment_mode && !m.mapping?.account_id
  );

  const selectedVendor = useMemo(
    () => vendors.find((v) => String(v.id) === form.vendor_id) || null,
    [vendors, form.vendor_id]
  );

  const vendorPaymentDetails = useMemo(() => {
    if (selectedVendor) {
      return vendorBankDetails(selectedVendor);
    }
    if (isEdit && txData?.data?.transaction?.vendor?.bank_details) {
      return vendorBankDetails(txData.data.transaction.vendor);
    }
    return vendorBankDetails(null);
  }, [selectedVendor, isEdit, txData]);

  const bankDetails = form.payment_mode === 'bank' ? vendorPaymentDetails : vendorBankDetails(null);
  const upiId = form.payment_mode === 'upi' ? vendorPaymentDetails.upi : '';
  const chequeBankName = form.payment_mode === 'cheque' ? vendorPaymentDetails.bank_name : '';

  const showBankSection = form.payment_mode === 'bank';
  const showUpiSection = form.payment_mode === 'upi';
  const showChequeSection = form.payment_mode === 'cheque';
  const vendorRequired = VENDOR_REQUIRED_MODES.includes(form.payment_mode);
  const bankDetailsReady = hasBankDetails(bankDetails);
  const upiDetailsReady = hasUpiDetails({ upi: upiId });
  const chequeDetailsReady = Boolean(chequeBankName && form.cheque_number.trim());

  const totals = useMemo(() => computeTotals(form.line_items), [form.line_items]);
  const { subtotal, totalGst, grandTotal } = totals;

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      isEdit ? financeApi.updateTransaction(id, payload) : financeApi.createTransaction(payload),
    onSuccess: () => {
      invalidateFinanceQueries(queryClient);
      navigate('/transactions');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to save transaction'),
  });

  const updateLine = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      line_items: prev.line_items.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, [field]: value };
        if (field === 'gst_applicable' && !value) {
          next.gst_percent = '18';
        }
        return next;
      }),
    }));
  };

  const addLine = () => {
    setForm((prev) => ({ ...prev, line_items: [...prev.line_items, newLineItem()] }));
  };

  const removeLine = (index) => {
    setForm((prev) => ({
      ...prev,
      line_items: prev.line_items.length > 1 ? prev.line_items.filter((_, i) => i !== index) : prev.line_items,
    }));
  };

  const buildPayload = () => ({
    date: form.date,
    transaction_type: form.transaction_type,
    vendor_id: form.vendor_id ? parseInt(form.vendor_id, 10) : null,
    category_id: parseInt(form.category_id, 10),
    payment_mode: form.payment_mode,
    cheque_number: form.payment_mode === 'cheque' ? form.cheque_number.trim() || null : null,
    notes: form.notes.trim() || null,
    line_items: form.line_items.map((item) => ({
      description: item.description.trim(),
      qty: parseFloat(item.qty),
      unit_price: parseFloat(item.unit_price),
      gst_applicable: Boolean(item.gst_applicable),
      gst_percent: item.gst_applicable ? parseFloat(item.gst_percent || 0) : 0,
    })),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.category_id) {
      setFormError('Select a category');
      return;
    }
    if (vendorRequired && !form.vendor_id) {
      setFormError('Select a vendor for this payment mode');
      return;
    }
    if (form.payment_mode === 'bank' && !bankDetailsReady) {
      setFormError('Selected vendor has no bank details. Add them on the Vendors page first.');
      return;
    }
    if (form.payment_mode === 'upi' && !upiDetailsReady) {
      setFormError('Selected vendor has no UPI ID. Add it on the Vendors page first.');
      return;
    }
    if (form.payment_mode === 'cheque') {
      if (!chequeBankName) {
        setFormError('Selected vendor has no bank name on file. Add bank details on the Vendors page first.');
        return;
      }
      if (!form.cheque_number.trim()) {
        setFormError('Enter the cheque number');
        return;
      }
    }
    if (selectedModeUnmapped) {
      setFormError(
        `Payment mode "${PAYMENT_MODE_LABELS[form.payment_mode]}" is not mapped to a bank/cash account. Configure it under Payment Modes first.`
      );
      return;
    }
    if (grandTotal <= 0) {
      setFormError('Add at least one line item with a positive amount');
      return;
    }

    const invalidLine = form.line_items.find((item) => !item.description.trim());
    if (invalidLine) {
      setFormError('Every line item needs a product name');
      return;
    }

    const invalidGst = form.line_items.find(
      (item) => item.gst_applicable && (!item.gst_percent || parseFloat(item.gst_percent) <= 0)
    );
    if (invalidGst) {
      setFormError('Enter GST % for lines where GST is enabled');
      return;
    }

    saveMutation.mutate(buildPayload());
  };

  if (tenantRequired) {
    return (
      <div className="card p-12 text-center text-slate-500">
        Select a tenant from the header to record transactions.
      </div>
    );
  }

  if (isEdit && txLoading) {
    return <div className="card p-12 text-center text-slate-400">Loading transaction…</div>;
  }

  if (isEdit && txError) {
    return (
      <div className="card p-12 text-center text-red-500">
        {txError.response?.data?.error?.message || 'Transaction not found'}
        <div className="mt-4">
          <Link to="/transactions" className="btn-secondary">Back to list</Link>
        </div>
      </div>
    );
  }

  if (isEdit && !formReady) {
    return <div className="card p-12 text-center text-slate-400">Loading transaction…</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Transaction' : 'Add Transaction'}
        subtitle={
          isEdit
            ? 'Updates reverse the old voucher and post a new balanced entry'
            : 'Posts a balanced payment or receipt voucher to the Day Book'
        }
        actions={
          <Link to="/transactions" className="btn-secondary">
            Back to list
          </Link>
        }
      />

      {unmappedModes.length > 0 && (
        <div className="px-4 py-3 rounded-lg bg-amber-50 text-amber-800 text-sm border border-amber-100">
          <strong>Setup required:</strong>{' '}
          {unmappedModes.map((m) => PAYMENT_MODE_LABELS[m.payment_mode]).join(', ')}{' '}
          {unmappedModes.length === 1 ? 'is' : 'are'} not mapped to a cash/bank account.{' '}
          <Link to="/finance/payment-modes" className="underline font-medium">
            Configure Payment Modes
          </Link>{' '}
          before posting.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {formError && (
          <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{formError}</div>
        )}

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Transaction Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} required />
            <Select
              label="Transaction Type"
              value={form.transaction_type}
              onChange={(v) => setForm({ ...form, transaction_type: v, category_id: '' })}
              options={TRANSACTION_TYPES}
            />
            <Select
              label={vendorRequired ? 'Vendor' : 'Vendor (optional)'}
              value={form.vendor_id}
              onChange={(v) => setForm({ ...form, vendor_id: v })}
              options={vendors.map((v) => ({ value: String(v.id), label: v.name }))}
              placeholder={vendorRequired ? 'Select vendor…' : 'None'}
              required={vendorRequired}
            />
            <Select
              label="Category"
              value={form.category_id}
              onChange={(v) => setForm({ ...form, category_id: v })}
              options={categories.map((c) => ({ value: String(c.id), label: `${c.name} (${CATEGORY_TYPE_LABELS[c.type]})` }))}
              placeholder={`Select ${categoryType} category…`}
              required
            />
            <Select
              label="Payment Mode"
              value={form.payment_mode}
              onChange={(v) => setForm({ ...form, payment_mode: v, cheque_number: v === 'cheque' ? form.cheque_number : '' })}
              options={PAYMENT_MODES}
            />
          </div>
        </div>

        {showUpiSection && (
          <div className="card p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-900">UPI Details</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Auto-filled from the vendor&apos;s bank profile (Vendors page)
              </p>
            </div>

            {!form.vendor_id ? (
              <div className="px-4 py-3 rounded-lg bg-amber-50 text-amber-800 text-sm border border-amber-100">
                Select a vendor above to load UPI ID.
              </div>
            ) : !upiDetailsReady ? (
              <div className="px-4 py-3 rounded-lg bg-amber-50 text-amber-800 text-sm border border-amber-100">
                <strong>{selectedVendor?.name || 'This vendor'}</strong> has no UPI ID on file.{' '}
                <Link to="/vendors" className="underline font-medium">
                  Add UPI in Vendors
                </Link>{' '}
                before posting a UPI payment.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReadOnlyField label="UPI ID" value={upiId} />
              </div>
            )}
          </div>
        )}

        {showChequeSection && (
          <div className="card p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Cheque Details</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bank name from vendor profile; enter the cheque number for this transaction
              </p>
            </div>

            {!form.vendor_id ? (
              <div className="px-4 py-3 rounded-lg bg-amber-50 text-amber-800 text-sm border border-amber-100">
                Select a vendor above to load bank name.
              </div>
            ) : !chequeBankName ? (
              <div className="px-4 py-3 rounded-lg bg-amber-50 text-amber-800 text-sm border border-amber-100">
                <strong>{selectedVendor?.name || 'This vendor'}</strong> has no bank name on file.{' '}
                <Link to="/vendors" className="underline font-medium">
                  Add bank details in Vendors
                </Link>{' '}
                before posting a cheque payment.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReadOnlyField label="Bank Name" value={chequeBankName} />
                <Field
                  label="Cheque Number"
                  value={form.cheque_number}
                  onChange={(v) => setForm({ ...form, cheque_number: v })}
                  required
                  placeholder="Enter cheque number"
                />
              </div>
            )}
          </div>
        )}

        {showBankSection && (
          <div className="card p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Beneficiary Bank Details</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Auto-filled from the vendor&apos;s bank profile (Vendors page)
              </p>
            </div>

            {!form.vendor_id ? (
              <div className="px-4 py-3 rounded-lg bg-amber-50 text-amber-800 text-sm border border-amber-100">
                Select a vendor above to load bank name, account number, IFSC, and account holder name.
              </div>
            ) : !bankDetailsReady ? (
              <div className="px-4 py-3 rounded-lg bg-amber-50 text-amber-800 text-sm border border-amber-100">
                <strong>{selectedVendor?.name || 'This vendor'}</strong> has no bank details on file.{' '}
                <Link to="/vendors" className="underline font-medium">
                  Add bank details in Vendors
                </Link>{' '}
                before posting a bank transfer.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReadOnlyField label="Bank Name" value={bankDetails.bank_name} />
                <ReadOnlyField label="Account Number" value={bankDetails.account_number} />
                <ReadOnlyField label="IFSC Code" value={bankDetails.ifsc_code} />
                <ReadOnlyField label="Account Holder Name" value={bankDetails.account_holder_name} />
              </div>
            )}
          </div>
        )}

        <div className="card overflow-x-auto overscroll-x-contain">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Product Items</h3>
            <button type="button" onClick={addLine} className="btn-primary text-xs">
              <Plus size={14} /> Add Item
            </button>
          </div>

          <div className="p-5 flex flex-col xl:flex-row gap-6">
            <div className="flex-1 min-w-0 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2.5 font-semibold min-w-[180px]">Product Name *</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-20">Qty *</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-28">Unit Price *</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-28">Amount</th>
                      <th className="text-center px-3 py-2.5 font-semibold w-16">GST?</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-20">GST %</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-28">GST Amt</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-28">Total</th>
                      <th className="px-3 py-2.5 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 border border-t-0 border-slate-200">
                    {form.line_items.map((item, index) => (
                      <tr key={item._key}>
                        <td className="px-3 py-2">
                          <input
                            value={item.description}
                            onChange={(e) => updateLine(index, 'description', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm"
                            placeholder="Enter product or service name"
                            required
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.qty}
                            onChange={(e) => updateLine(index, 'qty', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right font-mono"
                            required
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateLine(index, 'unit_price', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right font-mono"
                            required
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">
                          {formatMoney(lineBaseAmount(item))}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(item.gst_applicable)}
                            onChange={(e) => updateLine(index, 'gst_applicable', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="px-3 py-2">
                          {item.gst_applicable ? (
                            <input
                              type="number"
                              min="0.01"
                              max="100"
                              step="0.01"
                              value={item.gst_percent}
                              onChange={(e) => updateLine(index, 'gst_percent', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right font-mono"
                              required
                            />
                          ) : (
                            <span className="block text-right text-slate-300 font-mono px-2">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">
                          {formatMoney(lineGstAmount(item))}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-medium text-slate-900">
                          {formatMoney(lineTotal(item))}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            disabled={form.line_items.length === 1}
                            className="text-slate-400 hover:text-red-500 disabled:opacity-30"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">
                  Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Enter transaction details"
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                />
              </div>
            </div>

            <div className="xl:w-72 shrink-0">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-mono font-medium">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total GST</span>
                  <span className="font-mono font-medium">{formatMoney(totalGst)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between">
                  <span className="text-sm font-semibold text-slate-800">Grand Total</span>
                  <span className="font-mono font-bold text-emerald-600">{formatMoney(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Link to="/transactions" className="btn-secondary">Cancel</Link>
          <button
            type="submit"
            disabled={
              saveMutation.isPending
              || grandTotal <= 0
              || selectedModeUnmapped
              || (form.payment_mode === 'bank' && (!form.vendor_id || !bankDetailsReady))
              || (form.payment_mode === 'upi' && (!form.vendor_id || !upiDetailsReady))
              || (form.payment_mode === 'cheque' && !chequeDetailsReady)
            }
            className="btn-primary"
          >
            {saveMutation.isPending ? 'Posting…' : isEdit ? 'Update & Re-post' : 'Save & Post Voucher'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required, placeholder }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
      />
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder, required }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <div className="mt-1 w-full px-3 py-2 border border-slate-100 rounded-lg text-sm bg-slate-50 text-slate-800 font-mono min-h-[38px]">
        {value || '—'}
      </div>
    </div>
  );
}
