import { useState, useEffect, useCallback, useMemo, useId, lazy, Suspense, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../lib/api';
import { buildMonthWindowEndingAtCap, capRowsAtChartMaxMonth, monthKey, parseMonthStart, sortRowsByMonthAsc } from '../lib/chartDateCap';
import { displayImpactHeadline } from '../lib/impactHeadline';
import { DONOR_NAV_ITEMS, donorNavItemToSlug, donorSlugToNavItem } from '../lib/portalTabs';

const CampaignBarChart = lazy(() => import('../components/charts/CampaignBarChart'));
const MonthlyLineChart = lazy(() => import('../components/charts/MonthlyLineChart'));

const c = {
  ivory: '#FBF8F2', forest: '#2A4A35', gold: '#D4A44C', rose: '#C4867A',
  roseLight: '#F0D8D4', sage: '#6B9E7E', sageLight: '#D4EAD9', goldLight: '#F5E6C8',
  text: '#2C2B28', muted: '#7A786F', white: '#FFFFFF',
};
const DASH_BANNER_BG = 'linear-gradient(135deg, #2A4A35 0%, #5E7C5A 58%, #9E8B67 100%)';
const navItems = [...DONOR_NAV_ITEMS];

const EXAMPLE_DONATION_DEFAULT_NOTES = 'Example Donation';
const RECURRING_FREQUENCY_OPTIONS = ['Weekly', 'Biweekly', 'Monthly', 'Quarterly', 'Annually'] as const;

const tok = () => localStorage.getItem('hh_token') ?? '';
const api = (url: string, opts?: RequestInit) =>
  fetch(apiUrl(url), { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}`, ...(opts?.headers ?? {}) } });

function filterRecordsByText(rows: Record<string, unknown>[], query: string): Record<string, unknown>[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) =>
    Object.values(row).some((v) => v != null && v !== '' && String(v).toLowerCase().includes(needle)),
  );
}

function DataSearchBar({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Search
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Type to filter rows…'}
        autoComplete="off"
        style={{
          width: '100%',
          maxWidth: 400,
          padding: '9px 14px',
          fontSize: 13,
          border: `1px solid ${c.goldLight}`,
          borderRadius: 8,
          color: c.text,
          background: c.white,
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

// ── Shared UI ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{ background: c.white, border: `1px solid ${accent ?? c.goldLight}`, borderRadius: 10, padding: '1rem 1.25rem', flex: '1 1 140px' }}>
      <p style={{ fontSize: 11, color: c.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color: c.forest, fontFamily: 'Georgia, serif', margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 style={{ fontSize: 15, fontWeight: 600, color: c.forest, marginBottom: 12, marginTop: 0, paddingBottom: 6, borderBottom: `1px solid ${c.goldLight}` }}>{children}</h2>;
}

function Loading() { return <p style={{ fontSize: 13, color: c.muted, textAlign: 'center', marginTop: '3rem' }}>Loading…</p>; }
function ApiError({ msg, retry }: { msg: string; retry: () => void }) {
  return (
    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
      <p style={{ fontSize: 13, color: c.rose }}>{msg}</p>
      <button onClick={retry} style={{ marginTop: 8, fontSize: 12, color: c.forest, background: 'none', border: `1px solid ${c.forest}`, borderRadius: 6, padding: '4px 14px', cursor: 'pointer' }}>Retry</button>
    </div>
  );
}

function ExampleDonateModal({
  open,
  onClose,
  onRecorded,
}: {
  open: boolean;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const titleId = useId();
  const [amount, setAmount] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [channelSource, setChannelSource] = useState('');
  const [notes, setNotes] = useState(EXAMPLE_DONATION_DEFAULT_NOTES);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<string>(RECURRING_FREQUENCY_OPTIONS[2]);
  const [donationDate, setDonationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [campaignOptions, setCampaignOptions] = useState<string[]>([]);
  const [channelOptions, setChannelOptions] = useState<string[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');

  useEffect(() => {
    if (!open) {
      setFormError('');
      setSubmitting(false);
      return;
    }
    setFormError('');
    setAmount('');
    setCampaignName('');
    setChannelSource('');
    setNotes(EXAMPLE_DONATION_DEFAULT_NOTES);
    setIsRecurring(false);
    setRecurringFrequency(RECURRING_FREQUENCY_OPTIONS[2]);
    setDonationDate(new Date().toISOString().slice(0, 10));
    setOptionsError('');
    let cancelled = false;
    (async () => {
      setOptionsLoading(true);
      try {
        const r = await api('/api/donations/form-options');
        const j = (await r.json()) as { campaigns?: string[]; channels?: string[] };
        if (cancelled) return;
        if (!r.ok) {
          setOptionsError('Could not load campaign and channel lists.');
          setCampaignOptions([]);
          setChannelOptions([]);
          return;
        }
        setCampaignOptions(Array.isArray(j.campaigns) ? j.campaigns : []);
        setChannelOptions(Array.isArray(j.channels) ? j.channels : []);
      } catch {
        if (!cancelled) setOptionsError('Could not load campaign and channel lists.');
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setFormError('Enter a valid amount greater than zero.');
      return;
    }
    const baseNotes = notes.trim();
    let finalNotes: string | null = baseNotes || null;
    if (isRecurring) {
      const freqLine = `Recurring frequency: ${recurringFrequency}`;
      finalNotes = baseNotes ? `${baseNotes}\n${freqLine}` : freqLine;
    }
    setSubmitting(true);
    try {
      const res = await api('/api/donations', {
        method: 'POST',
        body: JSON.stringify({
          donationType: 'Monetary',
          donationDate,
          amount: n,
          currencyCode: 'PHP',
          campaignName: campaignName.trim() || null,
          channelSource: channelSource.trim() || 'Donor portal (example form)',
          isRecurring,
          notes: finalNotes,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string; title?: string };
        setFormError(err.message ?? err.title ?? 'Could not save donation.');
        return;
      }
      onRecorded();
      onClose();
    } catch {
      setFormError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    fontSize: 14,
    border: `1px solid ${c.goldLight}`,
    borderRadius: 8,
    color: c.text,
    background: c.white,
    boxSizing: 'border-box' as const,
  };

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(42, 74, 53, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          background: c.white,
          borderRadius: 12,
          maxWidth: 440,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          border: `1px solid ${c.goldLight}`,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} style={{ padding: '1.35rem 1.5rem 1.5rem' }}>
          <p
            id={titleId}
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: c.forest,
              fontFamily: 'Georgia, serif',
              margin: '0 0 4px',
            }}
          >
            Example donate form
          </p>
          <p style={{ fontSize: 12, color: c.muted, margin: '0 0 1rem', lineHeight: 1.45 }}>
            Demonstration only — no payment is processed. Submitting records a sample monetary donation under your donor record (the app creates one automatically when needed).
          </p>

          {optionsLoading && (
            <p style={{ fontSize: 12, color: c.muted, marginBottom: 10 }}>Loading campaign and channel lists…</p>
          )}
          {optionsError && !optionsLoading && (
            <p style={{ fontSize: 12, color: c.rose, marginBottom: 10 }}>{optionsError} You can still submit; choose a campaign or channel if lists appear.</p>
          )}

          <label style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Amount (PHP) <span style={{ color: c.rose }}>*</span>
          </label>
          <input
            type="number"
            min={0.01}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ ...inputStyle, marginBottom: 14 }}
          />

          <label style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</label>
          <input
            type="date"
            value={donationDate}
            onChange={(e) => setDonationDate(e.target.value)}
            style={{ ...inputStyle, marginBottom: 14 }}
          />

          <label htmlFor="example-donate-campaign" style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Campaign (optional)</label>
          <select
            id="example-donate-campaign"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            disabled={optionsLoading}
            style={{ ...inputStyle, marginBottom: 14, cursor: optionsLoading ? 'wait' : 'pointer' }}
          >
            <option value="">— Select a campaign —</option>
            {campaignOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <label htmlFor="example-donate-channel" style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Channel (optional)</label>
          <select
            id="example-donate-channel"
            value={channelSource}
            onChange={(e) => setChannelSource(e.target.value)}
            disabled={optionsLoading}
            style={{ ...inputStyle, marginBottom: 14, cursor: optionsLoading ? 'wait' : 'pointer' }}
          >
            <option value="">— Select a channel —</option>
            {channelOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <label htmlFor="example-donate-notes" style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes (optional)</label>
          <textarea
            id="example-donate-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle, marginBottom: 12, resize: 'vertical' }}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: c.text, marginBottom: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
            Recurring donation
          </label>

          {isRecurring && (
            <>
              <label htmlFor="example-donate-frequency" style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recurring frequency</label>
              <select
                id="example-donate-frequency"
                value={recurringFrequency}
                onChange={(e) => setRecurringFrequency(e.target.value)}
                style={{ ...inputStyle, marginBottom: 14, cursor: 'pointer' }}
              >
                {RECURRING_FREQUENCY_OPTIONS.map((freq) => (
                  <option key={freq} value={freq}>{freq}</option>
                ))}
              </select>
            </>
          )}

          {formError && (
            <p style={{ fontSize: 13, color: c.rose, marginBottom: 12 }}>{formError}</p>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                fontSize: 13,
                padding: '10px 18px',
                borderRadius: 8,
                border: `1px solid ${c.forest}`,
                background: c.white,
                color: c.forest,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: c.gold,
                color: c.forest,
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              {submitting ? 'Saving…' : 'Record example donation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── My Impact ────────────────────────────────────────────────────────────────

function MyImpact({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [snapshots, setSnapshots] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [s, snaps] = await Promise.all([
        api('/api/donations/summary').then(r => r.json()),
        fetch(apiUrl('/api/publicimpactsnapshots')).then(r => r.json()),
      ]);
      setSummary(s);
      setSnapshots(Array.isArray(snaps) ? snaps.slice(0, 3) : []);
    } catch { setError('Failed to load impact data.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshSignal]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  const byType: Record<string, unknown>[] = Array.isArray((summary as any)?.byType) ? (summary as any).byType : [];

  return (
    <div>
      <SectionTitle>Your Giving Summary</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <StatCard label="Total Donations" value={(summary as any)?.totalDonationRows ?? '—'} accent={c.goldLight} />
        <StatCard label="Monetary Total" value={(summary as any)?.totalMonetaryAmount != null ? `₱${Number((summary as any).totalMonetaryAmount).toLocaleString()}` : '—'} accent={c.goldLight} />
        <StatCard label="Total Value (incl. in-kind)" value={(summary as any)?.totalEstimatedValue != null ? `₱${Number((summary as any).totalEstimatedValue).toLocaleString()}` : '—'} accent={c.sageLight} />
      </div>

      {byType.length > 0 && (
        <>
          <SectionTitle>Giving by Type</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
            {byType.map((t: any) => (
              <div key={t.donationType} style={{ background: c.white, border: `1px solid ${c.goldLight}`, borderRadius: 10, padding: '1rem 1.25rem', flex: '1 1 160px' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: c.forest, marginBottom: 6 }}>{t.donationType ?? 'Unknown'}</p>
                <p style={{ fontSize: 13, color: c.text }}>{t.count} donation{t.count !== 1 ? 's' : ''}</p>
                {t.totalAmount > 0 && <p style={{ fontSize: 12, color: c.muted }}>₱{Number(t.totalAmount).toLocaleString()}</p>}
                {t.totalEstimatedValue > 0 && <p style={{ fontSize: 12, color: c.muted }}>est. ₱{Number(t.totalEstimatedValue).toLocaleString()}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {snapshots.length > 0 && (
        <>
          <SectionTitle>Recent Impact Updates</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {snapshots.map((s: any) => (
              <div key={s.snapshotId} style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 10, padding: '1rem 1.25rem' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: c.forest }}>{displayImpactHeadline(s.headline as string | null)}</p>
                {s.summaryText && <p style={{ fontSize: 13, color: c.text, marginTop: 6, lineHeight: 1.5 }}>{s.summaryText}</p>}
                <p style={{ fontSize: 11, color: c.muted, marginTop: 8 }}>{s.snapshotDate ? new Date(s.snapshotDate).toLocaleDateString() : '—'}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Donation History ──────────────────────────────────────────────────────────

type RecurringSeriesRow = {
  recurringSeriesKey: string | null;
  legacyDonationId: number | null;
  startedAt: string | null;
  donationCount: number;
  totalAmount: number;
  currencyCode: string | null;
  campaignName: string | null;
  channelSource: string | null;
  frequency: string;
  cancelledAt: string | null;
};

function DonationHistory({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const [donations, setDonations] = useState<Record<string, unknown>[]>([]);
  const [recurringSeries, setRecurringSeries] = useState<RecurringSeriesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const searchId = useId();
  const [donationQuery, setDonationQuery] = useState('');
  const [cancellingKey, setCancellingKey] = useState<string | null>(null);

  const filteredDonations = useMemo(
    () => filterRecordsByText(donations, donationQuery),
    [donations, donationQuery],
  );

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError('');
    try {
      const [dRes, rRes] = await Promise.all([
        api('/api/donations'),
        api('/api/donations/recurring-series'),
      ]);
      const d = await dRes.json();
      const r = await rRes.json();
      if (dRes.ok) setDonations(Array.isArray(d) ? d : []);
      else setDonations([]);
      if (rRes.ok) setRecurringSeries(Array.isArray(r) ? (r as RecurringSeriesRow[]) : []);
      else setRecurringSeries([]);
      if (!dRes.ok) setError('Failed to load donation history.');
      else if (!rRes.ok) setError('Failed to load recurring schedules.');
      else setError('');
    } catch {
      setError('Failed to load donation history.');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  const cancelRecurring = useCallback(
    async (row: RecurringSeriesRow) => {
      const key = row.recurringSeriesKey ?? `legacy:${row.legacyDonationId ?? ''}`;
      setCancellingKey(key);
      setError('');
      try {
        const body = row.recurringSeriesKey
          ? { recurringSeriesKey: row.recurringSeriesKey }
          : { legacyDonationId: row.legacyDonationId };
        const res = await api('/api/donations/recurring/cancel', { method: 'POST', body: JSON.stringify(body) });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { message?: string };
          setError(err.message ?? 'Could not cancel recurring donation.');
          return;
        }
        await load({ silent: true });
      } catch {
        setError('Could not cancel recurring donation.');
      } finally {
        setCancellingKey(null);
      }
    },
    [load],
  );

  useEffect(() => { load(); }, [load, refreshSignal]);
  if (loading) return <Loading />;
  if (error && donations.length === 0 && recurringSeries.length === 0) return <ApiError msg={error} retry={load} />;

  return (
    <div>
      <SectionTitle>Your Donation History ({donations.length})</SectionTitle>
      {error && (donations.length > 0 || recurringSeries.length > 0) && (
        <p style={{ fontSize: 13, color: c.rose, marginBottom: 12 }}>{error}</p>
      )}

      {recurringSeries.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionTitle>Recurring donations</SectionTitle>
          <p style={{ fontSize: 13, color: c.muted, marginBottom: 12, lineHeight: 1.45 }}>
            Schedules created from your account (including the example form). Cancelling stops future recurring charges in this demo; past payments stay in your history.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recurringSeries.map((row) => {
              const rowKey = row.recurringSeriesKey ?? `legacy:${row.legacyDonationId ?? 0}`;
              const started = row.startedAt ? new Date(row.startedAt).toLocaleDateString() : '—';
              const cancelled = row.cancelledAt ? new Date(row.cancelledAt).toLocaleDateString() : null;
              const isCancelling = cancellingKey === rowKey;
              const isCancelled = Boolean(row.cancelledAt);
              return (
                <div
                  key={rowKey}
                  style={{
                    background: c.white,
                    border: `1px solid ${c.goldLight}`,
                    borderRadius: 10,
                    padding: '1rem 1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: c.forest, margin: '0 0 6px' }}>
                        {row.campaignName?.trim() ? row.campaignName : 'General / unspecified campaign'}
                      </p>
                      <p style={{ fontSize: 12, color: c.muted, margin: '0 0 4px' }}>
                        Started {started} · {row.frequency === '—' ? 'Frequency not recorded' : `${row.frequency}`}
                      </p>
                      <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>
                        {row.channelSource?.trim() ? `Channel: ${row.channelSource}` : 'Channel: —'}
                      </p>
                    </div>
                    {isCancelled ? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: c.muted, background: c.ivory, padding: '6px 12px', borderRadius: 20 }}>
                        Cancelled{cancelled ? ` · ${cancelled}` : ''}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isCancelling}
                        onClick={() => void cancelRecurring(row)}
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '8px 16px',
                          borderRadius: 8,
                          border: `1px solid ${c.rose}`,
                          background: c.white,
                          color: c.rose,
                          cursor: isCancelling ? 'wait' : 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isCancelling ? 'Cancelling…' : 'Cancel recurring'}
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: c.text, marginTop: 12, marginBottom: 0 }}>
                    <strong style={{ color: c.forest }}>{row.donationCount}</strong> donation{row.donationCount !== 1 ? 's' : ''} recorded
                    {' · '}
                    Total:{' '}
                    <strong style={{ color: c.forest }}>
                      ₱{Number(row.totalAmount).toLocaleString()}
                    </strong>
                    {row.currencyCode && row.currencyCode !== 'PHP' ? ` ${row.currencyCode}` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {donations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', background: c.white, borderRadius: 10, border: `1px solid ${c.goldLight}` }}>
          <p style={{ fontSize: 15, color: c.forest, fontFamily: 'Georgia, serif', marginBottom: 8 }}>No donations recorded yet.</p>
          <p style={{ fontSize: 13, color: c.muted }}>Your giving history will appear here once your first donation is processed.</p>
        </div>
      ) : (
        <>
          <DataSearchBar
            id={searchId}
            value={donationQuery}
            onChange={setDonationQuery}
            placeholder="Search donation history…"
          />
          {filteredDonations.length === 0 && donationQuery.trim() !== '' ? (
            <p style={{ fontSize: 13, color: c.muted }}>No rows match your search.</p>
          ) : (
        <div style={{ overflowX: 'auto' }}>
          <p style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>
            {filteredDonations.length === donations.length
              ? `${filteredDonations.length} donation${filteredDonations.length !== 1 ? 's' : ''}`
              : `${filteredDonations.length} of ${donations.length} donations shown`}
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: c.goldLight }}>
                {['Date', 'Type', 'Campaign', 'Amount', 'Currency', 'Channel', 'Recurring'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDonations.map((d: any, i) => (
                <tr key={d.donationId} style={{ borderBottom: `1px solid ${c.goldLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                  <td style={{ padding: '8px 12px', color: c.text }}>{d.donationDate ? new Date(d.donationDate).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '8px 12px', color: c.text }}>{d.donationType ?? '—'}</td>
                  <td style={{ padding: '8px 12px', color: c.muted }}>{d.campaignName ?? '—'}</td>
                  <td style={{ padding: '8px 12px', color: c.forest, fontWeight: 600 }}>
                    {d.amount != null ? `₱${Number(d.amount).toLocaleString()}` : d.estimatedValue != null ? `₱${Number(d.estimatedValue).toLocaleString()} est.` : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: c.muted }}>{d.currencyCode ?? '—'}</td>
                  <td style={{ padding: '8px 12px', color: c.muted }}>{d.channelSource ?? '—'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    {d.isRecurring ? <span style={{ background: c.sageLight, color: c.forest, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>Yes</span> : <span style={{ color: c.muted, fontSize: 12 }}>No</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Active Campaigns ─────────────────────────────────────────────────────────

function ActiveCampaigns() {
  const [snapshots, setSnapshots] = useState<Record<string, unknown>[]>([]);
  const [campaigns, setCampaigns] = useState<Record<string, unknown>[]>([]);
  const [monthly, setMonthly] = useState<Record<string, unknown>[]>([]);
  const [campaignTake, setCampaignTake] = useState(10);
  const [monthlyTake, setMonthlyTake] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [snaps, camps, mon] = await Promise.all([
        fetch(apiUrl('/api/publicimpactsnapshots')).then(r => r.json()),
        api(`/api/insights/donations/by-campaign?take=${campaignTake}`).then(r => r.json()),
        api(`/api/insights/donations/monthly?take=${monthlyTake}`).then(r => r.json()),
      ]);
      setSnapshots(Array.isArray(snaps) ? snaps : []);
      setCampaigns(Array.isArray(camps) ? camps : []);
      setMonthly(Array.isArray(mon) ? mon : []);
    }
    catch { setError('Failed to load campaigns.'); }
    finally { setLoading(false); }
  }, [campaignTake, monthlyTake]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  const campaignChartData = (campaigns as any[]).map((r) => ({
    name: String(r.campaignName ?? '—'),
    total: Number(r.totalValuePhp ?? 0),
  }));
  const monthlyCapped = sortRowsByMonthAsc(
    capRowsAtChartMaxMonth(monthly as any[], (r) => r.month),
    (r) => r.month,
  );
  const monthlyByKey = new Map(
    monthlyCapped
      .map((r) => {
        const d = parseMonthStart(r.month);
        if (!d) return null;
        return [monthKey(d), r] as const;
      })
      .filter((x): x is readonly [string, any] => x != null),
  );
  const monthlyWindow = buildMonthWindowEndingAtCap(12);
  const monthlyChartData = monthlyWindow.map((d) => {
    const r = monthlyByKey.get(monthKey(d));
    return {
      month: d.toLocaleDateString('en-US', { year: '2-digit', month: 'short' }),
      total: Number(r?.totalValuePhp ?? 0),
      donations: Number(r?.donationCount ?? 0),
    };
  });
  const monthlyRowsForTable = monthlyWindow.map((d) => {
    const r = monthlyByKey.get(monthKey(d));
    return {
      month: d.toISOString(),
      donationCount: Number(r?.donationCount ?? 0),
      totalValuePhp: Number(r?.totalValuePhp ?? 0),
    };
  });

  return (
    <div>
      <SectionTitle>Campaign effectiveness (live)</SectionTitle>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: c.muted }}>
          Top campaigns:
          <select value={campaignTake} onChange={(e) => setCampaignTake(Number(e.target.value))}
            style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 6, border: `1px solid ${c.goldLight}`, background: c.white }}>
            {[5, 10, 15, 25].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, color: c.muted }}>
          Months:
          <select value={monthlyTake} onChange={(e) => setMonthlyTake(Number(e.target.value))}
            style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 6, border: `1px solid ${c.goldLight}`, background: c.white }}>
            {[6, 12, 18, 24, 36].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <p style={{ fontSize: 12, color: c.muted, marginTop: -4, marginBottom: 14 }}>
        Top campaigns by total donation value (amount, falling back to estimated value). Gifts without a campaign name are omitted here but still included in monthly totals below. Source:{' '}
        <code>/api/insights/donations/by-campaign</code>
      </p>

      {campaignChartData.length > 0 && (
        <div style={{ background: c.white, border: `1px solid ${c.goldLight}`, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: c.forest, margin: 0, marginBottom: 8 }}>Top campaigns (total PHP)</p>
          <Suspense fallback={<p style={{ fontSize: 12, color: c.muted }}>Loading chart…</p>}>
            <CampaignBarChart data={campaignChartData} barColor={c.gold} />
          </Suspense>
        </div>
      )}
      {campaigns.length === 0 ? (
        <p style={{ fontSize: 13, color: c.muted }}>No campaign data yet.</p>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: c.goldLight }}>
                {['Campaign', 'Donations', 'Total (PHP)', 'Avg (PHP)'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(campaigns as any[]).map((row, i) => (
                <tr key={`${row.campaignName}-${i}`} style={{ borderBottom: `1px solid ${c.goldLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                  <td style={{ padding: '8px 12px', color: c.text }}>{row.campaignName ?? '—'}</td>
                  <td style={{ padding: '8px 12px', color: c.muted }}>{row.donationCount ?? '—'}</td>
                  <td style={{ padding: '8px 12px', color: c.forest, fontWeight: 700 }}>
                    {row.totalValuePhp != null ? `₱${Number(row.totalValuePhp).toLocaleString()}` : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: c.muted }}>
                    {row.avgValuePhp != null ? `₱${Number(row.avgValuePhp).toFixed(0)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SectionTitle>Monthly giving trend (last 12 months)</SectionTitle>
      <p style={{ fontSize: 12, color: c.muted, marginTop: -4, marginBottom: 14 }}>
        Source: <code>/api/insights/donations/monthly</code>
      </p>

      {monthlyChartData.length > 0 && (
        <div style={{ background: c.white, border: `1px solid ${c.goldLight}`, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: c.forest, margin: 0, marginBottom: 8 }}>Monthly totals (PHP)</p>
          <Suspense fallback={<p style={{ fontSize: 12, color: c.muted }}>Loading chart…</p>}>
            <MonthlyLineChart data={monthlyChartData} lineColor={c.forest} />
          </Suspense>
        </div>
      )}
      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: c.goldLight }}>
              {['Month', 'Donations', 'Total (PHP)'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthlyRowsForTable.map((row, i) => (
              <tr key={`${row.month}-${i}`} style={{ borderBottom: `1px solid ${c.goldLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                <td style={{ padding: '8px 12px' }}>{row.month ? new Date(row.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '—'}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.donationCount ?? '—'}</td>
                <td style={{ padding: '8px 12px', fontWeight: 700 }}>{row.totalValuePhp != null ? `₱${Number(row.totalValuePhp).toLocaleString()}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionTitle>Impact snapshots</SectionTitle>
      {snapshots.length === 0 ? (
        <p style={{ fontSize: 13, color: c.muted }}>No published snapshots yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {snapshots.map((s: any) => (
            <div key={s.snapshotId} style={{
              background: c.white,
              borderTop: `1px solid ${c.sageLight}`,
              borderRight: `1px solid ${c.sageLight}`,
              borderBottom: `1px solid ${c.sageLight}`,
              borderLeft: `4px solid ${c.gold}`,
              borderRadius: 12,
              padding: '1.25rem 1.5rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: c.forest, margin: 0, fontFamily: 'Georgia, serif' }}>{displayImpactHeadline(s.headline as string | null)}</h3>
                <span style={{ fontSize: 11, color: c.muted }}>{s.snapshotDate ? new Date(s.snapshotDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : '—'}</span>
              </div>
              {s.summaryText && <p style={{ fontSize: 13, color: c.text, marginTop: 10, lineHeight: 1.6 }}>{s.summaryText}</p>}
              {s.publishedAt && <p style={{ fontSize: 11, color: c.muted, marginTop: 8 }}>Published {new Date(s.publishedAt).toLocaleDateString()}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── My Profile ────────────────────────────────────────────────────────────────

function MyProfile() {
  const { user } = useAuth();
  const [supporter, setSupporter] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // Fetch this donor's supporter record
      const data = await api('/api/supporters').then(r => r.json());
      // The API scopes to the logged-in user's supporterId; first result is theirs
      const arr = Array.isArray(data) ? data : [];
      setSupporter(arr.find((s: any) => s.supporterId === user?.supporterId) ?? arr[0] ?? null);
    } catch { setError('Failed to load profile.'); }
    finally { setLoading(false); }
  }, [user?.supporterId]);

  useEffect(() => { load(); }, [load]);

  const field = (label: string, value: unknown) => (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 11, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 14, color: c.text }}>{value != null && value !== '' ? String(value) : <span style={{ color: c.muted, fontStyle: 'italic' }}>Not provided</span>}</p>
    </div>
  );

  return (
    <div>
      <SectionTitle>My Account</SectionTitle>
      <div style={{ background: c.white, border: `1px solid ${c.goldLight}`, borderRadius: 12, padding: '1.5rem', marginBottom: 24, maxWidth: 480 }}>
        {field('Username', user?.userName)}
        {field('Email', user?.email)}
        {field('Roles', user?.roles?.join(', '))}
      </div>

      {loading ? <Loading /> : error ? <ApiError msg={error} retry={load} /> : supporter && (
        <>
          <SectionTitle>Supporter Profile</SectionTitle>
          <div style={{ background: c.white, border: `1px solid ${c.goldLight}`, borderRadius: 12, padding: '1.5rem', maxWidth: 480 }}>
            {field('Display Name', supporter.displayName)}
            {field('Type', supporter.supporterType)}
            {supporter.organizationName != null && String(supporter.organizationName).trim() !== ''
              ? field('Organization', supporter.organizationName)
              : null}
            {field('First Name', supporter.firstName)}
            {field('Last Name', supporter.lastName)}
            {field('Country', supporter.country)}
            {field('Region', supporter.region)}
            {field('Status', supporter.status)}
            {field('First Donation', supporter.firstDonationDate ? new Date(String(supporter.firstDonationDate)).toLocaleDateString() : null)}
            {field('Acquisition Channel', supporter.acquisitionChannel)}
          </div>
        </>
      )}
    </div>
  );
}

// ── Portal ────────────────────────────────────────────────────────────────────

export default function DonorPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [donateModalOpen, setDonateModalOpen] = useState(false);
  const [donationRefreshSignal, setDonationRefreshSignal] = useState(0);
  const tabSlug = searchParams.get('tab');
  const activeNav = useMemo(() => {
    const n = donorSlugToNavItem(tabSlug);
    return (navItems as readonly string[]).includes(n) ? n : 'My Impact';
  }, [tabSlug]);

  useEffect(() => {
    const desired = donorNavItemToSlug(activeNav);
    if (searchParams.get('tab') !== desired) {
      setSearchParams({ tab: desired }, { replace: true });
    }
  }, [activeNav, searchParams, setSearchParams]);

  const setTab = (item: string) => setSearchParams({ tab: donorNavItemToSlug(item) }, { replace: true });
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderContent = () => {
    switch (activeNav) {
      case 'My Impact':        return <MyImpact refreshSignal={donationRefreshSignal} />;
      case 'Donation History': return <DonationHistory refreshSignal={donationRefreshSignal} />;
      case 'Active Campaigns': return <ActiveCampaigns />;
      case 'My Profile':       return <MyProfile />;
      default: return null;
    }
  };

  return (
    <main id="main-content" style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
      <Sidebar id="donor-sidebar" items={navItems} active={activeNav} setActive={setTab}
        user={`${user?.userName ?? 'Donor'} · Donor`} onLogout={handleLogout} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
        <section aria-label="Welcome"
          style={{ background: DASH_BANNER_BG, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: 12, color: 'rgba(251,248,242,0.72)', marginBottom: 3 }}>Donor Dashboard</p>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: c.ivory, fontWeight: 400, margin: 0 }}>Welcome, {user?.userName ?? 'Donor'}</h1>
            </div>
            <button
              type="button"
              onClick={() => setDonateModalOpen(true)}
              style={{ background: c.gold, color: c.forest, fontSize: 13, fontWeight: 600, padding: '10px 22px', borderRadius: 24, border: 'none', cursor: 'pointer' }}>
              Donate Again
            </button>
          </div>
        </section>
        {renderContent()}
        <ExampleDonateModal
          open={donateModalOpen}
          onClose={() => setDonateModalOpen(false)}
          onRecorded={() => setDonationRefreshSignal((s) => s + 1)}
        />
      </div>
    </main>
  );
}
