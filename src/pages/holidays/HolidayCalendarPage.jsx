import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  List,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { branchApi, holidayApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import { HOLIDAY_TYPES, getIndiaNationalHolidayPresets, holidayTypeMeta } from '../../constants/holidays';
import { cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/auth.store';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ADMIN_ROLES = ['super_admin', 'owner', 'hr'];

const EMPTY_FORM = {
  name: '',
  date: '',
  holiday_type: 'national',
  branch_id: '',
};

function holidayDateKey(h) {
  return String(h.date).slice(0, 10);
}

function holidayToForm(h) {
  return {
    name: h.name || '',
    date: holidayDateKey(h),
    holiday_type: h.holiday_type || 'national',
    branch_id: h.branch_id ? String(h.branch_id) : '',
  };
}

export default function HolidayCalendarPage() {
  const queryClient = useQueryClient();
  const { user, selectedTenantId } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;
  const canWrite = ADMIN_ROLES.includes(user?.role);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [branchFilter, setBranchFilter] = useState('');
  const [view, setView] = useState('calendar');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const monthDate = useMemo(() => new Date(year, month, 1), [year, month]);

  const listParams = useMemo(
    () => ({
      year,
      branch_id: branchFilter || undefined,
    }),
    [year, branchFilter]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['holidays', selectedTenantId, listParams],
    queryFn: () => holidayApi.list(listParams),
    enabled: !tenantRequired,
  });

  const { data: branchData } = useQuery({
    queryKey: ['branches', selectedTenantId],
    queryFn: () => branchApi.list(),
    enabled: !tenantRequired && canWrite,
  });

  const branches = branchData?.data?.branches || [];
  const holidays = data?.data?.holidays || [];

  const holidayMap = useMemo(() => {
    const map = new Map();
    holidays.forEach((h) => map.set(holidayDateKey(h), h));
    return map;
  }, [holidays]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [monthDate]);

  const monthHolidays = useMemo(
    () => holidays.filter((h) => isSameMonth(parseISO(holidayDateKey(h)), monthDate)),
    [holidays, monthDate]
  );

  const upcomingHolidays = useMemo(() => {
    const today = format(now, 'yyyy-MM-dd');
    return holidays.filter((h) => holidayDateKey(h) >= today).slice(0, 8);
  }, [holidays, now]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['holidays'] });

  const closeModal = () => {
    setModal(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const createMutation = useMutation({
    mutationFn: holidayApi.create,
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to create holiday'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => holidayApi.update(id, payload),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Failed to update holiday'),
  });

  const deleteMutation = useMutation({
    mutationFn: holidayApi.delete,
    onSuccess: invalidate,
    onError: (err) => window.alert(err.response?.data?.error?.message || 'Failed to delete holiday'),
  });

  const bulkMutation = useMutation({
    mutationFn: holidayApi.bulkCreate,
    onSuccess: (res) => {
      invalidate();
      window.alert(res?.message || 'Holidays imported');
    },
    onError: (err) => window.alert(err.response?.data?.error?.message || 'Import failed'),
  });

  const openCreate = (dateStr = '') => {
    setForm({ ...EMPTY_FORM, date: dateStr });
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (holiday) => {
    setForm(holidayToForm(holiday));
    setFormError('');
    setModal({ mode: 'edit', id: holiday.id });
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    date: form.date,
    holiday_type: form.holiday_type,
    branch_id: form.branch_id ? parseInt(form.branch_id, 10) : null,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.date) {
      setFormError('Name and date are required');
      return;
    }
    const payload = buildPayload();
    if (modal?.mode === 'edit') {
      updateMutation.mutate({ id: modal.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (holiday) => {
    if (!window.confirm(`Delete "${holiday.name}" on ${format(parseISO(holidayDateKey(holiday)), 'dd MMM yyyy')}?`)) return;
    deleteMutation.mutate(holiday.id);
  };

  const handleImportPresets = () => {
    const presets = getIndiaNationalHolidayPresets(year);
    if (!window.confirm(`Import ${presets.length} common Indian national holidays for ${year}? Existing dates are skipped.`)) return;
    bulkMutation.mutate({ holidays: presets });
  };

  const goPrevMonth = () => {
    const d = subMonths(monthDate, 1);
    setMonth(d.getMonth());
    setYear(d.getFullYear());
  };

  const goNextMonth = () => {
    const d = addMonths(monthDate, 1);
    setMonth(d.getMonth());
    setYear(d.getFullYear());
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Holiday Calendar"
        subtitle="Company-wide and branch holidays used in attendance, leave, and payroll"
        actions={
          canWrite && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleImportPresets}
                disabled={bulkMutation.isPending}
                className="btn-secondary"
              >
                <Download size={14} />
                {bulkMutation.isPending ? 'Importing…' : 'Import national holidays'}
              </button>
              <button type="button" onClick={() => openCreate()} className="btn-primary">
                <Plus size={14} /> Add Holiday
              </button>
            </div>
          )
        }
      />

      {tenantRequired && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
          Select a tenant to view the holiday calendar.
        </p>
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={goPrevMonth} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50" aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-lg font-semibold text-slate-900 min-w-[180px] text-center">
            {format(monthDate, 'MMMM yyyy')}
          </h2>
          <button type="button" onClick={goNextMonth} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50" aria-label="Next month">
            <ChevronRight size={16} />
          </button>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="ml-2 text-sm border border-slate-200 rounded-lg px-3 py-2"
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setYear(now.getFullYear());
              setMonth(now.getMonth());
            }}
            className="text-xs text-brand-600 hover:underline px-2"
          >
            Today
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1',
                view === 'calendar' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
              )}
            >
              <CalendarDays size={13} /> Calendar
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1',
                view === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
              )}
            >
              <List size={13} /> List
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
        <div className="card overflow-hidden p-0">
          {isLoading ? (
            <p className="p-12 text-center text-slate-400 text-sm">Loading calendar…</p>
          ) : error ? (
            <p className="p-12 text-center text-red-600 text-sm">Failed to load holidays</p>
          ) : view === 'list' ? (
            <div className="divide-y divide-slate-100">
              {holidays.length === 0 ? (
                <p className="p-12 text-center text-sm text-slate-400">No holidays for {year}</p>
              ) : (
                holidays.map((h) => {
                  const meta = holidayTypeMeta(h.holiday_type);
                  return (
                    <div key={h.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">{h.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {format(parseISO(holidayDateKey(h)), 'EEE, dd MMM yyyy')}
                          {h.branch?.name ? ` · ${h.branch.name}` : ' · All branches'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn('text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border', meta.badge)}>
                          {meta.label}
                        </span>
                        {canWrite && (
                          <>
                            <button type="button" onClick={() => openEdit(h)} className="p-1.5 text-slate-400 hover:text-brand-600 rounded">
                              <Pencil size={14} />
                            </button>
                            <button type="button" onClick={() => handleDelete(h)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const holiday = holidayMap.get(key);
                  const inMonth = isSameMonth(day, monthDate);
                  const weekend = day.getDay() === 0 || day.getDay() === 6;
                  const meta = holiday ? holidayTypeMeta(holiday.holiday_type) : null;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (holiday && canWrite) openEdit(holiday);
                        else if (!holiday && canWrite) openCreate(key);
                      }}
                      className={cn(
                        'min-h-[88px] border-b border-r border-slate-100 p-2 text-left transition-colors',
                        !inMonth && 'bg-slate-50/60 text-slate-300',
                        inMonth && weekend && !holiday && 'bg-violet-50/40',
                        inMonth && holiday && 'bg-amber-50/80',
                        canWrite && inMonth && 'hover:ring-1 hover:ring-inset hover:ring-brand-200 cursor-pointer',
                        !canWrite && 'cursor-default'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                            isToday(day) && 'bg-brand-600 text-white',
                            !isToday(day) && inMonth && 'text-slate-700',
                            !inMonth && 'text-slate-300'
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                      </div>
                      {holiday && (
                        <div className="mt-1">
                          <p className="text-[10px] font-semibold text-amber-900 leading-tight line-clamp-2" title={holiday.name}>
                            {holiday.name}
                          </p>
                          {meta && (
                            <span className={cn('inline-block mt-0.5 text-[9px] font-medium px-1 rounded', meta.badge)}>
                              {meta.label}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">This month</h3>
            {monthHolidays.length === 0 ? (
              <p className="text-xs text-slate-400">No holidays in {format(monthDate, 'MMMM')}</p>
            ) : (
              <ul className="space-y-2">
                {monthHolidays.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => (canWrite ? openEdit(h) : undefined)}
                      className="w-full text-left rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
                    >
                      <p className="text-sm font-medium text-slate-800">{h.name}</p>
                      <p className="text-[11px] text-slate-500">{format(parseISO(holidayDateKey(h)), 'EEE, dd MMM')}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Upcoming</h3>
            {upcomingHolidays.length === 0 ? (
              <p className="text-xs text-slate-400">No upcoming holidays</p>
            ) : (
              <ul className="space-y-2">
                {upcomingHolidays.map((h) => (
                  <li key={h.id} className="flex justify-between gap-2 text-sm">
                    <span className="text-slate-800 truncate">{h.name}</span>
                    <span className="text-slate-400 text-xs shrink-0">{format(parseISO(holidayDateKey(h)), 'dd MMM')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Legend</h3>
            <ul className="space-y-1.5">
              {HOLIDAY_TYPES.map((t) => (
                <li key={t.value} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className={cn('w-3 h-3 rounded border', t.badge)} />
                  {t.label}
                </li>
              ))}
              <li className="flex items-center gap-2 text-xs text-slate-600 pt-1">
                <span className="w-3 h-3 rounded bg-violet-100 border border-violet-200" />
                Weekend
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {modal.mode === 'edit' ? 'Edit Holiday' : 'Add Holiday'}
              </h2>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Holiday name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="e.g. Diwali"
                  maxLength={150}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                <select
                  value={form.holiday_type}
                  onChange={(e) => setForm({ ...form, holiday_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  {HOLIDAY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Branch scope</label>
                <select
                  value={form.branch_id}
                  onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">All branches (company-wide)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={isSaving} className="btn-primary">
                  {isSaving ? 'Saving…' : modal.mode === 'edit' ? 'Save changes' : 'Add holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
