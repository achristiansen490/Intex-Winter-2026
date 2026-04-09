import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminPageShell } from '../components/AdminPageShell';
import { PipelineOutputView } from '../components/pipeline/PipelineOutputView';
import { apiUrl } from '../lib/api';

const c = {
  forest: '#2A4A35',
  rose: '#C4867A',
  muted: '#7A786F',
  white: '#FFFFFF',
  sageLight: '#D4EAD9',
};

const tok = () => localStorage.getItem('hh_token') ?? '';
const api = (url: string, opts?: RequestInit) =>
  fetch(apiUrl(url), { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}`, ...(opts?.headers ?? {}) } });

type RegistryItem = {
  id: string;
  title: string;
  description: string;
  notebookFile: string;
  insightsPath: string;
  sampleUrl: string;
};

export default function AdminPipelineDetail() {
  const { pipelineId: rawId } = useParams<{ pipelineId: string }>();
  const pipelineId = rawId ? decodeURIComponent(rawId) : '';

  const [meta, setMeta] = useState<RegistryItem | null>(null);
  const [payload, setPayload] = useState<unknown>(null);
  const [jsonText, setJsonText] = useState('');
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [trainMsg, setTrainMsg] = useState('');

  const loadOutput = useCallback(async () => {
    if (!pipelineId) return;
    setLoading(true);
    setErr('');
    setJsonText('');
    setPayload(null);
    try {
      const reg = await api('/api/admin/pipelines/registry').then((r) => r.json());
      const list = Array.isArray(reg) ? (reg as RegistryItem[]) : [];
      const m = list.find((x) => x.id === pipelineId);
      if (!m) {
        setErr('Unknown pipeline.');
        setMeta(null);
        return;
      }
      setMeta(m);
      const url = m.sampleUrl.startsWith('/') ? m.sampleUrl : `/${m.sampleUrl}`;
      const res = await api(url);
      setStatus(res.status);
      const text = await res.text();
      try {
        const parsed = JSON.parse(text) as unknown;
        setPayload(parsed);
        setJsonText(JSON.stringify(parsed, null, 2));
      } catch {
        setPayload(null);
        setJsonText(text);
      }
      if (!res.ok) setErr(`API returned ${res.status}`);
    } catch {
      setErr('Failed to load pipeline output.');
    } finally {
      setLoading(false);
    }
  }, [pipelineId]);

  useEffect(() => {
    loadOutput();
  }, [loadOutput]);

  const runThis = async () => {
    setBusy(true);
    setTrainMsg('');
    try {
      const r = await api('/api/admin/pipelines/training/run', {
        method: 'POST',
        body: JSON.stringify({ pipelineId }),
      });
      if (r.status === 202) setTrainMsg('Training queued for this pipeline.');
      else if (!r.ok) setErr('Could not start training.');
    } catch {
      setErr('Could not start training.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminPageShell activeNav="Pipelines" title="Pipeline output">
      <div style={{ maxWidth: 1000 }}>
        <p style={{ marginBottom: 12 }}>
          <Link to="/admin/pipelines" style={{ color: c.forest, fontSize: 13, fontWeight: 600 }}>
            ← Pipeline dashboard
          </Link>
        </p>

        {!meta && !loading && err && <p style={{ color: c.rose }}>{err}</p>}

        {meta && (
          <>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: c.forest, fontWeight: 600, margin: '0 0 8px' }}>{meta.title}</h1>
            <p style={{ fontSize: 13, color: c.muted, marginBottom: 12 }}>{meta.description}</p>
            <p style={{ fontSize: 12, color: c.muted, marginBottom: 16, fontFamily: 'monospace' }}>
              /{meta.insightsPath} · {meta.notebookFile}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              <button
                type="button"
                disabled={busy || loading}
                onClick={loadOutput}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: `1px solid ${c.forest}`,
                  background: c.white,
                  color: c.forest,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Reload output
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={runThis}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: c.forest,
                  color: '#FBF8F2',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Run training (this pipeline)
              </button>
            </div>
            {trainMsg && <p style={{ fontSize: 13, color: c.forest, marginBottom: 8 }}>{trainMsg}</p>}
          </>
        )}

        {loading ? (
          <p style={{ color: c.muted }}>Loading…</p>
        ) : (
          meta && (
            <>
              {status != null && (
                <p style={{ fontSize: 12, color: c.muted, marginBottom: 12 }}>
                  HTTP {status} · Data from live API (same aggregates as staff/donor dashboards).
                </p>
              )}
              <PipelineOutputView pipelineId={pipelineId} data={payload} />
              <details style={{ marginTop: 20 }}>
                <summary
                  style={{
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    color: c.forest,
                    marginBottom: 8,
                  }}
                >
                  Raw JSON response
                </summary>
                <pre
                  style={{
                    background: '#1e1e1e',
                    color: '#d4d4d4',
                    padding: 16,
                    borderRadius: 8,
                    overflow: 'auto',
                    fontSize: 11,
                    lineHeight: 1.45,
                    maxHeight: 'min(50vh, 480px)',
                    border: `1px solid ${c.sageLight}`,
                  }}
                >
                  {jsonText || '(empty)'}
                </pre>
              </details>
            </>
          )
        )}
      </div>
    </AdminPageShell>
  );
}
