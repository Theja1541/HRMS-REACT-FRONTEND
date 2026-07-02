import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the HRMS service worker with automatic updates enabled.
 * @returns {((reloadPage?: boolean) => Promise<void>) | undefined}
 */
export function registerPwa({ onOfflineReady, onUpdated } = {}) {
  if (!('serviceWorker' in navigator)) return undefined;

  const updateSW = registerSW({
    immediate: true,
    onOfflineReady() {
      onOfflineReady?.();
    },
    onNeedRefresh() {
      onUpdated?.();
      updateSW(true);
    },
  });

  return updateSW;
}
