import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const CampaignBarChart = lazy(() => import('../components/charts/CampaignBarChart'));
const BridgeLineChart = lazy(() => import('../components/charts/BridgeLineChart'));

const c = {
  ivory: '#FBF8F2', forest: '#2A4A35', gold: '#D4A44C', rose: '#C4867A',
  roseLight: '#F0D8D4', sage: '#6B9E7E', sageLight: '#D4EAD9', goldLight: '#F5E6C8',
  text: '#2C2B28', muted: '#7A786F', white: '#FFFFFF',
};
const ADMIN_BANNER_BG = `linear-gradient(120deg,rgba(42,74,53,0.82) 0%,rgba(196,134,122,0.38) 100%), url("/Smiles under the sun.png") center/cover no-repeat`;
const navItems = ['Dashboard', 'Users', 'Pending Approvals', 'Residents', 'Staff', 'Safehouses', 'Donations', 'Audit Log', 'Reports', 'Settings'];

const tok = () => localStorage.getItem('hh_token') ?? '';
const api = (url: string, opts?: RequestInit) =>
  fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}`, ...(opts?.headers ?? {}) } });

// ── Shared UI ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{ background: c.white, border: `1px solid ${accent ?? c.sageLight}`, borderRadius: 10, padding: '1rem 1.25rem', minWidth: 140, flex: '1 1 140px' }}>
      <p style={{ fontSize: 11, color: c.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color: c.forest, fontFamily: 'Georgia, serif', margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 15, fontWeight: 600, color: c.forest, marginBottom: 12, marginTop: 24, paddingBottom: 6, borderBottom: `1px solid ${c.sageLight}` }}>{children}</h2>;
}

function Loading() {
  return <p style={{ fontSize: 13, color: c.muted, textAlign: 'center', marginTop: '3rem' }}>Loading…</p>;
}
function ApiError({ msg, retry }: { msg: string; retry: () => void }) {
  return (
    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
      <p style={{ fontSize: 13, color: c.rose }}>{msg}</p>
      <button onClick={retry} style={{ marginTop: 8, fontSize: 12, color: c.forest, background: 'none', border: `1px solid ${c.forest}`, borderRadius: 6, padding: '4px 14px', cursor: 'pointer' }}>Retry</button>
    </div>
  );
}

function Table({ columns, rows, keyField }: { columns: { key: string; label: string }[]; rows: Record<string, unknown>[]; keyField: string }) {
  if (rows.length === 0) return <p style={{ fontSize: 13, color: c.muted }}>No records found.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <p style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>{rows.length} record{rows.length !== 1 ? 's' : ''}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: c.sageLight }}>
            {columns.map(col => <th key={col.key} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>{col.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={String(row[keyField])} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
              {columns.map(col => (
                <td key={col.key} style={{ padding: '8px 12px', color: c.text, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {String(row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────

function AdminDashboard() {
  const [kpis, setKpis] = useState<Record<string, unknown> | null>(null);
  const [proof, setProof] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [k, p] = await Promise.all([
        api('/api/dashboard/kpis').then(r => r.json()),
        api('/api/dashboard/admin-proof').then(r => r.json()),
      ]);
      setKpis(k); setProof(p);
    } catch { setError('Failed to load dashboard.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  const check = (proof as any)?.check ?? {};
  const ops = (kpis as any)?.operations ?? {};
  const donor = (kpis as any)?.donor ?? {};

  return (
    <div>
      <SectionTitle>System Counts</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Residents" value={check.residents ?? '—'} />
        <StatCard label="Supporters" value={check.supporters ?? '—'} accent={c.goldLight} />
        <StatCard label="Safehouses" value={check.safehouses ?? '—'} />
        <StatCard label="Donations" value={check.donations ?? '—'} accent={c.goldLight} />
        <StatCard label="Social Posts" value={check.socialPosts ?? '—'} accent={c.roseLight} />
      </div>

      <SectionTitle>Operations</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Active Residents" value={ops.activeResidents ?? '—'} accent={c.sageLight} />
        <StatCard label="High Risk" value={ops.highRiskResidents ?? '—'} accent={c.roseLight} />
        <StatCard label="Reintegration Ready" value={ops.reintegrationReadyResidents ?? '—'} accent={c.goldLight} />
        <StatCard label="Process Sessions" value={ops.processSessions ?? '—'}
          sub={ops.processSessions ? `${((ops.sessionsWithProgress / ops.processSessions) * 100).toFixed(0)}% with progress` : undefined} />
        <StatCard label="Home Visits" value={ops.homeVisits ?? '—'}
          sub={ops.homeVisits ? `${((ops.visitsWithSafetyConcern / ops.homeVisits) * 100).toFixed(0)}% safety concerns` : undefined} accent={c.roseLight} />
      </div>

      <SectionTitle>Donor KPIs</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Total Supporters" value={donor.totalSupporters ?? '—'} />
        <StatCard label="Active Supporters" value={donor.activeSupporters ?? '—'} accent={c.sageLight} />
        <StatCard label="Unique Donors" value={donor.uniqueDonors ?? '—'} />
        <StatCard label="Repeat Donor Rate" value={donor.repeatDonorRate != null ? `${(donor.repeatDonorRate * 100).toFixed(1)}%` : '—'} accent={c.goldLight} />
        <StatCard label="Total Monetary" value={donor.totalMonetaryAmount != null ? `₱${Number(donor.totalMonetaryAmount).toLocaleString()}` : '—'} accent={c.goldLight} />
        <StatCard label="Avg Donation" value={donor.avgMonetaryDonation != null ? `₱${Number(donor.avgMonetaryDonation).toFixed(0)}` : '—'} />
      </div>
    </div>
  );
}

// ── Users (pending accounts) ─────────────────────────────────────────────────

function AdminUsers() {
  const [pending, setPending] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api('/api/auth/pending').then(r => r.json());
      setPending(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load pending users.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const approve = async (userId: number, name: string) => {
    setBusy(userId);
    try {
      const r = await api(`/api/auth/approve/${userId}`, { method: 'POST' });
      if (r.ok) { notify(`✓ Approved ${name}`); await load(); }
      else notify('Approval failed.');
    } finally { setBusy(null); }
  };

  const reject = async (userId: number, name: string) => {
    if (!window.confirm(`Reject account for "${name}"? This will deactivate the account.`)) return;
    setBusy(userId);
    try {
      const r = await api(`/api/auth/reject/${userId}`, { method: 'POST' });
      if (r.ok) { notify(`Rejected ${name}`); await load(); }
      else notify('Rejection failed.');
    } finally { setBusy(null); }
  };

  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  return (
    <div>
      {toast && (
        <div style={{ background: c.sageLight, color: c.forest, borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>{toast}</div>
      )}
      <SectionTitle>Pending Account Approvals ({pending.length})</SectionTitle>
      {pending.length === 0 ? (
        <p style={{ fontSize: 13, color: c.muted }}>No accounts awaiting approval.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: c.sageLight }}>
                {['ID', 'Username', 'Email', 'Roles', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pending.map((u, i) => (
                <tr key={String(u.id)} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                  <td style={{ padding: '8px 12px', color: c.muted, fontSize: 12 }}>{String(u.id)}</td>
                  <td style={{ padding: '8px 12px', color: c.text, fontWeight: 600 }}>{String(u.userName ?? '—')}</td>
                  <td style={{ padding: '8px 12px', color: c.text }}>{String(u.email ?? '—')}</td>
                  <td style={{ padding: '8px 12px', color: c.muted }}>{Array.isArray(u.roles) ? u.roles.join(', ') : '—'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button disabled={busy === (u.id as number)} onClick={() => approve(u.id as number, String(u.userName))}
                        style={{ background: c.sage, color: c.white, border: 'none', borderRadius: 6, padding: '4px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600, opacity: busy === u.id ? 0.6 : 1 }}>
                        Approve
                      </button>
                      <button disabled={busy === (u.id as number)} onClick={() => reject(u.id as number, String(u.userName))}
                        style={{ background: c.roseLight, color: c.rose, border: `1px solid ${c.rose}`, borderRadius: 6, padding: '4px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600, opacity: busy === u.id ? 0.6 : 1 }}>
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Pending Approvals (sensitive field changes) ───────────────────────────────

function AdminPendingApprovals() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api('/api/auditlogs/pending').then(r => r.json());
      setItems(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load pending approvals.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const act = async (id: number, type: 'approve' | 'reject') => {
    if (type === 'reject' && !window.confirm('Reject this change request? The change will not be applied.')) return;
    setBusy(id);
    try {
      const r = await api(`/api/auditlogs/${id}/${type}`, { method: 'POST' });
      if (r.ok) { notify(type === 'approve' ? '✓ Change approved and applied.' : 'Change rejected.'); await load(); }
      else notify(`${type} failed.`);
    } finally { setBusy(null); }
  };

  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  return (
    <div>
      {toast && (
        <div style={{ background: c.sageLight, color: c.forest, borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>{toast}</div>
      )}
      <SectionTitle>Pending Change Approvals ({items.length})</SectionTitle>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: c.muted }}>No changes awaiting approval.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => (
            <div key={String(item.auditId)} style={{ background: c.white, border: `1px solid ${c.goldLight}`, borderRadius: 10, padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: c.text }}>
                    {String(item.resource ?? '—')} #{String(item.recordId ?? '—')} — {String(item.action ?? '—')}
                  </p>
                  {item.notes != null && String(item.notes).trim() !== '' && (
                    <p style={{ fontSize: 12, color: c.muted, marginTop: 3 }}>{String(item.notes)}</p>
                  )}
                  <p style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>
                    {item.timestamp ? new Date(String(item.timestamp)).toLocaleString() : '—'}
                    {' · '}User #{String(item.userId)}
                  </p>
                  {(item.oldValue != null || item.newValue != null) && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {item.oldValue != null && <span style={{ background: c.roseLight, color: c.rose, borderRadius: 6, padding: '3px 10px', fontSize: 11 }}>Before: {String(item.oldValue)}</span>}
                      {item.newValue != null && <span style={{ background: c.sageLight, color: '#1B5E20', borderRadius: 6, padding: '3px 10px', fontSize: 11 }}>After: {String(item.newValue)}</span>}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button disabled={busy === (item.auditId as number)} onClick={() => act(item.auditId as number, 'approve')}
                    style={{ background: c.sage, color: c.white, border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 12, cursor: 'pointer', fontWeight: 600, opacity: busy === item.auditId ? 0.6 : 1 }}>
                    Approve
                  </button>
                  <button disabled={busy === (item.auditId as number)} onClick={() => act(item.auditId as number, 'reject')}
                    style={{ background: c.roseLight, color: c.rose, border: `1px solid ${c.rose}`, borderRadius: 6, padding: '6px 16px', fontSize: 12, cursor: 'pointer', fontWeight: 600, opacity: busy === item.auditId ? 0.6 : 1 }}>
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Generic read-only data panels ─────────────────────────────────────────────

function DataPanel({ title, url, columns, keyField }: { title: string; url: string; columns: { key: string; label: string }[]; keyField: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api(url).then(r => r.json());
      setRows(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load data.'); }
    finally { setLoading(false); }
  }, [url]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      {loading ? <Loading /> : error ? <ApiError msg={error} retry={load} /> : <Table columns={columns} rows={rows} keyField={keyField} />}
    </div>
  );
}

// ── Portal component ──────────────────────────────────────────────────────────

type InsightDonationByCampaignRow = { campaignName: string; totalValuePhp: number; donationCount: number; avgValuePhp: number };
type InsightBridgeRow = {
  month: string;
  posts_n: number;
  click_throughs: number;
  donation_referrals: number;
  donation_total_php: number;
  incidents: number;
  avg_edu_progress: number;
  avg_health: number;
};

function AdminReports() {
  const [bridge, setBridge] = useState<InsightBridgeRow[]>([]);
  const [campaigns, setCampaigns] = useState<InsightDonationByCampaignRow[]>([]);
  const [campaignTake, setCampaignTake] = useState(15);
  const [bridgeTake, setBridgeTake] = useState(24);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [b, c] = await Promise.all([
        api(`/api/insights/bridge/monthly?take=${bridgeTake}`).then(r => r.json()),
        api(`/api/insights/donations/by-campaign?take=${campaignTake}`).then(r => r.json()),
      ]);
      setBridge(Array.isArray(b) ? b : []);
      setCampaigns(Array.isArray(c) ? c : []);
    } catch { setError('Failed to load reports.'); }
    finally { setLoading(false); }
  }, [bridgeTake, campaignTake]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  const campaignChartData = campaigns.map((r) => ({ name: r.campaignName, total: Number(r.totalValuePhp ?? 0) }));
  const bridgeChartData = bridge.map((r) => ({
    month: new Date(r.month).toLocaleDateString('en-US', { year: '2-digit', month: 'short' }),
    donations: Number(r.donation_total_php ?? 0),
    referrals: Number(r.donation_referrals ?? 0),
    incidents: Number(r.incidents ?? 0),
  }));

  return (
    <div>
      <SectionTitle>Reports (pipelines)</SectionTitle>
      <p style={{ fontSize: 12, color: c.muted, marginTop: -4, marginBottom: 16 }}>
        Aggregate analytics for planning. Source: <code>/api/insights/*</code>
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: c.muted }}>
          Top campaigns:
          <select value={campaignTake} onChange={(e) => setCampaignTake(Number(e.target.value))}
            style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 6, border: `1px solid ${c.sageLight}`, background: c.white }}>
            {[5, 10, 15, 25].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, color: c.muted }}>
          Bridge months:
          <select value={bridgeTake} onChange={(e) => setBridgeTake(Number(e.target.value))}
            style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 6, border: `1px solid ${c.sageLight}`, background: c.white }}>
            {[12, 18, 24, 36, 60, 120].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <SectionTitle>Top campaigns by total PHP</SectionTitle>
      {campaignChartData.length > 0 && (
        <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: c.forest, margin: 0, marginBottom: 8 }}>Top campaigns (total PHP)</p>
          <Suspense fallback={<p style={{ fontSize: 12, color: c.muted }}>Loading chart…</p>}>
            <CampaignBarChart data={campaignChartData} barColor={c.gold} gridColor="rgba(44,43,40,0.08)" />
          </Suspense>
        </div>
      )}
      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: c.sageLight }}>
              {['Campaign', 'Donations', 'Total (PHP)', 'Avg (PHP)'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((row, i) => (
              <tr key={`${row.campaignName}-${i}`} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                <td style={{ padding: '8px 12px' }}>{row.campaignName}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.donationCount}</td>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{`₱${Number(row.totalValuePhp).toLocaleString()}`}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{`₱${Number(row.avgValuePhp).toFixed(0)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionTitle>Monthly bridge (last 18 months)</SectionTitle>
      {bridgeChartData.length > 0 && (
        <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: c.forest, margin: 0, marginBottom: 8 }}>Donations vs referrals (last 24 months)</p>
          <Suspense fallback={<p style={{ fontSize: 12, color: c.muted }}>Loading chart…</p>}>
            <BridgeLineChart
              data={bridgeChartData}
              donationsColor={c.forest}
              referralsColor={c.rose}
              incidentsColor={c.gold}
              gridColor="rgba(44,43,40,0.08)"
            />
          </Suspense>
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: c.sageLight }}>
              {['Month', 'Posts', 'Clicks', 'Referrals', 'Donations (PHP)', 'Incidents', 'Avg Edu', 'Avg Health'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bridge.slice(-18).map((row, i) => (
              <tr key={`${row.month}-${i}`} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                <td style={{ padding: '8px 12px' }}>{new Date(row.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.posts_n}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.click_throughs}</td>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.donation_referrals}</td>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{`₱${Number(row.donation_total_php).toLocaleString()}`}</td>
                <td style={{ padding: '8px 12px', color: c.rose }}>{row.incidents}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{Number(row.avg_edu_progress).toFixed(1)}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{Number(row.avg_health).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('Dashboard');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderContent = () => {
    switch (activeNav) {
      case 'Dashboard': return <AdminDashboard />;
      case 'Users': return <AdminUsers />;
      case 'Pending Approvals': return <AdminPendingApprovals />;
      case 'Residents':
        return <DataPanel title="Residents" url="/api/residents" keyField="residentId" columns={[
          { key: 'residentId', label: 'ID' }, { key: 'caseControlNo', label: 'Case No.' },
          { key: 'safehouseId', label: 'Safehouse' }, { key: 'caseStatus', label: 'Status' },
          { key: 'sex', label: 'Sex' }, { key: 'dateOfAdmission', label: 'Admitted' },
          { key: 'currentRiskLevel', label: 'Risk' }, { key: 'reintegrationStatus', label: 'Reintegration' },
          { key: 'assignedSocialWorker', label: 'Social Worker' },
        ]} />;
      case 'Staff':
        return <DataPanel title="Staff" url="/api/staff" keyField="staffId" columns={[
          { key: 'staffId', label: 'ID' }, { key: 'staffCode', label: 'Code' },
          { key: 'firstName', label: 'First' }, { key: 'lastName', label: 'Last' },
          { key: 'role', label: 'Role' }, { key: 'employmentType', label: 'Type' },
          { key: 'safehouseId', label: 'Safehouse' }, { key: 'employmentStatus', label: 'Status' },
          { key: 'email', label: 'Email' },
        ]} />;
      case 'Safehouses':
        return <DataPanel title="Safehouses" url="/api/safehouses" keyField="safehouseId" columns={[
          { key: 'safehouseId', label: 'ID' }, { key: 'safehouseCode', label: 'Code' },
          { key: 'name', label: 'Name' }, { key: 'city', label: 'City' },
          { key: 'region', label: 'Region' }, { key: 'status', label: 'Status' },
          { key: 'capacityGirls', label: 'Capacity' }, { key: 'currentOccupancy', label: 'Occupancy' },
        ]} />;
      case 'Donations':
        return <DataPanel title="Donations" url="/api/donations" keyField="donationId" columns={[
          { key: 'donationId', label: 'ID' }, { key: 'donationDate', label: 'Date' },
          { key: 'donationType', label: 'Type' }, { key: 'campaignName', label: 'Campaign' },
          { key: 'amount', label: 'Amount' }, { key: 'currencyCode', label: 'Currency' },
          { key: 'channelSource', label: 'Channel' }, { key: 'isRecurring', label: 'Recurring' },
        ]} />;
      case 'Audit Log':
        return <DataPanel title="Audit Log" url="/api/auditlogs" keyField="auditId" columns={[
          { key: 'auditId', label: 'ID' }, { key: 'timestamp', label: 'Time' },
          { key: 'userId', label: 'User' }, { key: 'action', label: 'Action' },
          { key: 'resource', label: 'Resource' }, { key: 'recordId', label: 'Record' },
          { key: 'ipAddress', label: 'IP' }, { key: 'approvalStatus', label: 'Approval' },
        ]} />;
      case 'Reports': return <AdminReports />;
      case 'Settings':
        return (
          <div>
            <SectionTitle>Settings</SectionTitle>
            <p style={{ fontSize: 13, color: c.muted }}>System settings coming soon.</p>
          </div>
        );
      default: return null;
    }
  };

  return (
    <main id="main-content" style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
      <Sidebar id="admin-sidebar" items={navItems} active={activeNav} setActive={setActiveNav}
        user={`${user?.userName ?? 'Admin'} · Admin`} onLogout={handleLogout} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
        <section aria-label="Admin dashboard"
          style={{ background: ADMIN_BANNER_BG, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: 12, color: 'rgba(251,248,242,0.65)', marginBottom: 3 }}>Admin Console</p>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: c.ivory, fontWeight: 400, margin: 0 }}>{user?.userName ?? 'Admin'}</h1>
          </div>
        </section>
        {renderContent()}
      </div>
    </main>
  );
}
