import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import MonthlyLineChart from '../components/charts/MonthlyLineChart';
import CampaignBarChart from '../components/charts/CampaignBarChart';
import heroImage from '../assets/Smiles and warmth at sunset..png';
import storyImage from '../assets/Young girl writing in the afternoon light.png';

type OverviewData = {
  safehouseCount: number;
  activeResidentCount: number;
  partnerCount: number;
  totalMonetaryAmount: number;
};

const c = {
  ivory: '#FBF8F2',
  cream: '#F5F0E8',
  paper: '#E8E4DC',
  roseLight: '#F0D8D4',
  sageLight: '#D4EAD9',
  sageMuted: '#8FAF96',
  forest: '#2A4A35',
  gold: '#D4A44C',
  goldLight: '#F5E6C8',
  text: '#2C2B28',
  muted: '#7A786F',
  oliveBar: '#6B7F4A',
  reintegrationBar: '#E5D5A8',
};

const programBarColors = [c.forest, c.oliveBar, c.gold, c.reintegrationBar];

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Maps `/api/insights/donations/monthly` rows to Recharts-friendly points. */
function mapMonthlyApiToChart(rows: unknown): Array<{ month: string; total: number }> {
  if (!Array.isArray(rows)) return [];
  return rows.map((r: { month?: string; totalValuePhp?: number }) => {
    const raw = r.month;
    const iso = typeof raw === 'string' ? raw : raw != null ? new Date(raw as string | number | Date).toISOString() : '';
    const m = /^(\d{4})-(\d{2})/.exec(iso);
    const label = m ? SHORT_MONTHS[parseInt(m[2], 10) - 1] ?? '—' : '—';
    const total = Math.round(Number(r.totalValuePhp ?? 0));
    return { month: label, total };
  });
}

function normalizeProgramAlloc(rows: unknown): Array<{ name: string; total: number }> {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r: { name?: string; total?: number }) => ({
      name: String(r.name ?? 'Other'),
      total: Number(r.total ?? 0),
    }))
    .filter((x) => x.total > 0);
}

function formatPhp(n: number): string {
  return '₱' + Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(n);
}

function StatIcon({ children, bg, fg, compact }: { children: ReactNode; bg: string; fg: string; compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        width: compact ? 40 : 44,
        height: compact ? 40 : 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        background: bg,
        color: fg,
        marginBottom: compact ? 0 : 12,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

const divider = '0.5px solid rgba(44,43,40,0.12)';

const cardShadow = '0 4px 24px rgba(42, 74, 53, 0.08)';

const sans = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Intro under “Impact Snapshot” — describes the stats, not a trend. */
const impactSnapshotIntro =
  'Community support at a glance — live figures from our programs and the donation totals we’ve recorded.';

/** Caption under the line chart — factual; no implied “always up” trend. */
const monthlyTrendCaption =
  'Monetary donation totals by month — the most recent months we have on record.';

export default function ImpactPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [monthlyChart, setMonthlyChart] = useState<Array<{ month: string; total: number }> | null>(null);
  const [programAlloc, setProgramAlloc] = useState<Array<{ name: string; total: number }> | null>(null);

  useEffect(() => {
    const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

    fetch(`${base}/api/dashboard/overview`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setOverview)
      .catch(() => {});

    fetch(`${base}/api/insights/donations/monthly?take=6`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setMonthlyChart(mapMonthlyApiToChart(data)))
      .catch(() => setMonthlyChart([]));

    fetch(`${base}/api/dashboard/impact/program-allocation`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setProgramAlloc(normalizeProgramAlloc(data)))
      .catch(() => setProgramAlloc([]));
  }, []);

  const statCards = [
    {
      value: overview ? String(overview.activeResidentCount) : '—',
      label: 'Girls currently in care',
      icon: (
        <StatIcon bg="#FBE9E6" fg="#C75B5B" compact>
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
      value: overview ? String(overview.safehouseCount) : '—',
      label: 'Active safehouses',
      icon: (
        <StatIcon bg="#EAF5ED" fg="#3E7A4B" compact>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4.5 11.2L12 5l7.5 6.2" />
            <path d="M6.4 10.7V19h11.2v-8.3" />
            <path d="M10.3 19v-4.8h3.4V19" />
          </svg>
        </StatIcon>
      ),
    },
    {
      value: overview ? String(overview.partnerCount) : '—',
      label: 'Community partners',
      icon: (
        <StatIcon bg="#FAF0DA" fg="#9A6A12" compact>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="4.5" y="5.5" width="15" height="13" rx="1.4" />
            <path d="M10 5.5v13M4.5 10.2h15" />
            <path d="M13 13.2h4M13 15.8h4" />
          </svg>
        </StatIcon>
      ),
    },
  ];

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
        .impact-story-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 0.85fr);
          gap: 2.5rem;
          align-items: center;
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
          .impact-story-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <NavBar />
      <main id="main-content" style={{ background: c.ivory }}>
        {/* Hero */}
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
              backgroundImage: `linear-gradient(90deg, ${c.ivory} 0%, rgba(251,248,242,0.95) 8%, rgba(251,248,242,0.55) 22%, rgba(251,248,242,0.12) 42%, rgba(251,248,242,0) 55%), url(${heroImage})`,
              backgroundSize: 'cover',
              backgroundPosition: '62% 42%',
              backgroundRepeat: 'no-repeat',
            }}
          />
        </section>

        {/* Impact snapshot */}
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
            {impactSnapshotIntro}
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
                {overview ? formatPhp(overview.totalMonetaryAmount) : '—'}
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

        {/* Charts */}
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
                {monthlyTrendCaption}
              </p>
              {monthlyChart === null ? (
                <p style={{ color: c.muted, fontSize: 14, fontFamily: sans, margin: '1rem 0' }}>Loading chart…</p>
              ) : monthlyChart.length === 0 ? (
                <p style={{ color: c.muted, fontSize: 14, fontFamily: sans, margin: '1rem 0' }}>
                  No monthly donation data to show yet.
                </p>
              ) : (
                <MonthlyLineChart data={monthlyChart} showDots />
              )}
            </article>

            <article style={{ background: c.ivory, padding: 'clamp(1.25rem, 3vw, 1.85rem)' }}>
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
              <p style={{ margin: '0.4rem 0 0.75rem', color: c.muted, fontSize: 14, fontFamily: sans, lineHeight: 1.5 }}>
                Most funds go directly to safehouse care and education.
              </p>
              {programAlloc && programAlloc.length > 0 ? (
                <div
                  role="list"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px 16px',
                    marginBottom: 12,
                    fontFamily: sans,
                  }}
                >
                  {programAlloc.map((p, i) => (
                    <span
                      key={`${p.name}-${i}`}
                      role="listitem"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: c.muted }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: programBarColors[i % programBarColors.length],
                          flexShrink: 0,
                        }}
                      />
                      {p.name}
                    </span>
                  ))}
                </div>
              ) : null}
              {programAlloc === null ? (
                <p style={{ color: c.muted, fontSize: 14, fontFamily: sans, margin: '1rem 0' }}>Loading chart…</p>
              ) : programAlloc.length === 0 ? (
                <p style={{ color: c.muted, fontSize: 14, fontFamily: sans, margin: '1rem 0' }}>
                  No program allocation data yet — amounts will appear when donations are allocated by program area.
                </p>
              ) : (
                <CampaignBarChart data={programAlloc} barColors={programBarColors} barColor={c.forest} />
              )}
            </article>
          </div>
        </section>

        {/* Story / testimonial */}
        <section
          style={{
            padding: 'clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 4vw, 2.5rem)',
            background: `linear-gradient(135deg, ${c.cream} 0%, ${c.ivory} 45%, rgba(212, 234, 217, 0.55) 100%)`,
            borderBottom: divider,
          }}
        >
          <div className="impact-story-grid">
            <div>
              <span
                aria-hidden="true"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: 'clamp(3rem, 8vw, 4.5rem)',
                  lineHeight: 0.85,
                  color: c.sageMuted,
                  display: 'block',
                  marginBottom: '0.5rem',
                }}
              >
                “
              </span>
              <blockquote
                style={{
                  margin: 0,
                  padding: 0,
                  border: 'none',
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: 'clamp(1.2rem, 2.8vw, 1.5rem)',
                  color: c.forest,
                  lineHeight: 1.45,
                  maxWidth: 520,
                }}
              >
                Before Hiraya Haven, I didn&apos;t feel safe or seen. Now I want to become a teacher.
              </blockquote>
              <p style={{ margin: '1.25rem 0 0', color: c.forest, fontWeight: 600, fontSize: 15 }}>— Maria, 17</p>
              <p style={{ margin: '1rem 0 0', color: c.muted, fontSize: 14, lineHeight: 1.65, maxWidth: 500 }}>
                Donor support helped Maria move into a safe home, access counseling, and stay in school so she can plan
                a future she chooses.
              </p>
            </div>
            <div
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: cardShadow,
                aspectRatio: '4 / 3',
                maxHeight: 380,
              }}
            >
              <img
                src={storyImage}
                alt="A young girl smiling while writing at a desk"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 22%' }}
              />
            </div>
          </div>
        </section>

        {/* Pre-footer CTA */}
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
      </main>
    </>
  );
}
