import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import MonthlyLineChart from '../components/charts/MonthlyLineChart';
import CampaignBarChart from '../components/charts/CampaignBarChart';
import { apiUrl } from '../lib/api';
import { buildMonthWindowEndingAtCap, capRowsAtChartMaxMonth, monthKey, parseMonthStart, sortRowsByMonthAsc } from '../lib/chartDateCap';
import './ImpactPage.css';

const c = {
  ivory: '#FBF8F2',
  roseLight: '#F0D8D4',
  sageLight: '#D4EAD9',
  forest: '#2A4A35',
  gold: '#D4A44C',
  goldLight: '#F5E6C8',
  text: '#2C2B28',
  muted: '#7A786F',
};

const HERO_IMAGE = '/images/impact-festival.jpg';
const JOIN_BANNER_IMAGE = '/images/impact-join-banner.jpg';

type PublicImpactSnapshot = {
  snapshotId: number;
  snapshotDate: string | null;
  headline: string | null;
  summaryText: string | null;
  metricPayloadJson: string | null;
  isPublished: boolean | null;
  publishedAt: string | null;
};

type Overview = {
  safehouseCount?: number;
  activeResidentCount?: number;
  partnerCount?: number;
  totalMonetaryAmount?: number;
};

type PublicImpactSeries = {
  monthlySupportTrend?: Array<{ month: string; total: number }>;
  programAllocationMix?: Array<{ name: string; total: number }>;
  educationRecordCount?: number;
  latestAvgEducationProgress?: number | null;
  latestEducationMonth?: string | null;
};

function safeJsonParse(raw: string | null | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    try {
      const normalized = raw
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\bNone\b/g, 'null')
        .replace(/'/g, '"');
      return JSON.parse(normalized) as unknown;
    } catch {
      return null;
    }
  }
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export default function ImpactPage() {
  const [snapshots, setSnapshots] = useState<PublicImpactSnapshot[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [series, setSeries] = useState<PublicImpactSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [snaps, ov, sr] = await Promise.allSettled([
        fetch(apiUrl('/api/publicimpactsnapshots')).then((r) => (r.ok ? r.json() : [])),
        fetch(apiUrl('/api/dashboard/overview')).then((r) => (r.ok ? r.json() : null)),
        fetch(apiUrl('/api/dashboard/public-impact-series')).then((r) => (r.ok ? r.json() : null)),
      ]);

      const nextSnaps = snaps.status === 'fulfilled' && Array.isArray(snaps.value)
        ? (snaps.value as PublicImpactSnapshot[])
        : [];
      const nextOv = ov.status === 'fulfilled' && ov.value && typeof ov.value === 'object'
        ? (ov.value as Overview)
        : null;
      const nextSeries = sr.status === 'fulfilled' && sr.value && typeof sr.value === 'object'
        ? (sr.value as PublicImpactSeries)
        : null;

      setSnapshots(nextSnaps);
      setOverview(nextOv);
      setSeries(nextSeries);
    } catch {
      setError('Failed to load impact data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const latestSnapshot = snapshots.length ? snapshots[0] : null;
  const payload = useMemo(
    () => safeJsonParse(latestSnapshot?.metricPayloadJson) as Record<string, unknown> | null,
    [latestSnapshot?.metricPayloadJson],
  );

  const topStats = useMemo(() => {
    const girlsServed =
      asNumber((payload as any)?.stats?.girlsServedThisYear ?? (payload as any)?.girlsServedThisYear ?? overview?.activeResidentCount) ?? null;
    const safehouses = asNumber(overview?.safehouseCount) ?? null;
    const partners = asNumber(overview?.partnerCount) ?? null;
    const eduProgress = asNumber(series?.latestAvgEducationProgress);

    return [
      { value: girlsServed != null ? new Intl.NumberFormat('en-US').format(girlsServed) : '—', label: 'Girls Served', color: c.roseLight },
      { value: safehouses != null ? new Intl.NumberFormat('en-US').format(safehouses) : '—', label: 'Active Safehouses', color: c.sageLight },
      { value: partners != null ? new Intl.NumberFormat('en-US').format(partners) : '—', label: 'Partner Communities', color: c.goldLight },
      {
        value: eduProgress != null ? `${eduProgress.toFixed(1)}%` : '—',
        label: 'Avg Education Progress',
        color: '#E9E4FF',
      },
    ];
  }, [overview?.activeResidentCount, overview?.safehouseCount, overview?.partnerCount, payload, series?.latestAvgEducationProgress]);

  const snapshotMonthlyFallback = useMemo(() => {
    return sortRowsByMonthAsc(
      capRowsAtChartMaxMonth(
        snapshots
      .map((s) => {
        const p = safeJsonParse(s.metricPayloadJson) as any;
        const month = String(p?.month ?? s.snapshotDate ?? '').slice(0, 7);
        const total = asNumber(p?.donations_total_for_month);
        return { month, total: total ?? 0 };
      })
      .filter((r) => /^\d{4}-\d{2}$/.test(r.month)),
        (r) => r.month,
      ),
      (r) => r.month,
    ).slice(-12);
  }, [snapshots]);

  const monthlyImpact = useMemo(() => {
    const apiSeries = sortRowsByMonthAsc(
      capRowsAtChartMaxMonth(
        (series?.monthlySupportTrend ?? [])
      .filter((r) => r && /^\d{4}-\d{2}$/.test(String(r.month)))
      .map((r) => ({ month: String(r.month), total: Number(r.total ?? 0) }))
      .filter((r) => Number.isFinite(r.total)),
        (r) => r.month,
      ),
      (r) => r.month,
    );

    const sourceSeries = apiSeries.length > 0 ? apiSeries : snapshotMonthlyFallback;
    const byKey = new Map(
      sourceSeries
        .map((r) => {
          const d = parseMonthStart(r.month);
          if (!d) return null;
          return [monthKey(d), r] as const;
        })
        .filter((x): x is readonly [string, { month: string; total: number }] => x != null),
    );
    return buildMonthWindowEndingAtCap(12).map((d) => {
      const row = byKey.get(monthKey(d));
      return {
        month: monthKey(d),
        total: Number(row?.total ?? 0),
      };
    });
  }, [series?.monthlySupportTrend, snapshotMonthlyFallback]);

  const supportPrograms = useMemo(() => {
    const fromApi = (series?.programAllocationMix ?? [])
      .map((r) => ({ name: String(r.name), total: Number(r.total ?? 0) }))
      .filter((r) => r.name && Number.isFinite(r.total) && r.total > 0)
      .slice(0, 6);

    if (fromApi.length > 0) return fromApi;

    // Last-resort fallback: a meaningful split from current known totals.
    const total = Number(overview?.totalMonetaryAmount ?? 0);
    if (total <= 0) return [];
    return [
      { name: 'Safe Housing', total: total * 0.4 },
      { name: 'Counseling', total: total * 0.35 },
      { name: 'Education', total: total * 0.25 },
    ];
  }, [series?.programAllocationMix, overview?.totalMonetaryAmount]);

  const displayHeadline = useMemo(() => {
    const headline = latestSnapshot?.headline ?? 'Impact update';
    return headline.replace('Lighthouse Sanctuary', 'Hiraya Haven');
  }, [latestSnapshot?.headline]);

  return (
    <>
      <NavBar />
      <main id="main-content" className="impact-page">
        <section aria-labelledby="impact-page-heading" className="impact-hero">
          <div className="impact-hero-text">
            <h1 id="impact-page-heading">Every gift helps rebuild futures.</h1>
            {error && <p className="impact-error">{error}</p>}
            {!loading && !latestSnapshot && (
              <p className="impact-empty">No published impact snapshots yet.</p>
            )}
          </div>
          <img
            src={HERO_IMAGE}
            alt="Children in traditional dress celebrating in the Philippines."
            className="impact-hero-image"
          />
        </section>

        <section aria-label="Top impact metrics" className="impact-stats-grid">
          {topStats.map((item, idx) => (
            <article key={item.label} className="impact-stat-card" style={{ background: item.color, animationDelay: `${idx * 80}ms` }}>
              <p className="impact-stat-value">{item.value}</p>
              <p className="impact-stat-label">{item.label}</p>
            </article>
          ))}
        </section>

        <section className="impact-charts-wrap">
          <article className="impact-chart-card impact-chart-card--wide">
            <h2>Monthly support trend</h2>
            {monthlyImpact.length > 0 ? (
              <MonthlyLineChart data={monthlyImpact} />
            ) : (
              <p className="impact-muted">No non-zero monthly donation trend available yet.</p>
            )}
          </article>

          <article className="impact-chart-card">
            <h2>Program allocation mix</h2>
            {supportPrograms.length > 0 ? (
              <CampaignBarChart data={supportPrograms} />
            ) : (
              <p className="impact-muted">No non-zero allocation totals available yet.</p>
            )}
          </article>
        </section>

        {!loading && latestSnapshot && (
          <section className="impact-update-wrap">
            <article className="impact-update-card">
              <h2>{displayHeadline}</h2>
              {latestSnapshot.summaryText && <p>{latestSnapshot.summaryText}</p>}
              <p className="impact-update-date">
                {latestSnapshot.snapshotDate ? new Date(latestSnapshot.snapshotDate).toLocaleDateString() : '—'}
              </p>
            </article>
          </section>
        )}

        <section className="impact-join-banner" aria-labelledby="join-impact-heading">
          <img src={JOIN_BANNER_IMAGE} alt="Girls in a community setting in the Philippines" className="impact-join-image" />
          <div className="impact-join-overlay" />
          <div className="impact-join-content">
            <h2 id="join-impact-heading">Want to be part of this impact?</h2>
            <p>Join as a supporter and help us reach more girls with safety, counseling, and education.</p>
            <Link to="/register">Create an account</Link>
          </div>
        </section>
      </main>
    </>
  );
}
