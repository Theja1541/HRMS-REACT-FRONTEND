export const EMPTY_TASK_FILTERS = {
  search: '',
  status: '',
  assignee: '',
  priority: '',
  label: '',
  sprint: 'all',
};

export function hasActiveTaskFilters(filters) {
  return Boolean(
    filters.search?.trim()
    || filters.status
    || filters.assignee
    || filters.priority
    || filters.label
    || (filters.sprint && filters.sprint !== 'all')
  );
}

export function buildTaskListParams(filters) {
  const params = { limit: 500 };
  const search = filters.search?.trim();
  if (search) params.search = search;
  if (filters.status) params.status = filters.status;
  if (filters.assignee && filters.assignee !== 'unassigned') params.assignee = filters.assignee;
  if (filters.priority) params.priority = filters.priority;
  if (filters.label) params.label = filters.label;
  if (filters.sprint && filters.sprint !== 'all' && filters.sprint !== 'backlog') {
    params.sprint_id = filters.sprint;
  }
  return params;
}

export function taskMatchesFilters(task, filters) {
  const search = filters.search?.trim().toLowerCase();
  if (search) {
    const haystack = [task.title, task.task_key, task.description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(search)) return false;
  }
  if (filters.status && task.status !== filters.status) return false;
  if (filters.assignee === 'unassigned') {
    if (task.assignee_id) return false;
  } else if (filters.assignee && String(task.assignee_id) !== String(filters.assignee)) {
    return false;
  }
  if (filters.priority && task.priority !== filters.priority) return false;
  if (filters.label && !(task.labels || []).some((l) => String(l.id) === String(filters.label))) {
    return false;
  }
  if (filters.sprint === 'backlog') {
    if (task.sprint_id) return false;
  } else if (filters.sprint && filters.sprint !== 'all') {
    if (task.sprint_id !== parseInt(filters.sprint, 10)) return false;
  }
  return true;
}

export function filterBoardTasks(board, filters) {
  if (!board?.columns || !hasActiveTaskFilters(filters)) return board;
  return {
    ...board,
    columns: board.columns.map((col) => ({
      ...col,
      tasks: (col.tasks || []).filter((task) => taskMatchesFilters(task, filters)),
    })),
  };
}

export function applyClientTaskFilters(tasks, filters) {
  return (tasks || []).filter((task) => taskMatchesFilters(task, filters));
}
