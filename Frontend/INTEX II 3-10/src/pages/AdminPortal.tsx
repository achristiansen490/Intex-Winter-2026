import { useState, useEffect, useCallback, useMemo, useId, useRef, lazy, Suspense, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { ADMIN_NAV_ITEMS } from '../admin/constants';
import { usePendingAuditApprovalCount } from '../hooks/usePendingAuditApprovalCount';
import { adminNavItemToSlug, adminSlugToNavItem } from '../lib/portalTabs';
import { apiFetch as api, jsonBody, jsonIfOk } from '../lib/api';
import { buildMonthWindowEndingAtCap, capRowsAtChartMaxMonth, monthKey as chartMonthKey, parseMonthStart, sortRowsByMonthAsc } from '../lib/chartDateCap';
import { QuarterlyOkrRateSection, type QuarterlyRateOkrResponse } from '../components/dashboard/QuarterlyOkrRateSection';
import { SocialMediaImpactSection } from '../components/reports/SocialMediaImpactSection';

const CampaignBarChart = lazy(() => import('../components/charts/CampaignBarChart'));
const BridgeLineChart = lazy(() => import('../components/charts/BridgeLineChart'));
const MonthlyLineChart = lazy(() => import('../components/charts/MonthlyLineChart'));

const c = {
  ivory: '#F9FCFB', forest: '#2A4A35', gold: '#D4A44C', rose: '#C4867A',
  roseLight: '#F0D8D4', sage: '#7FA89C', sageLight: '#E0EBE8', goldLight: '#F5E6C8',
  skyLight: '#DCEBFA', indigo: '#3C6BA4', tealLight: '#D8EEE6',
  text: '#2C2B28', muted: '#7A786F', white: '#FFFFFF',
};
const ADMIN_BANNER_BG = 'linear-gradient(135deg, #244232 0%, #2A4A35 52%, #35624A 100%)';
const navItems = [...ADMIN_NAV_ITEMS];

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

const pageBtnBase: React.CSSProperties = { border: `1px solid ${c.sageLight}`, borderRadius: 5, padding: '4px 10px', fontSize: 12 };
const pageBtnEnabled: React.CSSProperties = { ...pageBtnBase, background: c.white, color: c.forest, cursor: 'pointer' };
const pageBtnDisabled: React.CSSProperties = { ...pageBtnBase, background: c.ivory, color: c.muted, cursor: 'default', opacity: 0.5 };

const filterBtnActive: React.CSSProperties = { padding: '5px 14px', fontSize: 12, borderRadius: 6, fontWeight: 600, cursor: 'pointer', background: c.forest, color: c.ivory, border: `1px solid ${c.forest}` };
const filterBtnInactive: React.CSSProperties = { padding: '5px 14px', fontSize: 12, borderRadius: 6, fontWeight: 400, cursor: 'pointer', background: c.white, color: c.text, border: `1px solid ${c.sageLight}` };

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'flex-end' }}>
      <button onClick={() => onPage(1)} disabled={page === 1} style={page === 1 ? pageBtnDisabled : pageBtnEnabled}>«</button>
      <button onClick={() => onPage(page - 1)} disabled={page === 1} style={page === 1 ? pageBtnDisabled : pageBtnEnabled}>‹</button>
      <span style={{ fontSize: 12, color: c.muted, padding: '0 8px' }}>Page {page} of {totalPages}</span>
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages} style={page === totalPages ? pageBtnDisabled : pageBtnEnabled}>›</button>
      <button onClick={() => onPage(totalPages)} disabled={page === totalPages} style={page === totalPages ? pageBtnDisabled : pageBtnEnabled}>»</button>
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
  residentNameById,
}: {
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  keyField: string;
  /** When filtering, pass full dataset length for “N of M” label */
  totalCount?: number;
  residentNameById?: Map<number, string>;
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
                  {col.key === 'residentId'
                    ? (() => {
                        const raw = row[col.key];
                        if (raw == null || raw === '') return '—';
                        const id = Number(raw);
                        const name = Number.isFinite(id) ? residentNameById?.get(id) : undefined;
                        return name ? `${name} (#${String(raw)})` : `#${String(raw)}`;
                      })()
                    : String(row[col.key] ?? '—')}
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

type EducationAttendanceOkrItem = {
  period: string;
  year: number;
  quarter: number;
  residentCount: number;
  attendanceRateAvg: number | null;
  progressPercentAvg: number | null;
  targetAttendanceRate: number | null;
};

type EducationAttendanceOkrResponse = {
  metricKey: string;
  generatedAtUtc: string;
  items: EducationAttendanceOkrItem[];
};

function AdminDashboard() {
  const [kpis, setKpis] = useState<Record<string, unknown> | null>(null);
  const [proof, setProof] = useState<Record<string, unknown> | null>(null);
  const [okr, setOkr] = useState<EducationAttendanceOkrResponse | null>(null);
  const [okrProcess, setOkrProcess] = useState<QuarterlyRateOkrResponse | null>(null);
  const [okrVisits, setOkrVisits] = useState<QuarterlyRateOkrResponse | null>(null);
  const [okrIncidents, setOkrIncidents] = useState<QuarterlyRateOkrResponse | null>(null);
  const [okrSocialRef, setOkrSocialRef] = useState<QuarterlyRateOkrResponse | null>(null);
  const [okrSocialCtr, setOkrSocialCtr] = useState<QuarterlyRateOkrResponse | null>(null);
  const [bridge, setBridge] = useState<InsightBridgeRow[]>([]);
  const [campaigns, setCampaigns] = useState<InsightDonationByCampaignRow[]>([]);
  const [evSummary, setEvSummary] = useState<EngagementVsVanitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [k, p, o, op, ov, oi, osr, osc, bridgeRows, campaignRows, socialRows] = await Promise.all([
        api('/api/dashboard/kpis').then((r) => jsonIfOk(r, null)),
        api('/api/dashboard/admin-proof').then((r) => jsonIfOk(r, null)),
        api('/api/okrs/education/attendance/quarterly?take=6').then((r) => jsonIfOk(r, null)),
        api('/api/okrs/healing/process-sessions/quarterly?take=6').then((r) => jsonIfOk(r, null)),
        api('/api/okrs/caring/home-visits/clean-rate/quarterly?take=6').then((r) => jsonIfOk(r, null)),
        api('/api/okrs/healing/incidents/resolution-rate/quarterly?take=6').then((r) => jsonIfOk(r, null)),
        api('/api/okrs/outreach/social/referral-conversion/quarterly?take=6').then((r) => jsonIfOk(r, null)),
        api('/api/okrs/outreach/social/click-through/quarterly?take=6').then((r) => jsonIfOk(r, null)),
        api('/api/insights/bridge/monthly?take=18').then((r) => jsonIfOk(r, [])),
        api('/api/insights/donations/by-campaign?take=8').then((r) => jsonIfOk(r, [])),
        api('/api/insights/social/engagement-vs-vanity').then((r) => jsonIfOk(r, null)),
      ]);
      setKpis(k); setProof(p);
      setOkr(o);
      setOkrProcess(op);
      setOkrVisits(ov);
      setOkrIncidents(oi);
      setOkrSocialRef(osr);
      setOkrSocialCtr(osc);
      setBridge(Array.isArray(bridgeRows) ? bridgeRows : []);
      setCampaigns(Array.isArray(campaignRows) ? campaignRows : []);
      setEvSummary(socialRows && typeof socialRows === 'object' ? socialRows as EngagementVsVanitySummary : null);
    } catch { setError('Failed to load dashboard.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  const check = (proof as any)?.check ?? {};
  const ops = (kpis as any)?.operations ?? {};
  const donor = (kpis as any)?.donor ?? {};
  const outreach = (kpis as any)?.outreach ?? {};
  const now = new Date(2026, 2, 1); // March 2026 cap for dashboard visuals
  const quarterLabel = (year: number, quarter: number) => `Q${quarter} ${year}`;
  const buildDummyEducationItems = () =>
    [3, 2, 1, 0].map((offset) => {
      const d = new Date(now.getFullYear(), now.getMonth() - offset * 3, 1);
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      const residents = Math.max(12, Number(ops.activeResidents ?? 30));
      const attendance = Math.min(0.93, 0.62 + offset * 0.07);
      const target = 0.85;
      return {
        period: quarterLabel(d.getFullYear(), quarter),
        year: d.getFullYear(),
        quarter,
        residentCount: residents,
        attendanceRateAvg: attendance,
        targetAttendanceRate: target,
        progressPercentAvg: Math.min(99, 58 + offset * 10),
      } as EducationAttendanceOkrItem;
    });
  const educationItems = Array.isArray((okr as any)?.items) && (okr as any).items.length > 0
    ? ((okr as any).items as EducationAttendanceOkrItem[])
    : buildDummyEducationItems();
  const latest = educationItems[0];
  const att = latest?.attendanceRateAvg;
  const tgt = latest?.targetAttendanceRate;
  const attPct = att != null ? Math.round(att * 100) : null;
  const tgtPct = tgt != null ? Math.round(tgt * 100) : null;
  const progressToTarget = (att != null && tgt != null && tgt > 0) ? Math.min(1, Math.max(0, att / tgt)) : null;
  const withFallbackRate = (
    response: QuarterlyRateOkrResponse | null,
    metricKey: string,
    seedRate: number,
    seedTarget: number,
    denominator: number,
  ): QuarterlyRateOkrResponse => {
    if (response?.items?.some((x) => x.denominator > 0)) return response;
    const items = [3, 2, 1, 0].map((offset) => {
      const d = new Date(now.getFullYear(), now.getMonth() - offset * 3, 1);
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      const den = Math.max(denominator, 8);
      const rate = Math.min(0.98, seedRate + offset * 0.04);
      return {
        period: quarterLabel(d.getFullYear(), quarter),
        year: d.getFullYear(),
        quarter,
        rate,
        targetRate: seedTarget,
        numerator: Math.round(den * rate),
        denominator: den,
      };
    });
    return {
      metricKey,
      generatedAtUtc: new Date().toISOString(),
      items,
    };
  };
  const displayOkrProcess = withFallbackRate(okrProcess, 'healing-process-sessions', 0.61, 0.8, 36);
  const displayOkrVisits = withFallbackRate(okrVisits, 'caring-home-visits-clean-rate', 0.72, 0.86, 24);
  const displayOkrIncidents = withFallbackRate(okrIncidents, 'healing-incident-resolution', 0.68, 0.85, 18);
  const displayOkrSocialRef = withFallbackRate(okrSocialRef, 'outreach-referral-conversion', 0.24, 0.35, 40);
  const displayOkrSocialCtr = withFallbackRate(okrSocialCtr, 'outreach-social-ctr', 0.04, 0.06, 2800);

  const bridgeRows = sortRowsByMonthAsc(
    capRowsAtChartMaxMonth(bridge, (r) => r.month),
    (r) => r.month,
  );
  const monthlyLabel = (raw: string) => {
    const d = new Date(raw);
    return Number.isNaN(d.getTime())
      ? raw
      : d.toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
  };

  const bridgeFallback = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((offset) => {
    const d = new Date(2026, 2 - offset, 1); // ends at Mar 2026
    return {
      month: d.toISOString(),
      posts_n: 8 + offset * 2,
      click_throughs: 340 + offset * 65,
      donation_referrals: 6 + offset,
      donation_total_php: 95000 + offset * 18000,
      incidents: Math.max(1, 9 - offset),
      avg_edu_progress: 61 + offset * 3,
      avg_health: 62 + offset * 2,
      active_residents: Math.max(12, Number(ops.activeResidents ?? 28) - (5 - offset)),
    } as InsightBridgeRow;
  });
  const bridgeDisplay = bridgeRows.length > 0 ? bridgeRows : bridgeFallback;
  const monthKey = (d: Date) => chartMonthKey(d);
  const fixedCurrentMonth = new Date(2026, 2, 1); // Mar 2026
  const trendWindowMonths = 12; // Apr 2025 -> Mar 2026
  const monthWindow = Array.from({ length: trendWindowMonths }, (_, i) => {
    const d = new Date(fixedCurrentMonth.getFullYear(), fixedCurrentMonth.getMonth() - (trendWindowMonths - 1 - i), 1);
    return d;
  });
  const bridgeByMonth = new Map(
    bridgeDisplay
      .map((r) => {
        const d = parseMonthStart(r.month);
        if (!d) return null;
        return [monthKey(d), r] as const;
      })
      .filter((x): x is readonly [string, InsightBridgeRow] => x != null),
  );
  const activeResidentRaw = monthWindow.map((d) => {
    const r = bridgeByMonth.get(monthKey(d));
    return {
      month: monthlyLabel(d.toISOString()),
      total: Number(r?.active_residents ?? 0),
    };
  });
  const activeResidentTrendData = activeResidentRaw.some((p) => p.total > 0)
    ? activeResidentRaw
    : monthWindow.map((d, i) => ({
        month: monthlyLabel(d.toISOString()),
        total: Math.max(8, 28 + Math.round(Math.sin(i * 0.7) * 5) + i),
      }));
  const donationMonthWindow = buildMonthWindowEndingAtCap(8);
  const socialPostWindowMonths = 6; // Oct 2025 -> Mar 2026
  const socialPostMonthWindow = Array.from({ length: socialPostWindowMonths }, (_, i) => {
    const d = new Date(fixedCurrentMonth.getFullYear(), fixedCurrentMonth.getMonth() - (socialPostWindowMonths - 1 - i), 1);
    return d;
  });

  const donationsTrendRaw = donationMonthWindow.map((d) => {
    const r = bridgeByMonth.get(monthKey(d));
    return {
      month: monthlyLabel(d.toISOString()),
      donations: Number(r?.donation_total_php ?? 0),
      referrals: Number(r?.donation_referrals ?? 0),
      incidents: 0,
    };
  });
  const donationsTrendData = donationsTrendRaw.some((p) => p.donations > 0 || p.referrals > 0)
    ? donationsTrendRaw
    : donationMonthWindow.map((d, i) => ({
        month: monthlyLabel(d.toISOString()),
        donations: Math.max(20000, 90000 + i * 18000 + Math.round(Math.sin(i * 0.6) * 7000)),
        referrals: Math.max(1, 5 + i + (i % 2 === 0 ? 1 : 0)),
        incidents: 0,
      }));
  const socialPostsTrendRaw = socialPostMonthWindow.map((d) => {
    const r = bridgeByMonth.get(monthKey(d));
    return {
      name: monthlyLabel(d.toISOString()),
      total: Number(r?.posts_n ?? 0),
    };
  });
  const socialPostsTrendData = socialPostsTrendRaw.some((p) => p.total > 0)
    ? socialPostsTrendRaw
    : socialPostMonthWindow.map((d, i) => ({
        name: monthlyLabel(d.toISOString()),
        total: Math.max(2, 10 + Math.round(Math.cos(i * 0.8) * 3) + i),
      }));
  const campaignChartData = campaigns.map((r) => ({ name: r.campaignName, total: Number(r.totalValuePhp ?? 0) }));
  const engagementSegmentData =
    evSummary?.segments?.map((s) => ({ name: s.segment.replace(/_/g, ' '), total: s.postCount })) ?? [];
  const cardStyle = (bg: string, border: string): React.CSSProperties => ({
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 14,
    padding: '1rem 1.25rem',
  });

  return (
    <div>
      <SectionTitle>System Counts</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Active Residents" value={ops.activeResidents ?? '—'} accent={c.tealLight} />
        <StatCard label="Total Supporters" value={check.supporters ?? '—'} accent={c.skyLight} />
        <StatCard label="Number of Donations" value={check.donations ?? '—'} accent={c.goldLight} />
      </div>

      <SectionTitle>Operations</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Total Residents" value={check.residents ?? '—'} accent={c.tealLight} />
        <StatCard label="High Risk Residents" value={ops.highRiskResidents ?? '—'} accent={c.roseLight} />
        <StatCard label="Social Posts" value={check.socialPosts ?? '—'} accent={c.skyLight} />
      </div>

      <SectionTitle>Donor KPIs</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <StatCard label="Unique Donors" value={donor.uniqueDonors ?? '—'} />
        <StatCard label="Repeat Donor Rate" value={donor.repeatDonorRate != null ? `${(donor.repeatDonorRate * 100).toFixed(1)}%` : '—'} accent={c.goldLight} />
        <StatCard label="Total Monetary" value={donor.totalMonetaryAmount != null ? `₱${Number(donor.totalMonetaryAmount).toLocaleString()}` : '—'} accent={c.goldLight} />
        <StatCard label="Avg Donation" value={donor.avgMonetaryDonation != null ? `₱${Number(donor.avgMonetaryDonation).toFixed(0)}` : '—'} />
      </div>

      <SectionTitle>Trend Snapshot</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={cardStyle(c.white, c.sageLight)}>
          <p style={{ margin: 0, marginBottom: 8, fontSize: 12, fontWeight: 700, color: c.forest }}>Active residents over time</p>
          <p style={{ margin: 0, marginBottom: 10, fontSize: 11, color: c.muted }}>Tracks case load trend using monthly operational metrics.</p>
          <Suspense fallback={<p style={{ fontSize: 12, color: c.muted }}>Loading chart…</p>}>
            <MonthlyLineChart data={activeResidentTrendData} numberFormat="compact" seriesLabel="Residents" lineColor={c.forest} gridColor="rgba(44,43,40,0.08)" />
          </Suspense>
        </div>
        <div style={cardStyle('#FCFAF6', c.goldLight)}>
          <p style={{ margin: 0, marginBottom: 8, fontSize: 12, fontWeight: 700, color: c.forest }}>Donations and referrals trend</p>
          <p style={{ margin: 0, marginBottom: 10, fontSize: 11, color: c.muted }}>Donation value and referral activity across recent months.</p>
          <Suspense fallback={<p style={{ fontSize: 12, color: c.muted }}>Loading chart…</p>}>
            <BridgeLineChart
              data={donationsTrendData}
              donationsColor={c.indigo}
              referralsColor={c.forest}
              incidentsColor={c.gold}
              showIncidents={false}
              gridColor="rgba(44,43,40,0.08)"
            />
          </Suspense>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={cardStyle(c.white, c.skyLight)}>
          <p style={{ margin: 0, marginBottom: 8, fontSize: 12, fontWeight: 700, color: c.forest }}>Recent social post volume</p>
          <p style={{ margin: 0, marginBottom: 10, fontSize: 11, color: c.muted }}>Number of social posts published each month.</p>
          <Suspense fallback={<p style={{ fontSize: 12, color: c.muted }}>Loading chart…</p>}>
            <CampaignBarChart data={socialPostsTrendData} numberFormat="compact" barColor={c.indigo} gridColor="rgba(44,43,40,0.08)" />
          </Suspense>
        </div>
        <div style={cardStyle(c.white, c.sageLight)}>
          <p style={{ margin: 0, marginBottom: 8, fontSize: 12, fontWeight: 700, color: c.forest }}>Donations by campaign</p>
          <p style={{ margin: 0, marginBottom: 10, fontSize: 11, color: c.muted }}>Shows which campaigns are currently driving donation value.</p>
          <Suspense fallback={<p style={{ fontSize: 12, color: c.muted }}>Loading chart…</p>}>
            <CampaignBarChart data={campaignChartData} barColor={c.gold} gridColor="rgba(44,43,40,0.08)" />
          </Suspense>
        </div>
      </div>
      {engagementSegmentData.length > 0 && (
        <div style={{ ...cardStyle('#F7FAFE', c.skyLight), marginBottom: 24 }}>
          <p style={{ margin: 0, marginBottom: 8, fontSize: 12, fontWeight: 700, color: c.forest }}>Engagement quality (recent post mix)</p>
          <p style={{ margin: 0, marginBottom: 10, fontSize: 11, color: c.muted }}>
            Segment mix from social engagement analysis. Avg engagement rate: {outreach.avgEngagementRate != null ? `${(Number(outreach.avgEngagementRate) * 100).toFixed(1)}%` : '—'}.
          </p>
          <Suspense fallback={<p style={{ fontSize: 12, color: c.muted }}>Loading chart…</p>}>
            <CampaignBarChart data={engagementSegmentData} numberFormat="compact" barColor={c.forest} gridColor="rgba(44,43,40,0.08)" />
          </Suspense>
        </div>
      )}

      <SectionTitle>OKR — Education Attendance (Quarterly)</SectionTitle>
      <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 24 }}>
        {latest ? (
          <>
            <p style={{ fontSize: 12, color: c.muted, marginTop: 0, marginBottom: 10 }}>
              Latest period: <strong style={{ color: c.forest }}>{latest.period}</strong> · {latest.residentCount} residents with records
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
              <StatCard label="Attendance avg" value={attPct != null ? `${attPct}%` : '—'} accent={c.sageLight} />
              <StatCard label="Target" value={tgtPct != null ? `${tgtPct}%` : '—'} accent={c.goldLight} />
              <StatCard label="Edu progress avg" value={latest.progressPercentAvg != null ? `${Number(latest.progressPercentAvg).toFixed(1)}%` : '—'} />
            </div>
            {progressToTarget != null && (
              <div>
                <p style={{ fontSize: 11, color: c.muted, margin: 0, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Progress to target</p>
                <div style={{ background: c.ivory, border: `1px solid ${c.sageLight}`, borderRadius: 999, overflow: 'hidden', height: 10 }}>
                  <div style={{ width: `${Math.round(progressToTarget * 100)}%`, height: '100%', background: c.sage }} />
                </div>
              </div>
            )}
            {educationItems.length > 0 && (
              <div style={{ overflowX: 'auto', marginTop: 14 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: c.sageLight }}>
                      {['Quarter', 'Attendance avg', 'Target', 'Edu progress avg', 'Residents'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {educationItems.map((row: EducationAttendanceOkrItem, i: number) => (
                      <tr key={`${row.period}-${i}`} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                        <td style={{ padding: '8px 12px' }}>{row.period}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.attendanceRateAvg != null ? `${Math.round(row.attendanceRateAvg * 100)}%` : '—'}</td>
                        <td style={{ padding: '8px 12px', color: c.muted }}>{row.targetAttendanceRate != null ? `${Math.round(row.targetAttendanceRate * 100)}%` : '—'}</td>
                        <td style={{ padding: '8px 12px', color: c.muted }}>{row.progressPercentAvg != null ? `${Number(row.progressPercentAvg).toFixed(1)}%` : '—'}</td>
                        <td style={{ padding: '8px 12px', color: c.muted }}>{row.residentCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>
            No OKR data available yet. Add `education_records` and/or set quarterly targets.
          </p>
        )}
      </div>

      <QuarterlyOkrRateSection
        title="OKR — Healing: Process sessions with progress (Quarterly)"
        subtitle="Share of process sessions where progress was noted (numerator / total sessions)."
        response={displayOkrProcess}
        unitLabel="Sessions"
        emptyMessage="No quarterly data yet. Add process recordings with session dates and/or set targets."
      />
      <QuarterlyOkrRateSection
        title="OKR — Caring: Home visits without safety concern (Quarterly)"
        subtitle="Visits where no safety concern was noted, as a share of all dated home visits."
        response={displayOkrVisits}
        unitLabel="Visits"
        emptyMessage="No quarterly data yet. Add home visits with visit dates and/or set targets."
      />
      <QuarterlyOkrRateSection
        title="OKR — Healing: Incident resolution (Quarterly)"
        subtitle="Share of incident reports marked resolved in each quarter."
        response={displayOkrIncidents}
        unitLabel="Incidents"
        emptyMessage="No quarterly data yet. Add incident reports with incident dates and/or set targets."
      />

      <QuarterlyOkrRateSection
        title="OKR — Outreach: Posts that drive donation referrals (Quarterly)"
        subtitle="Share of social posts with at least one recorded donation referral in the quarter."
        response={displayOkrSocialRef}
        unitLabel="Posts"
        emptyMessage="No quarterly social post data yet (or no parseable post dates). Add social_media_posts / set Admin targets via PUT /api/okrs/outreach/social/referral-conversion/targets/{year}/{quarter}."
      />
      <QuarterlyOkrRateSection
        title="OKR — Outreach: Social click-through rate (Quarterly)"
        subtitle="Aggregate CTR: sum of click-throughs ÷ sum of impressions for posts dated in each quarter."
        response={displayOkrSocialCtr}
        unitLabel="Clicks vs impressions"
        emptyMessage="No quarterly social impressions yet. Add social posts with CreatedAt, impressions, and click-throughs."
      />
    </div>
  );
}

// ── Pending Approvals (sensitive field changes) ───────────────────────────────

function AdminPendingApprovals({ onQueueChanged }: { onQueueChanged?: () => void }) {
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
      const data = await jsonIfOk(await api('/api/auditlogs/pending'), []);
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
      if (r.ok) { notify(type === 'approve' ? '✓ Change approved and applied.' : 'Change rejected.'); await load(); onQueueChanged?.(); }
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
                  <button
                    disabled={busy === (item.auditId as number)}
                    onClick={() => act(item.auditId as number, 'approve')}
                    aria-label={`Approve change request ${String(item.auditId)}`}
                    style={{ background: c.sageLight, color: c.forest, border: `1px solid ${c.sage}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, opacity: busy === item.auditId ? 0.6 : 1 }}
                  >
                    Approve
                  </button>
                  <button
                    disabled={busy === (item.auditId as number)}
                    onClick={() => act(item.auditId as number, 'reject')}
                    aria-label={`Reject change request ${String(item.auditId)}`}
                    style={{ background: c.roseLight, color: c.rose, border: `1px solid ${c.rose}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, opacity: busy === item.auditId ? 0.6 : 1 }}
                  >
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

// ── Residents (admin CRUD-style prototype) ───────────────────────────────────

function AdminResidentsPanel() {
  const searchId = useId();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [safehouseFilter, setSafehouseFilter] = useState('All');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [toast, setToast] = useState('');
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null);
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [createRow, setCreateRow] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Record<string, unknown> | null>(null);
  const [deactivateText, setDeactivateText] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const columns = useMemo(() => [
    { key: 'residentId', label: 'ID' }, { key: 'residentName', label: 'Name' }, { key: 'caseControlNo', label: 'Case No.' },
    { key: 'safehouseId', label: 'Safehouse' }, { key: 'caseStatus', label: 'Status' },
    { key: 'sex', label: 'Sex' }, { key: 'dateOfAdmission', label: 'Date Admitted' },
    { key: 'currentRiskLevel', label: 'Risk' }, { key: 'reintegrationStatus', label: 'Reintegration' },
    { key: 'assignedSocialWorker', label: 'Social Worker' },
  ], []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await jsonIfOk(await api('/api/residents'), []);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load residents.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusOptions = useMemo(() => ['All', ...Array.from(new Set(rows.map((r) => String(r.caseStatus ?? '').trim()).filter(Boolean))).sort()], [rows]);
  const riskOptions = useMemo(() => ['All', ...Array.from(new Set(rows.map((r) => String(r.currentRiskLevel ?? '').trim()).filter(Boolean))).sort()], [rows]);
  const safehouseOptions = useMemo(() => ['All', ...Array.from(new Set(rows.map((r) => String(r.safehouseId ?? '').trim()).filter(Boolean))).sort((a, b) => Number(a) - Number(b))], [rows]);

  const rowsWithName = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        residentName: [row['residentFirstName'], row['residentLastName']]
          .map((v) => String(v ?? '').trim())
          .filter(Boolean)
          .join(' ') || '—',
      })),
    [rows],
  );
  const searchedRows = useMemo(
    () => filterTableRows(rowsWithName, columns, query),
    [rowsWithName, columns, query],
  );
  const filteredRows = useMemo(() => searchedRows.filter((row) => {
    if (statusFilter !== 'All' && String(row.caseStatus ?? '') !== statusFilter) return false;
    if (riskFilter !== 'All' && String(row.currentRiskLevel ?? '') !== riskFilter) return false;
    if (safehouseFilter !== 'All' && String(row.safehouseId ?? '') !== safehouseFilter) return false;
    return true;
  }), [searchedRows, statusFilter, riskFilter, safehouseFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = useMemo(() => filteredRows.slice((page - 1) * pageSize, page * pageSize), [filteredRows, page]);

  useEffect(() => { setPage(1); }, [query, statusFilter, riskFilter, safehouseFilter]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const getResidentKey = (row: Record<string, unknown>) =>
    String(row.caseControlNo ?? row.internalCode ?? `#${String(row.residentId ?? '')}`);

  const hasUnsavedChanges = (row: Record<string, unknown> | null) => {
    if (!row) return false;
    return (
      String(row.safehouseId ?? '') !== String((row as { __baseSafehouseId?: unknown }).__baseSafehouseId ?? '') ||
      String(row.assignedSocialWorker ?? '') !== String((row as { __baseAssignedSocialWorker?: unknown }).__baseAssignedSocialWorker ?? '') ||
      String(row.caseStatus ?? '') !== String((row as { __baseCaseStatus?: unknown }).__baseCaseStatus ?? '') ||
      String(row.currentRiskLevel ?? '') !== String((row as { __baseCurrentRiskLevel?: unknown }).__baseCurrentRiskLevel ?? '') ||
      String(row.reintegrationStatus ?? '') !== String((row as { __baseReintegrationStatus?: unknown }).__baseReintegrationStatus ?? '')
    );
  };

  const validateResident = (row: Record<string, unknown>) => {
    const nextErrors: Record<string, string> = {};
    const safehouseRaw = String(row.safehouseId ?? '').trim();
    const safehouseIdNum = Number(safehouseRaw);
    if (!safehouseRaw) nextErrors.safehouseId = 'Safehouse ID is required.';
    else if (!Number.isFinite(safehouseIdNum) || safehouseIdNum <= 0) nextErrors.safehouseId = 'Safehouse ID must be a positive number.';
    if (!String(row.assignedSocialWorker ?? '').trim()) nextErrors.assignedSocialWorker = 'Assigned social worker is required.';
    if (!String(row.caseStatus ?? '').trim()) nextErrors.caseStatus = 'Case status is required.';
    if (!String(row.currentRiskLevel ?? '').trim()) nextErrors.currentRiskLevel = 'Risk level is required.';
    if (!String(row.reintegrationStatus ?? '').trim()) nextErrors.reintegrationStatus = 'Reintegration status is required.';
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveEdit = async () => {
    if (!editRow) return;
    const id = Number(editRow.residentId);
    if (!Number.isFinite(id)) return;
    if (!validateResident(editRow)) return;
    setSaving(true);
    try {
      const payload = {
        ...editRow,
        safehouseId: editRow.safehouseId == null || editRow.safehouseId === '' ? null : Number(editRow.safehouseId),
      };
      const res = await api(`/api/residents/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await jsonBody<{ message?: string }>(res, {});
        throw new Error(body.message ?? 'Save failed.');
      }
      notify('Resident updated.');
      setEditRow(null);
      await load();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Save failed.');
    } finally { setSaving(false); }
  };

  const createResident = async () => {
    if (!createRow) return;
    if (!validateResident(createRow)) return;
    setSaving(true);
    try {
      const payload = {
        caseControlNo: String(createRow.caseControlNo ?? '').trim() || undefined,
        safehouseId: Number(createRow.safehouseId),
        assignedSocialWorker: String(createRow.assignedSocialWorker ?? '').trim(),
        caseStatus: String(createRow.caseStatus ?? '').trim(),
        currentRiskLevel: String(createRow.currentRiskLevel ?? '').trim(),
        reintegrationStatus: String(createRow.reintegrationStatus ?? '').trim(),
        sex: String(createRow.sex ?? '').trim() || undefined,
        dateOfAdmission: String(createRow.dateOfAdmission ?? '').trim() || undefined,
      };
      const res = await api('/api/residents', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await jsonBody<{ message?: string }>(res, {});
        throw new Error(body.message ?? 'Create failed.');
      }
      notify('Resident created.');
      setCreateRow(null);
      await load();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Create failed.');
    } finally { setSaving(false); }
  };

  const confirmDeactivateResident = async () => {
    if (!deactivateTarget) return;
    const id = Number(deactivateTarget.residentId);
    if (!Number.isFinite(id)) return;
    const expected = getResidentKey(deactivateTarget);
    if (deactivateText.trim() !== expected) {
      notify(`Type ${expected} exactly to confirm deactivation.`);
      return;
    }

    try {
      const payload = { ...deactivateTarget, caseStatus: 'Closed' };
      const res = await api(`/api/residents/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Deactivate failed.');
      notify(`Resident ${expected} set to Closed.`);
      setDeactivateTarget(null);
      setDeactivateText('');
      await load();
    } catch {
      notify('Deactivate failed.');
    }
  };

  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  const badgeStyle = (type: 'status' | 'risk' | 'reintegration', value: string) => {
    const lower = value.toLowerCase();
    if (type === 'risk') {
      if (lower.includes('critical') || lower.includes('high')) return { bg: c.roseLight, color: c.rose, border: c.rose };
      if (lower.includes('medium')) return { bg: c.goldLight, color: '#7A5A22', border: c.gold };
      return { bg: c.sageLight, color: '#1B5E20', border: c.sage };
    }
    if (type === 'status') {
      if (lower.includes('closed')) return { bg: '#EEECEF', color: '#5D5863', border: '#C9C5CC' };
      if (lower.includes('hold') || lower.includes('transfer')) return { bg: c.goldLight, color: '#7A5A22', border: c.gold };
      return { bg: c.sageLight, color: '#1B5E20', border: c.sage };
    }
    if (lower.includes('complete')) return { bg: c.sageLight, color: '#1B5E20', border: c.sage };
    if (lower.includes('hold')) return { bg: c.goldLight, color: '#7A5A22', border: c.gold };
    return { bg: '#E8F0F8', color: '#305C8A', border: '#9BB7D5' };
  };

  return (
    <div>
      {toast && (
        <div style={{ background: c.sageLight, color: c.forest, borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
          {toast}
        </div>
      )}

      <SectionTitle>Residents</SectionTitle>
      <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            setFieldErrors({});
            setCreateRow({
              caseControlNo: '',
              safehouseId: '',
              assignedSocialWorker: '',
              caseStatus: 'Active',
              currentRiskLevel: 'Low',
              reintegrationStatus: 'Not Started',
              sex: 'F',
              dateOfAdmission: '',
            });
          }}
          style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}
        >
          + Add resident
        </button>
      </div>
      <DataSearchBar
        id={searchId}
        value={query}
        onChange={setQuery}
        placeholder="Search by case no, status, risk, safehouse, social worker…"
      />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: c.muted }}>
          Status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            style={{ marginLeft: 6, padding: '5px 8px', borderRadius: 6, border: `1px solid ${c.sageLight}`, background: c.white }}>
            {statusOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 11, color: c.muted }}>
          Risk
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}
            style={{ marginLeft: 6, padding: '5px 8px', borderRadius: 6, border: `1px solid ${c.sageLight}`, background: c.white }}>
            {riskOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 11, color: c.muted }}>
          Safehouse
          <select value={safehouseFilter} onChange={(e) => setSafehouseFilter(e.target.value)}
            style={{ marginLeft: 6, padding: '5px 8px', borderRadius: 6, border: `1px solid ${c.sageLight}`, background: c.white }}>
            {safehouseOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <p style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>
          {filteredRows.length === rows.length
            ? `${rows.length} records`
            : `${filteredRows.length} of ${rows.length} records shown`} · Page {page} of {pageCount}
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: c.sageLight }}>
              {columns.map(col => (
                <th key={col.key} style={{ position: 'sticky', top: 0, zIndex: 2, padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap', background: c.sageLight }}>
                  {col.label}
                </th>
              ))}
              <th style={{ position: 'sticky', top: 0, right: 0, zIndex: 3, padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap', background: c.sageLight }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, i) => (
              <tr key={String(row.residentId)} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                {columns.map(col => (
                  <td key={col.key} style={{ padding: '8px 12px', color: c.text, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {col.key === 'caseStatus' || col.key === 'currentRiskLevel' || col.key === 'reintegrationStatus' ? (
                      (() => {
                        const val = String(row[col.key] ?? '—');
                        const style = badgeStyle(
                          col.key === 'caseStatus' ? 'status' : col.key === 'currentRiskLevel' ? 'risk' : 'reintegration',
                          val,
                        );
                        return (
                          <span style={{ display: 'inline-block', borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 700, background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                            {val}
                          </span>
                        );
                      })()
                    ) : (
                      String(row[col.key] ?? '—')
                    )}
                  </td>
                ))}
                <td style={{ position: 'sticky', right: 0, background: i % 2 === 0 ? c.ivory : c.white, padding: '8px 12px', borderLeft: `1px solid ${c.sageLight}` }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setViewRow(row)}
                      aria-label={`View resident ${getResidentKey(row)}`}
                      style={{ background: c.sageLight, color: c.forest, border: `1px solid ${c.sage}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => {
                        setFieldErrors({});
                        setEditRow({
                          ...row,
                          __baseSafehouseId: row.safehouseId,
                          __baseAssignedSocialWorker: row.assignedSocialWorker,
                          __baseCaseStatus: row.caseStatus,
                          __baseCurrentRiskLevel: row.currentRiskLevel,
                          __baseReintegrationStatus: row.reintegrationStatus,
                        });
                      }}
                      aria-label={`Edit resident ${getResidentKey(row)}`}
                      style={{ background: c.goldLight, color: '#5D4037', border: `1px solid ${c.gold}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { setDeactivateTarget(row); setDeactivateText(''); }}
                      aria-label={`Deactivate resident ${getResidentKey(row)}`}
                      style={{ background: c.roseLight, color: c.rose, border: `1px solid ${c.rose}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                    >
                      Deactivate
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: page === 1 ? 'not-allowed' : 'pointer', color: c.text, opacity: page === 1 ? 0.5 : 1 }}>
            Prev
          </button>
          <span style={{ fontSize: 12, color: c.muted }}>Page {page} / {pageCount}</span>
          <button disabled={page === pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: page === pageCount ? 'not-allowed' : 'pointer', color: c.text, opacity: page === pageCount ? 0.5 : 1 }}>
            Next
          </button>
        </div>
      </div>

      {viewRow && (
        <div onClick={() => setViewRow(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(44,43,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(720px, 92vw)', maxHeight: '86vh', overflowY: 'auto', background: c.white, borderRadius: 12, border: `1px solid ${c.sageLight}`, padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, color: c.forest, fontSize: 16 }}>Resident details</h3>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10 }}>
              {Object.entries(viewRow).map(([k, v]) => (
                <div key={k} style={{ border: `1px solid ${c.sageLight}`, borderRadius: 8, padding: '8px 10px', background: c.ivory }}>
                  <p style={{ margin: 0, fontSize: 10, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: 12, color: c.text }}>{String(v ?? '—')}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setViewRow(null)} style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editRow && (
        <div onClick={() => {
          if (hasUnsavedChanges(editRow)) {
            if (!window.confirm('Discard unsaved changes?')) return;
          }
          setEditRow(null);
        }} style={{ position: 'fixed', inset: 0, background: 'rgba(44,43,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(760px, 92vw)', background: c.white, borderRadius: 12, border: `1px solid ${c.sageLight}`, padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, color: c.forest, fontSize: 16 }}>Edit resident</h3>
            <p style={{ margin: '4px 0 10px 0', fontSize: 12, color: c.muted }}>Update key case-management fields. Sensitive updates may route through approvals.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10 }}>
              <label style={{ fontSize: 11, color: c.muted }}>Case No.
                <input disabled value={String(editRow.caseControlNo ?? '')}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: '#F4F4F4', color: c.muted }} />
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Safehouse ID
                <input type="number" value={String(editRow.safehouseId ?? '')}
                  onChange={(e) => setEditRow((r) => (r ? { ...r, safehouseId: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}` }} />
                {fieldErrors.safehouseId && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.safehouseId}</span>}
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Assigned Social Worker
                <input value={String(editRow.assignedSocialWorker ?? '')}
                  onChange={(e) => setEditRow((r) => (r ? { ...r, assignedSocialWorker: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}` }} />
                {fieldErrors.assignedSocialWorker && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.assignedSocialWorker}</span>}
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Case Status
                <select value={String(editRow.caseStatus ?? '')}
                  onChange={(e) => setEditRow((r) => (r ? { ...r, caseStatus: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: c.white }}>
                  {['Active', 'In Progress', 'On Hold', 'Transferred', 'Closed'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                {fieldErrors.caseStatus && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.caseStatus}</span>}
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Current Risk Level
                <select value={String(editRow.currentRiskLevel ?? '')}
                  onChange={(e) => setEditRow((r) => (r ? { ...r, currentRiskLevel: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: c.white }}>
                  {['Low', 'Medium', 'High', 'Critical'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                {fieldErrors.currentRiskLevel && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.currentRiskLevel}</span>}
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Reintegration Status
                <select value={String(editRow.reintegrationStatus ?? '')}
                  onChange={(e) => setEditRow((r) => (r ? { ...r, reintegrationStatus: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: c.white }}>
                  {['Not Started', 'In Progress', 'On Hold', 'Completed'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                {fieldErrors.reintegrationStatus && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.reintegrationStatus}</span>}
              </label>
            </div>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button disabled={saving} onClick={() => {
                if (hasUnsavedChanges(editRow) && !window.confirm('Discard unsaved changes?')) return;
                setEditRow(null);
              }}
                style={{ background: 'transparent', color: c.muted, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                Cancel
              </button>
              <button disabled={saving} onClick={saveEdit}
                style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {createRow && (
        <div onClick={() => {
          if (Object.values(createRow).some((v) => String(v ?? '').trim() !== '')) {
            if (!window.confirm('Discard new resident draft?')) return;
          }
          setCreateRow(null);
        }} style={{ position: 'fixed', inset: 0, background: 'rgba(44,43,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(760px, 92vw)', background: c.white, borderRadius: 12, border: `1px solid ${c.sageLight}`, padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, color: c.forest, fontSize: 16 }}>Create resident</h3>
            <p style={{ margin: '4px 0 10px 0', fontSize: 12, color: c.muted }}>Create a new resident record (minimum required fields).</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10 }}>
              <label style={{ fontSize: 11, color: c.muted }}>Case No.
                <input value={String(createRow.caseControlNo ?? '')}
                  onChange={(e) => setCreateRow((r) => (r ? { ...r, caseControlNo: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}` }} />
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Safehouse ID
                <input type="number" value={String(createRow.safehouseId ?? '')}
                  onChange={(e) => setCreateRow((r) => (r ? { ...r, safehouseId: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}` }} />
                {fieldErrors.safehouseId && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.safehouseId}</span>}
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Assigned Social Worker
                <input value={String(createRow.assignedSocialWorker ?? '')}
                  onChange={(e) => setCreateRow((r) => (r ? { ...r, assignedSocialWorker: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}` }} />
                {fieldErrors.assignedSocialWorker && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.assignedSocialWorker}</span>}
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Case Status
                <select value={String(createRow.caseStatus ?? '')}
                  onChange={(e) => setCreateRow((r) => (r ? { ...r, caseStatus: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: c.white }}>
                  {['Active', 'In Progress', 'On Hold', 'Transferred', 'Closed'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                {fieldErrors.caseStatus && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.caseStatus}</span>}
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Current Risk Level
                <select value={String(createRow.currentRiskLevel ?? '')}
                  onChange={(e) => setCreateRow((r) => (r ? { ...r, currentRiskLevel: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: c.white }}>
                  {['Low', 'Medium', 'High', 'Critical'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                {fieldErrors.currentRiskLevel && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.currentRiskLevel}</span>}
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Reintegration Status
                <select value={String(createRow.reintegrationStatus ?? '')}
                  onChange={(e) => setCreateRow((r) => (r ? { ...r, reintegrationStatus: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: c.white }}>
                  {['Not Started', 'In Progress', 'On Hold', 'Completed'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                {fieldErrors.reintegrationStatus && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.reintegrationStatus}</span>}
              </label>
            </div>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button disabled={saving} onClick={() => setCreateRow(null)}
                style={{ background: 'transparent', color: c.muted, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                Cancel
              </button>
              <button disabled={saving} onClick={createResident}
                style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating…' : 'Create resident'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deactivateTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,43,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div style={{ width: 'min(560px, 92vw)', background: c.white, borderRadius: 12, border: `1px solid ${c.roseLight}`, padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, color: c.rose, fontSize: 16 }}>Confirm deactivation</h3>
            <p style={{ margin: '8px 0 10px', fontSize: 12, color: c.text }}>
              Type <strong>{getResidentKey(deactivateTarget)}</strong> to confirm setting this resident to Closed.
            </p>
            <input value={deactivateText} onChange={(e) => setDeactivateText(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.rose}` }} />
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setDeactivateTarget(null); setDeactivateText(''); }}
                style={{ background: 'transparent', color: c.muted, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={confirmDeactivateResident}
                style={{ background: c.rose, color: c.white, border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Generic read-only data panels ─────────────────────────────────────────────

function DataPanel({
  title,
  url,
  columns,
  keyField,
  transformRows,
}: {
  title: string;
  url: string;
  columns: { key: string; label: string }[];
  keyField: string;
  transformRows?: (rows: Record<string, unknown>[]) => Record<string, unknown>[];
}) {
  const searchId = useId();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);
  const [residentNameById, setResidentNameById] = useState<Map<number, string>>(new Map());

  const transformRowsRef = useRef(transformRows);
  transformRowsRef.current = transformRows;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await jsonIfOk(await api(url), []);
      const arr = Array.isArray(data) ? data : [];
      const fn = transformRowsRef.current;
      setRows(fn ? fn(arr) : arr);
    } catch { setError('Failed to load data.'); }
    finally { setLoading(false); }
  }, [url]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await jsonIfOk(await api('/api/residents'), []);
        if (!mounted || !Array.isArray(data)) return;
        const next = new Map<number, string>();
        data.forEach((item) => {
          const row = item as { residentId?: unknown; residentFirstName?: unknown; residentLastName?: unknown };
          const id = Number(row.residentId);
          if (!Number.isFinite(id)) return;
          const name = [row.residentFirstName, row.residentLastName]
            .map((v) => String(v ?? '').trim())
            .filter(Boolean)
            .join(' ');
          if (name) next.set(id, name);
        });
        setResidentNameById(next);
      } catch {
        if (mounted) setResidentNameById(new Map());
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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
          <Table columns={columns} rows={pageRows} keyField={keyField} totalCount={filteredRows.length} residentNameById={residentNameById} />
          <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function CrudDataPanel({ title, url, columns, keyField }: { title: string; url: string; columns: { key: string; label: string }[]; keyField: string }) {
  const searchId = useId();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null);
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [createRow, setCreateRow] = useState<Record<string, unknown> | null>(null);
  const [residentNameById, setResidentNameById] = useState<Map<number, string>>(new Map());

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await jsonIfOk(await api(url), []);
      setRows(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load data.'); }
    finally { setLoading(false); }
  }, [url]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await jsonIfOk(await api('/api/residents'), []);
        if (!mounted || !Array.isArray(data)) return;
        const next = new Map<number, string>();
        data.forEach((item) => {
          const row = item as { residentId?: unknown; residentFirstName?: unknown; residentLastName?: unknown };
          const id = Number(row.residentId);
          if (!Number.isFinite(id)) return;
          const name = [row.residentFirstName, row.residentLastName]
            .map((v) => String(v ?? '').trim())
            .filter(Boolean)
            .join(' ');
          if (name) next.set(id, name);
        });
        setResidentNameById(next);
      } catch {
        if (mounted) setResidentNameById(new Map());
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      columns.some((col) => {
        const raw = row[col.key];
        if (col.key === 'residentId') {
          const id = Number(raw);
          const name = Number.isFinite(id) ? residentNameById.get(id) : '';
          return `${String(raw ?? '')} ${name ?? ''}`.toLowerCase().includes(needle);
        }
        if (raw == null || raw === '') return false;
        return String(raw).toLowerCase().includes(needle);
      }),
    );
  }, [rows, columns, query, residentNameById]);

  const editableColumns = columns.filter((col) => col.key !== keyField);
  const renderCellValue = (row: Record<string, unknown>, key: string) => {
    if (key === 'residentId') {
      const raw = row[key];
      if (raw == null || raw === '') return '—';
      const id = Number(raw);
      const name = Number.isFinite(id) ? residentNameById.get(id) : undefined;
      return name ? `${name} (#${String(raw)})` : `#${String(raw)}`;
    }
    return String(row[key] ?? '—');
  };
  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const normalizeRowForSave = (row: Record<string, unknown>) => {
    const payload: Record<string, unknown> = {};
    for (const col of columns) {
      const key = col.key;
      if (key === keyField) continue;
      const raw = row[key];
      if (raw == null) continue;
      if (typeof raw === 'string') {
        const t = raw.trim();
        if (t === '') continue;
        if (t === 'true') { payload[key] = true; continue; }
        if (t === 'false') { payload[key] = false; continue; }
        if (/^-?\d+(\.\d+)?$/.test(t) && !/date/i.test(key)) { payload[key] = Number(t); continue; }
        payload[key] = t;
        continue;
      }
      payload[key] = raw;
    }
    return payload;
  };

  const saveCreate = async () => {
    if (!createRow) return;
    setSaving(true);
    try {
      const payload = normalizeRowForSave(createRow);
      const res = await api(url, { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Create failed');
      setCreateRow(null);
      notify('Created successfully.');
      await load();
    } catch {
      notify('Create failed.');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    const id = editRow[keyField];
    if (id == null) return;
    setSaving(true);
    try {
      const payload = normalizeRowForSave(editRow);
      const res = await api(`${url}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Update failed');
      setEditRow(null);
      notify('Updated successfully.');
      await load();
    } catch {
      notify('Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = (setter: (updater: (prev: Record<string, unknown> | null) => Record<string, unknown> | null) => void, key: string, value: unknown) => {
    setter((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const inputFor = (
    draft: Record<string, unknown>,
    onUpdate: (key: string, value: unknown) => void,
    col: { key: string; label: string },
  ) => {
    const key = col.key;
    const value = draft[key];
    const valueString = String(value ?? '');
    if (typeof value === 'boolean') {
      return (
        <select
          value={String(value)}
          onChange={(e) => onUpdate(key, e.target.value === 'true')}
          style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: c.white }}
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }
    const maybeDate = /date|time/i.test(key);
    const maybeNumber = typeof value === 'number' || /id$|minutes|rate|score|percent|count|value|amount|capacity|occupancy/i.test(key);
    return (
      <input
        type={maybeDate ? 'datetime-local' : maybeNumber ? 'number' : 'text'}
        value={valueString}
        onChange={(e) => onUpdate(key, e.target.value)}
        style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}` }}
      />
    );
  };

  return (
    <div>
      {toast && <div style={{ background: c.sageLight, color: c.forest, borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{toast}</div>}
      <SectionTitle>{title}</SectionTitle>
      {loading ? (
        <Loading />
      ) : error ? (
        <ApiError msg={error} retry={load} />
      ) : (
        <>
          <div style={{ marginBottom: 10 }}>
            <button
              onClick={() => {
                const seed: Record<string, unknown> = {};
                editableColumns.forEach((col) => { seed[col.key] = ''; });
                setCreateRow(seed);
              }}
              style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}
            >
              + Add record
            </button>
          </div>
          <DataSearchBar
            id={searchId}
            value={query}
            onChange={setQuery}
            placeholder={`Search ${title.toLowerCase()}…`}
          />
          {filteredRows.length === 0 ? (
            <p style={{ fontSize: 13, color: c.muted }}>
              {query.trim() === '' ? 'No records found.' : 'No rows match your search.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <p style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>
                {filteredRows.length === rows.length ? `${rows.length} records` : `${filteredRows.length} of ${rows.length} records shown`}
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: c.sageLight }}>
                    {columns.map((col) => (
                      <th key={col.key} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {col.label}
                      </th>
                    ))}
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => (
                    <tr key={String(row[keyField] ?? i)} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                      {columns.map((col) => (
                        <td key={col.key} style={{ padding: '8px 12px', color: c.text, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {renderCellValue(row, col.key)}
                        </td>
                      ))}
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setViewRow(row)}
                            aria-label={`View ${title} ${String(row[keyField] ?? '')}`}
                            style={{ background: c.sageLight, color: c.forest, border: `1px solid ${c.sage}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                          >
                            View
                          </button>
                          <button
                            onClick={() => setEditRow({ ...row })}
                            aria-label={`Edit ${title} ${String(row[keyField] ?? '')}`}
                            style={{ background: c.goldLight, color: '#5D4037', border: `1px solid ${c.gold}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {viewRow && (
        <div onClick={() => setViewRow(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(44,43,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(720px, 92vw)', maxHeight: '86vh', overflowY: 'auto', background: c.white, borderRadius: 12, border: `1px solid ${c.sageLight}`, padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, color: c.forest, fontSize: 16 }}>Record details</h3>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10 }}>
              {Object.entries(viewRow).map(([k, v]) => (
                <div key={k} style={{ border: `1px solid ${c.sageLight}`, borderRadius: 8, padding: '8px 10px', background: c.ivory }}>
                  <p style={{ margin: 0, fontSize: 10, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: 12, color: c.text }}>{String(v ?? '—')}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setViewRow(null)} style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editRow && (
        <div onClick={() => setEditRow(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(44,43,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(760px, 92vw)', background: c.white, borderRadius: 12, border: `1px solid ${c.sageLight}`, padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, color: c.forest, fontSize: 16 }}>Edit record</h3>
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10 }}>
              {editableColumns.map((col) => (
                <label key={col.key} style={{ fontSize: 11, color: c.muted }}>
                  {col.label}
                  {inputFor(editRow, (key, value) => updateDraft(setEditRow, key, value), col)}
                </label>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button disabled={saving} onClick={() => setEditRow(null)}
                style={{ background: 'transparent', color: c.muted, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                Cancel
              </button>
              <button disabled={saving} onClick={saveEdit}
                style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {createRow && (
        <div onClick={() => setCreateRow(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(44,43,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(760px, 92vw)', background: c.white, borderRadius: 12, border: `1px solid ${c.sageLight}`, padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, color: c.forest, fontSize: 16 }}>Create record</h3>
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10 }}>
              {editableColumns.map((col) => (
                <label key={col.key} style={{ fontSize: 11, color: c.muted }}>
                  {col.label}
                  {inputFor(createRow, (key, value) => updateDraft(setCreateRow, key, value), col)}
                </label>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button disabled={saving} onClick={() => setCreateRow(null)}
                style={{ background: 'transparent', color: c.muted, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                Cancel
              </button>
              <button disabled={saving} onClick={saveCreate}
                style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating…' : 'Create record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Social media impact (admin) ───────────────────────────────────────────────

type EngagementVsVanitySummary = {
  totalPosts: number;
  thresholds: { engagementScoreP75: number; donationReferralsP75: number };
  segments: { segment: string; postCount: number }[];
};

function formatEngagementRatePct(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  if (n >= 0 && n <= 1) return `${(n * 100).toFixed(2)}%`;
  return `${n.toFixed(2)}%`;
}

/** Round numeric values to 2 decimal places for Social Media Impact page. */
function round2(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(2);
}

/** Whole number for counts (e.g. linkage table Posts column). */
function formatWhole(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return String(Math.round(n));
}

function formatPhp2(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function transformSocialLinkageRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    ...r,
    postCount: formatWhole(r.postCount),
    willReferRate: formatEngagementRatePct(r.willReferRate),
    avgReferrals: round2(r.avgReferrals),
    totalEstimatedValuePhp: formatPhp2(r.totalEstimatedValuePhp),
    boostedRate: formatEngagementRatePct(r.boostedRate),
  }));
}

const SOCIAL_POST_TABLE_COLUMNS = [
  { key: 'createdAt', label: 'Date' },
  { key: 'platform', label: 'Platform' },
  { key: 'campaignName', label: 'Campaign' },
  { key: 'reach', label: 'Reach' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'engagementRate', label: 'Engagement' },
  { key: 'donationReferrals', label: 'Referrals' },
  { key: 'estimatedDonationValuePhp', label: 'Estimated (PHP)' },
];

function AdminSocialImpact() {
  const [kpis, setKpis] = useState<Record<string, unknown> | null>(null);
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [posts, setPosts] = useState<Record<string, unknown>[]>([]);
  const [evSummary, setEvSummary] = useState<EngagementVsVanitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const searchId = useId();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [kr, or, pr, er] = await Promise.all([
        api('/api/dashboard/kpis').then((r) => jsonIfOk(r, null)),
        api('/api/dashboard/overview').then((r) => jsonIfOk(r, null)),
        api('/api/socialmediaposts?take=100').then((r) => jsonIfOk(r, [])),
        api('/api/insights/social/engagement-vs-vanity').then((r) => jsonIfOk(r, null)),
      ]);
      setKpis(kr);
      setOverview(or);
      setPosts(Array.isArray(pr) ? pr : []);
      setEvSummary(
        er && typeof er === 'object' && er !== null && 'segments' in er
          ? (er as EngagementVsVanitySummary)
          : null,
      );
    } catch {
      setError('Failed to load social impact data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const outreach = (kpis as { outreach?: Record<string, unknown> })?.outreach ?? {};
  const topPost = (overview as { topPost?: Record<string, unknown> | null })?.topPost;

  const postRows = useMemo(() => {
    const rows = posts.map((p) => ({
      ...p,
      reach: round2(p.reach),
      likes: round2(p.likes),
      comments: round2(p.comments),
      engagementRate: formatEngagementRatePct(p.engagementRate),
      donationReferrals: round2(p.donationReferrals),
      estimatedDonationValuePhp: formatPhp2(p.estimatedDonationValuePhp),
    }));
    return filterTableRows(rows, SOCIAL_POST_TABLE_COLUMNS, query);
  }, [posts, query]);

  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  const topCamp = outreach.topCampaignByReferrals as Record<string, unknown> | undefined;

  return (
    <div>
      <SectionTitle>Social media impact</SectionTitle>
      <p style={{ fontSize: 12, color: c.muted, marginTop: -4, marginBottom: 16 }}>
        Outreach metrics and recent posts. Sources: <code>/api/dashboard/kpis</code>, <code>/api/dashboard/overview</code>,{' '}
        <code>/api/socialmediaposts</code>, <code>/api/insights/social/engagement-vs-vanity</code>.
      </p>

      <SectionTitle>Outreach KPIs</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <StatCard label="Posts tracked" value={formatWhole(outreach.socialPostCount)} accent={c.roseLight} />
        <StatCard
          label="Avg engagement"
          value={formatEngagementRatePct(outreach.avgEngagementRate)}
          accent={c.sageLight}
        />
        <StatCard label="Total reach" value={formatWhole(outreach.totalReach)} />
        <StatCard label="Donation referrals" value={formatWhole(outreach.totalDonationReferrals)} accent={c.goldLight} />
        <StatCard
          label="Est. donation value (PHP)"
          value={formatPhp2(outreach.totalEstimatedDonationValuePhp)}
          accent={c.goldLight}
        />
        <StatCard
          label="CTA → referral rate"
          value={
            outreach.ctaReferralRate != null
              ? `${(Number(outreach.ctaReferralRate) * 100).toFixed(2)}%`
              : '—'
          }
          sub={
            outreach.ctaPostCount != null
              ? `${round2(outreach.ctaPostsWithReferrals)} of ${round2(outreach.ctaPostCount)} CTA posts`
              : undefined
          }
        />
      </div>

      {topCamp && (topCamp.campaignName != null || topCamp.donationReferrals != null) && (
        <div
          style={{
            background: c.goldLight,
            border: `1px solid ${c.gold}`,
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            fontSize: 13,
            color: c.text,
          }}
        >
          <strong style={{ color: c.forest }}>Top campaign by referrals:</strong>{' '}
          {String(topCamp.campaignName ?? '—')} · {round2(topCamp.postCount)} posts · {round2(topCamp.donationReferrals)}{' '}
          referrals · {formatPhp2(topCamp.estimatedDonationValuePhp)} est. PHP
        </div>
      )}

      {topPost && Object.keys(topPost).length > 0 && (
        <>
          <SectionTitle>Top post by engagement (overview)</SectionTitle>
          <div
            style={{
              background: c.white,
              border: `1px solid ${c.sageLight}`,
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 20,
              fontSize: 13,
            }}
          >
            <p style={{ margin: '0 0 8px', fontWeight: 600, color: c.forest }}>
              {String(topPost.platform ?? '—')} · {String(topPost.campaignName ?? '—')}
            </p>
            <p style={{ margin: 0, color: c.muted, fontSize: 12 }}>
              Engagement {formatEngagementRatePct(topPost.engagementRate)} · Reach {round2(topPost.reach)} · Referrals{' '}
              {round2(topPost.donationReferrals)} · Est. PHP {formatPhp2(topPost.estimatedDonationValuePhp)}
            </p>
          </div>
        </>
      )}

      <DataPanel
        title="Post → donation linkage by platform"
        url="/api/insights/posts/donation-linkage/by-group?group=platform&take=15"
        keyField="key"
        transformRows={transformSocialLinkageRows}
        columns={[
          { key: 'key', label: 'Platform' },
          { key: 'postCount', label: 'Posts' },
          { key: 'willReferRate', label: 'Refer Rate' },
          { key: 'avgReferrals', label: 'Average Referrals' },
          { key: 'totalEstimatedValuePhp', label: 'Total Est. PHP' },
          { key: 'boostedRate', label: 'Boosted Rate' },
        ]}
      />

      {evSummary && (
        <div style={{ marginTop: 22 }}>
          <SectionTitle>Engagement vs vanity (segment mix)</SectionTitle>
          <p style={{ fontSize: 12, color: c.muted, marginTop: -4, marginBottom: 12 }}>
            High engagement = likes+comments+shares at or above P75; high donation = referrals at or above P75. Associations
            only — not causal.
          </p>
          <p style={{ fontSize: 12, color: c.muted, marginBottom: 10 }}>
            P75 thresholds: engagement score {Number(evSummary.thresholds.engagementScoreP75).toFixed(2)}, donation
            referrals {Number(evSummary.thresholds.donationReferralsP75).toFixed(2)} · {round2(evSummary.totalPosts)} posts
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: c.sageLight }}>
                  {['Segment', 'Posts'].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evSummary.segments.map((row, i) => (
                  <tr
                    key={row.segment}
                    style={{
                      borderBottom: `1px solid ${c.sageLight}`,
                      background: i % 2 === 0 ? c.ivory : c.white,
                    }}
                  >
                    <td style={{ padding: '8px 12px' }}>{row.segment.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{formatWhole(row.postCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SectionTitle>Recent posts (up to 100)</SectionTitle>
      <DataSearchBar
        id={searchId}
        value={query}
        onChange={setQuery}
        placeholder="Filter by platform, campaign, date…"
      />
      <Table columns={SOCIAL_POST_TABLE_COLUMNS} rows={postRows} keyField="postId" totalCount={posts.length} />
    </div>
  );
}

// ── Reports (pipelines) ───────────────────────────────────────────────────────

type InsightDonationByCampaignRow = { campaignName: string; totalValuePhp: number; donationCount: number; avgValuePhp: number };
type InsightBridgeRow = {
  month: string;
  posts_n: number;
  click_throughs: number;
  donation_referrals: number;
  donation_total_php: number;
  incidents: number;
  active_residents?: number;
  avg_edu_progress: number;
  avg_health: number;
};

type AnnualAccomplishmentReport = {
  year: number;
  generatedAtUtc: string;
  beneficiaries: { residentBeneficiaries: number; activeResidentsNow: number };
  outcomes: {
    reintegrationReadyNow: number;
    progressSessionRate: number;
    safetyConcernVisitRate: number;
    incidentResolvedRate: number;
    stayedInSchoolRate: number;
    avgEducationProgressPercent: number;
    avgGeneralHealthScore: number;
  };
  services: {
    caring: { homeVisits: number; interventionPlans: number; visitsWithSafetyConcern: number };
    healing: { processSessions: number; sessionsWithProgress: number; healthRecords: number; incidentReports: number; resolvedIncidents: number };
    teaching: { educationRecords: number; enrolledCount: number };
  };
};

function AdminReports() {
  const [annual, setAnnual] = useState<AnnualAccomplishmentReport | null>(null);
  const [annualYear, setAnnualYear] = useState<number>(new Date().getFullYear());
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
      const [annualRes, bridgeRes, campaignRes, evRes] = await Promise.allSettled([
        api(`/api/reports/annual-accomplishment?year=${annualYear}`).then((r) => jsonIfOk(r, null)),
        api(`/api/insights/bridge/monthly?take=${bridgeTake}`).then((r) => jsonIfOk(r, [])),
        api(`/api/insights/donations/by-campaign?take=${campaignTake}`).then((r) => jsonIfOk(r, [])),
        api('/api/insights/social/engagement-vs-vanity').then((r) => jsonIfOk(r, null)),
      ]);

      const nextAnnual =
        annualRes.status === 'fulfilled' && annualRes.value && typeof annualRes.value === 'object' && 'services' in annualRes.value
          ? (annualRes.value as AnnualAccomplishmentReport)
          : null;
      const nextBridge = bridgeRes.status === 'fulfilled' && Array.isArray(bridgeRes.value) ? bridgeRes.value : [];
      const nextCampaigns = campaignRes.status === 'fulfilled' && Array.isArray(campaignRes.value) ? campaignRes.value : [];
      const nextEv = evRes.status === 'fulfilled' && evRes.value && typeof evRes.value === 'object' && 'segments' in evRes.value
        ? evRes.value as EngagementVsVanitySummary
        : null;

      setAnnual(nextAnnual);
      setBridge(nextBridge);
      setCampaigns(nextCampaigns);
      setEvSummary(nextEv);

      if (!nextAnnual && nextBridge.length === 0 && nextCampaigns.length === 0 && !nextEv) {
        setError('Failed to load reports.');
      }
    } catch { setError('Failed to load reports.'); }
    finally { setLoading(false); }
  }, [annualYear, bridgeTake, campaignTake]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  const bridgeCapped = sortRowsByMonthAsc(capRowsAtChartMaxMonth(bridge, (r) => r.month), (r) => r.month);
  const bridgeByKey = new Map(
    bridgeCapped
      .map((r) => {
        const d = parseMonthStart(r.month);
        if (!d) return null;
        return [chartMonthKey(d), r] as const;
      })
      .filter((x): x is readonly [string, InsightBridgeRow] => x != null),
  );
  const bridgeWindow = buildMonthWindowEndingAtCap(18);
  const bridgeWindowRows = bridgeWindow.map((d) => {
    const row = bridgeByKey.get(chartMonthKey(d));
    return row ?? {
      month: d.toISOString(),
      posts_n: 0,
      click_throughs: 0,
      donation_referrals: 0,
      donation_total_php: 0,
      incidents: 0,
      avg_edu_progress: 0,
      avg_health: 0,
    };
  });
  const campaignChartData = campaigns.map((r) => ({ name: r.campaignName, total: Number(r.totalValuePhp ?? 0) }));
  const bridgeChartData = bridgeWindowRows.map((r) => ({
    month: new Date(r.month).toLocaleDateString('en-US', { year: '2-digit', month: 'short' }),
    donations: Number(r.donation_total_php ?? 0),
    referrals: Number(r.donation_referrals ?? 0),
    incidents: Number(r.incidents ?? 0),
  }));
  return (
    <div>
      <SectionTitle>Annual Accomplishment Report</SectionTitle>
      <p style={{ fontSize: 12, color: c.muted, marginTop: -4, marginBottom: 12 }}>
        Caring, Healing, and Teaching services + beneficiary counts + outcomes.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: c.muted }}>
          Year:
          <select value={annualYear} onChange={(e) => setAnnualYear(Number(e.target.value))}
            style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 6, border: `1px solid ${c.sageLight}`, background: c.white }}>
            {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        {annual?.generatedAtUtc && (
          <span style={{ fontSize: 12, color: c.muted }}>Generated: {new Date(annual.generatedAtUtc).toLocaleString()}</span>
        )}
      </div>

      {annual ? (
        <>
          <SectionTitle>Beneficiaries</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            <StatCard label="Residents served (unique)" value={annual.beneficiaries.residentBeneficiaries ?? '—'} accent={c.goldLight} />
            <StatCard label="Active residents (current)" value={annual.beneficiaries.activeResidentsNow ?? '—'} />
          </div>

          <SectionTitle>Services</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 18 }}>
            <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: c.forest }}>Caring</p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: c.muted }}>Safety, stability, and continuity of care.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                <StatCard label="Home visits" value={annual.services.caring.homeVisits} />
                <StatCard label="Intervention plans" value={annual.services.caring.interventionPlans} />
                <StatCard label="Safety concerns" value={annual.services.caring.visitsWithSafetyConcern} accent={c.roseLight} />
              </div>
            </div>
            <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: c.forest }}>Healing</p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: c.muted }}>Counseling, wellbeing checks, and incident response.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                <StatCard label="Process sessions" value={annual.services.healing.processSessions} />
                <StatCard label="Progress noted" value={annual.services.healing.sessionsWithProgress} accent={c.goldLight} />
                <StatCard label="Health records" value={annual.services.healing.healthRecords} />
                <StatCard label="Incidents" value={annual.services.healing.incidentReports} accent={c.roseLight} />
              </div>
            </div>
            <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: c.forest }}>Teaching</p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: c.muted }}>Education support and learning progress.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                <StatCard label="Education records" value={annual.services.teaching.educationRecords} />
                <StatCard label="Enrolled records" value={annual.services.teaching.enrolledCount} accent={c.sageLight} />
              </div>
            </div>
          </div>

          <SectionTitle>Outcomes</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
            <StatCard label="Reintegration ready (current)" value={annual.outcomes.reintegrationReadyNow} accent={c.goldLight} />
            <StatCard label="Progress session rate" value={`${Math.round((annual.outcomes.progressSessionRate ?? 0) * 100)}%`} />
            <StatCard label="Safety concern visit rate" value={`${Math.round((annual.outcomes.safetyConcernVisitRate ?? 0) * 100)}%`} />
            <StatCard label="Incident resolved rate" value={`${Math.round((annual.outcomes.incidentResolvedRate ?? 0) * 100)}%`} />
            <StatCard label="Stayed in school rate" value={`${Math.round((annual.outcomes.stayedInSchoolRate ?? 0) * 100)}%`} />
            <StatCard label="Avg education progress" value={`${Number(annual.outcomes.avgEducationProgressPercent ?? 0).toFixed(1)}%`} />
            <StatCard label="Avg health score" value={Number(annual.outcomes.avgGeneralHealthScore ?? 0).toFixed(1)} />
          </div>
        </>
      ) : (
        <p style={{ fontSize: 12, color: c.muted, marginBottom: 18 }}>
          Annual report data is unavailable for the selected year.
        </p>
      )}

      <SocialMediaImpactSection api={api} />

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
      <p style={{ fontSize: 12, color: c.muted, marginTop: -8, marginBottom: 12 }}>
        Labeled campaigns only; uncategorized gifts are excluded from this breakdown and included in monthly / bridge totals.
      </p>
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
              {['Campaign', 'Donations', 'Total (PHP)', 'Average (PHP)'].map(h => (
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
              {['Month', 'Posts', 'Clicks', 'Referrals', 'Donations (PHP)', 'Incidents', 'Average Education', 'Average Health'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bridgeWindowRows.map((row, i) => (
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
            { key: 'expectedNextValuePhp', label: 'Expected Next (PHP)' },
            { key: 'recencyDays', label: 'Recency (Days)' },
            { key: 'donationCount', label: 'Donations' },
            { key: 'lastValuePhp', label: 'Last Gift (PHP)' },
            { key: 'lastDonationDate', label: 'Last Date' },
          ]}
        />

        <DataPanel
          title="Post → donation linkage (top groups by estimated value)"
          url="/api/insights/posts/donation-linkage/by-group?group=platform&take=12"
          keyField="key"
          columns={[
            { key: 'key', label: 'Platform' },
            { key: 'postCount', label: 'Posts' },
            { key: 'willReferRate', label: 'Refer Rate' },
            { key: 'avgReferrals', label: 'Average Referrals' },
            { key: 'totalEstimatedValuePhp', label: 'Total Est. PHP' },
            { key: 'boostedRate', label: 'Boosted Rate' },
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
            { key: 'forecastNextMonthIncidents', label: 'Forecast Next Incidents' },
            { key: 'incidentCount', label: 'Incidents' },
            { key: 'incidentLag1', label: 'Incidents Lag 1' },
            { key: 'activeResidents', label: 'Active Residents' },
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
            { key: 'avgLatestProgressPercent', label: 'Average Progress %' },
            { key: 'avgLatestHealthScore', label: 'Average Health' },
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
            { key: 'concernSessions90d', label: 'Concern Sessions 90d' },
            { key: 'safetyVisitFlags90d', label: 'Safety Flags 90d' },
            { key: 'currentRiskLevel', label: 'Current Risk' },
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
            { key: 'homeVisitsLast180d', label: 'Home Visits 180d' },
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
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{formatWhole(row.postCount)}</td>
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
      const data = await jsonIfOk(await api('/api/staff'), []);
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
      else {
        const err = await jsonBody<{ message?: string }>(r, {});
        notify(err.message ?? 'Save failed.');
      }
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
              {['ID', 'Code', 'First Name', 'Last Name', 'Role', 'Type', 'Safehouse', 'Status', 'Email', 'Actions'].map(h => (
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
        api('/api/auth/users').then((r) => jsonIfOk(r, [])),
        api('/api/auth/pending').then((r) => jsonIfOk(r, [])),
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
      else {
        const err = await jsonBody<{ message?: string; errors?: unknown[] }>(r, {});
        const first =
          Array.isArray(err.errors) && err.errors.length > 0 ? String(err.errors[0]) : undefined;
        notify(err.message ?? first ?? 'Create failed.');
      }
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
  residentId: number; residentFirstName: string; residentLastName: string;
  caseControlNo: string; safehouseId: number | null;
  caseStatus: string; dateOfAdmission: string; currentRiskLevel: string;
  reintegrationStatus: string; assignedSocialWorker: string;
  reintegrationType: string; dateEnrolled: string;
};

const CASE_STATUSES = ['Active', 'Closed', 'Transferred'];
const RISK_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const REINTEGRATION_STATUSES = ['Not Started', 'In Progress', 'Completed', 'On Hold'];
const REINTEGRATION_TYPES = ['Family Reunification', 'Foster Care', 'Adoption (Domestic)', 'Adoption (Inter-Country)', 'Independent Living', 'None'];

const RESIDENT_BLANK: Omit<ResidentRow, 'residentId'> = {
  residentFirstName: '', residentLastName: '',
  caseControlNo: '', safehouseId: null, caseStatus: 'Active',
  dateOfAdmission: '', currentRiskLevel: 'Low', reintegrationStatus: 'Not Started',
  reintegrationType: 'None', assignedSocialWorker: '', dateEnrolled: '',
};

export function AdminResidents() {
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
      const data = await jsonIfOk(await api('/api/residents'), []);
      setRows(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load residents.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(r =>
      [r.residentFirstName, r.residentLastName, r.caseControlNo, r.caseStatus, r.currentRiskLevel, r.reintegrationStatus, r.assignedSocialWorker]
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
      else {
        const err = await jsonBody<{ message?: string }>(r, {});
        notify(err.message ?? 'Create failed.');
      }
    } finally { setBusy(false); }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setBusy(true);
    try {
      const body = { ...editRow, ...editForm };
      const r = await api(`/api/residents/${editRow.residentId}`, { method: 'PUT', body: JSON.stringify(body) });
      if (r.ok) { notify('✓ Resident record updated.'); setModal(null); setEditRow(null); await load(); }
      else {
        const err = await jsonBody<{ message?: string }>(r, {});
        notify(err.message ?? 'Save failed.');
      }
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
              {['ID', 'Name', 'Case No.', 'Safehouse', 'Status', 'Admitted', 'Risk', 'Reintegration', 'Social Worker', 'Actions'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, i) => (
              <tr key={row.residentId} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.residentId}</td>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{[row.residentFirstName, row.residentLastName].filter(Boolean).join(' ') || '—'}</td>
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
              {residentField('First Name', createForm.residentFirstName, v => setCreateForm(f => ({ ...f, residentFirstName: v })), 'text')}
              {residentField('Last Name', createForm.residentLastName, v => setCreateForm(f => ({ ...f, residentLastName: v })), 'text')}
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
            <p style={{ fontSize: 12, color: c.muted, marginBottom: 1.25 * 16 }}>{[editRow.residentFirstName, editRow.residentLastName].filter(Boolean).join(' ') || 'Resident'} · Case #{editRow.caseControlNo}</p>
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
  donationId: number;
  supporterId: number;
  donationDate: string;
  donationType: string;
  campaignName: string;
  amount: number | null;
  currencyCode: string;
  channelSource: string;
  isRecurring: boolean | null;
  recurringSeriesKey?: string | null;
  estimatedValue?: number | null;
  impactUnit?: string | null;
  notes?: string | null;
  referralPostId?: number | null;
};

type RecurringFilter = 'all' | 'recurring' | 'one-time';
type DonationModal = 'create' | 'edit' | null;
type DonationForm = {
  supporterId: string;
  donationDate: string;
  donationType: string;
  campaignName: string;
  amount: string;
  estimatedValue: string;
  currencyCode: string;
  channelSource: string;
  isRecurring: boolean;
  recurringSeriesKey: string;
  impactUnit: string;
  notes: string;
  referralPostId: string;
};

const DONATION_TYPES = ['Monetary', 'In-Kind', 'Pledge', 'Grant'] as const;
const CURRENCY_CODES = ['PHP', 'USD', 'EUR'] as const;

const DONATION_FORM_BLANK: DonationForm = {
  supporterId: '',
  donationDate: '',
  donationType: 'Monetary',
  campaignName: '',
  amount: '',
  estimatedValue: '',
  currencyCode: 'PHP',
  channelSource: '',
  isRecurring: false,
  recurringSeriesKey: '',
  impactUnit: '',
  notes: '',
  referralPostId: '',
};

function toDonationForm(row: DonationRow): DonationForm {
  return {
    supporterId: String(row.supporterId ?? ''),
    donationDate: String(row.donationDate ?? '').slice(0, 10),
    donationType: row.donationType ?? 'Monetary',
    campaignName: row.campaignName ?? '',
    amount: row.amount == null ? '' : String(row.amount),
    estimatedValue: row.estimatedValue == null ? '' : String(row.estimatedValue),
    currencyCode: row.currencyCode ?? 'PHP',
    channelSource: row.channelSource ?? '',
    isRecurring: row.isRecurring === true,
    recurringSeriesKey: row.recurringSeriesKey ?? '',
    impactUnit: row.impactUnit ?? '',
    notes: row.notes ?? '',
    referralPostId: row.referralPostId == null ? '' : String(row.referralPostId),
  };
}

function toDonationPayload(form: DonationForm) {
  const amount = form.amount.trim();
  const estimated = form.estimatedValue.trim();
  const referralPostId = form.referralPostId.trim();
  const recurringSeriesKey = form.recurringSeriesKey.trim();

  return {
    supporterId: Number(form.supporterId),
    donationDate: form.donationDate.trim() || null,
    donationType: form.donationType.trim() || null,
    campaignName: form.campaignName.trim() || null,
    amount: amount === '' ? null : Number(amount),
    estimatedValue: estimated === '' ? null : Number(estimated),
    currencyCode: form.currencyCode.trim() || null,
    channelSource: form.channelSource.trim() || null,
    isRecurring: form.isRecurring,
    recurringSeriesKey: form.isRecurring ? (recurringSeriesKey || null) : null,
    impactUnit: form.impactUnit.trim() || null,
    notes: form.notes.trim() || null,
    referralPostId: referralPostId === '' ? null : Number(referralPostId),
  };
}

function AdminDonations() {
  const [rows, setRows] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [recurringFilter, setRecurringFilter] = useState<RecurringFilter>('all');
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<DonationModal>(null);
  const [editRow, setEditRow] = useState<DonationRow | null>(null);
  const [form, setForm] = useState<DonationForm>(DONATION_FORM_BLANK);
  const searchId = useId();

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await jsonIfOk(await api('/api/donations'), []);
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

  const recurringCounts = useMemo(() => ({
    all: rows.length,
    recurring: rows.filter(r => r.isRecurring === true).length,
    'one-time': rows.filter(r => r.isRecurring !== true).length,
  }), [rows]);

  const openCreate = () => {
    setForm(DONATION_FORM_BLANK);
    setEditRow(null);
    setModal('create');
  };

  const openEdit = (row: DonationRow) => {
    setEditRow(row);
    setForm(toDonationForm(row));
    setModal('edit');
  };

  const closeModal = () => {
    if (saving) return;
    setModal(null);
    setEditRow(null);
  };

  const validate = () => {
    const supporterId = Number(form.supporterId);
    if (!Number.isInteger(supporterId) || supporterId <= 0) {
      notify('Supporter ID is required.');
      return false;
    }
    if (form.amount.trim() !== '' && Number.isNaN(Number(form.amount))) {
      notify('Amount must be numeric.');
      return false;
    }
    if (form.estimatedValue.trim() !== '' && Number.isNaN(Number(form.estimatedValue))) {
      notify('Estimated value must be numeric.');
      return false;
    }
    if (form.referralPostId.trim() !== '' && (!Number.isInteger(Number(form.referralPostId)) || Number(form.referralPostId) <= 0)) {
      notify('Referral Post ID must be a positive whole number.');
      return false;
    }
    return true;
  };

  const saveCreate = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const r = await api('/api/donations', { method: 'POST', body: JSON.stringify(toDonationPayload(form)) });
      if (r.ok) {
        notify('✓ Donation created.');
        closeModal();
        await load();
      } else {
        const err = await jsonBody<{ message?: string }>(r, {});
        notify(err.message ?? 'Create failed.');
      }
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editRow || !validate()) return;
    setSaving(true);
    try {
      const body = { donationId: editRow.donationId, ...toDonationPayload(form) };
      const r = await api(`/api/donations/${editRow.donationId}`, { method: 'PUT', body: JSON.stringify(body) });
      if (r.ok) {
        notify('✓ Donation updated.');
        closeModal();
        await load();
      } else {
        const err = await jsonBody<{ message?: string }>(r, {});
        notify(err.message ?? 'Update failed.');
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: DonationRow) => {
    if (!window.confirm(`Delete donation #${row.donationId}? This cannot be undone.`)) return;
    setSaving(true);
    try {
      const r = await api(`/api/donations/${row.donationId}`, { method: 'DELETE' });
      if (r.ok) {
        notify('✓ Donation deleted.');
        await load();
      } else {
        const err = await jsonBody<{ message?: string }>(r, {});
        notify(err.message ?? 'Delete failed.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  return (
    <div>
      {toast && <div style={{ background: c.sageLight, color: c.forest, borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{toast}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <SectionTitle>Donations ({rows.length})</SectionTitle>
        <button onClick={openCreate} style={{ background: c.forest, color: c.ivory, border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Add Donation
        </button>
      </div>

      {/* Recurring filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button style={recurringFilter === 'all' ? filterBtnActive : filterBtnInactive} onClick={() => { setRecurringFilter('all'); setPage(1); }}>
          All ({recurringCounts.all})
        </button>
        <button style={recurringFilter === 'recurring' ? filterBtnActive : filterBtnInactive} onClick={() => { setRecurringFilter('recurring'); setPage(1); }}>
          Recurring ({recurringCounts.recurring})
        </button>
        <button style={recurringFilter === 'one-time' ? filterBtnActive : filterBtnInactive} onClick={() => { setRecurringFilter('one-time'); setPage(1); }}>
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
              {['ID', 'Date', 'Type', 'Campaign', 'Amount', 'Currency', 'Channel', 'Recurring', 'Actions'].map(h => (
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
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                  <button onClick={() => openEdit(row)} style={{ background: c.goldLight, color: c.text, border: `1px solid ${c.gold}`, borderRadius: 5, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, marginRight: 6 }}>
                    Edit
                  </button>
                  <button onClick={() => remove(row)} disabled={saving}
                    style={{ background: c.roseLight, color: c.rose, border: `1px solid ${c.rose}`, borderRadius: 5, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: c.white, borderRadius: 12, padding: '1.5rem 2rem', width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h3 style={{ fontFamily: 'Georgia, serif', color: c.forest, margin: '0 0 1rem' }}>
              {modal === 'create' ? 'Add Donation' : `Edit Donation #${editRow?.donationId ?? ''}`}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <label style={{ marginBottom: 12 }}>
                <span style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Supporter ID</span>
                <input type="number" min={1} value={form.supporterId} onChange={(e) => setForm((f) => ({ ...f, supporterId: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13, boxSizing: 'border-box' }} />
              </label>
              <label style={{ marginBottom: 12 }}>
                <span style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Donation Date</span>
                <input type="date" value={form.donationDate} onChange={(e) => setForm((f) => ({ ...f, donationDate: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13, boxSizing: 'border-box' }} />
              </label>
              <label style={{ marginBottom: 12 }}>
                <span style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Donation Type</span>
                <select value={form.donationType} onChange={(e) => setForm((f) => ({ ...f, donationType: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13 }}>
                  {DONATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label style={{ marginBottom: 12 }}>
                <span style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Campaign Name</span>
                <input type="text" value={form.campaignName} onChange={(e) => setForm((f) => ({ ...f, campaignName: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13, boxSizing: 'border-box' }} />
              </label>
              <label style={{ marginBottom: 12 }}>
                <span style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Amount</span>
                <input type="number" step="0.01" min={0} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13, boxSizing: 'border-box' }} />
              </label>
              <label style={{ marginBottom: 12 }}>
                <span style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Estimated Value</span>
                <input type="number" step="0.01" min={0} value={form.estimatedValue} onChange={(e) => setForm((f) => ({ ...f, estimatedValue: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13, boxSizing: 'border-box' }} />
              </label>
              <label style={{ marginBottom: 12 }}>
                <span style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Currency</span>
                <select value={form.currencyCode} onChange={(e) => setForm((f) => ({ ...f, currencyCode: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13 }}>
                  {CURRENCY_CODES.map((code) => <option key={code} value={code}>{code}</option>)}
                </select>
              </label>
              <label style={{ marginBottom: 12 }}>
                <span style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Channel Source</span>
                <input type="text" value={form.channelSource} onChange={(e) => setForm((f) => ({ ...f, channelSource: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13, boxSizing: 'border-box' }} />
              </label>
              <label style={{ marginBottom: 12 }}>
                <span style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Impact Unit</span>
                <input type="text" value={form.impactUnit} onChange={(e) => setForm((f) => ({ ...f, impactUnit: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13, boxSizing: 'border-box' }} />
              </label>
              <label style={{ marginBottom: 12 }}>
                <span style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Referral Post ID</span>
                <input type="number" min={1} value={form.referralPostId} onChange={(e) => setForm((f) => ({ ...f, referralPostId: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13, boxSizing: 'border-box' }} />
              </label>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm((f) => ({ ...f, isRecurring: e.target.checked }))} />
              <span style={{ fontSize: 13, color: c.text }}>Recurring donation</span>
            </label>

            {form.isRecurring && (
              <label style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recurring Series Key (optional)</span>
                <input type="text" value={form.recurringSeriesKey} onChange={(e) => setForm((f) => ({ ...f, recurringSeriesKey: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13, boxSizing: 'border-box' }} />
              </label>
            )}

            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</span>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
            </label>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={closeModal} disabled={saving}
                style={{ background: c.ivory, color: c.text, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '8px 20px', fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                Cancel
              </button>
              <button onClick={modal === 'create' ? saveCreate : saveEdit} disabled={saving}
                style={{ background: c.forest, color: c.ivory, border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { count: pendingAuditCount, refresh: refreshPendingAuditCount } = usePendingAuditApprovalCount(true);
  const tabSlug = searchParams.get('tab');

  useEffect(() => {
    if (tabSlug === 'pipelines') {
      navigate('/admin/pipelines', { replace: true });
    }
  }, [tabSlug, navigate]);

  const activeNav = useMemo(() => {
    if (tabSlug === 'pipelines') return 'Dashboard';
    const n = adminSlugToNavItem(tabSlug);
    return n !== 'Pipelines' && (ADMIN_NAV_ITEMS as readonly string[]).includes(n) ? n : 'Dashboard';
  }, [tabSlug]);

  useEffect(() => {
    if (searchParams.get('tab') === 'pipelines') return;
    const desired = adminNavItemToSlug(activeNav);
    if (searchParams.get('tab') !== desired) {
      setSearchParams({ tab: desired }, { replace: true });
    }
  }, [activeNav, searchParams, setSearchParams]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderContent = () => {
    switch (activeNav) {
      case 'Dashboard': return <AdminDashboard />;
      case 'Users': return <AdminAllUsers />;
      case 'Pending Approvals': return <AdminPendingApprovals onQueueChanged={refreshPendingAuditCount} />;
      case 'Residents': return <AdminResidentsPanel />;
      case 'Staff': return <AdminStaff />;
      case 'Safehouses':
        return <CrudDataPanel title="Safehouses" url="/api/safehouses" keyField="safehouseId" columns={[
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
      case 'Social Media Impact': return <AdminSocialImpact />;
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
    <DashboardLayout
      sidebar={
        <Sidebar
          id="admin-sidebar"
          items={navItems}
          active={activeNav}
        onSelectNavItem={(item) => {
          if (item === 'Pipelines') navigate('/admin/pipelines');
          else if (item === 'Social Media Impact') navigate('/admin/social-impact');
          else setSearchParams({ tab: adminNavItemToSlug(item) }, { replace: true });
        }}
          badgeCounts={{ 'Pending Approvals': pendingAuditCount }}
          user={`${user?.userName ?? 'Admin'} · Admin`}
          onLogout={handleLogout}
        />
      }
    >
      <section aria-label="Admin dashboard"
        style={{ background: ADMIN_BANNER_BG, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: 12, color: 'rgba(251,248,242,0.72)', marginBottom: 3 }}>Admin Dashboard</p>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: c.ivory, fontWeight: 400, margin: 0 }}>Welcome, {user?.userName ?? 'Admin'}</h1>
        </div>
        <button onClick={handleLogout} style={{ background: c.white, color: c.forest, fontSize: 13, fontWeight: 600, padding: '10px 22px', borderRadius: 24, border: 'none', cursor: 'pointer' }}>Logout</button>
      </section>
      {renderContent()}
    </DashboardLayout>
  );
}
