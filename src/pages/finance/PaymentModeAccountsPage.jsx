import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { financeApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import FinanceModuleGuide from '../../components/finance/FinanceModuleGuide';
import { PAYMENT_MODES, PAYMENT_MODE_LABELS, flattenCoaGroups } from '../../constants/finance';
import { useAuthStore } from '../../store/auth.store';


export default function PaymentModeAccountsPage() {
  const queryClient = useQueryClient();
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;
  const [formError, setFormError] = useState('');
  const [drafts, setDrafts] = useState({});

  const { data: coaData, isLoading: coaLoading } = useQuery({
    queryKey: ['finance-coa-assets', selectedTenantId],
    queryFn: () => financeApi.listChartOfAccounts({ active_only: true }),
    enabled: !tenantRequired,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['finance-payment-modes', selectedTenantId],
    queryFn: () => financeApi.listPaymentModes(),
    enabled: !tenantRequired,
  });

  const seedMutation = useMutation({
    mutationFn: () => financeApi.seedDefaultChartOfAccounts(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-coa-assets'] });
      queryClient.invalidateQueries({ queryKey: ['finance-payment-modes'] });
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to initialize finance accounts'),
  });

  const saveMutation = useMutation({
    mutationFn: ({ mode, account_id }) => financeApi.upsertPaymentMode(mode, { account_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-payment-modes'] });
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to save mapping'),
  });

  const assetAccounts = flattenCoaGroups(coaData?.data?.groups).filter(
    (account) => account.account_type === 'asset'
  );

  const modes = data?.data?.modes || PAYMENT_MODES.map((m) => ({ payment_mode: m.value, mapping: null }));
  const unmappedModes = modes.filter((m) => !m.mapping?.account_id);
  const setupComplete = assetAccounts.length > 0 && unmappedModes.length === 0;

  if (tenantRequired) {
    return <div className="card p-12 text-center text-slate-500">Select a tenant to configure payment modes.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Modes"
        subtitle="Link Cash, Bank, UPI, and Cheque to accounts"
      />

      <FinanceModuleGuide page="payment-modes" />

      {setupComplete && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm border border-emerald-100">
          <CheckCircle2 size={18} className="shrink-0" />
          Payment modes are mapped. You can record payments in Day Book.
        </div>
      )}

      {unmappedModes.length > 0 && assetAccounts.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 text-amber-800 text-sm border border-amber-100">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Complete setup before recording transactions</p>
            <p className="mt-1 text-amber-700">
              Map each payment mode to a cash or bank account:{' '}
              {unmappedModes.map((m) => PAYMENT_MODE_LABELS[m.payment_mode]).join(', ')}.
            </p>
          </div>
        </div>
      )}

      {assetAccounts.length === 0 && !coaLoading && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-900 text-sm border border-blue-100">
          <p>
            No asset accounts found. Initialize the standard Chart of Accounts (Cash in Hand, Bank Account, payroll heads).
          </p>
          <button
            type="button"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="btn-primary text-xs shrink-0"
          >
            {seedMutation.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Initializing…
              </>
            ) : (
              'Initialize Finance Accounts'
            )}
          </button>
        </div>
      )}

      {formError && (
        <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{formError}</div>
      )}

      <div className="card overflow-x-auto overscroll-x-contain">
        {isLoading ? (
          <p className="text-center py-12 text-slate-400">Loading mappings…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Payment Mode</th>
                <th className="text-left px-4 py-3 font-semibold">Mapped COA Account</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modes.map(({ payment_mode, mapping }) => {
                const selected = drafts[payment_mode] ?? String(mapping?.account_id || '');
                const isMapped = Boolean(mapping?.account_id);
                return (
                  <tr key={payment_mode} className={!isMapped ? 'bg-amber-50/40' : undefined}>
                    <td className="px-4 py-3 font-medium">
                      {PAYMENT_MODE_LABELS[payment_mode]}
                      {!isMapped && (
                        <span className="ml-2 text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          Not mapped
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={selected}
                        onChange={(e) => setDrafts({ ...drafts, [payment_mode]: e.target.value })}
                        disabled={assetAccounts.length === 0}
                        className="w-full max-w-md px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        <option value="">Select asset account…</option>
                        {assetAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} — {account.name}
                          </option>
                        ))}
                      </select>
                      {mapping?.account && (
                        <p className="text-xs text-slate-400 mt-1">
                          Current: {mapping.account.code} — {mapping.account.name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={!selected || saveMutation.isPending}
                        onClick={() =>
                          saveMutation.mutate({
                            mode: payment_mode,
                            account_id: parseInt(selected, 10),
                          })
                        }
                        className="btn-primary text-xs"
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
