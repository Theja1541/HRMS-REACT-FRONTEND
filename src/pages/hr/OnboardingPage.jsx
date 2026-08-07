import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  ClipboardList,
  Users,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { hrApi, employeeApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import OnboardingWorkflowBanner from '../../modules/Onboarding/OnboardingWorkflowBanner';
import {
  ONBOARDING_CATEGORIES,
  SAMPLE_TEMPLATE_TASKS,
  emptyTemplateForm,
  categoryLabel,
} from '../../modules/Onboarding/onboarding.constants';
import { cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { resolvePortalRole } from '../../utils/portalContext';

const TABS = [
  { id: 'template', label: 'Step 1 — Checklist Template', icon: ClipboardList },
  { id: 'active', label: 'Step 2 & 3 — Active Onboardings', icon: Users },
];

export default function OnboardingPage() {
  const queryClient = useQueryClient();
  const { user, workspace, roles, selectedRole, accessToken } = useAuthStore();
  const role = resolvePortalRole({ accessToken, workspace, user, roles, selectedRole });
  const isHrAdmin = ['super_admin', 'owner', 'hr', 'admin'].includes(role);
  const [tab, setTab] = useState(isHrAdmin ? 'template' : 'active');
  const [showInit, setShowInit] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm());
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['onboarding-templates'],
    queryFn: () => hrApi.listOnboardingTemplates(),
    staleTime: 30_000,
    enabled: isHrAdmin,
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['onboarding-tasks'],
    queryFn: () => hrApi.listOnboardingTasks(),
    staleTime: 15_000,
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-onboarding-candidates'],
    queryFn: () => employeeApi.list({ limit: 200 }),
    staleTime: 60_000,
  });

  const templates = templatesData?.data?.templates || [];
  const tasks = tasksData?.data?.tasks || [];
  const employees = empData?.data?.employees || [];

  const templatesReady = templates.length > 0;

  const grouped = useMemo(() => {
    return tasks.reduce((acc, t) => {
      const key = t.employee_id;
      if (!acc[key]) acc[key] = { employee: t.employee, tasks: [] };
      acc[key].tasks.push(t);
      return acc;
    }, {});
  }, [tasks]);

  const activeOnboardings = Object.values(grouped);
  const hasActiveOnboarding = activeOnboardings.length > 0;

  const employeeIdsWithTasks = useMemo(() => new Set(tasks.map((t) => t.employee_id)), [tasks]);

  const onboardingCandidates = useMemo(
    () =>
      employees.filter(
        (e) =>
          e.status === 'active' &&
          e.onboarding_status !== 'completed' &&
          !employeeIdsWithTasks.has(e.id)
      ),
    [employees, employeeIdsWithTasks]
  );

  const probationBlockedCandidates = useMemo(
    () =>
      employees.filter(
        (e) =>
          e.status === 'probation' &&
          e.onboarding_status !== 'completed' &&
          !employeeIdsWithTasks.has(e.id)
      ),
    [employees, employeeIdsWithTasks]
  );

  const templatesByCategory = useMemo(() => {
    const map = {};
    for (const cat of ONBOARDING_CATEGORIES) {
      map[cat.value] = templates.filter((t) => t.category === cat.value);
    }
    return map;
  }, [templates]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['onboarding-templates'] });
    queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['employees-onboarding-candidates'] });
  };

  const templateMutation = useMutation({
    mutationFn: hrApi.createOnboardingTemplate,
    onSuccess: () => {
      invalidateAll();
      setShowTemplate(false);
      setTemplateForm(emptyTemplateForm(templates.length + 1));
      setFormError('');
      showToast('success', 'Template task added');
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to save task'),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: hrApi.deleteOnboardingTemplate,
    onSuccess: () => {
      invalidateAll();
      showToast('success', 'Template task removed');
    },
    onError: (err) => showToast('error', err.response?.data?.error?.message || 'Failed to remove task'),
  });

  const seedSamplesMutation = useMutation({
    mutationFn: async () => {
      for (const task of SAMPLE_TEMPLATE_TASKS) {
        await hrApi.createOnboardingTemplate(task);
      }
    },
    onSuccess: () => {
      invalidateAll();
      showToast('success', 'Sample checklist loaded — review and customize');
    },
    onError: (err) => showToast('error', err.response?.data?.error?.message || 'Failed to load samples'),
  });

  const initMutation = useMutation({
    mutationFn: hrApi.initOnboarding,
    onSuccess: () => {
      invalidateAll();
      setShowInit(false);
      setEmployeeId('');
      setTab('active');
      showToast('success', 'Onboarding started — checklist assigned to employee');
    },
    onError: (err) => {
      const code = err.response?.data?.error?.code;
      const msg =
        err.response?.data?.error?.message ||
        (code === 'IN_PROBATION'
          ? 'Employee is in probation. Confirm probation in Probation Tracker before starting onboarding.'
          : 'Failed to start onboarding');
      setFormError(msg);
      if (code === 'NO_TEMPLATES') setTab('template');
      if (code === 'IN_PROBATION') showToast('error', msg);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id) => hrApi.updateOnboardingTask(id, { status: 'completed' }),
    onSuccess: () => {
      invalidateAll();
      showToast('success', 'Task marked complete');
    },
  });

  const openAddTemplate = () => {
    setTemplateForm(emptyTemplateForm(templates.length + 1));
    setFormError('');
    setShowTemplate(true);
  };

  const openStartOnboarding = () => {
    if (!templatesReady) {
      setTab('template');
      showToast('error', 'Create at least one template task before starting onboarding');
      return;
    }
    setEmployeeId('');
    setFormError('');
    setShowInit(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="People · Onboarding"
        title="Employee Onboarding"
        subtitle={
          isHrAdmin
            ? 'Template-first checklist for new joiners — define once, assign per employee'
            : 'Complete onboarding checklist tasks for your team'
        }
        actions={
          isHrAdmin && tab === 'template' ? (
            <div className="flex flex-wrap gap-2">
              {templates.length === 0 && (
                <button
                  type="button"
                  onClick={() => seedSamplesMutation.mutate()}
                  disabled={seedSamplesMutation.isPending}
                  className="btn-secondary"
                >
                  <Sparkles size={14} />
                  {seedSamplesMutation.isPending ? 'Loading…' : 'Load sample checklist'}
                </button>
              )}
              <button type="button" onClick={openAddTemplate} className="btn-primary">
                <Plus size={14} /> Add template task
              </button>
            </div>
          ) : isHrAdmin ? (
            <button
              type="button"
              onClick={openStartOnboarding}
              disabled={!templatesReady}
              className="btn-primary"
              title={!templatesReady ? 'Create checklist template first' : undefined}
            >
              <Plus size={14} /> Start onboarding
            </button>
          ) : null
        }
      />

      {toast && (
        <div
          className={cn(
            'text-sm px-4 py-3 rounded-lg border',
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
              : 'bg-red-50 text-red-700 border-red-100'
          )}
        >
          {toast.message}
        </div>
      )}

      {isHrAdmin && (
        <OnboardingWorkflowBanner
          templatesReady={templatesReady}
          hasActiveOnboarding={hasActiveOnboarding}
        />
      )}

      <div className="ds-tabs scroll-tabs" role="tablist">
        {(isHrAdmin ? TABS : TABS.filter((t) => t.id === 'active')).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(tab === t.id && 'ds-tab-active')}
            >
              <Icon size={14} />
              {t.label}
              {t.id === 'template' && (
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {templates.length}
                </span>
              )}
              {t.id === 'active' && hasActiveOnboarding && (
                <span className="bg-brand-100 text-brand-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {activeOnboardings.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'template' && (
        <div className="space-y-4">
          <div className="card p-4 bg-slate-50 border-dashed">
            <p className="text-sm text-slate-700">
              <strong>Checklist template</strong> is your company&apos;s master list of onboarding tasks. It is{' '}
              <em>not</em> tied to any employee yet. When you click <strong>Start onboarding</strong>, a copy is created
              for that joiner.
            </p>
          </div>

          {templatesLoading ? (
            <p className="text-sm text-slate-400 text-center py-12">Loading template…</p>
          ) : templates.length === 0 ? (
            <div className="card p-10 text-center">
              <ClipboardList className="mx-auto text-slate-300 mb-3" size={40} />
              <h3 className="text-sm font-semibold text-slate-800">No checklist template yet</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
                Add tasks your HR team runs for every new hire — document collection, IT setup, induction, statutory
                enrollment, etc.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                <button type="button" onClick={openAddTemplate} className="btn-primary">
                  <Plus size={14} /> Add first task
                </button>
                <button
                  type="button"
                  onClick={() => seedSamplesMutation.mutate()}
                  disabled={seedSamplesMutation.isPending}
                  className="btn-secondary"
                >
                  <Sparkles size={14} /> Load sample checklist
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ONBOARDING_CATEGORIES.map((cat) => (
                  <div key={cat.value} className="stat-card py-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">{cat.label}</p>
                    <p className="text-xl font-bold text-slate-900 mt-0.5">
                      {templatesByCategory[cat.value]?.length || 0}
                    </p>
                  </div>
                ))}
              </div>

              {ONBOARDING_CATEGORIES.map((cat) => {
                const items = templatesByCategory[cat.value] || [];
                if (!items.length) return null;
                return (
                  <div key={cat.value} className="card overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                      <h3 className="text-sm font-semibold text-slate-800">{cat.label}</h3>
                      <p className="text-xs text-slate-500">{cat.description}</p>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {items.map((t) => (
                        <li key={t.id} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50/50">
                          <span className="text-xs font-mono text-slate-400 w-6">{t.sort_order}</span>
                          <span className="flex-1 font-medium text-slate-800">{t.task_name}</span>
                          {t.is_mandatory ? (
                            <span className="text-[10px] font-semibold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                              Mandatory
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Optional</span>
                          )}
                          <button
                            type="button"
                            title="Remove from template"
                            disabled={deleteTemplateMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Remove "${t.task_name}" from the master checklist?`)) {
                                deleteTemplateMutation.mutate(t.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

              <div className="flex justify-end">
                <button type="button" onClick={() => setTab('active')} className="btn-primary">
                  Next: Start onboarding →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'active' && (
        <div className="space-y-4">
          {!templatesReady && (
            <div className="flex items-start gap-3 card p-4 border-amber-200 bg-amber-50">
              <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-medium text-amber-900">Checklist template required</p>
                <p className="text-xs text-amber-800 mt-1">
                  You must define onboarding tasks in <strong>Step 1</strong> before assigning them to employees.
                </p>
                <button type="button" onClick={() => setTab('template')} className="btn-secondary text-xs mt-3">
                  Go to checklist template
                </button>
              </div>
            </div>
          )}

          {tasksLoading ? (
            <p className="text-sm text-slate-400 text-center py-12">Loading active onboardings…</p>
          ) : !hasActiveOnboarding ? (
            <div className="card p-10 text-center">
              <Users className="mx-auto text-slate-300 mb-3" size={40} />
              <h3 className="text-sm font-semibold text-slate-800">No active onboardings</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
                {templatesReady
                  ? 'Select a new joiner to generate their checklist from your template.'
                  : 'Complete the checklist template first, then start onboarding for an employee.'}
              </p>
              {templatesReady && (
                <button type="button" onClick={openStartOnboarding} className="btn-primary mt-6">
                  <Plus size={14} /> Start onboarding for employee
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {activeOnboardings.map(({ employee, tasks: empTasks }) => {
                const sorted = [...empTasks].sort((a, b) => a.sort_order - b.sort_order);
                const done = sorted.filter((t) => t.status === 'completed').length;
                const pct = sorted.length ? Math.round((done / sorted.length) * 100) : 0;
                const allDone = done === sorted.length;

                return (
                  <div key={employee?.id} className="card p-5">
                    <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {employee?.first_name} {employee?.last_name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {employee?.emp_code}
                          {employee?.department?.name ? ` · ${employee.department.name}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn('text-2xl font-bold', allDone ? 'text-emerald-600' : 'text-brand-600')}>
                          {pct}%
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {done}/{sorted.length} tasks complete
                        </p>
                      </div>
                    </div>

                    <div className="h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', allDone ? 'bg-emerald-500' : 'bg-brand-600')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <ul className="space-y-2">
                      {sorted.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center gap-3 py-2 px-3 rounded-lg border border-slate-100 bg-slate-50/50"
                        >
                          <button
                            type="button"
                            onClick={() => t.status !== 'completed' && completeMutation.mutate(t.id)}
                            disabled={t.status === 'completed' || completeMutation.isPending}
                            className="shrink-0"
                            title={t.status === 'completed' ? 'Completed' : 'Mark complete'}
                          >
                            {t.status === 'completed' ? (
                              <CheckCircle2 size={18} className="text-emerald-600" />
                            ) : (
                              <Circle size={18} className="text-slate-300 hover:text-brand-500" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm', t.status === 'completed' && 'line-through text-slate-400')}>
                              {t.task_name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {categoryLabel(t.category)}
                              {t.due_date ? ` · Due ${t.due_date}` : ''}
                            </p>
                          </div>
                          {t.status === 'completed' ? (
                            <span className="text-[10px] font-semibold text-emerald-700 uppercase">Done</span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-700 uppercase">Pending</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          {templatesReady && onboardingCandidates.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Ready to onboard</h3>
              <p className="text-xs text-slate-500 mb-3">
                Employees without an active checklist ({onboardingCandidates.length})
              </p>
              <ul className="flex flex-wrap gap-2">
                {onboardingCandidates.slice(0, 8).map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setEmployeeId(String(e.id));
                        setFormError('');
                        setShowInit(true);
                      }}
                      className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50"
                    >
                      {e.emp_code} — {e.first_name} {e.last_name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {templatesReady && probationBlockedCandidates.length > 0 && (
            <div className="card p-4 border border-amber-200 bg-amber-50/60">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-amber-900 mb-1">
                    Waiting on probation confirmation
                  </h3>
                  <p className="text-xs text-amber-800 mb-3">
                    These employees are still in probation. Confirm probation in{' '}
                    <Link to="/probation-tracker" className="font-semibold underline underline-offset-2">
                      Probation Tracker
                    </Link>{' '}
                    before starting onboarding.
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {probationBlockedCandidates.slice(0, 8).map((e) => (
                      <li
                        key={e.id}
                        className="text-xs px-3 py-1.5 rounded-full border border-amber-200 bg-white text-amber-900"
                      >
                        {e.emp_code} — {e.first_name} {e.last_name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showInit && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Start employee onboarding</h3>
              <p className="text-xs text-slate-500 mt-1">
                Copies {templates.length} template task{templates.length === 1 ? '' : 's'} to the selected employee.
              </p>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
              )}
              <div>
                <label className="text-xs font-medium text-slate-600">Employee</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">Select new joiner…</option>
                  {onboardingCandidates.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.emp_code} — {e.first_name} {e.last_name}
                      {e.onboarding_status === 'pending' ? ' (not started)' : ''}
                    </option>
                  ))}
                </select>
                {onboardingCandidates.length === 0 && (
                  <p className="text-xs text-amber-700 mt-2">
                    {probationBlockedCandidates.length > 0 ? (
                      <>
                        No employees are ready to onboard yet. {probationBlockedCandidates.length} employee
                        {probationBlockedCandidates.length === 1 ? ' is' : 's are'} still in probation — confirm
                        them in{' '}
                        <Link to="/probation-tracker" className="font-semibold underline underline-offset-2">
                          Probation Tracker
                        </Link>{' '}
                        first.
                      </>
                    ) : (
                      'All active employees already have a checklist, or none are eligible.'
                    )}
                  </p>
                )}
                {probationBlockedCandidates.length > 0 && onboardingCandidates.length > 0 && (
                  <p className="text-xs text-amber-700 mt-2">
                    {probationBlockedCandidates.length} employee
                    {probationBlockedCandidates.length === 1 ? '' : 's'} in probation cannot be onboarded until
                    confirmed in{' '}
                    <Link to="/probation-tracker" className="font-semibold underline underline-offset-2">
                      Probation Tracker
                    </Link>
                    .
                  </p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowInit(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!employeeId || initMutation.isPending}
                  onClick={() => initMutation.mutate({ employee_id: parseInt(employeeId, 10) })}
                  className="btn-primary"
                >
                  {initMutation.isPending ? 'Starting…' : 'Start onboarding'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTemplate && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Add template task</h3>
              <p className="text-xs text-slate-500 mt-1">Added to the master checklist — not assigned to anyone yet.</p>
            </div>
            <form
              className="p-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setFormError('');
                templateMutation.mutate({
                  ...templateForm,
                  task_name: templateForm.task_name.trim(),
                  sort_order: parseInt(templateForm.sort_order, 10) || 0,
                });
              }}
            >
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
              )}
              <div>
                <label className="text-xs font-medium text-slate-600">Task name</label>
                <input
                  required
                  value={templateForm.task_name}
                  onChange={(e) => setTemplateForm({ ...templateForm, task_name: e.target.value })}
                  placeholder="e.g. Collect bank account details"
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Category</label>
                <select
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  {ONBOARDING_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Sort order</label>
                  <input
                    type="number"
                    min="0"
                    value={templateForm.sort_order}
                    onChange={(e) => setTemplateForm({ ...templateForm, sort_order: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateForm.is_mandatory}
                      onChange={(e) => setTemplateForm({ ...templateForm, is_mandatory: e.target.checked })}
                    />
                    Mandatory task
                  </label>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowTemplate(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={!templateForm.task_name.trim() || templateMutation.isPending} className="btn-primary">
                  {templateMutation.isPending ? 'Saving…' : 'Add to template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
