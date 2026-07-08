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
  { value: 'debit', label: 'Debit (Payment / Expense)' },
  { value: 'credit', label: 'Credit (Receipt / Income)' },
];

export const TRANSACTION_TYPE_LABELS = Object.fromEntries(TRANSACTION_TYPES.map((t) => [t.value, t.label]));

export const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
];

export const PAYMENT_MODE_LABELS = Object.fromEntries(PAYMENT_MODES.map((t) => [t.value, t.label]));

export const EMPTY_LINE_ITEM = {
  description: '',
  qty: '1',
  unit_price: '',
  gst_applicable: false,
  gst_percent: '18',
};

export const EMPTY_TRANSACTION_FORM = {
  date: new Date().toISOString().slice(0, 10),
  transaction_type: 'debit',
  vendor_id: '',
  category_id: '',
  payment_mode: 'cash',
  cheque_number: '',
  line_items: [{ description: '', qty: '1', unit_price: '', gst_applicable: false, gst_percent: '18' }],
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

export const FINANCE_WRITE_ROLES = ['super_admin', 'owner', 'hr'];

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

export const FINANCE_PAGE_GUIDES = {
  dashboard: {
    title: 'Day Book Dashboard',
    summary: 'Income vs expense trends from posted vouchers — use this for management reporting.',
    steps: [
      { n: 1, title: 'Setup first', text: 'Map payment modes and categories before expecting complete data.' },
      { n: 2, title: 'Post transactions', text: 'Every payment/receipt in Transactions creates a balanced voucher here.' },
      { n: 3, title: 'Payroll auto-sync', text: 'Approve or Lock payroll to post salary accrual vouchers.' },
      { n: 4, title: 'Drill down', text: 'Open Day Book for voucher-level detail or Account Ledger for one account.' },
    ],
    current: 'You are viewing period KPIs and charts derived from the Day Book register.',
  },
  daybook: {
    title: 'Day Book (Voucher Register)',
    summary: 'The official accounting ledger — every debit must equal credits in each voucher.',
    steps: [
      { n: 1, title: 'Transactions', text: 'Day-to-day payments/receipts are recorded in Transactions (easier UI).' },
      { n: 2, title: 'Payroll', text: 'Use Sync Payroll for the selected month, or Approve/Lock payroll runs.' },
      { n: 3, title: 'Manual journals', text: 'Accountants can post Journal / Payment / Receipt / Contra entries here.' },
      { n: 4, title: 'Verify', text: 'Check Trial Balance and Account Ledger to reconcile balances.' },
    ],
    current: 'Each row is a posted voucher. Expand to see COA debit/credit lines.',
  },
  transactions: {
    title: 'Transactions',
    summary: 'Record business payments and receipts — the system posts balanced Day Book vouchers automatically.',
    steps: [
      { n: 1, title: 'Masters', text: 'Add Vendors and Income/Expense Categories first.' },
      { n: 2, title: 'Payment modes', text: 'Map Cash/Bank/UPI/Cheque to asset accounts in Payment Modes.' },
      { n: 3, title: 'Add transaction', text: 'Enter line items, GST, and payment mode — voucher is created on save.' },
      { n: 4, title: 'Day Book', text: 'View the linked voucher in Day Book or print invoice/receipt from here.' },
    ],
    current: 'Debit = money out (expense). Credit = money in (income). Each row links to a Day Book voucher.',
  },
  'payment-modes': {
    title: 'Payment Mode Setup',
    summary: 'Tell the system which bank/cash account to use when you pay or receive money.',
    steps: [
      { n: 1, title: 'Initialize COA', text: 'Creates Cash in Hand and Bank Account asset heads if missing.' },
      { n: 2, title: 'Map modes', text: 'Cash → Cash in Hand; Bank/UPI/Cheque → Bank Account (or your choice).' },
      { n: 3, title: 'Transactions', text: 'Post payments/receipts — amounts hit the mapped asset account.' },
      { n: 4, title: 'Reconcile', text: 'Use Account Ledger on bank/cash accounts to verify balances.' },
    ],
    current: 'Complete this setup before recording transactions or syncing payroll disbursements.',
  },
  categories: {
    title: 'Income & Expense Categories',
    summary: 'Classify transactions for reporting — each category creates a linked Chart of Accounts head.',
    steps: [
      { n: 1, title: 'Create categories', text: 'Separate income (sales, fees) and expense (rent, utilities) types.' },
      { n: 2, title: 'COA link', text: 'Each category auto-maps to an expense/income account in the ledger.' },
      { n: 3, title: 'Use in transactions', text: 'Pick a category when posting — drives P&L classification.' },
      { n: 4, title: 'Ledger', text: 'Click COA code to open Account Ledger for that category account.' },
    ],
    current: 'Categories simplify data entry; accountants can still use manual journals for edge cases.',
  },
  vendors: {
    title: 'Vendors',
    summary: 'Supplier and service-provider master — required for bank/UPI/cheque payments.',
    steps: [
      { n: 1, title: 'Add vendor', text: 'Store GSTIN, contact, and bank/UPI details once.' },
      { n: 2, title: 'Transactions', text: 'Select vendor when paying — bank details auto-fill for transfers.' },
      { n: 3, title: 'GST', text: 'GST on transaction line items feeds tax reporting (separate from GST Monthly register).' },
      { n: 4, title: 'Audit', text: 'Vendor changes are audited for compliance.' },
    ],
    current: 'Maintain active vendors before recording vendor-linked payments.',
  },
  ledger: {
    title: 'Account Ledger',
    summary: 'Running balance for one Chart of Accounts head — the drill-down behind Trial Balance.',
    steps: [
      { n: 1, title: 'Pick account', text: 'Choose cash, bank, expense, or income account from the dropdown.' },
      { n: 2, title: 'Date range', text: 'See opening balance, each voucher line, and closing balance.' },
      { n: 3, title: 'Voucher link', text: 'Click voucher number to open full double-entry detail.' },
      { n: 4, title: 'Trial Balance', text: 'Verify all accounts together on Trial Balance as of a date.' },
    ],
    current: 'Use this to answer “what happened on this bank account this month?”',
  },
  'trial-balance': {
    title: 'Trial Balance',
    summary: 'Accountant checkpoint — total debits must equal total credits across all active accounts.',
    steps: [
      { n: 1, title: 'Post vouchers', text: 'All activity flows from Transactions, Payroll, and manual journals.' },
      { n: 2, title: 'As-of date', text: 'Pick closing date — cumulative balances up to that day.' },
      { n: 3, title: 'Balanced?', text: 'Green = books balanced. Amber = investigate unbalanced vouchers in Day Book.' },
      { n: 4, title: 'Drill down', text: 'Open Account Ledger for any account with unexpected balance.' },
    ],
    current: 'Standard month-end control before closing the books.',
  },
  'finance-summary': {
    title: 'Payroll Financial Summary',
    summary: 'Payroll cost analysis — NOT the general ledger P&L. Use Day Book Dashboard for voucher-based income/expense.',
    steps: [
      { n: 1, title: 'Process payroll', text: 'Run payroll and generate payslips for the period.' },
      { n: 2, title: 'Approve & lock', text: 'Approval posts accrual vouchers to Day Book automatically.' },
      { n: 3, title: 'This page', text: 'View gross/net/employer cost and statutory liabilities by department.' },
      { n: 4, title: 'Day Book', text: 'For accounting entries, use Day Book and Trial Balance.' },
    ],
    current: 'HR/payroll lens on employee cost — complements but does not replace Day Book.',
  },
  gst: {
    title: 'GST Monthly Register',
    summary: 'Manual input/output GST log for GSTR-3B preparation — separate from transaction line GST.',
    steps: [
      { n: 1, title: 'Transactions', text: 'GST on transaction line items is stored on each payment/receipt.' },
      { n: 2, title: 'This register', text: 'Add/adjust monthly GST entries for filing reconciliation.' },
      { n: 3, title: 'Cross-check', text: 'Compare with transaction GST before filing.' },
      { n: 4, title: 'Export', text: 'Use for GSTR-3B working — verify with your CA.' },
    ],
    current: 'Filing workspace — does not auto-sync from every transaction field.',
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
