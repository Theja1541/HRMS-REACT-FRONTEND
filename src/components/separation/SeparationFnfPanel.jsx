import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Calculator, CheckCircle2, ChevronDown, ChevronRight, FileText, IndianRupee, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { hrApi } from '../../api';
import FnfStatementView from './FnfStatementView';
import {
  FNF_PAYMENT_MODE_LABELS,
  FNF_PAYMENT_MODES,
  FNF_PAYMENT_STATUS_CLASSES,
  FNF_PAYMENT_STATUS_LABELS,
  FNF_RECON_STATUS_LABELS,
  FNF_SETTLEMENT_STATUSES,
  FNF_SETTLEMENT_STATUS_LABELS,
} from '../../constants/hr';
import { useAuthStore } from '../../store/auth.store';
import { cn, localDateString } from '../../utils/helpers';
import { resolvePortalRole } from '../../utils/portalContext';

const HR_ADMIN_ROLES = ['super_admin', 'owner', 'hr', 'admin'];

// Component codes available for manual entry, grouped by type
const MANUAL_EARNING_CODES = [
  { value: 'bonus', label: 'Bonus' },
  { value: 'gratuity', label: 'Gratuity' },
  { value: 'reimbursement', label: 'Reimbursement' },
  { value: 'ex_gratia', label: 'Ex Gratia' },
  { value: 'other_earning', label: 'Other Earning' },
];
const MANUAL_DEDUCTION_CODES = [
  { value: 'advance_recovery', label: 'Salary Advance Recovery' },
  { value: 'loan_recovery', label: 'Loan Recovery' },
  { value: 'notice_buyout_recovery', label: 'Notice Recovery' },
  { value: 'tax_adjustment', label: 'Tax Adjustment' },
  { value: 'tds', label: 'TDS Adjustment' },
  { value: 'other_deduction', label: 'Other Deduction' },
];

// All 18 statutory component codes — used for "show zero lines" view
const ALL_EARNING_CODES = [
  { code: 'unpaid_salary', label: 'Salary till Last Working Day' },
  { code: 'leave_encashment', label: 'Leave Encashment' },
  { code: 'bonus', label: 'Bonus' },
  { code: 'gratuity', label: 'Gratuity' },
  { code: 'notice_payable', label: 'Notice Pay (Employer)' },
  { code: 'reimbursement', label: 'Reimbursements' },
  { code: 'ex_gratia', label: 'Ex Gratia' },
  { code: 'other_earning', label: 'Other Earnings' },
];
const ALL_DEDUCTION_CODES = [
  { code: 'notice_buyout_recovery', label: 'Notice Buyout' },
  { code: 'loan_recovery', label: 'Loan Recovery' },
  { code: 'advance_recovery', label: 'Advance Recovery' },
  { code: 'asset_recovery', label: 'Asset Recovery' },
  { code: 'pf_employee', label: 'Employee PF' },
  { code: 'pf_employer_recovery', label: 'Employer PF Recovery' },
  { code: 'esi_recovery', label: 'ESI Recovery' },
  { code: 'professional_tax', label: 'Professional Tax' },
  { code: 'tds', label: 'TDS' },
  { code: 'tax_adjustment', label: 'Tax Adjustment' },
  { code: 'other_deduction', label: 'Other Deductions' },
];
const CODE_DEFAULT_LABELS = {
  bonus: 'Bonus',
  gratuity: 'Gratuity',
  reimbursement: 'Reimbursement',
  ex_gratia: 'Ex Gratia',
  other_earning: '',
  other_deduction: '',
  advance_recovery: 'Salary Advance Recovery',
  loan_recovery: 'Loan Recovery',
  notice_buyout_recovery: 'Notice Recovery',
  tax_adjustment: 'Tax Adjustment',
  tds: 'TDS Adjustment',
};

const BLANK_ADJUSTMENT = {
  component_type: 'earning',
  component_code: 'other_earning',
  label: '',
  amount: '',
  notes: '',
};

function formatDate(value) {
  if (!value) return '—';
  try { return format(parseISO(value), 'dd MMM yyyy'); } catch { return value; }
}

function formatDateTime(value) {
  if (!value) return '—';
  try { return format(parseISO(value), 'dd MMM yyyy, h:mm a'); } catch { return value; }
}

function formatInr(amount) {
  if (amount == null || amount === '') return '—';
  const num = Number(amount);
  if (Number.isNaN(num)) return '—';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPerson(user) {
  if (!user) return '—';
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return name || user.emp_code || '—';
}

function apiErrorMessage(err, fallback) {
  return err?.response?.data?.error?.message || fallback;
}

function parseComponentBasis(component) {
  if (!component?.calculation_basis) return null;
  try {
    return typeof component.calculation_basis === 'string'
      ? JSON.parse(component.calculation_basis)
      : component.calculation_basis;
  } catch { return null; }
}

function ManualBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 leading-none">
      manual
    </span>
  );
}

function PayrollSnapshotPanel({ components }) {
  const salaryComponent = components.find((c) => c.component_code === 'unpaid_salary');
  const leaveComponent = components.find((c) => c.component_code === 'leave_encashment');
  const salaryBasis = parseComponentBasis(salaryComponent);
  const leaveBasis = parseComponentBasis(leaveComponent);

  if (!salaryBasis?.last_salary && !salaryBasis?.attendance && !leaveBasis?.leave_balances?.length) {
    return null;
  }

  const { last_salary, attendance, lop } = salaryBasis || {};

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <h4 className="text-xs font-semibold text-slate-800">Payroll Basis</h4>
        <p className="text-[10px] text-slate-500 mt-0.5">From payroll engine (salary, attendance, LOP, leave balance)</p>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {last_salary && (
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-[10px] uppercase text-slate-500 font-medium">Last Salary</p>
            <p className="mt-1 font-medium text-slate-800">Gross: {formatInr(last_salary.gross_monthly)}</p>
            <p className="text-slate-600">CTC: {formatInr(last_salary.ctc_monthly)}</p>
            {last_salary.basic > 0 && <p className="text-slate-600">Basic: {formatInr(last_salary.basic)}</p>}
          </div>
        )}
        {attendance && (
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-[10px] uppercase text-slate-500 font-medium">Attendance (till LWD)</p>
            <p className="mt-1 font-medium text-slate-800">Present: {attendance.present_days ?? '—'} days</p>
            <p className="text-slate-600">Working: {attendance.working_days ?? '—'} days</p>
          </div>
        )}
        {lop && (
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-[10px] uppercase text-slate-500 font-medium">LOP</p>
            <p className="mt-1 font-medium text-slate-800">{lop.days ?? 0} day(s)</p>
            <p className="text-slate-600">Deduction: {formatInr(lop.amount)}</p>
          </div>
        )}
        {leaveBasis?.leave_balances?.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 md:col-span-2 lg:col-span-1">
            <p className="text-[10px] uppercase text-slate-500 font-medium">Leave Balance</p>
            <ul className="mt-1 space-y-0.5">
              {leaveBasis.leave_balances.map((line) => (
                <li key={line.leave_type_id} className="text-slate-700 flex justify-between gap-2">
                  <span>{line.leave_type_name || line.leave_type_code}</span>
                  <span className="font-medium">{line.available_days} d</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionModal({ title, subtitle, children, onClose, isPending }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[60] p-4">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close" disabled={isPending} />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

function AdjustmentForm({ form, onChange, error, isPending, onCancel, submitLabel }) {
  const codeOptions = form.component_type === 'earning' ? MANUAL_EARNING_CODES : MANUAL_DEDUCTION_CODES;

  function handleTypeChange(e) {
    const type = e.target.value;
    const firstCode = type === 'earning' ? MANUAL_EARNING_CODES[0].value : MANUAL_DEDUCTION_CODES[0].value;
    onChange({ ...form, component_type: type, component_code: firstCode, label: CODE_DEFAULT_LABELS[firstCode] ?? '' });
  }

  function handleCodeChange(e) {
    const code = e.target.value;
    onChange({ ...form, component_code: code, label: CODE_DEFAULT_LABELS[code] ?? form.label });
  }

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600">Type *</label>
          <select
            value={form.component_type}
            onChange={handleTypeChange}
            disabled={isPending}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="earning">Earning</option>
            <option value="deduction">Deduction</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Category *</label>
          <select
            value={form.component_code}
            onChange={handleCodeChange}
            disabled={isPending}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            {codeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Label *</label>
        <input
          type="text"
          required
          maxLength={150}
          value={form.label}
          onChange={(e) => onChange({ ...form, label: e.target.value })}
          disabled={isPending}
          placeholder="e.g. Special allowance, Uniform recovery…"
          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Amount (₹) *</label>
        <input
          type="number"
          required
          min="0.01"
          step="0.01"
          value={form.amount}
          onChange={(e) => onChange({ ...form, amount: e.target.value })}
          disabled={isPending}
          placeholder="0.00"
          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Notes</label>
        <textarea
          rows={2}
          maxLength={2000}
          value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
          disabled={isPending}
          placeholder="Optional explanation for this adjustment…"
          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} disabled={isPending} className="btn-secondary text-xs">
          Cancel
        </button>
        <button type="submit" disabled={isPending} className="btn-primary text-xs">
          {isPending ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
          {isPending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </div>
  );
}

export default function SeparationFnfPanel({ separationRequestId, settlementId, enabled = true, onSettlementChange }) {
  const queryClient = useQueryClient();
  const { user, workspace, roles, selectedRole, accessToken } = useAuthStore();
  const role = resolvePortalRole({ accessToken, workspace, user, roles, selectedRole });
  const canManage = HR_ADMIN_ROLES.includes(role);

  const [showApprove, setShowApprove] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showAddAdjustment, setShowAddAdjustment] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [approveNotes, setApproveNotes] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    payment_date: localDateString(),
    amount: '',
    payment_mode: 'neft',
    reference_number: '',
    remarks: '',
  });
  const [adjustmentForm, setAdjustmentForm] = useState(BLANK_ADJUSTMENT);

  const [modalError, setModalError] = useState('');
  const [recalcError, setRecalcError] = useState('');
  const [adjustmentError, setAdjustmentError] = useState('');
  const [showStatement, setShowStatement] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementData, setStatementData] = useState(null);
  const [statementError, setStatementError] = useState('');
  const [showZero, setShowZero] = useState(false);

  // Support either a direct settlementId (F&F queue page) or a separationRequestId (separation drawer)
  const queryKey = settlementId
    ? ['fnf-settlement-detail', settlementId]
    : ['separation-fnf', separationRequestId];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (settlementId) {
        const res = await hrApi.getFnfSettlement(settlementId);
        return res?.data?.settlement || null;
      }
      const listRes = await hrApi.listFnfSettlements({
        separation_request_id: separationRequestId,
        limit: 1,
      });
      const summary = listRes?.data?.settlements?.[0];
      if (!summary) return null;
      const detailRes = await hrApi.getFnfSettlement(summary.id);
      return detailRes?.data?.settlement || null;
    },
    enabled: enabled && (!!settlementId || !!separationRequestId),
    refetchInterval: (query) => {
      const s = query.state.data;
      return s?.status === 'draft' ? 3000 : false;
    },
  });

  const settlement = data || null;
  const rawEarnings = (settlement?.components || []).filter((c) => c.component_type === 'earning');
  const rawDeductions = (settlement?.components || []).filter((c) => c.component_type === 'deduction');

  // Build full 18-line views (statutory codes padded to ₹0, manual lines appended)
  function mergeWithAllCodes(rawItems, allCodes) {
    const byCode = Object.fromEntries(rawItems.map((c) => [c.component_code, c]));
    const statutory = allCodes.map(({ code, label }) =>
      byCode[code] || { id: `zero-${code}`, component_code: code, component_type: rawItems[0]?.component_type ?? 'earning', label, amount: 0, is_manual: false, is_zero: true }
    );
    const manual = rawItems.filter((c) => c.is_manual);
    return [...statutory, ...manual.filter((c) => !allCodes.find((a) => a.code === c.component_code))];
  }

  const earnings = showZero ? mergeWithAllCodes(rawEarnings, ALL_EARNING_CODES) : rawEarnings;
  const deductions = showZero ? mergeWithAllCodes(rawDeductions, ALL_DEDUCTION_CODES) : rawDeductions;
  const payments = settlement?.payments || [];

  const canAdjust = settlement && ['draft', 'calculated'].includes(settlement.status);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['fnf-settlements-page'] });
    queryClient.invalidateQueries({ queryKey: ['separations'] });
    onSettlementChange?.();
  };

  // ── existing mutations ────────────────────────────────────────────────────

  const recalculateMutation = useMutation({
    mutationFn: () => hrApi.recalculateFnfSettlement(settlement.id),
    onSuccess: () => { setRecalcError(''); invalidate(); },
    onError: (err) => setRecalcError(apiErrorMessage(err, 'Failed to recalculate settlement')),
  });

  const approveMutation = useMutation({
    mutationFn: () => hrApi.approveFnfSettlement(settlement.id, { notes: approveNotes.trim() || undefined }),
    onSuccess: () => { invalidate(); closeApprove(); },
    onError: (err) => setModalError(apiErrorMessage(err, 'Failed to approve settlement')),
  });

  const submitApprovalMutation = useMutation({
    mutationFn: () => hrApi.submitFnfSettlementApproval(settlement.id, {}),
    onSuccess: () => { setRecalcError(''); invalidate(); },
    onError: (err) => setRecalcError(apiErrorMessage(err, 'Failed to submit for approval')),
  });

  const paymentMutation = useMutation({
    mutationFn: () =>
      hrApi.recordFnfPayment(settlement.id, {
        payment_date: paymentForm.payment_date,
        amount: parseFloat(paymentForm.amount, 10),
        payment_mode: paymentForm.payment_mode,
        reference_number: paymentForm.reference_number.trim() || undefined,
        remarks: paymentForm.remarks.trim() || undefined,
      }),
    onSuccess: () => { invalidate(); closePayment(); },
    onError: (err) => setModalError(apiErrorMessage(err, 'Failed to record payment')),
  });

  const approvePaymentMutation = useMutation({
    mutationFn: (paymentId) => hrApi.approveFnfPayment(settlement.id, paymentId, {}),
    onSuccess: () => invalidate(),
    onError: (err) => setRecalcError(apiErrorMessage(err, 'Failed to approve payment')),
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: ({ paymentId, reason }) =>
      hrApi.rejectFnfPayment(settlement.id, paymentId, { reason }),
    onSuccess: () => invalidate(),
    onError: (err) => setRecalcError(apiErrorMessage(err, 'Failed to reject payment')),
  });

  const reconcilePaymentMutation = useMutation({
    mutationFn: ({ paymentId, reconciliation_status }) =>
      hrApi.reconcileFnfPayment(settlement.id, paymentId, { reconciliation_status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnf-finance-reconciliation'] });
      invalidate();
    },
    onError: (err) => setRecalcError(apiErrorMessage(err, 'Failed to reconcile payment')),
  });

  // ── manual component mutations ────────────────────────────────────────────

  const addComponentMutation = useMutation({
    mutationFn: (payload) => hrApi.addFnfComponent(settlement.id, payload),
    onSuccess: () => { invalidate(); closeAddAdjustment(); },
    onError: (err) => setAdjustmentError(apiErrorMessage(err, 'Failed to add adjustment')),
  });

  const updateComponentMutation = useMutation({
    mutationFn: ({ componentId, payload }) =>
      hrApi.updateFnfComponent(settlement.id, componentId, payload),
    onSuccess: () => { invalidate(); closeEditAdjustment(); },
    onError: (err) => setAdjustmentError(apiErrorMessage(err, 'Failed to update adjustment')),
  });

  const deleteComponentMutation = useMutation({
    mutationFn: (componentId) => hrApi.deleteFnfComponent(settlement.id, componentId),
    onSuccess: () => { invalidate(); setDeleteConfirmId(null); },
    onError: (err) => setRecalcError(apiErrorMessage(err, 'Failed to delete adjustment')),
  });

  // ── derived pending flags ─────────────────────────────────────────────────

  const actionPending =
    recalculateMutation.isPending ||
    approveMutation.isPending ||
    submitApprovalMutation.isPending ||
    paymentMutation.isPending ||
    approvePaymentMutation.isPending ||
    rejectPaymentMutation.isPending ||
    reconcilePaymentMutation.isPending ||
    addComponentMutation.isPending ||
    updateComponentMutation.isPending ||
    deleteComponentMutation.isPending;

  // ── close helpers ─────────────────────────────────────────────────────────

  const closeApprove = () => {
    if (actionPending) return;
    setShowApprove(false);
    setApproveNotes('');
    setModalError('');
  };

  const closePayment = () => {
    if (actionPending) return;
    setShowPayment(false);
    setModalError('');
  };

  const closeAddAdjustment = () => {
    setShowAddAdjustment(false);
    setAdjustmentForm(BLANK_ADJUSTMENT);
    setAdjustmentError('');
  };

  const closeEditAdjustment = () => {
    setEditingComponent(null);
    setAdjustmentError('');
  };

  const pendingTotal = (settlement?.payments || [])
    .filter((p) => ['pending', 'processing'].includes(p.status))
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const availableBalance = Math.max(0, Math.abs(settlement?.balance_due || 0) - pendingTotal);

  const openPayment = () => {
    setPaymentForm({
      payment_date: localDateString(),
      amount: availableBalance > 0 ? String(availableBalance) : '',
      payment_mode: 'neft',
      reference_number: '',
      remarks: '',
    });
    setModalError('');
    setShowPayment(true);
  };

  const openEditAdjustment = (component) => {
    setEditingComponent(component);
    setAdjustmentError('');
  };

  // ── submit handlers ───────────────────────────────────────────────────────

  function submitAddAdjustment(e) {
    e.preventDefault();
    setAdjustmentError('');
    const amount = parseFloat(adjustmentForm.amount);
    if (!adjustmentForm.label.trim()) { setAdjustmentError('Label is required'); return; }
    if (!Number.isFinite(amount) || amount <= 0) { setAdjustmentError('Enter a valid positive amount'); return; }
    addComponentMutation.mutate({
      component_code: adjustmentForm.component_code,
      component_type: adjustmentForm.component_type,
      label: adjustmentForm.label.trim(),
      amount,
      notes: adjustmentForm.notes.trim() || undefined,
    });
  }

  function submitEditAdjustment(e) {
    e.preventDefault();
    setAdjustmentError('');
    const amount = parseFloat(adjustmentForm.amount);
    if (!adjustmentForm.label.trim()) { setAdjustmentError('Label is required'); return; }
    if (!Number.isFinite(amount) || amount <= 0) { setAdjustmentError('Enter a valid positive amount'); return; }
    updateComponentMutation.mutate({
      componentId: editingComponent.id,
      payload: {
        label: adjustmentForm.label.trim(),
        amount,
        notes: adjustmentForm.notes.trim() || undefined,
      },
    });
  }

  // ── status flags ──────────────────────────────────────────────────────────

  const isAutocalcPending = settlement?.status === 'draft';
  const canRecalculate = settlement && ['draft', 'calculated'].includes(settlement.status);
  const canSubmitApproval = settlement?.status === 'calculated';
  const canApprove = settlement && ['calculated', 'pending_approval'].includes(settlement.status);
  const canRecordPayment = settlement && ['approved', 'partially_paid'].includes(settlement.status);
  const canStatement = settlement && ['calculated', 'pending_approval', 'approved', 'partially_paid', 'paid'].includes(settlement.status);

  // ── render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <p className="text-center text-slate-400 py-12 text-sm">Loading F&amp;F settlement…</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-12 text-sm">Failed to load F&amp;F settlement</p>;
  }

  if (!settlement) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
        <IndianRupee size={28} className="mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-medium text-slate-700">F&amp;F not started</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Complete the separation to auto-create the F&amp;F settlement record.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isAutocalcPending && (
        <div className="flex items-center gap-2.5 bg-sky-50 border border-sky-200 rounded-lg px-4 py-3 text-xs text-sky-800">
          <Loader2 size={13} className="animate-spin shrink-0 text-sky-600" />
          <span>Auto-calculating F&amp;F settlement after separation completion…</span>
          <RefreshCw
            size={12}
            className="ml-auto shrink-0 cursor-pointer text-sky-600 hover:text-sky-800"
            onClick={() => invalidate()}
            title="Refresh"
          />
        </div>
      )}

      {recalcError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-700">
          {recalcError}
        </div>
      )}

      {/* Header row: status + action buttons */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">Settlement status</p>
          <span
            className={cn(
              'inline-flex mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full',
              FNF_SETTLEMENT_STATUSES[settlement.status]
            )}
          >
            {FNF_SETTLEMENT_STATUS_LABELS[settlement.status] || settlement.status}
          </span>
          {settlement.status === 'paid' && (
            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 size={10} /> F&amp;F Completed
            </span>
          )}
          {settlement.settlement_ref && (
            <p className="text-[10px] text-slate-400 mt-1 font-mono">{settlement.settlement_ref}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 justify-end">
          {/* Zero-line toggle — always visible when settlement has components */}
          {settlement.components?.length > 0 && (
            <button
              type="button"
              onClick={() => setShowZero((v) => !v)}
              className={cn(
                'btn-secondary text-[10px] py-1 inline-flex items-center gap-1',
                showZero && 'bg-slate-100 border-slate-300'
              )}
              title={showZero ? 'Hide zero-amount lines' : 'Show all 18 statutory lines including ₹0'}
            >
              {showZero ? 'Hide zeros' : 'Show zeros'}
            </button>
          )}
          {canManage && (
            <>
            {canAdjust && (
              <button
                type="button"
                disabled={actionPending}
                onClick={() => { setAdjustmentForm(BLANK_ADJUSTMENT); setAdjustmentError(''); setShowAddAdjustment(true); }}
                className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1"
              >
                <Plus size={12} /> Add adjustment
              </button>
            )}
            {canStatement && (
              <button
                type="button"
                disabled={actionPending || statementLoading}
                onClick={async () => {
                  setStatementError('');
                  setStatementLoading(true);
                  try {
                    const res = await hrApi.getFnfStatement(settlement.id);
                    setStatementData(res?.data?.statement || null);
                    setShowStatement(true);
                  } catch {
                    setStatementError('Could not load statement. Please try again.');
                  } finally {
                    setStatementLoading(false);
                  }
                }}
                className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1"
              >
                {statementLoading
                  ? <Loader2 size={12} className="animate-spin" />
                  : <FileText size={12} />}
                {statementLoading ? 'Loading…' : 'Statement'}
              </button>
            )}
            {canRecalculate && (
              <button
                type="button"
                disabled={actionPending}
                onClick={() => { setRecalcError(''); recalculateMutation.mutate(); }}
                className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1"
                title={isAutocalcPending ? 'Auto-calculation is running — you can still recalculate manually' : undefined}
              >
                {recalculateMutation.isPending
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Calculator size={12} />}
                {recalculateMutation.isPending ? 'Calculating…' : 'Recalculate'}
              </button>
            )}
            {canSubmitApproval && (
              <button
                type="button"
                disabled={actionPending}
                onClick={() => submitApprovalMutation.mutate()}
                className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1 text-amber-700 border-amber-200 hover:bg-amber-50"
              >
                {submitApprovalMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                Submit for approval
              </button>
            )}
            {canApprove && (
              <button
                type="button"
                disabled={actionPending}
                onClick={() => { setApproveNotes(''); setModalError(''); setShowApprove(true); }}
                className="btn-secondary text-[10px] py-1 inline-flex items-center gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              >
                <CheckCircle2 size={12} /> Approve
              </button>
            )}
            {canRecordPayment && (
              <button
                type="button"
                disabled={actionPending}
                onClick={openPayment}
                className="btn-primary text-[10px] py-1 inline-flex items-center gap-1"
              >
                <IndianRupee size={12} /> {settlement.net_payable < 0 ? 'Record Recovery' : 'Record Payment'}
              </button>
            )}
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
          <p className="text-[10px] uppercase text-emerald-700/80 font-medium">Earnings</p>
          <p className="text-lg font-bold text-emerald-800 mt-1">{formatInr(settlement.total_earnings)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
          <p className="text-[10px] uppercase text-red-700/80 font-medium">Deductions</p>
          <p className="text-lg font-bold text-red-800 mt-1">{formatInr(settlement.total_deductions)}</p>
        </div>
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-3">
          <p className="text-[10px] uppercase text-brand-700/80 font-medium">Net Settlement</p>
          <p className="text-lg font-bold text-brand-800 mt-1">{formatInr(Math.abs(settlement.net_payable))}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p className="text-[10px] uppercase text-slate-500 font-medium">{settlement.net_payable < 0 ? 'Recovery Due' : 'Balance Due'}</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{formatInr(Math.abs(settlement.balance_due))}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{settlement.net_payable < 0 ? 'Recovered' : 'Paid'}: {formatInr(Math.abs(settlement.amount_paid))}</p>
        </div>
      </div>

      {/* Earnings / Deductions tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ComponentTable
          title="Earnings"
          items={earnings}
          amountClass="text-emerald-700"
          canAdjust={canManage && canAdjust}
          deleteConfirmId={deleteConfirmId}
          onEdit={(item) => {
            openEditAdjustment(item);
            setAdjustmentForm({
              component_type: item.component_type,
              component_code: item.component_code,
              label: item.label,
              amount: String(item.amount),
              notes: item.notes || '',
            });
          }}
          onDeleteRequest={setDeleteConfirmId}
          onDeleteCancel={() => setDeleteConfirmId(null)}
          onDeleteConfirm={(id) => deleteComponentMutation.mutate(id)}
          isDeleting={deleteComponentMutation.isPending}
          emptyText="No earnings — recalculate to compute"
        />
        <ComponentTable
          title="Deductions"
          items={deductions}
          amountClass="text-red-600"
          canAdjust={canManage && canAdjust}
          deleteConfirmId={deleteConfirmId}
          onEdit={(item) => {
            openEditAdjustment(item);
            setAdjustmentForm({
              component_type: item.component_type,
              component_code: item.component_code,
              label: item.label,
              amount: String(item.amount),
              notes: item.notes || '',
            });
          }}
          onDeleteRequest={setDeleteConfirmId}
          onDeleteCancel={() => setDeleteConfirmId(null)}
          onDeleteConfirm={(id) => deleteComponentMutation.mutate(id)}
          isDeleting={deleteComponentMutation.isPending}
          emptyText="No deductions"
        />
      </div>

      <PayrollSnapshotPanel components={settlement?.components || []} />

      {/* Payment history */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h4 className="text-xs font-semibold text-slate-800">Payment History</h4>
          <span className="text-[10px] text-slate-400">{payments.length} payment(s)</span>
        </div>
        {payments.length === 0 ? (
          <p className="p-6 text-xs text-slate-400 text-center">No payments recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[820px]">
              <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Date</th>
                  <th className="text-left px-4 py-2 font-semibold">Amount</th>
                  <th className="text-left px-4 py-2 font-semibold">Method</th>
                  <th className="text-left px-4 py-2 font-semibold">Status</th>
                  <th className="text-left px-4 py-2 font-semibold">Recon</th>
                  <th className="text-left px-4 py-2 font-semibold">Reference</th>
                  <th className="text-left px-4 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(payment.payment_date)}</td>
                    <td className="px-4 py-2.5 font-medium">{formatInr(payment.amount)}</td>
                    <td className="px-4 py-2.5 capitalize">
                      {FNF_PAYMENT_MODE_LABELS[payment.payment_mode] || payment.payment_mode}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          FNF_PAYMENT_STATUS_CLASSES[payment.status]
                        )}
                      >
                        {FNF_PAYMENT_STATUS_LABELS[payment.status] || payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {payment.status === 'completed'
                        ? FNF_RECON_STATUS_LABELS[payment.reconciliation_status] || '—'
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-600">
                      {payment.reference_number || '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {canManage && payment.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="btn-secondary text-[10px] py-0.5 text-emerald-700"
                            disabled={actionPending}
                            onClick={() => approvePaymentMutation.mutate(payment.id)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn-secondary text-[10px] py-0.5 text-red-600"
                            disabled={actionPending}
                            onClick={() => {
                              const reason = window.prompt('Rejection reason');
                              if (reason?.trim()) {
                                rejectPaymentMutation.mutate({
                                  paymentId: payment.id,
                                  reason: reason.trim(),
                                });
                              }
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {canManage &&
                        payment.status === 'completed' &&
                        payment.reconciliation_status === 'unreconciled' && (
                          <button
                            type="button"
                            className="btn-secondary text-[10px] py-0.5"
                            disabled={actionPending}
                            onClick={() =>
                              reconcilePaymentMutation.mutate({
                                paymentId: payment.id,
                                reconciliation_status: 'matched',
                              })
                            }
                          >
                            Mark matched
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(settlement.calculated_at || settlement.approved_at) && (
        <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
          {settlement.calculated_at && (
            <p>
              Calculated: {formatDateTime(settlement.calculated_at)}
              {settlement.calculator && ` · ${formatPerson(settlement.calculator)}`}
            </p>
          )}
          {settlement.approved_at && (
            <p>
              Approved: {formatDateTime(settlement.approved_at)}
              {settlement.approver && ` · ${formatPerson(settlement.approver)}`}
            </p>
          )}
        </div>
      )}

      {/* ── Modals ── */}

      {showAddAdjustment && (
        <ActionModal
          title="Add Adjustment"
          subtitle="Manual entries are preserved when you recalculate."
          onClose={closeAddAdjustment}
          isPending={addComponentMutation.isPending}
        >
          <form onSubmit={submitAddAdjustment}>
            <AdjustmentForm
              form={adjustmentForm}
              onChange={setAdjustmentForm}
              error={adjustmentError}
              isPending={addComponentMutation.isPending}
              onCancel={closeAddAdjustment}
              submitLabel="Add Adjustment"
            />
          </form>
        </ActionModal>
      )}

      {editingComponent && (
        <ActionModal
          title="Edit Adjustment"
          subtitle={editingComponent.label}
          onClose={closeEditAdjustment}
          isPending={updateComponentMutation.isPending}
        >
          <form onSubmit={submitEditAdjustment}>
            <AdjustmentForm
              form={adjustmentForm}
              onChange={setAdjustmentForm}
              error={adjustmentError}
              isPending={updateComponentMutation.isPending}
              onCancel={closeEditAdjustment}
              submitLabel="Save Changes"
            />
          </form>
        </ActionModal>
      )}

      {showApprove && (
        <ActionModal
          title="Approve F&F Settlement"
          subtitle={`${settlement.net_payable < 0 ? 'Net recovery' : 'Net payable'}: ${formatInr(Math.abs(settlement.net_payable))}`}
          onClose={closeApprove}
          isPending={approveMutation.isPending}
        >
          <form
            className="p-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setModalError('');
              approveMutation.mutate();
            }}
          >
            <div>
              <label className="text-xs font-medium text-slate-600">Notes (optional)</label>
              <textarea
                rows={3}
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="Approval notes for finance…"
              />
            </div>
            {modalError && <p className="text-sm text-red-600">{modalError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeApprove} disabled={approveMutation.isPending} className="btn-secondary text-xs">
                Cancel
              </button>
              <button type="submit" disabled={approveMutation.isPending} className="btn-primary text-xs">
                {approveMutation.isPending ? 'Approving…' : 'Approve Settlement'}
              </button>
            </div>
          </form>
        </ActionModal>
      )}

      {showPayment && (
        <ActionModal
          title={settlement.net_payable < 0 ? "Record F&F Recovery" : "Record F&F Payment"}
          subtitle={`${settlement.net_payable < 0 ? 'Recovery' : 'Balance'} available to record: ${formatInr(availableBalance)}${pendingTotal > 0 ? ` (Pending approvals: ${formatInr(pendingTotal)})` : ''}`}
          onClose={closePayment}
          isPending={paymentMutation.isPending}
        >
          <form
            className="p-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setModalError('');
              const amount = parseFloat(paymentForm.amount, 10);
              if (!paymentForm.payment_date) { setModalError('Payment date is required'); return; }
              if (!Number.isFinite(amount) || amount <= 0) { setModalError('Enter a valid payment amount'); return; }
              if (amount > availableBalance) {
                setModalError(`Amount cannot exceed available balance of ${formatInr(availableBalance)}`);
                return;
              }
              paymentMutation.mutate();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Payment date *</label>
                <input
                  type="date"
                  required
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Amount *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Payment method *</label>
              <select
                value={paymentForm.payment_mode}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                {FNF_PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>{FNF_PAYMENT_MODE_LABELS[mode]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Reference number</label>
              <input
                type="text"
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                placeholder="UTR / cheque no."
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Remarks</label>
              <textarea
                rows={2}
                value={paymentForm.remarks}
                onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            {modalError && <p className="text-sm text-red-600">{modalError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closePayment} disabled={paymentMutation.isPending} className="btn-secondary text-xs">
                Cancel
              </button>
              <button type="submit" disabled={paymentMutation.isPending} className="btn-primary text-xs">
                {paymentMutation.isPending ? 'Recording…' : (settlement.net_payable < 0 ? 'Record Recovery' : 'Record Payment')}
              </button>
            </div>
          </form>
        </ActionModal>
      )}

      {/* ── Statement modal ── */}
      {showStatement && statementData && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-6"
          onClick={(e) => { if (e.target === e.currentTarget) setShowStatement(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-800">F&amp;F Settlement Statement</h3>
              <button
                type="button"
                onClick={() => setShowStatement(false)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <FnfStatementView statement={statementData} />
          </div>
        </div>
      )}
      {statementError && !showStatement && (
        <p className="text-xs text-red-600 text-right mt-1">{statementError}</p>
      )}
    </div>
  );
}

// ── ComponentTable ────────────────────────────────────────────────────────────

function BasisDetail({ basis }) {
  if (!basis || typeof basis !== 'object') return null;
  const entries = Object.entries(basis).filter(([, v]) => v != null && v !== '' && !Array.isArray(v) && typeof v !== 'object');
  const nested = Object.entries(basis).filter(([, v]) => v != null && typeof v === 'object' && !Array.isArray(v));
  const arrays = Object.entries(basis).filter(([, v]) => Array.isArray(v) && v.length > 0);
  if (!entries.length && !nested.length && !arrays.length) return null;
  const fmtKey = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <div className="mt-1.5 pl-2 border-l-2 border-slate-200 space-y-0.5">
      {entries.map(([k, v]) => (
        <p key={k} className="text-[10px] text-slate-500">
          <span className="text-slate-400">{fmtKey(k)}:</span> {String(v)}
        </p>
      ))}
      {nested.map(([k, v]) => (
        <div key={k}>
          <p className="text-[10px] font-medium text-slate-500">{fmtKey(k)}:</p>
          <BasisDetail basis={v} />
        </div>
      ))}
      {arrays.map(([k, arr]) => (
        <div key={k}>
          <p className="text-[10px] font-medium text-slate-500">{fmtKey(k)}:</p>
          {arr.map((row, i) => (
            <BasisDetail key={i} basis={typeof row === 'object' ? row : { value: row }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function ComponentTable({
  title, items, amountClass, canAdjust,
  deleteConfirmId, onEdit, onDeleteRequest, onDeleteCancel, onDeleteConfirm, isDeleting,
  emptyText,
}) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <h4 className="text-xs font-semibold text-slate-800">{title}</h4>
      </div>
      {items.length === 0 ? (
        <p className="p-4 text-xs text-slate-400 text-center">{emptyText}</p>
      ) : (
        <table className="w-full text-xs">
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const basis = item.is_zero ? null : parseComponentBasis(item);
              const hasBasis = !!basis && Object.keys(basis).length > 0;
              const isExpanded = expandedId === item.id;
              return (
                <tr key={item.id} className={cn('group', deleteConfirmId === item.id && 'bg-red-50', item.is_zero && 'opacity-40')}>
                  <td className="px-4 py-2.5 text-slate-700">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {hasBasis && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="text-slate-300 hover:text-slate-500 shrink-0"
                          title="Toggle calculation detail"
                        >
                          {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        </button>
                      )}
                      <span>{item.label}</span>
                      {item.is_manual && <ManualBadge />}
                      {item.is_zero && <span className="text-[9px] text-slate-400 font-mono">₹0</span>}
                    </div>
                    {isExpanded && hasBasis && (
                      <div className="mt-1 ml-4">
                        <BasisDetail basis={basis} />
                      </div>
                    )}
                    {/* Inline delete confirm */}
                    {deleteConfirmId === item.id && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-red-600 text-[10px]">Delete this adjustment?</span>
                        <button
                          type="button"
                          onClick={() => onDeleteConfirm(item.id)}
                          disabled={isDeleting}
                          className="text-[10px] font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          {isDeleting ? 'Deleting…' : 'Yes, delete'}
                        </button>
                        <button
                          type="button"
                          onClick={onDeleteCancel}
                          disabled={isDeleting}
                          className="text-[10px] text-slate-500 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                  <td className={cn('px-4 py-2.5 text-right font-medium whitespace-nowrap', item.is_zero ? 'text-slate-300' : amountClass)}>
                    {formatInr(item.amount)}
                  </td>
                  {canAdjust && (
                    <td className="px-2 py-2.5 w-16">
                      {item.is_manual && !item.is_zero && deleteConfirmId !== item.id && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            title="Edit"
                            className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteRequest(item.id)}
                            title="Delete"
                            className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
