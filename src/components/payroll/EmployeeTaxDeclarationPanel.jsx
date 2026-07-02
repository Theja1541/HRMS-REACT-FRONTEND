import { useQuery } from '@tanstack/react-query';
import { Lock, Receipt, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { payrollApi } from '../../api';
import { formatINR } from '../../utils/helpers';

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800 mt-0.5">{value ?? '—'}</p>
    </div>
  );
}

/**
 * Admin read-only view of employee FY tax declaration (payroll review).
 */
export default function EmployeeTaxDeclarationPanel({ employeeId, employeeName }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['employee-tax-declaration', employeeId],
    queryFn: () => payrollApi.getEmployeeTaxDeclaration(employeeId),
    enabled: !!employeeId,
  });

  if (isLoading) {
    return <div className="py-8 text-center text-slate-400 text-sm">Loading tax declaration…</div>;
  }

  if (error) {
    return (
      <div className="py-6 text-center text-red-600 text-sm">
        {error.response?.data?.error?.message || 'Failed to load tax declaration'}
      </div>
    );
  }

  const info = data?.data;
  const decl = info?.declaration;
  const caps = info?.caps || {};
  const fy = info?.financial_year;
  const regime = decl?.regime || 'new (default — no declaration submitted)';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
            <Receipt size={16} className="text-slate-500" />
            FY {fy} tax declaration
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Used for monthly TDS slab computation on {employeeName || 'this employee'}&apos;s payslips.
          </p>
        </div>
        {info?.is_locked && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
            <Lock size={12} /> Locked after payroll processing
          </span>
        )}
      </div>

      {!decl && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No declaration submitted. Payroll uses <strong>new regime</strong> with standard deduction only (
          {formatINR(caps.standard_deduction_new || 75000)} per FY config).
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <Field label="Regime" value={typeof regime === 'string' ? regime : decl?.regime} />
        <Field label="Status" value={decl?.status || 'not submitted'} />
        <Field
          label="Standard deduction (regime)"
          value={
            decl?.regime === 'old'
              ? formatINR(caps.standard_deduction_old || 50000)
              : formatINR(caps.standard_deduction_new || 75000)
          }
        />
        {decl?.regime === 'old' && (
          <>
            <Field
              label="Section 80C declared"
              value={`${formatINR(decl.declared_80c)} (cap ${formatINR(caps.section_80c_cap || 150000)})`}
            />
            <Field
              label="Section 80D declared"
              value={`${formatINR(decl.declared_80d)} (cap ${formatINR(caps.section_80d_cap || 25000)})`}
            />
            <Field label="Annual rent (HRA)" value={formatINR(decl.declared_hra_rent_annual)} />
            <Field label="Metro city" value={decl.is_metro_city ? 'Yes' : 'No'} />
            {parseFloat(decl.other_deductions || 0) > 0 && (
              <Field label="Other deductions" value={formatINR(decl.other_deductions)} />
            )}
          </>
        )}
      </div>

      <p className="text-xs text-slate-500 border-t border-slate-100 pt-4">
        TDS override (if set) on the salary record takes precedence over slab computation. Check{' '}
        <Link to="/salaries" className="text-brand-600 hover:underline">
          Salaries → TDS Override
        </Link>
        . Employee can update their declaration at{' '}
        <span className="font-mono text-slate-600">/me/tax-declaration</span>
        {' '}
        <ExternalLink size={10} className="inline" /> unless regime is locked.
      </p>
    </div>
  );
}
