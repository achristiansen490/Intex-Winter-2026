import { useState, useEffect, useCallback, useMemo, useId, lazy, Suspense, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { usePendingAuditApprovalCount } from '../hooks/usePendingAuditApprovalCount';
import { apiFetch as api, jsonIfOk } from '../lib/api';
import { buildMonthWindowEndingAtCap, capRowsAtChartMaxMonth, monthKey, parseMonthStart, sortRowsByMonthAsc } from '../lib/chartDateCap';
import { getStaffNavItems, staffNavItemToSlug, staffSlugToNavItem } from '../lib/portalTabs';
import { ResidentProcessRecordingsModal } from '../components/residents/ResidentProcessRecordingsModal';
import { QuarterlyOkrRateSection, type QuarterlyRateOkrResponse } from '../components/dashboard/QuarterlyOkrRateSection';
import { SocialMediaImpactSection } from '../components/reports/SocialMediaImpactSection';

const CampaignBarChart = lazy(() => import('../components/charts/CampaignBarChart'));
const BridgeLineChart = lazy(() => import('../components/charts/BridgeLineChart'));

const c = {
  ivory: '#F9FCFB', forest: '#4A7C68', gold: '#D4A44C', rose: '#C4867A',
  roseLight: '#F0D8D4', sage: '#7FA89C', sageLight: '#E0EBE8', goldLight: '#F5E6C8',
  text: '#2C2B28', muted: '#7A786F', white: '#FFFFFF',
};
const STAFF_BANNER_BG = '#2A4A35';

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
    <div style={{ background: c.white, border: `1px solid ${accent ?? c.sageLight}`, borderRadius: 10, padding: '1rem 1.25rem', flex: '1 1 130px' }}>
      <p style={{ fontSize: 11, color: c.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color: c.forest, fontFamily: 'Georgia, serif', margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 style={{ fontSize: 15, fontWeight: 600, color: c.forest, marginBottom: 12, marginTop: 0, paddingBottom: 6, borderBottom: `1px solid ${c.sageLight}` }}>{children}</h2>;
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

function DataTable({
  columns,
  rows,
  keyField,
  totalCount,
}: {
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  keyField: string;
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
                <td key={col.key} style={{ padding: '8px 12px', color: c.text, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

function DataPanel({ title, url, columns, keyField }: { title: string; url: string; columns: { key: string; label: string }[]; keyField: string }) {
  const searchId = useId();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const d = await jsonIfOk(await api(url), []); setRows(Array.isArray(d) ? d : []); }
    catch { setError('Failed to load data.'); }
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
          <DataTable columns={columns} rows={filteredRows} keyField={keyField} totalCount={rows.length} />
        </>
      )}
    </div>
  );
}

// ── Residents (with process recordings timeline) ───────────────────────────────

type ResidentRow = {
  residentId: number;
  residentFirstName?: string;
  residentLastName?: string;
  caseControlNo: string;
  safehouseId?: number | null;
  caseStatus: string;
  caseCategory?: string;
  sex: string;
  dateOfAdmission: string;
  currentRiskLevel: string;
  reintegrationStatus: string;
  referralSource?: string;
  assignedSocialWorker: string;
};

function ResidentsPanel({
  role,
}: {
  role: string | null;
}) {
  const [rows, setRows] = useState<ResidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [safehouseFilter, setSafehouseFilter] = useState('All');
  const [caseCategoryFilter, setCaseCategoryFilter] = useState('All');
  const [manageMode, setManageMode] = useState(false);
  const [selectedResident, setSelectedResident] = useState<ResidentRow | null>(null);
  const searchId = useId();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await jsonIfOk(await api('/api/residents'), []);
      setRows(Array.isArray(d) ? d : []);
    } catch {
      setError('Failed to load residents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const columns = useMemo(() => ([
    { key: 'residentId', label: 'ID' }, { key: 'residentName', label: 'Name' }, { key: 'caseControlNo', label: 'Case No.' },
    { key: 'safehouseId', label: 'Safehouse' }, { key: 'caseStatus', label: 'Status' }, { key: 'caseCategory', label: 'Category' }, { key: 'sex', label: 'Sex' },
    { key: 'dateOfAdmission', label: 'Admitted' }, { key: 'currentRiskLevel', label: 'Risk' },
    { key: 'reintegrationStatus', label: 'Reintegration' }, { key: 'referralSource', label: 'Referral' }, { key: 'assignedSocialWorker', label: 'SW' },
  ]), []);

  const rowsWithName = useMemo(() => (
    rows.map((row) => ({
      ...row,
      residentName: [row.residentFirstName, row.residentLastName].filter(Boolean).join(' ').trim() || '—',
    }))
  ), [rows]);

  const statusOptions = useMemo(() => ['All', ...Array.from(new Set(rows.map((r) => String(r.caseStatus ?? '').trim()).filter(Boolean))).sort()], [rows]);
  const safehouseOptions = useMemo(() => ['All', ...Array.from(new Set(rows.map((r) => String(r.safehouseId ?? '').trim()).filter(Boolean))).sort((a, b) => Number(a) - Number(b))], [rows]);
  const caseCategoryOptions = useMemo(() => ['All', ...Array.from(new Set(rows.map((r) => String(r.caseCategory ?? '').trim()).filter(Boolean))).sort()], [rows]);

  const searched = useMemo(
    () => filterTableRows(rowsWithName as unknown as Record<string, unknown>[], columns, query) as unknown as (ResidentRow & { residentName: string })[],
    [rowsWithName, columns, query],
  );

  const filtered = useMemo(() => searched.filter((row) => {
    if (statusFilter !== 'All' && String(row.caseStatus ?? '') !== statusFilter) return false;
    if (safehouseFilter !== 'All' && String(row.safehouseId ?? '') !== safehouseFilter) return false;
    if (caseCategoryFilter !== 'All' && String(row.caseCategory ?? '') !== caseCategoryFilter) return false;
    return true;
  }), [searched, statusFilter, safehouseFilter, caseCategoryFilter]);

  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  const canCreate = role === 'Admin' || role === 'Supervisor' || role === 'CaseManager' || role === 'SocialWorker' || role === 'FieldWorker';
  const canEdit = role === 'Admin' || role === 'Supervisor' || role === 'CaseManager' || role === 'SocialWorker';
  const canDelete = role === 'Admin';
  const canManageCaseload = role === 'Admin' || role === 'Supervisor' || role === 'CaseManager';

  if (manageMode && canManageCaseload) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
          <SectionTitle>Caseload Inventory Management</SectionTitle>
          <button
            onClick={() => setManageMode(false)}
            style={{ background: c.white, color: c.forest, border: `1px solid ${c.sage}`, borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Back to resident list
          </button>
        </div>
        <CrudDataPanel
          title="Resident Profiles"
          url="/api/residents"
          keyField="residentId"
          canCreate
          canUpdate
          columns={[
            { key: 'residentId', label: 'ID' },
            { key: 'residentFirstName', label: 'First Name' },
            { key: 'residentLastName', label: 'Last Name' },
            { key: 'caseControlNo', label: 'Case No.' },
            { key: 'safehouseId', label: 'Safehouse' },
            { key: 'caseStatus', label: 'Status' },
            { key: 'caseCategory', label: 'Case Category' },
            { key: 'subCatTrafficked', label: 'Trafficked' },
            { key: 'subCatPhysicalAbuse', label: 'Physical Abuse' },
            { key: 'subCatSexualAbuse', label: 'Sexual Abuse' },
            { key: 'subCatAtRisk', label: 'At Risk' },
            { key: 'isPwd', label: 'PWD' },
            { key: 'hasSpecialNeeds', label: 'Special Needs' },
            { key: 'familyIs4ps', label: '4Ps' },
            { key: 'familySoloParent', label: 'Solo Parent' },
            { key: 'familyIndigenous', label: 'Indigenous Group' },
            { key: 'familyInformalSettler', label: 'Informal Settler' },
            { key: 'dateOfAdmission', label: 'Admission Date' },
            { key: 'referralSource', label: 'Referral Source' },
            { key: 'assignedSocialWorker', label: 'Assigned SW' },
            { key: 'reintegrationStatus', label: 'Reintegration' },
            { key: 'currentRiskLevel', label: 'Risk' },
          ]}
        />
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>Residents</SectionTitle>
      <p style={{ fontSize: 12, color: c.muted, marginTop: -4, marginBottom: 12 }}>
        Click a resident to view their Process Recordings timeline (and create/edit if permitted).
      </p>
      {canManageCaseload && (
        <div style={{ marginBottom: 10 }}>
          <button
            onClick={() => setManageMode(true)}
            style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}
          >
            Manage resident records
          </button>
        </div>
      )}

      <DataSearchBar id={searchId} value={query} onChange={setQuery} placeholder="Search residents…" />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: c.muted }}>
          Status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            style={{ marginLeft: 6, padding: '5px 8px', borderRadius: 6, border: `1px solid ${c.sageLight}`, background: c.white }}>
            {statusOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 11, color: c.muted }}>
          Safehouse
          <select value={safehouseFilter} onChange={(e) => setSafehouseFilter(e.target.value)}
            style={{ marginLeft: 6, padding: '5px 8px', borderRadius: 6, border: `1px solid ${c.sageLight}`, background: c.white }}>
            {safehouseOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 11, color: c.muted }}>
          Case category
          <select value={caseCategoryFilter} onChange={(e) => setCaseCategoryFilter(e.target.value)}
            style={{ marginLeft: 6, padding: '5px 8px', borderRadius: 6, border: `1px solid ${c.sageLight}`, background: c.white }}>
            {caseCategoryOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <p style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>
          {filtered.length === rows.length ? `${rows.length} records` : `${filtered.length} of ${rows.length} records shown`}
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: c.sageLight }}>
              {columns.map((col) => (
                <th key={col.key} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr
                key={row.residentId}
                onClick={() => setSelectedResident(row)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedResident(row);
                }}
                style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white, cursor: 'pointer' }}
                aria-label={`Open resident ${row.residentId} details`}
              >
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.residentId}</td>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.residentName}</td>
                <td style={{ padding: '8px 12px' }}>{row.caseControlNo ?? '—'}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.safehouseId ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>{row.caseStatus ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>{row.caseCategory ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>{row.sex ?? '—'}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.dateOfAdmission ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>{row.currentRiskLevel ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>{row.reintegrationStatus ?? '—'}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.referralSource ?? '—'}</td>
                <td style={{ padding: '8px 12px', color: c.muted }}>{row.assignedSocialWorker ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedResident && (
        <ResidentProcessRecordingsModal
          residentId={selectedResident.residentId}
          residentLabel={`${[selectedResident.residentFirstName, selectedResident.residentLastName].filter(Boolean).join(' ').trim() || `#${selectedResident.residentId}`} · ${selectedResident.caseControlNo ?? 'Resident'}`}
          onClose={() => setSelectedResident(null)}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}
    </div>
  );
}

function CrudDataPanel({
  title,
  url,
  columns,
  keyField,
  canCreate,
  canUpdate,
}: {
  title: string;
  url: string;
  columns: { key: string; label: string }[];
  keyField: string;
  canCreate: boolean;
  canUpdate: boolean;
}) {
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
  const [residentNameById, setResidentNameById] = useState<Map<number, string>>(new Map());

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await jsonIfOk(await api(url), []);
      setRows(Array.isArray(d) ? d : []);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await jsonIfOk(await api('/api/residents'), []);
        if (!mounted || !Array.isArray(data)) return;
        const next = new Map<number, string>();
        data.forEach((item) => {
          const row = item as { residentId?: unknown; residentFirstName?: unknown; residentLastName?: unknown };
          const id = Number(row.residentId);
          if (!Number.isFinite(id)) return;
          const name = [row.residentFirstName, row.residentLastName]
            .map((v) => String(v ?? '').trim())
            .filter(Boolean)
            .join(' ');
          if (name) next.set(id, name);
        });
        setResidentNameById(next);
      } catch {
        if (mounted) setResidentNameById(new Map());
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      columns.some((col) => {
        const raw = row[col.key];
        if (col.key === 'residentId') {
          const id = Number(raw);
          const name = Number.isFinite(id) ? residentNameById.get(id) : '';
          const residentText = `${String(raw ?? '')} ${name ?? ''}`.toLowerCase();
          return residentText.includes(needle);
        }
        if (raw == null || raw === '') return false;
        return String(raw).toLowerCase().includes(needle);
      }),
    );
  }, [rows, columns, query, residentNameById]);

  const renderCellValue = (row: Record<string, unknown>, key: string) => {
    if (key === 'residentId') {
      const raw = row[key];
      if (raw == null || raw === '') return '—';
      const id = Number(raw);
      const name = Number.isFinite(id) ? residentNameById.get(id) : undefined;
      return name ? `${name} (#${String(raw)})` : `#${String(raw)}`;
    }
    return String(row[key] ?? '—');
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

  const editableColumns = columns.filter((col) => col.key !== keyField);

  const updateDraft = (setter: (updater: (prev: Record<string, unknown> | null) => Record<string, unknown> | null) => void, key: string, value: unknown) => {
    setter((prev) => (prev ? { ...prev, [key]: value } : prev));
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
    const maybeNumber = typeof value === 'number' || /id$|minutes|rate|score|percent|count|value|bmi/i.test(key);
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
          {canCreate && (
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
          )}
          <DataSearchBar id={searchId} value={query} onChange={setQuery} placeholder={`Search ${title.toLowerCase()}…`} />
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
                          {renderCellValue(row, col.key)}
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
                          {canUpdate && (
                            <button
                              onClick={() => setEditRow({ ...row })}
                              aria-label={`Edit ${title} ${String(row[keyField] ?? '')}`}
                              style={{ background: c.goldLight, color: '#5D4037', border: `1px solid ${c.gold}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                            >
                              Edit
                            </button>
                          )}
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

function VisitsAndConferencesPanel({ role }: { role: string | null }) {
  const [plans, setPlans] = useState<Record<string, unknown>[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState('');

  const canUpdateVisits = role !== 'FieldWorker';

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingPlans(true);
      setPlansError('');
      try {
        const data = await jsonIfOk(await api('/api/interventionplans'), []);
        if (!mounted) return;
        setPlans(Array.isArray(data) ? data : []);
      } catch {
        if (mounted) setPlansError('Failed to load case conference history.');
      } finally {
        if (mounted) setLoadingPlans(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const today = new Date();
  const parseDate = (raw: unknown) => {
    if (raw == null) return null;
    const d = new Date(String(raw));
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  const datedPlans = useMemo(
    () =>
      plans
        .map((p) => ({ ...p, _conferenceDate: parseDate(p.caseConferenceDate) }))
        .filter((p) => p._conferenceDate != null) as (Record<string, unknown> & { _conferenceDate: Date })[],
    [plans],
  );

  const upcoming = useMemo(
    () =>
      [...datedPlans]
        .filter((p) => p._conferenceDate >= today)
        .sort((a, b) => a._conferenceDate.getTime() - b._conferenceDate.getTime())
        .slice(0, 12),
    [datedPlans, today],
  );

  const history = useMemo(
    () =>
      [...datedPlans]
        .filter((p) => p._conferenceDate < today)
        .sort((a, b) => b._conferenceDate.getTime() - a._conferenceDate.getTime())
        .slice(0, 12),
    [datedPlans, today],
  );

  return (
    <div>
      <CrudDataPanel
        title="Home Visits"
        url="/api/homevisitations"
        keyField="visitationId"
        canCreate
        canUpdate={canUpdateVisits}
        columns={[
          { key: 'visitationId', label: 'ID' },
          { key: 'visitDate', label: 'Date' },
          { key: 'residentId', label: 'Resident' },
          { key: 'socialWorker', label: 'Social Worker' },
          { key: 'visitType', label: 'Visit Type' },
          { key: 'locationVisited', label: 'Location' },
          { key: 'observations', label: 'Home Environment' },
          { key: 'familyCooperationLevel', label: 'Family Cooperation' },
          { key: 'safetyConcernsNoted', label: 'Safety Concern' },
          { key: 'followUpNeeded', label: 'Follow-up Needed' },
          { key: 'followUpNotes', label: 'Follow-up Actions' },
          { key: 'visitOutcome', label: 'Outcome' },
        ]}
      />

      <SectionTitle>Case Conferences</SectionTitle>
      <p style={{ fontSize: 12, color: c.muted, marginTop: -4, marginBottom: 12 }}>
        Conference schedule and history pulled from intervention plans with conference dates.
      </p>

      {loadingPlans ? (
        <Loading />
      ) : plansError ? (
        <ApiError msg={plansError} retry={() => window.location.reload()} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 12 }}>
          <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 10, padding: '0.75rem 1rem' }}>
            <p style={{ margin: 0, marginBottom: 8, fontSize: 12, fontWeight: 700, color: c.forest }}>Upcoming Conferences</p>
            {upcoming.length === 0 ? (
              <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>No upcoming conferences scheduled.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {upcoming.map((row, i) => (
                  <div key={`${String(row.planId ?? i)}-upcoming`} style={{ border: `1px solid ${c.sageLight}`, borderRadius: 8, background: c.ivory, padding: '8px 10px' }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c.forest }}>
                      Resident #{String(row.residentId ?? '—')} · {String(row.planCategory ?? 'Case Conference')}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: 12, color: c.text }}>
                      {row._conferenceDate.toLocaleDateString()} · Status: {String(row.status ?? '—')}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: 11, color: c.muted }}>
                      Target: {String(row.targetDate ?? '—')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 10, padding: '0.75rem 1rem' }}>
            <p style={{ margin: 0, marginBottom: 8, fontSize: 12, fontWeight: 700, color: c.forest }}>Conference History</p>
            {history.length === 0 ? (
              <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>No conference history available yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {history.map((row, i) => (
                  <div key={`${String(row.planId ?? i)}-history`} style={{ border: `1px solid ${c.sageLight}`, borderRadius: 8, background: c.white, padding: '8px 10px' }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c.forest }}>
                      Resident #{String(row.residentId ?? '—')} · {String(row.planCategory ?? 'Case Conference')}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: 12, color: c.text }}>
                      {row._conferenceDate.toLocaleDateString()} · Status: {String(row.status ?? '—')}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: 11, color: c.muted }}>
                      Notes: {String(row.planDescription ?? '—')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DonorsContributionsPanel({ role }: { role: string | null }) {
  const canManage = role === 'Admin' || role === 'Supervisor' || role === 'CaseManager';

  return (
    <div>
      <SectionTitle>Donors & Contributions</SectionTitle>
      <p style={{ fontSize: 12, color: c.muted, marginTop: -4, marginBottom: 12 }}>
        Manage supporter profiles by type/status, track all contribution types, and review allocations by safehouse and program area.
      </p>

      <CrudDataPanel
        title="Supporter Profiles"
        url="/api/supporters"
        keyField="supporterId"
        canCreate={canManage}
        canUpdate={canManage}
        columns={[
          { key: 'supporterId', label: 'ID' },
          { key: 'displayName', label: 'Display Name' },
          { key: 'supporterType', label: 'Type' },
          { key: 'status', label: 'Status' },
          { key: 'relationshipType', label: 'Relationship' },
          { key: 'organizationName', label: 'Organization' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'country', label: 'Country' },
          { key: 'region', label: 'Region' },
          { key: 'acquisitionChannel', label: 'Acquisition Channel' },
          { key: 'firstDonationDate', label: 'First Donation' },
        ]}
      />

      <CrudDataPanel
        title="Contribution Activity"
        url="/api/donations"
        keyField="donationId"
        canCreate={canManage}
        canUpdate={canManage}
        columns={[
          { key: 'donationId', label: 'ID' },
          { key: 'supporterId', label: 'Supporter' },
          { key: 'donationDate', label: 'Date' },
          { key: 'donationType', label: 'Contribution Type' },
          { key: 'amount', label: 'Amount' },
          { key: 'estimatedValue', label: 'Estimated Value' },
          { key: 'currencyCode', label: 'Currency' },
          { key: 'impactUnit', label: 'Impact Unit' },
          { key: 'campaignName', label: 'Campaign' },
          { key: 'channelSource', label: 'Channel' },
          { key: 'isRecurring', label: 'Recurring' },
          { key: 'notes', label: 'Notes' },
        ]}
      />

      <CrudDataPanel
        title="Donation Allocations"
        url="/api/donationallocations"
        keyField="allocationId"
        canCreate={canManage}
        canUpdate={canManage}
        columns={[
          { key: 'allocationId', label: 'ID' },
          { key: 'donationId', label: 'Donation' },
          { key: 'safehouseId', label: 'Safehouse' },
          { key: 'programArea', label: 'Program Area' },
          { key: 'amountAllocated', label: 'Allocated Amount' },
          { key: 'allocationDate', label: 'Allocation Date' },
          { key: 'allocationNotes', label: 'Allocation Notes' },
        ]}
      />
    </div>
  );
}

// ── Dashboard (role-aware) ────────────────────────────────────────────────────

type EducationAttendanceOkrItem = {
  period: string;
  year: number;
  quarter: number;
  residentCount: number;
  attendanceRateAvg: number | null;
  progressPercentAvg: number | null;
  targetAttendanceRate: number | null;
};

type EducationAttendanceOkrResponse = {
  metricKey: string;
  generatedAtUtc: string;
  items: EducationAttendanceOkrItem[];
};

function StaffDashboard({ role }: { role: string | null }) {
  const [kpis, setKpis] = useState<Record<string, unknown> | null>(null);
  const [okr, setOkr] = useState<EducationAttendanceOkrResponse | null>(null);
  const [okrProcess, setOkrProcess] = useState<QuarterlyRateOkrResponse | null>(null);
  const [okrVisits, setOkrVisits] = useState<QuarterlyRateOkrResponse | null>(null);
  const [okrIncidents, setOkrIncidents] = useState<QuarterlyRateOkrResponse | null>(null);
  const [okrSocialRef, setOkrSocialRef] = useState<QuarterlyRateOkrResponse | null>(null);
  const [okrSocialCtr, setOkrSocialCtr] = useState<QuarterlyRateOkrResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [k, o, op, ov, oi, osr, osc] = await Promise.all([
        api('/api/dashboard/kpis').then((r) => jsonIfOk(r, null)),
        api('/api/okrs/education/attendance/quarterly?take=6').then((r) => jsonIfOk(r, null)),
        api('/api/okrs/healing/process-sessions/quarterly?take=6').then((r) => jsonIfOk(r, null)),
        api('/api/okrs/caring/home-visits/clean-rate/quarterly?take=6').then((r) => jsonIfOk(r, null)),
        api('/api/okrs/healing/incidents/resolution-rate/quarterly?take=6').then((r) => jsonIfOk(r, null)),
        api('/api/okrs/outreach/social/referral-conversion/quarterly?take=6').then((r) => jsonIfOk(r, null)),
        api('/api/okrs/outreach/social/click-through/quarterly?take=6').then((r) => jsonIfOk(r, null)),
      ]);
      setKpis(k);
      setOkr(o);
      setOkrProcess(op);
      setOkrVisits(ov);
      setOkrIncidents(oi);
      setOkrSocialRef(osr);
      setOkrSocialCtr(osc);
    }
    catch { setError('Failed to load dashboard.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  const ops = (kpis as any)?.operations ?? {};
  const donor = (kpis as any)?.donor ?? {};
  const educationItems = ((okr as any)?.items as EducationAttendanceOkrItem[] | undefined ?? []);
  const latest = educationItems[0];
  const att = latest?.attendanceRateAvg;
  const tgt = latest?.targetAttendanceRate;
  const attPct = att != null ? Math.round(att * 100) : null;
  const tgtPct = tgt != null ? Math.round(tgt * 100) : null;
  const progressToTarget = (att != null && tgt != null && tgt > 0) ? Math.min(1, Math.max(0, att / tgt)) : null;

  return (
    <div>
      <SectionTitle>Operations Overview</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <StatCard label="Active Residents" value={ops.activeResidents ?? '—'} accent={c.sageLight} />
        <StatCard label="High Risk" value={ops.highRiskResidents ?? '—'} accent={c.roseLight} />
        <StatCard label="Reintegration Ready" value={ops.reintegrationReadyResidents ?? '—'} accent={c.goldLight} />
        <StatCard label="Process Sessions" value={ops.processSessions ?? '—'} />
        <StatCard label="Home Visits" value={ops.homeVisits ?? '—'} />
      </div>

      <SectionTitle>OKR — Education Attendance (Quarterly)</SectionTitle>
      <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 24 }}>
        {latest ? (
          <>
            <p style={{ fontSize: 12, color: c.muted, marginTop: 0, marginBottom: 10 }}>
              Latest period: <strong style={{ color: c.forest }}>{latest.period}</strong> · {latest.residentCount} residents with records
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
              <StatCard label="Attendance avg" value={attPct != null ? `${attPct}%` : '—'} accent={c.sageLight} />
              <StatCard label="Target" value={tgtPct != null ? `${tgtPct}%` : '—'} accent={c.goldLight} />
              <StatCard label="Edu progress avg" value={latest.progressPercentAvg != null ? `${Number(latest.progressPercentAvg).toFixed(1)}%` : '—'} />
            </div>
            {progressToTarget != null && (
              <div>
                <p style={{ fontSize: 11, color: c.muted, margin: 0, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Progress to target</p>
                <div style={{ background: c.ivory, border: `1px solid ${c.sageLight}`, borderRadius: 999, overflow: 'hidden', height: 10 }}>
                  <div style={{ width: `${Math.round(progressToTarget * 100)}%`, height: '100%', background: c.sage }} />
                </div>
              </div>
            )}
            {educationItems.length > 0 && (
              <div style={{ overflowX: 'auto', marginTop: 14 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: c.sageLight }}>
                      {['Quarter', 'Attendance avg', 'Target', 'Edu progress avg', 'Residents'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {educationItems.map((row: EducationAttendanceOkrItem, i: number) => (
                      <tr key={`${row.period}-${i}`} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                        <td style={{ padding: '8px 12px' }}>{row.period}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.attendanceRateAvg != null ? `${Math.round(row.attendanceRateAvg * 100)}%` : '—'}</td>
                        <td style={{ padding: '8px 12px', color: c.muted }}>{row.targetAttendanceRate != null ? `${Math.round(row.targetAttendanceRate * 100)}%` : '—'}</td>
                        <td style={{ padding: '8px 12px', color: c.muted }}>{row.progressPercentAvg != null ? `${Number(row.progressPercentAvg).toFixed(1)}%` : '—'}</td>
                        <td style={{ padding: '8px 12px', color: c.muted }}>{row.residentCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>
            No OKR data available yet. Add `education_records` and/or set quarterly targets.
          </p>
        )}
      </div>

      <QuarterlyOkrRateSection
        title="OKR — Healing: Process sessions with progress (Quarterly)"
        subtitle="Share of process sessions where progress was noted (numerator / total sessions)."
        response={okrProcess}
        unitLabel="Sessions"
        emptyMessage="No quarterly data yet. Add process recordings with session dates and/or set targets."
      />
      <QuarterlyOkrRateSection
        title="OKR — Caring: Home visits without safety concern (Quarterly)"
        subtitle="Visits where no safety concern was noted, as a share of all dated home visits."
        response={okrVisits}
        unitLabel="Visits"
        emptyMessage="No quarterly data yet. Add home visits with visit dates and/or set targets."
      />
      <QuarterlyOkrRateSection
        title="OKR — Healing: Incident resolution (Quarterly)"
        subtitle="Share of incident reports marked resolved in each quarter."
        response={okrIncidents}
        unitLabel="Incidents"
        emptyMessage="No quarterly data yet. Add incident reports with incident dates and/or set targets."
      />

      <QuarterlyOkrRateSection
        title="OKR — Outreach: Posts that drive donation referrals (Quarterly)"
        subtitle="Share of social posts with at least one recorded donation referral in the quarter."
        response={okrSocialRef}
        unitLabel="Posts"
        emptyMessage="No quarterly social post data yet. Add dated social posts and referral fields."
      />
      <QuarterlyOkrRateSection
        title="OKR — Outreach: Social click-through rate (Quarterly)"
        subtitle="Aggregate CTR for posts dated in each quarter (clicks ÷ impressions)."
        response={okrSocialCtr}
        unitLabel="Clicks vs impressions"
        emptyMessage="No social impressions in dataset for recent quarters."
      />

      {(role === 'Supervisor' || role === 'CaseManager') && (
        <>
          <SectionTitle>Donor Summary</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <StatCard label="Active Supporters" value={donor.activeSupporters ?? '—'} accent={c.goldLight} />
            <StatCard label="Unique Donors" value={donor.uniqueDonors ?? '—'} />
            <StatCard label="Total Monetary" value={donor.totalMonetaryAmount != null ? `₱${Number(donor.totalMonetaryAmount).toLocaleString()}` : '—'} accent={c.goldLight} />
          </div>
        </>
      )}
    </div>
  );
}

// ── Reports (pipelines) ───────────────────────────────────────────────────────

type InsightDonationMonthlyRow = { month: string; totalValuePhp: number; donationCount: number };
type InsightDonationByCampaignRow = { campaignName: string; totalValuePhp: number; donationCount: number; avgValuePhp: number };
type InsightBridgeRow = {
  month: string;
  posts_n: number;
  click_throughs: number;
  donation_referrals: number;
  donation_total_php: number;
  donation_n: number;
  incidents: number;
  avg_edu_progress: number;
  avg_health: number;
};

type EngagementVsVanitySummary = {
  totalPosts: number;
  thresholds: { engagementScoreP75: number; donationReferralsP75: number };
  segments: { segment: string; postCount: number }[];
};

type AnnualAccomplishmentReport = {
  year: number;
  generatedAtUtc: string;
  beneficiaries: { residentBeneficiaries: number; activeResidentsNow: number };
  outcomes: {
    reintegrationReadyNow: number;
    progressSessionRate: number;
    safetyConcernVisitRate: number;
    incidentResolvedRate: number;
    stayedInSchoolRate: number;
    avgEducationProgressPercent: number;
    avgGeneralHealthScore: number;
  };
  services: {
    caring: { homeVisits: number; interventionPlans: number; visitsWithSafetyConcern: number };
    healing: { processSessions: number; sessionsWithProgress: number; healthRecords: number; incidentReports: number; resolvedIncidents: number };
    teaching: { educationRecords: number; enrolledCount: number };
  };
};

function StaffReports() {
  const [annual, setAnnual] = useState<AnnualAccomplishmentReport | null>(null);
  const [annualYear, setAnnualYear] = useState<number>(new Date().getFullYear());
  const [bridge, setBridge] = useState<InsightBridgeRow[]>([]);
  const [campaigns, setCampaigns] = useState<InsightDonationByCampaignRow[]>([]);
  const [monthly, setMonthly] = useState<InsightDonationMonthlyRow[]>([]);
  const [evSummary, setEvSummary] = useState<EngagementVsVanitySummary | null>(null);
  const [campaignTake, setCampaignTake] = useState(12);
  const [bridgeTake, setBridgeTake] = useState(24);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [annualRes, bridgeRes, campaignRes, monthlyRes, evRes] = await Promise.allSettled([
        api(`/api/reports/annual-accomplishment?year=${annualYear}`).then((r) => jsonIfOk(r, null)),
        api(`/api/insights/bridge/monthly?take=${bridgeTake}`).then((r) => jsonIfOk(r, [])),
        api(`/api/insights/donations/by-campaign?take=${campaignTake}`).then((r) => jsonIfOk(r, [])),
        api('/api/insights/donations/monthly?take=120').then((r) => jsonIfOk(r, [])),
        api('/api/insights/social/engagement-vs-vanity').then((r) => jsonIfOk(r, null)),
      ]);

      const nextAnnual =
        annualRes.status === 'fulfilled' && annualRes.value && typeof annualRes.value === 'object' && 'services' in annualRes.value
          ? (annualRes.value as AnnualAccomplishmentReport)
          : null;
      const nextBridge = bridgeRes.status === 'fulfilled' && Array.isArray(bridgeRes.value) ? bridgeRes.value : [];
      const nextCampaigns = campaignRes.status === 'fulfilled' && Array.isArray(campaignRes.value) ? campaignRes.value : [];
      const nextMonthly = monthlyRes.status === 'fulfilled' && Array.isArray(monthlyRes.value) ? monthlyRes.value : [];
      const nextEv = evRes.status === 'fulfilled' && evRes.value && typeof evRes.value === 'object' && 'segments' in evRes.value
        ? evRes.value as EngagementVsVanitySummary
        : null;

      setAnnual(nextAnnual);
      setBridge(nextBridge);
      setCampaigns(nextCampaigns);
      setMonthly(nextMonthly);
      setEvSummary(nextEv);

      if (!nextAnnual && nextBridge.length === 0 && nextCampaigns.length === 0 && nextMonthly.length === 0 && !nextEv) {
        setError('Failed to load reports.');
      }
    } catch { setError('Failed to load reports.'); }
    finally { setLoading(false); }
  }, [annualYear, bridgeTake, campaignTake]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  const bridgeCapped = sortRowsByMonthAsc(capRowsAtChartMaxMonth(bridge, (r) => r.month), (r) => r.month);
  const bridgeByKey = new Map(
    bridgeCapped
      .map((r) => {
        const d = parseMonthStart(r.month);
        if (!d) return null;
        return [monthKey(d), r] as const;
      })
      .filter((x): x is readonly [string, InsightBridgeRow] => x != null),
  );
  const bridgeWindow = buildMonthWindowEndingAtCap(18);
  const bridgeWindowRows = bridgeWindow.map((d) => {
    const row = bridgeByKey.get(monthKey(d));
    return row ?? {
      month: d.toISOString(),
      posts_n: 0,
      click_throughs: 0,
      donation_referrals: 0,
      donation_total_php: 0,
      incidents: 0,
      avg_edu_progress: 0,
      avg_health: 0,
    };
  });
  const last = bridgeWindowRows.length ? bridgeWindowRows[bridgeWindowRows.length - 1] : null;
  const campaignChartData = campaigns.map((r) => ({ name: r.campaignName, total: Number(r.totalValuePhp ?? 0) }));
  const bridgeChartData = bridgeWindowRows.map((r) => ({
    month: new Date(r.month).toLocaleDateString('en-US', { year: '2-digit', month: 'short' }),
    donations: Number(r.donation_total_php ?? 0),
    referrals: Number(r.donation_referrals ?? 0),
    incidents: Number(r.incidents ?? 0),
  }));

  return (
    <div>
      <SectionTitle>Annual Accomplishment Report</SectionTitle>
      <p style={{ fontSize: 12, color: c.muted, marginTop: -4, marginBottom: 12 }}>
        Caring, Healing, and Teaching services + beneficiary counts + outcomes.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: c.muted }}>
          Year:
          <select value={annualYear} onChange={(e) => setAnnualYear(Number(e.target.value))}
            style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 6, border: `1px solid ${c.sageLight}`, background: c.white }}>
            {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        {annual?.generatedAtUtc && (
          <span style={{ fontSize: 12, color: c.muted }}>Generated: {new Date(annual.generatedAtUtc).toLocaleString()}</span>
        )}
      </div>

      {annual ? (
        <>
          <SectionTitle>Beneficiaries</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            <StatCard label="Residents served (unique)" value={annual.beneficiaries.residentBeneficiaries ?? '—'} accent={c.goldLight} />
            <StatCard label="Active residents (current)" value={annual.beneficiaries.activeResidentsNow ?? '—'} />
          </div>

          <SectionTitle>Services</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 18 }}>
            <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: c.forest }}>Caring</p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: c.muted }}>Safety, stability, and continuity of care.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                <StatCard label="Home visits" value={annual.services.caring.homeVisits} />
                <StatCard label="Intervention plans" value={annual.services.caring.interventionPlans} />
                <StatCard label="Safety concerns" value={annual.services.caring.visitsWithSafetyConcern} accent={c.roseLight} />
              </div>
            </div>
            <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: c.forest }}>Healing</p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: c.muted }}>Counseling, wellbeing checks, and incident response.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                <StatCard label="Process sessions" value={annual.services.healing.processSessions} />
                <StatCard label="Progress noted" value={annual.services.healing.sessionsWithProgress} accent={c.goldLight} />
                <StatCard label="Health records" value={annual.services.healing.healthRecords} />
                <StatCard label="Incidents" value={annual.services.healing.incidentReports} accent={c.roseLight} />
              </div>
            </div>
            <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: c.forest }}>Teaching</p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: c.muted }}>Education support and learning progress.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                <StatCard label="Education records" value={annual.services.teaching.educationRecords} />
                <StatCard label="Enrolled records" value={annual.services.teaching.enrolledCount} accent={c.sageLight} />
              </div>
            </div>
          </div>

          <SectionTitle>Outcomes</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
            <StatCard label="Reintegration ready (current)" value={annual.outcomes.reintegrationReadyNow} accent={c.goldLight} />
            <StatCard label="Progress session rate" value={`${Math.round((annual.outcomes.progressSessionRate ?? 0) * 100)}%`} />
            <StatCard label="Safety concern visit rate" value={`${Math.round((annual.outcomes.safetyConcernVisitRate ?? 0) * 100)}%`} />
            <StatCard label="Incident resolved rate" value={`${Math.round((annual.outcomes.incidentResolvedRate ?? 0) * 100)}%`} />
            <StatCard label="Stayed in school rate" value={`${Math.round((annual.outcomes.stayedInSchoolRate ?? 0) * 100)}%`} />
            <StatCard label="Avg education progress" value={`${Number(annual.outcomes.avgEducationProgressPercent ?? 0).toFixed(1)}%`} />
            <StatCard label="Avg health score" value={Number(annual.outcomes.avgGeneralHealthScore ?? 0).toFixed(1)} />
          </div>
        </>
      ) : (
        <p style={{ fontSize: 12, color: c.muted, marginBottom: 18 }}>
          Annual report data is unavailable for the selected year.
        </p>
      )}

      <SocialMediaImpactSection api={api} />

      <SectionTitle>Reports (ML pipelines)</SectionTitle>
      <p style={{ fontSize: 12, color: c.muted, marginTop: -4, marginBottom: 16 }}>
        These are aggregate, planning-focused indicators (not causal claims). Source: <code>/api/insights/*</code>
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: c.muted }}>
          Top campaigns:
          <select value={campaignTake} onChange={(e) => setCampaignTake(Number(e.target.value))}
            style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 6, border: `1px solid ${c.sageLight}`, background: c.white }}>
            {[5, 10, 12, 15, 25].map(n => <option key={n} value={n}>{n}</option>)}
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

      {last && (
        <>
          <SectionTitle>Latest month snapshot</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
            <StatCard label="Month" value={new Date(last.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })} />
            <StatCard label="Donation total" value={`₱${Number(last.donation_total_php).toLocaleString()}`} accent={c.goldLight} />
            <StatCard label="Donation referrals" value={last.donation_referrals} accent={c.roseLight} />
            <StatCard label="Incidents" value={last.incidents} accent={c.roseLight} />
          </div>
        </>
      )}

      <SectionTitle>Campaign effectiveness (top by total PHP)</SectionTitle>
      <p style={{ fontSize: 12, color: c.muted, marginTop: -8, marginBottom: 12 }}>
        Labeled campaigns only; uncategorized gifts are excluded from this breakdown and included in monthly / bridge totals.
      </p>
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
              {['Campaign', 'Donations', 'Total (PHP)', 'Average (PHP)'].map(h => (
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

      <SectionTitle>Outreach ↔ Money ↔ Outcomes (monthly bridge)</SectionTitle>
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
          <p style={{ fontSize: 11, color: c.muted, marginTop: 8 }}>
            Note: series are on the same axis for readability; interpret directionally.
          </p>
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: c.sageLight }}>
              {['Month', 'Posts', 'Clicks', 'Referrals', 'Donations (PHP)', 'Incidents', 'Average Education', 'Average Health'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bridgeWindowRows.map((row, i) => (
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
            { key: 'expectedNextValuePhp', label: 'Expected Next (PHP)' },
            { key: 'recencyDays', label: 'Recency (Days)' },
            { key: 'donationCount', label: 'Donations' },
            { key: 'lastValuePhp', label: 'Last Gift (PHP)' },
            { key: 'lastDonationDate', label: 'Last Date' },
          ]}
        />

        <DataPanel
          title="Post → donation linkage (top groups by estimated value)"
          url="/api/insights/posts/donation-linkage/by-group?group=platform&take=12"
          keyField="key"
          columns={[
            { key: 'key', label: 'Platform' },
            { key: 'postCount', label: 'Posts' },
            { key: 'willReferRate', label: 'Refer Rate' },
            { key: 'avgReferrals', label: 'Average Referrals' },
            { key: 'totalEstimatedValuePhp', label: 'Total Est. PHP' },
            { key: 'boostedRate', label: 'Boosted Rate' },
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
            { key: 'forecastNextMonthIncidents', label: 'Forecast Next Incidents' },
            { key: 'incidentCount', label: 'Incidents' },
            { key: 'incidentLag1', label: 'Incidents Lag 1' },
            { key: 'activeResidents', label: 'Active Residents' },
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
            { key: 'avgLatestProgressPercent', label: 'Average Progress %' },
            { key: 'avgLatestHealthScore', label: 'Average Health' },
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
            { key: 'concernSessions90d', label: 'Concern Sessions 90d' },
            { key: 'safetyVisitFlags90d', label: 'Safety Flags 90d' },
            { key: 'currentRiskLevel', label: 'Current Risk' },
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
            { key: 'homeVisitsLast180d', label: 'Home Visits 180d' },
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

      {monthly.length === 0 && (
        <p style={{ fontSize: 12, color: c.muted, marginTop: 12 }}>
          Note: donations/monthly returned 0 rows. Verify donations exist and donation_date is populated.
        </p>
      )}
    </div>
  );
}

// ── Pending Approvals (Supervisor) ────────────────────────────────────────────

function StaffPendingApprovals({ onQueueChanged }: { onQueueChanged?: () => void }) {
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
    try { const d = await jsonIfOk(await api('/api/auditlogs/pending'), []); setItems(Array.isArray(d) ? d : []); }
    catch { setError('Failed to load.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const act = async (id: number, type: 'approve' | 'reject') => {
    if (type === 'reject' && !window.confirm('Reject this change request?')) return;
    setBusy(id);
    try {
      const r = await api(`/api/auditlogs/${id}/${type}`, { method: 'POST' });
      if (r.ok) { notify(type === 'approve' ? '✓ Approved and applied.' : 'Rejected.'); await load(); onQueueChanged?.(); }
      else notify(`${type} failed.`);
    } finally { setBusy(null); }
  };

  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  return (
    <div>
      {toast && <div style={{ background: c.sageLight, color: c.forest, borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>{toast}</div>}
      <SectionTitle>Pending Change Approvals ({items.length})</SectionTitle>
      {items.length === 0 ? <p style={{ fontSize: 13, color: c.muted }}>No changes awaiting approval.</p> : (
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
                  <p style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{String(item.resource ?? '—')} #{String(item.recordId ?? '—')}</p>
                  {item.notes != null && String(item.notes).trim() !== '' && (
                    <p style={{ fontSize: 12, color: c.muted, marginTop: 3 }}>{String(item.notes)}</p>
                  )}
                  <p style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>{item.timestamp ? new Date(String(item.timestamp)).toLocaleString() : '—'}</p>
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
                <div style={{ display: 'flex', gap: 8 }}>
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

// ── Portal ────────────────────────────────────────────────────────────────────

export default function StaffPortal() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const navItems = useMemo(() => getStaffNavItems(role), [role]);
  const tabSlug = searchParams.get('tab');
  const activeNav = useMemo(() => {
    const n = staffSlugToNavItem(tabSlug, role);
    return navItems.includes(n) ? n : navItems[0] ?? 'Dashboard';
  }, [tabSlug, role, navItems]);

  useEffect(() => {
    const desired = staffNavItemToSlug(activeNav);
    if (searchParams.get('tab') !== desired) {
      setSearchParams({ tab: desired }, { replace: true });
    }
  }, [activeNav, searchParams, setSearchParams]);

  const setTab = (item: string) => setSearchParams({ tab: staffNavItemToSlug(item) }, { replace: true });
  const displayRole = role ?? 'Staff';
  const supervisor = role === 'Supervisor';
  /** Shown in staff portal welcome + sidebar when logged in as Supervisor. */
  const staffDisplayName = supervisor ? 'Lourdes' : (user?.userName ?? 'Staff');
  const { count: pendingAuditCount, refresh: refreshPendingAuditCount } = usePendingAuditApprovalCount(supervisor);
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderContent = () => {
    switch (activeNav) {
      case 'Dashboard': return <StaffDashboard role={role} />;

      case 'Caseload':
      case 'My Residents':
      case 'Residents':
        return <ResidentsPanel role={role} />;

      case 'Session Notes':
        return <CrudDataPanel title="Session Notes" url="/api/processrecordings" keyField="recordingId" canCreate canUpdate columns={[
          { key: 'recordingId', label: 'ID' }, { key: 'sessionDate', label: 'Date' },
          { key: 'residentId', label: 'Resident' }, { key: 'socialWorker', label: 'Social Worker' },
          { key: 'sessionType', label: 'Type' }, { key: 'sessionDurationMinutes', label: 'Duration (min)' },
          { key: 'emotionalStateObserved', label: 'Emotion (Start)' }, { key: 'emotionalStateEnd', label: 'Emotion (End)' },
          { key: 'progressNoted', label: 'Progress' }, { key: 'concernsFlagged', label: 'Concerns' },
        ]} />;

      case 'Visits & Conferences':
      case 'Home Visits':
        return <VisitsAndConferencesPanel role={role} />;

      case 'Intervention Plans':
        return <CrudDataPanel title="Intervention Plans" url="/api/interventionplans" keyField="planId" canCreate canUpdate columns={[
          { key: 'planId', label: 'ID' }, { key: 'residentId', label: 'Resident' },
          { key: 'planCategory', label: 'Category' }, { key: 'planDescription', label: 'Description' },
          { key: 'status', label: 'Status' }, { key: 'targetDate', label: 'Target Date' },
          { key: 'caseConferenceDate', label: 'Conference' },
        ]} />;

      case 'Incident Reports':
        return <CrudDataPanel
          title="Incident Reports"
          url="/api/incidentreports"
          keyField="incidentId"
          canCreate
          canUpdate={role !== 'FieldWorker'}
          columns={[
          { key: 'incidentId', label: 'ID' }, { key: 'incidentDate', label: 'Date' },
          { key: 'residentId', label: 'Resident' }, { key: 'incidentType', label: 'Type' },
          { key: 'severity', label: 'Severity' }, { key: 'resolved', label: 'Resolved' },
          { key: 'reportedBy', label: 'Reported By' },
          ]}
        />;

      case 'Health Records':
        return <CrudDataPanel title="Health & Wellbeing Records" url="/api/healthwellbeingrecords" keyField="healthRecordId" canCreate canUpdate={false} columns={[
          { key: 'healthRecordId', label: 'ID' }, { key: 'residentId', label: 'Resident' },
          { key: 'recordDate', label: 'Date' }, { key: 'generalHealthScore', label: 'Health Score' },
          { key: 'nutritionScore', label: 'Nutrition' }, { key: 'sleepQualityScore', label: 'Sleep' },
          { key: 'bmi', label: 'BMI' }, { key: 'medicalCheckupDone', label: 'Medical ✓' },
          { key: 'psychologicalCheckupDone', label: 'Psych ✓' },
        ]} />;

      case 'Education Records':
        return <CrudDataPanel title="Education Records" url="/api/educationrecords" keyField="educationRecordId" canCreate canUpdate={false} columns={[
          { key: 'educationRecordId', label: 'ID' }, { key: 'residentId', label: 'Resident' },
          { key: 'recordDate', label: 'Date' }, { key: 'educationLevel', label: 'Level' },
          { key: 'schoolName', label: 'School' }, { key: 'enrollmentStatus', label: 'Status' },
          { key: 'attendanceRate', label: 'Attendance %' }, { key: 'progressPercent', label: 'Progress %' },
        ]} />;

      case 'Donors':
        return <DonorsContributionsPanel role={role} />;

      case 'Reports': return <StaffReports />;
      case 'Pending Approvals': return <StaffPendingApprovals onQueueChanged={refreshPendingAuditCount} />;

      default: return <p style={{ fontSize: 14, color: c.muted }}>{activeNav} — coming soon</p>;
    }
  };

  return (
    <DashboardLayout
      sidebar={
        <Sidebar
          id="staff-sidebar"
          items={navItems}
          active={activeNav}
          setActive={setTab}
          badgeCounts={supervisor ? { 'Pending Approvals': pendingAuditCount } : undefined}
          user={`${staffDisplayName} · ${displayRole}`}
          onLogout={handleLogout}
        />
      }
    >
      <section aria-label="Command center"
        style={{ background: STAFF_BANNER_BG, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
        <div>
          <p style={{ fontSize: 12, color: 'rgba(251,248,242,0.72)', marginBottom: 3 }}>{displayRole} Dashboard</p>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: c.ivory, fontWeight: 400, margin: 0 }}>
            Welcome, {staffDisplayName}
          </h1>
        </div>
      </section>
      {renderContent()}
    </DashboardLayout>
  );
}
