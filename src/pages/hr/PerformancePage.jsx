import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Rocket, Star, Target, Users, CheckCircle2, ClipboardList } from 'lucide-react';
import { hrApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { REVIEW_STATUSES } from '../../constants/hr';
import { cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';
import { useTablePagination } from '../../hooks/useTablePagination';

const REVIEW_PIPELINE = [
  { key: 'pending', label: 'Not started' },
  { key: 'self_review', label: 'Self review' },
  { key: 'manager_review', label: 'Manager review' },
  { key: 'completed', label: 'Completed' },
];

function PerformanceWorkflowBanner() {
  const steps = [
    { n: 1, title: 'Create cycle', text: 'Define annual, quarterly, or probation review period.' },
    { n: 2, title: 'Launch', text: 'Generate review records for all active employees.' },
    { n: 3, title: 'Self review', text: 'Employees rate themselves and add comments.' },
    { n: 4, title: 'Manager review', text: 'Managers rate direct reports and finalize scores.' },
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

export default function PerformancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = ['super_admin', 'owner', 'hr'].includes(user?.role);
  const isManager = user?.role === 'manager';
  const isManagerOnly = isManager && !isAdmin;
  const [tab, setTab] = useState(isManagerOnly ? 'team' : 'reviews');
  const [cycleFilter, setCycleFilter] = useState('');
  const [showCycleForm, setShowCycleForm] = useState(false);
  const { setPage, setLimit, paginateClient } = useTablePagination({ resetDeps: [tab, cycleFilter] });
  const [cycleForm, setCycleForm] = useState({
    name: '',
    cycle_type: 'annual',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: `${new Date().getFullYear()}-12-31`,
  });
  const [editingReview, setEditingReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    self_rating: '',
    self_comments: '',
    manager_rating: '',
    manager_comments: '',
    goals: '',
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

  const createCycle = useMutation({
    mutationFn: hrApi.createPerformanceCycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perf-cycles'] });
      setShowCycleForm(false);
    },
  });
  const launchCycle = useMutation({
    mutationFn: hrApi.launchPerformanceCycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perf-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['perf-reviews'] });
    },
  });
  const updateReview = useMutation({
    mutationFn: ({ id, ...payload }) => hrApi.updatePerformanceReview(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perf-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['perf-cycles'] });
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

  const submitReview = () => {
    const payload = {};
    if (canEditSelf && editingReview.status !== 'completed') {
      if (reviewForm.self_rating) payload.self_rating = parseFloat(reviewForm.self_rating);
      payload.self_comments = reviewForm.self_comments;
    }
    if (canEditManager) {
      if (reviewForm.manager_rating) {
        payload.manager_rating = parseFloat(reviewForm.manager_rating);
        payload.manager_comments = reviewForm.manager_comments;
      }
    }
    if (reviewForm.goals.trim()) {
      payload.goals = reviewForm.goals.split('\n').map((g) => g.trim()).filter(Boolean).map((title) => ({ title, status: 'pending' }));
    }
    updateReview.mutate({ id: editingReview.id, ...payload });
  };

  const openReview = (r) => {
    setEditingReview(r);
    const goalsText = Array.isArray(r.goals) ? r.goals.map((g) => g.title || g).join('\n') : '';
    setReviewForm({
      self_rating: r.self_rating || '',
      self_comments: r.self_comments || '',
      manager_rating: r.manager_rating || '',
      manager_comments: r.manager_comments || '',
      goals: goalsText,
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
        title="Performance"
        subtitle="Review cycles, goals, self-assessment, and manager ratings"
        actions={isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => setShowCycleForm(true)} className="btn-secondary">
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
          <div className="mt-3 max-w-md">
            <CycleProgressBar completed={activeCycle.completed_count} total={activeCycle.review_count} />
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200 scroll-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 text-xs font-medium border-b-2 -mb-px',
              tab === t.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'
            )}
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
              <div key={c.id} className="card p-5">
                <div className="flex justify-between items-start gap-2">
                  <p className="font-semibold text-slate-900">{c.name}</p>
                  <span className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
                    c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : c.status === 'draft' ? 'bg-slate-100 text-slate-600' : 'bg-slate-200 text-slate-600'
                  )}>
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 capitalize">{c.cycle_type}</p>
                <p className="text-xs text-slate-400 mt-2">{c.start_date} → {c.end_date}</p>
                <div className="mt-4">
                  <CycleProgressBar completed={c.completed_count} total={c.review_count} />
                </div>
                {isAdmin && c.status === 'draft' && (
                  <button
                    type="button"
                    onClick={() => launchCycle.mutate(c.id)}
                    disabled={launchCycle.isPending}
                    className="btn-primary text-xs mt-4 w-full"
                  >
                    <Rocket size={12} className="inline mr-1" /> Launch cycle
                  </button>
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

      {showCycleForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <h3 className="font-semibold mb-4">New Performance Cycle</h3>
            <label className="text-xs font-medium text-slate-600">Cycle name</label>
            <input
              value={cycleForm.name}
              onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
              placeholder="e.g. FY 2025 Annual Review"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-3 mt-1"
            />
            <label className="text-xs font-medium text-slate-600">Type</label>
            <select
              value={cycleForm.cycle_type}
              onChange={(e) => setCycleForm({ ...cycleForm, cycle_type: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-3 mt-1"
            >
              {['annual', 'quarterly', 'probation'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-medium text-slate-600">Start date</label>
                <input
                  type="date"
                  value={cycleForm.start_date}
                  onChange={(e) => setCycleForm({ ...cycleForm, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">End date</label>
                <input
                  type="date"
                  value={cycleForm.end_date}
                  onChange={(e) => setCycleForm({ ...cycleForm, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCycleForm(false)} className="btn-secondary">Cancel</button>
              <button type="button" disabled={!cycleForm.name || createCycle.isPending} onClick={() => createCycle.mutate(cycleForm)} className="btn-primary">
                {createCycle.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingReview && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-1">
              Performance Review — {editingReview.employee?.first_name} {editingReview.employee?.last_name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">{editingReview.cycle?.name}</p>

            <ReviewPipeline status={editingReview.status} />

            <div className="mt-5 space-y-4">
              {(canEditSelf || editingReview.self_rating) && editingReview.status !== 'completed' && (
                <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-700">Self assessment</p>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Self rating (1–5)</label>
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

              {(canEditManager || editingReview.manager_rating) && (
                <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-700">Manager assessment</p>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Manager rating (1–5)</label>
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

              {editingReview.status !== 'completed' && (
                <div>
                  <label className="text-xs font-medium text-slate-600">Goals (one per line)</label>
                  <textarea
                    value={reviewForm.goals}
                    onChange={(e) => setReviewForm({ ...reviewForm, goals: e.target.value })}
                    placeholder="Improve client delivery&#10;Complete certification&#10;Mentor junior team member"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mt-1"
                    rows={3}
                  />
                </div>
              )}

              {Array.isArray(editingReview.goals) && editingReview.goals.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">Goals</p>
                  <ul className="space-y-1">
                    {editingReview.goals.map((g, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-center gap-2">
                        <Target size={12} className="text-brand-600 shrink-0" />
                        {g.title || g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
