import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { payrollApi } from '../../../api';
import { useAuthStore } from '../../../store/auth.store';
import SalaryStructureStep from './SalaryStructureStep';
import {
  INITIAL_SALARY_STRUCTURE,
  componentsToWizardStructure,
  parseAmount,
} from './salaryStructure';

export default function SalaryStructureEditor({
  structure,
  onChange,
  templateId = '',
  onTemplateIdChange,
  errors = {},
  readOnly = false,
  showSkipOption = true,
  autoApplyDefault = false,
  employeeId = null,
}) {
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;

  const { data, isLoading } = useQuery({
    queryKey: ['salary-structures', selectedTenantId],
    queryFn: () => payrollApi.listStructures(),
    enabled: !tenantRequired && !readOnly,
  });

  const structures = data?.data?.structures || [];

  const defaultStructure = useMemo(
    () => structures.find((s) => s.is_default) || null,
    [structures]
  );

  const isStructureEmpty = parseAmount(structure?.earnings?.basic) <= 0;

  useEffect(() => {
    if (!autoApplyDefault || readOnly || tenantRequired || !defaultStructure || !isStructureEmpty) return;
    if (templateId) return;

    onTemplateIdChange?.(String(defaultStructure.id));
    onChange(componentsToWizardStructure(defaultStructure.components));
  }, [
    autoApplyDefault,
    defaultStructure,
    isStructureEmpty,
    onChange,
    onTemplateIdChange,
    readOnly,
    templateId,
    tenantRequired,
  ]);

  const handleTemplateChange = (value) => {
    onTemplateIdChange?.(value);

    if (!value) {
      onChange({ ...INITIAL_SALARY_STRUCTURE, skip_salary: false });
      return;
    }

    const selected = structures.find((s) => String(s.id) === value);
    if (!selected) return;

    onChange(componentsToWizardStructure(selected.components));
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            <Layers size={14} />
            Apply salary structure template
          </label>
          {tenantRequired ? (
            <p className="text-xs text-amber-700">Select a tenant to load salary structure templates.</p>
          ) : isLoading ? (
            <p className="text-xs text-slate-400">Loading templates…</p>
          ) : structures.length === 0 ? (
            <p className="text-xs text-slate-500">
              No templates yet.{' '}
              <Link to="/payroll/structures" className="text-brand-600 hover:underline">
                Create one
              </Link>{' '}
              or enter amounts manually below.
            </p>
          ) : (
            <select
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">Custom — enter manually</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.is_default ? ' (default)' : ''}
                </option>
              ))}
            </select>
          )}
          {templateId && (
            <p className="text-[11px] text-slate-500 mt-2">
              Template applied — you can still adjust individual components below.
            </p>
          )}
        </div>
      )}

      <SalaryStructureStep
        structure={structure}
        onChange={onChange}
        errors={errors}
        readOnly={readOnly}
        showSkipOption={showSkipOption}
      />
    </div>
  );
}
