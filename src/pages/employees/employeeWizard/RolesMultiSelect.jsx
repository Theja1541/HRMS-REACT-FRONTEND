import { SYSTEM_ROLES } from '../../../constants/hr';
import { cn } from '../../../utils/helpers';
import WizardField from './WizardField';

export function syncRolesSelection(roles, systemRole, roleValue, checked) {
  let nextRoles = [...roles];
  if (checked) {
    if (!nextRoles.includes(roleValue)) nextRoles.push(roleValue);
  } else {
    nextRoles = nextRoles.filter((r) => r !== roleValue);
  }

  let nextSystemRole = systemRole;
  if (!nextRoles.length) {
    nextSystemRole = '';
  } else if (!nextRoles.includes(nextSystemRole)) {
    nextSystemRole = nextRoles[0];
  }

  return { roles: nextRoles, system_role: nextSystemRole };
}

export default function RolesMultiSelect({
  roles = [],
  systemRole,
  onChange,
  rolesError,
  systemRoleError,
  readOnly = false,
  inputClassName,
}) {
  const selectedRoleOptions = SYSTEM_ROLES.filter((r) => roles.includes(r.value));

  const toggleRole = (roleValue, checked) => {
    onChange(syncRolesSelection(roles, systemRole, roleValue, checked));
  };

  return (
    <>
      <WizardField
        label="Roles"
        required
        error={rolesError}
        className="sm:col-span-2"
        hint="Select all roles this employee should have"
      >
        <div
          className={cn(
            'rounded-lg border border-slate-200 divide-y divide-slate-100',
            readOnly && 'bg-slate-50/50'
          )}
        >
          {SYSTEM_ROLES.map((r) => (
            <label
              key={r.value}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5',
                readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50/80'
              )}
            >
              <input
                type="checkbox"
                checked={roles.includes(r.value)}
                onChange={(e) => toggleRole(r.value, e.target.checked)}
                disabled={readOnly}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-600"
              />
              <span className="text-sm text-slate-700">{r.label}</span>
            </label>
          ))}
        </div>
      </WizardField>

      {roles.length > 1 && (
        <WizardField
          label="Default Role"
          required
          error={systemRoleError}
          hint="Primary role used for login and access routing"
        >
          <select
            value={systemRole}
            onChange={(e) => onChange({ roles, system_role: e.target.value })}
            disabled={readOnly}
            className={inputClassName(systemRoleError)}
          >
            {selectedRoleOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </WizardField>
      )}
    </>
  );
}
