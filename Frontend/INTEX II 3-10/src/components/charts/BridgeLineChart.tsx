import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

type Props = {
  data: Array<{ month: string; donations: number; referrals: number; incidents: number }>;
  height?: number;
  gridColor?: string;
  donationsColor?: string;
  referralsColor?: string;
  incidentsColor?: string;
  showIncidents?: boolean;
};

function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function formatPhp(n: number): string {
  if (!Number.isFinite(n)) return '₱0';
  return `₱${Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(n)}`;
}

export default function BridgeLineChart({
  data,
  height = 260,
  gridColor = 'rgba(44,43,40,0.08)',
  donationsColor = '#2A4A35',
  referralsColor = '#C4867A',
  incidentsColor = '#D4A44C',
  showIncidents = true,
}: Props) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 28, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={gridColor} vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          {/* Left axis: PHP donations */}
          <YAxis
            yAxisId="php"
            tick={{ fontSize: 11 }}
            width={70}
            tickFormatter={(v) => formatCompact(Number(v))}
          />
          {/* Right axis: counts (referrals/incidents) */}
          <YAxis
            yAxisId="count"
            orientation="right"
            tick={{ fontSize: 11 }}
            width={50}
            tickFormatter={(v) => formatCompact(Number(v))}
          />
          <Tooltip
            formatter={(v: any, name: any) => {
              if (name === 'donations') return [formatPhp(Number(v)), 'Donations (PHP)'];
              if (name === 'referrals') return [formatCompact(Number(v)), 'Referrals'];
              if (name === 'incidents' && showIncidents) return [formatCompact(Number(v)), 'Incidents'];
              return [String(v), String(name)];
            }}
          />
          <Line yAxisId="php" type="monotone" dataKey="donations" stroke={donationsColor} strokeWidth={2.5} dot={false} />
          <Line yAxisId="count" type="monotone" dataKey="referrals" stroke={referralsColor} strokeWidth={2} dot={false} />
          {showIncidents && (
            <Line yAxisId="count" type="monotone" dataKey="incidents" stroke={incidentsColor} strokeWidth={2} dot={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
