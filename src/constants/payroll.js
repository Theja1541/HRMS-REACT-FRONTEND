export const PAYROLL_STATUS = {
  draft: 'bg-slate-100 text-slate-600',
  processing: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  paid: 'bg-emerald-50 text-emerald-700',
  locked: 'bg-slate-800 text-white',
};

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Manual entry types shown in the Add form (leave_encashment is system-generated). */
export const FEED_TYPES = [
  'bonus',
  'arrears',
  'reimbursement',
  'overtime',
  'incentive',
  'deduction',
  'other',
];

export const FEED_TYPE_META = {
  bonus: {
    label: 'Bonus',
    description: 'One-time bonus (festival, performance, etc.)',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    effect: 'earning',
  },
  arrears: {
    label: 'Arrears',
    description: 'Backdated salary or increment payout',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    effect: 'earning',
  },
  reimbursement: {
    label: 'Reimbursement',
    description: 'Expense payout via payroll (if not via claims module)',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    effect: 'earning',
  },
  overtime: {
    label: 'Overtime',
    description: 'Extra hours or shift allowance',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    effect: 'earning',
  },
  incentive: {
    label: 'Incentive',
    description: 'Sales or target-based incentive',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
    effect: 'earning',
  },
  deduction: {
    label: 'Deduction',
    description: 'One-time salary deduction',
    badge: 'bg-red-50 text-red-700 border-red-200',
    effect: 'deduction',
  },
  other: {
    label: 'Other',
    description: 'Miscellaneous earning or adjustment',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    effect: 'earning',
  },
  leave_encashment: {
    label: 'Leave encashment',
    description: 'Auto-created when leave encashment is approved',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    effect: 'earning',
    system: true,
  },
};
