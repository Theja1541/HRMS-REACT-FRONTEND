import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { portalApi } from '../../../api';
import PageHeader from '../../../components/shared/PageHeader';
import DocumentDropzone from '../../employees/employeeWizard/DocumentDropzone';
import { useAuthStore } from '../../../store/auth.store';
import {
  CATEGORIES_REQUIRING_RECEIPT,
  REIMBURSEMENT_CATEGORIES,
  isDraftClaimId,
} from '../../../constants/reimbursement';
import {
  createDraftId,
  deleteDraftClaim,
  getDraftClaim,
  saveDraftClaim,
} from '../../../utils/reimbursementDrafts';

const RECEIPT_ACCEPT = 'image/jpeg,image/png,application/pdf,.pdf,.jpg,.jpeg,.png';

const emptyForm = () => ({
  claim_date: format(new Date(), 'yyyy-MM-dd'),
  category: 'other',
  amount: '',
  description: '',
});

export default function MeReimbursementFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, selectedTenantId } = useAuthStore();
  const isEdit = !!id && isDraftClaimId(id);

  const [form, setForm] = useState(emptyForm);
  const [receiptFile, setReceiptFile] = useState(null);
  const [error, setError] = useState('');
  const [draftId, setDraftId] = useState(() => (isEdit ? id : createDraftId()));

  useEffect(() => {
    if (!isEdit || !user?.id) return;
    const draft = getDraftClaim(user.id, selectedTenantId, id);
    if (!draft) {
      navigate('/me/reimbursements', { replace: true });
      return;
    }
    setForm({
      claim_date: draft.claim_date || format(new Date(), 'yyyy-MM-dd'),
      category: draft.category || 'other',
      amount: draft.amount != null ? String(draft.amount) : '',
      description: draft.description || '',
    });
    setDraftId(draft.id);
  }, [id, isEdit, user?.id, selectedTenantId, navigate]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('category', form.category);
      formData.append('amount', String(parseFloat(form.amount)));
      if (form.description?.trim()) formData.append('description', form.description.trim());
      if (receiptFile) formData.append('receipt', receiptFile);
      return portalApi.submitReimbursement(formData);
    },
    onSuccess: () => {
      if (getDraftClaim(user?.id, selectedTenantId, draftId)) {
        deleteDraftClaim(user?.id, selectedTenantId, draftId);
      }
      queryClient.invalidateQueries({ queryKey: ['my-reimbursements'] });
      navigate('/me/reimbursements');
    },
    onError: (err) => {
      setError(err.response?.data?.error?.message || 'Failed to submit claim');
    },
  });

  const validate = (forSubmit) => {
    const amount = parseFloat(form.amount);
    if (!form.claim_date) return 'Date is required';
    if (!form.category) return 'Category is required';
    if (!Number.isFinite(amount) || amount <= 0) return 'Enter a valid amount';
    if (forSubmit && CATEGORIES_REQUIRING_RECEIPT.includes(form.category) && !receiptFile) {
      return `Receipt is required for ${form.category} claims`;
    }
    return '';
  };

  const handleSaveDraft = () => {
    setError('');
    const validationError = validate(false);
    if (validationError) {
      setError(validationError);
      return;
    }
    saveDraftClaim(user?.id, selectedTenantId, {
      id: draftId,
      claim_date: form.claim_date,
      category: form.category,
      amount: parseFloat(form.amount),
      description: form.description?.trim() || '',
      has_receipt: !!receiptFile,
    });
    queryClient.invalidateQueries({ queryKey: ['my-reimbursements'] });
    navigate('/me/reimbursements');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const validationError = validate(true);
    if (validationError) {
      setError(validationError);
      return;
    }
    submitMutation.mutate();
  };

  if (isEdit && !getDraftClaim(user?.id, selectedTenantId, id)) {
    return <div className="p-8 text-center text-slate-400">Loading…</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        badge="My Work · Reimbursements"
        title={isEdit ? 'Edit Claim' : 'New Reimbursement Claim'}
        subtitle={isEdit ? 'Update your draft before submitting' : 'Fill in expense details and attach a receipt if required'}
        actions={(
          <Link to="/me/reimbursements" className="btn-secondary text-xs inline-flex items-center gap-1.5">
            <ArrowLeft size={14} /> Back to list
          </Link>
        )}
      />

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="text-xs font-medium text-slate-600">Date</label>
          <input
            type="date"
            value={form.claim_date}
            onChange={(e) => setForm({ ...form, claim_date: e.target.value })}
            required
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
          <p className="text-[10px] text-slate-400 mt-1">For reference only; submission date is recorded when you submit.</p>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            {REIMBURSEMENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Amount (₹)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
            placeholder="0.00"
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            maxLength={2000}
            placeholder="Purpose of expense, project/client reference…"
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>

        <DocumentDropzone
          label={
            CATEGORIES_REQUIRING_RECEIPT.includes(form.category)
              ? 'Receipt (required on submit for this category)'
              : 'Receipt (optional)'
          }
          accept={RECEIPT_ACCEPT}
          file={receiptFile}
          onFile={setReceiptFile}
          onClear={() => setReceiptFile(null)}
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="btn-secondary text-xs inline-flex items-center gap-1.5"
          >
            <Save size={14} /> Save as Draft
          </button>
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="btn-primary text-xs inline-flex items-center gap-1.5"
          >
            <Send size={14} />
            {submitMutation.isPending ? 'Submitting…' : 'Submit Claim'}
          </button>
          <Link to="/me/reimbursements" className="btn-secondary text-xs">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
