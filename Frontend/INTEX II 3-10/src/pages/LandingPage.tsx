import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import { apiUrl } from '../lib/api';

const c = {
  ivory: '#FBF8F2', rose: '#C4867A', roseLight: '#F0D8D4',
  sage: '#6B9E7E', sageLight: '#D4EAD9', forest: '#2A4A35',
  gold: '#D4A44C', goldLight: '#F5E6C8', text: '#2C2B28',
  muted: '#7A786F', white: '#FFFFFF',
};

const HERO_BG = `linear-gradient(135deg,rgba(42,74,53,0.56) 0%,rgba(196,134,122,0.34) 58%,rgba(212,164,76,0.22) 100%), url("/Smiles under the sun.png") center top/cover no-repeat`;

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

  const statItems = useMemo(() => {
    // Prefer snapshot-defined stats; fallback to dashboard overview; otherwise show em-dash.
    const p = payload as any;
    const girlsServed = p?.stats?.girlsServed ?? p?.girlsServed ?? overview?.activeResidentCount ?? null;
    const safehouses = p?.stats?.activeSafehouses ?? p?.activeSafehouses ?? overview?.safehouseCount ?? null;
    const years = p?.stats?.yearsImpact ?? p?.yearsImpact ?? null;

    return [
      [girlsServed != null ? String(girlsServed) : '—', 'Girls served'],
      [safehouses != null ? String(safehouses) : '—', 'Active safehouses'],
      [years != null ? String(years) : '—', 'Years of impact'],
    ] as const;
  }, [overview?.activeResidentCount, overview?.safehouseCount, payload]);

  return (
    <>
      <NavBar />
      <main id="main-content">
        {/* Hero */}
        <section
          aria-labelledby="hero-heading"
          style={{ background: HERO_BG, padding: '5rem 2.5rem 4rem' }}
        >
          <p aria-hidden="true" style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', color: c.sageLight, fontSize: 12, letterSpacing: '0.12em', padding: '5px 14px', borderRadius: 20, marginBottom: '1.5rem', textTransform: 'uppercase' }}>
            A beacon of hope & safety
          </p>
          <h1 id="hero-heading" style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(28px,5vw,52px)', fontWeight: 400, lineHeight: 1.2, color: c.ivory, margin: '0 0 1rem', maxWidth: 620 }}>
            Healing <em style={{ color: c.roseLight, fontStyle: 'italic' }}>hearts</em>, rebuilding{' '}
            <span style={{ color: c.gold }}>futures.</span>
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(251,248,242,0.85)', maxWidth: 480, lineHeight: 1.75, margin: '0 0 2rem' }}>
            We provide safe homes and comprehensive rehabilitation for girls who are survivors of abuse and trafficking in the Philippines.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/register" style={{ background: c.gold, color: c.forest, fontSize: 14, fontWeight: 600, padding: '12px 28px', borderRadius: 28, textDecoration: 'none', display: 'inline-block' }}>
              Give Hope Today
            </Link>
            <a href="#about" style={{ background: 'transparent', color: c.ivory, fontSize: 14, padding: '12px 28px', borderRadius: 28, border: '1px solid rgba(251,248,242,0.45)', textDecoration: 'none', display: 'inline-block' }}>
              Learn Our Approach
            </a>
          </div>
        </section>

        {/* Stats bar */}
        <div role="list" aria-label="Impact at a glance" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', background: c.ivory, borderBottom: '0.5px solid rgba(44,43,40,0.1)' }}>
          {statItems.map(([num, label]) => (
            <div key={label} role="listitem" style={{ padding: '1.5rem', textAlign: 'center', borderRight: '0.5px solid rgba(44,43,40,0.1)' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 400, color: c.forest }} aria-label={`${num} ${label}`}>{num}</div>
              <div aria-hidden="true" style={{ fontSize: 13, color: c.muted, marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Mission */}
        <section id="about" aria-labelledby="mission-heading" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '2rem', background: c.ivory, padding: '3rem 2.5rem' }}>
          <h2 id="mission-heading" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>Our mission pillars</h2>
          {[
            { bg: c.roseLight, title: 'Safe homes', text: 'Trauma-informed residential care across safehouses in Luzon, Visayas, and Mindanao.' },
            { bg: c.sageLight, title: 'Healing & counseling', text: 'Structured psychosocial support, individual and group sessions, and intervention planning.' },
            { bg: c.goldLight, title: 'Reintegration', text: 'Education, vocational training, and family reunification pathways toward lasting independence.' },
          ].map(({ bg, title, text }) => (
            <article key={title}>
              <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, background: bg, marginBottom: 14 }} />
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 17, color: c.forest, marginBottom: 8, fontWeight: 400 }}>{title}</h3>
              <p style={{ fontSize: 14, color: c.muted, lineHeight: 1.7 }}>{text}</p>
            </article>
          ))}
        </section>

        {/* CTA */}
        <section id="impact" aria-labelledby="cta-heading" style={{ background: c.forest, padding: '3rem 2.5rem' }}>
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
              Donate Now
            </Link>
          </div>
        </section>

      </main>
    </>
  );
}
