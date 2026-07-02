import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { employeeApi, financeApi } from '../../api';
import { formatINR, localDateString } from '../../utils/helpers';
import { MANUAL_VOUCHER_TYPES } from '../../constants/finance';

let lineKey = 0;
function newLine() {
  lineKey += 1;
  return {
    _key: lineKey,
    account_id: '',
    debit_amount: '',
    credit_amount: '',
    employee_id: '',
    narration_line: '',
  };
}

function flattenAccounts(groups) {
  if (!groups) return [];
  return Object.values(groups)
    .flat()
    .filter((account) => account.is_active)
    .sort((a, b) => a.code.localeCompare(b.code));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export default function VoucherEntryForm({ onCancel, onSuccess }) {
  const queryClient = useQueryClient();
  const [voucherType, setVoucherType] = useState('journal');
  const [voucherDate, setVoucherDate] = useState(localDateString());
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState([newLine(), newLine()]);

  const { data: coaData, isLoading: coaLoading } = useQuery({
    queryKey: ['chart-of-accounts', 'active'],
    queryFn: () => financeApi.listChartOfAccounts({ active_only: true }),
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-voucher-form'],
    queryFn: () => employeeApi.list({ limit: 200, status: 'active' }),
  });

  const accounts = useMemo(() => flattenAccounts(coaData?.data?.groups), [coaData]);
  const employees = empData?.data?.employees || [];

  const accountsByType = useMemo(() => {
    const map = {};
    accounts.forEach((account) => {
      if (!map[account.account_type]) map[account.account_type] = [];
      map[account.account_type].push(account);
    });
    return map;
  }, [accounts]);

  const balance = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    lines.forEach((line) => {
      totalDebit += parseFloat(line.debit_amount) || 0;
      totalCredit += parseFloat(line.credit_amount) || 0;
    });
    totalDebit = round2(totalDebit);
    totalCredit = round2(totalCredit);
    const diff = round2(Math.abs(totalDebit - totalCredit));
    return { totalDebit, totalCredit, diff, isBalanced: totalDebit === totalCredit && totalDebit > 0 };
  }, [lines]);

  const hasValidLines = useMemo(() => {
    const active = lines.filter((line) => {
      const dr = parseFloat(line.debit_amount) || 0;
      const cr = parseFloat(line.credit_amount) || 0;
      return line.account_id && ((dr > 0 && cr === 0) || (cr > 0 && dr === 0));
    });
    return active.length >= 2;
  }, [lines]);

  const canSave = balance.isBalanced && hasValidLines && !coaLoading;

  const createMutation = useMutation({
    mutationFn: (payload) => financeApi.createVoucher(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-vouchers'] });
      queryClient.invalidateQueries({ queryKey: ['daybook-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['finance-trial-balance'] });
      queryClient.invalidateQueries({ queryKey: ['finance-ledger'] });
      onSuccess?.();
    },
  });

  const voucherTypeLabel = MANUAL_VOUCHER_TYPES.find((t) => t.value === voucherType)?.label || 'Voucher';

  const updateLine = (key, field, value) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line._key !== key) return line;
        const next = { ...line, [field]: value };
        if (field === 'debit_amount' && parseFloat(value) > 0) next.credit_amount = '';
        if (field === 'credit_amount' && parseFloat(value) > 0) next.debit_amount = '';
        return next;
      })
    );
  };

  const addLine = () => setLines((prev) => [...prev, newLine()]);

  const removeLine = (key) => {
    setLines((prev) => (prev.length <= 2 ? prev : prev.filter((line) => line._key !== key)));
  };

  const handleSubmit = () => {
    const payload = {
      voucher_type: voucherType,
      voucher_date: voucherDate,
      narration: narration || null,
      lines: lines
        .map((line) => ({
          account_id: parseInt(line.account_id, 10),
          debit_amount: round2(parseFloat(line.debit_amount) || 0),
          credit_amount: round2(parseFloat(line.credit_amount) || 0),
          employee_id: line.employee_id ? parseInt(line.employee_id, 10) : null,
          narration_line: line.narration_line?.trim() || null,
        }))
        .filter((line) => line.account_id && (line.debit_amount > 0 || line.credit_amount > 0)),
    };
    createMutation.mutate(payload);
  };

  return (
    <div className="card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Manual voucher — {voucherTypeLabel}</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          For accountant entries (journal, contra, adjustments). Day-to-day payments belong in{' '}
          <Link to="/transactions/add" className="text-brand-600 hover:underline">Transactions</Link>.
          Debits must equal credits before posting.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-600">Voucher type</label>
          <select
            value={voucherType}
            onChange={(e) => setVoucherType(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            {MANUAL_VOUCHER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Date</label>
          <input
            type="date"
            value={voucherDate}
            onChange={(e) => setVoucherDate(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Narration</label>
          <input
            type="text"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Voucher description"
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-3 py-2 font-semibold min-w-[200px]">Account</th>
              <th className="text-right px-3 py-2 font-semibold w-28">Debit</th>
              <th className="text-right px-3 py-2 font-semibold w-28">Credit</th>
              <th className="text-left px-3 py-2 font-semibold min-w-[140px]">Employee</th>
              <th className="text-left px-3 py-2 font-semibold min-w-[160px]">Line narration</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((line) => (
              <tr key={line._key}>
                <td className="px-3 py-2">
                  <select
                    value={line.account_id}
                    onChange={(e) => updateLine(line._key, 'account_id', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                    disabled={coaLoading}
                  >
                    <option value="">Select account…</option>
                    {Object.entries(accountsByType).map(([type, typeAccounts]) => (
                      <optgroup key={type} label={type}>
                        {typeAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} — {account.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.debit_amount}
                    onChange={(e) => updateLine(line._key, 'debit_amount', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-right font-mono bg-white"
                    placeholder="0.00"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.credit_amount}
                    onChange={(e) => updateLine(line._key, 'credit_amount', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-right font-mono bg-white"
                    placeholder="0.00"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={line.employee_id}
                    onChange={(e) => updateLine(line._key, 'employee_id', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                  >
                    <option value="">—</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.emp_code} — {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={line.narration_line}
                    onChange={(e) => updateLine(line._key, 'narration_line', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                    placeholder="Optional"
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeLine(line._key)}
                    disabled={lines.length <= 2}
                    className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                    title="Remove line"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-200">
            <tr>
              <td className="px-3 py-2 font-semibold text-slate-600">Totals</td>
              <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-700">
                {formatINR(balance.totalDebit)}
              </td>
              <td className="px-3 py-2 text-right font-mono font-semibold text-red-600">
                {formatINR(balance.totalCredit)}
              </td>
              <td colSpan={3} className="px-3 py-2 text-right">
                {balance.isBalanced ? (
                  <span className="text-emerald-700 font-medium">Balanced</span>
                ) : (
                  <span className="text-red-600 font-medium">
                    Out of balance by {formatINR(balance.diff)}
                  </span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={addLine} className="btn-secondary text-xs">
          <Plus size={14} /> Add line
        </button>
        <div className="flex-1" />
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSave || createMutation.isPending}
          className="btn-primary"
          title={!canSave ? 'Enter balanced debit/credit lines with accounts selected' : undefined}
        >
          {createMutation.isPending ? 'Posting…' : 'Post voucher'}
        </button>
      </div>

      {createMutation.isError && (
        <p className="text-sm text-red-600">
          {createMutation.error?.response?.data?.error?.message || 'Failed to post voucher'}
        </p>
      )}
    </div>
  );
}
