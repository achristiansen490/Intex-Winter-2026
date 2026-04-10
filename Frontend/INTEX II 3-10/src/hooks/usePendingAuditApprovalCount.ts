import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../lib/api';

const tok = () => localStorage.getItem('hh_token') ?? '';

/**
 * Polls `/api/auditlogs/pending` length for sidebar badges (Admin + Supervisor).
 */
export function usePendingAuditApprovalCount(enabled: boolean) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const r = await fetch(apiUrl('/api/auditlogs/pending'), {
        headers: { Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json' },
      });
      if (!r.ok) return;
      const d = await r.json();
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
