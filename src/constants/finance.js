export const GST_TYPES = [
  { value: 'input', label: 'Input (Purchase)' },
  { value: 'output', label: 'Output (Sales)' },
  { value: 'reverse_charge', label: 'Reverse Charge' },
];

export const PAYROLL_STATUS_LABELS = {
  not_processed: 'Not processed',
  draft: 'Draft',
  processing: 'Processing',
  approved: 'Approved',
  locked: 'Locked',
  paid: 'Paid',
};

export const MANUAL_VOUCHER_TYPES = [
  { value: 'journal', label: 'Journal' },
  { value: 'payment', label: 'Payment' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'contra', label: 'Contra' },
];

export const VOUCHER_TYPES = [
  { value: '', label: 'All types' },
  ...MANUAL_VOUCHER_TYPES,
  { value: 'payroll_accrual', label: 'Payroll accrual' },
  { value: 'payroll_disbursement', label: 'Payroll disbursement' },
];

export const VOUCHER_TYPE_LABELS = Object.fromEntries(
  VOUCHER_TYPES.filter((t) => t.value).map((t) => [t.value, t.label])
);

export const VOUCHER_SOURCE_LABELS = {
  payroll_run: 'Payroll',
  manual: 'Manual',
  reimbursement: 'Reimbursement',
  statutory_payment: 'Statutory',
  finance_transaction: 'Transaction',
};

export const VOUCHER_SOURCE_TYPES = [
  { value: '', label: 'All sources' },
  { value: 'finance_transaction', label: 'Transaction' },
  { value: 'manual', label: 'Manual' },
  { value: 'payroll_run', label: 'Payroll' },
  { value: 'reimbursement', label: 'Reimbursement' },
  { value: 'statutory_payment', label: 'Statutory' },
];

export const TRANSACTION_TYPES = [
  { value: 'debit', label: 'Debit (Money out)' },
  { value: 'credit', label: 'Credit (Money in)' },
];

export const TRANSACTION_TYPE_LABELS = Object.fromEntries(TRANSACTION_TYPES.map((t) => [t.value, t.label]));

export const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
];

export const PAYMENT_MODE_LABELS = Object.fromEntries(PAYMENT_MODES.map((t) => [t.value, t.label]));

export const PAYMENT_TYPES = [
  { value: 'full', label: 'Full Payment' },
  { value: 'partial', label: 'Partial Payment' },
];

export const PAYMENT_STATUSES = [
  { value: 'paid', label: 'Paid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'unpaid', label: 'Unpaid' },
];

export const PAYMENT_STATUS_LABELS = {
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  unpaid: 'Unpaid',
};

export const PAYMENT_STATUS_STYLES = {
  paid: 'bg-emerald-50 text-emerald-700',
  partially_paid: 'bg-orange-50 text-orange-700',
  unpaid: 'bg-red-50 text-red-700',
};

export function computePaymentSettlement(grandTotal, amountReceived) {
  const total = Math.round((parseFloat(grandTotal) || 0) * 100) / 100;
  let received = Math.round((parseFloat(amountReceived) || 0) * 100) / 100;

  if (received < 0) received = 0;
  if (received > total) received = total;

  const pending_amount = Math.round(Math.max(0, total - received) * 100) / 100;
  let payment_status = 'unpaid';
  if (pending_amount <= 0) payment_status = 'paid';
  else if (received > 0) payment_status = 'partially_paid';

  return { amount_received: received, pending_amount, payment_status };
}

export function resolvePaymentStatus(transaction) {
  if (transaction?.payment_status) return transaction.payment_status;
  const pending = parseFloat(transaction?.pending_amount ?? 0);
  const received = parseFloat(transaction?.amount_received ?? 0);
  if (pending <= 0 && received > 0) return 'paid';
  if (received > 0) return 'partially_paid';
  return 'unpaid';
}

export function buildTransactionNumber(transaction) {
  if (!transaction?.id || !transaction?.transaction_date) return '—';
  const dateCompact = String(transaction.transaction_date).replace(/-/g, '');
  return `TXN-${dateCompact}-${String(transaction.id).padStart(4, '0')}`;
}

/** Prefer stored CGST/SGST; otherwise split total GST 50/50 (legacy rows). */
export function resolveLineGstSplit(item) {
  if (item?.cgst_amount != null || item?.sgst_amount != null) {
    const cgst_amount = Math.round((parseFloat(item.cgst_amount) || 0) * 100) / 100;
    const sgst_amount = Math.round((parseFloat(item.sgst_amount) || 0) * 100) / 100;
    const taxable = parseFloat(item?.amount) || 0;
    return {
      cgst_amount,
      sgst_amount,
      cgst_rate: taxable > 0 ? Math.round((cgst_amount / taxable) * 10000) / 100 : 0,
      sgst_rate: taxable > 0 ? Math.round((sgst_amount / taxable) * 10000) / 100 : 0,
    };
  }
  return splitIntraStateGst(item?.gst_amount, item?.gst_percent);
}

/** Intra-state GST: split total GST 50/50 into CGST + SGST (legacy fallback). */
export function splitIntraStateGst(gstAmount, gstPercent = 0) {
  const total = Math.round((parseFloat(gstAmount) || 0) * 100) / 100;
  const rate = Math.round((parseFloat(gstPercent) || 0) * 100) / 100;
  const halfAmount = Math.round((total / 2) * 100) / 100;
  const halfRate = Math.round((rate / 2) * 100) / 100;
  return {
    cgst_rate: halfRate,
    sgst_rate: Math.round((rate - halfRate) * 100) / 100,
    cgst_amount: halfAmount,
    sgst_amount: Math.round((total - halfAmount) * 100) / 100,
  };
}

export const EMPTY_LINE_ITEM = {
  description: '',
  qty: '1',
  unit_price: '',
  gst_applicable: false,
  cgst_amount: '',
  sgst_amount: '',
};

export const EMPTY_TRANSACTION_FORM = {
  date: new Date().toISOString().slice(0, 10),
  transaction_type: 'debit',
  vendor_id: '',
  category_id: '',
  payment_mode: 'cash',
  cheque_number: '',
  payment_type: 'full',
  amount_received: '',
  pending_reminder_date: '',
  line_items: [{ description: '', qty: '1', unit_price: '', gst_applicable: false, cgst_amount: '', sgst_amount: '' }],
  notes: '',
};

export const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'income', 'expense'];

export const ACCOUNT_TYPE_LABELS = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expenses',
};

export const VENDOR_TYPES = [
  { value: 'supplier', label: 'Supplier' },
  { value: 'service_provider', label: 'Service Provider' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'professional', label: 'Professional' },
  { value: 'other', label: 'Other' },
];

export const VENDOR_TYPE_LABELS = Object.fromEntries(VENDOR_TYPES.map((t) => [t.value, t.label]));

export const EMPTY_VENDOR_FORM = {
  name: '',
  type: 'supplier',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  gst_applicable: false,
  gstin: '',
  bank_details: {
    account_name: '',
    bank_name: '',
    branch: '',
    account_number: '',
    ifsc: '',
    upi: '',
  },
  active: true,
};

export const CATEGORY_TYPES = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

export const CATEGORY_TYPE_LABELS = Object.fromEntries(CATEGORY_TYPES.map((t) => [t.value, t.label]));

export const EMPTY_CATEGORY_FORM = {
  name: '',
  type: 'expense',
  description: '',
  active: true,
};

export const FINANCE_WRITE_ROLES = ['super_admin', 'owner', 'admin', 'hr'];

export const QUOTATION_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const QUOTATION_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...QUOTATION_STATUSES,
];

export const QUOTATION_STATUS_LABELS = Object.fromEntries(
  QUOTATION_STATUSES.map((status) => [status.value, status.label])
);

export const QUOTATION_STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-50 text-blue-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  expired: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-violet-50 text-violet-700',
};

function quotationFinancialYearLabel(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const startYear = m >= 4 ? y : y - 1;
  const endYear = (startYear + 1) % 100;
  return `${startYear}-${String(endYear).padStart(2, '0')}`;
}

/** Placeholder number shown until backend assigns the real sequence on save. */
export function buildPlaceholderQuotationNumber(sequence = 1) {
  return `QT-${quotationFinancialYearLabel()}-${String(sequence).padStart(4, '0')}`;
}

function addDaysToDateString(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function createEmptyQuotationForm({ quotationNumber, date } = {}) {
  const quotationDate = date || new Date().toISOString().slice(0, 10);
  return {
    quotation_number: quotationNumber || '',
    date: quotationDate,
    valid_until: addDaysToDateString(quotationDate, 30),
    customer_name: '',
    company_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    terms_and_conditions: '',
  };
}

export const EMPTY_QUOTATION_FORM = createEmptyQuotationForm();

export const QUOTATION_UNITS = [
  { value: 'nos', label: 'Nos' },
  { value: 'pcs', label: 'Pcs' },
  { value: 'kg', label: 'Kg' },
  { value: 'ltr', label: 'Ltr' },
  { value: 'box', label: 'Box' },
  { value: 'hrs', label: 'Hrs' },
  { value: 'days', label: 'Days' },
];

export const QUOTATION_UNIT_LABELS = Object.fromEntries(
  QUOTATION_UNITS.map((unit) => [unit.value, unit.label])
);

export const EMPTY_QUOTATION_LINE_ITEM = {
  item_name: '',
  description: '',
  qty: '1',
  unit: 'nos',
  rate: '',
  discount: '0',
  gst_percent: '18',
};

function quotationRound2(value) {
  return Math.round(value * 100) / 100;
}

export function computeQuotationLineAmounts(line) {
  const qty = parseFloat(line?.qty) || 0;
  const rate = parseFloat(line?.rate) || 0;
  const discount = parseFloat(line?.discount) || 0;
  const gstPercent = parseFloat(line?.gst_percent) || 0;

  const subtotal = quotationRound2(qty * rate);
  const taxable = quotationRound2(Math.max(0, subtotal - discount));
  const gstAmount = quotationRound2(taxable * gstPercent / 100);
  const amount = quotationRound2(taxable + gstAmount);

  return { subtotal, taxable, gstAmount, amount };
}

export function computeQuotationTotals(lineItems = []) {
  return lineItems.reduce(
    (acc, line) => {
      const { subtotal, taxable, gstAmount, amount } = computeQuotationLineAmounts(line);
      acc.subtotal = quotationRound2(acc.subtotal + subtotal);
      acc.discount = quotationRound2(acc.discount + (subtotal - taxable));
      acc.taxable = quotationRound2(acc.taxable + taxable);
      acc.gst = quotationRound2(acc.gst + gstAmount);
      acc.grandTotal = quotationRound2(acc.grandTotal + amount);
      return acc;
    },
    { subtotal: 0, discount: 0, taxable: 0, gst: 0, grandTotal: 0 }
  );
}

export function createEmptyQuotationFormValues({ quotationNumber, date } = {}) {
  return {
    ...createEmptyQuotationForm({ quotationNumber, date }),
    line_items: [{ ...EMPTY_QUOTATION_LINE_ITEM }],
  };
}

export function normalizeQuotationPhone(phone) {
  if (!phone) return '';
  const compact = String(phone).replace(/[^\d+]/g, '');
  if (!compact) return '';
  return compact.startsWith('+') ? compact : `+${compact}`;
}

export function formatQuotationCreatedBy(quotation) {
  if (!quotation) return '—';
  if (quotation.created_by_name) return quotation.created_by_name;
  if (typeof quotation.created_by === 'string' && !/^\d+$/.test(quotation.created_by.trim())) {
    return quotation.created_by;
  }
  return '—';
}

/** Map quotation detail (API/dummy) into React Hook Form values. */
export function quotationDetailToFormValues(quotation) {
  if (!quotation) return createEmptyQuotationFormValues();

  const lineItems = quotation.line_items?.length
    ? quotation.line_items
    : [{ ...EMPTY_QUOTATION_LINE_ITEM }];

  return {
    quotation_number: quotation.quotation_no || quotation.quotation_number || '',
    date: quotation.date || quotation.quotation_date || '',
    valid_until: quotation.valid_until || '',
    customer_name: quotation.customer_name || quotation.customer || '',
    company_name: quotation.company_name || '',
    contact_person: quotation.contact_person || '',
    phone: normalizeQuotationPhone(quotation.phone),
    email: quotation.email || '',
    address: quotation.address || '',
    notes: quotation.notes || '',
    terms_and_conditions: quotation.terms_and_conditions || '',
    status: quotation.status || 'draft',
    line_items: lineItems.map((item) => ({
      item_name: item.item_name || '',
      description: item.description || '',
      qty: String(item.qty ?? '1'),
      unit: item.unit || 'nos',
      rate: item.rate !== undefined && item.rate !== null ? String(item.rate) : '',
      discount: item.discount !== undefined && item.discount !== null ? String(item.discount) : '0',
      gst_percent: item.gst_percent !== undefined && item.gst_percent !== null ? String(item.gst_percent) : '18',
    })),
  };
}

/** Map React Hook Form values to quotation API create/update payload. */
export function quotationFormValuesToApiPayload(formValues, { status } = {}) {
  const payload = {
    date: formValues.date,
    valid_until: formValues.valid_until,
    status: status ?? formValues.status ?? 'draft',
    customer_name: formValues.customer_name?.trim() || '',
    company_name: formValues.company_name?.trim() || null,
    contact_person: formValues.contact_person?.trim() || null,
    phone: formValues.phone?.trim() || null,
    email: formValues.email?.trim() || null,
    address: formValues.address?.trim() || null,
    notes: formValues.notes || null,
    terms_and_conditions: formValues.terms_and_conditions || null,
    line_items: (formValues.line_items || []).map((item) => ({
      item_name: item.item_name?.trim() || '',
      description: item.description?.trim() || '',
      qty: item.qty,
      unit: item.unit || 'nos',
      rate: item.rate,
      discount: item.discount ?? '0',
      gst_percent: item.gst_percent ?? '18',
    })),
  };

  const quotationNumber = formValues.quotation_number?.trim();
  if (quotationNumber) {
    payload.quotation_number = quotationNumber;
  }

  return payload;
}

/** Deep-copy a quotation as a new draft with a fresh id and number. */
export function duplicateQuotationDetail(source, { newId, quotationNo, createdBy, date } = {}) {
  if (!source) return null;

  const quotationDate = date || new Date().toISOString().slice(0, 10);

  return {
    ...source,
    id: newId,
    quotation_no: quotationNo,
    status: 'draft',
    date: quotationDate,
    valid_until: addDaysToDateString(quotationDate, 30),
    created_by: createdBy || source.created_by,
    line_items: (source.line_items || []).map((item) => ({ ...item })),
  };
}

/** Merge submitted form values back into a quotation detail record. */
export function mergeQuotationFormIntoDetail(existing, formValues) {
  const line_items = (formValues.line_items || []).map((item) => ({
    item_name: item.item_name?.trim() || '',
    description: item.description?.trim() || '',
    qty: item.qty,
    unit: item.unit || 'nos',
    rate: item.rate,
    discount: item.discount ?? '0',
    gst_percent: item.gst_percent ?? '18',
  }));

  const totals = computeQuotationTotals(line_items);

  return {
    ...existing,
    quotation_no: formValues.quotation_number,
    date: formValues.date,
    valid_until: formValues.valid_until,
    customer_name: formValues.customer_name?.trim() || '',
    customer: formValues.customer_name?.trim() || '',
    company_name: formValues.company_name?.trim() || '',
    contact_person: formValues.contact_person?.trim() || '',
    phone: formValues.phone || '',
    email: formValues.email?.trim() || '',
    address: formValues.address?.trim() || '',
    notes: formValues.notes || '',
    terms_and_conditions: formValues.terms_and_conditions || '',
    line_items,
    total: totals.grandTotal,
  };
}

/** Summary row fields for the quotations list table. */
export function quotationDetailToListRow(quotation) {
  const totals = computeQuotationTotals(quotation.line_items || []);
  return {
    quotation_no: quotation.quotation_no,
    customer: quotation.customer_name || quotation.customer,
    date: quotation.date,
    valid_until: quotation.valid_until,
    total: totals.grandTotal,
    status: quotation.status,
    created_by: quotation.created_by,
  };
}

/** Short one-line tips only — keep Finance screens uncluttered. */
export const FINANCE_PAGE_GUIDES = {
  dashboard: {
    tip: 'Income and expense overview for the selected dates.',
  },
  daybook: {
    tip: 'Use Day Book to record payments and receipts. Add vendors when needed.',
  },
  transactions: {
    tip: 'Debit (Money out) = payment/expense. Credit (Money in) = receipt/income. Click Add Entry to record.',
  },
  'payment-modes': {
    tip: 'Cash and bank accounts are set automatically. You do not need this page.',
  },
  categories: {
    tip: 'Create income and expense categories, then pick them when adding an entry.',
  },
  vendors: {
    tip: 'Add suppliers here, then select them on payments.',
  },
  'finance-summary': {
    tip: 'Combined view: Day Book totals + Payroll totals for the selected month.',
  },
  gst: {
    tip: 'Monthly GST log for filing. GST on each payment/receipt is stored on the entry.',
  },
};

export function flattenCoaGroups(groups) {
  if (!groups) return [];
  return Object.values(groups)
    .flat()
    .filter((account) => account.is_active !== false)
    .sort((a, b) => String(a.code).localeCompare(String(b.code)));
}

/** Mask bank account number for list display (last 4 digits visible). */
export function maskAccountNumber(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 4) return digits;
  return `•••• ${digits.slice(-4)}`;
}

/**
 * Structured vendor bank display for table cells and tooltips.
 */
export function formatVendorBankDetails(bankDetails) {
  if (!bankDetails || typeof bankDetails !== 'object') return null;

  const accountName = bankDetails.account_name?.trim() || '';
  const bankName = bankDetails.bank_name?.trim() || '';
  const branch = bankDetails.branch?.trim() || '';
  const accountNumber = bankDetails.account_number?.trim() || '';
  const ifsc = bankDetails.ifsc?.trim().toUpperCase() || '';
  const upi = bankDetails.upi?.trim().toLowerCase() || '';

  if (!accountName && !bankName && !branch && !accountNumber && !ifsc && !upi) {
    return null;
  }

  const lines = [];
  if (accountName) lines.push({ label: 'Account name', value: accountName });
  if (bankName) {
    lines.push({ label: 'Bank', value: branch ? `${bankName} · ${branch}` : bankName });
  } else if (branch) {
    lines.push({ label: 'Branch', value: branch });
  }
  if (accountNumber) {
    lines.push({ label: 'A/C', value: maskAccountNumber(accountNumber), mono: true });
  }
  if (ifsc) lines.push({ label: 'IFSC', value: ifsc, mono: true });
  if (upi) lines.push({ label: 'UPI', value: upi, mono: true });

  const summaryParts = [];
  if (bankName) summaryParts.push(bankName);
  if (accountNumber) summaryParts.push(`A/C ${maskAccountNumber(accountNumber)}`);
  if (ifsc) summaryParts.push(`IFSC ${ifsc}`);
  if (!summaryParts.length && upi) summaryParts.push(`UPI ${upi}`);

  return {
    lines,
    summary: summaryParts.join(' · ') || upi || '—',
    hasUpiOnly: !bankName && !accountNumber && !ifsc && Boolean(upi),
  };
}
