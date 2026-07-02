export const INDUSTRY_TYPES = [
  'Information Technology',
  'Manufacturing',
  'Healthcare',
  'Education',
  'Retail',
  'Finance & Banking',
  'Real Estate',
  'Hospitality',
  'Logistics',
  'Consulting',
  'Other',
];

export const COMPANY_SIZES = [
  { value: '1-10', label: '1–10 employees' },
  { value: '11-50', label: '11–50 employees' },
  { value: '51-200', label: '51–200 employees' },
  { value: '201-500', label: '201–500 employees' },
  { value: '500+', label: '500+ employees' },
];

export const TENANT_STATUSES = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];

export const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

/** Indian states with GST state codes (for billing / GST registration). */
export const INDIAN_STATES_WITH_CODES = [
  { name: 'Jammu and Kashmir', code: '01' },
  { name: 'Himachal Pradesh', code: '02' },
  { name: 'Punjab', code: '03' },
  { name: 'Chandigarh', code: '04' },
  { name: 'Uttarakhand', code: '05' },
  { name: 'Haryana', code: '06' },
  { name: 'Delhi', code: '07' },
  { name: 'Rajasthan', code: '08' },
  { name: 'Uttar Pradesh', code: '09' },
  { name: 'Bihar', code: '10' },
  { name: 'Sikkim', code: '11' },
  { name: 'Arunachal Pradesh', code: '12' },
  { name: 'Nagaland', code: '13' },
  { name: 'Manipur', code: '14' },
  { name: 'Mizoram', code: '15' },
  { name: 'Tripura', code: '16' },
  { name: 'Meghalaya', code: '17' },
  { name: 'Assam', code: '18' },
  { name: 'West Bengal', code: '19' },
  { name: 'Jharkhand', code: '20' },
  { name: 'Odisha', code: '21' },
  { name: 'Chhattisgarh', code: '22' },
  { name: 'Madhya Pradesh', code: '23' },
  { name: 'Gujarat', code: '24' },
  { name: 'Maharashtra', code: '27' },
  { name: 'Karnataka', code: '29' },
  { name: 'Goa', code: '30' },
  { name: 'Kerala', code: '32' },
  { name: 'Tamil Nadu', code: '33' },
  { name: 'Puducherry', code: '34' },
  { name: 'Telangana', code: '36' },
  { name: 'Andhra Pradesh', code: '37' },
  { name: 'Ladakh', code: '38' },
];

export const INDIAN_STATES = INDIAN_STATES_WITH_CODES.map((s) => s.name);

export function getStateCode(stateName) {
  return INDIAN_STATES_WITH_CODES.find((s) => s.name === stateName)?.code || '';
}

export function emptyTenantForm() {
  return {
    name: '',
    company_code: '',
    slug: '',
    legal_business_name: '',
    industry: '',
    company_size: '',
    registration_number: '',
    gstin: '',
    gst_state: '',
    gst_state_code: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_name: '',
    bank_branch: '',
    pan: '',
    logo_url: '',
    website_url: '',
    description: '',
    email: '',
    phone: '',
    alternate_phone: '',
    support_email: '',
    hr_email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    head_office_name: '',
    regional_offices: [],
    branches: [],
    admin: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      username: '',
    },
    subscription_plan_id: '',
    subscription_start_date: new Date().toISOString().slice(0, 10),
    billing_cycle: 'yearly',
    employee_limit: '',
    monthly_cost: '',
    status: 'trial',
  };
}

export function emptyBranchRow() {
  return { name: '', address: '', city: '', state: '', pincode: '' };
}

function formatDateField(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export function tenantToForm(tenant) {
  if (!tenant) return emptyTenantForm();
  return {
    ...emptyTenantForm(),
    name: tenant.name || '',
    company_code: tenant.company_code || '',
    slug: tenant.slug || '',
    legal_business_name: tenant.legal_business_name || '',
    industry: tenant.industry || '',
    company_size: tenant.company_size || '',
    registration_number: tenant.registration_number || '',
    gstin: tenant.gstin || '',
    gst_state: tenant.gst_state || '',
    gst_state_code: tenant.gst_state_code || getStateCode(tenant.gst_state) || '',
    bank_account_number: tenant.bank_account_number || '',
    bank_ifsc_code: tenant.bank_ifsc_code || '',
    bank_name: tenant.bank_name || '',
    bank_branch: tenant.bank_branch || '',
    pan: tenant.pan || '',
    logo_url: tenant.logo_url || '',
    website_url: tenant.website_url || '',
    description: tenant.description || '',
    email: tenant.email || '',
    phone: tenant.phone || '',
    alternate_phone: tenant.alternate_phone || '',
    support_email: tenant.support_email || '',
    hr_email: tenant.hr_email || '',
    address_line1: tenant.address_line1 || '',
    address_line2: tenant.address_line2 || '',
    city: tenant.city || '',
    state: tenant.state || '',
    country: tenant.country || 'India',
    pincode: tenant.pincode || '',
    subscription_plan_id: tenant.subscription_plan_id ? String(tenant.subscription_plan_id) : '',
    subscription_start_date: formatDateField(tenant.subscription_start_date),
    billing_cycle: tenant.billing_cycle || 'yearly',
    employee_limit: tenant.employee_limit != null ? String(tenant.employee_limit) : '',
    monthly_cost: tenant.monthly_cost != null ? String(tenant.monthly_cost) : '',
    status: tenant.status || 'trial',
    admin: tenant.admin
      ? {
          first_name: tenant.admin.first_name || '',
          last_name: tenant.admin.last_name || '',
          email: tenant.admin.email || '',
          phone: tenant.admin.phone || '',
          username: tenant.admin.custom_fields?.portal_username || '',
        }
      : emptyTenantForm().admin,
  };
}
