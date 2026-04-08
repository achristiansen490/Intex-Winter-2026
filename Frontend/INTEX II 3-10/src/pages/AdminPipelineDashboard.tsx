import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPageShell } from '../components/AdminPageShell';

const c = {
  forest: '#2A4A35',
  gold: '#D4A44C',
  rose: '#C4867A',
  ivory: '#FBF8F2',
  muted: '#7A786F',
  white: '#FFFFFF',
  sageLight: '#D4EAD9',
};

const tok = () => localStorage.getItem('hh_token') ?? '';
const api = (url: string, opts?: RequestInit) =>
  fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}`, ...(opts?.headers ?? {}) } });

type RegistryItem = {
  id: string;
  title: string;
  description: string;
  notebookFile: string;
  insightsPath: string;
  sampleUrl: string;
};

type RunRow = {
  runId: number;
  pipelineKey: string;
  triggerType: string;
  status: string;
  detailMessage?: string | null;
  startedUtc: string;
  finishedUtc?: string | null;
  triggeredByUserName?: string | null;
};

type ScheduleDto = { enabled: boolean; hourUtc: number; minuteUtc: number };

export default function AdminPipelineDashboard() {
  const [registry, setRegistry] = useState<RegistryItem[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [schedule, setSchedule] = useState<ScheduleDto>({ enabled: false, hourUtc: 2, minuteUtc: 0 });
  const [hourStr, setHourStr] = useState('2');
  const [minuteStr, setMinuteStr] = useState('0');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [r, runList, sch] = await Promise.all([
        api('/api/admin/pipelines/registry').then((x) => x.json()),
        api('/api/admin/pipelines/runs?take=100').then((x) => x.json()),
        api('/api/admin/pipelines/schedule').then((x) => x.json()),
      ]);
      setRegistry(Array.isArray(r) ? r : []);
      setRuns(Array.isArray(runList) ? runList : []);
      if (sch && typeof sch.hourUtc === 'number') {
        setSchedule(sch);
        setHourStr(String(sch.hourUtc));
        setMinuteStr(String(sch.minuteUtc));
      }
    } catch {
      setErr('Could not load pipeline dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const lastRun = (pipelineId: string) =>
    runs.find((x) => x.pipelineKey === pipelineId);

  const saveSchedule = async () => {
    const hourUtc = Math.min(23, Math.max(0, parseInt(hourStr, 10) || 0));
    const minuteUtc = Math.min(59, Math.max(0, parseInt(minuteStr, 10) || 0));
    setBusy(true);
    setMsg('');
    try {
      const r = await api('/api/admin/pipelines/schedule', {
        method: 'PUT',
        body: JSON.stringify({ enabled: schedule.enabled, hourUtc, minuteUtc }),
      });
      if (!r.ok) throw new Error();
      const body = await r.json();
      setSchedule(body);
      setHourStr(String(body.hourUtc));
      setMinuteStr(String(body.minuteUtc));
      setMsg('Schedule saved.');
    } catch {
      setErr('Failed to save schedule.');
    } finally {
      setBusy(false);
    }
  };

  const runTraining = async (pipelineId?: string) => {
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      const r = await api('/api/admin/pipelines/training/run', {
        method: 'POST',
        body: JSON.stringify({ pipelineId: pipelineId ?? null }),
      });
      if (r.status === 202) {
        setMsg(
          pipelineId
            ? `Training queued for “${pipelineId}”. Refresh runs in a few seconds.`
            : 'Training queued for all pipelines. Refresh runs in a few seconds.',
        );
        setTimeout(load, 2000);
      } else if (!r.ok) throw new Error();
    } catch {
      setErr('Failed to start training.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminPageShell activeNav="Pipelines" title="Pipeline dashboard">
      <div style={{ maxWidth: 960 }}>
        <p style={{ fontSize: 13, color: c.muted, marginBottom: 16 }}>
          Live insight outputs are served from the API using the current database. Use training runs to notify an optional Azure webhook, or to record manual
          refresh attempts.
        </p>

        {err && (
          <p style={{ color: c.rose, fontSize: 13, marginBottom: 12 }} role="alert">
            {err}
          </p>
        )}
        {msg && (
          <p style={{ color: c.forest, fontSize: 13, marginBottom: 12 }} role="status">
            {msg}
          </p>
        )}

        <section
          style={{
            background: c.white,
            border: `1px solid ${c.sageLight}`,
            borderRadius: 10,
            padding: '1rem 1.25rem',
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: c.forest, margin: '0 0 12px' }}>Training & schedule</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => runTraining()}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: c.forest,
                color: c.ivory,
                fontWeight: 600,
                cursor: busy ? 'wait' : 'pointer',
                fontSize: 13,
              }}
            >
              Run all pipelines
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={load}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: `1px solid ${c.forest}`,
                background: 'transparent',
                color: c.forest,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Refresh data
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: c.muted }}>
              Daily run (UTC)
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={hourStr}
                  onChange={(e) => setHourStr(e.target.value)}
                  style={{ width: 56, padding: 6, borderRadius: 6, border: `1px solid ${c.sageLight}` }}
                  aria-label="Hour UTC"
                />
                <span>:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={minuteStr}
                  onChange={(e) => setMinuteStr(e.target.value)}
                  style={{ width: 56, padding: 6, borderRadius: 6, border: `1px solid ${c.sageLight}` }}
                  aria-label="Minute UTC"
                />
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: c.forest, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={schedule.enabled}
                onChange={(e) => setSchedule((s) => ({ ...s, enabled: e.target.checked }))}
              />
              Enable scheduled run
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={saveSchedule}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: c.gold,
                color: '#2C2B28',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Save schedule
            </button>
          </div>
        </section>

        {loading ? (
          <p style={{ color: c.muted }}>Loading…</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {registry.map((p) => {
              const lr = lastRun(p.id);
              return (
                <li
                  key={p.id}
                  style={{
                    background: c.white,
                    border: `1px solid ${c.sageLight}`,
                    borderRadius: 10,
                    padding: '1rem 1.25rem',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div>
                      <Link
                        to={`/admin/pipelines/${encodeURIComponent(p.id)}`}
                        style={{ fontSize: 16, fontWeight: 600, color: c.forest, textDecoration: 'none' }}
                      >
                        {p.title}
                      </Link>
                      <p style={{ fontSize: 12, color: c.muted, margin: '6px 0 4px', maxWidth: 640 }}>{p.description}</p>
                      <p style={{ fontSize: 11, color: c.muted, fontFamily: 'monospace' }}>
                        Notebook: {p.notebookFile} · API: /{p.insightsPath}
                      </p>
                      {lr && (
                        <p style={{ fontSize: 11, color: c.muted, marginTop: 6 }}>
                          Last run: {lr.status}
                          {lr.finishedUtc ? ` · ${lr.finishedUtc}` : ''}
                          {lr.detailMessage ? ` — ${lr.detailMessage.slice(0, 120)}${lr.detailMessage.length > 120 ? '…' : ''}` : ''}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <Link
                        to={`/admin/pipelines/${encodeURIComponent(p.id)}`}
                        style={{
                          fontSize: 12,
                          textAlign: 'center',
                          padding: '6px 12px',
                          borderRadius: 6,
                          background: c.sageLight,
                          color: c.forest,
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                      >
                        View output
                      </Link>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => runTraining(p.id)}
                        style={{
                          fontSize: 12,
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: `1px solid ${c.forest}`,
                          background: 'transparent',
                          color: c.forest,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Run this pipeline
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AdminPageShell>
  );
}
