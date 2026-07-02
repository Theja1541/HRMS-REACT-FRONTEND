import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, X } from 'lucide-react';
import { platformApi } from '../../api';
import { formatSlaDuration } from '../../utils/helpdeskSla';
import MainContentModal from '../shared/MainContentModal';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

function ruleToForm(rule) {
  return {
    priority: rule.priority,
    duration_value: String(rule.duration_value),
    duration_unit: rule.duration_unit,
  };
}

export default function HelpdeskSlaSettings({ open, onClose }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['helpdesk-sla-rules'],
    queryFn: () => platformApi.getSlaRules(),
    enabled: open,
  });

  const [formRules, setFormRules] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const rules = data?.data?.rules;
    if (rules?.length) {
      setFormRules(rules.map(ruleToForm));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (rules) => platformApi.updateSlaRules({ rules }),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['helpdesk-sla-rules'] });
      queryClient.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['helpdesk-ticket'] });
      onClose();
    },
    onError: (err) => {
      setError(err.response?.data?.error?.message || 'Failed to save SLA rules');
    },
  });

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const rules = formRules.map((rule) => ({
      priority: rule.priority,
      duration_value: parseInt(rule.duration_value, 10),
      duration_unit: rule.duration_unit,
    }));
    saveMutation.mutate(rules);
  };

  const updateRule = (priority, field, value) => {
    setFormRules((prev) =>
      prev.map((rule) => (rule.priority === priority ? { ...rule, [field]: value } : rule))
    );
  };

  return (
    <MainContentModal open={open} onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-brand-600" />
            <h2 className="font-semibold text-slate-900">SLA Rules by Priority</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            Set response time targets per priority. SLA due time is calculated when a ticket is created.
          </p>

          {isLoading ? (
            <p className="text-sm text-slate-400 py-4 text-center">Loading rules…</p>
          ) : (
            <div className="space-y-3">
              {PRIORITY_OPTIONS.map((opt) => {
                const rule = formRules.find((r) => r.priority === opt.value);
                if (!rule) return null;
                return (
                  <div key={opt.value} className="flex items-center gap-3">
                    <span className="w-20 text-sm font-medium text-slate-700 shrink-0">{opt.label}</span>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={rule.duration_value}
                      onChange={(e) => updateRule(opt.value, 'duration_value', e.target.value)}
                      className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm"
                      required
                    />
                    <select
                      value={rule.duration_unit}
                      onChange={(e) => updateRule(opt.value, 'duration_unit', e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                    <span className="text-xs text-slate-400 w-24 shrink-0">
                      {formatSlaDuration(parseInt(rule.duration_value, 10) || 0, rule.duration_unit)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || saveMutation.isPending || formRules.length === 0}
              className="btn-primary text-sm"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save Rules'}
            </button>
          </div>
        </form>
      </div>
    </MainContentModal>
  );
}
