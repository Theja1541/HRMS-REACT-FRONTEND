/**
 * Build a chronological activity timeline from ticket + reply payloads.
 * Infers assignment and status-change timing from available fields only.
 */
export function buildTicketTimeline(ticket, { employeeName = 'Employee', assigneeName = 'Unassigned' } = {}) {
  if (!ticket) return [];

  const events = [];
  const replies = [...(ticket.replies || [])].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
  const assignee = assigneeName !== 'Unassigned' ? assigneeName : null;

  events.push({
    id: 'created',
    type: 'created',
    at: ticket.created_at,
    title: 'Ticket Created',
    description: `Raised by ${employeeName}`,
  });

  if (ticket.assigned_to && assignee) {
    const assignedAt =
      ticket.updated_at && new Date(ticket.updated_at) > new Date(ticket.created_at)
        ? ticket.updated_at
        : ticket.created_at;
    events.push({
      id: `assigned-${ticket.assigned_to}`,
      type: 'assigned',
      at: assignedAt,
      title: 'Assigned',
      description: `Assigned to ${assignee}`,
    });
  }

  const firstReply = replies[0];
  if (firstReply && ['in_progress', 'resolved', 'closed'].includes(ticket.status)) {
    events.push({
      id: 'status-in_progress',
      type: 'status_changed',
      at: firstReply.created_at,
      title: 'Status Changed',
      description: 'Changed to in progress',
    });
  }

  for (const reply of replies) {
    const author = reply.author
      ? `${reply.author.first_name} ${reply.author.last_name}`.trim()
      : 'Unknown';
    events.push({
      id: `reply-${reply.id}`,
      type: 'reply',
      at: reply.created_at,
      title: reply.is_internal ? 'Internal Note' : 'Reply',
      description: `${author}: ${reply.message}`,
      isInternal: Boolean(reply.is_internal),
    });
  }

  if (ticket.resolved_at) {
    events.push({
      id: 'resolved',
      type: 'resolved',
      at: ticket.resolved_at,
      title: 'Resolved',
      description: 'Ticket marked as resolved',
    });
  }

  if (ticket.escalated_at) {
    events.push({
      id: 'escalated',
      type: 'escalated',
      at: ticket.escalated_at,
      title: 'Escalated',
      description: 'SLA expired — HR Admin notified',
    });
  }

  if (ticket.status === 'closed') {
    const closedAt = ticket.updated_at || ticket.resolved_at || ticket.created_at;
    events.push({
      id: 'closed',
      type: 'closed',
      at: closedAt,
      title: 'Closed',
      description: 'Ticket closed',
    });
  }

  if (ticket.satisfaction_rating && ticket.satisfaction_rated_at) {
    events.push({
      id: 'satisfaction-rated',
      type: 'rated',
      at: ticket.satisfaction_rated_at,
      title: 'Support Rated',
      description: `${ticket.satisfaction_rating} out of 5 stars${ticket.satisfaction_feedback ? `: ${ticket.satisfaction_feedback}` : ''}`,
    });
  }

  const typeOrder = {
    created: 0,
    assigned: 1,
    status_changed: 2,
    escalated: 3,
    reply: 4,
    resolved: 5,
    closed: 6,
    rated: 7,
  };
  return events.sort((a, b) => {
    const diff = new Date(a.at) - new Date(b.at);
    if (diff !== 0) return diff;
    return (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
  });
}
