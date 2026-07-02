import { useEffect, useRef, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { registerPwa } from '../../pwa/registerPwa';

const TOAST_DURATION_MS = 5000;

export default function PwaUpdateNotifier() {
  const [toast, setToast] = useState(null);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    const showToast = (message, icon) => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setToast({ message, icon });
      hideTimerRef.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    };

    registerPwa({
      onOfflineReady: () => showToast('HRMS is ready to work offline', 'offline'),
      onUpdated: () => showToast('Updating HRMS to the latest version…', 'update'),
    });

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!toast) return null;

  const Icon = toast.icon === 'update' ? RefreshCw : toast.icon === 'offline' ? CheckCircle2 : WifiOff;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-lg"
    >
      <Icon className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
      <span>{toast.message}</span>
    </div>
  );
}
