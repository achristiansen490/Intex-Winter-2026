import { useState, useEffect, useCallback } from 'react';
import { apiFetch, jsonIfOk } from '../lib/api';

/**
 * Polls `/api/auditlogs/pending` length for sidebar badges (Admin + Supervisor).
 */
export function usePendingAuditApprovalCount(enabled: boolean) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const r = await apiFetch('/api/auditlogs/pending');
      if (!r.ok) return;
      const d = await jsonIfOk(r, [] as unknown[]);
      setCount(Array.isArray(d) ? d.length : 0);
    } catch {
      /* ignore */
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    void refresh();
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => void refresh(), 60_000);
    return () => clearInterval(t);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [enabled, refresh]);

  return { count, refresh };
}
