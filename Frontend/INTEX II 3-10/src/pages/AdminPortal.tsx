import { useState, useEffect, useCallback, useMemo, useId, lazy, Suspense, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { ADMIN_NAV_ITEMS } from '../admin/constants';
import { apiUrl } from '../lib/api';

const CampaignBarChart = lazy(() => import('../components/charts/CampaignBarChart'));
const BridgeLineChart = lazy(() => import('../components/charts/BridgeLineChart'));

const c = {
  ivory: '#FBF8F2', forest: '#2A4A35', gold: '#D4A44C', rose: '#C4867A',
  roseLight: '#F0D8D4', sage: '#6B9E7E', sageLight: '#D4EAD9', goldLight: '#F5E6C8',
  text: '#2C2B28', muted: '#7A786F', white: '#FFFFFF',
};
const ADMIN_BANNER_BG = `linear-gradient(120deg,rgba(42,74,53,0.82) 0%,rgba(196,134,122,0.38) 100%), url("/Smiles under the sun.png") center/cover no-repeat`;
const navItems = [...ADMIN_NAV_ITEMS];

const tok = () => localStorage.getItem('hh_token') ?? '';
const api = (url: string, opts?: RequestInit) =>
  fetch(apiUrl(url), { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}`, ...(opts?.headers ?? {}) } });

/** Client-side filter: any column value contains query (case-insensitive). */
function filterTableRows(
  rows: Record<string, unknown>[],
  columns: { key: string }[],
  query: string,
): Record<string, unknown>[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) =>
    columns.some((col) => {
      const v = row[col.key];
      if (v == null || v === '') return false;
      return String(v).toLowerCase().includes(needle);
    }),
  );
}

// ── Pagination helpers ────────────────────────────────────────────────────────

function paginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? c.ivory : c.white,
    color: disabled ? c.muted : c.forest,
    border: `1px solid ${c.sageLight}`,
    borderRadius: 5,
    padding: '4px 10px',
    fontSize: 12,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'flex-end' }}>
      <button onClick={() => onPage(1)} disabled={page === 1} style={paginationBtnStyle(page === 1)}>«</button>
      <button onClick={() => onPage(page - 1)} disabled={page === 1} style={paginationBtnStyle(page === 1)}>‹</button>
      <span style={{ fontSize: 12, color: c.muted, padding: '0 8px' }}>Page {page} of {totalPages}</span>
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages} style={paginationBtnStyle(page === totalPages)}>›</button>
      <button onClick={() => onPage(totalPages)} disabled={page === totalPages} style={paginationBtnStyle(page === totalPages)}>»</button>
    </div>
  );
}

function PerPageSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <label style={{ fontSize: 11, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Per page</label>
      <select value={value} onChange={e => onChange(Number(e.target.value))} style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 12, color: c.text, background: c.white }}>
        {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  );
}

function DataSearchBar({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Search
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Type to filter rows…'}
        autoComplete="off"
        style={{
          width: '100%',
          maxWidth: 400,
          padding: '9px 14px',
          fontSize: 13,
          border: `1px solid ${c.sageLight}`,
          borderRadius: 8,
          color: c.text,
          background: c.white,
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

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

function SectionTitle({ children }: { children: ReactNode }) {
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

function Table({
  columns,
  rows,
  keyField,
  totalCount,
}: {
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  keyField: string;
  /** When filtering, pass full dataset length for “N of M” label */
  totalCount?: number;
}) {
  if (rows.length === 0) {
    const emptyMsg =
      totalCount != null && totalCount > 0 ? 'No rows match your search.' : 'No records found.';
    return <p style={{ fontSize: 13, color: c.muted }}>{emptyMsg}</p>;
  }
  const countLabel =
    totalCount != null && totalCount !== rows.length
      ? `${rows.length} of ${totalCount} record${totalCount !== 1 ? 's' : ''} shown`
      : `${rows.length} record${rows.length !== 1 ? 's' : ''}`;
  return (
    <div style={{ overflowX: 'auto' }}>
      <p style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>{countLabel}</p>
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

// ── Pending Approvals (sensitive field changes) ───────────────────────────────

function AdminPendingApprovals() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const approvalSearchId = useId();
  const [approvalQuery, setApprovalQuery] = useState('');

  const filteredApprovalItems = useMemo(() => {
    const needle = approvalQuery.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => {
      const parts = [
        item.resource,
        item.recordId,
        item.action,
        item.notes,
        item.userId,
        item.timestamp,
        item.oldValue,
        item.newValue,
        item.auditId,
      ].map((v) => (v != null ? String(v) : ''));
      return parts.some((p) => p.toLowerCase().includes(needle));
    });
  }, [items, approvalQuery]);

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
        <>
          <DataSearchBar
            id={approvalSearchId}
            value={approvalQuery}
            onChange={setApprovalQuery}
            placeholder="Search by resource, record, action, user, or values…"
          />
          {filteredApprovalItems.length === 0 && approvalQuery.trim() !== '' ? (
            <p style={{ fontSize: 13, color: c.muted }}>No items match your search.</p>
          ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredApprovalItems.map(item => (
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
                  {(item.oldValue != null && String(item.oldValue).trim() !== '') ||
                  (item.newValue != null && String(item.newValue).trim() !== '') ? (
                    <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {item.oldValue != null && String(item.oldValue).trim() !== '' && (
                        <span style={{ background: c.roseLight, color: c.rose, borderRadius: 6, padding: '3px 10px', fontSize: 11 }}>Before: {String(item.oldValue)}</span>
                      )}
                      {item.newValue != null && String(item.newValue).trim() !== '' && (
                        <span style={{ background: c.sageLight, color: '#1B5E20', borderRadius: 6, padding: '3px 10px', fontSize: 11 }}>After: {String(item.newValue)}</span>
                      )}
                    </div>
                  ) : null}
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
        </>
      )}
    </div>
  );
}

// ── Generic read-only data panels ─────────────────────────────────────────────

function DataPanel({ title, url, columns, keyField }: { title: string; url: string; columns: { key: string; label: string }[]; keyField: string }) {
  const searchId = useId();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api(url).then(r => r.json());
      setRows(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load data.'); }
    finally { setLoading(false); }
  }, [url]);

  useEffect(() => { load(); }, [load]);

  const filteredRows = useMemo(
    () => filterTableRows(rows, columns, query),
    [rows, columns, query],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * perPage, safePage * perPage);

  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      {loading ? (
        <Loading />
      ) : error ? (
        <ApiError msg={error} retry={load} />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <DataSearchBar
              id={searchId}
              value={query}
              onChange={v => { setQuery(v); setPage(1); }}
              placeholder={`Search ${title.toLowerCase()}…`}
            />
            <PerPageSelector value={perPage} onChange={v => { setPerPage(v); setPage(1); }} />
          </div>
          <Table columns={columns} rows={pageRows} keyField={keyField} totalCount={filteredRows.length} />
          <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />
        </>
      )}
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

type EngagementVsVanitySummary = {
  totalPosts: number;
  thresholds: { engagementScoreP75: number; donationReferralsP75: number };
  segments: { segment: string; postCount: number }[];
};

function AdminReports() {
  const [bridge, setBridge] = useState<InsightBridgeRow[]>([]);
  const [campaigns, setCampaigns] = useState<InsightDonationByCampaignRow[]>([]);
  const [evSummary, setEvSummary] = useState<EngagementVsVanitySummary | null>(null);
  const [campaignTake, setCampaignTake] = useState(15);
  const [bridgeTake, setBridgeTake] = useState(24);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [bridgeRes, campaignRes, evRes] = await Promise.allSettled([
        api(`/api/insights/bridge/monthly?take=${bridgeTake}`).then(async (r) => (r.ok ? r.json() : [])),
        api(`/api/insights/donations/by-campaign?take=${campaignTake}`).then(async (r) => (r.ok ? r.json() : [])),
        api('/api/insights/social/engagement-vs-vanity').then(async (r) => (r.ok ? r.json() : null)),
      ]);

      const nextBridge = bridgeRes.status === 'fulfilled' && Array.isArray(bridgeRes.value) ? bridgeRes.value : [];
      const nextCampaigns = campaignRes.status === 'fulfilled' && Array.isArray(campaignRes.value) ? campaignRes.value : [];
      const nextEv = evRes.status === 'fulfilled' && evRes.value && typeof evRes.value === 'object' && 'segments' in evRes.value
        ? evRes.value as EngagementVsVanitySummary
        : null;

      setBridge(nextBridge);
      setCampaigns(nextCampaigns);
      setEvSummary(nextEv);

      if (nextBridge.length === 0 && nextCampaigns.length === 0 && !nextEv) {
        setError('Failed to load reports.');
      }
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
    </div>
  );
}

// ── Staff CRUD ───────────────────────────────────────────────────────────────

const STAFF_ROLES = ['Social Worker', 'Case Manager', 'Field Worker', 'Supervisor', 'Admin'];
const EMPLOYMENT_TYPES = ['Internal', 'External', 'Contract'];
const EMPLOYMENT_STATUSES = ['Active', 'Inactive', 'On Leave'];

type StaffRow = {
  staffId: number; staffCode: string; firstName: string; lastName: string;
  age: number | null; email: string; phone: string; role: string;
  employmentType: string; specialization: string; safehouseId: number | null;
  employmentStatus: string; dateHired: string; dateEnded: string;
};

const STAFF_BLANK: Omit<StaffRow, 'staffId'> = {
  staffCode: '', firstName: '', lastName: '', age: null, email: '', phone: '',
  role: 'Social Worker', employmentType: 'Internal', specialization: '',
  safehouseId: null, employmentStatus: 'Active', dateHired: '', dateEnded: '',
};

function AdminStaff() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<Omit<StaffRow, 'staffId'>>(STAFF_BLANK);
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);
  const searchId = useId();

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api('/api/staff').then(r => r.json());
      setRows(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load staff.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(r =>
      [r.staffCode, r.firstName, r.lastName, r.role, r.email, r.employmentStatus]
        .some(v => v?.toLowerCase().includes(needle))
    );
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const openCreate = () => { setForm(STAFF_BLANK); setEditId(null); setModal('create'); };
  const openEdit = (row: StaffRow) => {
    const { staffId, ...rest } = row;
    setForm(rest as Omit<StaffRow, 'staffId'>);
    setEditId(staffId);
    setModal('edit');
  };

  const save = async () => {
    setBusy(true);
    try {
      const r = modal === 'create'
        ? await api('/api/staff', { method: 'POST', body: JSON.stringify(form) })
        : await api(`/api/staff/${editId}`, { method: 'PUT', body: JSON.stringify({ ...form, staffId: editId }) });
      if (r.ok) { notify(modal === 'create' ? '✓ Staff member created.' : '✓ Staff member updated.'); setModal(null); await load(); }
      else { const err = await r.json().catch(() => ({})); notify((err as any).message ?? 'Save failed.'); }
    } finally { setBusy(false); }
  };

  const remove = async (row: StaffRow) => {
    if (!window.confirm(`Delete staff member "${row.firstName} ${row.lastName}" (${row.staffCode})? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const r = await api(`/api/staff/${row.staffId}`, { method: 'DELETE' });
      if (r.ok) { notify('Staff member deleted.'); await load(); }
      else notify('Delete failed.');
    } finally { setBusy(false); }
  };

  const field = (key: keyof typeof form, label: string, type: 'text' | 'number' | 'email' | 'select', options?: string[]) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      {type === 'select' ? (
        <select value={String(form[key] ?? '')} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13 }}>
          {options!.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={String(form[key] ?? '')}
          onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value }))}
          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13, boxSizing: 'border-box' }} />
      )}
    </div>
  );

  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  return (
    <div>
      {toast && <div style={{ background: c.sageLight, color: c.forest, borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>{toast}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <SectionTitle>Staff ({rows.length})</SectionTitle>
        <button onClick={openCreate} style={{ background: c.forest, color: c.ivory, border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add Staff</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <DataSearchBar id={searchId} value={query} onChange={v => { setQuery(v); setPage(1); }} placeholder="Search by name, code, role, email…" />
        <PerPageSelector value={perPage} onChange={v => { setPerPage(v); setPage(1); }} />
      </div>
      <p style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>
        {filtered.length !== rows.length ? `${filtered.length} of ${rows.length} records` : `${rows.length} records`}
        {totalPages > 1 && ` · showing ${paginated.length} on page ${safePage}`}
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: c.sageLight }}>
              {['ID', 'Code', 'First', 'Last', 'Role', 'Type', 'Safehouse', 'Status', 'Email', 'Actions'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, i) => (
              <tr key={row.staffId} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.staffId}</td>
                <td style={{ padding: '8px 12px' }}>{row.staffCode ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>{row.firstName ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>{row.lastName ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>{row.role ?? '—'}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.employmentType ?? '—'}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.safehouseId ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ background: row.employmentStatus === 'Active' ? c.sageLight : c.roseLight, color: row.employmentStatus === 'Active' ? c.forest : c.rose, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{row.employmentStatus ?? '—'}</span>
                </td>
                <td style={{ padding: '8px 12px', color: c.muted, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.email ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(row)} style={{ background: c.goldLight, color: c.text, border: `1px solid ${c.gold}`, borderRadius: 5, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                    <button disabled={busy} onClick={() => remove(row)} style={{ background: c.roseLight, color: c.rose, border: `1px solid ${c.rose}`, borderRadius: 5, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, opacity: busy ? 0.6 : 1 }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: c.white, borderRadius: 12, padding: '1.5rem 2rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h3 style={{ fontFamily: 'Georgia, serif', color: c.forest, margin: '0 0 1rem' }}>{modal === 'create' ? 'Add Staff Member' : 'Edit Staff Member'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {field('staffCode', 'Staff Code', 'text')}
              {field('firstName', 'First Name', 'text')}
              {field('lastName', 'Last Name', 'text')}
              {field('age', 'Age', 'number')}
              {field('email', 'Email', 'email')}
              {field('phone', 'Phone', 'text')}
              {field('role', 'Role', 'select', STAFF_ROLES)}
              {field('employmentType', 'Employment Type', 'select', EMPLOYMENT_TYPES)}
              {field('employmentStatus', 'Status', 'select', EMPLOYMENT_STATUSES)}
              {field('specialization', 'Specialization', 'text')}
              {field('safehouseId', 'Safehouse ID', 'number')}
              {field('dateHired', 'Date Hired', 'text')}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setModal(null)} style={{ background: c.ivory, color: c.text, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button disabled={busy} onClick={save} style={{ background: c.forest, color: c.ivory, border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── All Users management ──────────────────────────────────────────────────────

type UserRow = { id: number; userName: string; email: string; userType: string; isActive: boolean; isApproved: boolean; roles: string[]; lastLogin: string | null };

function AdminAllUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pending, setPending] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [newRole, setNewRole] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ username: '', email: '', password: '', role: 'Donor' });
  const [createBusy, setCreateBusy] = useState(false);
  const searchId = useId();

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [u, p] = await Promise.all([
        api('/api/auth/users').then(r => r.json()),
        api('/api/auth/pending').then(r => r.json()),
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setPending(Array.isArray(p) ? p : []);
    } catch { setError('Failed to load users.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(u =>
      [u.userName, u.email, u.userType, ...(u.roles ?? [])].some(v => v?.toLowerCase().includes(needle))
    );
  }, [users, query]);

  const approve = async (userId: number, name: string) => {
    setBusy(userId);
    try {
      const r = await api(`/api/auth/approve/${userId}`, { method: 'POST' });
      if (r.ok) { notify(`✓ Approved ${name}`); await load(); } else notify('Approval failed.');
    } finally { setBusy(null); }
  };

  const reject = async (userId: number, name: string) => {
    if (!window.confirm(`Reject account for "${name}"? This will deactivate the account.`)) return;
    setBusy(userId);
    try {
      const r = await api(`/api/auth/reject/${userId}`, { method: 'POST' });
      if (r.ok) { notify(`Rejected ${name}`); await load(); } else notify('Rejection failed.');
    } finally { setBusy(null); }
  };

  const openEditRole = (u: UserRow) => { setEditUser(u); setNewRole(u.roles?.[0] ?? 'Donor'); };

  const saveRole = async () => {
    if (!editUser) return;
    setBusy(editUser.id);
    try {
      const r = await api(`/api/auth/users/${editUser.id}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole }) });
      if (r.ok) { notify(`✓ Role updated to ${newRole}`); setEditUser(null); await load(); } else notify('Role update failed.');
    } finally { setBusy(null); }
  };

  const deleteUser = async (u: UserRow) => {
    if (!window.confirm(`Permanently delete user "${u.userName}"? This cannot be undone.`)) return;
    setBusy(u.id);
    try {
      const r = await api(`/api/auth/users/${u.id}`, { method: 'DELETE' });
      if (r.ok) { notify(`User "${u.userName}" deleted.`); await load(); } else notify('Delete failed.');
    } finally { setBusy(null); }
  };

  const createUser = async () => {
    if (!createForm.username || !createForm.email || !createForm.password) { notify('All fields required.'); return; }
    setCreateBusy(true);
    try {
      const r = await api('/api/auth/create-user', { method: 'POST', body: JSON.stringify({ username: createForm.username, email: createForm.email, password: createForm.password, role: createForm.role }) });
      if (r.ok) { notify('✓ User created.'); setCreateModal(false); setCreateForm({ username: '', email: '', password: '', role: 'Donor' }); await load(); }
      else { const err = await r.json().catch(() => ({})); notify((err as any).message ?? ((err as any).errors?.[0]) ?? 'Create failed.'); }
    } finally { setCreateBusy(false); }
  };

  const ALL_ROLES = ['Admin', 'Supervisor', 'CaseManager', 'SocialWorker', 'FieldWorker', 'Resident', 'Donor'];

  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  return (
    <div>
      {toast && <div style={{ background: c.sageLight, color: c.forest, borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>{toast}</div>}

      {/* Pending approvals */}
      {pending.length > 0 && (
        <>
          <SectionTitle>Pending Account Approvals ({pending.length})</SectionTitle>
          <div style={{ overflowX: 'auto', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: c.goldLight }}>
                  {['ID', 'Username', 'Email', 'Type', 'Actions'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {pending.map((u, i) => (
                  <tr key={String(u.id)} style={{ borderBottom: `1px solid ${c.goldLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                    <td style={{ padding: '8px 12px', color: c.muted }}>{String(u.id)}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{String(u.userName ?? '—')}</td>
                    <td style={{ padding: '8px 12px' }}>{String(u.email ?? '—')}</td>
                    <td style={{ padding: '8px 12px', color: c.muted }}>{String(u.userType ?? '—')}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button disabled={busy === u.id} onClick={() => approve(u.id as number, String(u.userName))} style={{ background: c.sage, color: c.white, border: 'none', borderRadius: 5, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, opacity: busy === u.id ? 0.6 : 1 }}>Approve</button>
                        <button disabled={busy === u.id} onClick={() => reject(u.id as number, String(u.userName))} style={{ background: c.roseLight, color: c.rose, border: `1px solid ${c.rose}`, borderRadius: 5, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, opacity: busy === u.id ? 0.6 : 1 }}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* All users */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <SectionTitle>All Users ({users.length})</SectionTitle>
        <button onClick={() => setCreateModal(true)} style={{ background: c.forest, color: c.ivory, border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Create User</button>
      </div>
      <DataSearchBar id={searchId} value={query} onChange={setQuery} placeholder="Search by username, email, role…" />
      <p style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>{filtered.length !== users.length ? `${filtered.length} of ${users.length}` : `${users.length}`} records</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: c.sageLight }}>
              {['ID', 'Username', 'Email', 'Role(s)', 'Type', 'Approved', 'Active', 'Actions'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                <td style={{ padding: '8px 12px', color: c.muted }}>{u.id}</td>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{u.userName}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{u.email}</td>
                <td style={{ padding: '8px 12px' }}>{u.roles?.join(', ') || '—'}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{u.userType}</td>
                <td style={{ padding: '8px 12px' }}><span style={{ background: u.isApproved ? c.sageLight : c.goldLight, color: u.isApproved ? c.forest : '#7a5a00', borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>{u.isApproved ? 'Yes' : 'Pending'}</span></td>
                <td style={{ padding: '8px 12px' }}><span style={{ background: u.isActive ? c.sageLight : c.roseLight, color: u.isActive ? c.forest : c.rose, borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>{u.isActive ? 'Yes' : 'No'}</span></td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEditRole(u)} style={{ background: c.goldLight, color: c.text, border: `1px solid ${c.gold}`, borderRadius: 5, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Edit Role</button>
                    <button disabled={busy === u.id} onClick={() => deleteUser(u)} style={{ background: c.roseLight, color: c.rose, border: `1px solid ${c.rose}`, borderRadius: 5, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, opacity: busy === u.id ? 0.6 : 1 }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit role modal */}
      {editUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: c.white, borderRadius: 12, padding: '1.5rem 2rem', width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h3 style={{ fontFamily: 'Georgia, serif', color: c.forest, margin: '0 0 1rem' }}>Edit Role — {editUser.userName}</h3>
            <label style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>New Role</label>
            <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13, marginBottom: 16 }}>
              {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditUser(null)} style={{ background: c.ivory, color: c.text, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button disabled={busy === editUser.id} onClick={saveRole} style={{ background: c.forest, color: c.ivory, border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: busy === editUser.id ? 0.6 : 1 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Create user modal */}
      {createModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: c.white, borderRadius: 12, padding: '1.5rem 2rem', width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h3 style={{ fontFamily: 'Georgia, serif', color: c.forest, margin: '0 0 1rem' }}>Create User</h3>
            {(['username', 'email', 'password'] as const).map(k => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</label>
                <input type={k === 'password' ? 'password' : 'text'} value={createForm[k]}
                  onChange={e => setCreateForm(f => ({ ...f, [k]: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Role</label>
              <select value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13 }}>
                {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setCreateModal(false)} style={{ background: c.ivory, color: c.text, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button disabled={createBusy} onClick={createUser} style={{ background: c.forest, color: c.ivory, border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: createBusy ? 0.6 : 1 }}>{createBusy ? 'Creating…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Residents with inline edit + create ──────────────────────────────────────

type ResidentRow = {
  residentId: number; caseControlNo: string; safehouseId: number | null;
  caseStatus: string; dateOfAdmission: string; currentRiskLevel: string;
  reintegrationStatus: string; assignedSocialWorker: string;
  reintegrationType: string; dateEnrolled: string;
};

const CASE_STATUSES = ['Active', 'Closed', 'Transferred'];
const RISK_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const REINTEGRATION_STATUSES = ['Not Started', 'In Progress', 'Completed', 'On Hold'];
const REINTEGRATION_TYPES = ['Family Reunification', 'Foster Care', 'Adoption (Domestic)', 'Adoption (Inter-Country)', 'Independent Living', 'None'];

const RESIDENT_BLANK: Omit<ResidentRow, 'residentId'> = {
  caseControlNo: '', safehouseId: null, caseStatus: 'Active',
  dateOfAdmission: '', currentRiskLevel: 'Low', reintegrationStatus: 'Not Started',
  reintegrationType: 'None', assignedSocialWorker: '', dateEnrolled: '',
};

function AdminResidents() {
  const [rows, setRows] = useState<ResidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [createForm, setCreateForm] = useState<Omit<ResidentRow, 'residentId'>>(RESIDENT_BLANK);
  const [editRow, setEditRow] = useState<ResidentRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<ResidentRow>>({});
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);
  const searchId = useId();

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api('/api/residents').then(r => r.json());
      setRows(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load residents.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(r =>
      [r.caseControlNo, r.caseStatus, r.currentRiskLevel, r.reintegrationStatus, r.assignedSocialWorker]
        .some(v => v?.toLowerCase().includes(needle))
    );
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const openCreate = () => { setCreateForm(RESIDENT_BLANK); setModal('create'); };

  const openEdit = (row: ResidentRow) => {
    setEditRow(row);
    setEditForm({
      caseStatus: row.caseStatus,
      currentRiskLevel: row.currentRiskLevel,
      reintegrationStatus: row.reintegrationStatus,
      reintegrationType: row.reintegrationType,
      assignedSocialWorker: row.assignedSocialWorker,
    });
    setModal('edit');
  };

  const saveCreate = async () => {
    setBusy(true);
    try {
      const r = await api('/api/residents', { method: 'POST', body: JSON.stringify(createForm) });
      if (r.ok) { notify('✓ Resident created.'); setModal(null); await load(); }
      else { const err = await r.json().catch(() => ({})); notify((err as any).message ?? 'Create failed.'); }
    } finally { setBusy(false); }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setBusy(true);
    try {
      const body = { ...editRow, ...editForm };
      const r = await api(`/api/residents/${editRow.residentId}`, { method: 'PUT', body: JSON.stringify(body) });
      if (r.ok) { notify('✓ Resident record updated.'); setModal(null); setEditRow(null); await load(); }
      else { const err = await r.json().catch(() => ({})); notify((err as any).message ?? 'Save failed.'); }
    } finally { setBusy(false); }
  };

  const residentField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    type: 'text' | 'number' | 'select' | 'date',
    options?: string[],
  ) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      {type === 'select' ? (
        <select value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13 }}>
          {options!.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type === 'date' ? 'date' : type} value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13, boxSizing: 'border-box' }} />
      )}
    </div>
  );

  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  return (
    <div>
      {toast && <div style={{ background: c.sageLight, color: c.forest, borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>{toast}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <SectionTitle>Residents ({rows.length})</SectionTitle>
        <button onClick={openCreate} style={{ background: c.forest, color: c.ivory, border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add Resident</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <DataSearchBar id={searchId} value={query} onChange={v => { setQuery(v); setPage(1); }} placeholder="Search by case no., status, risk, social worker…" />
        <PerPageSelector value={perPage} onChange={v => { setPerPage(v); setPage(1); }} />
      </div>
      <p style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>
        {filtered.length !== rows.length ? `${filtered.length} of ${rows.length}` : `${rows.length}`} records
        {totalPages > 1 && ` · showing ${paginated.length} on page ${safePage}`}
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: c.sageLight }}>
              {['ID', 'Case No.', 'Safehouse', 'Status', 'Admitted', 'Risk', 'Reintegration', 'Social Worker', 'Actions'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, i) => (
              <tr key={row.residentId} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.residentId}</td>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.caseControlNo ?? '—'}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.safehouseId ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ background: row.caseStatus === 'Active' ? c.sageLight : c.roseLight, color: row.caseStatus === 'Active' ? c.forest : c.rose, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{row.caseStatus ?? '—'}</span>
                </td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.dateOfAdmission ? new Date(row.dateOfAdmission).toLocaleDateString() : '—'}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ background: row.currentRiskLevel === 'Critical' || row.currentRiskLevel === 'High' ? c.roseLight : c.goldLight, color: row.currentRiskLevel === 'Critical' || row.currentRiskLevel === 'High' ? c.rose : '#7a5a00', borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>{row.currentRiskLevel ?? '—'}</span>
                </td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.reintegrationStatus ?? '—'}</td>
                <td style={{ padding: '8px 12px', color: c.muted, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.assignedSocialWorker ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>
                  <button onClick={() => openEdit(row)} style={{ background: c.goldLight, color: c.text, border: `1px solid ${c.gold}`, borderRadius: 5, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />

      {/* Create modal */}
      {modal === 'create' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: c.white, borderRadius: 12, padding: '1.5rem 2rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h3 style={{ fontFamily: 'Georgia, serif', color: c.forest, margin: '0 0 1rem' }}>Add Resident</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {residentField('Case Control No.', createForm.caseControlNo, v => setCreateForm(f => ({ ...f, caseControlNo: v })), 'text')}
              {residentField('Safehouse ID', String(createForm.safehouseId ?? ''), v => setCreateForm(f => ({ ...f, safehouseId: v === '' ? null : Number(v) })), 'number')}
              {residentField('Case Status', createForm.caseStatus, v => setCreateForm(f => ({ ...f, caseStatus: v })), 'select', CASE_STATUSES)}
              {residentField('Current Risk Level', createForm.currentRiskLevel, v => setCreateForm(f => ({ ...f, currentRiskLevel: v })), 'select', RISK_LEVELS)}
              {residentField('Date of Admission', createForm.dateOfAdmission, v => setCreateForm(f => ({ ...f, dateOfAdmission: v })), 'date')}
              {residentField('Date Enrolled', createForm.dateEnrolled, v => setCreateForm(f => ({ ...f, dateEnrolled: v })), 'date')}
              {residentField('Reintegration Status', createForm.reintegrationStatus, v => setCreateForm(f => ({ ...f, reintegrationStatus: v })), 'select', REINTEGRATION_STATUSES)}
              {residentField('Reintegration Type', createForm.reintegrationType, v => setCreateForm(f => ({ ...f, reintegrationType: v })), 'select', REINTEGRATION_TYPES)}
            </div>
            {residentField('Assigned Social Worker', createForm.assignedSocialWorker, v => setCreateForm(f => ({ ...f, assignedSocialWorker: v })), 'text')}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setModal(null)} style={{ background: c.ivory, color: c.text, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button disabled={busy} onClick={saveCreate} style={{ background: c.forest, color: c.ivory, border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {modal === 'edit' && editRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: c.white, borderRadius: 12, padding: '1.5rem 2rem', width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h3 style={{ fontFamily: 'Georgia, serif', color: c.forest, margin: '0 0 0.25rem' }}>Edit Resident Record</h3>
            <p style={{ fontSize: 12, color: c.muted, marginBottom: 1.25 * 16 }}>Case #{editRow.caseControlNo} · ID {editRow.residentId}</p>
            {([
              ['caseStatus', 'Case Status', CASE_STATUSES],
              ['currentRiskLevel', 'Current Risk Level', RISK_LEVELS],
              ['reintegrationStatus', 'Reintegration Status', REINTEGRATION_STATUSES],
              ['reintegrationType', 'Reintegration Type', REINTEGRATION_TYPES],
            ] as [keyof ResidentRow, string, string[]][]).map(([key, label, opts]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
                <select value={String(editForm[key] ?? '')} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13 }}>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Assigned Social Worker</label>
              <input type="text" value={String(editForm.assignedSocialWorker ?? '')}
                onChange={e => setEditForm(f => ({ ...f, assignedSocialWorker: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setModal(null); setEditRow(null); }} style={{ background: c.ivory, color: c.text, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button disabled={busy} onClick={saveEdit} style={{ background: c.forest, color: c.ivory, border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Donations with recurring filter + pagination ──────────────────────────────

type DonationRow = {
  donationId: number; donationDate: string; donationType: string;
  campaignName: string; amount: number | null; currencyCode: string;
  channelSource: string; isRecurring: boolean | null;
};

type RecurringFilter = 'all' | 'recurring' | 'one-time';

function AdminDonations() {
  const [rows, setRows] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [recurringFilter, setRecurringFilter] = useState<RecurringFilter>('all');
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);
  const searchId = useId();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api('/api/donations').then(r => r.json());
      setRows(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load donations.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let result = rows;
    if (recurringFilter === 'recurring') result = result.filter(r => r.isRecurring === true);
    else if (recurringFilter === 'one-time') result = result.filter(r => r.isRecurring !== true);
    const needle = query.trim().toLowerCase();
    if (!needle) return result;
    return result.filter(r =>
      [r.donationType, r.campaignName, r.channelSource, r.currencyCode, String(r.donationDate ?? ''), String(r.amount ?? '')]
        .some(v => v.toLowerCase().includes(needle))
    );
  }, [rows, query, recurringFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 14px', fontSize: 12, borderRadius: 6, fontWeight: active ? 600 : 400, cursor: 'pointer',
    background: active ? c.forest : c.white, color: active ? c.ivory : c.text,
    border: `1px solid ${active ? c.forest : c.sageLight}`,
  });

  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  const recurringCounts = {
    all: rows.length,
    recurring: rows.filter(r => r.isRecurring === true).length,
    'one-time': rows.filter(r => r.isRecurring !== true).length,
  };

  return (
    <div>
      <SectionTitle>Donations ({rows.length})</SectionTitle>

      {/* Recurring filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button style={filterBtnStyle(recurringFilter === 'all')} onClick={() => { setRecurringFilter('all'); setPage(1); }}>
          All ({recurringCounts.all})
        </button>
        <button style={filterBtnStyle(recurringFilter === 'recurring')} onClick={() => { setRecurringFilter('recurring'); setPage(1); }}>
          Recurring ({recurringCounts.recurring})
        </button>
        <button style={filterBtnStyle(recurringFilter === 'one-time')} onClick={() => { setRecurringFilter('one-time'); setPage(1); }}>
          One-time ({recurringCounts['one-time']})
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <DataSearchBar id={searchId} value={query} onChange={v => { setQuery(v); setPage(1); }} placeholder="Search by type, campaign, channel…" />
        <PerPageSelector value={perPage} onChange={v => { setPerPage(v); setPage(1); }} />
      </div>
      <p style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>
        {filtered.length !== rows.length ? `${filtered.length} of ${rows.length} records` : `${rows.length} records`}
        {totalPages > 1 && ` · showing ${paginated.length} on page ${safePage}`}
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: c.sageLight }}>
              {['ID', 'Date', 'Type', 'Campaign', 'Amount', 'Currency', 'Channel', 'Recurring'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, i) => (
              <tr key={row.donationId} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.donationId}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.donationDate ? new Date(row.donationDate).toLocaleDateString() : '—'}</td>
                <td style={{ padding: '8px 12px' }}>{row.donationType ?? '—'}</td>
                <td style={{ padding: '8px 12px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.campaignName ?? '—'}</td>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.amount != null ? Number(row.amount).toLocaleString() : '—'}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.currencyCode ?? '—'}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.channelSource ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>
                  {row.isRecurring === true
                    ? <span style={{ background: c.sageLight, color: c.forest, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>Yes</span>
                    : <span style={{ background: c.ivory, color: c.muted, borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>No</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}

export default function AdminPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeNav, setActiveNav] = useState('Dashboard');

  useEffect(() => {
    const st = location.state as { nav?: string } | null | undefined;
    const nav = st?.nav;
    if (nav && (ADMIN_NAV_ITEMS as readonly string[]).includes(nav)) {
      setActiveNav(nav);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderContent = () => {
    switch (activeNav) {
      case 'Dashboard': return <AdminDashboard />;
      case 'Users': return <AdminAllUsers />;
      case 'Pending Approvals': return <AdminPendingApprovals />;
      case 'Residents': return <AdminResidents />;
      case 'Staff': return <AdminStaff />;
      case 'Safehouses':
        return <DataPanel title="Safehouses" url="/api/safehouses" keyField="safehouseId" columns={[
          { key: 'safehouseId', label: 'ID' }, { key: 'safehouseCode', label: 'Code' },
          { key: 'name', label: 'Name' }, { key: 'city', label: 'City' },
          { key: 'region', label: 'Region' }, { key: 'status', label: 'Status' },
          { key: 'capacityGirls', label: 'Capacity' }, { key: 'currentOccupancy', label: 'Occupancy' },
        ]} />;
      case 'Donations': return <AdminDonations />;
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
      <Sidebar
        id="admin-sidebar"
        items={navItems}
        active={activeNav}
        onSelectNavItem={(item) => {
          if (item === 'Pipelines') navigate('/admin/pipelines');
          else setActiveNav(item);
        }}
        user={`${user?.userName ?? 'Admin'} · Admin`}
        onLogout={handleLogout}
      />
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
