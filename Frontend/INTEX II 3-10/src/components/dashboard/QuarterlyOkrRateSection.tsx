import type { ReactNode } from 'react';

const c = {
  ivory: '#FBF8F2',
  forest: '#2A4A35',
  sage: '#2A4A35',
  sageLight: '#244232',
  sageBorder: '#355E46',
  goldLight: '#F5E6C8',
  muted: '#7A786F',
  white: '#FFFFFF',
};

export type QuarterlyRateOkrItem = {
  period: string;
  year: number;
  quarter: number;
  rate: number | null;
  targetRate: number | null;
  numerator: number;
  denominator: number;
};

export type QuarterlyRateOkrResponse = {
  metricKey: string;
  generatedAtUtc: string;
  items: QuarterlyRateOkrItem[];
};

function StatCard({
  label,
  value,
  accent,
  invert = false,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
  invert?: boolean;
}) {
  return (
    <div
      style={{
        minWidth: 120,
        padding: '10px 14px',
        borderRadius: 10,
        background: accent ?? c.ivory,
        border: `1px solid ${invert ? c.sageBorder : c.sageLight}`,
      }}
    >
      <div style={{ fontSize: 10, color: invert ? c.ivory : c.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: invert ? c.ivory : c.forest }}>{value}</div>
    </div>
  );
}

export function QuarterlyOkrRateSection({
  title,
  subtitle,
  response,
  emptyMessage,
  unitLabel,
}: {
  title: string;
  subtitle?: string;
  response: QuarterlyRateOkrResponse | null;
  emptyMessage: string;
  /** Shown in table header for the fraction column, e.g. "Sessions" */
  unitLabel: string;
}) {
  const cappedItems = response?.items ?? [];
  const latest = cappedItems[0];
  const rate = latest?.rate;
  const tgt = latest?.targetRate;
  const ratePct = rate != null ? Math.round(rate * 100) : null;
  const tgtPct = tgt != null ? Math.round(tgt * 100) : null;
  const progressToTarget = rate != null && tgt != null && tgt > 0 ? Math.min(1, Math.max(0, rate / tgt)) : null;

  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      <div style={{ background: c.white, border: `1px solid ${c.sageBorder}`, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 24 }}>
      {subtitle && (
        <p style={{ fontSize: 11, color: c.muted, marginTop: 0, marginBottom: 12 }}>{subtitle}</p>
      )}
      {latest && latest.denominator > 0 ? (
        <>
          <p style={{ fontSize: 12, color: c.muted, marginTop: 0, marginBottom: 10 }}>
            Latest period: <strong style={{ color: c.forest }}>{latest.period}</strong> · {latest.numerator} / {latest.denominator}{' '}
            {unitLabel.toLowerCase()}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            <StatCard label="Actual rate" value={ratePct != null ? `${ratePct}%` : '—'} accent={c.sage} invert />
            <StatCard label="Target" value={tgtPct != null ? `${tgtPct}%` : '—'} accent={c.goldLight} />
          </div>
          {progressToTarget != null && (
            <div>
              <p style={{ fontSize: 11, color: c.muted, margin: 0, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Progress to target
              </p>
              <div style={{ background: c.ivory, border: `1px solid ${c.sageBorder}`, borderRadius: 999, overflow: 'hidden', height: 10 }}>
                <div style={{ width: `${Math.round(progressToTarget * 100)}%`, height: '100%', background: c.sage }} />
              </div>
            </div>
          )}
          {cappedItems.length > 0 && (
            <div style={{ overflowX: 'auto', marginTop: 14 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: c.sage }}>
                    {['Quarter', 'Rate', 'Target', `${unitLabel} (num / den)`].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.ivory, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cappedItems.map((row, i) => (
                    <tr key={`${row.period}-${i}`} style={{ borderBottom: `1px solid ${c.sageBorder}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                      <td style={{ padding: '8px 12px' }}>{row.period}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.rate != null ? `${Math.round(row.rate * 100)}%` : '—'}</td>
                      <td style={{ padding: '8px 12px', color: c.muted }}>{row.targetRate != null ? `${Math.round(row.targetRate * 100)}%` : '—'}</td>
                      <td style={{ padding: '8px 12px', color: c.muted }}>
                        {row.numerator} / {row.denominator}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>{emptyMessage}</p>
      )}
      </div>
    </>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 style={{ fontSize: 14, color: c.forest, marginTop: 0, marginBottom: 10, fontWeight: 700, letterSpacing: 0.3 }}>
      {children}
    </h3>
  );
}
