/**
 * Predefined merge-field registry for document templates.
 * Keep in sync with Backend/src/constants/documentVariables.js
 */

export const DOCUMENT_VARIABLE_CATEGORIES = {
  employee: {
    key: 'employee',
    label: 'Employee',
    description: 'Subject employee profile and employment details',
  },
  company: {
    key: 'company',
    label: 'Company',
    description: 'Tenant / employer organization details',
  },
  salary: {
    key: 'salary',
    label: 'Salary',
    description: 'Current compensation and statutory identifiers',
  },
  manager: {
    key: 'manager',
    label: 'Manager',
    description: 'Reporting manager details',
  },
  date: {
    key: 'date',
    label: 'Date',
    description: 'Letter and employment date fields',
  },
};

/** @type {Array<{ key: string, label: string, category: string, description: string, example?: string }>} */
export const DOCUMENT_VARIABLES = [
  // Employee
  { key: 'employee_name', label: 'Full name', category: 'employee', description: 'Employee first + last name', example: 'Priya Sharma' },
  { key: 'employee_first_name', label: 'First name', category: 'employee', description: 'Employee first name', example: 'Priya' },
  { key: 'employee_last_name', label: 'Last name', category: 'employee', description: 'Employee last name', example: 'Sharma' },
  { key: 'employee_code', label: 'Employee code', category: 'employee', description: 'Unique employee ID / emp code', example: 'EMP-1042' },
  { key: 'employee_email', label: 'Work email', category: 'employee', description: 'Official work email', example: 'priya.sharma@acme.in' },
  { key: 'employee_phone', label: 'Phone', category: 'employee', description: 'Primary phone number', example: '+91 98765 43210' },
  { key: 'employee_designation', label: 'Designation', category: 'employee', description: 'Job title / designation', example: 'Senior Software Engineer' },
  { key: 'employee_department', label: 'Department', category: 'employee', description: 'Department name', example: 'Engineering' },
  { key: 'employee_branch', label: 'Branch', category: 'employee', description: 'Branch / location name', example: 'Hyderabad HQ' },
  { key: 'employee_employment_type', label: 'Employment type', category: 'employee', description: 'Full time, contract, intern, etc.', example: 'Full time' },
  { key: 'employee_address', label: 'Address', category: 'employee', description: 'Residential address (if available)', example: '12 MG Road, Bengaluru 560001' },
  { key: 'employee_pan', label: 'PAN', category: 'employee', description: 'Permanent Account Number', example: 'ABCDE1234F' },
  { key: 'employee_aadhaar', label: 'Aadhaar', category: 'employee', description: 'Aadhaar number (masked in display where required)', example: 'XXXX-XXXX-1234' },

  // Company
  { key: 'company_name', label: 'Company name', category: 'company', description: 'Trading / display name of the tenant', example: 'Acme Technologies' },
  { key: 'company_legal_name', label: 'Legal business name', category: 'company', description: 'Registered legal business name', example: 'Acme Technologies Private Limited' },
  { key: 'company_code', label: 'Company code', category: 'company', description: 'Internal company / tenant code', example: 'ACME' },
  { key: 'company_address', label: 'Company address', category: 'company', description: 'Registered office address', example: 'Plot 21, Hitech City, Hyderabad 500081' },
  { key: 'company_city', label: 'City', category: 'company', description: 'Company city', example: 'Hyderabad' },
  { key: 'company_state', label: 'State', category: 'company', description: 'Company state', example: 'Telangana' },
  { key: 'company_pincode', label: 'PIN code', category: 'company', description: 'Company PIN / ZIP', example: '500081' },
  { key: 'company_phone', label: 'Phone', category: 'company', description: 'Company contact phone', example: '+91 40 1234 5678' },
  { key: 'company_email', label: 'Email', category: 'company', description: 'Company contact email', example: 'hr@acme.in' },
  { key: 'company_website', label: 'Website', category: 'company', description: 'Company website URL', example: 'https://acme.in' },
  { key: 'company_gstin', label: 'GSTIN', category: 'company', description: 'GST identification number', example: '36AABCU9603R1ZM' },
  { key: 'company_pan', label: 'Company PAN', category: 'company', description: 'Company PAN', example: 'AABCU9603R' },
  {
    key: 'company_logo',
    label: 'Company logo',
    category: 'company',
    description: 'Inserts the company logo image (upload under Settings → Branding)',
    example: '[logo image]',
    is_html: true,
  },
  {
    key: 'hr_signature',
    label: 'HR signature',
    category: 'company',
    description: 'Inserts the HR / authorized signatory signature image',
    example: '[signature image]',
    is_html: true,
  },
  {
    key: 'company_seal',
    label: 'Company seal',
    category: 'company',
    description: 'Inserts the company seal / stamp image',
    example: '[seal image]',
    is_html: true,
  },
  {
    key: 'company_logo_url',
    label: 'Company logo URL',
    category: 'company',
    description: 'Raw URL for custom <img src="…"> markup',
    example: '/uploads/tenant-logos/1/logo.png',
  },
  {
    key: 'hr_signature_url',
    label: 'HR signature URL',
    category: 'company',
    description: 'Raw URL for the HR signature image',
    example: '/uploads/tenant-logos/1/signature.png',
  },
  {
    key: 'company_seal_url',
    label: 'Company seal URL',
    category: 'company',
    description: 'Raw URL for the company seal image',
    example: '/uploads/tenant-logos/1/seal.png',
  },

  // Salary
  { key: 'salary_ctc_annual', label: 'CTC (annual)', category: 'salary', description: 'Annual cost to company', example: '₹12,00,000' },
  { key: 'salary_ctc_monthly', label: 'CTC (monthly)', category: 'salary', description: 'Monthly CTC', example: '₹1,00,000' },
  { key: 'salary_basic', label: 'Basic', category: 'salary', description: 'Monthly basic pay', example: '₹40,000' },
  { key: 'salary_hra', label: 'HRA', category: 'salary', description: 'House rent allowance', example: '₹16,000' },
  { key: 'salary_gross_monthly', label: 'Gross (monthly)', category: 'salary', description: 'Estimated monthly gross earnings', example: '₹85,000' },
  { key: 'salary_currency', label: 'Currency', category: 'salary', description: 'Pay currency symbol or code', example: 'INR' },
  { key: 'salary_effective_from', label: 'Salary effective from', category: 'salary', description: 'Date current salary became effective', example: '01 Apr 2026' },
  { key: 'employee_uan', label: 'UAN', category: 'salary', description: 'EPFO Universal Account Number', example: '100123456789' },
  { key: 'employee_pf_number', label: 'PF number', category: 'salary', description: 'Provident fund member ID', example: 'TS/HYD/1234567/000/1234567' },
  { key: 'employee_esi_number', label: 'ESI number', category: 'salary', description: 'ESIC insurance number', example: '1234567890' },
  { key: 'employee_bank_name', label: 'Bank name', category: 'salary', description: 'Salary bank name', example: 'HDFC Bank' },
  { key: 'employee_bank_account', label: 'Bank account', category: 'salary', description: 'Salary account number (masked where required)', example: 'XXXXXX7890' },
  { key: 'employee_bank_ifsc', label: 'IFSC', category: 'salary', description: 'Bank IFSC code', example: 'HDFC0001234' },

  // Manager
  { key: 'manager_name', label: 'Manager name', category: 'manager', description: 'Reporting manager full name', example: 'Rahul Mehta' },
  { key: 'manager_first_name', label: 'Manager first name', category: 'manager', description: 'Reporting manager first name', example: 'Rahul' },
  { key: 'manager_last_name', label: 'Manager last name', category: 'manager', description: 'Reporting manager last name', example: 'Mehta' },
  { key: 'manager_code', label: 'Manager employee code', category: 'manager', description: 'Reporting manager emp code', example: 'EMP-0201' },
  { key: 'manager_email', label: 'Manager email', category: 'manager', description: 'Reporting manager work email', example: 'rahul.mehta@acme.in' },
  { key: 'manager_designation', label: 'Manager designation', category: 'manager', description: 'Reporting manager job title', example: 'Engineering Manager' },
  { key: 'manager_department', label: 'Manager department', category: 'manager', description: 'Reporting manager department', example: 'Engineering' },

  // Date
  { key: 'letter_date', label: 'Letter date', category: 'date', description: 'Date printed on the document', example: '17 Jul 2026' },
  { key: 'today_date', label: 'Today', category: 'date', description: 'Current date when the document is generated', example: '17 Jul 2026' },
  { key: 'date_of_joining', label: 'Date of joining', category: 'date', description: 'Employee joining date', example: '15 Jan 2024' },
  { key: 'joining_date', label: 'Joining date', category: 'date', description: 'Alias for date of joining — same value as date_of_joining', example: '15 Jan 2024' },
  { key: 'confirmation_date', label: 'Confirmation date', category: 'date', description: 'Probation confirmation date', example: '15 Jul 2024' },
  { key: 'exit_date', label: 'Exit / last working day', category: 'date', description: 'Separation or last working day', example: '31 Aug 2026' },
  { key: 'offer_date', label: 'Offer date', category: 'date', description: 'Offer letter issue date', example: '01 Mar 2024' },
  { key: 'increment_effective_date', label: 'Increment effective date', category: 'date', description: 'Date salary increment takes effect', example: '01 Apr 2026' },
  { key: 'current_year', label: 'Current year', category: 'date', description: 'Four-digit calendar year', example: '2026' },
  { key: 'current_month', label: 'Current month', category: 'date', description: 'Full month name', example: 'July' },
];

export function toPlaceholder(key) {
  return `{{${key}}}`;
}

export function getVariablesByCategory(categoryKey) {
  return DOCUMENT_VARIABLES.filter((v) => v.category === categoryKey);
}

export function getVariableByKey(key) {
  return DOCUMENT_VARIABLES.find((v) => v.key === key) || null;
}

export function listDocumentVariableRegistry() {
  return Object.values(DOCUMENT_VARIABLE_CATEGORIES).map((category) => ({
    ...category,
    variables: getVariablesByCategory(category.key).map((variable) => ({
      ...variable,
      placeholder: toPlaceholder(variable.key),
    })),
  }));
}

export const DOCUMENT_VARIABLE_KEYS = DOCUMENT_VARIABLES.map((v) => v.key);
