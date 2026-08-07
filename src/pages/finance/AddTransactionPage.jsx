import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { financeApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import QuickAddVendorModal from '../../components/finance/QuickAddVendorModal';
import {
  EMPTY_LINE_ITEM,
  EMPTY_TRANSACTION_FORM,
  TRANSACTION_TYPES,
  PAYMENT_MODES,
  PAYMENT_TYPES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
  CATEGORY_TYPE_LABELS,
  computePaymentSettlement,
  resolveLineGstSplit,
  buildTransactionNumber,
} from '../../constants/finance';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';

let lineKey = 0;
const EMPTY_PENDING_TRANSACTIONS = [];

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

function lineCgst(item) {
  if (!item.gst_applicable) return 0;
  return round2(parseFloat(item.cgst_amount) || 0);
}

function lineSgst(item) {
  if (!item.gst_applicable) return 0;
  return round2(parseFloat(item.sgst_amount) || 0);
}

function lineGstAmount(item) {
  return round2(lineCgst(item) + lineSgst(item));
}

function lineTotal(item) {
  return round2(lineBaseAmount(item) + lineGstAmount(item));
}

function computeTotals(items) {
  const subtotal = round2(items.reduce((sum, item) => sum + lineBaseAmount(item), 0));
  const totalCgst = round2(items.reduce((sum, item) => sum + lineCgst(item), 0));
  const totalSgst = round2(items.reduce((sum, item) => sum + lineSgst(item), 0));
  const grandTotal = round2(subtotal + totalCgst + totalSgst);
  return { subtotal, totalCgst, totalSgst, grandTotal };
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

function transactionToForm(tx) {
  const grandTotal = parseFloat(tx.total_amount) || 0;
  const amountReceived = parseFloat(tx.amount_received) || 0;
  const isPartial = amountReceived > 0 && amountReceived < grandTotal;

  return {
    date: tx.transaction_date,
    transaction_type: tx.transaction_type,
    vendor_id: tx.vendor_id ? String(tx.vendor_id) : '',
    category_id: String(tx.category_id),
    payment_mode: tx.payment_mode,
    cheque_number: tx.cheque_number || '',
    notes: tx.notes || '',
    payment_type: isPartial ? 'partial' : 'full',
    amount_received: String(amountReceived || grandTotal),
    pending_reminder_date: tx.pending_reminder_date || '',
    line_items: (tx.line_items || []).map((item) => {
      const split = resolveLineGstSplit(item);
      const gstOn = Boolean(item.gst_applicable ?? parseFloat(item.gst_amount) > 0);
      return {
        _key: ++lineKey,
        description: item.description,
        qty: String(item.qty),
        unit_price: String(item.unit_price),
        gst_applicable: gstOn,
        cgst_amount: gstOn ? String(split.cgst_amount || '') : '',
        sgst_amount: gstOn ? String(split.sgst_amount || '') : '',
      };
    }),
  };
}

function invalidateFinanceQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
  queryClient.invalidateQueries({ queryKey: ['finance-vouchers'] });
  queryClient.invalidateQueries({ queryKey: ['daybook-dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['finance-ledger'] });
  queryClient.invalidateQueries({ queryKey: ['finance-trial-balance'] });
  queryClient.invalidateQueries({ queryKey: ['gst'] });
}

export default function AddTransactionPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedTenantId } = useAuthStore();
  const role = usePortalRole();
  const tenantRequired = role === 'super_admin' && !selectedTenantId;

  const [form, setForm] = useState({
    ...EMPTY_TRANSACTION_FORM,
    line_items: [newLineItem()],
  });
  const [formError, setFormError] = useState('');
  const [formReady, setFormReady] = useState(!isEdit);
  const [showVendorModal, setShowVendorModal] = useState(false);
  /** @type {[{[id:string]: { selected: boolean, amount: string }}, Function]} */
  const [pendingSelections, setPendingSelections] = useState({});

  const categoryType = form.transaction_type === 'debit' ? 'expense' : 'income';

  const { data: txData, isLoading: txLoading, error: txError } = useQuery({
    queryKey: ['finance-transaction', selectedTenantId, id],
    queryFn: () => financeApi.getTransaction(id),
    enabled: isEdit && !tenantRequired,
  });

  const { data: vendorData, isLoading: vendorLoading } = useQuery({
    queryKey: ['finance-vendors-active', selectedTenantId],
    queryFn: () => financeApi.listVendors({ active_only: true }),
    enabled: !tenantRequired,
  });

  const { data: categoryData } = useQuery({
    queryKey: ['finance-categories-active', selectedTenantId, categoryType],
    queryFn: () => financeApi.listCategories({ active_only: true, type: categoryType }),
    enabled: !tenantRequired,
  });

  useEffect(() => {
    if (!isEdit || !txData?.data?.transaction) return;
    setForm(transactionToForm(txData.data.transaction));
    setFormReady(true);
  }, [isEdit, txData]);

  const vendors = vendorData?.data?.vendors || [];
  const categories = categoryData?.data?.categories || [];

  const selectedVendor = useMemo(
    () => vendors.find((v) => String(v.id) === form.vendor_id) || null,
    [vendors, form.vendor_id]
  );

  const { data: vendorPendingData, isFetching: vendorPendingLoading } = useQuery({
    queryKey: ['finance-vendor-pending', selectedTenantId, form.vendor_id, id],
    queryFn: () => financeApi.getVendor(form.vendor_id, isEdit ? { exclude_transaction_id: id } : undefined),
    enabled: !tenantRequired && Boolean(form.vendor_id),
  });

  const vendorPendingAmount = parseFloat(vendorPendingData?.data?.pending_amount) || 0;
  const pendingTransactions =
    vendorPendingData?.data?.pending_transactions ?? EMPTY_PENDING_TRANSACTIONS;

  useEffect(() => {
    if (!form.vendor_id) {
      setPendingSelections((prev) => (Object.keys(prev).length ? {} : prev));
      return;
    }

    const list = vendorPendingData?.data?.pending_transactions;
    if (!list) return;

    setPendingSelections((prev) => {
      const next = {};
      list.forEach((tx) => {
        const key = String(tx.id);
        next[key] = prev[key] || {
          selected: false,
          amount: String(tx.pending_amount || ''),
        };
      });

      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (
        prevKeys.length === nextKeys.length
        && nextKeys.every((key) => prev[key]?.selected === next[key].selected && prev[key]?.amount === next[key].amount)
      ) {
        return prev;
      }
      return next;
    });
  }, [form.vendor_id, vendorPendingData?.data?.pending_transactions]);

  const selectedPendingPayments = useMemo(() => {
    return pendingTransactions
      .map((tx) => {
        const sel = pendingSelections[String(tx.id)];
        if (!sel?.selected) return null;
        const amount = round2(parseFloat(sel.amount) || 0);
        return { tx, amount };
      })
      .filter(Boolean);
  }, [pendingTransactions, pendingSelections]);

  const selectedPendingTotal = useMemo(
    () => round2(selectedPendingPayments.reduce((sum, row) => sum + row.amount, 0)),
    [selectedPendingPayments]
  );

  const wantsNewEntry = form.line_items.some((item) => item.description.trim());
  const wantsPayPending = selectedPendingPayments.length > 0;

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
  const bankDetailsReady = hasBankDetails(bankDetails);
  const upiDetailsReady = hasUpiDetails({ upi: upiId });

  const totals = useMemo(() => computeTotals(form.line_items), [form.line_items]);
  const { subtotal, totalCgst, totalSgst, grandTotal } = totals;

  const paymentSettlement = useMemo(
    () => computePaymentSettlement(
      grandTotal,
      isEdit
        ? (txData?.data?.transaction?.amount_received ?? form.amount_received)
        : (form.payment_type === 'full' ? grandTotal : form.amount_received)
    ),
    [grandTotal, form.payment_type, form.amount_received, isEdit, txData]
  );

  const isPartiallyPaidEdit = isEdit && txData?.data?.transaction?.payment_status === 'partially_paid';

  useEffect(() => {
    if (form.payment_type !== 'full') return;
    setForm((prev) => {
      const nextAmount = grandTotal > 0 ? String(grandTotal) : '';
      if (prev.amount_received === nextAmount) return prev;
      return { ...prev, amount_received: nextAmount };
    });
  }, [form.payment_type, grandTotal]);

  const saveMutation = useMutation({
    mutationFn: async ({ createPayload, payments }) => {
      for (const payment of payments || []) {
        await financeApi.recordTransactionPayment(payment.tx.id, {
          payment_date: form.date,
          amount: payment.amount,
          payment_mode: form.payment_mode,
          cheque_number: form.payment_mode === 'cheque' ? form.cheque_number.trim() || null : null,
          notes: form.notes.trim() || null,
        });
      }
      if (createPayload) {
        if (isEdit) {
          return financeApi.updateTransaction(id, createPayload);
        }
        return financeApi.createTransaction(createPayload);
      }
      return null;
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['finance-vendor-pending'] });
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
          next.cgst_amount = '';
          next.sgst_amount = '';
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

  const togglePendingSelection = (txId, selected) => {
    const key = String(txId);
    setPendingSelections((prev) => ({
      ...prev,
      [key]: {
        selected,
        amount: prev[key]?.amount || '',
      },
    }));
  };

  const updatePendingPayAmount = (txId, amount) => {
    const key = String(txId);
    setPendingSelections((prev) => ({
      ...prev,
      [key]: {
        selected: prev[key]?.selected ?? true,
        amount,
      },
    }));
  };

  const buildPayload = () => {
    const payload = {
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
        cgst_amount: item.gst_applicable ? parseFloat(item.cgst_amount || 0) : 0,
        sgst_amount: item.gst_applicable ? parseFloat(item.sgst_amount || 0) : 0,
      })),
    };

    if (!isEdit) {
      payload.amount_received = paymentSettlement.amount_received;
      if (paymentSettlement.pending_amount > 0 && form.pending_reminder_date) {
        payload.pending_reminder_date = form.pending_reminder_date;
      }
    } else if (form.pending_reminder_date || paymentSettlement.pending_amount > 0) {
      payload.pending_reminder_date = form.pending_reminder_date || null;
    }

    return payload;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (isEdit) {
      if (!form.category_id) {
        setFormError('Select a category');
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
        (item) => item.gst_applicable && lineCgst(item) <= 0 && lineSgst(item) <= 0
      );
      if (invalidGst) {
        setFormError('Enter CGST and/or SGST for lines where GST is enabled');
        return;
      }
      saveMutation.mutate({ createPayload: buildPayload(), payments: [] });
      return;
    }

    if (!wantsPayPending && !wantsNewEntry) {
      setFormError('Select pending amount(s) to pay, or enter a new product item');
      return;
    }

    if (wantsPayPending) {
      for (const row of selectedPendingPayments) {
        if (row.amount <= 0) {
          setFormError('Enter a valid pay amount for each selected pending entry');
          return;
        }
        if (row.amount > round2(parseFloat(row.tx.pending_amount) || 0)) {
          setFormError(`Pay amount cannot exceed pending for ${buildTransactionNumber(row.tx)}`);
          return;
        }
      }
    }

    if (wantsNewEntry) {
      if (!form.category_id) {
        setFormError('Select a category for the new entry');
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
        (item) => item.gst_applicable && lineCgst(item) <= 0 && lineSgst(item) <= 0
      );
      if (invalidGst) {
        setFormError('Enter CGST and/or SGST for lines where GST is enabled');
        return;
      }
      const received = paymentSettlement.amount_received;
      if (received > grandTotal) {
        setFormError('Amount received cannot exceed grand total');
        return;
      }
      if (form.payment_type === 'partial' && received <= 0) {
        setFormError('Enter the amount received for a partial payment');
        return;
      }
    }

    saveMutation.mutate({
      createPayload: wantsNewEntry ? buildPayload() : null,
      payments: wantsPayPending ? selectedPendingPayments : [],
    });
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
    <div className="space-y-6 relative z-0">
      <PageHeader
        badge="Finance · Day Book"
        title={isEdit ? 'Edit Entry' : 'Add Entry'}
        subtitle={isEdit ? 'Update this payment or receipt' : 'Record a payment or receipt'}
        actions={
          <button type="button" onClick={() => navigate('/transactions')} className="btn-secondary">
            Back to Day Book
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {formError && (
          <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{formError}</div>
        )}

        {isEdit && isPartiallyPaidEdit && (
          <div className="px-4 py-3 rounded-lg bg-amber-50 text-amber-800 text-sm border border-amber-100">
            This entry has a pending balance. You can update transaction details here; use <strong>Receive Payment</strong> on the detail page to record further payments.
          </div>
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
            <div>
              <Select
                label="Vendor (optional)"
                value={form.vendor_id}
                onChange={(v) => setForm({ ...form, vendor_id: v })}
                options={vendors.map((v) => ({ value: String(v.id), label: v.name }))}
                placeholder={vendorLoading ? 'Loading vendors…' : 'None'}
                disabled={vendorLoading}
              />
              <button
                type="button"
                onClick={() => setShowVendorModal(true)}
                className="mt-1.5 text-xs text-brand-600 hover:underline font-medium"
              >
                + Add new vendor
              </button>
            </div>
            <Select
              label="Category"
              value={form.category_id}
              onChange={(v) => setForm({ ...form, category_id: v })}
              options={categories.map((c) => ({ value: String(c.id), label: `${c.name} (${CATEGORY_TYPE_LABELS[c.type]})` }))}
              placeholder={`Select ${categoryType} category…`}
              required={isEdit || wantsNewEntry}
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
              <p className="text-sm text-slate-500">
                Select a vendor above to auto-fill UPI ID (optional).
              </p>
            ) : !upiDetailsReady ? (
              <p className="text-sm text-slate-500">
                <strong>{selectedVendor?.name || 'This vendor'}</strong> has no UPI ID on file.{' '}
                <Link to="/vendors" className="text-brand-600 hover:underline font-medium">
                  Add UPI in Vendors
                </Link>{' '}
                to auto-fill here.
              </p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {form.vendor_id && chequeBankName ? (
                <ReadOnlyField label="Bank Name" value={chequeBankName} />
              ) : (
                <p className="text-sm text-slate-500 md:col-span-2">
                  {form.vendor_id
                    ? (
                      <>
                        <strong>{selectedVendor?.name || 'This vendor'}</strong> has no bank name on file.{' '}
                        <Link to="/vendors" className="text-brand-600 hover:underline font-medium">
                          Add bank details in Vendors
                        </Link>{' '}
                        to auto-fill bank name.
                      </>
                    )
                    : 'Select a vendor above to auto-fill bank name (optional).'}
                </p>
              )}
              <Field
                label="Cheque Number (optional)"
                value={form.cheque_number}
                onChange={(v) => setForm({ ...form, cheque_number: v })}
                placeholder="Enter cheque number"
              />
            </div>
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
              <p className="text-sm text-slate-500">
                Select a vendor above to auto-fill bank details (optional).
              </p>
            ) : !bankDetailsReady ? (
              <p className="text-sm text-slate-500">
                <strong>{selectedVendor?.name || 'This vendor'}</strong> has no bank details on file.{' '}
                <Link to="/vendors" className="text-brand-600 hover:underline font-medium">
                  Add bank details in Vendors
                </Link>{' '}
                to auto-fill here.
              </p>
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
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Product Items</h3>
              {!isEdit && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Select vendor pending to pay, or enter a new item below
                </p>
              )}
            </div>
            <button type="button" onClick={addLine} className="btn-primary text-xs">
              <Plus size={14} /> Add Item
            </button>
          </div>

          <div className="p-5 flex flex-col xl:flex-row gap-6">
            <div className="flex-1 min-w-0 space-y-4">
              {!isEdit && form.vendor_id && (
                <div className="border border-orange-100 rounded-xl overflow-hidden">
                  <div className="px-3 py-2.5 bg-orange-50 border-b border-orange-100 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-orange-900">
                        Outstanding with {selectedVendor?.name || 'vendor'}
                      </p>
                      <p className="text-[11px] text-orange-700/80 mt-0.5">
                        Tick rows you want to pay now. Leave unchecked to create a new entry only.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-semibold text-orange-800 whitespace-nowrap">
                      {vendorPendingLoading ? '…' : formatMoney(vendorPendingAmount)}
                    </span>
                  </div>
                  {vendorPendingLoading ? (
                    <p className="px-3 py-4 text-xs text-slate-400">Loading pending…</p>
                  ) : pendingTransactions.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-slate-500">No pending amount for this vendor.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="text-center px-3 py-2 font-semibold w-10">Pay</th>
                            <th className="text-left px-3 py-2 font-semibold">Date / Txn</th>
                            <th className="text-left px-3 py-2 font-semibold">Category</th>
                            <th className="text-right px-3 py-2 font-semibold">Pending</th>
                            <th className="text-right px-3 py-2 font-semibold w-32">Pay now</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pendingTransactions.map((tx) => {
                            const key = String(tx.id);
                            const sel = pendingSelections[key] || { selected: false, amount: String(tx.pending_amount) };
                            return (
                              <tr key={tx.id} className={sel.selected ? 'bg-orange-50/40' : ''}>
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(sel.selected)}
                                    onChange={(e) => togglePendingSelection(tx.id, e.target.checked)}
                                    className="rounded border-slate-300"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <p className="font-medium text-slate-800">{tx.transaction_date}</p>
                                  <p className="font-mono text-[11px] text-slate-500">{buildTransactionNumber(tx)}</p>
                                </td>
                                <td className="px-3 py-2 text-slate-600">{tx.category?.name || '—'}</td>
                                <td className="px-3 py-2 text-right font-mono font-semibold text-orange-700">
                                  {formatMoney(tx.pending_amount)}
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    disabled={!sel.selected}
                                    value={sel.amount}
                                    onChange={(e) => updatePendingPayAmount(tx.id, e.target.value)}
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right font-mono disabled:bg-slate-50 disabled:text-slate-400"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {wantsPayPending && (
                    <div className="px-3 py-2.5 bg-slate-50 border-t border-slate-100 flex justify-between text-xs">
                      <span className="text-slate-600">Selected to pay</span>
                      <span className="font-mono font-semibold text-emerald-700">{formatMoney(selectedPendingTotal)}</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  {isEdit ? 'Line items' : 'New entry'}
                </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2.5 font-semibold min-w-[180px]">Product Name *</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-20">Qty *</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-28">Unit Price *</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-28">Amount</th>
                      <th className="text-center px-3 py-2.5 font-semibold w-16">GST?</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-28">CGST</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-28">SGST</th>
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
                            required={wantsNewEntry || isEdit}
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
                            required={wantsNewEntry || isEdit}
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
                            required={wantsNewEntry || isEdit}
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
                              min="0"
                              step="0.01"
                              value={item.cgst_amount}
                              onChange={(e) => updateLine(index, 'cgst_amount', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right font-mono"
                              placeholder="0.00"
                            />
                          ) : (
                            <span className="block text-right text-slate-300 font-mono px-2">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {item.gst_applicable ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.sgst_amount}
                              onChange={(e) => updateLine(index, 'sgst_amount', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right font-mono"
                              placeholder="0.00"
                            />
                          ) : (
                            <span className="block text-right text-slate-300 font-mono px-2">—</span>
                          )}
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
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">
                  Details {wantsNewEntry && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder={wantsPayPending && !wantsNewEntry ? 'Optional note for payment' : 'Enter transaction details'}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                />
              </div>
            </div>

            <div className="xl:w-72 shrink-0 space-y-3">
              {wantsPayPending && (
                <div className="border border-orange-100 rounded-xl p-4 bg-orange-50 space-y-2">
                  <p className="text-xs font-semibold text-orange-900">Paying outstanding</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-800">Selected</span>
                    <span className="font-mono font-semibold text-orange-900">{formatMoney(selectedPendingTotal)}</span>
                  </div>
                </div>
              )}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <p className="text-xs font-semibold text-slate-700">New entry totals</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-mono font-medium">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">CGST</span>
                  <span className="font-mono font-medium">{formatMoney(totalCgst)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">SGST</span>
                  <span className="font-mono font-medium">{formatMoney(totalSgst)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between">
                  <span className="text-sm font-semibold text-slate-800">Grand Total</span>
                  <span className="font-mono font-bold text-emerald-600">{formatMoney(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!isEdit && wantsNewEntry ? (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Select
                label="Payment Type"
                value={form.payment_type}
                onChange={(v) => setForm({
                  ...form,
                  payment_type: v,
                  amount_received: v === 'full' ? String(grandTotal || '') : form.amount_received,
                  pending_reminder_date: v === 'full' ? '' : form.pending_reminder_date,
                })}
                options={PAYMENT_TYPES}
              />
              <ReadOnlyField label="Grand Total" value={formatMoney(grandTotal)} />
              <div>
                <Field
                  label="Initial Amount "
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.payment_type === 'full' ? String(grandTotal || '') : form.amount_received}
                  onChange={(v) => setForm({ ...form, amount_received: v, payment_type: 'partial' })}
                  disabled={form.payment_type === 'full'}
                  placeholder="0.00"
                />
                {form.payment_type === 'partial' && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Amount received now when creating this entry
                  </p>
                )}
              </div>
              <ReadOnlyField label="Pending Amount" value={formatMoney(paymentSettlement.pending_amount)} />
              <div>
                <label className="text-xs font-medium text-slate-600">Payment Status</label>
                <div className="mt-1">
                  <span className={`inline-flex text-[10px] px-2 py-1 rounded-full font-semibold ${PAYMENT_STATUS_STYLES[paymentSettlement.payment_status]}`}>
                    {PAYMENT_STATUS_LABELS[paymentSettlement.payment_status]}
                  </span>
                </div>
              </div>
              {paymentSettlement.pending_amount > 0 && (
                <Field
                  label="Pending Reminder Date"
                  type="date"
                  value={form.pending_reminder_date}
                  onChange={(v) => setForm({ ...form, pending_reminder_date: v })}
                />
              )}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Payment tracking is operational only in Phase 1. The accounting voucher still records the full grand total.
            </p>
          </div>
        ) : isEdit && paymentSettlement.pending_amount > 0 ? (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Payment Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ReadOnlyField label="Grand Total" value={formatMoney(grandTotal)} />
              <ReadOnlyField label="Amount Received" value={formatMoney(paymentSettlement.amount_received)} />
              <ReadOnlyField label="Pending Amount" value={formatMoney(paymentSettlement.pending_amount)} />
              <Field
                label="Pending Reminder Date"
                type="date"
                value={form.pending_reminder_date}
                onChange={(v) => setForm({ ...form, pending_reminder_date: v })}
              />
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => navigate('/transactions')} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              saveMutation.isPending
              || (isEdit ? grandTotal <= 0 : (!wantsPayPending && !wantsNewEntry))
            }
            className="btn-primary"
          >
            {saveMutation.isPending
              ? 'Saving…'
              : isEdit
                ? 'Update Entry'
                : wantsPayPending && wantsNewEntry
                  ? 'Pay Selected & Save Entry'
                  : wantsPayPending
                    ? 'Pay Selected'
                    : 'Save Entry'}
          </button>
        </div>
      </form>

      {showVendorModal ? (
        <QuickAddVendorModal
          open={showVendorModal}
          onClose={() => setShowVendorModal(false)}
          onCreated={(vendor) => {
            if (vendor?.id) setForm((prev) => ({ ...prev, vendor_id: String(vendor.id) }));
            setShowVendorModal(false);
          }}
        />
      ) : null}
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

function Select({ label, value, onChange, options, placeholder, required, disabled = false }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        required={required}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
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
