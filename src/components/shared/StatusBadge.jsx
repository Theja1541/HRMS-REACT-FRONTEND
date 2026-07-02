import { cn, getInitials } from '../../utils/helpers';
import { ROLE_LABELS } from '../../constants/routes';

const ROLE_PILL = {
  super_admin: 'bg-violet-700 text-white',
  owner: 'bg-sky-800 text-white',
  hr: 'bg-emerald-800 text-white',
  manager: 'bg-amber-800 text-white',
  employee: 'bg-slate-600 text-white',
  pf_team: 'bg-blue-900 text-white',
  auditor: 'bg-indigo-900 text-white',
};

export default function StatusBadge({ status, className }) {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700',
    probation: 'bg-amber-50 text-amber-700',
    on_leave: 'bg-blue-50 text-blue-700',
    separated: 'bg-red-50 text-red-700',
    trial: 'bg-amber-50 text-amber-700',
    suspended: 'bg-red-50 text-red-700',
    expired: 'bg-red-50 text-red-700',
    pending: 'bg-amber-50 text-amber-700',
    free: 'bg-slate-100 text-slate-600',
    starter: 'bg-blue-50 text-blue-700',
    pro: 'bg-violet-50 text-violet-700',
    enterprise: 'bg-slate-900 text-white',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize',
        styles[status] || 'bg-slate-100 text-slate-600',
        className
      )}
    >
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

export function RoleBadge({ role }) {
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide', ROLE_PILL[role])}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

export function Avatar({ name, size = 'md', className }) {
  const sizes = { sm: 'w-6 h-6 text-[9px]', md: 'w-8 h-8 text-xs', lg: 'w-10 h-10 text-sm' };
  return (
    <div
      className={cn(
        'rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center shrink-0',
        sizes[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
