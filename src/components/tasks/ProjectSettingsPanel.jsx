import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Archive } from 'lucide-react';
import { hrApi, employeeApi, departmentApi } from '../../api';
import { PROJECT_STATUS, PRIORITY_BADGE } from '../../constants/hr';
import { cn } from '../../utils/helpers';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  manager_id: z.string().optional(),
  department_id: z.string().optional(),
});

function toDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function formatDateLabel(value) {
  if (!value) return '—';
  try {
    return format(parseISO(toDateInput(value)), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

function ReadOnlyField({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800 mt-1">{children}</dd>
    </div>
  );
}

export default function ProjectSettingsPanel({ projectId, project, canManage, onArchived }) {
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [archiveError, setArchiveError] = useState('');

  const projectToFormValues = (p) => ({
    name: p.name || '',
    description: p.description || '',
    status: p.status || 'planning',
    priority: p.priority || 'medium',
    start_date: toDateInput(p.start_date),
    end_date: toDateInput(p.end_date),
    manager_id: p.manager_id ? String(p.manager_id) : '',
    department_id: p.department_id ? String(p.department_id) : '',
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-project-settings'],
    queryFn: () => employeeApi.list({ limit: 200, status: 'active' }),
    enabled: canManage,
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments-project-settings'],
    queryFn: () => departmentApi.list({ status: 'active' }),
    enabled: canManage,
  });

  const employees = empData?.data?.employees || [];
  const departments = deptData?.data?.departments || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      start_date: '',
      end_date: '',
      manager_id: '',
      department_id: '',
    },
  });

  useEffect(() => {
    if (!project) return;
    reset(projectToFormValues(project));
  }, [project, reset]);

  useEffect(() => {
    if (isDirty) setSaveSuccess(false);
  }, [isDirty]);

  const updateMutation = useMutation({
    mutationFn: (payload) => hrApi.updateProject(projectId, payload),
    onSuccess: () => {
      setSaveError('');
      setSaveSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-board', projectId] });
    },
    onError: (err) => {
      setSaveError(err.response?.data?.error?.message || 'Failed to update project');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => hrApi.archiveProject(projectId),
    onSuccess: () => {
      setArchiveError('');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects-archived'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.removeQueries({ queryKey: ['project', projectId] });
      queryClient.removeQueries({ queryKey: ['project-board', projectId] });
      onArchived?.();
    },
    onError: (err) => {
      setArchiveError(err.response?.data?.error?.message || 'Failed to archive project');
    },
  });

  const onSubmit = (data) => {
    setSaveError('');
    updateMutation.mutate({
      name: data.name,
      description: data.description || null,
      status: data.status,
      priority: data.priority,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      manager_id: data.manager_id ? parseInt(data.manager_id, 10) : null,
      department_id: data.department_id ? parseInt(data.department_id, 10) : null,
    });
  };

  const handleArchive = () => {
    const label = project?.code ? `${project.code} — ${project.name}` : project?.name || 'this project';
    if (
      !window.confirm(
        `Archive "${label}"?\n\nThe project will be hidden from the list. Tasks and history are kept and not permanently deleted.`
      )
    ) {
      return;
    }
    setArchiveError('');
    archiveMutation.mutate();
  };

  if (!project) {
    return <div className="card p-12 text-center text-slate-400">Loading settings…</div>;
  }

  if (!canManage) {
    return (
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Project Settings</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <ReadOnlyField label="Project Code">
            <span className="font-mono text-xs">{project.code}</span>
          </ReadOnlyField>
          <ReadOnlyField label="Name">{project.name}</ReadOnlyField>
          <ReadOnlyField label="Status">
            <span className={cn('inline-flex text-xs font-medium px-2 py-0.5 rounded capitalize', PROJECT_STATUS[project.status])}>
              {project.status?.replace('_', ' ')}
            </span>
          </ReadOnlyField>
          <ReadOnlyField label="Priority">
            <span className={cn('inline-flex text-xs font-medium px-2 py-0.5 rounded capitalize', PRIORITY_BADGE[project.priority])}>
              {project.priority}
            </span>
          </ReadOnlyField>
          <ReadOnlyField label="Project Manager">
            {project.manager
              ? `${project.manager.first_name} ${project.manager.last_name}`
              : '—'}
          </ReadOnlyField>
          <ReadOnlyField label="Department">
            {project.department?.name || '—'}
          </ReadOnlyField>
          <ReadOnlyField label="Start Date">{formatDateLabel(project.start_date)}</ReadOnlyField>
          <ReadOnlyField label="End Date">{formatDateLabel(project.end_date)}</ReadOnlyField>
          <div className="md:col-span-2">
            <ReadOnlyField label="Description">
              {project.description || '—'}
            </ReadOnlyField>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Project Settings</h3>
        <p className="text-xs text-slate-500 mb-5">
          Code: <span className="font-mono">{project.code}</span>
        </p>

        {saveError && (
          <div className="mb-4 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">
            {saveError}
          </div>
        )}

        {saveSuccess && (
          <div className="mb-4 bg-emerald-50 text-emerald-700 text-sm px-3 py-2 rounded-lg border border-emerald-100">
            Project updated successfully.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600">Name</label>
            <input
              {...register('name')}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Status</label>
              <select
                {...register('status')}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
              >
                {Object.keys(PROJECT_STATUS).map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Priority</label>
              <select
                {...register('priority')}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
              >
                {['low', 'medium', 'high'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Start Date</label>
              <input
                type="date"
                {...register('start_date')}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">End Date</label>
              <input
                type="date"
                {...register('end_date')}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Project Manager</label>
              <select
                {...register('manager_id')}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
              >
                <option value="">Select project manager…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Department</label>
              <select
                {...register('department_id')}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
              >
                <option value="">No department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => project && reset(projectToFormValues(project))}
              disabled={!isDirty || updateMutation.isPending}
              className="btn-secondary text-xs"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={!isDirty || updateMutation.isPending}
              className="btn-primary text-xs"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6 border-red-100">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Archive project</h3>
        <p className="text-xs text-slate-500 mb-4">
          Hide this project from the default list. Tasks, members, and history are retained — nothing is permanently deleted.
        </p>
        {archiveError && (
          <div className="mb-4 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">
            {archiveError}
          </div>
        )}
        <button
          type="button"
          onClick={handleArchive}
          disabled={archiveMutation.isPending || updateMutation.isPending}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-3 py-2 disabled:opacity-50"
        >
          <Archive size={14} />
          {archiveMutation.isPending ? 'Archiving…' : 'Archive Project'}
        </button>
      </div>
    </div>
  );
}
