import { lazy, Suspense } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Line,
} from 'recharts';

const MonthlyLineChart = lazy(() => import('../charts/MonthlyLineChart'));
const CampaignBarChart = lazy(() => import('../charts/CampaignBarChart'));
const BridgeLineChart = lazy(() => import('../charts/BridgeLineChart'));

const c = {
  forest: '#2A4A35',
  gold: '#D4A44C',
  rose: '#C4867A',
  sage: '#6B9E7E',
  muted: '#7A786F',
  sageLight: '#D4EAD9',
};

const CHART_FALLBACK = <p style={{ fontSize: 13, color: c.muted }}>Loading chart…</p>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: c.forest,
          marginBottom: 10,
          paddingBottom: 6,
          borderBottom: `1px solid ${c.sageLight}`,
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function formatIsoMonth(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short' });
  }
  return String(v);
}

function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** Generic table for an array of plain objects (insights API rows). */
export function GenericTable({
  rows,
  maxCols = 14,
}: {
  rows: Record<string, unknown>[];
  maxCols?: number;
}) {
  if (rows.length === 0) return <p style={{ fontSize: 13, color: c.muted }}>No rows returned.</p>;
  const keys = Object.keys(rows[0]).slice(0, maxCols);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: c.sageLight }}>
            {keys.map((k) => (
              <th
                key={k}
                style={{ padding: '8px 10px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? '#FBF8F2' : '#FFFFFF' }}>
              {keys.map((k) => (
                <td key={k} style={{ padding: '8px 10px', color: '#2C2B28', maxWidth: 280, wordBreak: 'break-word' }}>
                  {formatCell(row[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 11, color: c.muted, marginTop: 6 }}>{rows.length} row{rows.length !== 1 ? 's' : ''}</p>
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function asObjectArray(data: unknown): Record<string, unknown>[] | null {
  if (!Array.isArray(data)) return null;
  if (data.length === 0) return [];
  if (typeof data[0] === 'object' && data[0] !== null && !Array.isArray(data[0])) return data as Record<string, unknown>[];
  return null;
}

const PIE_COLORS = [c.forest, c.gold, c.rose, c.sage, '#8B7355', '#4A6FA5'];

export function PipelineOutputView({ pipelineId, data }: { pipelineId: string; data: unknown }) {
  if (data == null) {
    return <p style={{ color: c.muted }}>No data.</p>;
  }

  // —— social-posting-windows: nested byHour / byDayOfWeek ——
  if (pipelineId === 'social-posting-windows' && typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    const byHour = asObjectArray(o.byHour);
    const byDay = asObjectArray(o.byDayOfWeek);
    const notes = o.notes;
    const totalPosts = o.totalPosts;
    const hourChart =
      byHour?.map((r) => ({
        name: `${String(r.hourUtc ?? '—')}:00`,
        hour: Number(r.hourUtc ?? 0),
        posts: Number(r.postCount ?? 0),
        avgReferrals: Number(r.avgDonationReferrals ?? 0),
        estPhp: Number(r.totalEstimatedValuePhp ?? 0),
        ctrPct:
          typeof r.clickThroughRate === 'number' && r.clickThroughRate != null
            ? Math.round(Number(r.clickThroughRate) * 10000) / 100
            : null,
        engagement: Number(r.avgEngagement ?? 0),
      })) ?? [];
    hourChart.sort((a, b) => a.hour - b.hour);

    const dayChart =
      byDay?.map((r) => ({
        name: String(r.dayOfWeek ?? '—').slice(0, 12),
        posts: Number(r.postCount ?? 0),
        avgReferrals: Number(r.avgDonationReferrals ?? 0),
        estPhp: Number(r.totalEstimatedValuePhp ?? 0),
        ctrPct:
          typeof r.clickThroughRate === 'number' && r.clickThroughRate != null
            ? Math.round(Number(r.clickThroughRate) * 10000) / 100
            : null,
      })) ?? [];

    return (
      <>
        <Section title="Summary">
          <p style={{ fontSize: 13, color: c.muted }}>
            Total posts in dataset: <strong style={{ color: c.forest }}>{String(totalPosts ?? '—')}</strong>
          </p>
          {typeof notes === 'string' && notes.length > 0 && (
            <p style={{ fontSize: 12, color: c.muted, fontStyle: 'italic', marginTop: 8, lineHeight: 1.5 }}>{notes}</p>
          )}
        </Section>
        <Section title="By hour — avg. donation referrals & CTR (%)">
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <ComposedChart data={hourChart} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="rgba(44,43,40,0.08)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={2} height={36} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={44} label={{ value: 'Avg referrals', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  width={44}
                  label={{ value: 'CTR %', angle: 90, position: 'insideRight', style: { fontSize: 10 } }}
                />
                <Tooltip
                  formatter={(v: unknown, name) => {
                    const n = String(name ?? '');
                    if (n === 'ctrPct') return [v != null && v !== '' ? `${v}%` : '—', 'CTR %'];
                    return [String(v), n === 'avgReferrals' ? 'Avg referrals' : n];
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="avgReferrals" name="Avg referrals" fill={c.forest} radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="ctrPct" name="CTR %" stroke={c.gold} strokeWidth={2} dot={{ r: 2 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="By hour — detail">
          {byHour && byHour.length > 0 ? <GenericTable rows={byHour} /> : <p style={{ fontSize: 13, color: c.muted }}>No hourly rows.</p>}
        </Section>
        <Section title="By weekday — estimated value (PHP)">
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={dayChart} margin={{ top: 8, right: 16, bottom: 48, left: 8 }}>
                <CartesianGrid stroke="rgba(44,43,40,0.08)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} height={56} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompact(Number(v))} />
                <Tooltip formatter={(v: unknown) => [`₱${formatCompact(Number(v))}`, 'Est. value']} />
                <Bar dataKey="estPhp" name="Total est. PHP" fill={c.sage} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="By weekday — detail">
          {byDay && byDay.length > 0 ? <GenericTable rows={byDay} /> : <p style={{ fontSize: 13, color: c.muted }}>No weekday rows.</p>}
        </Section>
      </>
    );
  }

  // —— social-content-drivers: nested dimension arrays ——
  if (pipelineId === 'social-content-drivers' && typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    const notes = o.notes;
    const take = o.take;
    const renderDim = (title: string, key: string) => {
      const arr = asObjectArray(o[key]);
      if (!arr || arr.length === 0) return null;
      const barData = arr.map((r) => ({
        name: String(r.key ?? '—').slice(0, 22),
        total: Number(r.totalEstimatedValuePhp ?? 0),
      }));
      return (
        <div key={key} style={{ marginBottom: 28 }}>
          <Section title={title}>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={barData} margin={{ top: 8, right: 16, bottom: 56, left: 8 }}>
                  <CartesianGrid stroke="rgba(44,43,40,0.08)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} height={70} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompact(Number(v))} />
                  <Tooltip formatter={(v: unknown) => [`₱${formatCompact(Number(v))}`, 'Est. value']} />
                  <Bar dataKey="total" fill={c.forest} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <GenericTable rows={arr} />
          </Section>
        </div>
      );
    };

    return (
      <>
        <Section title="Summary">
          <p style={{ fontSize: 13, color: c.muted }}>
            {typeof take === 'number' ? `Top ${take} per dimension · ` : null}
            Exploratory rollups — not causal.
          </p>
          {typeof notes === 'string' && notes.length > 0 && (
            <p style={{ fontSize: 12, color: c.muted, fontStyle: 'italic', marginTop: 8 }}>{notes}</p>
          )}
        </Section>
        {renderDim('Content topic — estimated gift value (PHP)', 'byTopic')}
        {renderDim('Media type', 'byMediaType')}
        {renderDim('Post type', 'byPostType')}
        {renderDim('Call to action', 'byCallToAction')}
      </>
    );
  }

  // —— Special: engagement object with segments ——
  if (pipelineId === 'social-engagement-vanity' && typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    const segments = o.segments;
    const th = o.thresholds;
    const total = o.totalPosts;
    if (Array.isArray(segments)) {
      const pieData = (segments as { segment?: string; postCount?: number }[]).map((s) => ({
        name: String(s.segment ?? '').replace(/_/g, ' '),
        value: Number(s.postCount ?? 0),
      }));
      return (
        <>
          <Section title="Summary">
            <p style={{ fontSize: 13, color: c.muted }}>
              Total posts: <strong style={{ color: c.forest }}>{String(total ?? '—')}</strong>
              {th != null && typeof th === 'object' ? (
                <>
                  {' '}
                  · P75 thresholds: engagement {formatCompact(Number((th as { engagementScoreP75?: number }).engagementScoreP75))}, donation
                  referrals {formatCompact(Number((th as { donationReferralsP75?: number }).donationReferralsP75))}
                </>
              ) : null}
            </p>
          </Section>
          <Section title="Segment mix">
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => [formatCompact(Number(v)), 'Posts']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Section>
          <Section title="Segments">
            <GenericTable rows={segments as Record<string, unknown>[]} />
          </Section>
        </>
      );
    }
  }

  const rows = asObjectArray(data);
  if (!rows) {
    return (
      <pre
        style={{
          background: '#f6f4ef',
          padding: 12,
          borderRadius: 8,
          fontSize: 12,
          overflow: 'auto',
          border: `1px solid ${c.sageLight}`,
        }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  // —— donations-monthly ——
  if (pipelineId === 'donations-monthly') {
    const lineData = rows.map((r) => ({
      month: formatIsoMonth(r.month),
      total: Number(r.totalValuePhp ?? 0),
    }));
    return (
      <>
        <Section title="Monthly donation total (PHP)">
          <Suspense fallback={CHART_FALLBACK}>
            <MonthlyLineChart data={lineData} />
          </Suspense>
        </Section>
        <Section title="Monthly detail (from database)">
          <GenericTable rows={rows} />
        </Section>
      </>
    );
  }

  // —— donations-by-campaign ——
  if (pipelineId === 'donations-by-campaign') {
    const barData = rows.map((r) => ({
      name: String(r.campaignName ?? '—').slice(0, 28),
      total: Number(r.totalValuePhp ?? 0),
    }));
    return (
      <>
        <Section title="Total value by campaign (PHP)">
          <Suspense fallback={CHART_FALLBACK}>
            <CampaignBarChart data={barData} />
          </Suspense>
        </Section>
        <Section title="Campaign detail">
          <GenericTable rows={rows} />
        </Section>
      </>
    );
  }

  // —— bridge-monthly ——
  if (pipelineId === 'bridge-monthly') {
    const bridgeData = rows.map((r) => ({
      month: formatIsoMonth(r.month),
      donations: Number(r.donation_total_php ?? 0),
      referrals: Number(r.donation_referrals ?? 0),
      incidents: Number(r.incidents ?? 0),
    }));
    return (
      <>
        <Section title="Bridge: donations vs referrals vs incidents">
          <Suspense fallback={CHART_FALLBACK}>
            <BridgeLineChart data={bridgeData} />
          </Suspense>
        </Section>
        <Section title="Monthly bridge rows">
          <GenericTable rows={rows} maxCols={16} />
        </Section>
      </>
    );
  }

  // —— donors-upgrade-candidates ——
  if (pipelineId === 'donors-upgrade-candidates') {
    const barData = rows.slice(0, 15).map((r) => ({
      name: String(r.supporterName ?? r.supporterId ?? '—').slice(0, 22),
      total: Number(r.expectedNextValuePhp ?? 0),
    }));
    return (
      <>
        <Section title="Top candidates by expected next value (heuristic)">
          <Suspense fallback={CHART_FALLBACK}>
            <CampaignBarChart data={barData} barColor={c.rose} />
          </Suspense>
        </Section>
        <Section title="All candidates">
          <GenericTable rows={rows} />
        </Section>
      </>
    );
  }

  // —— posts-donation-linkage ——
  if (pipelineId === 'posts-donation-linkage') {
    const barData = rows.map((r) => ({
      name: String(r.key ?? '—').slice(0, 24),
      total: Number(r.totalEstimatedValuePhp ?? 0),
    }));
    return (
      <>
        <Section title="Estimated referred value by group (PHP)">
          <Suspense fallback={CHART_FALLBACK}>
            <CampaignBarChart data={barData} barColor={c.sage} />
          </Suspense>
        </Section>
        <Section title="Group statistics">
          <GenericTable rows={rows} />
        </Section>
      </>
    );
  }

  // —— safehouses-strain ——
  if (pipelineId === 'safehouses-strain') {
    const stressData = rows.map((r) => ({
      name: String(r.safehouseName ?? r.safehouseId ?? '—').slice(0, 20),
      total: Number(r.stressIndexZ ?? 0),
    }));
    return (
      <>
        <Section title="Stress index (Z) by safehouse">
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={stressData} margin={{ top: 8, right: 16, bottom: 48, left: 8 }}>
                <CartesianGrid stroke="rgba(44,43,40,0.08)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} height={70} />
                <YAxis tick={{ fontSize: 11 }} width={52} />
                <Tooltip formatter={(v: unknown) => [String(v), 'Stress Z']} />
                <Bar dataKey="total" fill={c.forest} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Safehouse detail">
          <GenericTable rows={rows} />
        </Section>
      </>
    );
  }

  // —— interventions-by-category ——
  if (pipelineId === 'interventions-by-category') {
    const barData = rows.map((r) => ({
      name: String(r.planCategory ?? '—').slice(0, 24),
      total: Number(r.planCount ?? 0),
    }));
    return (
      <>
        <Section title="Plans by category">
          <Suspense fallback={CHART_FALLBACK}>
            <CampaignBarChart data={barData} barColor={c.forest} numberFormat="compact" />
          </Suspense>
        </Section>
        <Section title="Category detail">
          <GenericTable rows={rows} />
        </Section>
      </>
    );
  }

  // —— residents-risk-flags & reintegration: table + optional score chart ——
  if (pipelineId === 'residents-risk-flags') {
    const barData = rows.slice(0, 20).map((r) => ({
      name: String(r.residentLabel ?? r.residentId ?? '—').slice(0, 18),
      total: Number(r.riskScore ?? 0),
    }));
    return (
      <>
        <Section title="Highest risk scores (subset)">
          <Suspense fallback={CHART_FALLBACK}>
            <CampaignBarChart data={barData} barColor={c.rose} numberFormat="compact" />
          </Suspense>
        </Section>
        <Section title="Residents (from database)">
          <GenericTable rows={rows} />
        </Section>
      </>
    );
  }

  if (pipelineId === 'residents-reintegration-readiness') {
    const barData = rows.slice(0, 20).map((r) => ({
      name: String(r.residentLabel ?? r.residentId ?? '—').slice(0, 18),
      total: Number(r.readinessScore ?? 0),
    }));
    return (
      <>
        <Section title="Readiness score (subset)">
          <Suspense fallback={CHART_FALLBACK}>
            <CampaignBarChart data={barData} barColor={c.gold} numberFormat="compact" />
          </Suspense>
        </Section>
        <Section title="Residents (from database)">
          <GenericTable rows={rows} />
        </Section>
      </>
    );
  }

  // Default: table only
  return (
    <Section title="Query results">
      <GenericTable rows={rows} />
    </Section>
  );
}
