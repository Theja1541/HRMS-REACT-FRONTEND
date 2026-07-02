export const TICKET_STATUSES = {
  open: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  resolved: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-slate-200 text-slate-600',
};

export const TICKET_ESCALATED_BADGE = 'bg-red-100 text-red-800';

export const TICKET_PRIORITIES = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-orange-50 text-orange-700',
  urgent: 'bg-red-50 text-red-700',
};

export const HELPDESK_ATTACHMENT_ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.docx,.xlsx,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const HELPDESK_ATTACHMENT_HINT = 'PDF, PNG, JPG, DOCX, XLSX — max 10 MB';

export const ANNOUNCEMENT_PRIORITIES = {
  normal: 'bg-slate-100 text-slate-600',
  important: 'bg-amber-50 text-amber-700',
  urgent: 'bg-red-50 text-red-700',
};

export const ANNOUNCEMENT_STATUSES = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-slate-200 text-slate-500',
};

export const REPORT_TYPES = [
  { id: 'headcount', label: 'Headcount', icon: 'Users' },
  { id: 'attendance', label: 'Attendance', icon: 'CalendarCheck' },
  { id: 'leave', label: 'Leave', icon: 'Palmtree' },
  { id: 'payroll', label: 'Payroll', icon: 'Banknote' },
  { id: 'employee-master', label: 'Employee Master', icon: 'FileSpreadsheet' },
  { id: 'helpdesk', label: 'Helpdesk', icon: 'LifeBuoy' },
];
