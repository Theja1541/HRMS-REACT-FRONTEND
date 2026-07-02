export const INITIAL_SALARY_STRUCTURE = {
  earnings: {
    basic: '',
    da: '',
    hra: '',
    conveyance: '',
    medical_allowance: '',
    special_allowance: '',
  },
  deductions: {
    pf_employee: '',
    esic_employee: '',
    professional_tax: '',
    lwf: '',
    tds: '',
    medical_insurance: '',
  },
  employer: {
    pf_employer: '',
    esic_employer: '',
    gratuity: '',
  },
  skip_salary: false,
};

const EMPTY_STATUTORY = {
  pf_employee: 0,
  esic_employee: 0,
  professional_tax: 0,
  lwf: 0,
  pf_employer: 0,
  esic_employer: 0,
};

/** Accept legacy manual_deductions / company_benefits shape after partial reverts. */
export function normalizeWizardStructure(structure) {
  if (!structure) return { ...INITIAL_SALARY_STRUCTURE };

  if (structure.deductions && structure.employer) {
    return {
      skip_salary: !!structure.skip_salary,
      earnings: { ...INITIAL_SALARY_STRUCTURE.earnings, ...structure.earnings },
      deductions: { ...INITIAL_SALARY_STRUCTURE.deductions, ...structure.deductions },
      employer: { ...INITIAL_SALARY_STRUCTURE.employer, ...structure.employer },
    };
  }

  const md = structure.manual_deductions || {};
  const cb = structure.company_benefits || {};
  return {
    skip_salary: !!structure.skip_salary,
    earnings: { ...INITIAL_SALARY_STRUCTURE.earnings, ...structure.earnings },
    deductions: {
      ...INITIAL_SALARY_STRUCTURE.deductions,
      tds: md.tds ?? '',
      medical_insurance: md.medical_insurance ?? '',
    },
    employer: {
      ...INITIAL_SALARY_STRUCTURE.employer,
      gratuity: cb.gratuity ?? '',
    },
  };
}

export function stripLegacyStatutoryFromComponents(components) {
  if (!components) return components;
  const next = JSON.parse(JSON.stringify(components));
  if (next.deductions) {
    delete next.deductions.pf_employee;
    delete next.deductions.esic_employee;
    delete next.deductions.professional_tax;
    delete next.deductions.lwf;
  }
  if (next.employer) {
    delete next.employer.pf_employer;
    delete next.employer.esic_employer;
  }
  return next;
}

export function parseAmount(value) {
  const n = parseFloat(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function round2(n) {
  return Math.round(parseAmount(n) * 100) / 100;
}

export function formatSalaryINR(amount) {
  if (amount == null || Number.isNaN(amount)) return '₹ 0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(round2(amount)).replace('₹', '₹ ');
}

export function yearlyFromMonthly(monthly) {
  return round2(parseAmount(monthly) * 12);
}

export function sumFields(obj) {
  return round2(Object.values(obj || {}).reduce((sum, v) => sum + parseAmount(v), 0));
}

export function normalizeStatutoryEstimate(estimate) {
  if (!estimate) return { ...EMPTY_STATUTORY };
  return {
    pf_employee: round2(estimate.pf_employee),
    esic_employee: round2(estimate.esic_employee),
    professional_tax: round2(estimate.professional_tax),
    lwf: round2(estimate.lwf ?? estimate.lwf_amount),
    pf_employer: round2(estimate.pf_employer),
    esic_employer: round2(estimate.esic_employer),
  };
}

/**
 * Totals for salary wizard — all components from editable form fields (classic layout).
 */
export function computeSalaryTotals(structure) {
  const s = normalizeWizardStructure(structure);
  const grossMonthly = sumFields(s.earnings);
  const statutoryDeductionsMonthly = round2(
    parseAmount(s.deductions.pf_employee) +
      parseAmount(s.deductions.esic_employee) +
      parseAmount(s.deductions.professional_tax) +
      parseAmount(s.deductions.lwf)
  );
  const manualDeductionsMonthly = round2(
    parseAmount(s.deductions.tds) + parseAmount(s.deductions.medical_insurance)
  );
  const gratuityMonthly = parseAmount(s.employer.gratuity);
  const deductionsMonthly = round2(statutoryDeductionsMonthly + manualDeductionsMonthly);
  const netMonthly = round2(grossMonthly - deductionsMonthly);
  const employerStatutoryMonthly = round2(
    parseAmount(s.employer.pf_employer) + parseAmount(s.employer.esic_employer)
  );
  const employerMonthly = round2(employerStatutoryMonthly + gratuityMonthly);
  const ctcMonthly = round2(grossMonthly + employerMonthly);

  const statutory = {
    pf_employee: parseAmount(s.deductions.pf_employee),
    esic_employee: parseAmount(s.deductions.esic_employee),
    professional_tax: parseAmount(s.deductions.professional_tax),
    lwf: parseAmount(s.deductions.lwf),
    pf_employer: parseAmount(s.employer.pf_employer),
    esic_employer: parseAmount(s.employer.esic_employer),
  };

  return {
    grossMonthly,
    grossYearly: yearlyFromMonthly(grossMonthly),
    manualDeductionsMonthly,
    statutoryDeductionsMonthly,
    deductionsMonthly,
    deductionsYearly: yearlyFromMonthly(deductionsMonthly),
    netMonthly,
    netYearly: yearlyFromMonthly(netMonthly),
    employerStatutoryMonthly,
    gratuityMonthly,
    employerMonthly,
    employerYearly: yearlyFromMonthly(employerMonthly),
    ctcMonthly,
    ctcYearly: yearlyFromMonthly(ctcMonthly),
    statutory,
  };
}

export function mapSalaryRecordToStructure(salary) {
  if (!salary) return { ...INITIAL_SALARY_STRUCTURE, skip_salary: true };

  let other = salary.other_allowances || {};
  if (typeof other === 'string') {
    try {
      other = JSON.parse(other);
    } catch {
      other = {};
    }
  }

  const str = (v) => (v != null && v !== '' ? String(v) : '');

  return normalizeWizardStructure({
    skip_salary: false,
    earnings: {
      basic: str(salary.basic),
      da: str(other.da),
      hra: str(salary.hra),
      conveyance: str(salary.conveyance),
      medical_allowance: str(salary.medical_allowance),
      special_allowance: str(salary.special_allowance),
    },
    deductions: {
      pf_employee: str(salary.pf_employee),
      esic_employee: str(salary.esic_employee),
      professional_tax: str(salary.professional_tax),
      lwf: str(salary.lwf),
      tds: str(salary.tds_monthly),
      medical_insurance: str(other.medical_insurance),
    },
    employer: {
      pf_employer: str(salary.pf_employer),
      esic_employer: str(salary.esic_employer),
      gratuity: str(other.gratuity),
    },
  });
}

export function wizardStructureToComponents(structure) {
  const s = normalizeWizardStructure(structure);
  return {
    earnings: {
      basic: round2(s.earnings.basic),
      da: round2(s.earnings.da),
      hra: round2(s.earnings.hra),
      conveyance: round2(s.earnings.conveyance),
      medical_allowance: round2(s.earnings.medical_allowance),
      special_allowance: round2(s.earnings.special_allowance),
    },
    deductions: {
      pf_employee: round2(s.deductions.pf_employee),
      esic_employee: round2(s.deductions.esic_employee),
      professional_tax: round2(s.deductions.professional_tax),
      lwf: round2(s.deductions.lwf),
      tds: round2(s.deductions.tds),
      medical_insurance: round2(s.deductions.medical_insurance),
    },
    employer: {
      pf_employer: round2(s.employer.pf_employer),
      esic_employer: round2(s.employer.esic_employer),
      gratuity: round2(s.employer.gratuity),
    },
  };
}

export function componentsToWizardStructure(components) {
  if (!components) return { ...INITIAL_SALARY_STRUCTURE, skip_salary: false };

  const str = (v) => (v != null && v !== '' ? String(v) : '');

  return normalizeWizardStructure({
    skip_salary: false,
    earnings: {
      basic: str(components.earnings?.basic),
      da: str(components.earnings?.da),
      hra: str(components.earnings?.hra),
      conveyance: str(components.earnings?.conveyance),
      medical_allowance: str(components.earnings?.medical_allowance),
      special_allowance: str(components.earnings?.special_allowance),
    },
    deductions: {
      pf_employee: str(components.deductions?.pf_employee),
      esic_employee: str(components.deductions?.esic_employee),
      professional_tax: str(components.deductions?.professional_tax),
      lwf: str(components.deductions?.lwf),
      tds: str(components.deductions?.tds),
      medical_insurance: str(components.deductions?.medical_insurance),
    },
    employer: {
      pf_employer: str(components.employer?.pf_employer),
      esic_employer: str(components.employer?.esic_employer),
      gratuity: str(components.employer?.gratuity),
    },
  });
}

export function computeComponentsTotals(components) {
  return computeSalaryTotals(componentsToWizardStructure(components));
}

export function validateWizardStructure(structure) {
  const s = normalizeWizardStructure(structure);
  if (parseAmount(s.earnings?.basic) <= 0) {
    return 'Basic salary is required and must be greater than zero';
  }
  return null;
}

export function buildEarningsPayload(structure) {
  const e = normalizeWizardStructure(structure).earnings;
  return {
    basic: round2(e.basic),
    da: round2(e.da),
    hra: round2(e.hra),
    conveyance: round2(e.conveyance),
    medical_allowance: round2(e.medical_allowance),
    special_allowance: round2(e.special_allowance),
  };
}

export function buildStatutoryEstimatePayload(structure, { employeeId, compliancePreview } = {}) {
  const payload = {
    earnings: buildEarningsPayload(structure),
    paid_days: 30,
  };
  if (employeeId) payload.employee_id = parseInt(employeeId, 10);
  if (compliancePreview) {
    if (compliancePreview.pf_applicable !== undefined) {
      payload.pf_applicable = compliancePreview.pf_applicable;
    }
    if (compliancePreview.esi_applicable !== undefined) {
      payload.esi_applicable = compliancePreview.esi_applicable;
    }
    if (compliancePreview.branch_id) {
      payload.branch_id = parseInt(compliancePreview.branch_id, 10);
    }
    if (compliancePreview.pt_state_code) {
      payload.pt_state_code = compliancePreview.pt_state_code;
    }
  }
  return payload;
}

/**
 * Salary effective date for assign-structure API.
 * On edit, keep the current record's date (or DOJ if revision was accidentally after join in same month).
 */
export function resolveSalaryEffectiveFrom(form, currentSalary = null) {
  const doj = form.date_of_joining ? String(form.date_of_joining).slice(0, 10) : null;
  if (currentSalary?.effective_from) {
    const cur = String(currentSalary.effective_from).slice(0, 10);
    if (doj && cur > doj && cur.slice(0, 7) === doj.slice(0, 7)) {
      return doj;
    }
    return cur;
  }
  return doj || new Date().toISOString().slice(0, 10);
}

export function buildSalaryAssignPayload(employeeId, effectiveFrom, structure, revisionReason, salaryStructureId = null) {
  const s = normalizeWizardStructure(structure);
  return {
    employee_id: employeeId,
    effective_from: effectiveFrom,
    revision_reason: revisionReason || 'Salary structure assignment',
    salary_structure_id: salaryStructureId ? parseInt(salaryStructureId, 10) : null,
    earnings: buildEarningsPayload(s),
    deductions: {
      pf_employee: round2(s.deductions.pf_employee),
      esic_employee: round2(s.deductions.esic_employee),
      professional_tax: round2(s.deductions.professional_tax),
      lwf: round2(s.deductions.lwf),
      tds: round2(s.deductions.tds),
      medical_insurance: round2(s.deductions.medical_insurance),
    },
    employer: {
      pf_employer: round2(s.employer.pf_employer),
      esic_employer: round2(s.employer.esic_employer),
      gratuity: round2(s.employer.gratuity),
    },
  };
}
