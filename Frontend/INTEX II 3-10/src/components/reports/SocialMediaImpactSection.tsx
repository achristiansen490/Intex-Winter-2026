import { useEffect, useState, type ReactNode } from 'react';

const c = {
  ivory: '#FBF8F2',
  forest: '#2A4A35',
  sageLight: '#D4EAD9',
  gold: '#D4A44C',
  rose: '#C4867A',
  muted: '#7A786F',
  white: '#FFFFFF',
};

type ApiFn = (path: string, opts?: RequestInit) => Promise<Response>;

type PostingHourRow = {
  hourUtc: number;
  postCount: number;
  avgEngagement: number;
  avgDonationReferrals: number;
  totalEstimatedValuePhp: number;
  clickThroughRate: number | null;
};

type PostingDayRow = {
  dayOfWeek: string;
  postCount: number;
  avgEngagement: number;
  avgDonationReferrals: number;
  totalEstimatedValuePhp: number;
  clickThroughRate: number | null;
};

type ContentRollup = {
  key: string;
  postCount: number;
  referralRate: number;
  avgReferrals: number;
  totalEstimatedValuePhp: number;
  boostedRate: number;
};

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 style={{ fontSize: 14, color: c.forest, marginTop: 0, marginBottom: 10, fontWeight: 700, letterSpacing: 0.3 }}>
      {children}
    </h3>
  );
}

export function SocialMediaImpactSection({ api }: { api: ApiFn }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [posting, setPosting] = useState<{
    notes?: string;
    byHour?: PostingHourRow[];
    byDayOfWeek?: PostingDayRow[];
    totalPosts?: number;
  } | null>(null);
  const [content, setContent] = useState<{
    notes?: string;
    byTopic?: ContentRollup[];
    byMediaType?: ContentRollup[];
    byPostType?: ContentRollup[];
    byCallToAction?: ContentRollup[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const [pr, cr] = await Promise.all([
          api('/api/insights/social/posting-windows'),
          api('/api/insights/social/content-drivers?take=10'),
        ]);
        const pj = pr.ok ? await pr.json() : null;
        const cj = cr.ok ? await cr.json() : null;
        if (!cancelled) {
          setPosting(pj);
          setContent(cj);
          if (!pj && !cj) setErr('Could not load social insights.');
        }
      } catch {
        if (!cancelled) setErr('Could not load social insights.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  if (loading) {
    return (
      <p style={{ fontSize: 13, color: c.muted }}>Loading social impact analytics…</p>
    );
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <SectionTitle>Social media impact &amp; performance</SectionTitle>
      <p style={{ fontSize: 12, color: c.muted, marginTop: -4, marginBottom: 14, maxWidth: 900, lineHeight: 1.6 }}>
        Planning views aligned with Hiraya Haven’s outreach goals (<em>IntexContext</em>): what tends to correlate with donations, when posts cluster by hour/day, and how that relates to clicks.
        These are <strong>associational</strong> signals only—use them to prioritize experiments (e.g. try more posts in stronger windows; test topics that historically pair with referrals—not causal proof).
      </p>
      {err && (
        <p style={{ fontSize: 12, color: c.rose }} role="alert">
          {err}
        </p>
      )}

      {posting?.notes && (
        <p style={{ fontSize: 11, color: c.muted, fontStyle: 'italic', marginBottom: 12 }}>{posting.notes}</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 18 }}>
        <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 13, color: c.forest }}>When to post (by hour)</h4>
          <div style={{ overflowX: 'auto', maxHeight: 260 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: c.sageLight }}>
                  {['Hour', 'Posts', 'Avg referrals', 'Est. value (sum)', 'CTR'].map((h) => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: c.forest }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(posting?.byHour ?? []).map((row) => (
                  <tr key={row.hourUtc} style={{ borderBottom: `1px solid ${c.sageLight}` }}>
                    <td style={{ padding: '6px 8px' }}>{row.hourUtc}:00</td>
                    <td style={{ padding: '6px 8px', color: c.muted }}>{row.postCount}</td>
                    <td style={{ padding: '6px 8px' }}>{row.avgDonationReferrals.toFixed(2)}</td>
                    <td style={{ padding: '6px 8px' }}>₱{Math.round(row.totalEstimatedValuePhp).toLocaleString()}</td>
                    <td style={{ padding: '6px 8px', color: c.muted }}>
                      {row.clickThroughRate != null ? `${Math.round(row.clickThroughRate * 1000) / 10}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 13, color: c.forest }}>When to post (by weekday)</h4>
          <div style={{ overflowX: 'auto', maxHeight: 260 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: c.sageLight }}>
                  {['Day', 'Posts', 'Avg referrals', 'Est. value (sum)', 'CTR'].map((h) => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: c.forest }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(posting?.byDayOfWeek ?? []).map((row) => (
                  <tr key={row.dayOfWeek} style={{ borderBottom: `1px solid ${c.sageLight}` }}>
                    <td style={{ padding: '6px 8px' }}>{row.dayOfWeek}</td>
                    <td style={{ padding: '6px 8px', color: c.muted }}>{row.postCount}</td>
                    <td style={{ padding: '6px 8px' }}>{row.avgDonationReferrals.toFixed(2)}</td>
                    <td style={{ padding: '6px 8px' }}>₱{Math.round(row.totalEstimatedValuePhp).toLocaleString()}</td>
                    <td style={{ padding: '6px 8px', color: c.muted }}>
                      {row.clickThroughRate != null ? `${Math.round(row.clickThroughRate * 1000) / 10}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {content?.notes && (
        <p style={{ fontSize: 11, color: c.muted, fontStyle: 'italic', marginBottom: 12 }}>{content.notes}</p>
      )}

      <SectionTitle>What to post (exploratory rollups)</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {(
          [
            ['Content topic', content?.byTopic],
            ['Media type', content?.byMediaType],
            ['Post type', content?.byPostType],
            ['Call to action', content?.byCallToAction],
          ] as const
        ).map(([label, rows]) => (
          <div
            key={label}
            style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem' }}
          >
            <h4 style={{ margin: '0 0 10px', fontSize: 13, color: c.forest }}>Top {label}s</h4>
            <div style={{ overflowX: 'auto', maxHeight: 220 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: c.sageLight }}>
                    {['Key', 'Posts', 'Ref. rate', 'Total est. ₱', 'Boost %'].map((h) => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: c.forest }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(rows ?? []).map((row: ContentRollup) => (
                    <tr key={`${label}-${row.key}`} style={{ borderBottom: `1px solid ${c.sageLight}` }}>
                      <td style={{ padding: '6px 8px', maxWidth: 120, wordBreak: 'break-word' }}>{row.key}</td>
                      <td style={{ padding: '6px 8px', color: c.muted }}>{row.postCount}</td>
                      <td style={{ padding: '6px 8px' }}>{Math.round(row.referralRate * 100)}%</td>
                      <td style={{ padding: '6px 8px' }}>₱{Math.round(row.totalEstimatedValuePhp).toLocaleString()}</td>
                      <td style={{ padding: '6px 8px', color: c.muted }}>{Math.round(row.boostedRate * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: c.muted, marginTop: 14, marginBottom: 0 }}>
        APIs: <code>/api/insights/social/posting-windows</code>, <code>/api/insights/social/content-drivers</code> · Registered as ML pipelines for training jobs / governance.
      </p>
    </div>
  );
}
