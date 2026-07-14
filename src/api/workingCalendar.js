import api from './client';

export const getWorkingCalendar = () => api.get('/attendance/working-calendar');
export const updateWorkingCalendar = (payload) => api.put('/attendance/working-calendar', payload);
