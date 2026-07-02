import { useCallback, useEffect, useRef, useState } from 'react';
import { INITIAL_FORM, draftKey } from './constants';

function serializeDraft(form, step, documentMeta) {
  return JSON.stringify({ form, step, documentMeta, savedAt: new Date().toISOString() });
}

export function useEmployeeDraft(tenantId) {
  const key = draftKey(tenantId);
  const [draftNotice, setDraftNotice] = useState(null);
  const timerRef = useRef(null);

  const loadDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        form: { ...INITIAL_FORM, ...parsed.form, emergency_contacts: parsed.form?.emergency_contacts || INITIAL_FORM.emergency_contacts },
        step: parsed.step || 1,
        documentMeta: parsed.documentMeta || {},
        savedAt: parsed.savedAt,
      };
    } catch {
      return null;
    }
  }, [key]);

  const saveDraft = useCallback(
    (form, step, documentMeta, silent = false) => {
      try {
        localStorage.setItem(key, serializeDraft(form, step, documentMeta));
        if (!silent) setDraftNotice('Draft saved');
      } catch {
        if (!silent) setDraftNotice('Could not save draft');
      }
    },
    [key]
  );

  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
    setDraftNotice(null);
  }, [key]);

  const scheduleAutoSave = useCallback(
    (form, step, documentMeta) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => saveDraft(form, step, documentMeta, true), 800);
    },
    [saveDraft]
  );

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (!draftNotice) return undefined;
    const t = setTimeout(() => setDraftNotice(null), 2500);
    return () => clearTimeout(t);
  }, [draftNotice]);

  return { loadDraft, saveDraft, clearDraft, scheduleAutoSave, draftNotice };
}
