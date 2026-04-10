import { useCallback, useEffect, useMemo, useState, Suspense, lazy } from 'react';
import { AdminPageShell } from '../components/AdminPageShell';
import { apiFetch as api, jsonIfOk } from '../lib/api';
import { buildMonthWindowEndingAtCap, capRowsAtChartMaxMonth, monthKey, parseMonthStart } from '../lib/chartDateCap';
import { SocialMediaImpactSection } from '../components/reports/SocialMediaImpactSection';

const CampaignBarChart = lazy(() => import('../components/charts/CampaignBarChart'));
const MonthlyLineChart = lazy(() => import('../components/charts/MonthlyLineChart'));

const c = {
  white: '#FFFFFF',
  ivory: '#FBF8F2',
  forest: '#2A4A35',
  muted: '#7A786F',
  rose: '#C4867A',
  roseLight: '#F0D8D4',
  gold: '#D4A44C',
  goldLight: '#F5E6C8',
  sageLight: '#D4EAD9',
  indigo: '#3C6BA4',
  skyLight: '#DCEBFA',
  text: '#2C2B28',
};

type SocialPostRow = {
  postId?: number;
  createdAt?: string | null;
  platform?: string | null;
  campaignName?: string | null;
  engagementRate?: number | null;
  donationReferrals?: number | null;
  estimatedDonationValuePhp?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  reach?: number | null;
};

type EngagementVsVanitySummary = {
  totalPosts: number;
  thresholds: { engagementScoreP75: number; donationReferralsP75: number };
  segments: { segment: string; postCount: number }[];
};

function card(label: string, value: string, accent: string, sub?: string) {
  return (
    <div style={{ background: c.white, border: `1px solid ${accent}`, borderRadius: 10, padding: '1rem 1.25rem', flex: '1 1 180px' }}>
      <p style={{ fontSize: 11, color: c.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color: c.forest, fontFamily: 'Georgia, serif', margin: 0 }}>{value}</p>
      {sub ? <p style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{sub}</p> : null}
    </div>
  );
}

function section(title: string, subtitle?: string) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: c.forest, margin: 0, paddingBottom: 6, borderBottom: `1px solid ${c.sageLight}` }}>{title}</h2>
      {subtitle ? <p style={{ fontSize: 12, color: c.muted, margin: '8px 0 0' }}>{subtitle}</p> : null}
    </div>
  );
}

function fmtPct(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  const pct = n >= 0 && n <= 1 ? n * 100 : n;
  return `${pct.toFixed(1)}%`;
}

function fmtInt(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString();
}

function fmtPhp(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `₱${n.toLocaleString()}`;
}

export default function AdminSocialImpactPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kpis, setKpis] = useState<Record<string, unknown> | null>(null);
  const [posts, setPosts] = useState<SocialPostRow[]>([]);
  const [evSummary, setEvSummary] = useState<EngagementVsVanitySummary | null>(null);
  const [platformLinkage, setPlatformLinkage] = useState<Record<string, unknown>[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [kRes, pRes, evRes, linkRes] = await Promise.all([
        api('/api/dashboard/kpis').then((r) => jsonIfOk(r, null)),
        api('/api/socialmediaposts?take=500').then((r) => jsonIfOk(r, [])),
        api('/api/insights/social/engagement-vs-vanity').then((r) => jsonIfOk(r, null)),
        api('/api/insights/posts/donation-linkage/by-group?group=platform&take=12').then((r) => jsonIfOk(r, [])),
      ]);
      setKpis(kRes);
      setPosts(Array.isArray(pRes) ? (pRes as SocialPostRow[]) : []);
      setEvSummary(evRes && typeof evRes === 'object' && 'segments' in evRes ? (evRes as EngagementVsVanitySummary) : null);
      setPlatformLinkage(Array.isArray(linkRes) ? (linkRes as Record<string, unknown>[]) : []);
    } catch {
      setError('Failed to load social media impact data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const outreach = (kpis as { outreach?: Record<string, unknown> })?.outreach ?? {};

  const postsPerPlatform = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of posts) {
      const key = (p.platform ?? 'Unknown').trim() || 'Unknown';
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [posts]);

  const monthlyPostsData = useMemo(() => {
    const capped = capRowsAtChartMaxMonth(posts, (r) => r.createdAt ?? null);
    const byMonth = new Map<string, number>();
    for (const row of capped) {
      const d = parseMonthStart(row.createdAt ?? null);
      if (!d) continue;
      const key = monthKey(d);
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }
    return buildMonthWindowEndingAtCap(12).map((d) => {
      const key = monthKey(d);
      return {
        month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        total: byMonth.get(key) ?? 0,
      };
    });
  }, [posts]);

  const topPosts = useMemo(() => {
    return posts
      .slice()
      .sort((a, b) => {
        const ae = Number(a.engagementRate ?? 0);
        const be = Number(b.engagementRate ?? 0);
        if (be !== ae) return be - ae;
        return Number(b.donationReferrals ?? 0) - Number(a.donationReferrals ?? 0);
      })
      .slice(0, 8);
  }, [posts]);

  return (
    <AdminPageShell activeNav="Social Media Impact" title="Social Media Impact">
      {loading ? <p style={{ fontSize: 13, color: c.muted }}>Loading social media impact…</p> : null}
      {error ? <p style={{ fontSize: 13, color: c.rose }}>{error}</p> : null}

      {!loading && !error && (
        <>
          {section('Social KPI Snapshot', 'Live outreach performance across social channels.')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
            {card('Posts Tracked', fmtInt(outreach.socialPostCount), c.skyLight)}
            {card('Average Engagement', fmtPct(outreach.avgEngagementRate), c.sageLight)}
            {card('Donation Referrals', fmtInt(outreach.totalDonationReferrals), c.goldLight)}
            {card('Estimated Donation Value', fmtPhp(outreach.totalEstimatedDonationValuePhp), c.goldLight)}
            {card('Total Reach', fmtInt(outreach.totalReach), c.roseLight)}
          </div>

          {section('Post Volume Trends', 'Monthly posting trend and platform distribution.')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
            <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: c.forest }}>Posts per month (12-month window)</p>
              <Suspense fallback={<p style={{ fontSize: 12, color: c.muted }}>Loading chart…</p>}>
                <MonthlyLineChart data={monthlyPostsData} numberFormat="compact" seriesLabel="Posts" lineColor={c.forest} />
              </Suspense>
            </div>
            <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: c.forest }}>Posts by platform</p>
              <Suspense fallback={<p style={{ fontSize: 12, color: c.muted }}>Loading chart…</p>}>
                <CampaignBarChart data={postsPerPlatform} numberFormat="compact" barColor={c.indigo} />
              </Suspense>
            </div>
          </div>

          {section('Most Successful Engagements', 'Top posts ranked by engagement, then referrals.')}
          <div style={{ overflowX: 'auto', marginBottom: 22 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: c.sageLight }}>
                  {['Date', 'Platform', 'Campaign', 'Engagement', 'Referrals', 'Est. Value (PHP)', 'Reach'].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topPosts.map((row, i) => (
                  <tr key={`${row.postId ?? i}`} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                    <td style={{ padding: '8px 12px' }}>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{row.platform ?? '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{row.campaignName ?? '—'}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{fmtPct(row.engagementRate)}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{fmtInt(row.donationReferrals)}</td>
                    <td style={{ padding: '8px 12px' }}>{fmtPhp(row.estimatedDonationValuePhp)}</td>
                    <td style={{ padding: '8px 12px' }}>{fmtInt(row.reach)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {section('Platform Referral Effectiveness')}
          <div style={{ overflowX: 'auto', marginBottom: 22 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: c.sageLight }}>
                  {['Platform', 'Posts', 'Refer Rate', 'Avg Referrals', 'Total Est. PHP'].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {platformLinkage.map((row, i) => (
                  <tr key={`${String(row.key ?? 'platform')}-${i}`} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                    <td style={{ padding: '8px 12px' }}>{String(row.key ?? '—')}</td>
                    <td style={{ padding: '8px 12px' }}>{fmtInt(row.postCount)}</td>
                    <td style={{ padding: '8px 12px' }}>{fmtPct(row.willReferRate)}</td>
                    <td style={{ padding: '8px 12px' }}>{fmtInt(row.avgReferrals)}</td>
                    <td style={{ padding: '8px 12px' }}>{fmtPhp(row.totalEstimatedValuePhp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {evSummary ? (
            <>
              {section('Engagement Segment Mix')}
              <p style={{ fontSize: 12, color: c.muted, marginTop: -6, marginBottom: 10 }}>
                Thresholds: engagement P75 {Number(evSummary.thresholds.engagementScoreP75).toFixed(1)}, referrals P75 {Number(evSummary.thresholds.donationReferralsP75).toFixed(1)}.
              </p>
              <div style={{ overflowX: 'auto', marginBottom: 22 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: c.sageLight }}>
                      {['Segment', 'Posts'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {evSummary.segments.map((row, i) => (
                      <tr key={row.segment} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                        <td style={{ padding: '8px 12px' }}>{row.segment.replace(/_/g, ' ')}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{fmtInt(row.postCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          <SocialMediaImpactSection api={api} />
        </>
      )}
    </AdminPageShell>
  );
}
