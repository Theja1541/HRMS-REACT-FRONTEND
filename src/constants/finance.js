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

/** Page-specific guidance for Day Book / finance module UX */
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
