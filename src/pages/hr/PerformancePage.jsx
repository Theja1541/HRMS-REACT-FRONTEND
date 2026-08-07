import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Rocket,
  Star,
  Target,
  Users,
  CheckCircle2,
  ClipboardList,
  Pencil,
  Power,
  PowerOff,
  X,
  Trash2,
} from 'lucide-react';
import { hrApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { REVIEW_STATUSES } from '../../constants/hr';
import { cn, localDateString } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { usePortalRole } from '../../hooks/usePortalRole';
import { useTablePagination } from '../../hooks/useTablePagination';

const REVIEW_PIPELINE = [
  { key: 'pending', label: 'Not started' },
  { key: 'self_review', label: 'Self review' },
  { key: 'manager_review', label: 'Manager review' },
  { key: 'completed', label: 'Completed' },
];

const EMPTY_CYCLE_FORM = {
  name: '',
  cycle_type: 'annual',
  start_date: localDateString(),
  end_date: `${new Date().getFullYear()}-12-31`,
  goals: [''],
};

const GOAL_MATCH_OPTIONS = [
  { value: 'matched', label: 'Matched', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'not_matched', label: 'Not matched', activeClass: 'bg-red-600 text-white border-red-600' },
];

function PerformanceWorkflowBanner() {
  const steps = [
    { n: 1, title: 'Create cycle', text: 'Define period and set cycle goals.' },
    { n: 2, title: 'Launch', text: 'Generate reviews for active employees with those goals.' },
    { n: 3, title: 'Self review', text: 'Employees rate themselves and add comments.' },
    { n: 4, title: 'Manager review', text: 'Managers rate reports and mark goals matched / not matched.' },
  ];

  return (
    <div className="card p-4 border border-slate-200 bg-slate-50/80">
      <div className="flex items-start gap-3">
        <Target size={20} className="text-brand-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">How performance reviews work</p>
          <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ n, title, text }) => (
              <li key={n} className="rounded-lg bg-white border border-slate-200 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-brand-600">Step {n}</p>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{title}</p>
                <p className="text-xs text-slate-500 mt-1">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function CycleProgressBar({ completed, total }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
        <span>{completed}/{total} completed</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ReviewPipeline({ status }) {
  const currentIdx = REVIEW_PIPELINE.findIndex((s) => s.key === status);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {REVIEW_PIPELINE.map((step, i) => (
        <div key={step.key} className="flex items-center gap-1">
          <span
            className={cn(
              'text-[9px] font-semibold px-2 py-0.5 rounded-full',
              i <= currentIdx ? REVIEW_STATUSES[step.key] : 'bg-slate-100 text-slate-400'
            )}
          >
            {step.label}
          </span>
          {i < REVIEW_PIPELINE.length - 1 && <span className="text-slate-300 text-[10px]">→</span>}
        </div>
      ))}
    </div>
  );
}

function FieldLabel({ children, required }) {
  return (
    <label className="text-xs font-medium text-slate-600">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function GoalMatchBadge({ status }) {
  const styles = {
    matched: 'bg-emerald-50 text-emerald-700',
    not_matched: 'bg-red-50 text-red-700',
    pending: 'bg-slate-100 text-slate-600',
  };
  const labels = {
    matched: 'Matched',
    not_matched: 'Not matched',
    pending: 'Pending',
  };
  const key = status || 'pending';
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', styles[key] || styles.pending)}>
      {labels[key] || 'Pending'}
    </span>
  );
}

function CycleFormModal({ title, form, setForm, onClose, onSubmit, loading, submitLabel }) {
  const addGoal = () => setForm({ ...form, goals: [...form.goals, ''] });
  const updateGoal = (index, value) => {
    const goals = [...form.goals];
    goals[index] = value;
    setForm({ ...form, goals });
  };
  const removeGoal = (index) => {
    const goals = form.goals.filter((_, i) => i !== index);
    setForm({ ...form, goals: goals.length ? goals : [''] });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold mb-4">{title}</h3>
        <div className="space-y-3">
          <div>
            <FieldLabel required>Cycle name</FieldLabel>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. FY 2025 Annual Review"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mt-1"
            />
          </div>
          <div>
            <FieldLabel required>Type</FieldLabel>
            <select
              value={form.cycle_type}
              onChange={(e) => setForm({ ...form, cycle_type: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mt-1"
            >
              {['annual', 'quarterly', 'probation'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required>Start date</FieldLabel>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <FieldLabel required>End date</FieldLabel>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mt-1"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel>Cycle goals</FieldLabel>
              <button type="button" onClick={addGoal} className="text-xs font-medium text-brand-600 hover:text-brand-700 inline-flex items-center gap-1">
                <Plus size={12} /> Add goal
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 mb-2">
              Goals are copied to every employee review when the cycle is launched.
            </p>
            <div className="space-y-2">
              {form.goals.map((goal, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    value={goal}
                    onChange={(e) => updateGoal(index, e.target.value)}
                    placeholder={`Goal ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeGoal(index)}
                    className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Remove goal"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            type="button"
            disabled={!form.name.trim() || !form.start_date || !form.end_date || loading}
            onClick={onSubmit}
            className="btn-primary"
          >
            {loading ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function buildCyclePayload(form) {
  return {
    name: form.name.trim(),
    cycle_type: form.cycle_type,
    start_date: form.start_date,
    end_date: form.end_date,
    goals: form.goals.map((g) => g.trim()).filter(Boolean).map((title) => ({ title, status: 'pending' })),
  };
}

function cycleToForm(cycle) {
  const goals = Array.isArray(cycle.goals) && cycle.goals.length
    ? cycle.goals.map((g) => g.title || g)
    : [''];
  return {
    name: cycle.name || '',
    cycle_type: cycle.cycle_type || 'annual',
    start_date: cycle.start_date ? String(cycle.start_date).slice(0, 10) : '',
    end_date: cycle.end_date ? String(cycle.end_date).slice(0, 10) : '',
    goals,
  };
}

function normalizeReviewGoals(goals) {
  if (!Array.isArray(goals)) return [];
  return goals
    .map((g) => ({
      title: typeof g === 'string' ? g : (g.title || ''),
      status: ['matched', 'not_matched', 'pending'].includes(g?.status) ? g.status : 'pending',
    }))
    .filter((g) => g.title);
}

/** Prefer review goals; fall back to cycle goals when reviews were launched before goals existed. */
function resolveReviewGoals(review) {
  const fromReview = normalizeReviewGoals(review?.goals);
  if (fromReview.length) return fromReview;
  return normalizeReviewGoals(review?.cycle?.goals);
}

export default function PerformancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const role = usePortalRole();
  const isAdmin = ['super_admin', 'owner', 'hr'].includes(role);
  const isManager = role === 'manager';
  const isManagerOnly = isManager && !isAdmin;
  const [tab, setTab] = useState(isManagerOnly ? 'team' : 'reviews');
  const [cycleFilter, setCycleFilter] = useState('');
  const [cycleModal, setCycleModal] = useState(null);
  const [cycleForm, setCycleForm] = useState(EMPTY_CYCLE_FORM);
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [tab, cycleFilter] });
  const [editingReview, setEditingReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    self_rating: '',
    self_comments: '',
    manager_rating: '',
    manager_comments: '',
    goals: [],
  });

  const reviewParams = useMemo(() => {
    const params = {};
    if (cycleFilter) params.cycle_id = cycleFilter;
    if (tab === 'team' && (isManager || isAdmin)) params.my_team = 'true';
    return params;
  }, [tab, cycleFilter, isManager, isAdmin]);

  const { data: cyclesData } = useQuery({
    queryKey: ['perf-cycles'],
    queryFn: () => hrApi.listPerformanceCycles(),
  });
  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['perf-reviews', reviewParams],
    queryFn: () => hrApi.listPerformanceReviews(reviewParams),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['perf-cycles'] });
    queryClient.invalidateQueries({ queryKey: ['perf-reviews'] });
  };

  const createCycle = useMutation({
    mutationFn: hrApi.createPerformanceCycle,
    onSuccess: () => {
      invalidate();
      setCycleModal(null);
      setCycleForm(EMPTY_CYCLE_FORM);
    },
  });
  const updateCycle = useMutation({
    mutationFn: ({ id, payload }) => hrApi.updatePerformanceCycle(id, payload),
    onSuccess: () => {
      invalidate();
      setCycleModal(null);
      setCycleForm(EMPTY_CYCLE_FORM);
    },
  });
  const updateCycleStatus = useMutation({
    mutationFn: ({ id, status }) => hrApi.updatePerformanceCycleStatus(id, { status }),
    onSuccess: invalidate,
  });
  const launchCycle = useMutation({
    mutationFn: hrApi.launchPerformanceCycle,
    onSuccess: invalidate,
  });
  const updateReview = useMutation({
    mutationFn: ({ id, ...payload }) => hrApi.updatePerformanceReview(id, payload),
    onSuccess: () => {
      invalidate();
      setEditingReview(null);
    },
  });

  const cycles = cyclesData?.data?.cycles || [];
  const reviews = reviewsData?.data?.reviews || [];
  const { items: visibleReviews, pagination } = paginateClient(reviews);
  const draftCycle = cycles.find((c) => c.status === 'draft');
  const activeCycle = cycles.find((c) => c.status === 'active');

  const stats = useMemo(() => ({
    activeCycles: cycles.filter((c) => c.status === 'active').length,
    pendingReviews: reviews.filter((r) => r.status !== 'completed').length,
    completedReviews: reviews.filter((r) => r.status === 'completed').length,
    avgRating: (() => {
      const rated = reviews.filter((r) => r.final_rating);
      if (!rated.length) return null;
      return (rated.reduce((s, r) => s + parseFloat(r.final_rating), 0) / rated.length).toFixed(1);
    })(),
  }), [cycles, reviews]);

  const canEditSelf = editingReview && (user?.id === editingReview.employee_id || isAdmin);
  const canEditManager =
    editingReview &&
    (isAdmin || (isManager && editingReview.reviewer_id === user?.id));
  const canEditGoals =
    editingReview &&
    editingReview.status !== 'completed' &&
    (canEditSelf || canEditManager);

  const openCreateCycle = () => {
    setCycleForm(EMPTY_CYCLE_FORM);
    setCycleModal({ mode: 'create' });
  };

  const openEditCycle = (cycle) => {
    setCycleForm(cycleToForm(cycle));
    setCycleModal({ mode: 'edit', id: cycle.id });
  };

  const saveCycle = () => {
    const payload = buildCyclePayload(cycleForm);
    if (cycleModal?.mode === 'edit') {
      updateCycle.mutate({ id: cycleModal.id, payload });
    } else {
      createCycle.mutate(payload);
    }
  };

  const submitReview = () => {
    const payload = {};
    if (canEditSelf && editingReview.status !== 'completed') {
      if (reviewForm.self_rating) payload.self_rating = parseFloat(reviewForm.self_rating);
      payload.self_comments = reviewForm.self_comments;
    }
    if (canEditManager) {
      if (reviewForm.manager_rating) {
        payload.manager_rating = parseFloat(reviewForm.manager_rating);
      }
      payload.manager_comments = reviewForm.manager_comments;
    }
    // Always persist goal match status when the reviewer can edit.
    if (canEditGoals && reviewForm.goals.length > 0) {
      payload.goals = reviewForm.goals
        .filter((g) => g.title?.trim())
        .map((g) => ({
          title: g.title.trim(),
          status: g.status === 'matched' || g.status === 'not_matched' ? g.status : 'pending',
        }));
    }
    if (Object.keys(payload).length === 0) return;
    updateReview.mutate({ id: editingReview.id, ...payload });
  };

  const openReview = (r) => {
    const cycle = cycles.find((c) => c.id === r.cycle_id || c.id === r.cycle?.id) || r.cycle;
    const enriched = { ...r, cycle: cycle ? { ...r.cycle, ...cycle } : r.cycle };
    setEditingReview(enriched);
    setReviewForm({
      self_rating: r.self_rating || '',
      self_comments: r.self_comments || '',
      manager_rating: r.manager_rating || '',
      manager_comments: r.manager_comments || '',
      goals: resolveReviewGoals(enriched),
    });
  };

  const setGoalStatus = (index, status) => {
    setReviewForm((prev) => {
      const goals = [...prev.goals];
      goals[index] = { ...goals[index], status };
      return { ...prev, goals };
    });
  };

  const tabs = [
    ...(isManagerOnly
      ? [{ key: 'team', label: `My Team (${reviews.length})` }]
      : [{ key: 'reviews', label: `All Reviews (${reviews.length})` }]),
    ...(isAdmin && isManager ? [{ key: 'team', label: 'My Team' }] : []),
    { key: 'cycles', label: `Cycles (${cycles.length})` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="People · Performance"
        title="Performance"
        subtitle="Review cycles, goals, self-assessment, and manager ratings"
        actions={isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={openCreateCycle} className="btn-secondary">
              <Plus size={14} /> New Cycle
            </button>
            {draftCycle && (
              <button
                type="button"
                onClick={() => launchCycle.mutate(draftCycle.id)}
                disabled={launchCycle.isPending}
                className="btn-primary"
              >
                <Rocket size={14} /> Launch {draftCycle.name}
              </button>
            )}
          </div>
        )}
      />

      <PerformanceWorkflowBanner />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active cycles" value={stats.activeCycles} icon={ClipboardList} />
        <StatCard label="Pending reviews" value={stats.pendingReviews} icon={Users} delta="Awaiting action" deltaType="neutral" />
        <StatCard label="Completed" value={stats.completedReviews} icon={CheckCircle2} />
        <StatCard label="Avg final rating" value={stats.avgRating || '—'} icon={Star} delta="Completed reviews" deltaType="neutral" />
      </div>

      {activeCycle && (
        <div className="card p-4 border-l-4 border-brand-500">
          <p className="text-sm font-semibold text-slate-900">Current cycle: {activeCycle.name}</p>
          <p className="text-xs text-slate-500 mt-1 capitalize">
            {activeCycle.cycle_type} · {activeCycle.start_date} → {activeCycle.end_date}
          </p>
          {Array.isArray(activeCycle.goals) && activeCycle.goals.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {activeCycle.goals.map((g, i) => (
                <li key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                  {g.title || g}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 max-w-md">
            <CycleProgressBar completed={activeCycle.completed_count} total={activeCycle.review_count} />
          </div>
        </div>
      )}

      <div className="ds-tabs scroll-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(tab === t.key && 'ds-tab-active')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'cycles' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cycles.length === 0 ? (
            <div className="card p-12 text-center text-slate-400 col-span-full">No performance cycles yet</div>
          ) : (
            cycles.map((c) => (
              <div key={c.id} className="card p-5 flex flex-col">
                <div className="flex justify-between items-start gap-2">
                  <p className="font-semibold text-slate-900">{c.name}</p>
                  <span className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
                    c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : c.status === 'draft' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'
                  )}>
                    {c.status === 'closed' ? 'inactive' : c.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 capitalize">{c.cycle_type}</p>
                <p className="text-xs text-slate-400 mt-2">{c.start_date} → {c.end_date}</p>
                {Array.isArray(c.goals) && c.goals.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Goals</p>
                    <ul className="space-y-1">
                      {c.goals.slice(0, 4).map((g, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <Target size={11} className="text-brand-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{g.title || g}</span>
                        </li>
                      ))}
                      {c.goals.length > 4 && (
                        <li className="text-[10px] text-slate-400">+{c.goals.length - 4} more</li>
                      )}
                    </ul>
                  </div>
                )}
                <div className="mt-4">
                  <CycleProgressBar completed={c.completed_count} total={c.review_count} />
                </div>
                {isAdmin && (
                  <div className="mt-auto pt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => openEditCycle(c)} className="btn-secondary text-xs flex-1">
                      <Pencil size={12} className="inline mr-1" /> Edit
                    </button>
                    {c.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => launchCycle.mutate(c.id)}
                        disabled={launchCycle.isPending}
                        className="btn-primary text-xs flex-1"
                      >
                        <Rocket size={12} className="inline mr-1" /> Launch
                      </button>
                    )}
                    {c.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => updateCycleStatus.mutate({ id: c.id, status: 'closed' })}
                        disabled={updateCycleStatus.isPending}
                        className="btn-secondary text-xs flex-1 text-amber-700"
                      >
                        <PowerOff size={12} className="inline mr-1" /> Deactivate
                      </button>
                    )}
                    {c.status === 'closed' && (
                      <button
                        type="button"
                        onClick={() => updateCycleStatus.mutate({ id: c.id, status: 'active' })}
                        disabled={updateCycleStatus.isPending}
                        className="btn-primary text-xs flex-1"
                      >
                        <Power size={12} className="inline mr-1" /> Activate
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="card p-4">
            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-full sm:w-64"
            >
              <option value="">All cycles</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
              ))}
            </select>
          </div>

          <div className="card overflow-x-auto overscroll-x-contain">
            {isLoading ? (
              <p className="p-8 text-center text-slate-400">Loading reviews…</p>
            ) : reviews.length === 0 ? (
              <div className="p-12 text-center">
                <Target size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">No reviews yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  {isAdmin ? 'Create a cycle and launch it to generate employee reviews.' : 'Reviews will appear when HR launches a performance cycle.'}
                </p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Employee</th>
                    <th className="text-left px-4 py-3 font-semibold">Cycle</th>
                    <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Reviewer</th>
                    <th className="text-center px-4 py-3 font-semibold">Self</th>
                    <th className="text-center px-4 py-3 font-semibold">Manager</th>
                    <th className="text-center px-4 py-3 font-semibold">Final</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleReviews.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.employee?.first_name} {r.employee?.last_name}</p>
                        <p className="text-slate-400">{r.employee?.emp_code}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{r.cycle?.name}</td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                        {r.reviewer ? `${r.reviewer.first_name} ${r.reviewer.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">{r.self_rating ? <Rating value={r.self_rating} /> : '—'}</td>
                      <td className="px-4 py-3 text-center">{r.manager_rating ? <Rating value={r.manager_rating} /> : '—'}</td>
                      <td className="px-4 py-3 text-center font-bold">{r.final_rating || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', REVIEW_STATUSES[r.status])}>
                          {r.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openReview(r)} className="btn-secondary text-[10px] py-1">
                          {r.status === 'completed' ? 'View' : 'Review'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {!isLoading && reviews.length > 0 && (
            <TablePagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          )}
        </>
      )}

      {cycleModal && (
        <CycleFormModal
          title={cycleModal.mode === 'edit' ? 'Edit Performance Cycle' : 'New Performance Cycle'}
          form={cycleForm}
          setForm={setCycleForm}
          onClose={() => { setCycleModal(null); setCycleForm(EMPTY_CYCLE_FORM); }}
          onSubmit={saveCycle}
          loading={createCycle.isPending || updateCycle.isPending}
          submitLabel={cycleModal.mode === 'edit' ? 'Save changes' : 'Create'}
        />
      )}

      {editingReview && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold mb-1">
                  Performance Review — {editingReview.employee?.first_name} {editingReview.employee?.last_name}
                </h3>
                <p className="text-xs text-slate-500">{editingReview.cycle?.name}</p>
              </div>
              <button type="button" onClick={() => setEditingReview(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="mt-3">
              <ReviewPipeline status={editingReview.status} />
            </div>

            <div className="mt-5 space-y-4">
              {(canEditSelf || editingReview.self_rating || editingReview.self_comments) && (
                <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-700">Self assessment</p>
                  <div>
                    <FieldLabel>Self rating (1–5)</FieldLabel>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      step="0.5"
                      disabled={!canEditSelf || editingReview.status === 'completed'}
                      value={reviewForm.self_rating}
                      onChange={(e) => setReviewForm({ ...reviewForm, self_rating: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mt-1"
                    />
                  </div>
                  <textarea
                    value={reviewForm.self_comments}
                    disabled={!canEditSelf || editingReview.status === 'completed'}
                    onChange={(e) => setReviewForm({ ...reviewForm, self_comments: e.target.value })}
                    placeholder="Achievements, challenges, and growth areas…"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    rows={3}
                  />
                </div>
              )}

              {(canEditManager || editingReview.manager_rating || editingReview.manager_comments) && (
                <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-700">Manager assessment</p>
                  <div>
                    <FieldLabel>Manager rating (1–5)</FieldLabel>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      step="0.5"
                      disabled={!canEditManager || editingReview.status === 'completed'}
                      value={reviewForm.manager_rating}
                      onChange={(e) => setReviewForm({ ...reviewForm, manager_rating: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mt-1"
                    />
                  </div>
                  <textarea
                    value={reviewForm.manager_comments}
                    disabled={!canEditManager || editingReview.status === 'completed'}
                    onChange={(e) => setReviewForm({ ...reviewForm, manager_comments: e.target.value })}
                    placeholder="Manager feedback and development plan…"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    rows={3}
                  />
                </div>
              )}

              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-700 mb-1">Goal achievement</p>
                <p className="text-[10px] text-slate-400 mb-3">
                  For each goal, mark whether it was <strong>Matched</strong> or <strong>Not matched</strong>.
                </p>
                {reviewForm.goals.length === 0 ? (
                  <p className="text-xs text-slate-400">No goals defined for this cycle. Add goals on the cycle, then re-launch or edit the cycle.</p>
                ) : (
                  <ul className="space-y-3">
                    {reviewForm.goals.map((g, i) => (
                      <li key={i} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-3 space-y-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <Target size={14} className="text-brand-600 shrink-0 mt-0.5" />
                          <span className="text-sm text-slate-800 font-medium">{g.title}</span>
                        </div>
                        {canEditGoals ? (
                          <div className="flex flex-wrap gap-2 pl-5">
                            {GOAL_MATCH_OPTIONS.map((opt) => {
                              const selected = g.status === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setGoalStatus(i, opt.value)}
                                  className={cn(
                                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                                    selected
                                      ? opt.activeClass
                                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                  )}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                            {g.status === 'pending' && (
                              <span className="text-[10px] text-slate-400 self-center">Not marked yet</span>
                            )}
                          </div>
                        ) : (
                          <div className="pl-5">
                            <GoalMatchBadge status={g.status} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button type="button" onClick={() => setEditingReview(null)} className="btn-secondary">Close</button>
              {editingReview.status !== 'completed' && (
                <button type="button" onClick={submitReview} disabled={updateReview.isPending} className="btn-primary">
                  {updateReview.isPending ? 'Saving…' : 'Submit'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Rating({ value }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      <Star size={12} fill="currentColor" /> {value}
    </span>
  );
}
