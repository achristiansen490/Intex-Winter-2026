import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import { apiUrl } from '../lib/api';
import './LandingPage.css';

const c = {
  ivory: '#FBF8F2', rose: '#C4867A', roseLight: '#F0D8D4',
  sage: '#6B9E7E', sageLight: '#D4EAD9', forest: '#2A4A35',
  gold: '#D4A44C', goldLight: '#F5E6C8', text: '#2C2B28',
  muted: '#7A786F', white: '#FFFFFF',
};
const HERO_IMAGE = '/images/philipinesgirl.jpg';
const MISSION_IMAGE = '/images/philipines.jpg';

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

function safeJsonParse(raw: string | null | undefined): unknown {
  if (!raw) return null;
  try { return JSON.parse(raw) as unknown; } catch { return null; }
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function formatMetric(n: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US').format(n);
}

function HouseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 10.8 12 4l9 6.8" />
      <path d="M5.5 10.5V20h13V10.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

function HeartHandIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20s-5.8-3.9-7.7-7.1a4.2 4.2 0 0 1 6.5-5.2L12 9l1.2-1.3a4.2 4.2 0 0 1 6.5 5.2C17.8 16.1 12 20 12 20Z" />
      <path d="M2.8 18.2h5.3l1.2-1.7h3.8l1.2 1.7h6.9" />
    </svg>
  );
}

function ArrowPathIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 8V4h-4" />
      <path d="M20 12a8 8 0 1 1-2.3-5.7L19 8" />
      <path d="M12 8v4l2.8 2.2" />
    </svg>
  );
}

export default function LandingPage() {
  const [snapshots, setSnapshots] = useState<PublicImpactSnapshot[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [snaps, ov] = await Promise.allSettled([
        fetch(apiUrl('/api/publicimpactsnapshots')).then(r => (r.ok ? r.json() : [])),
        fetch(apiUrl('/api/dashboard/overview')).then(r => (r.ok ? r.json() : null)),
      ]);

      const nextSnaps = snaps.status === 'fulfilled' && Array.isArray(snaps.value) ? snaps.value as PublicImpactSnapshot[] : [];
      const nextOv = ov.status === 'fulfilled' && ov.value && typeof ov.value === 'object' ? ov.value as Overview : null;
      setSnapshots(nextSnaps);
      setOverview(nextOv);
    } catch {
      setError('Failed to load impact metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const latestSnapshot = snapshots.length ? snapshots[0] : null;
  const payload = useMemo(() => safeJsonParse(latestSnapshot?.metricPayloadJson), [latestSnapshot?.metricPayloadJson]);

  const yearsImpact = useMemo(() => {
    const p = payload as any;
    const explicit = asNumber(p?.stats?.yearsImpact ?? p?.yearsImpact);
    if (explicit != null) return explicit;
    return Math.max(new Date().getFullYear() - 2019, 1);
  }, [payload]);

  const statItems = useMemo(() => {
    // Prefer snapshot-defined stats; fallback to dashboard overview; otherwise show em-dash.
    const p = payload as any;
    const girlsServed = asNumber(p?.stats?.girlsServed ?? p?.girlsServed ?? overview?.activeResidentCount);
    const safehouses = asNumber(p?.stats?.activeSafehouses ?? p?.activeSafehouses ?? overview?.safehouseCount);
    const funding = asNumber(overview?.totalMonetaryAmount);

    return [
      { value: formatMetric(girlsServed), label: 'Girls Served', story: 'Survivors who received direct shelter, care, and restoration support.' },
      { value: formatMetric(safehouses), label: 'Active Safehouses', story: 'Protected homes currently operating across Metro Manila communities.' },
      { value: `${formatMetric(yearsImpact)}+`, label: 'Years of Impact', story: 'Consistent, long-term care anchored in local partnerships and trust.' },
      { value: funding != null ? `₱${new Intl.NumberFormat('en-US').format(Math.round(funding))}` : '—', label: 'Funding Mobilized', story: 'Resources directed toward safety, counseling, education, and reintegration.' },
    ];
  }, [overview?.activeResidentCount, overview?.safehouseCount, overview?.totalMonetaryAmount, payload, yearsImpact]);

  return (
    <>
      <NavBar />
      <main id="main-content" className="landing-page">
        {/* Hero */}
        <section aria-labelledby="hero-heading" className="landing-hero">
          <img src={HERO_IMAGE} alt="Girl in Metro Manila standing in daylight, representing resilience and hope." className="landing-hero-image" />
          <div className="landing-hero-overlay" />
          <div className="landing-hero-content">
            <p aria-hidden="true" className="landing-kicker">
              Metro Manila | Survivor-centered care
            </p>
            <h1 id="hero-heading">
              Healing <em>hearts</em>, rebuilding <span>futures.</span>
            </h1>
            <p>
              Hiraya Haven provides safe homes and long-term restoration support for girls who are survivors of abuse and exploitation in the Philippines.
            </p>
            <div className="landing-hero-actions">
              <Link to="/register" style={{ background: c.gold, color: c.forest, fontSize: 14, fontWeight: 600, padding: '12px 28px', borderRadius: 28, textDecoration: 'none', display: 'inline-block' }}>
                Give Hope Today
              </Link>
              <Link to="/impact" style={{ background: 'transparent', color: c.ivory, fontSize: 14, padding: '12px 28px', borderRadius: 28, border: '1px solid rgba(251,248,242,0.52)', textDecoration: 'none', display: 'inline-block' }}>
                See Our Impact
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="landing-impact" aria-label="Impact at a glance">
          <div className="landing-impact-grid" role="list">
            {statItems.map((item, idx) => (
              <article
                key={item.label}
                role="listitem"
                className="impact-card"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <p className="impact-value" aria-label={`${item.value} ${item.label}`}>{item.value}</p>
                <p className="impact-label">{item.label}</p>
                <p className="impact-story">{item.story}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Pillars */}
        <section id="about" aria-labelledby="mission-pillars-heading" className="landing-pillars">
          <h2 id="mission-pillars-heading">How we restore dignity and hope</h2>
          <div className="landing-pillars-grid">
            {[
              {
                icon: <HouseIcon />,
                title: 'Safe homes',
                text: 'Trauma-informed residential care through secure, nurturing spaces built for healing and stability.',
              },
              {
                icon: <HeartHandIcon />,
                title: 'Healing & counseling',
                text: 'Psychosocial care, case management, and counseling pathways designed to support sustained recovery.',
              },
              {
                icon: <ArrowPathIcon />,
                title: 'Reintegration',
                text: 'Education and life-readiness plans that prepare each girl for long-term independence and restored community life.',
              },
            ].map(({ icon, title, text }) => (
              <article key={title} className="pillar-card">
                <div className="pillar-icon-wrap">{icon}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Our mission */}
        <section aria-labelledby="our-mission-heading" className="landing-mission">
          <img src={MISSION_IMAGE} alt="Metro Manila city and community backdrop representing local restoration efforts." className="landing-mission-image" />
          <div className="landing-mission-overlay" />
          <div className="landing-mission-copy">
            <p className="mission-kicker">Our Mission</p>
            <h2 id="our-mission-heading">Standing with girls in Metro Manila through every stage of restoration.</h2>
            <p>
              Our mission is to provide safe, nurturing homes across Metro Manila where survivors of abuse and exploitation can heal, rebuild their lives, and rediscover hope. Through compassionate care, culturally grounded support, and strong community partnerships, we empower each individual to achieve lasting restoration while fostering transparency and meaningful connections with those who make this transformation possible.
            </p>
          </div>
        </section>
        <div className="landing-cta-transition" aria-hidden="true" />

        {/* CTA */}
        <section id="impact" aria-labelledby="cta-heading" className="landing-cta-section">
          <div className="landing-cta-card">
            {error && (
              <p style={{ color: 'rgba(251,248,242,0.75)', fontSize: 12, marginTop: 0, marginBottom: 10 }}>
                {error}
              </p>
            )}
            {!loading && latestSnapshot?.headline && (
              <p style={{ color: 'rgba(251,248,242,0.75)', fontSize: 12, marginTop: 0, marginBottom: 10 }}>
                Latest impact update: <span style={{ color: c.ivory, fontWeight: 600 }}>{latestSnapshot.headline}</span>
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <h2 id="cta-heading" style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: c.ivory, marginBottom: 8, fontWeight: 400 }}>Ready to make a difference?</h2>
                <p style={{ fontSize: 14, color: 'rgba(251,248,242,0.75)' }}>Every peso goes directly toward safety, healing, and futures.</p>
              </div>
              <Link to="/register" style={{ background: c.gold, color: c.forest, fontSize: 14, fontWeight: 600, padding: '14px 32px', borderRadius: 28, textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-block' }}>
                Create an account
              </Link>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
