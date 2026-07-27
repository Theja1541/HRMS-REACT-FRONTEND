import { useEffect, useState } from 'react';
import { Pencil, Trash2, CheckCircle } from 'lucide-react';
import api from '../../api/client';
import AttendancePolicyForm from './AttendancePolicyForm';
import PageHeader from '../../components/shared/PageHeader';
import { cn } from '../../utils/helpers';

export default function AttendancePolicyPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance-policies');
      setPolicies(res.data?.data?.policies || []);
    } catch (err) {
      console.error('Failed to load policies', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this policy?')) return;
    try {
      await api.delete(`/attendance-policies/${id}`);
      fetchPolicies();
    } catch (err) {
      alert(err?.response?.data?.error?.message || 'Failed to delete policy');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await api.post(`/attendance-policies/${id}/set-default`);
      fetchPolicies();
    } catch (err) {
      alert(err?.response?.data?.error?.message || 'Failed to set default policy');
    }
  };

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading...</div>;

  if (isFormOpen) {
    return (
      <AttendancePolicyForm
        policy={editingPolicy}
        onClose={() => {
          setIsFormOpen(false);
          setEditingPolicy(null);
        }}
        onSave={() => {
          setIsFormOpen(false);
          setEditingPolicy(null);
          fetchPolicies();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        badge="People · Attendance"
        title="Attendance Policies"
        subtitle="Configure multiple attendance policies for your enterprise"
        actions={
          <button
            type="button"
            onClick={() => {
              setEditingPolicy(null);
              setIsFormOpen(true);
            }}
            className="btn-primary text-xs px-3 py-1.5"
          >
            Add Policy
          </button>
        }
      />

      <div className="card divide-y divide-slate-100">
        {policies.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">No policies found. Create one to get started.</div>
        ) : (
          policies.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">{p.name}</span>
                  {p.is_default && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span>{p.payroll_calculation_mode === 'hour_based' ? 'Hour Based' : 'Status Based'}</span>
                  <span>&bull;</span>
                  <span>{p.salary_proration_basis === 'working_days' ? 'Working Days' : p.salary_proration_basis === 'calendar_days' ? 'Calendar Days' : 'Standard Days'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!p.is_default && (
                  <button
                    type="button"
                    title="Set as Default"
                    onClick={() => handleSetDefault(p.id)}
                    className="p-1.5 text-slate-400 hover:text-brand-600 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  title="Edit Policy"
                  onClick={() => {
                    setEditingPolicy(p);
                    setIsFormOpen(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Delete Policy"
                  disabled={p.is_default}
                  onClick={() => handleDelete(p.id)}
                  className={cn("p-1.5 transition-colors", p.is_default ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-600')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
