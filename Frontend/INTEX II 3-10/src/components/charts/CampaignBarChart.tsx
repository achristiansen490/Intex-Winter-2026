import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

type Props = {
  data: Array<{ name: string; total: number }>;
  height?: number;
  gridColor?: string;
  barColor?: string;
  /** If set, each bar uses the matching color (cycles if shorter than data). */
  barColors?: string[];
  /** Use compact for counts/scores; default PHP formatting for monetary bars. */
  numberFormat?: 'php' | 'compact';
};

function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function formatPhp(n: number): string {
  if (!Number.isFinite(n)) return '₱0';
  return `₱${Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(n)}`;
}

export default function CampaignBarChart({
  data,
  height = 260,
  gridColor = 'rgba(44,43,40,0.08)',
  barColor = '#D4A44C',
  barColors,
  numberFormat = 'php',
}: Props) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={gridColor} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} height={60} />
          <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={(v) => formatCompact(Number(v))} />
          <Tooltip
            formatter={(v: any) => {
              const n = Number(v);
              if (numberFormat === 'compact') return [formatCompact(n), 'Value'];
              return [formatPhp(n), 'Total'];
            }}
          />
          <Bar dataKey="total" fill={barColor} radius={[6, 6, 0, 0]}>
            {barColors?.length
              ? data.map((_, i) => (
                  <Cell key={`bar-${i}`} fill={barColors[i % barColors.length]} />
                ))
              : null}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

