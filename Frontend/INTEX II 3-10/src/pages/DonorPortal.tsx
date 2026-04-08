import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const CampaignBarChart = lazy(() => import('../components/charts/CampaignBarChart'));
const MonthlyLineChart = lazy(() => import('../components/charts/MonthlyLineChart'));

const c = {
  ivory: '#FBF8F2', forest: '#2A4A35', gold: '#D4A44C', rose: '#C4867A',
  roseLight: '#F0D8D4', sage: '#6B9E7E', sageLight: '#D4EAD9', goldLight: '#F5E6C8',
  text: '#2C2B28', muted: '#7A786F', white: '#FFFFFF',
};
const DASH_BANNER_BG = `linear-gradient(120deg,rgba(42,74,53,0.74) 0%,rgba(196,134,122,0.44) 100%), url("/Smiles under the sun.png") center/cover no-repeat`;
const navItems = ['My Impact', 'Donation History', 'Active Campaigns', 'My Profile'];

const tok = () => localStorage.getItem('hh_token') ?? '';
const api = (url: string, opts?: RequestInit) =>
  fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}`, ...(opts?.headers ?? {}) } });

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

function SectionTitle({ children }: { children: React.ReactNode }) {
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

// ── My Impact ────────────────────────────────────────────────────────────────

function MyImpact() {
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [snapshots, setSnapshots] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [s, snaps] = await Promise.all([
        api('/api/donations/summary').then(r => r.json()),
        fetch('/api/publicimpactsnapshots').then(r => r.json()),
      ]);
      setSummary(s);
      setSnapshots(Array.isArray(snaps) ? snaps.slice(0, 3) : []);
    } catch { setError('Failed to load impact data.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
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
                <p style={{ fontSize: 13, fontWeight: 600, color: c.forest }}>{s.headline ?? 'Impact Update'}</p>
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

function DonationHistory() {
  const [donations, setDonations] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const d = await api('/api/donations').then(r => r.json()); setDonations(Array.isArray(d) ? d : []); }
    catch { setError('Failed to load donation history.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  return (
    <div>
      <SectionTitle>Donation History ({donations.length})</SectionTitle>
      {donations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', background: c.white, borderRadius: 10, border: `1px solid ${c.goldLight}` }}>
          <p style={{ fontSize: 15, color: c.forest, fontFamily: 'Georgia, serif', marginBottom: 8 }}>No donations recorded yet.</p>
          <p style={{ fontSize: 13, color: c.muted }}>Your giving history will appear here once your first donation is processed.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: c.goldLight }}>
                {['Date', 'Type', 'Campaign', 'Amount', 'Currency', 'Channel', 'Recurring'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {donations.map((d: any, i) => (
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
        fetch('/api/publicimpactsnapshots').then(r => r.json()),
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
    name: String(r.campaignName ?? '(none)'),
    total: Number(r.totalValuePhp ?? 0),
  }));
  const monthlyChartData = (monthly as any[]).map((r) => ({
    month: r.month ? new Date(String(r.month)).toLocaleDateString('en-US', { year: '2-digit', month: 'short' }) : '—',
    total: Number(r.totalValuePhp ?? 0),
    donations: Number(r.donationCount ?? 0),
  }));

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
        Top campaigns by total donation value (amount, falling back to estimated value). Source: <code>/api/insights/donations/by-campaign</code>
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
            {(monthly as any[]).slice(-12).map((row, i) => (
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
                <h3 style={{ fontSize: 15, fontWeight: 600, color: c.forest, margin: 0, fontFamily: 'Georgia, serif' }}>{s.headline ?? 'Impact Update'}</h3>
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
  const [activeNav, setActiveNav] = useState('My Impact');
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderContent = () => {
    switch (activeNav) {
      case 'My Impact':        return <MyImpact />;
      case 'Donation History': return <DonationHistory />;
      case 'Active Campaigns': return <ActiveCampaigns />;
      case 'My Profile':       return <MyProfile />;
      default: return null;
    }
  };

  return (
    <main id="main-content" style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
      <Sidebar id="donor-sidebar" items={navItems} active={activeNav} setActive={setActiveNav}
        user={`${user?.userName ?? 'Donor'} · Donor`} onLogout={handleLogout} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
        <section aria-label="Welcome"
          style={{ background: DASH_BANNER_BG, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: 12, color: 'rgba(251,248,242,0.65)', marginBottom: 3 }}>Welcome back</p>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: c.ivory, fontWeight: 400, margin: 0 }}>{user?.userName ?? 'Donor'}</h1>
            </div>
            <button
              onClick={() => setActiveNav('Active Campaigns')}
              style={{ background: c.gold, color: c.forest, fontSize: 13, fontWeight: 600, padding: '10px 22px', borderRadius: 24, border: 'none', cursor: 'pointer' }}>
              Donate Again
            </button>
          </div>
        </section>
        {renderContent()}
      </div>
    </main>
  );
}
