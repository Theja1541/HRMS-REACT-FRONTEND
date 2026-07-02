import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ArrowLeft, Kanban, UserPlus, LayoutGrid, List, FolderKanban, Search, CheckCircle2 } from 'lucide-react';
import { hrApi, employeeApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import ProjectKanbanBoard from '../../components/tasks/ProjectKanbanBoard';
import ProjectTaskListView from '../../components/tasks/ProjectTaskListView';
import ProjectTaskFilters from '../../components/tasks/ProjectTaskFilters';
import {
  EMPTY_TASK_FILTERS,
  buildTaskListParams,
  filterBoardTasks,
  applyClientTaskFilters,
  hasActiveTaskFilters,
} from '../../components/tasks/projectTaskFilterUtils';
import ProjectDashboardPanel from '../../components/tasks/ProjectDashboardPanel';
import ProjectSprintsPanel from '../../components/tasks/ProjectSprintsPanel';
import ProjectDependenciesPanel from '../../components/tasks/ProjectDependenciesPanel';
import ProjectSettingsPanel from '../../components/tasks/ProjectSettingsPanel';
import ProjectMembersPanel from '../../components/tasks/ProjectMembersPanel';
import ProjectBoardColumnsPanel from '../../components/tasks/ProjectBoardColumnsPanel';
import TaskDetailModal from '../../components/tasks/TaskDetailModal';
import { PROJECT_STATUS, PRIORITY_BADGE } from '../../constants/hr';
import { cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';

const PROJECT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PROJECT_TABS = [
  { id: 'board', label: 'Board' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'sprints', label: 'Sprints' },
  { id: 'dependencies', label: 'Dependencies' },
  { id: 'columns', label: 'Columns', managerOnly: true },
  { id: 'members', label: 'Team' },
  { id: 'settings', label: 'Settings' },
];

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canManage = ['super_admin', 'owner', 'hr', 'manager'].includes(user?.role);
  const [selectedId, setSelectedId] = useState(null);
  const [projectTab, setProjectTab] = useState('board');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [boardViewMode, setBoardViewMode] = useState('board');
  const [taskFilters, setTaskFilters] = useState(EMPTY_TASK_FILTERS);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [bulkAssigneeId, setBulkAssigneeId] = useState('');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [projectForm, setProjectForm] = useState({
    code: '', name: '', description: '', status: 'planning', priority: 'medium', manager_id: '', start_date: '', end_date: '',
  });
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', priority: 'medium', assignee_id: '', due_date: '', task_type: 'task', estimate_points: '',
  });

  const { data: listData, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => hrApi.listProjects(),
  });

  const { data: projectData } = useQuery({
    queryKey: ['project', selectedId],
    queryFn: () => hrApi.getProject(selectedId),
    enabled: !!selectedId,
  });

  const { data: boardData, isLoading: boardLoading } = useQuery({
    queryKey: ['project-board', selectedId],
    queryFn: () => hrApi.getProjectBoard(selectedId),
    enabled: !!selectedId,
  });

  const { data: sprintsData } = useQuery({
    queryKey: ['project-sprints', selectedId],
    queryFn: () => hrApi.listSprints(selectedId),
    enabled: !!selectedId,
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-projects'],
    queryFn: () => employeeApi.list({ limit: 200, status: 'active' }),
    enabled: (!!selectedId && projectTab === 'board') || showProjectForm || showTaskForm,
  });

  const { data: labelsData, isLoading: labelsLoading, isError: labelsError, refetch: refetchLabels } = useQuery({
    queryKey: ['project-labels', selectedId],
    queryFn: () => hrApi.listProjectLabels(selectedId),
    enabled: !!selectedId && projectTab === 'board',
  });

  const taskListParams = useMemo(() => buildTaskListParams(taskFilters), [taskFilters]);

  const {
    data: tasksListData,
    isLoading: tasksListLoading,
    isError: tasksListError,
    error: tasksListQueryError,
    refetch: refetchTasksList,
  } = useQuery({
    queryKey: ['project-tasks', selectedId, taskListParams],
    queryFn: () => hrApi.listProjectTasks(selectedId, taskListParams),
    enabled: !!selectedId && projectTab === 'board' && boardViewMode === 'list',
  });

  const createProjectMutation = useMutation({
    mutationFn: hrApi.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowProjectForm(false);
      setProjectForm({ code: '', name: '', description: '', status: 'planning', priority: 'medium', manager_id: '', start_date: '', end_date: '' });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (payload) => hrApi.createProjectTask(selectedId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-board', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-sprints', selectedId] });
      setShowTaskForm(false);
      setTaskForm({ title: '', description: '', priority: 'medium', assignee_id: '', due_date: '', task_type: 'task', estimate_points: '' });
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, ...payload }) => hrApi.moveTask(taskId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-board', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });

  const bulkAssignMutation = useMutation({
    mutationFn: (payload) => hrApi.bulkAssignTasks(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-board', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      setSelectedTaskIds(new Set());
      setBulkMode(false);
      setBulkAssigneeId('');
    },
  });

  const projects = listData?.data?.projects || [];
  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.name?.toLowerCase().includes(q)
        || p.code?.toLowerCase().includes(q)
        || p.manager?.first_name?.toLowerCase().includes(q)
        || p.manager?.last_name?.toLowerCase().includes(q)
      );
    });
  }, [projects, statusFilter, searchQuery]);

  const projectStats = useMemo(() => {
    const totalTasks = projects.reduce((sum, p) => sum + (p.task_counts?.total || 0), 0);
    const doneTasks = projects.reduce((sum, p) => sum + (p.task_counts?.done || 0), 0);
    return {
      total: projects.length,
      active: projects.filter((p) => p.status === 'active').length,
      totalTasks,
      doneTasks,
    };
  }, [projects]);

  const project = projectData?.data?.project;
  const board = boardData?.data?.board;
  const sprints = sprintsData?.data?.sprints || [];
  const employees = empData?.data?.employees || [];
  const labels = labelsData?.data?.labels || [];
  const activeSprint = sprints.find((s) => s.status === 'active');
  const filtersActive = hasActiveTaskFilters(taskFilters);

  const filteredBoard = useMemo(
    () => filterBoardTasks(board, taskFilters),
    [board, taskFilters]
  );

  const listTasks = useMemo(() => {
    const tasks = tasksListData?.data?.tasks || [];
    return applyClientTaskFilters(tasks, taskFilters);
  }, [tasksListData, taskFilters]);

  const allBoardTasks = useMemo(() => {
    if (!board?.columns) return [];
    return board.columns.flatMap((c) => c.tasks || []);
  }, [board]);

  const toggleTaskSelect = (taskId) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleBulkAssign = () => {
    if (!bulkAssigneeId || selectedTaskIds.size === 0) return;
    bulkAssignMutation.mutate({
      task_ids: [...selectedTaskIds],
      assignee_id: parseInt(bulkAssigneeId, 10),
    });
  };

  if (selectedId && project) {
    const totalTasks = board?.columns?.reduce((sum, c) => sum + (c.tasks?.length || 0), 0) || 0;
    const doneTasks = board?.columns?.find((c) => c.is_done_column)?.tasks?.length
      || board?.columns?.find((c) => c.status_mapping === 'done')?.tasks?.length
      || 0;

    return (
      <div className="space-y-6">
        <PageHeader
          title={project.name}
          subtitle={`${project.code} · PM: ${project.manager ? `${project.manager.first_name} ${project.manager.last_name}` : 'Not assigned'}`}
          actions={
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setSelectedTaskId(null);
                  setBulkMode(false);
                  setSelectedTaskIds(new Set());
                }}
                className="btn-secondary text-xs"
              >
                <ArrowLeft size={14} /> All Projects
              </button>
              {projectTab === 'board' && boardViewMode === 'board' && canManage && (
                <button
                  type="button"
                  onClick={() => setBulkMode(!bulkMode)}
                  className={cn('btn-secondary text-xs inline-flex items-center gap-1', bulkMode && 'ring-2 ring-brand-300')}
                >
                  <UserPlus size={14} /> Bulk Assign
                </button>
              )}
              <button type="button" onClick={() => setShowTaskForm(true)} className="btn-primary text-xs">
                <Plus size={14} /> Add Task
              </button>
            </div>
          }
        />

        <div className="flex gap-2 flex-wrap items-center">
          <span className={cn('text-xs font-medium px-2 py-1 rounded capitalize', PROJECT_STATUS[project.status])}>
            {project.status?.replace('_', ' ')}
          </span>
          <span className={cn('text-xs font-medium px-2 py-1 rounded capitalize', PRIORITY_BADGE[project.priority])}>
            {project.priority} priority
          </span>
          <span className="text-xs text-slate-500">{doneTasks}/{totalTasks} tasks done</span>
          {activeSprint && (
            <span className="text-xs font-medium px-2 py-1 rounded bg-emerald-50 text-emerald-700">
              {activeSprint.name}
            </span>
          )}
        </div>

        <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
          {PROJECT_TABS.filter((t) => !t.managerOnly || canManage).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setProjectTab(t.id)}
              className={cn(
                'px-4 py-2 text-xs font-medium border-b-2 -mb-px whitespace-nowrap',
                projectTab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {projectTab === 'board' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-white">
                <button
                  type="button"
                  onClick={() => setBoardViewMode('board')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    boardViewMode === 'board' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-800'
                  )}
                >
                  <LayoutGrid size={14} /> Board
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBoardViewMode('list');
                    setBulkMode(false);
                    setSelectedTaskIds(new Set());
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    boardViewMode === 'list' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-800'
                  )}
                >
                  <List size={14} /> List
                </button>
              </div>
            </div>

            <ProjectTaskFilters
              filters={taskFilters}
              onChange={setTaskFilters}
              sprints={sprints}
              labels={labels}
              employees={employees}
              labelsLoading={labelsLoading}
              labelsError={labelsError}
              onRetryLabels={refetchLabels}
            />

            {boardViewMode === 'board' ? (
              boardLoading ? (
                <div className="card p-12 text-center text-slate-400">Loading board…</div>
              ) : (
                <ProjectKanbanBoard
                  board={filteredBoard}
                  onMoveTask={(payload) => moveTaskMutation.mutate(payload)}
                  onTaskClick={(task) => setSelectedTaskId(task.id)}
                  isMoving={moveTaskMutation.isPending}
                  bulkMode={bulkMode}
                  selectedIds={selectedTaskIds}
                  onToggleSelect={toggleTaskSelect}
                  filtersActive={filtersActive}
                />
              )
            ) : (
              <ProjectTaskListView
                tasks={listTasks}
                sprints={sprints}
                isLoading={tasksListLoading}
                isError={tasksListError}
                error={tasksListQueryError}
                onRetry={refetchTasksList}
                onTaskClick={(task) => setSelectedTaskId(task.id)}
              />
            )}

            {boardViewMode === 'board' && bulkMode && selectedTaskIds.size > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-xl px-5 py-3 shadow-xl flex items-center gap-3 flex-wrap">
                <span className="text-sm">{selectedTaskIds.size} selected</span>
                <select
                  value={bulkAssigneeId}
                  onChange={(e) => setBulkAssigneeId(e.target.value)}
                  className="text-sm text-slate-900 rounded-lg px-2 py-1.5 min-w-[160px]"
                >
                  <option value="">Assign to…</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleBulkAssign}
                  disabled={!bulkAssigneeId || bulkAssignMutation.isPending}
                  className="btn-primary text-xs"
                >
                  {bulkAssignMutation.isPending ? 'Assigning…' : 'Assign'}
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedTaskIds(new Set()); setBulkMode(false); }}
                  className="text-xs text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        )}

        {projectTab === 'dashboard' && <ProjectDashboardPanel projectId={selectedId} />}

        {projectTab === 'sprints' && (
          <ProjectSprintsPanel projectId={selectedId} canManage={canManage} />
        )}

        {projectTab === 'dependencies' && (
          <ProjectDependenciesPanel
            projectId={selectedId}
            tasks={allBoardTasks}
            onTaskClick={setSelectedTaskId}
          />
        )}

        {projectTab === 'settings' && (
          <ProjectSettingsPanel
            projectId={selectedId}
            project={project}
            canManage={canManage}
          />
        )}

        {projectTab === 'members' && (
          <ProjectMembersPanel
            projectId={selectedId}
            project={project}
            canManage={canManage}
          />
        )}

        {projectTab === 'columns' && (
          <ProjectBoardColumnsPanel
            projectId={selectedId}
            canManage={canManage}
          />
        )}

        {selectedTaskId && (
          <TaskDetailModal
            taskId={selectedTaskId}
            projectId={selectedId}
            onClose={() => setSelectedTaskId(null)}
            onNavigateTask={(id) => setSelectedTaskId(id)}
            onUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ['project-board', selectedId] });
              queryClient.invalidateQueries({ queryKey: ['project-tasks', selectedId] });
              queryClient.invalidateQueries({ queryKey: ['project-dependencies', selectedId] });
            }}
          />
        )}

        {showTaskForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const payload = {
                  title: taskForm.title,
                  description: taskForm.description || undefined,
                  task_type: taskForm.task_type,
                  estimate_points: taskForm.estimate_points ? parseFloat(taskForm.estimate_points) : null,
                };
                if (canManage) {
                  payload.priority = taskForm.priority;
                  payload.due_date = taskForm.due_date || null;
                  payload.assignee_id = taskForm.assignee_id ? parseInt(taskForm.assignee_id, 10) : null;
                }
                if (activeSprint) payload.sprint_id = activeSprint.id;
                createTaskMutation.mutate(payload);
              }}
              className="bg-white rounded-xl p-6 w-full max-w-md space-y-3 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="font-semibold">New Task</h3>
              {activeSprint && (
                <p className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                  Will be added to active sprint: {activeSprint.name}
                </p>
              )}
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-medium">Title</label>
                <input required placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-medium">Description</label>
                <textarea placeholder="Optional details" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-medium">Type</label>
                <select value={taskForm.task_type} onChange={(e) => setTaskForm({ ...taskForm, task_type: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm capitalize">
                  {['task', 'bug', 'story', 'subtask'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {canManage && (
                <>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-medium">Priority</label>
                    <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm capitalize">
                      {['low', 'medium', 'high', 'urgent'].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-medium">Assignee</label>
                    <select value={taskForm.assignee_id} onChange={(e) => setTaskForm({ ...taskForm, assignee_id: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">Unassigned</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase text-slate-500 font-medium">Due date</label>
                      <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-slate-500 font-medium">Story points</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="Optional"
                        value={taskForm.estimate_points}
                        onChange={(e) => setTaskForm({ ...taskForm, estimate_points: e.target.value })}
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </>
              )}
              {!canManage && (
                <div>
                  <label className="text-[10px] uppercase text-slate-500 font-medium">Story points</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Optional"
                    value={taskForm.estimate_points}
                    onChange={(e) => setTaskForm({ ...taskForm, estimate_points: e.target.value })}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}
              {createTaskMutation.isError && (
                <p className="text-xs text-red-600">
                  {createTaskMutation.error?.response?.data?.error?.message || 'Failed to create task'}
                </p>
              )}
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setShowTaskForm(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" disabled={createTaskMutation.isPending} className="btn-primary text-xs">
                  {createTaskMutation.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects & Tasks"
        subtitle="Plan work, track sprints, and manage tasks on kanban boards"
        actions={canManage && (
          <button type="button" onClick={() => setShowProjectForm(true)} className="btn-primary">
            <Plus size={14} /> New Project
          </button>
        )}
      />

      <div className="card p-4 border border-slate-200 bg-slate-50/80">
        <div className="flex items-start gap-3">
          <FolderKanban size={20} className="text-brand-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">How projects work</p>
            <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { n: 1, title: 'Create project', text: 'Set code, manager, dates, and priority.' },
                { n: 2, title: 'Add tasks', text: 'Break work into tasks on the board or list view.' },
                { n: 3, title: 'Run sprints', text: 'Group tasks into sprints and track velocity.' },
                { n: 4, title: 'Deliver', text: 'Move tasks to Done and monitor progress on the dashboard.' },
              ].map(({ n, title, text }) => (
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total projects" value={projectStats.total} icon={FolderKanban} />
        <StatCard label="Active projects" value={projectStats.active} delta="In progress" deltaType="neutral" />
        <StatCard
          label="Tasks completed"
          value={`${projectStats.doneTasks}/${projectStats.totalTasks}`}
          icon={CheckCircle2}
          delta={projectStats.totalTasks ? `${Math.round((projectStats.doneTasks / projectStats.totalTasks) * 100)}% done` : 'No tasks yet'}
          deltaType="neutral"
        />
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code, or manager…"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm sm:w-44"
        >
          {PROJECT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-slate-400">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="card p-16 text-center">
          <Kanban size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">No projects yet</p>
          <p className="text-sm text-slate-400 mt-1">Create your first project to start tracking tasks.</p>
          {canManage && (
            <button type="button" onClick={() => setShowProjectForm(true)} className="btn-primary mt-4">
              <Plus size={14} /> New Project
            </button>
          )}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">No projects match your filters</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((p) => {
            const total = p.task_counts?.total || 0;
            const done = p.task_counts?.done || 0;
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className="card p-5 text-left hover:border-brand-300 hover:shadow-sm transition-all"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] text-slate-400">{p.code}</p>
                    <h3 className="font-semibold text-slate-800 mt-0.5 truncate">{p.name}</h3>
                  </div>
                  <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded capitalize shrink-0', PROJECT_STATUS[p.status])}>
                    {p.status?.replace('_', ' ')}
                  </span>
                </div>
                {p.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{p.description}</p>}
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>{done}/{total} tasks done</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 text-[10px] text-slate-400">
                  <span title="Project Manager">
                    PM: {p.manager ? `${p.manager.first_name} ${p.manager.last_name}` : '—'}
                  </span>
                  <span>
                    {(p.team_counts?.team_leaders || 0) > 0 && `${p.team_counts.team_leaders} lead · `}
                    {p.team_counts?.members ?? 0} members
                  </span>
                </div>
                {(p.start_date || p.end_date) && (
                  <p className="text-[10px] text-slate-400 mt-2">
                    {p.start_date || '—'} → {p.end_date || '—'}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {showProjectForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createProjectMutation.mutate({
                code: projectForm.code,
                name: projectForm.name,
                description: projectForm.description || undefined,
                status: projectForm.status,
                priority: projectForm.priority,
                manager_id: projectForm.manager_id ? parseInt(projectForm.manager_id, 10) : null,
                start_date: projectForm.start_date || null,
                end_date: projectForm.end_date || null,
              });
            }}
            className="bg-white rounded-xl p-6 w-full max-w-md space-y-3 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-semibold">New Project</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-medium">Code</label>
                <input required placeholder="PRJ-001" value={projectForm.code} onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-medium">Name</label>
                <input required placeholder="Project name" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-500 font-medium">Description</label>
              <textarea placeholder="Optional details" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-medium">Status</label>
                <select value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm capitalize">
                  {['planning', 'active', 'on_hold', 'completed', 'cancelled'].map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-medium">Priority</label>
                <select value={projectForm.priority} onChange={(e) => setProjectForm({ ...projectForm, priority: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm capitalize">
                  {['low', 'medium', 'high'].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-medium">Start date</label>
                <input type="date" value={projectForm.start_date} onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-medium">End date</label>
                <input type="date" value={projectForm.end_date} onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-500 font-medium">Project Manager</label>
              <select value={projectForm.manager_id} onChange={(e) => setProjectForm({ ...projectForm, manager_id: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select project manager…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
            </div>
            {createProjectMutation.isError && (
              <p className="text-xs text-red-600">
                {createProjectMutation.error?.response?.data?.error?.message || 'Failed to create project'}
              </p>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setShowProjectForm(false)} className="btn-secondary text-xs">Cancel</button>
              <button type="submit" disabled={createProjectMutation.isPending} className="btn-primary text-xs">
                {createProjectMutation.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
