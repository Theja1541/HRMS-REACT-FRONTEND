import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Clock, LogIn, LogOut, RefreshCw } from 'lucide-react';
import { attendanceApi } from '../../api';
import { cn, localDateString } from '../../utils/helpers';

export default function CheckInOutWidget() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [toast, setToast] = useState(null);

  const { data: todayRecord, isLoading, refetch } = useQuery({
    queryKey: ['today-attendance'],
    queryFn: () => attendanceApi.list({ date: localDateString() }),
    refetchInterval: 30000,
  });

  const record = todayRecord?.data?.records?.[0];
  const isCheckedIn = !!record?.check_in;
  const isCheckedOut = !!record?.check_out;

  const checkInMutation = useMutation({
    mutationFn: attendanceApi.checkIn,
    onSuccess: (res) => {
      refetch();
      setToast('Checked in successfully!');
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err) => {
      const message = err.response?.data?.error?.message || 'Failed to check in';
      setToast(message);
      setTimeout(() => setToast(null), 3000);
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: attendanceApi.checkOut,
    onSuccess: (res) => {
      refetch();
      setToast('Checked out successfully!');
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err) => {
      const message = err.response?.data?.error?.message || 'Failed to check out';
      setToast(message);
      setTimeout(() => setToast(null), 3000);
    },
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleCheckIn = () => {
    checkInMutation.mutate();
  };

  const handleCheckOut = () => {
    checkOutMutation.mutate();
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Attendance Check-In</h3>
          <p className="text-sm text-slate-500">{formatDate(currentTime)}</p>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Clock size={18} />
          <span className="text-2xl font-mono font-bold">{formatTime(currentTime)}</span>
        </div>
      </div>

      {toast && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 text-sm">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={cn(
          'p-4 rounded-lg border-2',
          isCheckedIn ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'
        )}>
          <p className="text-xs font-medium text-slate-500 uppercase mb-1">Check-In</p>
          <p className="text-lg font-mono font-semibold text-slate-800">
            {record?.check_in ? formatTime(new Date(record.check_in)) : '--:--:--'}
          </p>
        </div>
        <div className={cn(
          'p-4 rounded-lg border-2',
          isCheckedOut ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50'
        )}>
          <p className="text-xs font-medium text-slate-500 uppercase mb-1">Check-Out</p>
          <p className="text-lg font-mono font-semibold text-slate-800">
            {record?.check_out ? formatTime(new Date(record.check_out)) : '--:--:--'}
          </p>
        </div>
      </div>

      {record?.work_hours && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-100">
          <p className="text-xs font-medium text-slate-500 uppercase mb-1">Work Hours</p>
          <p className="text-lg font-mono font-semibold text-blue-700">{record.work_hours} hours</p>
          {record.break_minutes > 0 && (
            <p className="text-xs text-slate-500 mt-1">Break: {record.break_minutes} minutes</p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        {!isCheckedIn ? (
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={checkInMutation.isPending || isLoading}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            {checkInMutation.isPending ? 'Checking In...' : 'Check In'}
          </button>
        ) : !isCheckedOut ? (
          <button
            type="button"
            onClick={handleCheckOut}
            disabled={checkOutMutation.isPending || isLoading}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            {checkOutMutation.isPending ? 'Checking Out...' : 'Check Out'}
          </button>
        ) : (
          <div className="flex-1 text-center py-3 px-4 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium">
            Attendance completed for today
          </div>
        )}
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={18} className={cn(isLoading && 'animate-spin')} />
        </button>
      </div>

      {isCheckedIn && !isCheckedOut && (
        <p className="mt-4 text-xs text-slate-500 text-center">
          You are currently checked in. Don't forget to check out when you leave.
        </p>
      )}
    </div>
  );
}
