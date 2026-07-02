import { useMemo } from 'react';
import { cn } from '../../../utils/helpers';
import {
  formatSalaryINR,
  parseAmount,
  yearlyFromMonthly,
  computeSalaryTotals,
  normalizeWizardStructure,
} from './salaryStructure';

function SalaryRow({ label, monthlyValue, onMonthlyChange, editable = true, className }) {
  const monthly = parseAmount(monthlyValue);
  const yearly = yearlyFromMonthly(monthly);

  return (
    <tr className={className}>
      <td className="px-4 py-2.5 text-sm text-slate-700 font-medium">{label}</td>
      <td className="px-4 py-2.5 text-right">
        {editable ? (
          <input
            type="number"
            min="0"
            step="0.01"
            value={monthlyValue ?? ''}
            onChange={(e) => onMonthlyChange(e.target.value)}
            className="w-full max-w-[140px] ml-auto px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
            placeholder="0.00"
          />
        ) : (
          <span className="font-mono text-sm text-slate-800">{monthly.toFixed(2)}</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right font-mono text-sm text-slate-600 whitespace-nowrap">
        {formatSalaryINR(yearly)}
      </td>
    </tr>
  );
}

function SummaryRow({ label, monthly, yearly, variant = 'default' }) {
  const styles = {
    default: 'bg-slate-50 font-semibold',
    gross: 'bg-sky-50 font-semibold text-sky-900',
    deductions: 'bg-amber-50 font-semibold text-amber-900',
    net: 'bg-emerald-50 font-semibold text-emerald-900',
    benefits: 'bg-slate-100 font-semibold',
    ctc: 'bg-violet-50 font-semibold text-violet-900',
  };

  return (
    <tr className={styles[variant]}>
      <td className="px-4 py-3 text-sm">{label}</td>
      <td className="px-4 py-3 text-right font-mono text-sm">{formatSalaryINR(monthly)}</td>
      <td className="px-4 py-3 text-right font-mono text-sm">{formatSalaryINR(yearly)}</td>
    </tr>
  );
}

function SectionHeader({ title }) {
  return (
    <tr className="bg-slate-100">
      <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        {title}
      </td>
    </tr>
  );
}

export default function SalaryStructureStep({
  structure,
  onChange,
  errors = {},
  readOnly = false,
  showSkipOption = true,
}) {
  const normalized = useMemo(() => normalizeWizardStructure(structure), [structure]);
  const totals = computeSalaryTotals(normalized);

  const patchStructure = (patch) => {
    onChange(normalizeWizardStructure({ ...normalized, ...patch }));
  };

  const setEarning = (key, value) => {
    patchStructure({ earnings: { ...normalized.earnings, [key]: value } });
  };

  const setDeduction = (key, value) => {
    patchStructure({ deductions: { ...normalized.deductions, [key]: value } });
  };

  const setEmployer = (key, value) => {
    patchStructure({ employer: { ...normalized.employer, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Salary Structure</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {readOnly
              ? 'Monthly and yearly salary breakdown (read-only).'
              : 'Enter monthly amounts for each component. Totals and CTC update automatically.'}
          </p>
        </div>
        {!readOnly && showSkipOption && (
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={normalized.skip_salary}
              onChange={(e) => patchStructure({ skip_salary: e.target.checked })}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-600"
            />
            Skip salary assignment for now
          </label>
        )}
      </div>

      {errors.salary_basic && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errors.salary_basic}</p>
      )}

      <div className={cn('card overflow-hidden border border-slate-200 shadow-none p-0', normalized.skip_salary && 'opacity-50 pointer-events-none')}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b border-slate-200 bg-white">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-[40%]">Component</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-[30%]">Monthly</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-[30%]">Yearly</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <SectionHeader title="Earnings (A)" />
              <SalaryRow label="Basic" monthlyValue={normalized.earnings.basic} onMonthlyChange={(v) => setEarning('basic', v)} editable={!readOnly} />
              <SalaryRow label="DA" monthlyValue={normalized.earnings.da} onMonthlyChange={(v) => setEarning('da', v)} editable={!readOnly} />
              <SalaryRow label="HRA" monthlyValue={normalized.earnings.hra} onMonthlyChange={(v) => setEarning('hra', v)} editable={!readOnly} />
              <SalaryRow label="Conveyance Allowance" monthlyValue={normalized.earnings.conveyance} onMonthlyChange={(v) => setEarning('conveyance', v)} editable={!readOnly} />
              <SalaryRow label="Medical Allowance" monthlyValue={normalized.earnings.medical_allowance} onMonthlyChange={(v) => setEarning('medical_allowance', v)} editable={!readOnly} />
              <SalaryRow label="Special Allowance" monthlyValue={normalized.earnings.special_allowance} onMonthlyChange={(v) => setEarning('special_allowance', v)} editable={!readOnly} />
              <SummaryRow label="Gross Salary (A)" monthly={totals.grossMonthly} yearly={totals.grossYearly} variant="gross" />

              <SectionHeader title="Deductions (B)" />
              <SalaryRow label="Employee PF" monthlyValue={normalized.deductions.pf_employee} onMonthlyChange={(v) => setDeduction('pf_employee', v)} editable={!readOnly} />
              <SalaryRow label="Professional Tax" monthlyValue={normalized.deductions.professional_tax} onMonthlyChange={(v) => setDeduction('professional_tax', v)} editable={!readOnly} />
              <SalaryRow label="Employee ESI" monthlyValue={normalized.deductions.esic_employee} onMonthlyChange={(v) => setDeduction('esic_employee', v)} editable={!readOnly} />
              <SalaryRow label="TDS" monthlyValue={normalized.deductions.tds} onMonthlyChange={(v) => setDeduction('tds', v)} editable={!readOnly} />
              <SalaryRow label="Medical Insurance" monthlyValue={normalized.deductions.medical_insurance} onMonthlyChange={(v) => setDeduction('medical_insurance', v)} editable={!readOnly} />
              <SalaryRow label="LWF" monthlyValue={normalized.deductions.lwf} onMonthlyChange={(v) => setDeduction('lwf', v)} editable={!readOnly} />
              <SummaryRow label="Total Deductions (B)" monthly={totals.deductionsMonthly} yearly={totals.deductionsYearly} variant="deductions" />
              <SummaryRow label="Net Salary (A − B)" monthly={totals.netMonthly} yearly={totals.netYearly} variant="net" />

              <SectionHeader title="Employer Contributions" />
              <SalaryRow label="Employer PF" monthlyValue={normalized.employer.pf_employer} onMonthlyChange={(v) => setEmployer('pf_employer', v)} editable={!readOnly} />
              <SalaryRow label="Employer ESI" monthlyValue={normalized.employer.esic_employer} onMonthlyChange={(v) => setEmployer('esic_employer', v)} editable={!readOnly} />
              <SalaryRow label="Gratuity" monthlyValue={normalized.employer.gratuity} onMonthlyChange={(v) => setEmployer('gratuity', v)} editable={!readOnly} />
              <SummaryRow label="Additional Benefits (C)" monthly={totals.employerMonthly} yearly={totals.employerYearly} variant="benefits" />
              <SummaryRow label="CTC (A + C)" monthly={totals.ctcMonthly} yearly={totals.ctcYearly} variant="ctc" />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
