import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import MonthlyLineChart from '../components/charts/MonthlyLineChart';
import CampaignBarChart from '../components/charts/CampaignBarChart';
import { apiUrl } from '../lib/api';
import {
  buildMonthWindowEndingAtCap,
  capRowsAtChartMaxMonth,
  monthKey,
  parseMonthStart,
  sortRowsByMonthAsc,
} from '../lib/chartDateCap';
import { displayImpactHeadline } from '../lib/impactHeadline';

const c = {
  ivory: '#FBF8F2',
  cream: '#F5F0E8',
  roseLight: '#F0D8D4',
  sageLight: '#D4EAD9',
  sageMuted: '#8FAF96',
  forest: '#2A4A35',
  gold: '#D4A44C',
  goldLight: '#F5E6C8',
  text: '#2C2B28',
  muted: '#7A786F',
};

const HERO_IMAGE = '/images/impact-festival.jpg';
const JOIN_BANNER_IMAGE = '/images/impact-join-banner.jpg';

const divider = '0.5px solid rgba(44,43,40,0.12)';
const cardShadow = '0 4px 24px rgba(42, 74, 53, 0.08)';
const sans = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

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

function formatPhp(n: number): string {
  if (!Number.isFinite(n)) return '₱0';
  return `₱${Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(n)}`;
}

function StatIcon({
  children,
  bg,
  fg,
}: {
  children: ReactNode;
  bg: string;
  fg: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        background: bg,
        color: fg,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
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

      const nextSnaps =
        snaps.status === 'fulfilled' && Array.isArray(snaps.value)
          ? (snaps.value as PublicImpactSnapshot[])
          : [];
      const nextOv =
        ov.status === 'fulfilled' && ov.value && typeof ov.value === 'object'
          ? (ov.value as Overview)
          : null;
      const nextSeries =
        sr.status === 'fulfilled' && sr.value && typeof sr.value === 'object'
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

  const statCards = useMemo(() => {
    const girlsServed =
      asNumber(
        (payload as any)?.stats?.girlsServedThisYear ??
          (payload as any)?.girlsServedThisYear ??
          overview?.activeResidentCount,
      ) ?? null;

    const safehouses = asNumber(overview?.safehouseCount) ?? null;
    const partners = asNumber(overview?.partnerCount) ?? null;

    return [
      {
        value: girlsServed != null ? new Intl.NumberFormat('en-US').format(girlsServed) : '—',
        label: 'Girls currently in care',
        icon: (
          <StatIcon bg="#FBE9E6" fg="#C75B5B">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="8.5" cy="7" r="2.6" />
              <circle cx="15.5" cy="7" r="2.6" />
              <path d="M4 18.2c.6-2.2 2.4-3.8 4.5-3.8 1.2 0 2.2.4 3 1.1" />
              <path d="M20 18.2c-.6-2.2-2.4-3.8-4.5-3.8-1.2 0-2.2.4-3 1.1" />
            </svg>
          </StatIcon>
        ),
      },
      {
        value: safehouses != null ? new Intl.NumberFormat('en-US').format(safehouses) : '—',
        label: 'Active safehouses',
        icon: (
          <StatIcon bg="#EAF5ED" fg="#3E7A4B">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4.5 11.2L12 5l7.5 6.2" />
              <path d="M6.4 10.7V19h11.2v-8.3" />
              <path d="M10.3 19v-4.8h3.4V19" />
            </svg>
          </StatIcon>
        ),
      },
      {
        value: partners != null ? new Intl.NumberFormat('en-US').format(partners) : '—',
        label: 'Community partners',
        icon: (
          <StatIcon bg="#FAF0DA" fg="#9A6A12">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="4.5" y="5.5" width="15" height="13" rx="1.4" />
              <path d="M10 5.5v13M4.5 10.2h15" />
              <path d="M13 13.2h4M13 15.8h4" />
            </svg>
          </StatIcon>
        ),
      },
    ];
  }, [overview?.activeResidentCount, overview?.partnerCount, overview?.safehouseCount, payload]);

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

    const total = Number(overview?.totalMonetaryAmount ?? 0);
    if (total <= 0) return [];

    return [
      { name: 'Safe Housing', total: total * 0.4 },
      { name: 'Counseling', total: total * 0.35 },
      { name: 'Education', total: total * 0.25 },
    ];
  }, [overview?.totalMonetaryAmount, series?.programAllocationMix]);

  const displayHeadline = useMemo(
    () => displayImpactHeadline(latestSnapshot?.headline),
    [latestSnapshot?.headline],
  );

  return (
    <>
      <style>{`
        .impact-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.02fr) minmax(260px, 0.98fr);
          gap: 0;
          align-items: stretch;
        }
        .impact-snapshot-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 1.25rem;
          align-items: stretch;
        }
        .impact-metrics-row {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          flex: 1;
          min-width: 0;
        }
        .impact-metric-cell {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 1.35rem 0.75rem;
          min-width: 0;
        }
        .impact-metrics-row .impact-metric-cell + .impact-metric-cell {
          border-left: 0.5px solid rgba(44,43,40,0.12);
        }
        .impact-charts-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0;
        }
        @media (max-width: 960px) {
          .impact-hero-grid { grid-template-columns: 1fr; }
          .impact-hero-visual { min-height: 280px; order: -1; }
          .impact-snapshot-grid { grid-template-columns: 1fr; }
          .impact-metrics-row { flex-direction: column; }
          .impact-metrics-row .impact-metric-cell + .impact-metric-cell {
            border-left: none !important;
            border-top: 0.5px solid rgba(44,43,40,0.12);
          }
          .impact-charts-grid { grid-template-columns: 1fr; }
          .impact-chart-cell--left { border-right: none !important; border-bottom: 0.5px solid rgba(44,43,40,0.12); }
        }
      `}</style>

      <NavBar />

      <main id="main-content" style={{ background: c.ivory }}>
        <section className="impact-hero-grid" aria-labelledby="impact-page-heading" style={{ borderBottom: divider }}>
          <div style={{ padding: 'clamp(2rem, 5vw, 3.75rem) clamp(1.5rem, 4vw, 3rem)' }}>
            <h1
              id="impact-page-heading"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 'clamp(1.85rem, 4.2vw, 2.75rem)',
                fontWeight: 400,
                color: c.forest,
                margin: '0 0 1rem',
                lineHeight: 1.2,
                maxWidth: 520,
              }}
            >
              Every gift helps rebuild futures.
            </h1>

            <p
              style={{
                margin: '0 0 1.75rem',
                maxWidth: 480,
                color: c.text,
                fontSize: 'clamp(15px, 1.9vw, 17px)',
                lineHeight: 1.65,
              }}
            >
              Your donation provides safe shelter, education, and support for vulnerable girls in the Philippines.
            </p>

            {error ? (
              <p style={{ color: '#9B3D3D', margin: '0 0 1rem', fontFamily: sans }}>{error}</p>
            ) : null}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.35rem' }}>
              <Link
                to="/register"
                style={{
                  background: c.gold,
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: 14,
                  padding: '12px 24px',
                  fontWeight: 600,
                  fontSize: 15,
                  boxShadow: '0 2px 12px rgba(212,164,76,0.35)',
                }}
              >
                Give Hope
              </Link>

              <a
                href="/#about"
                style={{
                  background: c.ivory,
                  color: c.text,
                  textDecoration: 'none',
                  borderRadius: 14,
                  padding: '12px 24px',
                  fontWeight: 600,
                  fontSize: 15,
                  border: '1px solid rgba(44,43,40,0.2)',
                }}
              >
                Learn More
              </a>
            </div>

            <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, color: c.muted, fontSize: 14 }}>
              <span aria-hidden="true" style={{ color: '#E8C547', fontSize: 18 }}>
                ♥
              </span>
              100% of donations go directly to our programs.
            </p>
          </div>

          <div
            className="impact-hero-visual"
            style={{
              minHeight: 400,
              backgroundImage: `linear-gradient(90deg, ${c.ivory} 0%, rgba(251,248,242,0.95) 8%, rgba(251,248,242,0.55) 22%, rgba(251,248,242,0.12) 42%, rgba(251,248,242,0) 55%), url(${HERO_IMAGE})`,
              backgroundSize: 'cover',
              backgroundPosition: '62% 42%',
              backgroundRepeat: 'no-repeat',
            }}
          />
        </section>

        <section
          id="impact-snapshot"
          style={{ padding: 'clamp(2rem, 4vw, 3rem) clamp(1.5rem, 4vw, 2.5rem)', borderBottom: divider }}
        >
          <h2
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontWeight: 400,
              fontSize: 'clamp(1.35rem, 3vw, 1.65rem)',
              color: c.forest,
              margin: '0 0 0.35rem',
            }}
          >
            Impact Snapshot
          </h2>

          <p style={{ margin: '0 0 1.75rem', color: c.muted, fontSize: 15, fontFamily: sans }}>
            Community support at a glance — live figures from our programs and the donation totals we’ve recorded.
          </p>

          <div className="impact-snapshot-grid">
            <article
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: '2rem 1.75rem',
                border: '1px solid rgba(44,43,40,0.1)',
                boxShadow: '0 1px 3px rgba(42, 43, 40, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: 200,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: sans,
                  fontSize: 'clamp(2rem, 4.5vw, 2.65rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: c.forest,
                }}
              >
                {overview ? formatPhp(Number(overview.totalMonetaryAmount ?? 0)) : '—'}
              </p>

              <p style={{ margin: '0.6rem 0 0', color: c.muted, fontSize: 14, fontFamily: sans }}>
                Total donated this year
              </p>
            </article>

            <article
              style={{
                background: c.cream,
                borderRadius: 16,
                border: '1px solid rgba(44,43,40,0.08)',
                boxShadow: cardShadow,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 200,
                overflow: 'hidden',
              }}
            >
              <div className="impact-metrics-row" role="group" aria-label="Key impact metrics">
                {statCards.map(({ value, label, icon }) => (
                  <div key={label} className="impact-metric-cell">
                    <div style={{ marginBottom: 10 }}>{icon}</div>

                    <p
                      style={{
                        margin: 0,
                        fontFamily: sans,
                        fontSize: 'clamp(1.5rem, 3.2vw, 1.85rem)',
                        fontWeight: 700,
                        color: c.forest,
                        lineHeight: 1.1,
                      }}
                    >
                      {value}
                    </p>

                    <p
                      style={{
                        margin: '0.45rem 0 0',
                        color: c.muted,
                        fontSize: 13,
                        lineHeight: 1.35,
                        fontFamily: sans,
                        maxWidth: 140,
                      }}
                    >
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section style={{ borderBottom: divider }}>
          <div className="impact-charts-grid">
            <article
              className="impact-chart-cell--left"
              style={{
                background: c.ivory,
                borderRight: divider,
                padding: 'clamp(1.25rem, 3vw, 1.85rem)',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: sans,
                  fontWeight: 700,
                  color: c.forest,
                  fontSize: 'clamp(1.05rem, 2.2vw, 1.2rem)',
                }}
              >
                Monthly support trend
              </h2>

              <p style={{ margin: '0.4rem 0 1rem', color: c.muted, fontSize: 14, fontFamily: sans, lineHeight: 1.5 }}>
                Monetary donation totals by month — the most recent months we have on record.
              </p>

              {loading ? (
                <p style={{ color: c.muted, fontSize: 14, fontFamily: sans, margin: '1rem 0' }}>Loading chart…</p>
              ) : monthlyImpact.length === 0 ? (
                <p style={{ color: c.muted, fontSize: 14, fontFamily: sans, margin: '1rem 0' }}>
                  No monthly donation data to show yet.
                </p>
              ) : (
                <MonthlyLineChart data={monthlyImpact} showDots />
              )}
            </article>

            <article
              style={{
                background: c.ivory,
                padding: 'clamp(1.25rem, 3vw, 1.85rem)',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: sans,
                  fontWeight: 700,
                  color: c.forest,
                  fontSize: 'clamp(1.05rem, 2.2vw, 1.2rem)',
                }}
              >
                Program allocation mix
              </h2>

              <p style={{ margin: '0.4rem 0 1rem', color: c.muted, fontSize: 14, fontFamily: sans, lineHeight: 1.5 }}>
                Most funds go directly to safehouse care and education.
              </p>

              {loading ? (
                <p style={{ color: c.muted, fontSize: 14, fontFamily: sans, margin: '1rem 0' }}>Loading chart…</p>
              ) : supportPrograms.length === 0 ? (
                <p style={{ color: c.muted, fontSize: 14, fontFamily: sans, margin: '1rem 0' }}>
                  No program allocation data yet.
                </p>
              ) : (
                <CampaignBarChart data={supportPrograms} />
              )}
            </article>
          </div>
        </section>

        {!loading && latestSnapshot ? (
          <section
            style={{
              padding: 'clamp(2rem, 4vw, 3rem) clamp(1.5rem, 4vw, 2.5rem)',
              borderBottom: divider,
              background: '#fff',
            }}
          >
            <article
              style={{
                maxWidth: 760,
                margin: '0 auto',
                textAlign: 'center',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  color: c.forest,
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontWeight: 400,
                  fontSize: 'clamp(1.35rem, 3vw, 1.8rem)',
                }}
              >
                {displayHeadline}
              </h2>

              {latestSnapshot.summaryText ? (
                <p
                  style={{
                    margin: '0.9rem auto 0',
                    color: c.text,
                    maxWidth: 620,
                    lineHeight: 1.7,
                    fontSize: 15,
                    fontFamily: sans,
                  }}
                >
                  {latestSnapshot.summaryText}
                </p>
              ) : null}

              <p style={{ margin: '1rem 0 0', color: c.muted, fontSize: 13, fontFamily: sans }}>
                {latestSnapshot.snapshotDate
                  ? new Date(latestSnapshot.snapshotDate).toLocaleDateString()
                  : '—'}
              </p>
            </article>
          </section>
        ) : null}

        <section
          style={{
            background: c.forest,
            margin: 0,
            padding: 'clamp(1.5rem, 4vw, 2.25rem) clamp(1.5rem, 4vw, 2.5rem)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: c.ivory,
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontWeight: 400,
                fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
              }}
            >
              Ready to give hope?
            </h2>

            <p style={{ margin: '0.4rem 0 0', color: 'rgba(251,248,242,0.82)', fontSize: 15, maxWidth: 420 }}>
              Your donation helps provide safe shelter, education, and healing for girls.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Link
              to="/register"
              style={{
                background: c.ivory,
                color: c.forest,
                textDecoration: 'none',
                borderRadius: 14,
                padding: '11px 22px',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Give Hope
            </Link>

            <a
              href="#impact-snapshot"
              style={{
                background: 'transparent',
                color: c.ivory,
                textDecoration: 'none',
                borderRadius: 14,
                padding: '11px 22px',
                fontWeight: 600,
                fontSize: 14,
                border: '1.5px solid rgba(251,248,242,0.85)',
                display: 'inline-block',
              }}
            >
              See Impact
            </a>
          </div>
        </section>

        <section
          style={{
            position: 'relative',
            minHeight: 280,
            overflow: 'hidden',
          }}
          aria-labelledby="join-impact-heading"
        >
          <img
            src={JOIN_BANNER_IMAGE}
            alt="Girls in a community setting in the Philippines"
            style={{
              width: '100%',
              height: '100%',
              minHeight: 280,
              objectFit: 'cover',
              display: 'block',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(42,74,53,0.82), rgba(42,74,53,0.45), rgba(42,74,53,0.18))',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: 'clamp(1.5rem, 4vw, 3rem)',
              maxWidth: 620,
            }}
          >
            <h2
              id="join-impact-heading"
              style={{
                margin: 0,
                color: '#fff',
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontWeight: 400,
                fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
              }}
            >
              Want to be part of this impact?
            </h2>

            <p
              style={{
                margin: '0.8rem 0 1.1rem',
                color: 'rgba(255,255,255,0.92)',
                lineHeight: 1.65,
                fontSize: 15,
                fontFamily: sans,
              }}
            >
              Join as a supporter and help us reach more girls with safety, counseling, and education.
            </p>

            <div>
              <Link
                to="/register"
                style={{
                  display: 'inline-block',
                  background: c.gold,
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: 14,
                  padding: '12px 24px',
                  fontWeight: 600,
                  fontSize: 15,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
                }}
              >
                Create an account
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
