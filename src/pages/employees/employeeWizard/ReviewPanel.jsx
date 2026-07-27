import { CalendarClock, Pencil } from 'lucide-react';
import {
  BLOOD_GROUPS,
  EMPLOYEE_DOCUMENTS,
  EMPLOYMENT_TYPES,
  GENDERS,
  SYSTEM_ROLES,
} from '../../../constants/hr';
import { WORK_MODE_LABELS } from './constants';
import { computeSalaryTotals, formatSalaryINR } from './salaryStructure';

function ReviewSection({ title, onEdit, readOnly, children }) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <h4 className="text-xs font-semibold text-slate-700">{title}</h4>
        {!readOnly && onEdit && (
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700">
          <Pencil size={12} /> Edit
        </button>
        )}
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">{children}</div>
    </div>
  );
}

function ReviewItem({ label, value }) {
  const display = value == null || value === '' ? '—' : value;
  return (
    <div>
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <div className="text-sm text-slate-800 mt-0.5 break-words">{display}</div>
    </div>
  );
}

function labelOf(list, value) {
  return list.find((x) => x.value === value)?.label || value?.replace(/_/g, ' ') || '—';
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ReviewPanel({ form, documents, existingDocuments = {}, lookups, onGoToStep, readOnly = false, probationPreview = null, companySlug = '', employeeId = null }) {
  const { departments, designations, branches, managers } = lookups;

  const dept = departments.find((d) => String(d.id) === String(form.department_id))?.name;
  const desig = designations.find((d) => String(d.id) === String(form.designation_id))?.name;
  const branch = branches.find((b) => String(b.id) === String(form.branch_id));
  const manager = managers.find((m) => String(m.id) === String(form.reporting_to));
  const uploadedCount = Object.values(documents).filter(Boolean).length;

  const contacts = (form.emergency_contacts || []).filter((c) => c.contact_name?.trim() || c.contact_phone?.trim());

  const salaryTotals = form.salary_structure?.skip_salary
    ? null
    : computeSalaryTotals(form.salary_structure);

  return (
    <div className="space-y-4">
      <ReviewSection title="Personal Information" onEdit={() => onGoToStep(1)} readOnly={readOnly}>
        <ReviewItem label="Employee ID" value={form.emp_code} />
        <ReviewItem label="Name" value={`${form.first_name} ${form.last_name}`.trim()} />
        <ReviewItem label="Official Email" value={form.email} />
        <ReviewItem label="Mobile" value={form.phone} />
        <ReviewItem label="Date of Birth" value={form.date_of_birth} />
        <ReviewItem label="Gender" value={labelOf(GENDERS, form.gender)} />
        <ReviewItem label="Blood Group" value={form.blood_group} />
        <div className="sm:col-span-2">
          <ReviewItem label="Address" value={form.permanent_address} />
        </div>
      </ReviewSection>

      <ReviewSection title="Employment Information" onEdit={() => onGoToStep(2)} readOnly={readOnly}>
        <ReviewItem label="Company Slug" value={companySlug ? `${companySlug} (${companySlug}.hrms.app)` : null} />
        <ReviewItem
          label="Roles"
          value={(form.roles || [])
            .map((role) => labelOf(SYSTEM_ROLES, role))
            .join(', ')}
        />
        {form.roles?.length > 1 && (
          <ReviewItem label="Default Role" value={labelOf(SYSTEM_ROLES, form.system_role)} />
        )}
        <ReviewItem label="Employee Type" value={labelOf(EMPLOYMENT_TYPES, form.employment_type)} />
        <ReviewItem label="Department" value={dept} />
        <ReviewItem label="Designation" value={desig} />
        <ReviewItem label="Joining Date" value={form.date_of_joining} />
        <ReviewItem label="Work Location" value={branch ? `${branch.name}${branch.city ? ` — ${branch.city}` : ''}` : null} />
        <ReviewItem label="Reporting Manager" value={manager ? `${manager.first_name} ${manager.last_name}` : null} />
        <ReviewItem label="Work Mode" value={WORK_MODE_LABELS[form.work_mode] || 'Office (On-site)'} />
        {typeof form.has_probation === 'boolean' && (
          <ReviewItem label="Has Probation" value={form.has_probation ? 'Yes' : 'No'} />
        )}
        {form.has_probation === true && (
          <ReviewItem
            label="Probation Duration"
            value={`${form.probation_duration_months || 6} months`}
          />
        )}
        {form.has_probation === true && form.probation_policy_id && (
          <ReviewItem
            label="Probation Policy"
            value={
              probationPreview?.policy_name ||
              `Policy #${form.probation_policy_id}`
            }
          />
        )}
      </ReviewSection>

      {form.has_probation === false ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-center gap-1.5">
          <CalendarClock size={13} className="text-slate-400" />
          <p className="text-xs text-slate-400">
            Has Probation: <span className="font-medium text-slate-500">No</span> — employee will be created as <span className="font-medium text-slate-500">active</span>.
          </p>
        </div>
      ) : probationPreview ? (
        <div className="rounded-xl border border-brand-100 bg-brand-50/40 overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-50 border-b border-brand-100">
            <CalendarClock size={13} className="text-brand-600" />
            <h4 className="text-xs font-semibold text-brand-700">Probation</h4>
            <span className="ml-1 text-[10px] text-brand-400 font-medium">
              {probationPreview.selected ? 'selected policy' : 'auto-matched'}
            </span>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
            <ReviewItem label="Has Probation" value="Yes" />
            <ReviewItem label="Policy" value={probationPreview.policy_name} />
            <ReviewItem label="Duration" value={`${probationPreview.duration_months} months`} />
            <ReviewItem label="Start Date" value={fmtDate(probationPreview.probation_start_date)} />
            <ReviewItem label="End Date" value={fmtDate(probationPreview.probation_end_date)} />
          </div>
        </div>
      ) : form.has_probation === true ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 flex items-center gap-1.5">
          <CalendarClock size={13} className="text-amber-500" />
          <p className="text-xs text-amber-700">
            No probation policy available — create one under Probation Policies before saving.
          </p>
        </div>
      ) : null}

      <ReviewSection title="Salary Structure" onEdit={() => onGoToStep(3)} readOnly={readOnly}>
        {form.salary_structure?.skip_salary ? (
          <div className="sm:col-span-2">
            <ReviewItem label="Status" value="Skipped — assign later" />
          </div>
        ) : salaryTotals ? (
          <>
            <ReviewItem label="Basic (Monthly)" value={formatSalaryINR(form.salary_structure.earnings.basic)} />
            <ReviewItem label="DA (Monthly)" value={formatSalaryINR(form.salary_structure.earnings.da)} />
            <ReviewItem label="HRA (Monthly)" value={formatSalaryINR(form.salary_structure.earnings.hra)} />
            <ReviewItem label="Conveyance (Monthly)" value={formatSalaryINR(form.salary_structure.earnings.conveyance)} />
            <ReviewItem label="Medical (Monthly)" value={formatSalaryINR(form.salary_structure.earnings.medical_allowance)} />
            <ReviewItem label="Special (Monthly)" value={formatSalaryINR(form.salary_structure.earnings.special_allowance)} />
            <ReviewItem label="Gross Salary (A)" value={formatSalaryINR(salaryTotals.grossMonthly)} />
            <ReviewItem label="Total Deductions (B)" value={formatSalaryINR(salaryTotals.deductionsMonthly)} />
            <ReviewItem label="Net Salary (A − B)" value={formatSalaryINR(salaryTotals.netMonthly)} />
            <ReviewItem label="Additional Benefits (C)" value={formatSalaryINR(salaryTotals.employerMonthly)} />
            <ReviewItem label="CTC (A + C)" value={formatSalaryINR(salaryTotals.ctcMonthly)} />
            <ReviewItem label="CTC (Annual)" value={formatSalaryINR(salaryTotals.ctcYearly)} />
          </>
        ) : (
          <div className="sm:col-span-2"><ReviewItem label="Status" value="Not configured" /></div>
        )}
      </ReviewSection>

      <ReviewSection title="Government IDs & Bank Details" onEdit={() => onGoToStep(4)} readOnly={readOnly}>
        <ReviewItem label="PAN Number" value={form.pan_number} />
        <ReviewItem label="Aadhaar Number" value={form.aadhaar_number} />
        <ReviewItem label="UAN Number" value={form.pf_applicable ? form.uan_number : '—'} />
        <ReviewItem label="ESI Number" value={form.esi_applicable ? form.esic_number : '—'} />
        <ReviewItem label="Bank" value={form.bank_name} />
        <ReviewItem label="Account Number" value={form.account_number} />
        <ReviewItem label="IFSC" value={form.ifsc_code} />
        <ReviewItem label="PF Applicable" value={form.pf_applicable ? 'Yes' : 'No'} />
        <ReviewItem label="ESI Applicable" value={form.esi_applicable ? 'Yes' : 'No'} />
      </ReviewSection>

      <ReviewSection title="Document Uploads" onEdit={() => onGoToStep(5)} readOnly={readOnly}>
        <ReviewItem label="Files attached" value={`${uploadedCount} of ${EMPLOYEE_DOCUMENTS.length}`} />
        {EMPLOYEE_DOCUMENTS.map((doc) => {
          const uploaded = documents[doc.key];
          const existing = existingDocuments[doc.key];
          const label = uploaded?.name || existing?.file_name || 'Not uploaded';
          return (
            <ReviewItem
              key={doc.key}
              label={doc.label}
              value={
                existing?.file_url ? (
                  <a href={existing.file_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                    {label}
                  </a>
                ) : label
              }
            />
          );
        })}
      </ReviewSection>

      {contacts.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-4">
          <h4 className="text-xs font-semibold text-slate-700 mb-3">Emergency Contacts</h4>
          <div className="space-y-2">
            {contacts.map((c, i) => (
              <div key={i} className="text-sm text-slate-700 flex flex-wrap gap-x-2">
                <span className="font-medium">{c.contact_name}</span>
                <span className="text-slate-400">·</span>
                <span>{c.contact_phone}</span>
                {c.relationship && <span className="text-slate-400">({c.relationship})</span>}
                {c.is_primary && <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">Primary</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {form.notes?.trim() && (
        <div className="rounded-xl border border-slate-200 p-4">
          <h4 className="text-xs font-semibold text-slate-700 mb-2">Notes</h4>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{form.notes}</p>
        </div>
      )}
    </div>
  );
}
