import { useState } from 'react';
import { EMPLOYMENT_TYPES } from './leaveSettings.constants';
import { Modal, Select, FormError, FormActions } from './leaveSettingsUi';

export default function LeavePolicyAssignment({
  open,
  policy,
  departments,
  designations,
  employees,
  onClose,
  onSubmit,
  loading,
  error,
}) {
  const [scope, setScope] = useState('tenant');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  if (!open || !policy) return null;

  const buildPayload = () => {
    if (scope === 'tenant') return {};
    if (scope === 'department') return { department_id: parseInt(departmentId, 10) };
    if (scope === 'designation') return { designation_id: parseInt(designationId, 10) };
    if (scope === 'employment_type') return { employment_type: employmentType };
    if (scope === 'employee') return { employee_id: parseInt(employeeId, 10) };
    return {};
  };

  return (
    <Modal title={`Assign policy — ${policy.policy_name}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(buildPayload());
        }}
        className="space-y-4"
      >
        <FormError message={error} />
        <p className="text-xs text-slate-500">
          Assign <strong>{policy.leaveType?.code}</strong> policy to a specific scope. Tenant-wide assignments apply when all fields are empty.
        </p>

        <div>
          <label className="text-xs font-medium text-slate-600">Assignment scope</label>
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
            <option value="tenant">All employees (tenant-wide)</option>
            <option value="department">Specific department</option>
            <option value="designation">Specific designation</option>
            <option value="employment_type">Employment type</option>
            <option value="employee">Individual employee</option>
          </select>
        </div>

        {scope === 'department' && (
          <Select
            label="Department"
            value={departmentId}
            onChange={setDepartmentId}
            options={departments.filter((d) => d.is_active !== false).map((d) => ({ value: d.id, label: d.name }))}
            required
          />
        )}
        {scope === 'designation' && (
          <Select
            label="Designation"
            value={designationId}
            onChange={setDesignationId}
            options={designations.filter((d) => d.is_active !== false).map((d) => ({ value: d.id, label: d.name }))}
            required
          />
        )}
        {scope === 'employment_type' && (
          <Select label="Employment type" value={employmentType} onChange={setEmploymentType} options={EMPLOYMENT_TYPES} required />
        )}
        {scope === 'employee' && (
          <Select
            label="Employee"
            value={employeeId}
            onChange={setEmployeeId}
            options={employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name} (${e.emp_code})` }))}
            required
          />
        )}

        <FormActions onCancel={onClose} loading={loading} submitLabel="Assign policy" />
      </form>
    </Modal>
  );
}
