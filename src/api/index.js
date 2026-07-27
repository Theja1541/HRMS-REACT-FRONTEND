import api from './client';

export const authApi = {
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  refresh: () => api.post('/auth/refresh').then((r) => r.data),
  me: (accessToken) =>
    api
      .get('/auth/me', accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined)
      .then((r) => r.data),
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload).then((r) => r.data),
  resetPassword: (payload) => api.post('/auth/reset-password', payload).then((r) => r.data),
  validateResetToken: (token) =>
    api.get('/auth/reset-password/validate', { params: { token } }).then((r) => r.data),
  listWorkspaces: () => api.get('/auth/workspaces').then((r) => r.data),
  activateWorkspace: (workspaceId) =>
    api.post('/auth/activate-workspace', { workspaceId }).then((r) => r.data),
  verifyMfa: (payload, tempToken) =>
    api.post('/auth/mfa/verify', payload, { headers: { Authorization: `Bearer ${tempToken}` } }).then((r) => r.data),
  resendMfa: (tempToken) =>
    api.post('/auth/mfa/resend', {}, { headers: { Authorization: `Bearer ${tempToken}` } }).then((r) => r.data),
  enableMfa: (payload) => api.post('/auth/mfa/enable', payload).then((r) => r.data),
  disableMfa: (payload) => api.post('/auth/mfa/disable', payload).then((r) => r.data),
};

export const careersApi = {
  listOpenings: (tenantSlug) => api.get(`/careers/${tenantSlug}/openings`).then((r) => r.data),
  apply: (tenantSlug, openingId, formData) =>
    api
      .post(`/careers/${tenantSlug}/openings/${openingId}/apply`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
};

export const tenantApi = {
  list: (params) => api.get('/tenants', { params }).then((r) => r.data),
  get: (id) => api.get(`/tenants/${id}`).then((r) => r.data),
  create: (payload) => api.post('/tenants', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/tenants/${id}`, payload).then((r) => r.data),
  delete: (id) => api.delete(`/tenants/${id}`).then((r) => r.data),
  resolve: (slug) => api.get(`/tenants/resolve/${slug}`).then((r) => r.data),
  uploadLogo: (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/tenants/upload-logo', formData).then((r) => r.data);
  },
  resendAdminCredentials: (id) =>
    api.post(`/tenants/${id}/resend-admin-credentials`).then((r) => r.data),
};

export const employeeApi = {
  list: (params) => api.get('/employees', { params }).then((r) => r.data),
  get: (id) => api.get(`/employees/${id}`).then((r) => r.data),
  getSelf: () => api.get('/employees/me').then((r) => r.data),
  getMyFnfSettlement: () => api.get('/employees/me/fnf-settlement').then((r) => r.data),
  listMyKtPlans: () => api.get('/employees/me/kt-plans').then((r) => r.data),
  listMyExitInterviews: () => api.get('/employees/me/exit-interviews').then((r) => r.data),
  updateSelf: (payload) => api.put('/employees/me', payload).then((r) => r.data),
  create: (payload) => api.post('/employees', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/employees/${id}`, payload).then((r) => r.data),
  deactivate: (id) => api.patch(`/employees/${id}/deactivate`).then((r) => r.data),
  reactivate: (id) => api.patch(`/employees/${id}/reactivate`).then((r) => r.data),
  delete: (id) => api.delete(`/employees/${id}`).then((r) => r.data),
  listArchived: (params) => api.get('/employees/archive', { params }).then((r) => r.data),
  getArchiveStats: () => api.get('/employees/archive/stats').then((r) => r.data),
  getArchived: (id) => api.get(`/employees/archive/${id}`).then((r) => r.data),
  archive: (id, payload) => api.post(`/employees/${id}/archive`, payload || {}).then((r) => r.data),
  rehire: (id, payload) => api.post(`/employees/${id}/rehire`, payload).then((r) => r.data),
  restore: (id, payload) => api.post(`/employees/${id}/restore`, payload).then((r) => r.data),
  updateArchiveEligibility: (id, payload) =>
    api.patch(`/employees/archive/${id}/eligibility`, payload).then((r) => r.data),
  resendWelcome: (id) => api.post(`/employees/${id}/resend-welcome`).then((r) => r.data),
  listDocuments: (id) => api.get(`/employees/${id}/documents`).then((r) => r.data),
  previewOfferLetter: (id, params) =>
    api
      .get(`/employees/${id}/offer-letter/preview`, { params, responseType: 'blob' })
      .then((r) => r.data),
  listOfferLetterTemplates: (id) =>
    api.get(`/employees/${id}/offer-letter/templates`).then((r) => r.data),
  previewOfferLetterHtml: (id, params) =>
    api.get(`/employees/${id}/offer-letter/preview-html`, { params }).then((r) => r.data),
  downloadOfferLetter: (id, params) =>
    api
      .get(`/employees/${id}/offer-letter/download`, { params, responseType: 'blob' })
      .then((r) => r.data),
  previewExperienceLetter: (id, params) =>
    api
      .get(`/employees/${id}/experience-letter/preview`, { params, responseType: 'blob' })
      .then((r) => r.data),
  listExperienceLetterTemplates: (id) =>
    api.get(`/employees/${id}/experience-letter/templates`).then((r) => r.data),
  previewExperienceLetterHtml: (id, params) =>
    api.get(`/employees/${id}/experience-letter/preview-html`, { params }).then((r) => r.data),
  downloadExperienceLetter: (id, params) =>
    api
      .get(`/employees/${id}/experience-letter/download`, { params, responseType: 'blob' })
      .then((r) => r.data),
  uploadDocument: (id, file, documentType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    return api.post(`/employees/${id}/documents`, formData).then((r) => r.data);
  },
  getAuditLogs: (id, params) => api.get(`/employees/${id}/audit-logs`, { params }).then((r) => r.data),
  listMyEditRequests: (params) => api.get('/employees/me/edit-requests', { params }).then((r) => r.data),
  confirmProbation: (id, payload) => api.post(`/employees/${id}/confirm-probation`, payload).then((r) => r.data),
  extendProbation: (id, payload) => api.post(`/employees/${id}/extend-probation`, payload).then((r) => r.data),
  probationUnsuccessful: (id, payload) => api.post(`/employees/${id}/probation-unsuccessful`, payload).then((r) => r.data),
};

export const branchApi = {
  list: (params) => api.get('/branches', { params }).then((r) => r.data),
  create: (payload) => api.post('/branches', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/branches/${id}`, payload).then((r) => r.data),
  delete: (id) => api.delete(`/branches/${id}`).then((r) => r.data),
};

export const departmentApi = {
  list: (params) => api.get('/departments', { params }).then((r) => r.data),
  create: (payload) => api.post('/departments', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/departments/${id}`, payload).then((r) => r.data),
  delete: (id) => api.delete(`/departments/${id}`).then((r) => r.data),
};

export const assetCategoryApi = {
  list: (params) => api.get('/asset-categories', { params }).then((r) => r.data),
  create: (payload) => api.post('/asset-categories', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/asset-categories/${id}`, payload).then((r) => r.data),
  delete: (id) => api.delete(`/asset-categories/${id}`).then((r) => r.data),
};

export const designationApi = {
  list: (params) => api.get('/designations', { params }).then((r) => r.data),
  create: (payload) => api.post('/designations', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/designations/${id}`, payload).then((r) => r.data),
  delete: (id) => api.delete(`/designations/${id}`).then((r) => r.data),
};

export const attendanceApi = {
  list: (params) => api.get('/attendance', { params }).then((r) => r.data),
  daily: (params) => api.get('/attendance/daily', { params }).then((r) => r.data),
  register: (params) => api.get('/attendance/register', { params }).then((r) => r.data),
  mark: (payload) => api.post('/attendance/mark', payload).then((r) => r.data),
  revokeWfh: (payload) => api.post('/attendance/revoke-wfh', payload).then((r) => r.data),
  bulkMark: (payload) => api.post('/attendance/bulk', payload).then((r) => r.data),
  checkIn: () => api.post('/attendance/check-in').then((r) => r.data),
  checkOut: () => api.post('/attendance/check-out').then((r) => r.data),
  getFinalization: (params) => api.get('/attendance/finalization', { params }).then((r) => r.data),
  finalize: (payload) => api.post('/attendance/finalize', payload).then((r) => r.data),
  unfinalize: (payload) => api.post('/attendance/unfinalize', payload).then((r) => r.data),
};

export const attendancePolicyApi = {
  list: (params) => api.get('/attendance-policies', { params }).then((r) => r.data),
  get: (id) => api.get(`/attendance-policies/${id}`).then((r) => r.data),
  create: (payload) => api.post('/attendance-policies', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/attendance-policies/${id}`, payload).then((r) => r.data),
  delete: (id) => api.delete(`/attendance-policies/${id}`).then((r) => r.data),
  setDefault: (id) => api.post(`/attendance-policies/${id}/set-default`).then((r) => r.data),
};

export const shiftApi = {
  listShifts: (params) => api.get('/shifts', { params }).then((r) => r.data),
  createShift: (payload) => api.post('/shifts', payload).then((r) => r.data),
  updateShift: (id, payload) => api.put(`/shifts/${id}`, payload).then((r) => r.data),
  deleteShift: (id) => api.delete(`/shifts/${id}`).then((r) => r.data),
  roster: (params) => api.get('/shift-roster', { params }).then((r) => r.data),
  saveRosterEntry: (payload) => api.post('/shift-roster', payload).then((r) => r.data),
  bulkRoster: (payload) => api.post('/shift-roster/bulk', payload).then((r) => r.data),
  applyRotation: (payload) => api.post('/shift-roster/rotate', payload).then((r) => r.data),
};

export const leaveApi = {
  listRequests: (params) => api.get('/leave/requests', { params }).then((r) => r.data),
  myRequests: (params) => api.get('/leave-requests/my', { params }).then((r) => r.data),
  teamRequests: (params) => api.get('/leave-requests/team', { params }).then((r) => r.data),
  approvalQueue: (params) => api.get('/leave-requests/approvals', { params }).then((r) => r.data),
  getRequest: (id) => api.get(`/leave-requests/${id}`).then((r) => r.data),
  getBalances: (params) => api.get('/leave/balances', { params }).then((r) => r.data),
  getBalanceBreakdown: (employeeId, leaveTypeId, params) =>
    api.get(`/leave-balances/${employeeId}/${leaveTypeId}/breakdown`, { params }).then((r) => r.data),
  getEligibleTypes: (params) => api.get('/leave/eligible-types', { params }).then((r) => r.data),
  previewDays: (payload) => api.post('/leave/preview-days', payload).then((r) => r.data),
  apply: (payload, file) => {
    if (file) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, typeof value === 'boolean' ? String(value) : value);
        }
      });
      formData.append('attachment', file);
      return api.post('/leave/apply', formData).then((r) => r.data);
    }
    return api.post('/leave/apply', payload).then((r) => r.data);
  },
  approve: (id) => api.post(`/leave/requests/${id}/approve`).then((r) => r.data),
  reject: (id, payload) => api.post(`/leave/requests/${id}/reject`, payload).then((r) => r.data),
  cancel: (id, payload) => api.post(`/leave/requests/${id}/cancel`, payload).then((r) => r.data),
};

export const compOffApi = {
  apply: (payload) => api.post('/comp-off-requests', payload).then((r) => r.data),
  myRequests: (params) => api.get('/comp-off-requests/my', { params }).then((r) => r.data),
  teamRequests: (params) => api.get('/comp-off-requests/team', { params }).then((r) => r.data),
  approvalQueue: (params) => api.get('/comp-off-requests/approvals', { params }).then((r) => r.data),
  approve: (id, payload) => api.put(`/comp-off-requests/${id}/approve`, payload).then((r) => r.data),
  reject: (id, payload) => api.put(`/comp-off-requests/${id}/reject`, payload).then((r) => r.data),
};

export const leaveEncashmentApi = {
  getEligible: (params) => api.get('/leave-encashment-requests/eligible', { params }).then((r) => r.data),
  preview: (payload) => api.post('/leave-encashment-requests/preview', payload).then((r) => r.data),
  apply: (payload) => api.post('/leave-encashment-requests', payload).then((r) => r.data),
  myRequests: (params) => api.get('/leave-encashment-requests/my', { params }).then((r) => r.data),
  approvalQueue: (params) => api.get('/leave-encashment-requests/approvals', { params }).then((r) => r.data),
  approve: (id) => api.put(`/leave-encashment-requests/${id}/approve`).then((r) => r.data),
  reject: (id, payload) => api.put(`/leave-encashment-requests/${id}/reject`, payload).then((r) => r.data),
};

export const resignationApi = {
  submit: (payload) => api.post('/resignations', payload).then((r) => r.data),
  myRequests: (params) => api.get('/resignations/my', { params }).then((r) => r.data),
  list: (params) => api.get('/resignations', { params }).then((r) => r.data),
  managerQueue: (params) => api.get('/resignations/approvals/manager', { params }).then((r) => r.data),
  hrQueue: (params) => api.get('/resignations/approvals/hr', { params }).then((r) => r.data),
  get: (id) => api.get(`/resignations/${id}`).then((r) => r.data),
  getHistory: (id) => api.get(`/resignations/${id}/history`).then((r) => r.data),
  withdraw: (id, payload) => api.put(`/resignations/${id}/withdraw`, payload).then((r) => r.data),
  managerApprove: (id, payload) => api.put(`/resignations/${id}/manager/approve`, payload).then((r) => r.data),
  managerReject: (id, payload) => api.put(`/resignations/${id}/manager/reject`, payload).then((r) => r.data),
  hrApprove: (id, payload) => api.put(`/resignations/${id}/hr/approve`, payload).then((r) => r.data),
  hrReject: (id, payload) => api.put(`/resignations/${id}/hr/reject`, payload).then((r) => r.data),
  previewLwd: (params) => api.get('/resignations/lwd-preview', { params }).then((r) => r.data),
  getResignationClearance: (id) => api.get(`/resignations/${id}/clearance`).then((r) => r.data),
  getResignationFnf: (id) => api.get(`/resignations/${id}/fnf`).then((r) => r.data),
  getResignationKt: (id) => api.get(`/resignations/${id}/kt`).then((r) => r.data),
  getMyRelievingLetter: (id) => api.get(`/resignations/${id}/relieving-letter`).then((r) => r.data),
  downloadMyRelievingLetter: (id) =>
    api.get(`/resignations/${id}/relieving-letter/download`, { responseType: 'blob' }),
  getMyExperienceLetter: (id) => api.get(`/resignations/${id}/experience-letter`).then((r) => r.data),
  downloadMyExperienceLetter: (id) =>
    api.get(`/resignations/${id}/experience-letter/download`, { responseType: 'blob' }),
};

export const noticePeriodPolicyApi = {
  list: (params) => api.get('/hr/notice-period-policies', { params }).then((r) => r.data),
  create: (payload) => api.post('/hr/notice-period-policies', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/hr/notice-period-policies/${id}`, payload).then((r) => r.data),
  deactivate: (id) => api.delete(`/hr/notice-period-policies/${id}`).then((r) => r.data),
  assign: (id, payload) => api.post(`/hr/notice-period-policies/${id}/assign`, payload).then((r) => r.data),
  removeAssignment: (policyId, assignmentId) =>
    api.delete(`/hr/notice-period-policies/${policyId}/assignments/${assignmentId}`).then((r) => r.data),
};

export const probationPolicyApi = {
  list: (params) => api.get('/hr/probation-policies', { params }).then((r) => r.data),
  get: (id) => api.get(`/hr/probation-policies/${id}`).then((r) => r.data),
  create: (payload) => api.post('/hr/probation-policies', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/hr/probation-policies/${id}`, payload).then((r) => r.data),
  deactivate: (id) => api.delete(`/hr/probation-policies/${id}`).then((r) => r.data),
  assign: (id, payload) => api.post(`/hr/probation-policies/${id}/assign`, payload).then((r) => r.data),
  removeAssignment: (policyId, assignmentId) =>
    api.delete(`/hr/probation-policies/${policyId}/assignments/${assignmentId}`).then((r) => r.data),
};

export const leaveSettingsApi = {
  listTypes: (params) => api.get('/admin/leave-types', { params }).then((r) => r.data),
  createType: (payload) => api.post('/admin/leave-types', payload).then((r) => r.data),
  updateType: (id, payload) => api.put(`/admin/leave-types/${id}`, payload).then((r) => r.data),
  deactivateType: (id) => api.delete(`/admin/leave-types/${id}`).then((r) => r.data),
  listPolicies: (params) => api.get('/admin/leave-policies', { params }).then((r) => r.data),
  createPolicy: (payload) => api.post('/admin/leave-policies', payload).then((r) => r.data),
  updatePolicy: (id, payload) => api.put(`/admin/leave-policies/${id}`, payload).then((r) => r.data),
  deactivatePolicy: (id) => api.delete(`/admin/leave-policies/${id}`).then((r) => r.data),
  assignPolicy: (id, payload) => api.post(`/admin/leave-policies/${id}/assign`, payload).then((r) => r.data),
  removeAssignment: (policyId, assignmentId) =>
    api.delete(`/admin/leave-policies/${policyId}/assignments/${assignmentId}`).then((r) => r.data),
  recalculateBalances: (payload) => api.post('/admin/leave-balances/recalculate', payload).then((r) => r.data),
};

export const holidayApi = {
  list: (params) => api.get('/holidays', { params }).then((r) => r.data),
  create: (payload) => api.post('/holidays', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/holidays/${id}`, payload).then((r) => r.data),
  bulkCreate: (payload) => api.post('/holidays/bulk', payload).then((r) => r.data),
  delete: (id) => api.delete(`/holidays/${id}`).then((r) => r.data),
};

export const dashboardApi = {
  get: (params) => api.get('/dashboard', { params }).then((r) => r.data),
  getPortalSummary: () => api.get('/dashboard/summary').then((r) => r.data),
};

export const portalApi = {
  getSummary: () => api.get('/dashboard/summary').then((r) => r.data),
  listDirectory: (params) => api.get('/directory', { params }).then((r) => r.data),
  getDirectoryProfile: (id) => api.get(`/directory/${id}`).then((r) => r.data),
  getOrgChart: (params) => api.get('/org-chart', { params }).then((r) => r.data),
  listPolicyDocuments: (params) => api.get('/policy-documents', { params }).then((r) => r.data),
  listPendingPolicies: () => api.get('/policy-documents/pending-ack').then((r) => r.data),
  acknowledgePolicy: (id) => api.post(`/policy-documents/${id}/acknowledge`).then((r) => r.data),
  listMyReimbursements: (params) => api.get('/reimbursements/my', { params }).then((r) => r.data),
  submitReimbursement: (formData) =>
    api.post('/reimbursements', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  listMyAssets: () => api.get('/assets/my').then((r) => r.data),
  requestAssetReturn: (id, formData) =>
    api
      .post(`/assets/${id}/return-request`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
  uploadMyAssetReturnPhotos: (id, formData) =>
    api
      .post(`/assets/return-requests/${id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
  listJobOpenings: () => api.get('/job-openings').then((r) => r.data),
  listReferralOpenings: () => api.get('/job-openings/referral-eligible').then((r) => r.data),
  applyToJobOpening: (id, payload) => api.post(`/job-openings/${id}/apply`, payload).then((r) => r.data),
  referToJobOpening: (id, formData) =>
    api.post(`/job-openings/${id}/refer`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  listMyJobApplications: () => api.get('/job-applications/my').then((r) => r.data),
  listMyJobReferrals: () => api.get('/job-referrals/my').then((r) => r.data),
  getNotificationPreferences: () => api.get('/notifications/preferences').then((r) => r.data),
  updateNotificationPreferences: (payload) =>
    api.put('/notifications/preferences', payload).then((r) => r.data),
  getTaxDeclaration: (params) => api.get('/tax-declaration', { params }).then((r) => r.data),
  saveTaxDeclaration: (payload) => api.put('/tax-declaration', payload).then((r) => r.data),
  listMyForm16: () => api.get('/form16').then((r) => r.data),
  downloadForm16: (id) =>
    api.get(`/form16/${id}/download`, { responseType: 'blob' }).then((r) => r.data),
  listMyPayslips: (params) => api.get('/payslips/my', { params }).then((r) => r.data),
  getMyPayslip: (id) => api.get(`/payslips/${id}`).then((r) => r.data),
  downloadMyPayslipPdf: (id) =>
    api.get(`/payslips/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data),
  listSubscriptionPlans: () => api.get('/subscription/plans').then((r) => r.data),
  listSubscriptionRequests: (params) =>
    api.get('/subscription-requests', { params }).then((r) => r.data),
  createSubscriptionRequest: (payload) =>
    api.post('/subscription-requests', payload).then((r) => r.data),
};

export const payrollApi = {
  listSalaries: (params) => api.get('/payroll/salaries', { params }).then((r) => r.data),
  assignSalary: (payload) => api.post('/payroll/salaries/assign', payload).then((r) => r.data),
  assignSalaryStructure: (payload) => api.post('/payroll/salaries/assign-structure', payload).then((r) => r.data),
  salaryHistory: (employeeId) => api.get(`/payroll/salaries/history/${employeeId}`).then((r) => r.data),
  listStructures: (params) => api.get('/payroll/structures', { params }).then((r) => r.data),
  getStructure: (id) => api.get(`/payroll/structures/${id}`).then((r) => r.data),
  createStructure: (payload) => api.post('/payroll/structures', payload).then((r) => r.data),
  updateStructure: (id, payload) => api.put(`/payroll/structures/${id}`, payload).then((r) => r.data),
  deleteStructure: (id) => api.delete(`/payroll/structures/${id}`).then((r) => r.data),
  listRuns: (params) => api.get('/payroll/runs', { params }).then((r) => r.data),
  getRun: (id) => api.get(`/payroll/runs/${id}`).then((r) => r.data),
  getRunLineItems: (id) => api.get(`/payroll/runs/${id}/line-items`).then((r) => r.data),
  processRun: (payload) => api.post('/payroll/runs/process', payload).then((r) => r.data),
  precheckRun: (params) => api.get('/payroll/runs/precheck', { params }).then((r) => r.data),
  approveRun: (id) => api.post(`/payroll/runs/${id}/approve`).then((r) => r.data),
  lockRun: (id, payload) => api.post(`/payroll/runs/${id}/lock`, payload).then((r) => r.data),
  syncDayBookRun: (id) => api.post(`/payroll/runs/${id}/sync-daybook`).then((r) => r.data),
  unlockRun: (id, payload) => api.post(`/payroll/runs/${id}/unlock`, payload).then((r) => r.data),
  listPayslips: (params) => api.get('/payroll/payslips', { params }).then((r) => r.data),
  getPayslip: (id) => api.get(`/payroll/payslips/${id}`).then((r) => r.data),
  uploadPayslipPdf: (id, blob, filename) => {
    const formData = new FormData();
    const name = filename || `payslip_${id}.pdf`;
    const file = blob instanceof File ? blob : new File([blob], name, { type: 'application/pdf' });
    formData.append('pdf', file, name);
    return api.post(`/payroll/payslips/${id}/pdf`, formData).then((r) => r.data);
  },
  downloadPayslipPdf: (id) =>
    api.get(`/payroll/payslips/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data),
  emailPayslip: (id) => api.post(`/payroll/payslips/${id}/email`).then((r) => r.data),
  emailRunPayslips: (runId) => api.post(`/payroll/runs/${runId}/email-payslips`).then((r) => r.data),
  listFeed: (params) => api.get('/payroll/feed', { params }).then((r) => r.data),
  createFeed: (payload) => api.post('/payroll/feed', payload).then((r) => r.data),
  deleteFeed: (id) => api.delete(`/payroll/feed/${id}`).then((r) => r.data),
  listTaxSlabConfigs: (params) => api.get('/admin/tax-slab-configs', { params }).then((r) => r.data),
  saveTaxSlabConfig: (payload) => api.put('/admin/tax-slab-configs', payload).then((r) => r.data),
  updateTdsOverride: (employeeId, payload) =>
    api.patch(`/payroll/salaries/${employeeId}/tds-override`, payload).then((r) => r.data),
  getEmployeeTaxDeclaration: (employeeId, params) =>
    api.get(`/admin/employees/${employeeId}/tax-declaration`, { params }).then((r) => r.data),
  listEmployeeForm16: (employeeId) =>
    api.get(`/payroll/employees/${employeeId}/form16`).then((r) => r.data),
  uploadEmployeeForm16: (employeeId, file, financialYear) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('financial_year', financialYear);
    return api.post(`/payroll/employees/${employeeId}/form16`, formData).then((r) => r.data);
  },
  downloadForm16: (id) =>
    api.get(`/payroll/form16/${id}/download`, { responseType: 'blob' }).then((r) => r.data),
  deleteForm16: (id) => api.delete(`/payroll/form16/${id}`).then((r) => r.data),
};

export const financeApi = {
  statutorySummary: (params) => api.get('/finance/statutory', { params }).then((r) => r.data),
  financialSummary: (params) => api.get('/finance/summary', { params }).then((r) => r.data),
  dayBook: (params) => api.get('/finance/daybook', { params }).then((r) => r.data),
  daybookDashboard: (params) => api.get('/finance/daybook/dashboard', { params }).then((r) => r.data),
  syncDayBook: (payload) => api.post('/finance/daybook/sync', payload).then((r) => r.data),
  createDayBookEntry: (payload) => api.post('/finance/daybook', payload).then((r) => r.data),
  listVouchers: (params) => api.get('/finance/vouchers', { params }).then((r) => r.data),
  getVoucher: (id) => api.get(`/finance/vouchers/${id}`).then((r) => r.data),
  createVoucher: (payload) => api.post('/finance/vouchers', payload).then((r) => r.data),
  reverseVoucher: (id) => api.post(`/finance/vouchers/${id}/reverse`).then((r) => r.data),
  accountLedger: (accountId, params) =>
    api.get(`/finance/reports/ledger/${accountId}`, { params }).then((r) => r.data),
  trialBalance: (params) => api.get('/finance/reports/trial-balance', { params }).then((r) => r.data),
  listChartOfAccounts: (params) =>
    api.get('/admin/finance/chart-of-accounts', { params }).then((r) => r.data),
  seedDefaultChartOfAccounts: () =>
    api.post('/admin/finance/chart-of-accounts/seed-defaults').then((r) => r.data),
  listGst: (params) => api.get('/finance/gst', { params }).then((r) => r.data),
  createGst: (payload) => api.post('/finance/gst', payload).then((r) => r.data),
  deleteGst: (id) => api.delete(`/finance/gst/${id}`).then((r) => r.data),
  listVendors: (params) => api.get('/finance/vendors', { params }).then((r) => r.data),
  getVendor: (id, params) => api.get(`/finance/vendors/${id}`, { params }).then((r) => r.data),
  createVendor: (payload) => api.post('/finance/vendors', payload).then((r) => r.data),
  updateVendor: (id, payload) => api.put(`/finance/vendors/${id}`, payload).then((r) => r.data),
  deleteVendor: (id) => api.delete(`/finance/vendors/${id}`).then((r) => r.data),
  listCategories: (params) => api.get('/finance/categories', { params }).then((r) => r.data),
  getCategory: (id) => api.get(`/finance/categories/${id}`).then((r) => r.data),
  createCategory: (payload) => api.post('/finance/categories', payload).then((r) => r.data),
  updateCategory: (id, payload) => api.put(`/finance/categories/${id}`, payload).then((r) => r.data),
  deleteCategory: (id) => api.delete(`/finance/categories/${id}`).then((r) => r.data),
  listTransactions: (params) => api.get('/finance/transactions', { params }).then((r) => r.data),
  listSalaryPayments: (params) => api.get('/finance/salary-payments', { params }).then((r) => r.data),
  getSalaryPayment: (id) => api.get(`/finance/salary-payments/${id}`).then((r) => r.data),
  getTransaction: (id) => api.get(`/finance/transactions/${id}`).then((r) => r.data),
  getTransactionInvoice: (id) => api.get(`/finance/transactions/${id}/invoice`).then((r) => r.data),
  getTransactionReceipt: (id) => api.get(`/finance/transactions/${id}/receipt`).then((r) => r.data),
  createTransaction: (payload) => api.post('/finance/transactions', payload).then((r) => r.data),
  updateTransaction: (id, payload) => api.put(`/finance/transactions/${id}`, payload).then((r) => r.data),
  deleteTransaction: (id) => api.delete(`/finance/transactions/${id}`).then((r) => r.data),
  listTransactionPayments: (id) => api.get(`/finance/transactions/${id}/payments`).then((r) => r.data),
  recordTransactionPayment: (id, payload) => api.post(`/finance/transactions/${id}/payments`, payload).then((r) => r.data),
  listQuotations: (params) => api.get('/finance/quotations', { params }).then((r) => r.data),
  getQuotation: (id) => api.get(`/finance/quotations/${id}`).then((r) => r.data),
  createQuotation: (payload) => api.post('/finance/quotations', payload).then((r) => r.data),
  updateQuotation: (id, payload) => api.put(`/finance/quotations/${id}`, payload).then((r) => r.data),
  deleteQuotation: (id) => api.delete(`/finance/quotations/${id}`).then((r) => r.data),
  listPaymentModes: () => api.get('/finance/payment-modes').then((r) => r.data),
  upsertPaymentMode: (paymentMode, payload) =>
    api.put(`/finance/payment-modes/${paymentMode}`, payload).then((r) => r.data),
};

export const hrApi = {
  listOpenings: (params) => api.get('/hr/recruitment/openings', { params }).then((r) => r.data),
  createOpening: (formData) =>
    api.post('/hr/recruitment/openings', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  updateOpening: (id, formData) =>
    api.put(`/hr/recruitment/openings/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  listApplications: (params) => api.get('/hr/recruitment/applications', { params }).then((r) => r.data),
  getApplication: (id) => api.get(`/hr/recruitment/applications/${id}`).then((r) => r.data),
  createApplication: (payload) => api.post('/hr/recruitment/applications', payload).then((r) => r.data),
  updateApplicationStatus: (id, payload) => api.patch(`/hr/recruitment/applications/${id}`, payload).then((r) => r.data),
  listOnboardingTemplates: () => api.get('/hr/onboarding/templates').then((r) => r.data),
  createOnboardingTemplate: (payload) => api.post('/hr/onboarding/templates', payload).then((r) => r.data),
  deleteOnboardingTemplate: (id) => api.delete(`/hr/onboarding/templates/${id}`).then((r) => r.data),
  listOnboardingTasks: (params) => api.get('/hr/onboarding/tasks', { params }).then((r) => r.data),
  initOnboarding: (payload) => api.post('/hr/onboarding/init', payload).then((r) => r.data),
  updateOnboardingTask: (id, payload) => api.patch(`/hr/onboarding/tasks/${id}`, payload).then((r) => r.data),
  listSeparations: (params) => api.get('/hr/separation', { params }).then((r) => r.data),
  listSeparationEligibleEmployees: (params) =>
    api.get('/hr/separation/eligible-employees', { params }).then((r) => r.data),
  getExitDashboard: (params) =>
    api.get('/hr/separation/dashboard', { params }).then((r) => r.data),
  listExitReportTypes: () => api.get('/hr/exit-reports').then((r) => r.data),
  getExitReport: (type, params) =>
    api.get(`/hr/exit-reports/${type}`, { params }).then((r) => r.data),
  exportExitReport: (type, params) =>
    api.get(`/hr/exit-reports/${type}/export`, { params, responseType: 'blob' }),
  createSeparation: (payload) => api.post('/hr/separation', payload).then((r) => r.data),
  updateSeparation: (id, payload) => api.patch(`/hr/separation/${id}`, payload).then((r) => r.data),
  listSeparationHiringEligibilityEvents: (id, params) =>
    api.get(`/hr/separation/${id}/hiring-eligibility-events`, { params }).then((r) => r.data),
  listSeparationClearanceTemplates: (params) =>
    api.get('/hr/separation-clearance-templates', { params }).then((r) => r.data),
  getSeparationClearanceTemplate: (id) =>
    api.get(`/hr/separation-clearance-templates/${id}`).then((r) => r.data),
  createSeparationClearanceTemplate: (payload) =>
    api.post('/hr/separation-clearance-templates', payload).then((r) => r.data),
  updateSeparationClearanceTemplate: (id, payload) =>
    api.put(`/hr/separation-clearance-templates/${id}`, payload).then((r) => r.data),
  deleteSeparationClearanceTemplate: (id) =>
    api.delete(`/hr/separation-clearance-templates/${id}`).then((r) => r.data),
  listDocumentTemplates: (params) =>
    api.get('/hr/document-templates', { params }).then((r) => r.data),
  listDocumentTemplateVariables: () =>
    api.get('/hr/document-templates/variables').then((r) => r.data),
  getDocumentTemplate: (id) =>
    api.get(`/hr/document-templates/${id}`).then((r) => r.data),
  listDocumentTemplateVersions: (id) =>
    api.get(`/hr/document-templates/${id}/versions`).then((r) => r.data),
  getDocumentTemplateVersion: (id, version) =>
    api.get(`/hr/document-templates/${id}/versions/${version}`).then((r) => r.data),
  previewDocumentTemplateHtml: (id, params) =>
    api.get(`/hr/document-templates/${id}/preview-html`, { params }).then((r) => r.data),
  previewDocumentTemplatePdf: (id, params) =>
    api
      .get(`/hr/document-templates/${id}/preview-pdf`, { params, responseType: 'blob' })
      .then((r) => r.data),
  downloadDocumentTemplatePdf: (id, params) =>
    api
      .get(`/hr/document-templates/${id}/download-pdf`, { params, responseType: 'blob' })
      .then((r) => r.data),
  createDocumentTemplate: (payload) =>
    api.post('/hr/document-templates', payload).then((r) => r.data),
  listDocumentTemplateDefaults: () =>
    api.get('/hr/document-templates/defaults').then((r) => r.data),
  seedDefaultDocumentTemplates: () =>
    api.post('/hr/document-templates/seed-defaults').then((r) => r.data),
  parseDocumentTemplateFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/hr/document-templates/parse-file', formData).then((r) => r.data);
  },
  createDocumentTemplateFromFile: (file, payload) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      formData.append(key, typeof value === 'boolean' ? String(value) : value);
    });
    return api.post('/hr/document-templates/from-file', formData).then((r) => r.data);
  },
  updateDocumentTemplate: (id, payload) =>
    api.put(`/hr/document-templates/${id}`, payload).then((r) => r.data),
  deleteDocumentTemplate: (id) =>
    api.delete(`/hr/document-templates/${id}`).then((r) => r.data),
  listGeneratedDocuments: (params) =>
    api.get('/hr/generated-documents', { params }).then((r) => r.data),
  getGeneratedDocument: (id, params) =>
    api.get(`/hr/generated-documents/${id}`, { params }).then((r) => r.data),
  previewGeneratedDocument: (id) =>
    api
      .get(`/hr/generated-documents/${id}/preview`, { responseType: 'blob' })
      .then((r) => r.data),
  downloadGeneratedDocument: (id) =>
    api
      .get(`/hr/generated-documents/${id}/download`, { responseType: 'blob' })
      .then((r) => r.data),
  listSeparationClearances: (params) =>
    api.get('/hr/separation-clearances', { params }).then((r) => r.data),
  getSeparationClearance: (id) =>
    api.get(`/hr/separation-clearances/${id}`).then((r) => r.data),
  getClearanceDepartmentDashboard: (params) =>
    api.get('/hr/separation-clearances/department-dashboard', { params }).then((r) => r.data),
  listClearanceDepartmentOwners: () =>
    api.get('/hr/separation-clearances/department-owners').then((r) => r.data),
  upsertClearanceDepartmentOwner: (payload) =>
    api.put('/hr/separation-clearances/department-owners', payload).then((r) => r.data),
  listSeparationClearanceItems: (id, params) =>
    api.get(`/hr/separation-clearances/${id}/items`, { params }).then((r) => r.data),
  getSeparationClearanceProgress: (id) =>
    api.get(`/hr/separation-clearances/${id}/progress`).then((r) => r.data),
  approveSeparationClearanceItem: (clearanceId, itemId, payload) =>
    api.post(`/hr/separation-clearances/${clearanceId}/items/${itemId}/approve`, payload).then((r) => r.data),
  rejectSeparationClearanceItem: (clearanceId, itemId, payload) =>
    api.post(`/hr/separation-clearances/${clearanceId}/items/${itemId}/reject`, payload).then((r) => r.data),
  updateSeparationClearanceItemRemarks: (clearanceId, itemId, payload) =>
    api.patch(`/hr/separation-clearances/${clearanceId}/items/${itemId}/remarks`, payload).then((r) => r.data),
  updateSeparationClearanceItemAssignment: (clearanceId, itemId, payload) =>
    api.patch(`/hr/separation-clearances/${clearanceId}/items/${itemId}/assignment`, payload).then((r) => r.data),
  reattemptSeparationClearanceItem: (clearanceId, itemId, payload) =>
    api.post(`/hr/separation-clearances/${clearanceId}/items/${itemId}/reattempt`, payload || {}).then((r) => r.data),
  uploadSeparationClearanceAttachment: (clearanceId, itemId, formData) =>
    api
      .post(`/hr/separation-clearances/${clearanceId}/items/${itemId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
  deleteSeparationClearanceAttachment: (clearanceId, itemId, attachmentId) =>
    api
      .delete(`/hr/separation-clearances/${clearanceId}/items/${itemId}/attachments/${attachmentId}`)
      .then((r) => r.data),
  getSeparationClearanceItemHistory: (clearanceId, itemId) =>
    api.get(`/hr/separation-clearances/${clearanceId}/items/${itemId}/history`).then((r) => r.data),
  listExitInterviews: (params) => api.get('/hr/exit-interviews', { params }).then((r) => r.data),
  getExitInterview: (id) => api.get(`/hr/exit-interviews/${id}`).then((r) => r.data),
  getExitInterviewBySeparation: (separationId) =>
    api.get(`/hr/exit-interviews/by-separation/${separationId}`).then((r) => r.data),
  createExitInterview: (payload) => api.post('/hr/exit-interviews', payload).then((r) => r.data),
  submitExitInterviewEmployee: (id, payload) =>
    api.post(`/hr/exit-interviews/${id}/employee-submit`, payload).then((r) => r.data),
  submitExitInterviewManager: (id, payload) =>
    api.post(`/hr/exit-interviews/${id}/manager-submit`, payload).then((r) => r.data),
  submitExitInterviewHr: (id, payload) =>
    api.post(`/hr/exit-interviews/${id}/hr-submit`, payload).then((r) => r.data),
  waiveExitInterview: (id, payload) =>
    api.post(`/hr/exit-interviews/${id}/waive`, payload).then((r) => r.data),
  getExitInterviewAnalytics: (params) =>
    api.get('/hr/exit-interviews/analytics', { params }).then((r) => r.data),
  listExitInterviewQuestionnaires: (params) =>
    api.get('/hr/exit-interviews/questionnaires', { params }).then((r) => r.data),
  createExitInterviewQuestionnaire: (payload) =>
    api.post('/hr/exit-interviews/questionnaires', payload).then((r) => r.data),
  updateExitInterviewQuestionnaire: (id, payload) =>
    api.put(`/hr/exit-interviews/questionnaires/${id}`, payload).then((r) => r.data),
  deactivateExitInterviewQuestionnaire: (id) =>
    api.delete(`/hr/exit-interviews/questionnaires/${id}`).then((r) => r.data),
  listFnfSettlements: (params) => api.get('/hr/fnf-settlements', { params }).then((r) => r.data),
  getFnfSettlement: (id) => api.get(`/hr/fnf-settlements/${id}`).then((r) => r.data),
  getFnfStatement: (id) => api.get(`/hr/fnf-settlements/${id}/statement`).then((r) => r.data),
  recalculateFnfSettlement: (id) =>
    api.post(`/hr/fnf-settlements/${id}/recalculate`).then((r) => r.data),
  submitFnfSettlementApproval: (id, payload) =>
    api.post(`/hr/fnf-settlements/${id}/submit-approval`, payload || {}).then((r) => r.data),
  approveFnfSettlement: (id, payload) =>
    api.post(`/hr/fnf-settlements/${id}/approve`, payload).then((r) => r.data),
  listFnfSettlementPayments: (id) =>
    api.get(`/hr/fnf-settlements/${id}/payments`).then((r) => r.data),
  recordFnfPayment: (id, payload) =>
    api.post(`/hr/fnf-settlements/${id}/payments`, payload).then((r) => r.data),
  approveFnfPayment: (id, paymentId, payload) =>
    api.post(`/hr/fnf-settlements/${id}/payments/${paymentId}/approve`, payload || {}).then((r) => r.data),
  rejectFnfPayment: (id, paymentId, payload) =>
    api.post(`/hr/fnf-settlements/${id}/payments/${paymentId}/reject`, payload).then((r) => r.data),
  reconcileFnfPayment: (id, paymentId, payload) =>
    api.post(`/hr/fnf-settlements/${id}/payments/${paymentId}/reconcile`, payload).then((r) => r.data),
  getFnfFinanceReconciliation: (params) =>
    api.get('/hr/fnf-settlements/finance-reconciliation', { params }).then((r) => r.data),
  addFnfComponent: (id, payload) =>
    api.post(`/hr/fnf-settlements/${id}/components`, payload).then((r) => r.data),
  updateFnfComponent: (id, componentId, payload) =>
    api.patch(`/hr/fnf-settlements/${id}/components/${componentId}`, payload).then((r) => r.data),
  deleteFnfComponent: (id, componentId) =>
    api.delete(`/hr/fnf-settlements/${id}/components/${componentId}`).then((r) => r.data),
  listKtPlans: (params) => api.get('/hr/kt-plans', { params }).then((r) => r.data),
  getKtAnalytics: (params) => api.get('/hr/kt-plans/analytics', { params }).then((r) => r.data),
  getKtPlan: (id) => api.get(`/hr/kt-plans/${id}`).then((r) => r.data),
  getKtPlanBySeparation: (separationId) =>
    api.get(`/hr/kt-plans/by-separation/${separationId}`).then((r) => r.data),
  createKtPlan: (payload) => api.post('/hr/kt-plans', payload).then((r) => r.data),
  updateKtPlan: (id, payload) => api.patch(`/hr/kt-plans/${id}`, payload).then((r) => r.data),
  getKtProgress: (id) => api.get(`/hr/kt-plans/${id}/progress`).then((r) => r.data),
  submitKtPlan: (id) => api.post(`/hr/kt-plans/${id}/submit`).then((r) => r.data),
  approveKtPlan: (id) => api.post(`/hr/kt-plans/${id}/approve`).then((r) => r.data),
  rejectKtPlan: (id, payload) => api.post(`/hr/kt-plans/${id}/reject`, payload).then((r) => r.data),
  cancelKtPlan: (id, payload) => api.post(`/hr/kt-plans/${id}/cancel`, payload).then((r) => r.data),
  acceptKtSuccessor: (id, payload) =>
    api.post(`/hr/kt-plans/${id}/accept-successor`, payload).then((r) => r.data),
  submitKtManagerReview: (id, payload) =>
    api.post(`/hr/kt-plans/${id}/manager-review`, payload).then((r) => r.data),
  addKtTask: (id, payload) => api.post(`/hr/kt-plans/${id}/tasks`, payload).then((r) => r.data),
  updateKtTask: (id, taskId, payload) =>
    api.patch(`/hr/kt-plans/${id}/tasks/${taskId}`, payload).then((r) => r.data),
  deleteKtTask: (id, taskId) => api.delete(`/hr/kt-plans/${id}/tasks/${taskId}`).then((r) => r.data),
  listKtComments: (id) => api.get(`/hr/kt-plans/${id}/comments`).then((r) => r.data),
  addKtComment: (id, payload) => api.post(`/hr/kt-plans/${id}/comments`, payload).then((r) => r.data),
  deleteKtComment: (id, commentId) =>
    api.delete(`/hr/kt-plans/${id}/comments/${commentId}`).then((r) => r.data),
  listKtDocuments: (id) => api.get(`/hr/kt-plans/${id}/documents`).then((r) => r.data),
  uploadKtDocument: (id, formData) =>
    api
      .post(`/hr/kt-plans/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
  acknowledgeKtDocument: (id, documentId) =>
    api.post(`/hr/kt-plans/${id}/documents/${documentId}/acknowledge`).then((r) => r.data),
  deleteKtDocument: (id, documentId) =>
    api.delete(`/hr/kt-plans/${id}/documents/${documentId}`).then((r) => r.data),
  listKtSessions: (id) => api.get(`/hr/kt-plans/${id}/sessions`).then((r) => r.data),
  addKtSession: (id, payload) => api.post(`/hr/kt-plans/${id}/sessions`, payload).then((r) => r.data),
  updateKtSession: (id, sessionId, payload) =>
    api.patch(`/hr/kt-plans/${id}/sessions/${sessionId}`, payload).then((r) => r.data),
  deleteKtSession: (id, sessionId) =>
    api.delete(`/hr/kt-plans/${id}/sessions/${sessionId}`).then((r) => r.data),
  listKtRepositories: (id) => api.get(`/hr/kt-plans/${id}/repositories`).then((r) => r.data),
  addKtRepository: (id, payload) =>
    api.post(`/hr/kt-plans/${id}/repositories`, payload).then((r) => r.data),
  updateKtRepository: (id, repoId, payload) =>
    api.patch(`/hr/kt-plans/${id}/repositories/${repoId}`, payload).then((r) => r.data),
  deleteKtRepository: (id, repoId) =>
    api.delete(`/hr/kt-plans/${id}/repositories/${repoId}`).then((r) => r.data),
  listKtCredentials: (id) => api.get(`/hr/kt-plans/${id}/credentials`).then((r) => r.data),
  addKtCredential: (id, payload) =>
    api.post(`/hr/kt-plans/${id}/credentials`, payload).then((r) => r.data),
  updateKtCredential: (id, credentialId, payload) =>
    api.patch(`/hr/kt-plans/${id}/credentials/${credentialId}`, payload).then((r) => r.data),
  deleteKtCredential: (id, credentialId) =>
    api.delete(`/hr/kt-plans/${id}/credentials/${credentialId}`).then((r) => r.data),
  listKtHistory: (id) => api.get(`/hr/kt-plans/${id}/history`).then((r) => r.data),
  getRelievingLetterStatus: (separationId) =>
    api.get(`/hr/separation/${separationId}/relieving-letter`).then((r) => r.data),
  generateRelievingLetter: (separationId) =>
    api.post(`/hr/separation/${separationId}/relieving-letter`).then((r) => r.data),
  downloadRelievingLetter: (separationId) =>
    api.get(`/hr/separation/${separationId}/relieving-letter/download`, { responseType: 'blob' }),
  getExperienceLetterStatus: (separationId) =>
    api.get(`/hr/separation/${separationId}/experience-letter`).then((r) => r.data),
  generateExperienceLetter: (separationId) =>
    api.post(`/hr/separation/${separationId}/experience-letter`).then((r) => r.data),
  previewExperienceLetter: (separationId) =>
    api.get(`/hr/separation/${separationId}/experience-letter/preview`, { responseType: 'blob' }),
  downloadExperienceLetter: (separationId) =>
    api.get(`/hr/separation/${separationId}/experience-letter/download`, { responseType: 'blob' }),
  listPerformanceCycles: () => api.get('/hr/performance/cycles').then((r) => r.data),
  createPerformanceCycle: (payload) => api.post('/hr/performance/cycles', payload).then((r) => r.data),
  updatePerformanceCycle: (id, payload) => api.put(`/hr/performance/cycles/${id}`, payload).then((r) => r.data),
  updatePerformanceCycleStatus: (id, payload) =>
    api.patch(`/hr/performance/cycles/${id}/status`, payload).then((r) => r.data),
  launchPerformanceCycle: (id) => api.post(`/hr/performance/cycles/${id}/launch`).then((r) => r.data),
  listPerformanceReviews: (params) => api.get('/hr/performance/reviews', { params }).then((r) => r.data),
  updatePerformanceReview: (id, payload) => api.patch(`/hr/performance/reviews/${id}`, payload).then((r) => r.data),
  listAssets: (params) => api.get('/hr/assets', { params }).then((r) => r.data),
  getAssetDashboard: () => api.get('/hr/assets/dashboard').then((r) => r.data),
  listAssetMaintenance: (params) => api.get('/hr/assets/maintenance', { params }).then((r) => r.data),
  createAssetMaintenance: (payload) => api.post('/hr/assets/maintenance', payload).then((r) => r.data),
  updateAssetMaintenance: (id, payload) => api.put(`/hr/assets/maintenance/${id}`, payload).then((r) => r.data),
  deleteAssetMaintenance: (id) => api.delete(`/hr/assets/maintenance/${id}`).then((r) => r.data),
  getAsset: (id) => api.get(`/hr/assets/${id}`).then((r) => r.data),
  createAsset: (payload) => api.post('/hr/assets', payload).then((r) => r.data),
  updateAsset: (id, payload) => api.put(`/hr/assets/${id}`, payload).then((r) => r.data),
  retireAsset: (id) => api.delete(`/hr/assets/${id}`).then((r) => r.data),
  assignAsset: (id, payload) => api.post(`/hr/assets/${id}/assign`, payload).then((r) => r.data),
  returnAsset: (id, payload) => api.post(`/hr/assets/${id}/return`, payload).then((r) => r.data),
  listAssetReturnRequests: (params) =>
    api.get('/admin/assets/return-requests', { params }).then((r) => r.data),
  getAssetReturnRequest: (id) =>
    api.get(`/admin/assets/return-requests/${id}`).then((r) => r.data),
  softApproveAssetReturnRequest: (id, payload) =>
    api.put(`/admin/assets/return-requests/${id}/approve`, payload).then((r) => r.data),
  completeAssetReturnRequest: (id, formData) =>
    api
      .put(`/admin/assets/return-requests/${id}/complete`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
  /** @deprecated use completeAssetReturnRequest */
  approveAssetReturnRequest: (id, formData) =>
    api
      .put(`/admin/assets/return-requests/${id}/complete`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
  rejectAssetReturnRequest: (id, payload) =>
    api.put(`/admin/assets/return-requests/${id}/reject`, payload).then((r) => r.data),
  uploadAssetReturnPhotos: (id, formData) =>
    api
      .post(`/admin/assets/return-requests/${id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
  getAssetHistory: (id, params) =>
    api.get(`/hr/assets/${id}/history`, { params }).then((r) => r.data),
  listPendingReimbursements: () => api.get('/admin/reimbursements').then((r) => r.data),
  approveReimbursement: (id, payload) => api.put(`/admin/reimbursements/${id}/approve`, payload).then((r) => r.data),
  rejectReimbursement: (id, payload) => api.put(`/admin/reimbursements/${id}/reject`, payload).then((r) => r.data),
  createPolicyDocument: (formData) => api.post('/admin/policy-documents', formData).then((r) => r.data),
  listProjects: (params) => api.get('/hr/projects', { params }).then((r) => r.data),
  listArchivedProjects: () => api.get('/hr/projects/archived').then((r) => r.data),
  getProject: (id) => api.get(`/hr/projects/${id}`).then((r) => r.data),
  createProject: (payload) => api.post('/hr/projects', payload).then((r) => r.data),
  updateProject: (id, payload) => api.put(`/hr/projects/${id}`, payload).then((r) => r.data),
  archiveProject: (id) => api.delete(`/hr/projects/${id}`).then((r) => r.data),
  restoreProject: (id) => api.post(`/hr/projects/${id}/restore`).then((r) => r.data),
  listMyTasks: (params) => api.get('/hr/projects/my-tasks', { params }).then((r) => r.data),
  getProjectBoard: (projectId) => api.get(`/hr/projects/${projectId}/board`).then((r) => r.data),
  updateBoardColumn: (columnId, payload) => api.put(`/hr/board-columns/${columnId}`, payload).then((r) => r.data),
  deleteBoardColumn: (columnId, payload) =>
    api.delete(`/hr/board-columns/${columnId}`, { data: payload || {} }).then((r) => r.data),
  createBoardColumn: (boardId, payload) => api.post(`/hr/boards/${boardId}/columns`, payload).then((r) => r.data),
  reorderBoardColumns: (boardId, payload) =>
    api.put(`/hr/boards/${boardId}/columns/reorder`, payload).then((r) => r.data),
  listProjectTasks: (projectId, params) => api.get(`/hr/projects/${projectId}/tasks`, { params }).then((r) => r.data),
  getTask: (taskId) => api.get(`/hr/tasks/${taskId}`).then((r) => r.data),
  createProjectTask: (projectId, payload) => api.post(`/hr/projects/${projectId}/tasks`, payload).then((r) => r.data),
  updateTask: (taskId, payload) => api.put(`/hr/tasks/${taskId}`, payload).then((r) => r.data),
  moveTask: (taskId, payload) => api.put(`/hr/tasks/${taskId}/status`, payload).then((r) => r.data),
  assignTask: (taskId, payload) => api.put(`/hr/tasks/${taskId}/assign`, payload).then((r) => r.data),
  deleteTask: (taskId) => api.delete(`/hr/tasks/${taskId}`).then((r) => r.data),
  addTaskComment: (taskId, payload) => api.post(`/hr/tasks/${taskId}/comments`, payload).then((r) => r.data),
  updateTaskComment: (taskId, commentId, payload) =>
    api.put(`/hr/tasks/${taskId}/comments/${commentId}`, payload).then((r) => r.data),
  deleteTaskComment: (taskId, commentId) =>
    api.delete(`/hr/tasks/${taskId}/comments/${commentId}`).then((r) => r.data),
  listTaskAttachments: (taskId) => api.get(`/hr/tasks/${taskId}/attachments`).then((r) => r.data),
  addTaskAttachment: (taskId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/hr/tasks/${taskId}/attachments`, formData).then((r) => r.data);
  },
  deleteTaskAttachment: (taskId, attachmentId) =>
    api.delete(`/hr/tasks/${taskId}/attachments/${attachmentId}`).then((r) => r.data),
  listTaskDependencies: (taskId) => api.get(`/hr/tasks/${taskId}/dependencies`).then((r) => r.data),
  listProjectDependencies: (projectId) => api.get(`/hr/projects/${projectId}/dependencies`).then((r) => r.data),
  addTaskDependency: (taskId, payload) => api.post(`/hr/tasks/${taskId}/dependencies`, payload).then((r) => r.data),
  deleteTaskDependency: (taskId, depId) => api.delete(`/hr/tasks/${taskId}/dependencies/${depId}`).then((r) => r.data),
  bulkAssignTasks: (payload) => api.post('/hr/tasks/bulk-assign', payload).then((r) => r.data),
  listProjectMembers: (projectId) => api.get(`/hr/projects/${projectId}/members`).then((r) => r.data),
  addProjectMember: (projectId, payload) => api.post(`/hr/projects/${projectId}/members`, payload).then((r) => r.data),
  updateProjectMember: (projectId, employeeId, payload) =>
    api.patch(`/hr/projects/${projectId}/members/${employeeId}`, payload).then((r) => r.data),
  removeProjectMember: (projectId, employeeId) =>
    api.delete(`/hr/projects/${projectId}/members/${employeeId}`).then((r) => r.data),
  getProjectDashboard: (projectId) => api.get(`/hr/projects/${projectId}/dashboard`).then((r) => r.data),
  listSprints: (projectId) => api.get(`/hr/projects/${projectId}/sprints`).then((r) => r.data),
  createSprint: (projectId, payload) => api.post(`/hr/projects/${projectId}/sprints`, payload).then((r) => r.data),
  updateSprint: (sprintId, payload) => api.put(`/hr/sprints/${sprintId}`, payload).then((r) => r.data),
  reopenSprint: (sprintId) => api.put(`/hr/sprints/${sprintId}/reopen`).then((r) => r.data),
  startSprint: (sprintId) => api.put(`/hr/sprints/${sprintId}/start`).then((r) => r.data),
  completeSprint: (sprintId, payload) => api.put(`/hr/sprints/${sprintId}/complete`, payload).then((r) => r.data),
  listProjectLabels: (projectId) => api.get(`/hr/projects/${projectId}/labels`).then((r) => r.data),
  createProjectLabel: (projectId, payload) => api.post(`/hr/projects/${projectId}/labels`, payload).then((r) => r.data),
  updateProjectLabel: (labelId, payload) => api.put(`/hr/project-labels/${labelId}`, payload).then((r) => r.data),
  deleteProjectLabel: (labelId) => api.delete(`/hr/project-labels/${labelId}`).then((r) => r.data),
  assignTaskLabel: (taskId, payload) => api.post(`/hr/tasks/${taskId}/labels`, payload).then((r) => r.data),
  removeTaskLabel: (taskId, labelId) => api.delete(`/hr/tasks/${taskId}/labels/${labelId}`).then((r) => r.data),
};

export const platformApi = {
  listTickets: (params) => api.get('/platform/helpdesk/tickets', { params }).then((r) => r.data),
  exportTickets: (params) => api.get('/platform/helpdesk/tickets/export', { params, responseType: 'blob' }),
  getTicket: (id) => api.get(`/platform/helpdesk/tickets/${id}`).then((r) => r.data),
  createTicket: (payload, files = []) =>
    api.post('/platform/helpdesk/tickets', payload).then(async (r) => {
      const ticketId = r.data?.data?.ticket?.id;
      if (ticketId && files.length > 0) {
        await Promise.all(
          files.map((file) => {
            const formData = new FormData();
            formData.append('file', file);
            return api.post(`/platform/helpdesk/tickets/${ticketId}/attachments`, formData);
          })
        );
      }
      return r.data;
    }),
  updateTicket: (id, payload) => api.patch(`/platform/helpdesk/tickets/${id}`, payload).then((r) => r.data),
  bulkUpdateTickets: (payload) => api.patch('/platform/helpdesk/tickets/bulk', payload).then((r) => r.data),
  addTicketReply: (id, payload) => api.post(`/platform/helpdesk/tickets/${id}/replies`, payload).then((r) => r.data),
  uploadTicketAttachment: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/platform/helpdesk/tickets/${id}/attachments`, formData).then((r) => r.data);
  },
  listTicketAttachments: (id) => api.get(`/platform/helpdesk/tickets/${id}/attachments`).then((r) => r.data),
  rateTicket: (id, payload) => api.post(`/platform/helpdesk/tickets/${id}/rating`, payload).then((r) => r.data),
  getSlaRules: () => api.get('/platform/helpdesk/sla-rules').then((r) => r.data),
  updateSlaRules: (payload) => api.put('/platform/helpdesk/sla-rules', payload).then((r) => r.data),
  listSavedReplies: () => api.get('/platform/helpdesk/saved-replies').then((r) => r.data),
  createSavedReply: (payload) => api.post('/platform/helpdesk/saved-replies', payload).then((r) => r.data),
  updateSavedReply: (id, payload) => api.patch(`/platform/helpdesk/saved-replies/${id}`, payload).then((r) => r.data),
  deleteSavedReply: (id) => api.delete(`/platform/helpdesk/saved-replies/${id}`).then((r) => r.data),
  listKbArticles: (params) => api.get('/platform/helpdesk/kb-articles', { params }).then((r) => r.data),
  createKbArticle: (payload) => api.post('/platform/helpdesk/kb-articles', payload).then((r) => r.data),
  updateKbArticle: (id, payload) => api.patch(`/platform/helpdesk/kb-articles/${id}`, payload).then((r) => r.data),
  deleteKbArticle: (id) => api.delete(`/platform/helpdesk/kb-articles/${id}`).then((r) => r.data),
  listHelpdeskTags: () => api.get('/platform/helpdesk/tags').then((r) => r.data),
  createHelpdeskTag: (payload) => api.post('/platform/helpdesk/tags', payload).then((r) => r.data),
  updateHelpdeskTag: (id, payload) => api.patch(`/platform/helpdesk/tags/${id}`, payload).then((r) => r.data),
  deleteHelpdeskTag: (id) => api.delete(`/platform/helpdesk/tags/${id}`).then((r) => r.data),
  listHelpdeskCategories: (params) => api.get('/platform/helpdesk/categories', { params }).then((r) => r.data),
  createHelpdeskCategory: (payload) => api.post('/platform/helpdesk/categories', payload).then((r) => r.data),
  updateHelpdeskCategory: (id, payload) => api.patch(`/platform/helpdesk/categories/${id}`, payload).then((r) => r.data),
  deleteHelpdeskCategory: (id) => api.delete(`/platform/helpdesk/categories/${id}`).then((r) => r.data),
  listAnnouncements: (params) => api.get('/platform/announcements', { params }).then((r) => r.data),
  createAnnouncement: (payload) => api.post('/platform/announcements', payload).then((r) => r.data),
  updateAnnouncement: (id, payload) => api.patch(`/platform/announcements/${id}`, payload).then((r) => r.data),
  publishAnnouncement: (id) => api.post(`/platform/announcements/${id}/publish`).then((r) => r.data),
  archiveAnnouncement: (id) => api.post(`/platform/announcements/${id}/archive`).then((r) => r.data),
  acknowledgeAnnouncement: (id) => api.post(`/platform/announcements/${id}/acknowledge`).then((r) => r.data),
  listAuditLogs: (params) => api.get('/platform/audit-logs', { params }).then((r) => r.data),
  listNotifications: (params) => api.get('/platform/notifications', { params }).then((r) => r.data),
  markNotificationRead: (id) => api.patch(`/platform/notifications/${id}/read`).then((r) => r.data),
  markAllNotificationsRead: () => api.post('/platform/notifications/read-all').then((r) => r.data),
  reportHeadcount: () => api.get('/platform/reports/headcount').then((r) => r.data),
  reportAttendance: (params) => api.get('/platform/reports/attendance', { params }).then((r) => r.data),
  reportLeave: (params) => api.get('/platform/reports/leave', { params }).then((r) => r.data),
  reportPayroll: (params) => api.get('/platform/reports/payroll', { params }).then((r) => r.data),
  reportEmployeeMaster: () => api.get('/platform/reports/employee-master').then((r) => r.data),
  reportHelpdesk: () => api.get('/platform/reports/helpdesk').then((r) => r.data),
};

export const billingApi = {
  listPlans: (params) => api.get('/billing/plans', { params }).then((r) => r.data),
  getPlan: (id) => api.get(`/billing/plans/${id}`).then((r) => r.data),
  createPlan: (payload) => api.post('/billing/plans', payload).then((r) => r.data),
  updatePlan: (id, payload) => api.put(`/billing/plans/${id}`, payload).then((r) => r.data),
  deletePlan: (id) => api.delete(`/billing/plans/${id}`).then((r) => r.data),
  getPlanModules: (planId) => api.get(`/billing/plans/${planId}/modules`).then((r) => r.data),
  assignPlanModules: (planId, module_ids) =>
    api.post(`/billing/plans/${planId}/modules`, { module_ids }).then((r) => r.data),
  removePlanModules: (planId, module_ids) =>
    api.delete(`/billing/plans/${planId}/modules`, { data: { module_ids } }).then((r) => r.data),
  getPlanFeatures: (planId) => api.get(`/billing/plans/${planId}/features`).then((r) => r.data),
  assignPlanFeatures: (planId, feature_ids) =>
    api.post(`/billing/plans/${planId}/features`, { feature_ids }).then((r) => r.data),
  removePlanFeatures: (planId, feature_ids) =>
    api.delete(`/billing/plans/${planId}/features`, { data: { feature_ids } }).then((r) => r.data),
  listModules: (params) => api.get('/billing/modules', { params }).then((r) => r.data),
  getModule: (id) => api.get(`/billing/modules/${id}`).then((r) => r.data),
  getModuleFeatures: (moduleId) => api.get(`/billing/modules/${moduleId}/features`).then((r) => r.data),
  listFeatures: (params) => api.get('/billing/features', { params }).then((r) => r.data),
  getFeature: (id) => api.get(`/billing/features/${id}`).then((r) => r.data),
  listTenantSubscriptions: (params) => api.get('/billing/subscriptions', { params }).then((r) => r.data),
  getTenantSubscription: (tenantId) => api.get(`/tenants/${tenantId}/subscription`).then((r) => r.data),
  assignTenantSubscription: (tenantId, payload) =>
    api.post(`/tenants/${tenantId}/subscription`, payload).then((r) => r.data),
  changeTenantPlan: (tenantId, payload) =>
    api.put(`/tenants/${tenantId}/subscription/plan`, payload).then((r) => r.data),
  extendTenantSubscription: (tenantId, payload) =>
    api.put(`/tenants/${tenantId}/subscription/extend`, payload).then((r) => r.data),
  updateTenantBillingStatus: (tenantId, billing_status) =>
    api.put(`/tenants/${tenantId}/subscription/billing-status`, { billing_status }).then((r) => r.data),
  suspendTenantSubscription: (tenantId) =>
    api.post(`/tenants/${tenantId}/subscription/suspend`).then((r) => r.data),
  activateTenantSubscription: (tenantId) =>
    api.post(`/tenants/${tenantId}/subscription/activate`).then((r) => r.data),
  listSubscriptionRequests: (params) =>
    api.get('/billing/subscription-requests', { params }).then((r) => r.data),
  getSubscriptionRequest: (id) => api.get(`/billing/subscription-requests/${id}`).then((r) => r.data),
  createSubscriptionRequest: (payload) =>
    api.post('/billing/subscription-requests', payload).then((r) => r.data),
  approveSubscriptionRequest: (id, payload) =>
    api.post(`/billing/subscription-requests/${id}/approve`, payload).then((r) => r.data),
  rejectSubscriptionRequest: (id, payload) =>
    api.post(`/billing/subscription-requests/${id}/reject`, payload).then((r) => r.data),
  pendingSubscriptionRequestsCount: () =>
    api.get('/billing/subscription-requests/pending-count').then((r) => r.data),
  listPayments: (params) => api.get('/billing/payments', { params }).then((r) => r.data),
  getPayment: (id) => api.get(`/billing/payments/${id}`).then((r) => r.data),
  recordPayment: (payload) => api.post('/billing/payments', payload).then((r) => r.data),
  listInvoices: (params) => api.get('/billing/invoices', { params }).then((r) => r.data),
  getInvoice: (id) => api.get(`/billing/invoices/${id}`).then((r) => r.data),
  createInvoice: (payload) => api.post('/billing/invoices', payload).then((r) => r.data),
  updateInvoiceStatus: (id, payload) => api.put(`/billing/invoices/${id}/status`, payload).then((r) => r.data),
  listSubscriptionAlerts: (params) => api.get('/billing/alerts', { params }).then((r) => r.data),
};

export const brandingApi = {
  getPublicPlatformBranding: () => api.get('/auth/platform-branding').then((r) => r.data),
  getPlatformBranding: () => api.get('/settings/platform/branding').then((r) => r.data),
  updatePlatformBranding: (payload) => api.put('/settings/platform/branding', payload).then((r) => r.data),
  uploadPlatformLogo: (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/settings/platform/branding/logo', formData).then((r) => r.data);
  },
  getCompanyBranding: () => api.get('/settings/company/branding').then((r) => r.data),
  updateCompanyBranding: (payload) => api.put('/settings/company/branding', payload).then((r) => r.data),
  uploadCompanyLogo: (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/settings/company/branding/logo', formData).then((r) => r.data);
  },
  uploadHrSignature: (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/settings/company/branding/hr-signature', formData).then((r) => r.data);
  },
  uploadCompanySeal: (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/settings/company/branding/company-seal', formData).then((r) => r.data);
  },
};

export const workingCalendarApi = {
  get: () => api.get('/attendance/working-calendar').then((r) => r.data),
  update: (payload) => api.put('/attendance/working-calendar', payload).then((r) => r.data),
};


export const smtpApi = {
  getSettings: (params) => api.get('/settings/smtp', { params, timeout: 30000 }).then((r) => r.data),
  saveSettings: (payload, params) => api.put('/settings/smtp', payload, { params, timeout: 30000 }).then((r) => r.data),
  testSettings: (payload, params) =>
    api.post('/settings/smtp/test', payload, { params, timeout: 90000 }).then((r) => r.data),
  listLogs: (params) => api.get('/settings/smtp/logs', { params, timeout: 30000 }).then((r) => r.data),
  getProviders: () => api.get('/settings/providers').then((r) => r.data),
};
