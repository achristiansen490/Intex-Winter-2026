import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

type Props = {
  data: Array<{ month: string; total: number }>;
  height?: number;
  gridColor?: string;
  lineColor?: string;
};

function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function formatPhp(n: number): string {
  if (!Number.isFinite(n)) return '₱0';
  return `₱${Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(n)}`;
}

export default function MonthlyLineChart({
  data,
  height = 260,
  gridColor = 'rgba(44,43,40,0.08)',
  lineColor = '#2A4A35',
}: Props) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={gridColor} vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={(v) => formatCompact(Number(v))} />
          <Tooltip formatter={(v: any) => [formatPhp(Number(v)), 'Total']} />
          <Line type="monotone" dataKey="total" stroke={lineColor} strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

