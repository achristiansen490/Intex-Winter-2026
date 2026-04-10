export const CHART_MAX_YEAR = 2025;
export const CHART_MAX_MONTH_INDEX = 2; // March (0-based)
export const CHART_MAX_MONTH_START = new Date(CHART_MAX_YEAR, CHART_MAX_MONTH_INDEX, 1);

export function parseMonthStart(raw: unknown): Date | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  const isoMonth = /^(\d{4})-(\d{2})$/;
  const m = s.match(isoMonth);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 0 || month > 11) return null;
    return new Date(year, month, 1);
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function isOnOrBeforeChartMaxMonth(raw: unknown): boolean {
  const d = parseMonthStart(raw);
  if (!d) return false;
  if (d.getFullYear() < CHART_MAX_YEAR) return true;
  if (d.getFullYear() > CHART_MAX_YEAR) return false;
  return d.getMonth() <= CHART_MAX_MONTH_INDEX;
}

export function capRowsAtChartMaxMonth<T>(rows: T[], getMonth: (row: T) => unknown): T[] {
  return rows.filter((row) => isOnOrBeforeChartMaxMonth(getMonth(row)));
}

export function sortRowsByMonthAsc<T>(rows: T[], getMonth: (row: T) => unknown): T[] {
  return rows.slice().sort((a, b) => {
    const da = parseMonthStart(getMonth(a));
    const db = parseMonthStart(getMonth(b));
    if (!da && !db) return 0;
    if (!da) return -1;
    if (!db) return 1;
    return da.getTime() - db.getTime();
  });
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function buildMonthWindowEndingAtCap(monthCount: number): Date[] {
  const n = Math.max(1, Math.floor(monthCount));
  return Array.from({ length: n }, (_, i) => {
    const offset = n - 1 - i;
    return new Date(CHART_MAX_MONTH_START.getFullYear(), CHART_MAX_MONTH_START.getMonth() - offset, 1);
  });
}
