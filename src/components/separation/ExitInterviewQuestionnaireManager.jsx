import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { hrApi } from '../../api';

const QUESTION_TYPES = [
  ['text', 'Short text'],
  ['textarea', 'Long text'],
  ['rating', 'Rating'],
  ['boolean', 'Yes / No'],
  ['single_choice', 'Single choice'],
  ['multi_choice', 'Multiple choice'],
];

const EMPTY_FORM = {
  name: '',
  description: '',
  exit_type: '',
  is_default: false,
  is_active: true,
  rating_scale: {
    min: 1,
    max: 5,
    labels: { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very good', 5: 'Excellent' },
  },
  questions: [
    {
      key: 'overall_experience',
      label: 'How would you rate your overall experience?',
      type: 'rating',
      required: true,
      options: [],
    },
  ],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export default function ExitInterviewQuestionnaireManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(clone(EMPTY_FORM));
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['exit-interview-questionnaires'],
    queryFn: () => hrApi.listExitInterviewQuestionnaires({ include_inactive: true }),
  });
  const questionnaires = data?.data?.questionnaires || [];

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editingId
        ? hrApi.updateExitInterviewQuestionnaire(editingId, payload)
        : hrApi.createExitInterviewQuestionnaire(payload),
    onSuccess: () => {
      setMessage('Questionnaire saved');
      setEditingId(null);
      setForm(clone(EMPTY_FORM));
      queryClient.invalidateQueries({ queryKey: ['exit-interview-questionnaires'] });
    },
    onError: (err) =>
      setMessage(err.response?.data?.error?.message || 'Unable to save questionnaire'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => hrApi.deactivateExitInterviewQuestionnaire(id),
    onSuccess: () => {
      setMessage('Questionnaire deactivated');
      queryClient.invalidateQueries({ queryKey: ['exit-interview-questionnaires'] });
    },
  });

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(''), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const edit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || '',
      description: row.description || '',
      exit_type: row.exit_type || '',
      is_default: row.is_default === true,
      is_active: row.is_active !== false,
      rating_scale: row.rating_scale || clone(EMPTY_FORM.rating_scale),
      questions: clone(row.questions || []),
    });
  };

  const updateQuestion = (index, patch) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch } : question
      ),
    }));
  };

  const submit = () => {
    if (!form.name.trim() || !form.questions.length) {
      setMessage('Name and at least one question are required');
      return;
    }
    const questions = form.questions.map((question, index) => ({
      ...question,
      key:
        question.key?.trim() ||
        `question_${index + 1}`,
      label: question.label.trim(),
      options:
        typeof question.options === 'string'
          ? question.options
              .split(',')
              .map((entry) => entry.trim())
              .filter(Boolean)
          : question.options || [],
    }));
    saveMutation.mutate({
      ...form,
      name: form.name.trim(),
      description: form.description || null,
      exit_type: form.exit_type || null,
      questions,
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Questionnaires</h3>
          <button
            type="button"
            className="btn-secondary text-[10px] py-1"
            onClick={() => {
              setEditingId(null);
              setForm(clone(EMPTY_FORM));
            }}
          >
            <Plus size={12} /> New
          </button>
        </div>
        {isLoading ? (
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" /> Loading…
          </p>
        ) : questionnaires.length === 0 ? (
          <p className="text-xs text-slate-400">No configured questionnaires yet.</p>
        ) : (
          <div className="space-y-2">
            {questionnaires.map((row) => (
              <div key={row.id} className="border border-slate-100 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{row.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {row.exit_type || 'All exit types'} · {row.questions?.length || 0} questions
                    </p>
                    <div className="flex gap-1 mt-1">
                      {row.is_default && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-700">
                          Default
                        </span>
                      )}
                      {!row.is_active && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="p-1 text-slate-500" onClick={() => edit(row)}>
                      <Edit3 size={13} />
                    </button>
                    {row.is_active && (
                      <button
                        type="button"
                        className="p-1 text-red-500"
                        onClick={() => deactivateMutation.mutate(row.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="xl:col-span-2 card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">
            {editingId ? 'Edit questionnaire' : 'New questionnaire'}
          </h3>
          {editingId && (
            <button
              type="button"
              className="text-xs text-slate-500"
              onClick={() => {
                setEditingId(null);
                setForm(clone(EMPTY_FORM));
              }}
            >
              <X size={13} className="inline" /> Cancel
            </button>
          )}
        </div>

        {message && <p className="text-xs text-brand-700 bg-brand-50 rounded-lg p-2">{message}</p>}

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-[10px] text-slate-500">
            Name *
            <input
              className="input text-xs w-full mt-1"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="text-[10px] text-slate-500">
            Applies to
            <select
              className="input text-xs w-full mt-1"
              value={form.exit_type}
              onChange={(e) => setForm({ ...form, exit_type: e.target.value })}
            >
              <option value="">All exit types</option>
              <option value="resignation">Resignation</option>
              <option value="termination">Termination</option>
              <option value="retirement">Retirement</option>
              <option value="absconding">Absconding</option>
            </select>
          </label>
        </div>

        <label className="text-[10px] text-slate-500 block">
          Description
          <textarea
            className="input text-xs w-full mt-1 resize-none"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>

        <div className="grid sm:grid-cols-3 gap-3">
          <label className="text-[10px] text-slate-500">
            Rating minimum
            <input
              type="number"
              min={0}
              max={9}
              className="input text-xs w-full mt-1"
              value={form.rating_scale.min}
              onChange={(e) =>
                setForm({
                  ...form,
                  rating_scale: { ...form.rating_scale, min: Number(e.target.value) },
                })
              }
            />
          </label>
          <label className="text-[10px] text-slate-500">
            Rating maximum
            <input
              type="number"
              min={1}
              max={10}
              className="input text-xs w-full mt-1"
              value={form.rating_scale.max}
              onChange={(e) =>
                setForm({
                  ...form,
                  rating_scale: { ...form.rating_scale, max: Number(e.target.value) },
                })
              }
            />
          </label>
          <div className="flex items-end gap-4 pb-2">
            <label className="inline-flex gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              />
              Default
            </label>
            <label className="inline-flex gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Active
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-700">Questions</h4>
            <button
              type="button"
              className="btn-secondary text-[10px] py-1"
              onClick={() =>
                setForm({
                  ...form,
                  questions: [
                    ...form.questions,
                    {
                      key: `question_${form.questions.length + 1}`,
                      label: '',
                      type: 'textarea',
                      required: false,
                      options: [],
                    },
                  ],
                })
              }
            >
              <Plus size={12} /> Add question
            </button>
          </div>

          {form.questions.map((question, index) => (
            <div key={`${question.key}-${index}`} className="border border-slate-100 rounded-xl p-3">
              <div className="grid sm:grid-cols-12 gap-2">
                <input
                  className="input text-xs sm:col-span-2"
                  placeholder="key_name"
                  value={question.key}
                  onChange={(e) =>
                    updateQuestion(index, {
                      key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                    })
                  }
                />
                <input
                  className="input text-xs sm:col-span-5"
                  placeholder="Question"
                  value={question.label}
                  onChange={(e) => updateQuestion(index, { label: e.target.value })}
                />
                <select
                  className="input text-xs sm:col-span-2"
                  value={question.type}
                  onChange={(e) => updateQuestion(index, { type: e.target.value })}
                >
                  {QUESTION_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <label className="inline-flex items-center gap-1 text-[10px] text-slate-500 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={question.required}
                    onChange={(e) => updateQuestion(index, { required: e.target.checked })}
                  />
                  Required
                </label>
                <button
                  type="button"
                  className="text-red-500 justify-self-end"
                  onClick={() =>
                    setForm({
                      ...form,
                      questions: form.questions.filter((_, questionIndex) => questionIndex !== index),
                    })
                  }
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {['single_choice', 'multi_choice'].includes(question.type) && (
                <input
                  className="input text-xs w-full mt-2"
                  placeholder="Options separated by commas"
                  value={
                    Array.isArray(question.options)
                      ? question.options.join(', ')
                      : question.options || ''
                  }
                  onChange={(e) => updateQuestion(index, { options: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="btn-primary text-xs"
            disabled={saveMutation.isPending}
            onClick={submit}
          >
            <Save size={13} /> {saveMutation.isPending ? 'Saving…' : 'Save questionnaire'}
          </button>
        </div>
      </div>
    </div>
  );
}
