import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/helpers';

export const MAIN_MODAL_ROOT_ID = 'main-modal-root';

export default function MainContentModal({
  open,
  onClose,
  children,
  className,
  backdropClassName,
}) {
  const [root, setRoot] = useState(null);

  useEffect(() => {
    setRoot(document.getElementById(MAIN_MODAL_ROOT_ID));
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !root) return null;

  return createPortal(
    <div
      className={cn(
        'absolute inset-0 pointer-events-auto flex items-center justify-center bg-slate-900/50 p-4',
        backdropClassName
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
      role="presentation"
    >
      <div
        className={cn('max-h-[92dvh] w-full flex flex-col', className)}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    root
  );
}
