import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Settings2, Clock, Moon, X } from 'lucide-react';
import { shiftApi, departmentApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../utils/helpers';
import CalendarColumnLegend from '../../components/attendance/CalendarColumnLegend';
import {
  buildDateMetaMap,
  columnTitle,
  dayOfWeekShort,
  getCalendarColumnClasses,
} from '../../utils/calendarGrid.utils';

const ADMIN_ROLES = ['super_admin', 'owner', 'hr'];

function formatTime(t) {
  if (!t) return '';
  return String(t).slice(0, 5);
}

function ShiftBadge({ shift }) {
  if (!shift) return <span className="text-slate-300">—</span>;
  if (shift.week_off) {
    return (
      <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-500">
        OFF
      </span>
    );
  }
  return (
    <span
      className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
      style={{ backgroundColor: shift.color || '#6366f1' }}
      title={`${shift.name} (${formatTime(shift.start_time)}–${formatTime(shift.end_time)})`}
    >
      {shift.code}
    </span>
  );
}

function normalizeTime(t) {
  if (!t) return '';
  const s = String(t).slice(0, 5);
  return s.length === 5 ? s : '';
}

function toApiTime(t) {
  const s = normalizeTime(t);
  return s ? `${s}:00` : s;
}

function buildShiftFormDefaults(initial) {
  if (initial) {
    return {
      name: initial.name || '',
      code: initial.code || '',
      start_time: normalizeTime(initial.start_time) || '09:00',
      end_time: normalizeTime(initial.end_time) || '18:00',
      color: initial.color || '#6366f1',
      is_overnight: Boolean(initial.is_overnight),
      sort_order: initial.sort_order ?? 0,
    };
  }
  return {
    name: '',
    code: '',
    start_time: '09:00',
    end_time: '18:00',
    color: '#6366f1',
    is_overnight: false,
    sort_order: 0,
  };
}

function validateShiftForm(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Shift name is required';
  if (!form.code?.trim()) errors.code = 'Shift code is required';
  else if (!/^[A-Z0-9_-]{1,20}$/.test(form.code.trim())) {
    errors.code = 'Use 1–20 uppercase letters, numbers, - or _';
  }
  if (!form.start_time) errors.start_time = 'Start time is required';
  if (!form.end_time) errors.end_time = 'End time is required';
  return errors;
}

function ShiftFormModal({ open, onClose, initial, onSave, saving, errorMessage }) {
  const [form, setForm] = useState(() => buildShiftFormDefaults(initial));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(buildShiftFormDefaults(initial));
      setErrors({});
    }
  }, [open, initial]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = validateShiftForm(form);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSave({
      ...form,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      start_time: toApiTime(form.start_time),
      end_time: toApiTime(form.end_time),
    });
  };

  const fieldClass = (key) =>
    cn('input mt-1 w-full', errors[key] && 'border-red-300 focus:border-red-400 focus:ring-red-100');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">{initial ? 'Edit Shift' : 'Add Shift'}</h3>
              <p className="text-[11px] text-slate-500">Define shift timing and roster display color</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="text-xs px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-100">{errorMessage}</div>
          )}

          <label className="block text-xs">
            <span className="text-slate-600 font-medium">
              Shift Name <span className="text-red-500">*</span>
            </span>
            <input
              className={fieldClass('name')}
              value={form.name}
              placeholder="e.g. Morning Shift"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {errors.name && <p className="text-[10px] text-red-500 mt-1">{errors.name}</p>}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">
              <span className="text-slate-600 font-medium">
                Code <span className="text-red-500">*</span>
              </span>
              <input
                className={cn(fieldClass('code'), 'font-mono uppercase')}
                value={form.code}
                placeholder="MS"
                maxLength={20}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
              {errors.code && <p className="text-[10px] text-red-500 mt-1">{errors.code}</p>}
            </label>
            <label className="text-xs">
              <span className="text-slate-600 font-medium">Roster Color</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  className="w-10 h-9 rounded border border-slate-200 cursor-pointer"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
                <span
                  className="inline-flex px-2 py-1 rounded text-[10px] font-bold text-white"
                  style={{ backgroundColor: form.color }}
                >
                  {form.code || 'PREVIEW'}
                </span>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">
              <span className="text-slate-600 font-medium">
                Start Time <span className="text-red-500">*</span>
              </span>
              <input
                type="time"
                className={fieldClass('start_time')}
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
              {errors.start_time && <p className="text-[10px] text-red-500 mt-1">{errors.start_time}</p>}
            </label>
            <label className="text-xs">
              <span className="text-slate-600 font-medium">
                End Time <span className="text-red-500">*</span>
              </span>
              <input
                type="time"
                className={fieldClass('end_time')}
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
              {errors.end_time && <p className="text-[10px] text-red-500 mt-1">{errors.end_time}</p>}
            </label>
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.is_overnight}
              onChange={(e) => setForm({ ...form, is_overnight: e.target.checked })}
            />
            <span className="text-xs text-slate-600">
              <span className="font-medium text-slate-700 inline-flex items-center gap-1">
                <Moon size={12} /> Overnight shift
              </span>
              <span className="block mt-0.5 text-slate-500">
                Enable when the shift ends on the next calendar day (e.g. 22:00–06:00). Used for correct working-hours
                and late-mark calculations.
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RotationModal({ open, onClose, shifts, employees, onApply, applying }) {
  const [selected, setSelected] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pattern, setPattern] = useState([{ shift_id: null, is_week_off: true }]);

  if (!open) return null;

  const toggleEmployee = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const addPatternSlot = () => setPattern([...pattern, { shift_id: shifts[0]?.id || null }]);
  const updateSlot = (idx, value) => {
    const next = [...pattern];
    next[idx] = value;
    setPattern(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Apply Rotational Pattern</h3>
        <p className="text-xs text-slate-500">
          Select employees and define a repeating shift cycle. The pattern repeats across the date range.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs">
            <span className="text-slate-500">From</span>
            <input type="date" className="input mt-1 w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="text-xs">
            <span className="text-slate-500">To</span>
            <input type="date" className="input mt-1 w-full" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Rotation pattern</p>
          <div className="flex flex-wrap gap-2">
            {pattern.map((slot, idx) => (
              <select
                key={idx}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                value={slot.is_week_off ? 'off' : slot.shift_id || ''}
                onChange={(e) => {
                  if (e.target.value === 'off') updateSlot(idx, { is_week_off: true, shift_id: null });
                  else updateSlot(idx, { is_week_off: false, shift_id: parseInt(e.target.value, 10) });
                }}
              >
                <option value="off">Week Off</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            ))}
            <button type="button" className="btn-secondary text-xs px-2 py-1" onClick={addPatternSlot}>
              + Day
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Employees ({selected.length} selected)</p>
          <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {employees.map((emp) => (
              <label key={emp.id} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={selected.includes(emp.id)} onChange={() => toggleEmployee(emp.id)} />
                <span className="font-mono text-slate-400">{emp.emp_code}</span>
                <span>{emp.first_name} {emp.last_name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={applying || !selected.length || !startDate || !endDate || !pattern.length}
            onClick={() =>
              onApply({
                employee_ids: selected,
                start_date: startDate,
                end_date: endDate,
                pattern,
              })
            }
          >
            {applying ? 'Applying…' : 'Apply Rotation'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShiftRosterPanel() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [departmentId, setDepartmentId] = useState('');
  const [shiftForm, setShiftForm] = useState({ open: false, item: null });
  const [shiftFormError, setShiftFormError] = useState('');
  const [rotationOpen, setRotationOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [bulkShift, setBulkShift] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const { data: deptData } = useQuery({
    queryKey: ['departments', 'active'],
    queryFn: () => departmentApi.list({ status: 'active' }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['shift-roster', month, year, departmentId],
    queryFn: () =>
      shiftApi.roster({
        month,
        year,
        ...(departmentId ? { department_id: departmentId } : {}),
      }),
  });

  useEffect(() => {
    setSelectedEmployees([]);
    setSelectedDates([]);
    setBulkShift('');
  }, [month, year, departmentId]);

  const saveEntryMutation = useMutation({
    mutationFn: shiftApi.saveRosterEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-roster'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-daily'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-register'] });
    },
    onError: (err) => showToast(err.response?.data?.error?.message || 'Failed to update roster', 'error'),
  });

  const bulkRosterMutation = useMutation({
    mutationFn: shiftApi.bulkRoster,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['shift-roster'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-daily'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-register'] });
      setSelectedEmployees([]);
      setSelectedDates([]);
      setBulkShift('');
      showToast(`Roster updated — ${res.data?.saved || 0} cell(s)`);
    },
    onError: (err) => showToast(err.response?.data?.error?.message || 'Bulk assign failed', 'error'),
  });

  const createShiftMutation = useMutation({
    mutationFn: shiftApi.createShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-roster'] });
      setShiftForm({ open: false, item: null });
      setShiftFormError('');
      showToast('Shift created');
    },
    onError: (err) => setShiftFormError(err.response?.data?.error?.message || 'Failed to create shift'),
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, payload }) => shiftApi.updateShift(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-roster'] });
      setShiftForm({ open: false, item: null });
      setShiftFormError('');
      showToast('Shift updated');
    },
    onError: (err) => setShiftFormError(err.response?.data?.error?.message || 'Failed to update shift'),
  });

  const rotateMutation = useMutation({
    mutationFn: shiftApi.applyRotation,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['shift-roster'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-daily'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-register'] });
      setRotationOpen(false);
      showToast(`Rotation applied — ${res.data?.assigned || 0} assignments`);
    },
  });

  const grid = data?.data?.grid || [];
  const dates = data?.data?.dates || [];
  const dateMetaMap = buildDateMetaMap(data?.data?.date_meta || []);
  const shifts = data?.data?.shifts || [];
  const departments = deptData?.data?.departments || [];
  const employees = grid.map((row) => row.employee);

  const shiftMonth = (delta) => {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  };

  const assignShift = (employeeId, date, value) => {
    if (value === '') {
      saveEntryMutation.mutate({ employee_id: employeeId, date, clear: true });
    } else if (value === 'off') {
      saveEntryMutation.mutate({ employee_id: employeeId, date, is_week_off: true, shift_id: null });
    } else if (value) {
      saveEntryMutation.mutate({ employee_id: employeeId, date, shift_id: parseInt(value, 10), is_week_off: false });
    }
  };

  const toggleEmployee = (id) => {
    setSelectedEmployees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleDate = (date) => {
    setSelectedDates((prev) => (prev.includes(date) ? prev.filter((x) => x !== date) : [...prev, date]));
  };

  const toggleAllEmployees = () => {
    if (selectedEmployees.length === employees.length) setSelectedEmployees([]);
    else setSelectedEmployees(employees.map((e) => e.id));
  };

  const toggleAllDates = () => {
    if (selectedDates.length === dates.length) setSelectedDates([]);
    else setSelectedDates([...dates]);
  };

  const applyBulkShift = () => {
    if (!selectedEmployees.length || !selectedDates.length || bulkShift === '') {
      showToast('Select employees, days, and a shift action', 'error');
      return;
    }
    const entries = [];
    for (const employee_id of selectedEmployees) {
      for (const date of selectedDates) {
        if (bulkShift === 'clear') {
          entries.push({ employee_id, date, clear: true });
        } else if (bulkShift === 'off') {
          entries.push({ employee_id, date, is_week_off: true, shift_id: null });
        } else {
          entries.push({ employee_id, date, shift_id: parseInt(bulkShift, 10), is_week_off: false });
        }
      }
    }
    bulkRosterMutation.mutate({ entries });
  };

  const bulkSelectionCount = selectedEmployees.length * selectedDates.length;
  const allEmployeesSelected = employees.length > 0 && selectedEmployees.length === employees.length;
  const allDatesSelected = dates.length > 0 && selectedDates.length === dates.length;

  return (
    <div className="space-y-4">
      {toast && (
        <div className={cn('text-xs px-3 py-2 rounded-lg', toast.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
          {toast.message}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white min-w-[160px]"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <button type="button" onClick={() => shiftMonth(-1)} className="btn-secondary p-2">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-medium px-2 min-w-[120px] text-center">
            {new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </span>
          <button type="button" onClick={() => shiftMonth(1)} className="btn-secondary p-2">
            <ChevronRight size={14} />
          </button>
        </div>

        <button type="button" className="btn-secondary text-xs" onClick={() => setRotationOpen(true)} disabled={!shifts.length}>
          <RefreshCw size={14} className="inline mr-1" />
          Apply Rotation
        </button>
        {isAdmin && (
          <button
            type="button"
            className="btn-primary text-xs"
            onClick={() => {
              setShiftFormError('');
              setShiftForm({ open: true, item: null });
            }}
          >
            <Plus size={14} className="inline mr-1" />
            Add Shift
          </button>
        )}
      </div>

      {isAdmin && shifts.length > 0 && (
        <div className="card p-3">
          <div className="flex items-center gap-2 mb-2">
            <Settings2 size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Shift Master</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {shifts.map((s) => (
              <button
                key={s.id}
                type="button"
                    onClick={() => {
                  setShiftFormError('');
                  setShiftForm({ open: true, item: s });
                }}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border border-slate-200 text-xs hover:bg-slate-50"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="font-medium">{s.name}</span>
                <span className="text-slate-400 font-mono">{s.code}</span>
                <span className="text-slate-400">{formatTime(s.start_time)}–{formatTime(s.end_time)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!shifts.length && !isLoading && (
        <div className="card p-6 text-center text-sm text-slate-500">
          No shifts configured yet. {isAdmin ? 'Add shifts to build the rotational roster.' : 'Ask HR to configure shifts.'}
        </div>
      )}

      <CalendarColumnLegend />

      {(selectedEmployees.length > 0 || selectedDates.length > 0) && (
        <div className="card p-3 flex flex-wrap items-center gap-3 bg-indigo-50 border-indigo-100">
          <span className="text-xs font-medium text-indigo-800">
            Bulk assign: {selectedEmployees.length} employee(s) × {selectedDates.length} day(s)
            {bulkSelectionCount > 0 && ` = ${bulkSelectionCount} cell(s)`}
          </span>
          <select
            value={bulkShift}
            onChange={(e) => setBulkShift(e.target.value)}
            className="text-xs border border-indigo-200 rounded-lg px-3 py-2 bg-white min-w-[140px]"
          >
            <option value="">Choose action…</option>
            <option value="clear">Clear (unassign)</option>
            <option value="off">Week Off</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary text-xs"
            disabled={bulkRosterMutation.isPending || !bulkSelectionCount || bulkShift === ''}
            onClick={applyBulkShift}
          >
            {bulkRosterMutation.isPending ? 'Applying…' : 'Apply to Selected'}
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => {
              setSelectedEmployees([]);
              setSelectedDates([]);
              setBulkShift('');
            }}
          >
            Clear Selection
          </button>
        </div>
      )}

      <p className="text-[11px] text-slate-500">
        Tip: Use checkboxes to select employees and click day numbers in the header to select multiple dates, then apply a shift in bulk.
      </p>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading roster…</div>
        ) : grid.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No employees in scope</div>
        ) : (
          <table className="w-full text-xs min-w-[900px] border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 px-2 py-2 text-center w-8 border-r border-slate-200">
                  <input
                    type="checkbox"
                    checked={allEmployeesSelected}
                    onChange={toggleAllEmployees}
                    title="Select all employees"
                  />
                </th>
                <th className="sticky left-8 z-10 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-500 min-w-[140px] border-r border-slate-200">
                  Employee
                </th>
                {dates.map((d) => {
                  const meta = dateMetaMap[d];
                  const col = getCalendarColumnClasses(meta?.day_type);
                  const dateSelected = selectedDates.includes(d);
                  return (
                    <th
                      key={d}
                      className={cn(
                        'px-0.5 py-2 text-center w-10 min-w-[2.5rem] cursor-pointer select-none',
                        col.header,
                        dateSelected && 'ring-2 ring-inset ring-indigo-400 bg-indigo-50'
                      )}
                      title={[dayOfWeekShort(d), columnTitle(meta), 'Click to select day'].filter(Boolean).join(' · ')}
                      onClick={() => toggleDate(d)}
                    >
                      {parseInt(d.slice(-2), 10)}
                    </th>
                  );
                })}
              </tr>
              <tr className="bg-slate-50 border-t border-slate-100">
                <th colSpan={2} className="sticky left-0 z-10 bg-slate-50 px-3 py-1 text-left border-r border-slate-200">
                  <button type="button" className="text-[10px] text-indigo-600 hover:underline" onClick={toggleAllDates}>
                    {allDatesSelected ? 'Deselect all days' : 'Select all days'}
                  </button>
                </th>
                {dates.map((d) => (
                  <th key={`sel-${d}`} className="px-0 py-1 text-center">
                    <input
                      type="checkbox"
                      className="scale-75"
                      checked={selectedDates.includes(d)}
                      onChange={() => toggleDate(d)}
                      title={`Select ${d}`}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grid.map(({ employee, days }) => {
                const empSelected = selectedEmployees.includes(employee.id);
                return (
                <tr key={employee.id} className={cn(empSelected && 'bg-indigo-50/40')}>
                  <td
                    className={cn(
                      'sticky left-0 z-10 px-2 py-2 text-center border-r border-slate-200',
                      empSelected ? 'bg-indigo-50' : 'bg-white'
                    )}
                  >
                    <input type="checkbox" checked={empSelected} onChange={() => toggleEmployee(employee.id)} />
                  </td>
                  <td
                    className={cn(
                      'sticky left-8 z-10 px-3 py-2 font-medium text-slate-800 whitespace-nowrap border-r border-slate-200',
                      empSelected ? 'bg-indigo-50' : 'bg-white'
                    )}
                  >
                    <span className="text-slate-400 font-mono mr-1">{employee.emp_code}</span>
                    {employee.first_name} {employee.last_name}
                  </td>
                  {days.map((day) => {
                    const meta = dateMetaMap[day.date];
                    const col = getCalendarColumnClasses(meta?.day_type);
                    const notEmployed = day.day_type === 'not_employed';
                    const cellSelected =
                      !notEmployed &&
                      selectedEmployees.includes(employee.id) &&
                      selectedDates.includes(day.date);
                    return (
                      <td
                        key={day.date}
                        className={cn(
                          'px-0.5 py-1 text-center align-top',
                          col.cell,
                          cellSelected && 'ring-2 ring-inset ring-indigo-300',
                          notEmployed && 'opacity-40'
                        )}
                        title={
                          notEmployed
                            ? 'Not employed on this date'
                            : columnTitle(meta)
                        }
                      >
                        {notEmployed ? (
                          <div className="w-10 h-7 text-[9px] text-slate-400 flex items-center justify-center">—</div>
                        ) : (
                          <>
                        <select
                          className="w-10 h-7 text-[9px] border-0 bg-transparent text-center cursor-pointer appearance-none"
                          value={day.is_week_off ? 'off' : day.shift_id || ''}
                          onChange={(e) => assignShift(employee.id, day.date, e.target.value)}
                          title={day.shift?.name || (day.is_week_off ? 'Week off' : 'Unassigned')}
                        >
                          <option value="">—</option>
                          <option value="off">OFF</option>
                          {shifts.map((s) => (
                            <option key={s.id} value={s.id}>{s.code}</option>
                          ))}
                        </select>
                        <div className="flex justify-center">
                          <ShiftBadge shift={day.is_week_off ? { week_off: true } : day.shift} />
                        </div>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ShiftFormModal
        key={shiftForm.item?.id || 'new'}
        open={shiftForm.open}
        initial={shiftForm.item}
        errorMessage={shiftFormError}
        onClose={() => {
          setShiftFormError('');
          setShiftForm({ open: false, item: null });
        }}
        saving={createShiftMutation.isPending || updateShiftMutation.isPending}
        onSave={(form) => {
          setShiftFormError('');
          if (shiftForm.item) updateShiftMutation.mutate({ id: shiftForm.item.id, payload: form });
          else createShiftMutation.mutate(form);
        }}
      />

      <RotationModal
        open={rotationOpen}
        onClose={() => setRotationOpen(false)}
        shifts={shifts}
        employees={employees}
        applying={rotateMutation.isPending}
        onApply={(payload) => rotateMutation.mutate(payload)}
      />
    </div>
  );
}
