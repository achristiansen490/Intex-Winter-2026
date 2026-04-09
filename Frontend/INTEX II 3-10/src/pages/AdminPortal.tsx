import { useState, useEffect, useCallback, useMemo, useId, lazy, Suspense, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const CampaignBarChart = lazy(() => import('../components/charts/CampaignBarChart'));
const BridgeLineChart = lazy(() => import('../components/charts/BridgeLineChart'));

const c = {
  ivory: '#FBF8F2', forest: '#2A4A35', gold: '#D4A44C', rose: '#C4867A',
  roseLight: '#F0D8D4', sage: '#6B9E7E', sageLight: '#D4EAD9', goldLight: '#F5E6C8',
  text: '#2C2B28', muted: '#7A786F', white: '#FFFFFF',
};
const ADMIN_BANNER_BG = `linear-gradient(120deg,rgba(42,74,53,0.82) 0%,rgba(196,134,122,0.38) 100%), url("/Smiles under the sun.png") center/cover no-repeat`;
const navItems = [
  'Dashboard',
  'Users',
  'Pending User Approvals',
  'Pending Approvals',
  'Residents',
  'Health Records',
  'Education Records',
  'Process Recordings',
  'Home Visitations',
  'Incident Reports',
  'Intervention Plans',
  'Staff',
  'Safehouses',
  'Donations',
  'Organizations',
  'Audit Log',
  'Reports',
  'Settings',
];

const tok = () => localStorage.getItem('hh_token') ?? '';
const api = (url: string, opts?: RequestInit) =>
  fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}`, ...(opts?.headers ?? {}) } });

/** Client-side filter: any column value contains query (case-insensitive). */
function filterTableRows(
  rows: Record<string, unknown>[],
  columns: { key: string }[],
  query: string,
): Record<string, unknown>[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) =>
    columns.some((col) => {
      const v = row[col.key];
      if (v == null || v === '') return false;
      return String(v).toLowerCase().includes(needle);
    }),
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
          border: `1px solid ${c.sageLight}`,
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
    <div style={{ background: c.white, border: `1px solid ${accent ?? c.sageLight}`, borderRadius: 10, padding: '1rem 1.25rem', minWidth: 140, flex: '1 1 140px' }}>
      <p style={{ fontSize: 11, color: c.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color: c.forest, fontFamily: 'Georgia, serif', margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 style={{ fontSize: 15, fontWeight: 600, color: c.forest, marginBottom: 12, marginTop: 24, paddingBottom: 6, borderBottom: `1px solid ${c.sageLight}` }}>{children}</h2>;
}

function Loading() {
  return <p style={{ fontSize: 13, color: c.muted, textAlign: 'center', marginTop: '3rem' }}>Loading…</p>;
}
function ApiError({ msg, retry }: { msg: string; retry: () => void }) {
  return (
    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
      <p style={{ fontSize: 13, color: c.rose }}>{msg}</p>
      <button onClick={retry} style={{ marginTop: 8, fontSize: 12, color: c.forest, background: 'none', border: `1px solid ${c.forest}`, borderRadius: 6, padding: '4px 14px', cursor: 'pointer' }}>Retry</button>
    </div>
  );
}

function Table({
  columns,
  rows,
  keyField,
  totalCount,
}: {
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  keyField: string;
  /** When filtering, pass full dataset length for “N of M” label */
  totalCount?: number;
}) {
  if (rows.length === 0) {
    const emptyMsg =
      totalCount != null && totalCount > 0 ? 'No rows match your search.' : 'No records found.';
    return <p style={{ fontSize: 13, color: c.muted }}>{emptyMsg}</p>;
  }
  const countLabel =
    totalCount != null && totalCount !== rows.length
      ? `${rows.length} of ${totalCount} record${totalCount !== 1 ? 's' : ''} shown`
      : `${rows.length} record${rows.length !== 1 ? 's' : ''}`;
  return (
    <div style={{ overflowX: 'auto' }}>
      <p style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>{countLabel}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: c.sageLight }}>
            {columns.map(col => <th key={col.key} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>{col.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={String(row[keyField])} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
              {columns.map(col => (
                <td key={col.key} style={{ padding: '8px 12px', color: c.text, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {String(row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────

function AdminDashboard() {
  const [kpis, setKpis] = useState<Record<string, unknown> | null>(null);
  const [proof, setProof] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [k, p] = await Promise.all([
        api('/api/dashboard/kpis').then(r => r.json()),
        api('/api/dashboard/admin-proof').then(r => r.json()),
      ]);
      setKpis(k); setProof(p);
    } catch { setError('Failed to load dashboard.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  const check = (proof as any)?.check ?? {};
  const ops = (kpis as any)?.operations ?? {};
  const donor = (kpis as any)?.donor ?? {};

  return (
    <div>
      <SectionTitle>System Counts</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Residents" value={check.residents ?? '—'} />
        <StatCard label="Supporters" value={check.supporters ?? '—'} accent={c.goldLight} />
        <StatCard label="Safehouses" value={check.safehouses ?? '—'} />
        <StatCard label="Donations" value={check.donations ?? '—'} accent={c.goldLight} />
        <StatCard label="Social Posts" value={check.socialPosts ?? '—'} accent={c.roseLight} />
      </div>

      <SectionTitle>Operations</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Active Residents" value={ops.activeResidents ?? '—'} accent={c.sageLight} />
        <StatCard label="High Risk" value={ops.highRiskResidents ?? '—'} accent={c.roseLight} />
        <StatCard label="Reintegration Ready" value={ops.reintegrationReadyResidents ?? '—'} accent={c.goldLight} />
        <StatCard label="Process Sessions" value={ops.processSessions ?? '—'}
          sub={ops.processSessions ? `${((ops.sessionsWithProgress / ops.processSessions) * 100).toFixed(0)}% with progress` : undefined} />
        <StatCard label="Home Visits" value={ops.homeVisits ?? '—'}
          sub={ops.homeVisits ? `${((ops.visitsWithSafetyConcern / ops.homeVisits) * 100).toFixed(0)}% safety concerns` : undefined} accent={c.roseLight} />
      </div>

      <SectionTitle>Donor KPIs</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Total Supporters" value={donor.totalSupporters ?? '—'} />
        <StatCard label="Active Supporters" value={donor.activeSupporters ?? '—'} accent={c.sageLight} />
        <StatCard label="Unique Donors" value={donor.uniqueDonors ?? '—'} />
        <StatCard label="Repeat Donor Rate" value={donor.repeatDonorRate != null ? `${(donor.repeatDonorRate * 100).toFixed(1)}%` : '—'} accent={c.goldLight} />
        <StatCard label="Total Monetary" value={donor.totalMonetaryAmount != null ? `₱${Number(donor.totalMonetaryAmount).toLocaleString()}` : '—'} accent={c.goldLight} />
        <StatCard label="Avg Donation" value={donor.avgMonetaryDonation != null ? `₱${Number(donor.avgMonetaryDonation).toFixed(0)}` : '—'} />
      </div>
    </div>
  );
}

// ── Users (pending accounts) ─────────────────────────────────────────────────

function AdminUsers() {
  const [pending, setPending] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api('/api/auth/pending').then(r => r.json());
      setPending(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load pending users.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const approve = async (userId: number, name: string) => {
    setBusy(userId);
    try {
      const r = await api(`/api/auth/approve/${userId}`, { method: 'POST' });
      if (r.ok) { notify(`✓ Approved ${name}`); await load(); }
      else notify('Approval failed.');
    } finally { setBusy(null); }
  };

  const reject = async (userId: number, name: string) => {
    if (!window.confirm(`Reject account for "${name}"? This will deactivate the account.`)) return;
    setBusy(userId);
    try {
      const r = await api(`/api/auth/reject/${userId}`, { method: 'POST' });
      if (r.ok) { notify(`Rejected ${name}`); await load(); }
      else notify('Rejection failed.');
    } finally { setBusy(null); }
  };

  const searchId = useId();
  const [userQuery, setUserQuery] = useState('');
  const filteredPending = useMemo(() => {
    const needle = userQuery.trim().toLowerCase();
    if (!needle) return pending;
    return pending.filter((u) => {
      const parts = [
        String(u.id ?? ''),
        String(u.userName ?? ''),
        String(u.email ?? ''),
        Array.isArray(u.roles) ? u.roles.join(' ') : String(u.roles ?? ''),
      ];
      return parts.some((p) => p.toLowerCase().includes(needle));
    });
  }, [pending, userQuery]);

  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  return (
    <div>
      {toast && (
        <div style={{ background: c.sageLight, color: c.forest, borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>{toast}</div>
      )}
      <SectionTitle>Pending Account Approvals ({pending.length})</SectionTitle>
      {pending.length === 0 ? (
        <p style={{ fontSize: 13, color: c.muted }}>No accounts awaiting approval.</p>
      ) : (
        <>
          <DataSearchBar id={searchId} value={userQuery} onChange={setUserQuery} placeholder="Filter by ID, username, email, or role…" />
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: c.sageLight }}>
                {['ID', 'Username', 'Email', 'Roles', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPending.map((u, i) => (
                <tr key={String(u.id)} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                  <td style={{ padding: '8px 12px', color: c.muted, fontSize: 12 }}>{String(u.id)}</td>
                  <td style={{ padding: '8px 12px', color: c.text, fontWeight: 600 }}>{String(u.userName ?? '—')}</td>
                  <td style={{ padding: '8px 12px', color: c.text }}>{String(u.email ?? '—')}</td>
                  <td style={{ padding: '8px 12px', color: c.muted }}>{Array.isArray(u.roles) ? u.roles.join(', ') : '—'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        disabled={busy === (u.id as number)}
                        onClick={() => approve(u.id as number, String(u.userName))}
                        aria-label={`Approve account ${String(u.userName ?? u.id)}`}
                        style={{ background: c.sageLight, color: c.forest, border: `1px solid ${c.sage}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, opacity: busy === u.id ? 0.6 : 1 }}
                      >
                        Approve
                      </button>
                      <button
                        disabled={busy === (u.id as number)}
                        onClick={() => reject(u.id as number, String(u.userName))}
                        aria-label={`Reject account ${String(u.userName ?? u.id)}`}
                        style={{ background: c.roseLight, color: c.rose, border: `1px solid ${c.rose}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, opacity: busy === u.id ? 0.6 : 1 }}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPending.length === 0 && userQuery.trim() !== '' && (
            <p style={{ fontSize: 13, color: c.muted, marginTop: 8 }}>No rows match your search.</p>
          )}
        </div>
        </>
      )}
    </div>
  );
}

// ── Pending Approvals (sensitive field changes) ───────────────────────────────

function AdminPendingApprovals() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const approvalSearchId = useId();
  const [approvalQuery, setApprovalQuery] = useState('');

  const filteredApprovalItems = useMemo(() => {
    const needle = approvalQuery.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => {
      const parts = [
        item.resource,
        item.recordId,
        item.action,
        item.notes,
        item.userId,
        item.timestamp,
        item.oldValue,
        item.newValue,
        item.auditId,
      ].map((v) => (v != null ? String(v) : ''));
      return parts.some((p) => p.toLowerCase().includes(needle));
    });
  }, [items, approvalQuery]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api('/api/auditlogs/pending').then(r => r.json());
      setItems(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load pending approvals.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const act = async (id: number, type: 'approve' | 'reject') => {
    if (type === 'reject' && !window.confirm('Reject this change request? The change will not be applied.')) return;
    setBusy(id);
    try {
      const r = await api(`/api/auditlogs/${id}/${type}`, { method: 'POST' });
      if (r.ok) { notify(type === 'approve' ? '✓ Change approved and applied.' : 'Change rejected.'); await load(); }
      else notify(`${type} failed.`);
    } finally { setBusy(null); }
  };

  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  return (
    <div>
      {toast && (
        <div style={{ background: c.sageLight, color: c.forest, borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>{toast}</div>
      )}
      <SectionTitle>Pending Change Approvals ({items.length})</SectionTitle>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: c.muted }}>No changes awaiting approval.</p>
      ) : (
        <>
          <DataSearchBar
            id={approvalSearchId}
            value={approvalQuery}
            onChange={setApprovalQuery}
            placeholder="Search by resource, record, action, user, or values…"
          />
          {filteredApprovalItems.length === 0 && approvalQuery.trim() !== '' ? (
            <p style={{ fontSize: 13, color: c.muted }}>No items match your search.</p>
          ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredApprovalItems.map(item => (
            <div key={String(item.auditId)} style={{ background: c.white, border: `1px solid ${c.goldLight}`, borderRadius: 10, padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: c.text }}>
                    {String(item.resource ?? '—')} #{String(item.recordId ?? '—')} — {String(item.action ?? '—')}
                  </p>
                  {item.notes != null && String(item.notes).trim() !== '' && (
                    <p style={{ fontSize: 12, color: c.muted, marginTop: 3 }}>{String(item.notes)}</p>
                  )}
                  <p style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>
                    {item.timestamp ? new Date(String(item.timestamp)).toLocaleString() : '—'}
                    {' · '}User #{String(item.userId)}
                  </p>
                  {(item.oldValue != null && String(item.oldValue).trim() !== '') ||
                  (item.newValue != null && String(item.newValue).trim() !== '') ? (
                    <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {item.oldValue != null && String(item.oldValue).trim() !== '' && (
                        <span style={{ background: c.roseLight, color: c.rose, borderRadius: 6, padding: '3px 10px', fontSize: 11 }}>Before: {String(item.oldValue)}</span>
                      )}
                      {item.newValue != null && String(item.newValue).trim() !== '' && (
                        <span style={{ background: c.sageLight, color: '#1B5E20', borderRadius: 6, padding: '3px 10px', fontSize: 11 }}>After: {String(item.newValue)}</span>
                      )}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    disabled={busy === (item.auditId as number)}
                    onClick={() => act(item.auditId as number, 'approve')}
                    aria-label={`Approve change request ${String(item.auditId)}`}
                    style={{ background: c.sageLight, color: c.forest, border: `1px solid ${c.sage}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, opacity: busy === item.auditId ? 0.6 : 1 }}
                  >
                    Approve
                  </button>
                  <button
                    disabled={busy === (item.auditId as number)}
                    onClick={() => act(item.auditId as number, 'reject')}
                    aria-label={`Reject change request ${String(item.auditId)}`}
                    style={{ background: c.roseLight, color: c.rose, border: `1px solid ${c.rose}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, opacity: busy === item.auditId ? 0.6 : 1 }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Residents (admin CRUD-style prototype) ───────────────────────────────────

function AdminResidentsPanel() {
  const searchId = useId();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [safehouseFilter, setSafehouseFilter] = useState('All');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [toast, setToast] = useState('');
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null);
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [createRow, setCreateRow] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Record<string, unknown> | null>(null);
  const [deactivateText, setDeactivateText] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const columns = useMemo(() => [
    { key: 'residentId', label: 'ID' }, { key: 'caseControlNo', label: 'Case No.' },
    { key: 'safehouseId', label: 'Safehouse' }, { key: 'caseStatus', label: 'Status' },
    { key: 'sex', label: 'Sex' }, { key: 'dateOfAdmission', label: 'Admitted' },
    { key: 'currentRiskLevel', label: 'Risk' }, { key: 'reintegrationStatus', label: 'Reintegration' },
    { key: 'assignedSocialWorker', label: 'Social Worker' },
  ], []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api('/api/residents').then((r) => r.json());
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load residents.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusOptions = useMemo(() => ['All', ...Array.from(new Set(rows.map((r) => String(r.caseStatus ?? '').trim()).filter(Boolean))).sort()], [rows]);
  const riskOptions = useMemo(() => ['All', ...Array.from(new Set(rows.map((r) => String(r.currentRiskLevel ?? '').trim()).filter(Boolean))).sort()], [rows]);
  const safehouseOptions = useMemo(() => ['All', ...Array.from(new Set(rows.map((r) => String(r.safehouseId ?? '').trim()).filter(Boolean))).sort((a, b) => Number(a) - Number(b))], [rows]);

  const searchedRows = useMemo(
    () => filterTableRows(rows, columns, query),
    [rows, columns, query],
  );
  const filteredRows = useMemo(() => searchedRows.filter((row) => {
    if (statusFilter !== 'All' && String(row.caseStatus ?? '') !== statusFilter) return false;
    if (riskFilter !== 'All' && String(row.currentRiskLevel ?? '') !== riskFilter) return false;
    if (safehouseFilter !== 'All' && String(row.safehouseId ?? '') !== safehouseFilter) return false;
    return true;
  }), [searchedRows, statusFilter, riskFilter, safehouseFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = useMemo(() => filteredRows.slice((page - 1) * pageSize, page * pageSize), [filteredRows, page]);

  useEffect(() => { setPage(1); }, [query, statusFilter, riskFilter, safehouseFilter]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const getResidentKey = (row: Record<string, unknown>) =>
    String(row.caseControlNo ?? row.internalCode ?? `#${String(row.residentId ?? '')}`);

  const hasUnsavedChanges = (row: Record<string, unknown> | null) => {
    if (!row) return false;
    return (
      String(row.safehouseId ?? '') !== String((row as { __baseSafehouseId?: unknown }).__baseSafehouseId ?? '') ||
      String(row.assignedSocialWorker ?? '') !== String((row as { __baseAssignedSocialWorker?: unknown }).__baseAssignedSocialWorker ?? '') ||
      String(row.caseStatus ?? '') !== String((row as { __baseCaseStatus?: unknown }).__baseCaseStatus ?? '') ||
      String(row.currentRiskLevel ?? '') !== String((row as { __baseCurrentRiskLevel?: unknown }).__baseCurrentRiskLevel ?? '') ||
      String(row.reintegrationStatus ?? '') !== String((row as { __baseReintegrationStatus?: unknown }).__baseReintegrationStatus ?? '')
    );
  };

  const validateResident = (row: Record<string, unknown>) => {
    const nextErrors: Record<string, string> = {};
    const safehouseRaw = String(row.safehouseId ?? '').trim();
    const safehouseIdNum = Number(safehouseRaw);
    if (!safehouseRaw) nextErrors.safehouseId = 'Safehouse ID is required.';
    else if (!Number.isFinite(safehouseIdNum) || safehouseIdNum <= 0) nextErrors.safehouseId = 'Safehouse ID must be a positive number.';
    if (!String(row.assignedSocialWorker ?? '').trim()) nextErrors.assignedSocialWorker = 'Assigned social worker is required.';
    if (!String(row.caseStatus ?? '').trim()) nextErrors.caseStatus = 'Case status is required.';
    if (!String(row.currentRiskLevel ?? '').trim()) nextErrors.currentRiskLevel = 'Risk level is required.';
    if (!String(row.reintegrationStatus ?? '').trim()) nextErrors.reintegrationStatus = 'Reintegration status is required.';
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveEdit = async () => {
    if (!editRow) return;
    const id = Number(editRow.residentId);
    if (!Number.isFinite(id)) return;
    if (!validateResident(editRow)) return;
    setSaving(true);
    try {
      const payload = {
        ...editRow,
        safehouseId: editRow.safehouseId == null || editRow.safehouseId === '' ? null : Number(editRow.safehouseId),
      };
      const res = await api(`/api/residents/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? 'Save failed.');
      }
      notify('Resident updated.');
      setEditRow(null);
      await load();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Save failed.');
    } finally { setSaving(false); }
  };

  const createResident = async () => {
    if (!createRow) return;
    if (!validateResident(createRow)) return;
    setSaving(true);
    try {
      const payload = {
        caseControlNo: String(createRow.caseControlNo ?? '').trim() || undefined,
        safehouseId: Number(createRow.safehouseId),
        assignedSocialWorker: String(createRow.assignedSocialWorker ?? '').trim(),
        caseStatus: String(createRow.caseStatus ?? '').trim(),
        currentRiskLevel: String(createRow.currentRiskLevel ?? '').trim(),
        reintegrationStatus: String(createRow.reintegrationStatus ?? '').trim(),
        sex: String(createRow.sex ?? '').trim() || undefined,
        dateOfAdmission: String(createRow.dateOfAdmission ?? '').trim() || undefined,
      };
      const res = await api('/api/residents', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? 'Create failed.');
      }
      notify('Resident created.');
      setCreateRow(null);
      await load();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Create failed.');
    } finally { setSaving(false); }
  };

  const confirmDeactivateResident = async () => {
    if (!deactivateTarget) return;
    const id = Number(deactivateTarget.residentId);
    if (!Number.isFinite(id)) return;
    const expected = getResidentKey(deactivateTarget);
    if (deactivateText.trim() !== expected) {
      notify(`Type ${expected} exactly to confirm deactivation.`);
      return;
    }

    try {
      const payload = { ...deactivateTarget, caseStatus: 'Closed' };
      const res = await api(`/api/residents/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Deactivate failed.');
      notify(`Resident ${expected} set to Closed.`);
      setDeactivateTarget(null);
      setDeactivateText('');
      await load();
    } catch {
      notify('Deactivate failed.');
    }
  };

  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  const badgeStyle = (type: 'status' | 'risk' | 'reintegration', value: string) => {
    const lower = value.toLowerCase();
    if (type === 'risk') {
      if (lower.includes('critical') || lower.includes('high')) return { bg: c.roseLight, color: c.rose, border: c.rose };
      if (lower.includes('medium')) return { bg: c.goldLight, color: '#7A5A22', border: c.gold };
      return { bg: c.sageLight, color: '#1B5E20', border: c.sage };
    }
    if (type === 'status') {
      if (lower.includes('closed')) return { bg: '#EEECEF', color: '#5D5863', border: '#C9C5CC' };
      if (lower.includes('hold') || lower.includes('transfer')) return { bg: c.goldLight, color: '#7A5A22', border: c.gold };
      return { bg: c.sageLight, color: '#1B5E20', border: c.sage };
    }
    if (lower.includes('complete')) return { bg: c.sageLight, color: '#1B5E20', border: c.sage };
    if (lower.includes('hold')) return { bg: c.goldLight, color: '#7A5A22', border: c.gold };
    return { bg: '#E8F0F8', color: '#305C8A', border: '#9BB7D5' };
  };

  return (
    <div>
      {toast && (
        <div style={{ background: c.sageLight, color: c.forest, borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
          {toast}
        </div>
      )}

      <SectionTitle>Residents</SectionTitle>
      <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            setFieldErrors({});
            setCreateRow({
              caseControlNo: '',
              safehouseId: '',
              assignedSocialWorker: '',
              caseStatus: 'Active',
              currentRiskLevel: 'Low',
              reintegrationStatus: 'Not Started',
              sex: 'F',
              dateOfAdmission: '',
            });
          }}
          style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}
        >
          + Add resident
        </button>
      </div>
      <DataSearchBar
        id={searchId}
        value={query}
        onChange={setQuery}
        placeholder="Search by case no, status, risk, safehouse, social worker…"
      />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: c.muted }}>
          Status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            style={{ marginLeft: 6, padding: '5px 8px', borderRadius: 6, border: `1px solid ${c.sageLight}`, background: c.white }}>
            {statusOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 11, color: c.muted }}>
          Risk
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}
            style={{ marginLeft: 6, padding: '5px 8px', borderRadius: 6, border: `1px solid ${c.sageLight}`, background: c.white }}>
            {riskOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 11, color: c.muted }}>
          Safehouse
          <select value={safehouseFilter} onChange={(e) => setSafehouseFilter(e.target.value)}
            style={{ marginLeft: 6, padding: '5px 8px', borderRadius: 6, border: `1px solid ${c.sageLight}`, background: c.white }}>
            {safehouseOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <p style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>
          {filteredRows.length === rows.length
            ? `${rows.length} records`
            : `${filteredRows.length} of ${rows.length} records shown`} · Page {page} of {pageCount}
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: c.sageLight }}>
              {columns.map(col => (
                <th key={col.key} style={{ position: 'sticky', top: 0, zIndex: 2, padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap', background: c.sageLight }}>
                  {col.label}
                </th>
              ))}
              <th style={{ position: 'sticky', top: 0, right: 0, zIndex: 3, padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap', background: c.sageLight }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, i) => (
              <tr key={String(row.residentId)} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                {columns.map(col => (
                  <td key={col.key} style={{ padding: '8px 12px', color: c.text, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {col.key === 'caseStatus' || col.key === 'currentRiskLevel' || col.key === 'reintegrationStatus' ? (
                      (() => {
                        const val = String(row[col.key] ?? '—');
                        const style = badgeStyle(
                          col.key === 'caseStatus' ? 'status' : col.key === 'currentRiskLevel' ? 'risk' : 'reintegration',
                          val,
                        );
                        return (
                          <span style={{ display: 'inline-block', borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 700, background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                            {val}
                          </span>
                        );
                      })()
                    ) : (
                      String(row[col.key] ?? '—')
                    )}
                  </td>
                ))}
                <td style={{ position: 'sticky', right: 0, background: i % 2 === 0 ? c.ivory : c.white, padding: '8px 12px', borderLeft: `1px solid ${c.sageLight}` }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setViewRow(row)}
                      aria-label={`View resident ${getResidentKey(row)}`}
                      style={{ background: c.sageLight, color: c.forest, border: `1px solid ${c.sage}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => {
                        setFieldErrors({});
                        setEditRow({
                          ...row,
                          __baseSafehouseId: row.safehouseId,
                          __baseAssignedSocialWorker: row.assignedSocialWorker,
                          __baseCaseStatus: row.caseStatus,
                          __baseCurrentRiskLevel: row.currentRiskLevel,
                          __baseReintegrationStatus: row.reintegrationStatus,
                        });
                      }}
                      aria-label={`Edit resident ${getResidentKey(row)}`}
                      style={{ background: c.goldLight, color: '#5D4037', border: `1px solid ${c.gold}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { setDeactivateTarget(row); setDeactivateText(''); }}
                      aria-label={`Deactivate resident ${getResidentKey(row)}`}
                      style={{ background: c.roseLight, color: c.rose, border: `1px solid ${c.rose}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                    >
                      Deactivate
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: page === 1 ? 'not-allowed' : 'pointer', color: c.text, opacity: page === 1 ? 0.5 : 1 }}>
            Prev
          </button>
          <span style={{ fontSize: 12, color: c.muted }}>Page {page} / {pageCount}</span>
          <button disabled={page === pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: page === pageCount ? 'not-allowed' : 'pointer', color: c.text, opacity: page === pageCount ? 0.5 : 1 }}>
            Next
          </button>
        </div>
      </div>

      {viewRow && (
        <div onClick={() => setViewRow(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(44,43,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(720px, 92vw)', maxHeight: '86vh', overflowY: 'auto', background: c.white, borderRadius: 12, border: `1px solid ${c.sageLight}`, padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, color: c.forest, fontSize: 16 }}>Resident details</h3>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10 }}>
              {Object.entries(viewRow).map(([k, v]) => (
                <div key={k} style={{ border: `1px solid ${c.sageLight}`, borderRadius: 8, padding: '8px 10px', background: c.ivory }}>
                  <p style={{ margin: 0, fontSize: 10, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: 12, color: c.text }}>{String(v ?? '—')}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setViewRow(null)} style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editRow && (
        <div onClick={() => {
          if (hasUnsavedChanges(editRow)) {
            if (!window.confirm('Discard unsaved changes?')) return;
          }
          setEditRow(null);
        }} style={{ position: 'fixed', inset: 0, background: 'rgba(44,43,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(760px, 92vw)', background: c.white, borderRadius: 12, border: `1px solid ${c.sageLight}`, padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, color: c.forest, fontSize: 16 }}>Edit resident</h3>
            <p style={{ margin: '4px 0 10px 0', fontSize: 12, color: c.muted }}>Update key case-management fields. Sensitive updates may route through approvals.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10 }}>
              <label style={{ fontSize: 11, color: c.muted }}>Case No.
                <input disabled value={String(editRow.caseControlNo ?? '')}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: '#F4F4F4', color: c.muted }} />
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Safehouse ID
                <input type="number" value={String(editRow.safehouseId ?? '')}
                  onChange={(e) => setEditRow((r) => (r ? { ...r, safehouseId: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}` }} />
                {fieldErrors.safehouseId && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.safehouseId}</span>}
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Assigned Social Worker
                <input value={String(editRow.assignedSocialWorker ?? '')}
                  onChange={(e) => setEditRow((r) => (r ? { ...r, assignedSocialWorker: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}` }} />
                {fieldErrors.assignedSocialWorker && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.assignedSocialWorker}</span>}
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Case Status
                <select value={String(editRow.caseStatus ?? '')}
                  onChange={(e) => setEditRow((r) => (r ? { ...r, caseStatus: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: c.white }}>
                  {['Active', 'In Progress', 'On Hold', 'Transferred', 'Closed'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                {fieldErrors.caseStatus && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.caseStatus}</span>}
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Current Risk Level
                <select value={String(editRow.currentRiskLevel ?? '')}
                  onChange={(e) => setEditRow((r) => (r ? { ...r, currentRiskLevel: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: c.white }}>
                  {['Low', 'Medium', 'High', 'Critical'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                {fieldErrors.currentRiskLevel && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.currentRiskLevel}</span>}
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Reintegration Status
                <select value={String(editRow.reintegrationStatus ?? '')}
                  onChange={(e) => setEditRow((r) => (r ? { ...r, reintegrationStatus: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: c.white }}>
                  {['Not Started', 'In Progress', 'On Hold', 'Completed'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                {fieldErrors.reintegrationStatus && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.reintegrationStatus}</span>}
              </label>
            </div>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button disabled={saving} onClick={() => {
                if (hasUnsavedChanges(editRow) && !window.confirm('Discard unsaved changes?')) return;
                setEditRow(null);
              }}
                style={{ background: 'transparent', color: c.muted, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                Cancel
              </button>
              <button disabled={saving} onClick={saveEdit}
                style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {createRow && (
        <div onClick={() => {
          if (Object.values(createRow).some((v) => String(v ?? '').trim() !== '')) {
            if (!window.confirm('Discard new resident draft?')) return;
          }
          setCreateRow(null);
        }} style={{ position: 'fixed', inset: 0, background: 'rgba(44,43,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(760px, 92vw)', background: c.white, borderRadius: 12, border: `1px solid ${c.sageLight}`, padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, color: c.forest, fontSize: 16 }}>Create resident</h3>
            <p style={{ margin: '4px 0 10px 0', fontSize: 12, color: c.muted }}>Create a new resident record (minimum required fields).</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10 }}>
              <label style={{ fontSize: 11, color: c.muted }}>Case No.
                <input value={String(createRow.caseControlNo ?? '')}
                  onChange={(e) => setCreateRow((r) => (r ? { ...r, caseControlNo: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}` }} />
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Safehouse ID
                <input type="number" value={String(createRow.safehouseId ?? '')}
                  onChange={(e) => setCreateRow((r) => (r ? { ...r, safehouseId: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}` }} />
                {fieldErrors.safehouseId && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.safehouseId}</span>}
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Assigned Social Worker
                <input value={String(createRow.assignedSocialWorker ?? '')}
                  onChange={(e) => setCreateRow((r) => (r ? { ...r, assignedSocialWorker: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}` }} />
                {fieldErrors.assignedSocialWorker && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.assignedSocialWorker}</span>}
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Case Status
                <select value={String(createRow.caseStatus ?? '')}
                  onChange={(e) => setCreateRow((r) => (r ? { ...r, caseStatus: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: c.white }}>
                  {['Active', 'In Progress', 'On Hold', 'Transferred', 'Closed'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                {fieldErrors.caseStatus && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.caseStatus}</span>}
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Current Risk Level
                <select value={String(createRow.currentRiskLevel ?? '')}
                  onChange={(e) => setCreateRow((r) => (r ? { ...r, currentRiskLevel: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: c.white }}>
                  {['Low', 'Medium', 'High', 'Critical'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                {fieldErrors.currentRiskLevel && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.currentRiskLevel}</span>}
              </label>
              <label style={{ fontSize: 11, color: c.muted }}>Reintegration Status
                <select value={String(createRow.reintegrationStatus ?? '')}
                  onChange={(e) => setCreateRow((r) => (r ? { ...r, reintegrationStatus: e.target.value } : r))}
                  style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: c.white }}>
                  {['Not Started', 'In Progress', 'On Hold', 'Completed'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                {fieldErrors.reintegrationStatus && <span style={{ fontSize: 11, color: c.rose }}>{fieldErrors.reintegrationStatus}</span>}
              </label>
            </div>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button disabled={saving} onClick={() => setCreateRow(null)}
                style={{ background: 'transparent', color: c.muted, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                Cancel
              </button>
              <button disabled={saving} onClick={createResident}
                style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating…' : 'Create resident'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deactivateTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,43,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div style={{ width: 'min(560px, 92vw)', background: c.white, borderRadius: 12, border: `1px solid ${c.roseLight}`, padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, color: c.rose, fontSize: 16 }}>Confirm deactivation</h3>
            <p style={{ margin: '8px 0 10px', fontSize: 12, color: c.text }}>
              Type <strong>{getResidentKey(deactivateTarget)}</strong> to confirm setting this resident to Closed.
            </p>
            <input value={deactivateText} onChange={(e) => setDeactivateText(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.rose}` }} />
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setDeactivateTarget(null); setDeactivateText(''); }}
                style={{ background: 'transparent', color: c.muted, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={confirmDeactivateResident}
                style={{ background: c.rose, color: c.white, border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Generic read-only data panels ─────────────────────────────────────────────

function DataPanel({ title, url, columns, keyField }: { title: string; url: string; columns: { key: string; label: string }[]; keyField: string }) {
  const searchId = useId();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api(url).then(r => r.json());
      setRows(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load data.'); }
    finally { setLoading(false); }
  }, [url]);

  useEffect(() => { load(); }, [load]);

  const filteredRows = useMemo(
    () => filterTableRows(rows, columns, query),
    [rows, columns, query],
  );

  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      {loading ? (
        <Loading />
      ) : error ? (
        <ApiError msg={error} retry={load} />
      ) : (
        <>
          <DataSearchBar
            id={searchId}
            value={query}
            onChange={setQuery}
            placeholder={`Search ${title.toLowerCase()}…`}
          />
          <Table columns={columns} rows={filteredRows} keyField={keyField} totalCount={rows.length} />
        </>
      )}
    </div>
  );
}

function CrudDataPanel({ title, url, columns, keyField }: { title: string; url: string; columns: { key: string; label: string }[]; keyField: string }) {
  const searchId = useId();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null);
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [createRow, setCreateRow] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api(url).then(r => r.json());
      setRows(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load data.'); }
    finally { setLoading(false); }
  }, [url]);

  useEffect(() => { load(); }, [load]);

  const filteredRows = useMemo(
    () => filterTableRows(rows, columns, query),
    [rows, columns, query],
  );

  const editableColumns = columns.filter((col) => col.key !== keyField);
  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const normalizeRowForSave = (row: Record<string, unknown>) => {
    const payload: Record<string, unknown> = {};
    for (const col of columns) {
      const key = col.key;
      if (key === keyField) continue;
      const raw = row[key];
      if (raw == null) continue;
      if (typeof raw === 'string') {
        const t = raw.trim();
        if (t === '') continue;
        if (t === 'true') { payload[key] = true; continue; }
        if (t === 'false') { payload[key] = false; continue; }
        if (/^-?\d+(\.\d+)?$/.test(t) && !/date/i.test(key)) { payload[key] = Number(t); continue; }
        payload[key] = t;
        continue;
      }
      payload[key] = raw;
    }
    return payload;
  };

  const saveCreate = async () => {
    if (!createRow) return;
    setSaving(true);
    try {
      const payload = normalizeRowForSave(createRow);
      const res = await api(url, { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Create failed');
      setCreateRow(null);
      notify('Created successfully.');
      await load();
    } catch {
      notify('Create failed.');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    const id = editRow[keyField];
    if (id == null) return;
    setSaving(true);
    try {
      const payload = normalizeRowForSave(editRow);
      const res = await api(`${url}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Update failed');
      setEditRow(null);
      notify('Updated successfully.');
      await load();
    } catch {
      notify('Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = (setter: (updater: (prev: Record<string, unknown> | null) => Record<string, unknown> | null) => void, key: string, value: unknown) => {
    setter((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const inputFor = (
    draft: Record<string, unknown>,
    onUpdate: (key: string, value: unknown) => void,
    col: { key: string; label: string },
  ) => {
    const key = col.key;
    const value = draft[key];
    const valueString = String(value ?? '');
    if (typeof value === 'boolean') {
      return (
        <select
          value={String(value)}
          onChange={(e) => onUpdate(key, e.target.value === 'true')}
          style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: c.white }}
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }
    const maybeDate = /date|time/i.test(key);
    const maybeNumber = typeof value === 'number' || /id$|minutes|rate|score|percent|count|value|amount|capacity|occupancy/i.test(key);
    return (
      <input
        type={maybeDate ? 'datetime-local' : maybeNumber ? 'number' : 'text'}
        value={valueString}
        onChange={(e) => onUpdate(key, e.target.value)}
        style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}` }}
      />
    );
  };

  return (
    <div>
      {toast && <div style={{ background: c.sageLight, color: c.forest, borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{toast}</div>}
      <SectionTitle>{title}</SectionTitle>
      {loading ? (
        <Loading />
      ) : error ? (
        <ApiError msg={error} retry={load} />
      ) : (
        <>
          <div style={{ marginBottom: 10 }}>
            <button
              onClick={() => {
                const seed: Record<string, unknown> = {};
                editableColumns.forEach((col) => { seed[col.key] = ''; });
                setCreateRow(seed);
              }}
              style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}
            >
              + Add record
            </button>
          </div>
          <DataSearchBar
            id={searchId}
            value={query}
            onChange={setQuery}
            placeholder={`Search ${title.toLowerCase()}…`}
          />
          {filteredRows.length === 0 ? (
            <p style={{ fontSize: 13, color: c.muted }}>
              {query.trim() === '' ? 'No records found.' : 'No rows match your search.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <p style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>
                {filteredRows.length === rows.length ? `${rows.length} records` : `${filteredRows.length} of ${rows.length} records shown`}
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: c.sageLight }}>
                    {columns.map((col) => (
                      <th key={col.key} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {col.label}
                      </th>
                    ))}
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => (
                    <tr key={String(row[keyField] ?? i)} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                      {columns.map((col) => (
                        <td key={col.key} style={{ padding: '8px 12px', color: c.text, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {String(row[col.key] ?? '—')}
                        </td>
                      ))}
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setViewRow(row)}
                            aria-label={`View ${title} ${String(row[keyField] ?? '')}`}
                            style={{ background: c.sageLight, color: c.forest, border: `1px solid ${c.sage}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                          >
                            View
                          </button>
                          <button
                            onClick={() => setEditRow({ ...row })}
                            aria-label={`Edit ${title} ${String(row[keyField] ?? '')}`}
                            style={{ background: c.goldLight, color: '#5D4037', border: `1px solid ${c.gold}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {viewRow && (
        <div onClick={() => setViewRow(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(44,43,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(720px, 92vw)', maxHeight: '86vh', overflowY: 'auto', background: c.white, borderRadius: 12, border: `1px solid ${c.sageLight}`, padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, color: c.forest, fontSize: 16 }}>Record details</h3>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10 }}>
              {Object.entries(viewRow).map(([k, v]) => (
                <div key={k} style={{ border: `1px solid ${c.sageLight}`, borderRadius: 8, padding: '8px 10px', background: c.ivory }}>
                  <p style={{ margin: 0, fontSize: 10, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: 12, color: c.text }}>{String(v ?? '—')}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setViewRow(null)} style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editRow && (
        <div onClick={() => setEditRow(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(44,43,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(760px, 92vw)', background: c.white, borderRadius: 12, border: `1px solid ${c.sageLight}`, padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, color: c.forest, fontSize: 16 }}>Edit record</h3>
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10 }}>
              {editableColumns.map((col) => (
                <label key={col.key} style={{ fontSize: 11, color: c.muted }}>
                  {col.label}
                  {inputFor(editRow, (key, value) => updateDraft(setEditRow, key, value), col)}
                </label>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button disabled={saving} onClick={() => setEditRow(null)}
                style={{ background: 'transparent', color: c.muted, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                Cancel
              </button>
              <button disabled={saving} onClick={saveEdit}
                style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {createRow && (
        <div onClick={() => setCreateRow(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(44,43,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(760px, 92vw)', background: c.white, borderRadius: 12, border: `1px solid ${c.sageLight}`, padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, color: c.forest, fontSize: 16 }}>Create record</h3>
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10 }}>
              {editableColumns.map((col) => (
                <label key={col.key} style={{ fontSize: 11, color: c.muted }}>
                  {col.label}
                  {inputFor(createRow, (key, value) => updateDraft(setCreateRow, key, value), col)}
                </label>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button disabled={saving} onClick={() => setCreateRow(null)}
                style={{ background: 'transparent', color: c.muted, border: `1px solid ${c.sageLight}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                Cancel
              </button>
              <button disabled={saving} onClick={saveCreate}
                style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating…' : 'Create record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Portal component ──────────────────────────────────────────────────────────

type InsightDonationByCampaignRow = { campaignName: string; totalValuePhp: number; donationCount: number; avgValuePhp: number };
type InsightBridgeRow = {
  month: string;
  posts_n: number;
  click_throughs: number;
  donation_referrals: number;
  donation_total_php: number;
  incidents: number;
  avg_edu_progress: number;
  avg_health: number;
};

type EngagementVsVanitySummary = {
  totalPosts: number;
  thresholds: { engagementScoreP75: number; donationReferralsP75: number };
  segments: { segment: string; postCount: number }[];
};

function AdminReports() {
  const [bridge, setBridge] = useState<InsightBridgeRow[]>([]);
  const [campaigns, setCampaigns] = useState<InsightDonationByCampaignRow[]>([]);
  const [evSummary, setEvSummary] = useState<EngagementVsVanitySummary | null>(null);
  const [campaignTake, setCampaignTake] = useState(15);
  const [bridgeTake, setBridgeTake] = useState(24);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [b, c, ev] = await Promise.all([
        api(`/api/insights/bridge/monthly?take=${bridgeTake}`).then(r => r.json()),
        api(`/api/insights/donations/by-campaign?take=${campaignTake}`).then(r => r.json()),
        api('/api/insights/social/engagement-vs-vanity').then(r => r.json()),
      ]);
      setBridge(Array.isArray(b) ? b : []);
      setCampaigns(Array.isArray(c) ? c : []);
      setEvSummary(ev && typeof ev === 'object' && 'segments' in ev ? ev as EngagementVsVanitySummary : null);
    } catch { setError('Failed to load reports.'); }
    finally { setLoading(false); }
  }, [bridgeTake, campaignTake]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  const campaignChartData = campaigns.map((r) => ({ name: r.campaignName, total: Number(r.totalValuePhp ?? 0) }));
  const bridgeChartData = bridge.map((r) => ({
    month: new Date(r.month).toLocaleDateString('en-US', { year: '2-digit', month: 'short' }),
    donations: Number(r.donation_total_php ?? 0),
    referrals: Number(r.donation_referrals ?? 0),
    incidents: Number(r.incidents ?? 0),
  }));
  return (
    <div>
      <SectionTitle>Reports (pipelines)</SectionTitle>
      <p style={{ fontSize: 12, color: c.muted, marginTop: -4, marginBottom: 16 }}>
        Aggregate analytics for planning. Source: <code>/api/insights/*</code>
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: c.muted }}>
          Top campaigns:
          <select value={campaignTake} onChange={(e) => setCampaignTake(Number(e.target.value))}
            style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 6, border: `1px solid ${c.sageLight}`, background: c.white }}>
            {[5, 10, 15, 25].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, color: c.muted }}>
          Bridge months:
          <select value={bridgeTake} onChange={(e) => setBridgeTake(Number(e.target.value))}
            style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 6, border: `1px solid ${c.sageLight}`, background: c.white }}>
            {[12, 18, 24, 36, 60, 120].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <SectionTitle>Top campaigns by total PHP</SectionTitle>
      {campaignChartData.length > 0 && (
        <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: c.forest, margin: 0, marginBottom: 8 }}>Top campaigns (total PHP)</p>
          <Suspense fallback={<p style={{ fontSize: 12, color: c.muted }}>Loading chart…</p>}>
            <CampaignBarChart data={campaignChartData} barColor={c.gold} gridColor="rgba(44,43,40,0.08)" />
          </Suspense>
        </div>
      )}
      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: c.sageLight }}>
              {['Campaign', 'Donations', 'Total (PHP)', 'Avg (PHP)'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((row, i) => (
              <tr key={`${row.campaignName}-${i}`} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                <td style={{ padding: '8px 12px' }}>{row.campaignName}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.donationCount}</td>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{`₱${Number(row.totalValuePhp).toLocaleString()}`}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{`₱${Number(row.avgValuePhp).toFixed(0)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionTitle>Monthly bridge (last 18 months)</SectionTitle>
      {bridgeChartData.length > 0 && (
        <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: c.forest, margin: 0, marginBottom: 8 }}>Donations vs referrals (last 24 months)</p>
          <Suspense fallback={<p style={{ fontSize: 12, color: c.muted }}>Loading chart…</p>}>
            <BridgeLineChart
              data={bridgeChartData}
              donationsColor={c.forest}
              referralsColor={c.rose}
              incidentsColor={c.gold}
              gridColor="rgba(44,43,40,0.08)"
            />
          </Suspense>
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: c.sageLight }}>
              {['Month', 'Posts', 'Clicks', 'Referrals', 'Donations (PHP)', 'Incidents', 'Avg Edu', 'Avg Health'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bridge.slice(-18).map((row, i) => (
              <tr key={`${row.month}-${i}`} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                <td style={{ padding: '8px 12px' }}>{new Date(row.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.posts_n}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.click_throughs}</td>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.donation_referrals}</td>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{`₱${Number(row.donation_total_php).toLocaleString()}`}</td>
                <td style={{ padding: '8px 12px', color: c.rose }}>{row.incidents}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{Number(row.avg_edu_progress).toFixed(1)}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{Number(row.avg_health).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18, marginTop: 22 }}>
        <DataPanel
          title="Donor upgrade candidates (expected next gift size)"
          url="/api/insights/donors/upgrade-candidates?take=25"
          keyField="supporterId"
          columns={[
            { key: 'supporterName', label: 'Supporter' },
            { key: 'expectedNextValuePhp', label: 'Expected next (PHP)' },
            { key: 'recencyDays', label: 'Recency (days)' },
            { key: 'donationCount', label: 'Donations' },
            { key: 'lastValuePhp', label: 'Last gift (PHP)' },
            { key: 'lastDonationDate', label: 'Last date' },
          ]}
        />

        <DataPanel
          title="Post → donation linkage (top groups by estimated value)"
          url="/api/insights/posts/donation-linkage/by-group?group=platform&take=12"
          keyField="key"
          columns={[
            { key: 'key', label: 'Platform' },
            { key: 'postCount', label: 'Posts' },
            { key: 'willReferRate', label: 'Refer rate' },
            { key: 'avgReferrals', label: 'Avg referrals' },
            { key: 'totalEstimatedValuePhp', label: 'Total est. PHP' },
            { key: 'boostedRate', label: 'Boosted rate' },
          ]}
        />

        <DataPanel
          title="Safehouse strain (latest month; stress z + forecast heuristic)"
          url="/api/insights/safehouses/strain/latest?take=25"
          keyField="safehouseId"
          columns={[
            { key: 'safehouseName', label: 'Safehouse' },
            { key: 'month', label: 'Month' },
            { key: 'stressIndexZ', label: 'Stress (z)' },
            { key: 'forecastNextMonthIncidents', label: 'Forecast next incidents' },
            { key: 'incidentCount', label: 'Incidents' },
            { key: 'incidentLag1', label: 'Incidents lag1' },
            { key: 'activeResidents', label: 'Active residents' },
          ]}
        />

        <DataPanel
          title="Intervention effectiveness (plan category vs latest outcomes)"
          url="/api/insights/interventions/by-category"
          keyField="planCategory"
          columns={[
            { key: 'planCategory', label: 'Category' },
            { key: 'planCount', label: 'Plans' },
            { key: 'residentCount', label: 'Residents' },
            { key: 'avgLatestProgressPercent', label: 'Avg progress %' },
            { key: 'avgLatestHealthScore', label: 'Avg health' },
          ]}
        />

        <DataPanel
          title="Resident risk flags (90-day heuristic; staff triage)"
          url="/api/insights/residents/risk-flags?take=40"
          keyField="residentId"
          columns={[
            { key: 'residentLabel', label: 'Resident' },
            { key: 'riskBand', label: 'Band' },
            { key: 'riskScore', label: 'Score' },
            { key: 'incidents90d', label: 'Incidents 90d' },
            { key: 'concernSessions90d', label: 'Concern sessions 90d' },
            { key: 'safetyVisitFlags90d', label: 'Safety flags 90d' },
            { key: 'currentRiskLevel', label: 'Current risk' },
            { key: 'safehouseId', label: 'Safehouse' },
          ]}
        />

        <DataPanel
          title="Reintegration readiness (heuristic score; not a decision)"
          url="/api/insights/residents/reintegration-readiness?take=40"
          keyField="residentId"
          columns={[
            { key: 'residentLabel', label: 'Resident' },
            { key: 'readinessScore', label: 'Readiness' },
            { key: 'reintegrationStatus', label: 'Status' },
            { key: 'latestProgressPercent', label: 'Progress %' },
            { key: 'latestHealthScore', label: 'Health' },
            { key: 'incidentsLast365d', label: 'Incidents 365d' },
            { key: 'homeVisitsLast180d', label: 'Visits 180d' },
          ]}
        />
      </div>

      {evSummary && (
        <div style={{ marginTop: 22 }}>
          <SectionTitle>Engagement vs vanity (segment mix)</SectionTitle>
          <p style={{ fontSize: 12, color: c.muted, marginTop: -4, marginBottom: 12 }}>
            High engagement = likes+comments+shares at or above P75; high donation = referrals at or above P75. Associations only — not causal.{' '}
            <code>/api/insights/social/engagement-vs-vanity</code>
          </p>
          <p style={{ fontSize: 12, color: c.muted, marginBottom: 10 }}>
            P75 thresholds: engagement score {Number(evSummary.thresholds.engagementScoreP75).toFixed(1)}, donation referrals {Number(evSummary.thresholds.donationReferralsP75).toFixed(1)} · {evSummary.totalPosts} posts
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: c.sageLight }}>
                  {['Segment', 'Posts'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evSummary.segments.map((row, i) => (
                  <tr key={row.segment} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                    <td style={{ padding: '8px 12px' }}>{row.segment.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.postCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('Dashboard');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderContent = () => {
    switch (activeNav) {
      case 'Dashboard': return <AdminDashboard />;
      case 'Users':
        return <CrudDataPanel title="Users" url="/api/users" keyField="id" columns={[
          { key: 'id', label: 'ID' }, { key: 'userName', label: 'Username' },
          { key: 'email', label: 'Email' }, { key: 'phoneNumber', label: 'Phone' },
          { key: 'userType', label: 'Type' }, { key: 'staffId', label: 'Staff ID' },
          { key: 'residentId', label: 'Resident ID' }, { key: 'supporterId', label: 'Supporter ID' },
          { key: 'isActive', label: 'Active' }, { key: 'isApproved', label: 'Approved' },
        ]} />;
      case 'Pending User Approvals': return <AdminUsers />;
      case 'Pending Approvals': return <AdminPendingApprovals />;
      case 'Residents': return <AdminResidentsPanel />;
      case 'Health Records':
        return <CrudDataPanel title="Health & Wellbeing Records" url="/api/healthwellbeingrecords" keyField="healthRecordId" columns={[
          { key: 'healthRecordId', label: 'ID' }, { key: 'residentId', label: 'Resident' },
          { key: 'recordDate', label: 'Date' }, { key: 'generalHealthScore', label: 'Health Score' },
          { key: 'nutritionScore', label: 'Nutrition' }, { key: 'sleepQualityScore', label: 'Sleep' },
          { key: 'bmi', label: 'BMI' }, { key: 'medicalCheckupDone', label: 'Medical' },
          { key: 'psychologicalCheckupDone', label: 'Psych' },
        ]} />;
      case 'Education Records':
        return <CrudDataPanel title="Education Records" url="/api/educationrecords" keyField="educationRecordId" columns={[
          { key: 'educationRecordId', label: 'ID' }, { key: 'residentId', label: 'Resident' },
          { key: 'recordDate', label: 'Date' }, { key: 'educationLevel', label: 'Level' },
          { key: 'schoolName', label: 'School' }, { key: 'enrollmentStatus', label: 'Status' },
          { key: 'attendanceRate', label: 'Attendance %' }, { key: 'progressPercent', label: 'Progress %' },
        ]} />;
      case 'Process Recordings':
        return <CrudDataPanel title="Process Recordings" url="/api/processrecordings" keyField="recordingId" columns={[
          { key: 'recordingId', label: 'ID' }, { key: 'sessionDate', label: 'Date' },
          { key: 'residentId', label: 'Resident' }, { key: 'socialWorker', label: 'Social Worker' },
          { key: 'sessionType', label: 'Type' }, { key: 'sessionDurationMinutes', label: 'Duration (min)' },
          { key: 'progressNoted', label: 'Progress' }, { key: 'concernsFlagged', label: 'Concerns' },
        ]} />;
      case 'Home Visitations':
        return <CrudDataPanel title="Home Visitations" url="/api/homevisitations" keyField="visitationId" columns={[
          { key: 'visitationId', label: 'ID' }, { key: 'visitDate', label: 'Date' },
          { key: 'residentId', label: 'Resident' }, { key: 'socialWorker', label: 'Social Worker' },
          { key: 'visitType', label: 'Type' }, { key: 'locationVisited', label: 'Location' },
          { key: 'familyCooperationLevel', label: 'Cooperation' }, { key: 'visitOutcome', label: 'Outcome' },
        ]} />;
      case 'Incident Reports':
        return <CrudDataPanel title="Incident Reports" url="/api/incidentreports" keyField="incidentId" columns={[
          { key: 'incidentId', label: 'ID' }, { key: 'incidentDate', label: 'Date' },
          { key: 'residentId', label: 'Resident' }, { key: 'incidentType', label: 'Type' },
          { key: 'severity', label: 'Severity' }, { key: 'resolved', label: 'Resolved' },
          { key: 'reportedBy', label: 'Reported By' },
        ]} />;
      case 'Intervention Plans':
        return <CrudDataPanel title="Intervention Plans" url="/api/interventionplans" keyField="planId" columns={[
          { key: 'planId', label: 'ID' }, { key: 'residentId', label: 'Resident' },
          { key: 'planCategory', label: 'Category' }, { key: 'planDescription', label: 'Description' },
          { key: 'status', label: 'Status' }, { key: 'targetDate', label: 'Target Date' },
          { key: 'caseConferenceDate', label: 'Conference' },
        ]} />;
      case 'Staff':
        return <CrudDataPanel title="Staff" url="/api/staff" keyField="staffId" columns={[
          { key: 'staffId', label: 'ID' }, { key: 'staffCode', label: 'Code' },
          { key: 'firstName', label: 'First' }, { key: 'lastName', label: 'Last' },
          { key: 'role', label: 'Role' }, { key: 'employmentType', label: 'Type' },
          { key: 'safehouseId', label: 'Safehouse' }, { key: 'employmentStatus', label: 'Status' },
          { key: 'email', label: 'Email' },
        ]} />;
      case 'Safehouses':
        return <CrudDataPanel title="Safehouses" url="/api/safehouses" keyField="safehouseId" columns={[
          { key: 'safehouseId', label: 'ID' }, { key: 'safehouseCode', label: 'Code' },
          { key: 'name', label: 'Name' }, { key: 'city', label: 'City' },
          { key: 'region', label: 'Region' }, { key: 'status', label: 'Status' },
          { key: 'capacityGirls', label: 'Capacity' }, { key: 'currentOccupancy', label: 'Occupancy' },
        ]} />;
      case 'Donations':
        return <CrudDataPanel title="Donations" url="/api/donations" keyField="donationId" columns={[
          { key: 'donationId', label: 'ID' }, { key: 'donationDate', label: 'Date' },
          { key: 'donationType', label: 'Type' }, { key: 'campaignName', label: 'Campaign' },
          { key: 'amount', label: 'Amount' }, { key: 'currencyCode', label: 'Currency' },
          { key: 'channelSource', label: 'Channel' }, { key: 'isRecurring', label: 'Recurring' },
        ]} />;
      case 'Organizations':
        return <CrudDataPanel title="Organizations" url="/api/organizations" keyField="organizationId" columns={[
          { key: 'organizationId', label: 'ID' }, { key: 'organizationCode', label: 'Code' },
          { key: 'organizationName', label: 'Name' }, { key: 'organizationType', label: 'Type' },
          { key: 'city', label: 'City' }, { key: 'region', label: 'Region' },
          { key: 'country', label: 'Country' }, { key: 'status', label: 'Status' },
        ]} />;
      case 'Audit Log':
        return <DataPanel title="Audit Log" url="/api/auditlogs" keyField="auditId" columns={[
          { key: 'auditId', label: 'ID' }, { key: 'timestamp', label: 'Time' },
          { key: 'userId', label: 'User' }, { key: 'action', label: 'Action' },
          { key: 'resource', label: 'Resource' }, { key: 'recordId', label: 'Record' },
          { key: 'ipAddress', label: 'IP' }, { key: 'approvalStatus', label: 'Approval' },
        ]} />;
      case 'Reports': return <AdminReports />;
      case 'Settings':
        return (
          <div>
            <SectionTitle>Settings</SectionTitle>
            <p style={{ fontSize: 13, color: c.muted }}>System settings coming soon.</p>
          </div>
        );
      default: return null;
    }
  };

  return (
    <main id="main-content" style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
      <Sidebar id="admin-sidebar" items={navItems} active={activeNav} setActive={setActiveNav}
        user={`${user?.userName ?? 'Admin'} · Admin`} onLogout={handleLogout} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
        <section aria-label="Admin dashboard"
          style={{ background: ADMIN_BANNER_BG, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: 12, color: 'rgba(251,248,242,0.65)', marginBottom: 3 }}>Admin Console</p>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: c.ivory, fontWeight: 400, margin: 0 }}>{user?.userName ?? 'Admin'}</h1>
          </div>
        </section>
        {renderContent()}
      </div>
    </main>
  );
}
