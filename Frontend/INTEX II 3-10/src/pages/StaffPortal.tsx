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
const STAFF_BANNER_BG = `linear-gradient(120deg,rgba(42,74,53,0.76) 0%,rgba(107,158,126,0.5) 100%), url("/Smiles under the sun.png") center/cover no-repeat`;

function getNavItems(role: string | null): string[] {
  switch (role) {
    case 'Supervisor':   return ['Dashboard', 'Caseload', 'Donors', 'Session Notes', 'Visits & Conferences', 'Reports', 'Pending Approvals'];
    case 'CaseManager':  return ['Dashboard', 'Caseload', 'Session Notes', 'Visits & Conferences', 'Intervention Plans', 'Reports'];
    case 'SocialWorker': return ['Dashboard', 'My Residents', 'Session Notes', 'Home Visits', 'Incident Reports'];
    case 'FieldWorker':  return ['Dashboard', 'Residents', 'Health Records', 'Education Records', 'Home Visits', 'Incident Reports'];
    default:             return ['Dashboard'];
  }
}

const tok = () => localStorage.getItem('hh_token') ?? '';
const api = (url: string, opts?: RequestInit) =>
  fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}`, ...(opts?.headers ?? {}) } });

// ── Shared UI ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{ background: c.white, border: `1px solid ${accent ?? c.sageLight}`, borderRadius: 10, padding: '1rem 1.25rem', flex: '1 1 130px' }}>
      <p style={{ fontSize: 11, color: c.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color: c.forest, fontFamily: 'Georgia, serif', margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 15, fontWeight: 600, color: c.forest, marginBottom: 12, marginTop: 0, paddingBottom: 6, borderBottom: `1px solid ${c.sageLight}` }}>{children}</h2>;
}

function Loading() { return <p style={{ fontSize: 13, color: c.muted, textAlign: 'center', marginTop: '3rem' }}>Loading…</p>; }
function ApiError({ msg, retry }: { msg: string; retry: () => void }) {
  return (
    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
      <p style={{ fontSize: 13, color: c.rose }}>{msg}</p>
      <button onClick={retry} style={{ marginTop: 8, fontSize: 12, color: c.forest, background: 'none', border: `1px solid ${c.forest}`, borderRadius: 6, padding: '4px 14px', cursor: 'pointer' }}>Retry</button>
    </div>
  );
}

function DataTable({ columns, rows, keyField }: { columns: { key: string; label: string }[]; rows: Record<string, unknown>[]; keyField: string }) {
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
                <td key={col.key} style={{ padding: '8px 12px', color: c.text, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

function DataPanel({ title, url, columns, keyField }: { title: string; url: string; columns: { key: string; label: string }[]; keyField: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const d = await api(url).then(r => r.json()); setRows(Array.isArray(d) ? d : []); }
    catch { setError('Failed to load data.'); }
    finally { setLoading(false); }
  }, [url]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      {loading ? <Loading /> : error ? <ApiError msg={error} retry={load} /> : <DataTable columns={columns} rows={rows} keyField={keyField} />}
    </div>
  );
}

// ── Dashboard (role-aware) ────────────────────────────────────────────────────

function StaffDashboard({ role }: { role: string | null }) {
  const [kpis, setKpis] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setKpis(await api('/api/dashboard/kpis').then(r => r.json())); }
    catch { setError('Failed to load dashboard.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  const ops = (kpis as any)?.operations ?? {};
  const donor = (kpis as any)?.donor ?? {};

  return (
    <div>
      <SectionTitle>Operations Overview</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <StatCard label="Active Residents" value={ops.activeResidents ?? '—'} accent={c.sageLight} />
        <StatCard label="High Risk" value={ops.highRiskResidents ?? '—'} accent={c.roseLight} />
        <StatCard label="Reintegration Ready" value={ops.reintegrationReadyResidents ?? '—'} accent={c.goldLight} />
        <StatCard label="Process Sessions" value={ops.processSessions ?? '—'} />
        <StatCard label="Home Visits" value={ops.homeVisits ?? '—'} />
      </div>
      {(role === 'Supervisor' || role === 'CaseManager') && (
        <>
          <SectionTitle>Donor Summary</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <StatCard label="Active Supporters" value={donor.activeSupporters ?? '—'} accent={c.goldLight} />
            <StatCard label="Unique Donors" value={donor.uniqueDonors ?? '—'} />
            <StatCard label="Total Monetary" value={donor.totalMonetaryAmount != null ? `₱${Number(donor.totalMonetaryAmount).toLocaleString()}` : '—'} accent={c.goldLight} />
          </div>
        </>
      )}
    </div>
  );
}

// ── Reports (pipelines) ───────────────────────────────────────────────────────

type InsightDonationMonthlyRow = { month: string; totalValuePhp: number; donationCount: number };
type InsightDonationByCampaignRow = { campaignName: string; totalValuePhp: number; donationCount: number; avgValuePhp: number };
type InsightBridgeRow = {
  month: string;
  posts_n: number;
  click_throughs: number;
  donation_referrals: number;
  donation_total_php: number;
  donation_n: number;
  incidents: number;
  avg_edu_progress: number;
  avg_health: number;
};

type EngagementVsVanitySummary = {
  totalPosts: number;
  thresholds: { engagementScoreP75: number; donationReferralsP75: number };
  segments: { segment: string; postCount: number }[];
};

function StaffReports() {
  const [bridge, setBridge] = useState<InsightBridgeRow[]>([]);
  const [campaigns, setCampaigns] = useState<InsightDonationByCampaignRow[]>([]);
  const [monthly, setMonthly] = useState<InsightDonationMonthlyRow[]>([]);
  const [evSummary, setEvSummary] = useState<EngagementVsVanitySummary | null>(null);
  const [campaignTake, setCampaignTake] = useState(12);
  const [bridgeTake, setBridgeTake] = useState(24);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [b, c, m, ev] = await Promise.all([
        api(`/api/insights/bridge/monthly?take=${bridgeTake}`).then(r => r.json()),
        api(`/api/insights/donations/by-campaign?take=${campaignTake}`).then(r => r.json()),
        api('/api/insights/donations/monthly?take=120').then(r => r.json()),
        api('/api/insights/social/engagement-vs-vanity').then(r => r.json()),
      ]);
      setBridge(Array.isArray(b) ? b : []);
      setCampaigns(Array.isArray(c) ? c : []);
      setMonthly(Array.isArray(m) ? m : []);
      setEvSummary(ev && typeof ev === 'object' && 'segments' in ev ? ev as EngagementVsVanitySummary : null);
    } catch { setError('Failed to load reports.'); }
    finally { setLoading(false); }
  }, [bridgeTake, campaignTake]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  const last = bridge.length ? bridge[bridge.length - 1] : null;
  const campaignChartData = campaigns.map((r) => ({ name: r.campaignName, total: Number(r.totalValuePhp ?? 0) }));
  const bridgeChartData = bridge.map((r) => ({
    month: new Date(r.month).toLocaleDateString('en-US', { year: '2-digit', month: 'short' }),
    donations: Number(r.donation_total_php ?? 0),
    referrals: Number(r.donation_referrals ?? 0),
    incidents: Number(r.incidents ?? 0),
  }));

  return (
    <div>
      <SectionTitle>Reports (ML pipelines)</SectionTitle>
      <p style={{ fontSize: 12, color: c.muted, marginTop: -4, marginBottom: 16 }}>
        These are aggregate, planning-focused indicators (not causal claims). Source: <code>/api/insights/*</code>
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: c.muted }}>
          Top campaigns:
          <select value={campaignTake} onChange={(e) => setCampaignTake(Number(e.target.value))}
            style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 6, border: `1px solid ${c.sageLight}`, background: c.white }}>
            {[5, 10, 12, 15, 25].map(n => <option key={n} value={n}>{n}</option>)}
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

      {last && (
        <>
          <SectionTitle>Latest month snapshot</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
            <StatCard label="Month" value={new Date(last.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })} />
            <StatCard label="Donation total" value={`₱${Number(last.donation_total_php).toLocaleString()}`} accent={c.goldLight} />
            <StatCard label="Donation referrals" value={last.donation_referrals} accent={c.roseLight} />
            <StatCard label="Incidents" value={last.incidents} accent={c.roseLight} />
          </div>
        </>
      )}

      <SectionTitle>Campaign effectiveness (top by total PHP)</SectionTitle>
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

      <SectionTitle>Outreach ↔ Money ↔ Outcomes (monthly bridge)</SectionTitle>
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
          <p style={{ fontSize: 11, color: c.muted, marginTop: 8 }}>
            Note: series are on the same axis for readability; interpret directionally.
          </p>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18, marginTop: 22 }}>
        <DataPanel
          title="Donor upgrade candidates (expected next gift size)"
          url="/api/insights/donors/upgrade-candidates?take=25"
          keyField="supporterId"
          columns={[
            { key: 'supporterName', label: 'Supporter' },
            { key: 'expectedNextValuePhp', label: 'Expected next (PHP)' },
            { key: 'recencyDays', label: 'Recency (days)' },
            { key: 'donationCount', label: 'Donations' },
            { key: 'lastValuePhp', label: 'Last gift (PHP)' },
            { key: 'lastDonationDate', label: 'Last date' },
          ]}
        />

        <DataPanel
          title="Post → donation linkage (top groups by estimated value)"
          url="/api/insights/posts/donation-linkage/by-group?group=platform&take=12"
          keyField="key"
          columns={[
            { key: 'key', label: 'Platform' },
            { key: 'postCount', label: 'Posts' },
            { key: 'willReferRate', label: 'Refer rate' },
            { key: 'avgReferrals', label: 'Avg referrals' },
            { key: 'totalEstimatedValuePhp', label: 'Total est. PHP' },
            { key: 'boostedRate', label: 'Boosted rate' },
          ]}
        />

        <DataPanel
          title="Safehouse strain (latest month; stress z + forecast heuristic)"
          url="/api/insights/safehouses/strain/latest?take=25"
          keyField="safehouseId"
          columns={[
            { key: 'safehouseName', label: 'Safehouse' },
            { key: 'month', label: 'Month' },
            { key: 'stressIndexZ', label: 'Stress (z)' },
            { key: 'forecastNextMonthIncidents', label: 'Forecast next incidents' },
            { key: 'incidentCount', label: 'Incidents' },
            { key: 'incidentLag1', label: 'Incidents lag1' },
            { key: 'activeResidents', label: 'Active residents' },
          ]}
        />

        <DataPanel
          title="Intervention effectiveness (plan category vs latest outcomes)"
          url="/api/insights/interventions/by-category"
          keyField="planCategory"
          columns={[
            { key: 'planCategory', label: 'Category' },
            { key: 'planCount', label: 'Plans' },
            { key: 'residentCount', label: 'Residents' },
            { key: 'avgLatestProgressPercent', label: 'Avg progress %' },
            { key: 'avgLatestHealthScore', label: 'Avg health' },
          ]}
        />

        <DataPanel
          title="Resident risk flags (90-day heuristic; staff triage)"
          url="/api/insights/residents/risk-flags?take=40"
          keyField="residentId"
          columns={[
            { key: 'residentLabel', label: 'Resident' },
            { key: 'riskBand', label: 'Band' },
            { key: 'riskScore', label: 'Score' },
            { key: 'incidents90d', label: 'Incidents 90d' },
            { key: 'concernSessions90d', label: 'Concern sessions 90d' },
            { key: 'safetyVisitFlags90d', label: 'Safety flags 90d' },
            { key: 'currentRiskLevel', label: 'Current risk' },
            { key: 'safehouseId', label: 'Safehouse' },
          ]}
        />

        <DataPanel
          title="Reintegration readiness (heuristic score; not a decision)"
          url="/api/insights/residents/reintegration-readiness?take=40"
          keyField="residentId"
          columns={[
            { key: 'residentLabel', label: 'Resident' },
            { key: 'readinessScore', label: 'Readiness' },
            { key: 'reintegrationStatus', label: 'Status' },
            { key: 'latestProgressPercent', label: 'Progress %' },
            { key: 'latestHealthScore', label: 'Health' },
            { key: 'incidentsLast365d', label: 'Incidents 365d' },
            { key: 'homeVisitsLast180d', label: 'Visits 180d' },
          ]}
        />
      </div>

      {evSummary && (
        <div style={{ marginTop: 22 }}>
          <SectionTitle>Engagement vs vanity (segment mix)</SectionTitle>
          <p style={{ fontSize: 12, color: c.muted, marginTop: -4, marginBottom: 12 }}>
            High engagement = likes+comments+shares at or above P75; high donation = referrals at or above P75. Associations only — not causal.{' '}
            <code>/api/insights/social/engagement-vs-vanity</code>
          </p>
          <p style={{ fontSize: 12, color: c.muted, marginBottom: 10 }}>
            P75 thresholds: engagement score {Number(evSummary.thresholds.engagementScoreP75).toFixed(1)}, donation referrals {Number(evSummary.thresholds.donationReferralsP75).toFixed(1)} · {evSummary.totalPosts} posts
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: c.sageLight }}>
                  {['Segment', 'Posts'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evSummary.segments.map((row, i) => (
                  <tr key={row.segment} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                    <td style={{ padding: '8px 12px' }}>{row.segment.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.postCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {monthly.length === 0 && (
        <p style={{ fontSize: 12, color: c.muted, marginTop: 12 }}>
          Note: donations/monthly returned 0 rows. Verify donations exist and donation_date is populated.
        </p>
      )}
    </div>
  );
}

// ── Pending Approvals (Supervisor) ────────────────────────────────────────────

function StaffPendingApprovals() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const d = await api('/api/auditlogs/pending').then(r => r.json()); setItems(Array.isArray(d) ? d : []); }
    catch { setError('Failed to load.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const act = async (id: number, type: 'approve' | 'reject') => {
    if (type === 'reject' && !window.confirm('Reject this change request?')) return;
    setBusy(id);
    try {
      const r = await api(`/api/auditlogs/${id}/${type}`, { method: 'POST' });
      if (r.ok) { notify(type === 'approve' ? '✓ Approved and applied.' : 'Rejected.'); await load(); }
      else notify(`${type} failed.`);
    } finally { setBusy(null); }
  };

  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  return (
    <div>
      {toast && <div style={{ background: c.sageLight, color: c.forest, borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>{toast}</div>}
      <SectionTitle>Pending Change Approvals ({items.length})</SectionTitle>
      {items.length === 0 ? <p style={{ fontSize: 13, color: c.muted }}>No changes awaiting approval.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => (
            <div key={String(item.auditId)} style={{ background: c.white, border: `1px solid ${c.goldLight}`, borderRadius: 10, padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{String(item.resource ?? '—')} #{String(item.recordId ?? '—')}</p>
                  {item.notes != null && String(item.notes).trim() !== '' && (
                    <p style={{ fontSize: 12, color: c.muted, marginTop: 3 }}>{String(item.notes)}</p>
                  )}
                  <p style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>{item.timestamp ? new Date(String(item.timestamp)).toLocaleString() : '—'}</p>
                  {(item.oldValue != null || item.newValue != null) && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {item.oldValue != null && <span style={{ background: c.roseLight, color: c.rose, borderRadius: 6, padding: '3px 10px', fontSize: 11 }}>Before: {String(item.oldValue)}</span>}
                      {item.newValue != null && <span style={{ background: c.sageLight, color: '#1B5E20', borderRadius: 6, padding: '3px 10px', fontSize: 11 }}>After: {String(item.newValue)}</span>}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button disabled={busy === (item.auditId as number)} onClick={() => act(item.auditId as number, 'approve')}
                    style={{ background: c.sage, color: c.white, border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                    Approve
                  </button>
                  <button disabled={busy === (item.auditId as number)} onClick={() => act(item.auditId as number, 'reject')}
                    style={{ background: c.roseLight, color: c.rose, border: `1px solid ${c.rose}`, borderRadius: 6, padding: '6px 16px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
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

// ── Portal ────────────────────────────────────────────────────────────────────

export default function StaffPortal() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = getNavItems(role);
  const [activeNav, setActiveNav] = useState('Dashboard');
  const displayRole = role ?? 'Staff';
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderContent = () => {
    switch (activeNav) {
      case 'Dashboard': return <StaffDashboard role={role} />;

      case 'Caseload':
      case 'My Residents':
      case 'Residents':
        return <DataPanel title="Residents" url="/api/residents" keyField="residentId" columns={[
          { key: 'residentId', label: 'ID' }, { key: 'caseControlNo', label: 'Case No.' },
          { key: 'caseStatus', label: 'Status' }, { key: 'sex', label: 'Sex' },
          { key: 'dateOfAdmission', label: 'Admitted' }, { key: 'currentRiskLevel', label: 'Risk' },
          { key: 'reintegrationStatus', label: 'Reintegration' }, { key: 'assignedSocialWorker', label: 'SW' },
        ]} />;

      case 'Session Notes':
        return <DataPanel title="Session Notes" url="/api/processrecordings" keyField="recordingId" columns={[
          { key: 'recordingId', label: 'ID' }, { key: 'sessionDate', label: 'Date' },
          { key: 'residentId', label: 'Resident' }, { key: 'socialWorker', label: 'Social Worker' },
          { key: 'sessionType', label: 'Type' }, { key: 'sessionDurationMinutes', label: 'Duration (min)' },
          { key: 'emotionalStateObserved', label: 'Emotion (start)' }, { key: 'emotionalStateEnd', label: 'Emotion (end)' },
          { key: 'progressNoted', label: 'Progress' }, { key: 'concernsFlagged', label: 'Concerns' },
        ]} />;

      case 'Visits & Conferences':
      case 'Home Visits':
        return <DataPanel title="Home Visits" url="/api/homevisitations" keyField="visitationId" columns={[
          { key: 'visitationId', label: 'ID' }, { key: 'visitDate', label: 'Date' },
          { key: 'residentId', label: 'Resident' }, { key: 'socialWorker', label: 'Social Worker' },
          { key: 'visitType', label: 'Type' }, { key: 'locationVisited', label: 'Location' },
          { key: 'familyCooperationLevel', label: 'Cooperation' }, { key: 'safetyConcernsNoted', label: 'Safety Concerns' },
          { key: 'visitOutcome', label: 'Outcome' },
        ]} />;

      case 'Intervention Plans':
        return <DataPanel title="Intervention Plans" url="/api/interventionplans" keyField="planId" columns={[
          { key: 'planId', label: 'ID' }, { key: 'residentId', label: 'Resident' },
          { key: 'planCategory', label: 'Category' }, { key: 'planDescription', label: 'Description' },
          { key: 'status', label: 'Status' }, { key: 'targetDate', label: 'Target Date' },
          { key: 'caseConferenceDate', label: 'Conference' },
        ]} />;

      case 'Incident Reports':
        return <DataPanel title="Incident Reports" url="/api/incidentreports" keyField="incidentId" columns={[
          { key: 'incidentId', label: 'ID' }, { key: 'incidentDate', label: 'Date' },
          { key: 'residentId', label: 'Resident' }, { key: 'incidentType', label: 'Type' },
          { key: 'severity', label: 'Severity' }, { key: 'resolved', label: 'Resolved' },
          { key: 'reportedBy', label: 'Reported By' },
        ]} />;

      case 'Health Records':
        return <DataPanel title="Health & Wellbeing Records" url="/api/healthwellbeingrecords" keyField="healthRecordId" columns={[
          { key: 'healthRecordId', label: 'ID' }, { key: 'residentId', label: 'Resident' },
          { key: 'recordDate', label: 'Date' }, { key: 'generalHealthScore', label: 'Health Score' },
          { key: 'nutritionScore', label: 'Nutrition' }, { key: 'sleepQualityScore', label: 'Sleep' },
          { key: 'bmi', label: 'BMI' }, { key: 'medicalCheckupDone', label: 'Medical ✓' },
          { key: 'psychologicalCheckupDone', label: 'Psych ✓' },
        ]} />;

      case 'Education Records':
        return <DataPanel title="Education Records" url="/api/educationrecords" keyField="educationRecordId" columns={[
          { key: 'educationRecordId', label: 'ID' }, { key: 'residentId', label: 'Resident' },
          { key: 'recordDate', label: 'Date' }, { key: 'educationLevel', label: 'Level' },
          { key: 'schoolName', label: 'School' }, { key: 'enrollmentStatus', label: 'Status' },
          { key: 'attendanceRate', label: 'Attendance %' }, { key: 'progressPercent', label: 'Progress %' },
        ]} />;

      case 'Donors':
        return <DataPanel title="Supporters & Donors" url="/api/supporters" keyField="supporterId" columns={[
          { key: 'supporterId', label: 'ID' }, { key: 'displayName', label: 'Name' },
          { key: 'supporterType', label: 'Type' }, { key: 'email', label: 'Email' },
          { key: 'country', label: 'Country' }, { key: 'status', label: 'Status' },
          { key: 'firstDonationDate', label: 'First Donation' }, { key: 'acquisitionChannel', label: 'Channel' },
        ]} />;

      case 'Reports': return <StaffReports />;
      case 'Pending Approvals': return <StaffPendingApprovals />;

      default: return <p style={{ fontSize: 14, color: c.muted }}>{activeNav} — coming soon</p>;
    }
  };

  return (
    <main id="main-content" style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
      <Sidebar id="staff-sidebar" items={navItems} active={activeNav} setActive={setActiveNav}
        user={`${user?.userName ?? 'Staff'} · ${displayRole}`} onLogout={handleLogout} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
        <section aria-label="Command center"
          style={{ background: STAFF_BANNER_BG, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ fontSize: 12, color: 'rgba(251,248,242,0.65)', marginBottom: 3 }}>{displayRole} Portal</p>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: c.ivory, fontWeight: 400, margin: 0 }}>
              Good morning, {user?.userName ?? 'Staff'}
            </h1>
          </div>
        </section>
        {renderContent()}
      </div>
    </main>
  );
}
