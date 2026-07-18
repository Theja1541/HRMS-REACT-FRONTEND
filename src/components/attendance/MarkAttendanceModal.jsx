import { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function MarkAttendanceModal({
  isOpen,
  onClose,
  employee,
  existingRecord,
  selectedDate,
  initialStatus,
  onSave,
  isPending,
}) {
  const [status, setStatus] = useState('present');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStatus(initialStatus || existingRecord?.status || 'present');
      
      const formatTime = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      };

      // If existing record has times, use them. Otherwise leave empty so user can mark separately.
      setCheckIn(existingRecord?.check_in ? formatTime(existingRecord.check_in) : '');
      setCheckOut(existingRecord?.check_out ? formatTime(existingRecord.check_out) : '');
      setNotes(existingRecord?.notes || '');
    }
  }, [isOpen, initialStatus, existingRecord]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Combine date and time to create full Date objects
    let checkInDate = null;
    let checkOutDate = null;
    
    if (checkIn) {
      checkInDate = new Date(`${selectedDate}T${checkIn}:00`).toISOString();
    }
    
    if (checkOut) {
      checkOutDate = new Date(`${selectedDate}T${checkOut}:00`).toISOString();
    }

    onSave({
      employee_id: employee.id,
      date: selectedDate,
      status,
      check_in: checkInDate,
      check_out: checkOutDate,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {existingRecord ? 'Edit Attendance' : 'Mark Attendance'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {employee.first_name} {employee.last_name} • {selectedDate}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              required
            >
              <option value="present">Present</option>
              <option value="half_day">Half Day</option>
              <option value="on_leave">Paid Leave</option>
              <option value="absent">Absent (LOP)</option>
              <option value="wfh">Work From Home</option>
              <option value="late">Late</option>
              <option value="comp_off">Comp Off</option>
            </select>
          </div>

          {(status === 'present' || status === 'half_day' || status === 'late' || status === 'wfh') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <Clock size={14} className="text-slate-400" />
                  Check In Time
                </label>
                <input
                  type="time"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <Clock size={14} className="text-slate-400" />
                  Check Out Time
                </label>
                <input
                  type="time"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder-slate-400"
              placeholder="Add any specific notes for this attendance record..."
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
