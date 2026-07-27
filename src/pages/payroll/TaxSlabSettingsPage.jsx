import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Plus,
  Trash2,
  BookOpen,
  IndianRupee,
  Percent,
  Shield,
  Pencil,
  X,
  Info,
} from 'lucide-react';
import { payrollApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import { formatINR, cn } from '../../utils/helpers';

const EMPTY_SLAB = { income_from: 0, income_to: null, rate_percent: 0 };

const REGIME_META = {
  old: {
    label: 'Old regime',
    hint: 'Allows Chapter VI-A deductions (80C, 80D, HRA, etc.) with these slab rates.',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  new: {
    label: 'New regime',
    hint: 'Lower slab rates; most deductions are not applicable except standard deduction.',
    badge: 'bg-sky-50 text-sky-800 border-sky-200',
  },
};

function formatIncomeRange(from, to) {
  const fromLabel = formatINR(from);
  if (to == null || to === '') return `${fromLabel} and above`;
  return `${fromLabel} – ${formatINR(to)}`;
}

function SlabPreviewTable({ slabs }) {
  if (!slabs?.length) {
    return <p className="text-sm text-slate-400 py-4">No tax slabs configured.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left">
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500 w-12">#</th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500">Annual income band</th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500 w-28">Tax rate</th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-slate-500 hidden sm:table-cell">Visual</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {slabs.map((slab, index) => (
            <tr key={slab.id || index} className="hover:bg-slate-50/80">
              <td className="px-4 py-3 text-xs text-slate-400 font-mono">{index + 1}</td>
              <td className="px-4 py-3 font-medium text-slate-800">
                {formatIncomeRange(slab.income_from, slab.income_to)}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100 px-2.5 py-0.5 text-xs font-semibold">
                  {slab.rate_percent}%
                </span>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden max-w-[160px]">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${Math.min(100, Number(slab.rate_percent) || 0)}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeductionField({ label, hint, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-700">{label}</label>
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
      <div className="relative mt-1.5">
        <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="number"
          min="0"
          value={value}
          onChange={onChange}
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      </div>
    </div>
  );
}

export default function TaxSlabSettingsPage() {
  const queryClient = useQueryClient();
  const [editForm, setEditForm] = useState(null);
  const [toast, setToast] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tax-slab-configs'],
    queryFn: () => payrollApi.listTaxSlabConfigs(),
  });

  const configs = data?.data || [];

  const financialYears = useMemo(
    () => [...new Set(configs.map((c) => c.financial_year))].sort().reverse(),
    [configs]
  );

  const [activeFy, setActiveFy] = useState(null);
  const [activeRegime, setActiveRegime] = useState('new');

  const resolvedFy = activeFy || financialYears[0] || null;

  const configsForFy = useMemo(
    () => configs.filter((c) => c.financial_year === resolvedFy),
    [configs, resolvedFy]
  );

  const activeConfig = useMemo(
    () => configsForFy.find((c) => c.regime === activeRegime) || configsForFy[0] || null,
    [configsForFy, activeRegime]
  );

  const saveMutation = useMutation({
    mutationFn: (payload) => payrollApi.saveTaxSlabConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-slab-configs'] });
      setEditForm(null);
      setToast({ type: 'success', message: 'Tax configuration saved successfully' });
      setTimeout(() => setToast(null), 4000);
    },
    onError: (err) => {
      setToast({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to save tax configuration',
      });
      setTimeout(() => setToast(null), 5000);
    },
  });

  const startEdit = (cfg) => {
    setEditForm({
      financial_year: cfg.financial_year,
      regime: cfg.regime,
      standard_deduction: cfg.standard_deduction,
      cess_percent: cfg.cess_percent,
      section_80c_cap: cfg.section_80c_cap,
      section_80d_cap: cfg.section_80d_cap,
      slabs: cfg.slabs.length ? cfg.slabs.map((s) => ({ ...s })) : [{ ...EMPTY_SLAB }],
    });
  };

  const updateSlab = (index, patch) => {
    const slabs = [...editForm.slabs];
    slabs[index] = { ...slabs[index], ...patch };
    setEditForm({ ...editForm, slabs });
  };

  const removeSlab = (index) => {
    if (editForm.slabs.length <= 1) return;
    setEditForm({ ...editForm, slabs: editForm.slabs.filter((_, i) => i !== index) });
  };

  const regimeMeta = REGIME_META[activeConfig?.regime || activeRegime] || REGIME_META.new;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Payroll · Tax Settings"
        title="Tax Settings"
        subtitle="Configure income tax slabs, standard deduction, and deduction caps used for TDS and employee declarations"
      />

      {toast && (
        <div
          className={cn(
            'text-sm px-4 py-3 rounded-lg border',
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          )}
        >
          {toast.message}
        </div>
      )}

      <div className="card p-5 border border-slate-200 bg-slate-50/80">
        <div className="flex items-start gap-3">
          <BookOpen size={20} className="text-brand-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">How tax settings work</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Each financial year has separate configurations for the <strong>Old</strong> and{' '}
                <strong>New</strong> tax regimes. Slab rates drive monthly TDS on payroll. Employees choose
                their regime in{' '}
                <Link to="/me/tax-declaration" className="text-brand-600 hover:underline">
                  Tax Declaration
                </Link>
                ; payroll uses the slabs you maintain here.
              </p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { n: 1, title: 'Pick financial year', text: 'Select the FY you are configuring (e.g. 2025-26).' },
                { n: 2, title: 'Choose regime', text: 'Old regime supports 80C/80D caps; New regime uses lower slabs.' },
                { n: 3, title: 'Review slabs', text: 'Income bands and rates must be contiguous from ₹0 upward.' },
                { n: 4, title: 'Save changes', text: 'Updated rates apply to the next payroll TDS calculation.' },
              ].map((step) => (
                <li key={step.n} className="rounded-lg bg-white border border-slate-200 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-brand-600">Step {step.n}</p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{step.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="card py-16 text-center text-slate-400 text-sm">Loading tax configurations…</div>
      ) : isError ? (
        <div className="card py-16 text-center text-red-600 text-sm">Unable to load tax settings.</div>
      ) : !configs.length ? (
        <div className="card py-16 text-center text-slate-400 text-sm">
          No tax configurations found. Defaults are created automatically on first access.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Financial year</span>
            <div className="ds-tabs scroll-tabs flex-wrap" role="tablist">
              {financialYears.map((fy) => (
                <button
                  key={fy}
                  type="button"
                  role="tab"
                  aria-selected={resolvedFy === fy}
                  onClick={() => {
                    setActiveFy(fy);
                    setEditForm(null);
                  }}
                  className={cn(resolvedFy === fy && 'ds-tab-active')}
                >
                  FY {fy}
                </button>
              ))}
            </div>
          </div>

          <div className="ds-tabs scroll-tabs" role="tablist">
            {['new', 'old'].map((regime) => {
              const cfg = configsForFy.find((c) => c.regime === regime);
              const meta = REGIME_META[regime];
              return (
                <button
                  key={regime}
                  type="button"
                  role="tab"
                  aria-selected={activeConfig?.regime === regime}
                  disabled={!cfg}
                  onClick={() => {
                    setActiveRegime(regime);
                    setEditForm(null);
                  }}
                  className={cn(activeConfig?.regime === regime && 'ds-tab-active', 'disabled:opacity-40')}
                >
                  {meta.label}
                  {cfg && (
                    <span className="ml-2 text-[10px] font-normal text-slate-400">
                      {cfg.slabs.length} slab{cfg.slabs.length === 1 ? '' : 's'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {activeConfig && !editForm && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="card p-4">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">Standard deduction</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{formatINR(activeConfig.standard_deduction)}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Reduced from taxable income before slabs</p>
                </div>
                <div className="card p-4">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">Health & education cess</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{activeConfig.cess_percent}%</p>
                  <p className="text-[11px] text-slate-500 mt-1">Applied on computed tax</p>
                </div>
                <div className="card p-4">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">Section 80C cap</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{formatINR(activeConfig.section_80c_cap)}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Old regime investments limit</p>
                </div>
                <div className="card p-4">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">Section 80D cap</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{formatINR(activeConfig.section_80d_cap)}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Medical insurance limit</p>
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900">
                        FY {activeConfig.financial_year} · {regimeMeta.label}
                      </h3>
                      <span className={cn('text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border', regimeMeta.badge)}>
                        {activeConfig.regime}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">{regimeMeta.hint}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(activeConfig)}
                    className="btn-primary text-xs inline-flex items-center gap-1.5"
                  >
                    <Pencil size={14} /> Edit configuration
                  </button>
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Income tax slabs</p>
                  <SlabPreviewTable slabs={activeConfig.slabs} />
                </div>
              </div>
            </div>
          )}

          {editForm && (
            <div className="card p-6 space-y-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Edit FY {editForm.financial_year} — {REGIME_META[editForm.regime]?.label || editForm.regime}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Adjust deduction limits and slab bands. Leave the top slab &quot;To&quot; empty for unlimited income.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditForm(null);
                    setSelectedKey(null);
                  }}
                  className="btn-secondary p-2"
                  aria-label="Close editor"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 flex gap-2 text-xs text-blue-900">
                <Info size={14} className="shrink-0 mt-0.5" />
                <p>
                  Slabs are evaluated in order from lowest income. The last slab typically has no upper limit.
                  Cess is calculated on top of the total tax after slabs.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-1.5">
                  <Shield size={14} /> Deductions & limits
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <DeductionField
                    label="Standard deduction"
                    hint="Flat amount before tax slabs"
                    value={editForm.standard_deduction}
                    onChange={(e) => setEditForm({ ...editForm, standard_deduction: e.target.value })}
                  />
                  <div>
                    <label className="text-xs font-medium text-slate-700">Cess (%)</label>
                    <p className="text-[11px] text-slate-400 mt-0.5">Usually 4% in India</p>
                    <div className="relative mt-1.5">
                      <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.cess_percent}
                        onChange={(e) => setEditForm({ ...editForm, cess_percent: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <DeductionField
                    label="Section 80C cap"
                    hint="PF, ELSS, LIC, etc. (old regime)"
                    value={editForm.section_80c_cap}
                    onChange={(e) => setEditForm({ ...editForm, section_80c_cap: e.target.value })}
                  />
                  <DeductionField
                    label="Section 80D cap"
                    hint="Health insurance (old regime)"
                    value={editForm.section_80d_cap}
                    onChange={(e) => setEditForm({ ...editForm, section_80d_cap: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Income tax slabs</p>
                  <button
                    type="button"
                    className="btn-secondary text-xs inline-flex items-center gap-1"
                    onClick={() =>
                      setEditForm({
                        ...editForm,
                        slabs: [...editForm.slabs, { ...EMPTY_SLAB }],
                      })
                    }
                  >
                    <Plus size={12} /> Add slab
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-[1fr_1fr_100px_40px] gap-2 px-1 text-[10px] font-semibold uppercase text-slate-400">
                    <span>Income from (₹/year)</span>
                    <span>Income to (₹/year)</span>
                    <span>Rate %</span>
                    <span />
                  </div>
                  {editForm.slabs.map((s, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_100px_40px] gap-2 items-start">
                      <input
                        type="number"
                        min="0"
                        placeholder="From"
                        value={s.income_from}
                        onChange={(e) => updateSlab(i, { income_from: e.target.value })}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="To (blank = no limit)"
                        value={s.income_to ?? ''}
                        onChange={(e) => updateSlab(i, { income_to: e.target.value || null })}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Rate %"
                        value={s.rate_percent}
                        onChange={(e) => updateSlab(i, { rate_percent: e.target.value })}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        disabled={editForm.slabs.length <= 1}
                        onClick={() => removeSlab(i)}
                        className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 disabled:opacity-30"
                        aria-label="Remove slab"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditForm(null);
                    setSelectedKey(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary inline-flex items-center gap-1.5"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate(editForm)}
                >
                  <Save size={14} />
                  {saveMutation.isPending ? 'Saving…' : 'Save configuration'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
