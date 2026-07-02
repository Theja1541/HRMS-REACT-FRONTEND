import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Lock, Info } from 'lucide-react';
import { portalApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import { formatINR } from '../../utils/helpers';

const DEFAULT_CAPS = { section_80c_cap: 150000, section_80d_cap: 25000 };

export default function TaxDeclarationPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tax-declaration'],
    queryFn: () => portalApi.getTaxDeclaration(),
  });

  const caps = data?.data?.caps || DEFAULT_CAPS;
  const cap80c = caps.section_80c_cap ?? DEFAULT_CAPS.section_80c_cap;
  const cap80d = caps.section_80d_cap ?? DEFAULT_CAPS.section_80d_cap;

  useEffect(() => {
    if (!data?.data) return;
    const decl = data.data.declaration;
    setForm({
      financial_year: data.data.financial_year,
      regime: decl?.regime || 'new',
      declared_80c: decl?.declared_80c ?? 0,
      declared_80d: decl?.declared_80d ?? 0,
      declared_hra_rent_annual: decl?.declared_hra_rent_annual ?? 0,
      is_metro_city: decl?.is_metro_city ?? true,
      other_deductions: decl?.other_deductions ?? 0,
    });
  }, [data]);

  const info = data?.data;
  const locked = info?.is_locked;
  const regimeLocked = info?.regime_locked;

  const saveMutation = useMutation({
    mutationFn: (payload) => portalApi.saveTaxDeclaration(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tax-declaration'] }),
  });

  if (isLoading || !form) {
    return <div className="p-8 text-center text-slate-400">Loading tax declaration…</div>;
  }

  const capped80c = Math.min(parseFloat(form.declared_80c || 0), cap80c);
  const capped80d = Math.min(parseFloat(form.declared_80d || 0), cap80d);

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Tax Declaration"
        subtitle={`Financial year ${form.financial_year} — used for monthly TDS calculation`}
      />

      {locked && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
          <Lock size={16} className="mt-0.5 shrink-0" />
          <span>
            Regime locked for FY {form.financial_year} after payroll processing. You can still update
            investment amounts within the same regime.
          </span>
        </div>
      )}

      <div className="card p-6 space-y-5">
        <fieldset disabled={regimeLocked}>
          <legend className="text-sm font-semibold text-slate-800 mb-3">Tax regime</legend>
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="regime"
                checked={form.regime === 'new'}
                onChange={() => setForm({ ...form, regime: 'new' })}
                className="mt-1"
              />
              <span>
                <span className="font-medium">New regime</span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lower rates, standard deduction only ({formatINR(caps.standard_deduction_new || 75000)}) — no
                  80C/80D/HRA exemptions.
                </p>
              </span>
            </label>
            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="regime"
                checked={form.regime === 'old'}
                onChange={() => setForm({ ...form, regime: 'old' })}
                className="mt-1"
              />
              <span>
                <span className="font-medium">Old regime</span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Higher slab rates with 80C, 80D, and HRA exemptions if declared.
                </p>
              </span>
            </label>
          </div>
        </fieldset>

        {form.regime === 'old' && (
          <div className="space-y-4 border-t pt-4">
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Info size={14} /> Caps are from tenant tax settings and applied in payroll automatically.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-600">
                Section 80C (max {formatINR(cap80c)})
              </label>
              <input
                type="number"
                value={form.declared_80c}
                onChange={(e) => setForm({ ...form, declared_80c: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
              {parseFloat(form.declared_80c) > cap80c && (
                <p className="text-xs text-amber-600 mt-1">Will be capped at {formatINR(cap80c)}</p>
              )}
              <p className="text-xs text-slate-400 mt-1">Effective in payroll: {formatINR(capped80c)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">
                Section 80D (max {formatINR(cap80d)})
              </label>
              <input
                type="number"
                value={form.declared_80d}
                onChange={(e) => setForm({ ...form, declared_80d: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
              {parseFloat(form.declared_80d) > cap80d && (
                <p className="text-xs text-amber-600 mt-1">Will be capped at {formatINR(cap80d)}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Annual rent paid (HRA)</label>
              <input
                type="number"
                value={form.declared_hra_rent_annual}
                onChange={(e) => setForm({ ...form, declared_hra_rent_annual: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_metro_city}
                onChange={(e) => setForm({ ...form, is_metro_city: e.target.checked })}
              />
              Metro city (50% of basic for HRA exemption)
            </label>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            className="btn-primary"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate(form)}
          >
            <Save size={14} /> {saveMutation.isPending ? 'Saving…' : 'Save declaration'}
          </button>
        </div>
      </div>
    </div>
  );
}
