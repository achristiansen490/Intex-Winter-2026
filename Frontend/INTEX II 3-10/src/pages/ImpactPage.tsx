import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import { Logo } from '../components/Logo';
import MonthlyLineChart from '../components/charts/MonthlyLineChart';
import CampaignBarChart from '../components/charts/CampaignBarChart';
import { apiUrl } from '../lib/api';

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

export default function ImpactPage() {
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
      setError('Failed to load impact data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const latestSnapshot = snapshots.length ? snapshots[0] : null;
  const payload = useMemo(() => safeJsonParse(latestSnapshot?.metricPayloadJson), [latestSnapshot?.metricPayloadJson]);

  const topStats = useMemo(() => {
    const p = payload as any;
    const a = p?.topStats;
    if (Array.isArray(a) && a.every((x: any) => Array.isArray(x) && x.length >= 2)) {
      return a.slice(0, 3) as [string, string][];
    }

    const girlsServed = p?.stats?.girlsServedThisYear ?? p?.girlsServedThisYear ?? overview?.activeResidentCount ?? '—';
    const partners = p?.stats?.partnerCommunities ?? p?.partnerCommunities ?? overview?.partnerCount ?? '—';
    const stayed = p?.stats?.stayedInSchoolRate ?? p?.stayedInSchoolRate ?? null;
    const stayedLabel = stayed != null ? `${Math.round(Number(stayed) * 100)}%` : '—';
    return [
      [String(girlsServed), 'Girls served this year'],
      [String(partners), 'Partner communities'],
      [String(stayedLabel), 'Stayed in school'],
    ] as [string, string][];
  }, [overview?.activeResidentCount, overview?.partnerCount, payload]);

  const monthlyImpact = useMemo(() => {
    const p = payload as any;
    const arr = p?.monthlyImpact;
    if (Array.isArray(arr)) return arr as { month: string; total: number }[];
    // Fallback: show empty chart if snapshot didn't include series.
    return [] as { month: string; total: number }[];
  }, [payload]);

  const supportPrograms = useMemo(() => {
    const p = payload as any;
    const arr = p?.supportPrograms;
    if (Array.isArray(arr)) return arr as { name: string; total: number }[];
    return [] as { name: string; total: number }[];
  }, [payload]);

  return (
    <>
      <NavBar />
      <main id="main-content" style={{ background: c.ivory }}>
        <section
          aria-labelledby="impact-page-heading"
          style={{
            padding: '2.25rem 2.5rem 2rem',
            borderBottom: '0.5px solid rgba(44,43,40,0.12)',
          }}
        >
          <h1
            id="impact-page-heading"
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 'clamp(30px,5vw,48px)',
              fontWeight: 400,
              color: c.forest,
              margin: '0 0 0.75rem',
            }}
          >
            Every gift helps rebuild futures.
          </h1>
          <p style={{ maxWidth: 720, color: c.muted, lineHeight: 1.75, margin: 0 }}>
            This page highlights our latest published impact snapshot and high-level operational totals.
          </p>
          {error && (
            <p style={{ maxWidth: 720, color: '#C4867A', lineHeight: 1.6, margin: '0.75rem 0 0' }}>
              {error}
            </p>
          )}
          {!loading && !latestSnapshot && (
            <p style={{ maxWidth: 720, color: c.muted, lineHeight: 1.6, margin: '0.75rem 0 0' }}>
              No published impact snapshots yet. An admin can publish one via the Impact Snapshots table.
            </p>
          )}
        </section>

        <section
          aria-label="Top impact metrics"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 14,
            padding: '2rem 2.5rem',
          }}
        >
          {topStats.map(([value, label], idx) => (
            <article
              key={label}
              style={{
                background: idx === 0 ? c.roseLight : idx === 1 ? c.sageLight : c.goldLight,
                borderRadius: 14,
                padding: '1.2rem 1.1rem',
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: c.forest,
                  fontFamily: 'Georgia, serif',
                  fontSize: 28,
                }}
              >
                {value}
              </p>
              <p style={{ margin: '0.35rem 0 0', color: c.text, fontSize: 13 }}>{label}</p>
            </article>
          ))}
        </section>

        <section style={{ padding: '0 2.5rem 2.5rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 18,
            }}
          >
            <article
              style={{
                background: '#fff',
                border: '0.5px solid rgba(44,43,40,0.12)',
                borderRadius: 14,
                padding: '1rem 1rem 0.35rem',
              }}
            >
              <h2
                style={{
                  margin: '0 0 0.75rem',
                  fontFamily: 'Georgia, serif',
                  fontWeight: 400,
                  color: c.forest,
                }}
              >
                Monthly support trend
              </h2>
              {monthlyImpact.length > 0 ? (
                <MonthlyLineChart data={monthlyImpact} />
              ) : (
                <p style={{ color: c.muted, fontSize: 12, marginTop: 8 }}>
                  No monthly series in the latest snapshot.
                </p>
              )}
            </article>

            <article
              style={{
                background: '#fff',
                border: '0.5px solid rgba(44,43,40,0.12)',
                borderRadius: 14,
                padding: '1rem 1rem 0.35rem',
              }}
            >
              <h2
                style={{
                  margin: '0 0 0.75rem',
                  fontFamily: 'Georgia, serif',
                  fontWeight: 400,
                  color: c.forest,
                }}
              >
                Program allocation mix
              </h2>
              {supportPrograms.length > 0 ? (
                <CampaignBarChart data={supportPrograms} />
              ) : (
                <p style={{ color: c.muted, fontSize: 12, marginTop: 8 }}>
                  No program mix series in the latest snapshot.
                </p>
              )}
            </article>
          </div>
        </section>

        {!loading && latestSnapshot && (
          <section style={{ padding: '0 2.5rem 2.5rem' }}>
            <article style={{ background: '#fff', border: '0.5px solid rgba(44,43,40,0.12)', borderRadius: 14, padding: '1.25rem 1.25rem' }}>
              <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontWeight: 400, color: c.forest }}>
                {latestSnapshot.headline ?? 'Impact update'}
              </h2>
              {latestSnapshot.summaryText && (
                <p style={{ margin: '0.6rem 0 0', color: c.text, lineHeight: 1.7 }}>
                  {latestSnapshot.summaryText}
                </p>
              )}
              <p style={{ margin: '0.75rem 0 0', color: c.muted, fontSize: 12 }}>
                {latestSnapshot.snapshotDate ? new Date(latestSnapshot.snapshotDate).toLocaleDateString() : '—'}
              </p>
            </article>
          </section>
        )}

        <section
          style={{
            background: c.forest,
            margin: '0 2.5rem 2.5rem',
            borderRadius: 14,
            padding: '1.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: c.ivory,
                fontFamily: 'Georgia, serif',
                fontWeight: 400,
              }}
            >
              Want to be part of this impact?
            </h2>
            <p style={{ margin: '0.35rem 0 0', color: 'rgba(251,248,242,0.75)', fontSize: 14 }}>
              Join as a supporter and help us reach more girls with safety and care.
            </p>
          </div>
          <Link
            to="/register"
            style={{
              background: c.gold,
              color: c.forest,
              textDecoration: 'none',
              borderRadius: 26,
              padding: '10px 20px',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Give Hope
          </Link>
        </section>

        <footer style={{ borderTop: '0.5px solid rgba(44,43,40,0.1)', padding: '1.5rem 2.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <Logo />
            <nav aria-label="Footer links">
              <ul
                style={{
                  display: 'flex',
                  gap: 20,
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                }}
              >
                <li>
                  <Link to="/" style={{ color: c.muted, textDecoration: 'none', fontSize: 13 }}>
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" style={{ color: c.muted, textDecoration: 'none', fontSize: 13 }}>
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </nav>
            <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>
              Published impact snapshots are sourced from the live system.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
