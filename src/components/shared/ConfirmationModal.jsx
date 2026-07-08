import MainContentModal from './MainContentModal';
import { cn } from '../../utils/helpers';

/**
 * Confirmation dialog — uses MainContentModal (app shell modal root).
 */
export default function ConfirmationModal({
  open,
  title = 'Confirm',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onClose,
  onConfirm,
  isPending = false,
  destructive = true,
}) {
  return (
    <MainContentModal open={open} onClose={onClose} className="max-w-sm">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mx-auto">
        <div className="px-6 py-5">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {message && <p className="text-sm text-slate-500 mt-2">{message}</p>}
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
          <button type="button" onClick={onClose} disabled={isPending} className="btn-secondary text-xs">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              'btn-primary text-xs',
              destructive && 'bg-red-600 hover:bg-red-700 border-red-600'
            )}
          >
            {isPending ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </MainContentModal>
  );
}
