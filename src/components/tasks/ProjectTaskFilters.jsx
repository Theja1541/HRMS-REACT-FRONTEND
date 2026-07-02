import { Search, X } from 'lucide-react';
import { TASK_STATUS } from '../../constants/hr';
import { hasActiveTaskFilters } from './projectTaskFilterUtils';

export default function ProjectTaskFilters({
  filters,
  onChange,
  sprints = [],
  labels = [],
  employees = [],
  labelsLoading = false,
  labelsError = false,
  onRetryLabels,
}) {
  const update = (patch) => onChange({ ...filters, ...patch });

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search tasks…"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="w-full text-sm border border-slate-200 rounded-lg pl-8 pr-3 py-1.5"
          />
        </div>
        {hasActiveTaskFilters(filters) && (
          <button
            type="button"
            onClick={() => onChange({
              search: '', status: '', assignee: '', priority: '', label: '', sprint: 'all',
            })}
            className="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
          >
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <select
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
        >
          <option value="">All statuses</option>
          {Object.entries(TASK_STATUS).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </select>

        <select
          value={filters.assignee}
          onChange={(e) => update({ assignee: e.target.value })}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
        >
          <option value="">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.first_name} {emp.last_name}
            </option>
          ))}
        </select>

        <select
          value={filters.priority}
          onChange={(e) => update({ priority: e.target.value })}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
        >
          <option value="">All priorities</option>
          {['low', 'medium', 'high', 'urgent'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          value={filters.label}
          onChange={(e) => update({ label: e.target.value })}
          disabled={labelsLoading}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
        >
          <option value="">All labels</option>
          {labels.length === 0 && !labelsLoading && (
            <option value="" disabled>No labels</option>
          )}
          {labels.map((label) => (
            <option key={label.id} value={label.id}>{label.name}</option>
          ))}
        </select>

        <select
          value={filters.sprint}
          onChange={(e) => update({ sprint: e.target.value })}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
        >
          <option value="all">All sprints</option>
          <option value="backlog">Backlog</option>
          {sprints.map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
          ))}
        </select>
      </div>

      {labelsError && (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <span>Failed to load labels</span>
          {onRetryLabels && (
            <button type="button" onClick={onRetryLabels} className="text-brand-600 hover:underline">
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
