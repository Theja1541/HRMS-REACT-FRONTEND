const TERMINAL_STATUSES = new Set(['resolved', 'closed']);

export function formatSlaDuration(value, unit) {
  if (!value) return '—';
  return unit === 'hours' ? `${value} hour${value === 1 ? '' : 's'}` : `${value} day${value === 1 ? '' : 's'}`;
}

export function formatSlaRemaining(remainingMs) {
  if (remainingMs == null) return '—';
  if (remainingMs <= 0) return 'Overdue';

  const totalMinutes = Math.floor(remainingMs / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m left`;

  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    const mins = totalMinutes % 60;
    return mins > 0 ? `${totalHours}h ${mins}m left` : `${totalHours}h left`;
  }

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours > 0 ? `${days}d ${hours}h left` : `${days}d left`;
}

export function getSlaDisplay(ticket, now = Date.now()) {
  if (!ticket?.sla_due_at) {
    return { label: '—', overdue: false, active: false, status: 'none' };
  }

  const dueMs = new Date(ticket.sla_due_at).getTime();
  const isTerminal = TERMINAL_STATUSES.has(ticket.status);

  if (isTerminal) {
    const closedAt = ticket.resolved_at ? new Date(ticket.resolved_at).getTime() : now;
    const breached = closedAt > dueMs;
    return {
      label: breached ? 'SLA Breached' : 'SLA Met',
      overdue: breached,
      active: false,
      status: breached ? 'breached' : 'met',
    };
  }

  if (now >= dueMs) {
    return { label: 'Overdue', overdue: true, active: true, status: 'overdue' };
  }

  return {
    label: formatSlaRemaining(dueMs - now),
    overdue: false,
    active: true,
    status: 'on_track',
  };
}

export function isActiveSlaOverdue(ticket, now = Date.now()) {
  if (!ticket?.sla_due_at) return false;
  if (TERMINAL_STATUSES.has(ticket.status)) return false;
  return now >= new Date(ticket.sla_due_at).getTime();
}
