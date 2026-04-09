import { useState, useEffect, useCallback, useMemo, useId, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../lib/api';
import { RESIDENT_NAV_ITEMS, residentNavItemToSlug, residentSlugToNavItem } from '../lib/portalTabs';

const c = {
  ivory: '#FBF8F2', forest: '#2A4A35', gold: '#D4A44C', rose: '#C4867A',
  roseLight: '#F0D8D4', sage: '#6B9E7E', sageLight: '#D4EAD9', goldLight: '#F5E6C8',
  text: '#2C2B28', muted: '#7A786F', white: '#FFFFFF',
};
const RESIDENT_BANNER_BG = `linear-gradient(120deg,rgba(42,74,53,0.72) 0%,rgba(107,158,126,0.42) 100%), url("/Smiles under the sun.png") center/cover no-repeat`;
const navItems = [...RESIDENT_NAV_ITEMS];

const tok = () => localStorage.getItem('hh_token') ?? '';
const api = (url: string) =>
  fetch(apiUrl(url), { headers: { Authorization: `Bearer ${tok()}` } });

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
        placeholder={placeholder ?? 'Type to filter…'}
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

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 style={{ fontSize: 15, fontWeight: 600, color: c.forest, marginBottom: 12, marginTop: 0, paddingBottom: 6, borderBottom: `1px solid ${c.sageLight}` }}>{children}</h2>;
}

function Field({ label, value, fullWidth }: { label: string; value: unknown; fullWidth?: boolean }) {
  return (
    <div style={{ marginBottom: 14, flex: fullWidth ? '1 1 100%' : '1 1 200px' }}>
      <p style={{ fontSize: 11, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{label}</p>
      <p style={{ fontSize: 13, color: c.text }}>
        {value != null && value !== '' && value !== false
          ? (typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value))
          : <span style={{ color: c.muted, fontStyle: 'italic' }}>—</span>}
      </p>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  const pct = score != null ? Math.round((score / 10) * 100) : 0;
  const color = pct >= 70 ? c.sage : pct >= 40 ? c.gold : c.rose;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: c.text }}>{label}</span>
        <span style={{ fontSize: 12, color: c.muted }}>{score != null ? `${score}/10` : '—'}</span>
      </div>
      <div style={{ background: c.sageLight, borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
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

// ── My Profile ────────────────────────────────────────────────────────────────

function MyProfile({ residentId }: { residentId: number | null }) {
  const { user } = useAuth();
  const [resident, setResident] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api('/api/residents').then(r => r.json());
      const arr = Array.isArray(data) ? data : [];
      setResident(residentId != null ? (arr.find((r: any) => r.residentId === residentId) ?? arr[0] ?? null) : arr[0] ?? null);
    } catch { setError('Failed to load profile.'); }
    finally { setLoading(false); }
  }, [residentId]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  return (
    <div>
      <SectionTitle>My Account</SectionTitle>
      <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 0 }}>
        <Field label="Username" value={user?.userName} />
        <Field label="Email" value={user?.email} />
      </div>

      {resident ? (
        <>
          <SectionTitle>Personal Information</SectionTitle>
          <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1.25rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0 2rem' }}>
            <Field label="Case Control No." value={resident.caseControlNo} />
            <Field label="Date of Birth" value={resident.dateOfBirth} />
            <Field label="Age" value={resident.presentAge} />
            <Field label="Sex" value={resident.sex} />
            <Field label="Religion" value={resident.religion} />
            <Field label="Place of Birth" value={resident.placeOfBirth} />
            <Field label="Date of Admission" value={resident.dateOfAdmission} />
            <Field label="Assigned Social Worker" value={resident.assignedSocialWorker} />
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13, color: c.muted }}>No resident record linked to your account.</p>
      )}
    </div>
  );
}

// ── My Progress ───────────────────────────────────────────────────────────────

function MyProgress({ residentId }: { residentId: number | null }) {
  const [resident, setResident] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api('/api/residents').then(r => r.json());
      const arr = Array.isArray(data) ? data : [];
      setResident(residentId != null ? (arr.find((r: any) => r.residentId === residentId) ?? arr[0] ?? null) : arr[0] ?? null);
    } catch { setError('Failed to load progress.'); }
    finally { setLoading(false); }
  }, [residentId]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;
  if (!resident) return <p style={{ fontSize: 13, color: c.muted }}>No data available.</p>;

  const statusColor = (val: unknown, greenVal: string, redVal: string) => {
    if (!val) return c.muted;
    const s = String(val).toLowerCase();
    if (s.includes(greenVal.toLowerCase())) return '#1B5E20';
    if (s.includes(redVal.toLowerCase())) return c.rose;
    return c.text;
  };

  const badge = (val: unknown, label: string) => (
    <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.5rem', flex: '1 1 200px', textAlign: 'center' }}>
      <p style={{ fontSize: 11, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 600, color: statusColor(val, 'active', 'closed') }}>{val != null ? String(val) : '—'}</p>
    </div>
  );

  return (
    <div>
      <SectionTitle>Case Status</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        {badge(resident.caseStatus, 'Case Status')}
        {badge(resident.reintegrationStatus, 'Reintegration Status')}
        {badge(resident.currentRiskLevel, 'Current Risk Level')}
        {badge(resident.reintegrationType, 'Reintegration Type')}
      </div>

      <SectionTitle>Timeline</SectionTitle>
      <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1.25rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0 2rem' }}>
        <Field label="Date of Admission" value={resident.dateOfAdmission} />
        <Field label="Length of Stay" value={resident.lengthOfStay} />
        <Field label="Date Enrolled" value={resident.dateEnrolled} />
        {resident.dateClosed != null && String(resident.dateClosed).trim() !== '' ? (
          <Field label="Date Closed" value={resident.dateClosed} />
        ) : null}
        <Field label="Initial Risk Level" value={resident.initialRiskLevel} />
        <Field label="Initial Assessment" value={resident.initialCaseAssessment} fullWidth />
      </div>
    </div>
  );
}

// ── Health & Wellbeing ────────────────────────────────────────────────────────

function HealthWellbeing({ residentId }: { residentId: number | null }) {
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const tableSearchId = useId();
  const [tableQuery, setTableQuery] = useState('');

  const filteredTableRecords = useMemo(
    () => filterRecordsByText(records, tableQuery),
    [records, tableQuery],
  );

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const d = await api('/api/healthwellbeingrecords').then(r => r.json()); setRecords(Array.isArray(d) ? d : []); }
    catch { setError('Failed to load health records.'); }
    finally { setLoading(false); }
  }, [residentId]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;
  if (records.length === 0) return (
    <div>
      <SectionTitle>Health & Wellbeing</SectionTitle>
      <p style={{ fontSize: 13, color: c.muted }}>No health records on file yet.</p>
    </div>
  );

  const latest = records[0] as any;

  return (
    <div>
      <SectionTitle>
        {`Latest Health Record (${latest.recordDate ? new Date(latest.recordDate).toLocaleDateString() : '—'})`}
      </SectionTitle>

      <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 16, marginBottom: 20 }}>
          {latest.heightCm && <Field label="Height" value={`${latest.heightCm} cm`} />}
          {latest.weightKg && <Field label="Weight" value={`${latest.weightKg} kg`} />}
          {latest.bmi && <Field label="BMI" value={Number(latest.bmi).toFixed(1)} />}
        </div>
        <ScoreBar label="General Health" score={latest.generalHealthScore} />
        <ScoreBar label="Nutrition" score={latest.nutritionScore} />
        <ScoreBar label="Sleep Quality" score={latest.sleepQualityScore} />
        <ScoreBar label="Energy Level" score={latest.energyLevelScore} />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
          {[
            { label: 'Medical Checkup', val: latest.medicalCheckupDone },
            { label: 'Dental Checkup', val: latest.dentalCheckupDone },
            { label: 'Psychological Checkup', val: latest.psychologicalCheckupDone },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, background: val ? c.sageLight : c.ivory, borderRadius: 8, padding: '6px 14px', fontSize: 12 }}>
              <span style={{ fontSize: 14 }}>{val ? '✓' : '○'}</span>
              <span style={{ color: val ? '#1B5E20' : c.muted }}>{label}</span>
            </div>
          ))}
        </div>
        {latest.notes != null && String(latest.notes) !== '' && (
          <p style={{ fontSize: 12, color: c.muted, marginTop: 12 }}>{String(latest.notes)}</p>
        )}
      </div>

      {records.length > 1 && (
        <>
          <SectionTitle>All Records ({records.length})</SectionTitle>
          <DataSearchBar
            id={tableSearchId}
            value={tableQuery}
            onChange={setTableQuery}
            placeholder="Filter records by date, scores, or notes…"
          />
          {filteredTableRecords.length === 0 && tableQuery.trim() !== '' ? (
            <p style={{ fontSize: 13, color: c.muted }}>No rows match your search.</p>
          ) : (
          <div style={{ overflowX: 'auto' }}>
            <p style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>
              {filteredTableRecords.length === records.length
                ? `${filteredTableRecords.length} records`
                : `${filteredTableRecords.length} of ${records.length} records shown`}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: c.sageLight }}>
                  {['Date', 'Health', 'Nutrition', 'Sleep', 'Energy', 'BMI'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.forest, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTableRecords.map((r: any, i) => (
                  <tr key={r.healthRecordId} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                    <td style={{ padding: '8px 12px', color: c.text }}>{r.recordDate ? new Date(r.recordDate).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '8px 12px', color: c.text }}>{r.generalHealthScore ?? '—'}</td>
                    <td style={{ padding: '8px 12px', color: c.text }}>{r.nutritionScore ?? '—'}</td>
                    <td style={{ padding: '8px 12px', color: c.text }}>{r.sleepQualityScore ?? '—'}</td>
                    <td style={{ padding: '8px 12px', color: c.text }}>{r.energyLevelScore ?? '—'}</td>
                    <td style={{ padding: '8px 12px', color: c.text }}>{r.bmi != null ? Number(r.bmi).toFixed(1) : '—'}</td>
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

// ── Education ─────────────────────────────────────────────────────────────────

function Education({ residentId }: { residentId: number | null }) {
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const eduSearchId = useId();
  const [eduQuery, setEduQuery] = useState('');

  const filteredEdu = useMemo(() => filterRecordsByText(records, eduQuery), [records, eduQuery]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const d = await api('/api/educationrecords').then(r => r.json()); setRecords(Array.isArray(d) ? d : []); }
    catch { setError('Failed to load education records.'); }
    finally { setLoading(false); }
  }, [residentId]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  return (
    <div>
      <SectionTitle>Education Records ({records.length})</SectionTitle>
      {records.length === 0 ? <p style={{ fontSize: 13, color: c.muted }}>No education records on file.</p> : (
        <>
          <DataSearchBar
            id={eduSearchId}
            value={eduQuery}
            onChange={setEduQuery}
            placeholder="Search by school, level, status, or notes…"
          />
          {filteredEdu.length === 0 && eduQuery.trim() !== '' ? (
            <p style={{ fontSize: 13, color: c.muted }}>No records match your search.</p>
          ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredEdu.map((r: any) => (
            <div key={r.educationRecordId} style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: c.forest }}>{r.schoolName ?? 'School not specified'}</p>
                  <p style={{ fontSize: 12, color: c.muted }}>{r.educationLevel ?? '—'} · {r.recordDate ? new Date(r.recordDate).toLocaleDateString() : '—'}</p>
                </div>
                <span style={{ background: r.enrollmentStatus === 'Enrolled' ? c.sageLight : c.goldLight, color: r.enrollmentStatus === 'Enrolled' ? '#1B5E20' : '#5D4037', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>
                  {r.enrollmentStatus ?? 'Unknown'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 24 }}>
                {r.attendanceRate != null && (
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, color: c.muted, marginBottom: 4 }}>Attendance</p>
                    <div style={{ background: c.sageLight, borderRadius: 4, height: 8 }}>
                      <div style={{ width: `${Math.min(r.attendanceRate, 100)}%`, height: '100%', background: r.attendanceRate >= 80 ? c.sage : r.attendanceRate >= 50 ? c.gold : c.rose, borderRadius: 4 }} />
                    </div>
                    <p style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{r.attendanceRate}%</p>
                  </div>
                )}
                {r.progressPercent != null && (
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, color: c.muted, marginBottom: 4 }}>Progress</p>
                    <div style={{ background: c.sageLight, borderRadius: 4, height: 8 }}>
                      <div style={{ width: `${Math.min(r.progressPercent, 100)}%`, height: '100%', background: c.gold, borderRadius: 4 }} />
                    </div>
                    <p style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{r.progressPercent}%</p>
                  </div>
                )}
              </div>
              {r.notes && <p style={{ fontSize: 12, color: c.muted, marginTop: 10 }}>{r.notes}</p>}
            </div>
          ))}
        </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Visit Schedule ────────────────────────────────────────────────────────────

function VisitSchedule({ residentId }: { residentId: number | null }) {
  const [visits, setVisits] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const visitSearchId = useId();
  const [visitQuery, setVisitQuery] = useState('');

  const filteredVisits = useMemo(() => filterRecordsByText(visits, visitQuery), [visits, visitQuery]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const d = await api('/api/homevisitations').then(r => r.json()); setVisits(Array.isArray(d) ? d : []); }
    catch { setError('Failed to load visit schedule.'); }
    finally { setLoading(false); }
  }, [residentId]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  return (
    <div>
      <SectionTitle>Visit History ({visits.length})</SectionTitle>
      {visits.length === 0 ? <p style={{ fontSize: 13, color: c.muted }}>No visits recorded.</p> : (
        <>
          <DataSearchBar
            id={visitSearchId}
            value={visitQuery}
            onChange={setVisitQuery}
            placeholder="Search visits by type, date, location, or outcome…"
          />
          {filteredVisits.length === 0 && visitQuery.trim() !== '' ? (
            <p style={{ fontSize: 13, color: c.muted }}>No visits match your search.</p>
          ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredVisits.map((v: any) => (
            <div key={v.visitationId} style={{
              background: c.white,
              borderTop: `1px solid ${c.sageLight}`,
              borderRight: `1px solid ${c.sageLight}`,
              borderBottom: `1px solid ${c.sageLight}`,
              borderLeft: `4px solid ${v.safetyConcernsNoted ? c.rose : c.sage}`,
              borderRadius: 12,
              padding: '1rem 1.25rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: c.forest }}>{v.visitType ?? 'Home Visit'}</p>
                  <p style={{ fontSize: 12, color: c.muted }}>{v.visitDate ? new Date(v.visitDate).toLocaleDateString() : '—'} · {v.locationVisited ?? 'Location not specified'}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {v.safetyConcernsNoted && <span style={{ background: c.roseLight, color: c.rose, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>Safety Concern</span>}
                  {v.followUpNeeded && <span style={{ background: c.goldLight, color: '#5D4037', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>Follow-up Needed</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 2rem' }}>
                {v.socialWorker && <Field label="Social Worker" value={v.socialWorker} />}
                {v.purpose && <Field label="Purpose" value={v.purpose} fullWidth />}
                {v.visitOutcome && <Field label="Outcome" value={v.visitOutcome} fullWidth />}
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

// ── My Goals ─────────────────────────────────────────────────────────────────

function MyGoals({ residentId }: { residentId: number | null }) {
  const [plans, setPlans] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const goalsSearchId = useId();
  const [goalsQuery, setGoalsQuery] = useState('');

  const filteredPlans = useMemo(() => filterRecordsByText(plans, goalsQuery), [plans, goalsQuery]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const d = await api('/api/interventionplans').then(r => r.json()); setPlans(Array.isArray(d) ? d : []); }
    catch { setError('Failed to load goals.'); }
    finally { setLoading(false); }
  }, [residentId]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (error) return <ApiError msg={error} retry={load} />;

  const statusColor = (s: string | null | undefined) => {
    if (!s) return c.muted;
    const l = s.toLowerCase();
    if (l.includes('complet') || l.includes('achiev')) return '#1B5E20';
    if (l.includes('progress') || l.includes('active') || l.includes('ongoing')) return c.forest;
    if (l.includes('pending') || l.includes('planned')) return '#5D4037';
    return c.muted;
  };

  return (
    <div>
      <SectionTitle>My Intervention Goals ({plans.length})</SectionTitle>
      {plans.length === 0 ? <p style={{ fontSize: 13, color: c.muted }}>No intervention plans on file.</p> : (
        <>
          <DataSearchBar
            id={goalsSearchId}
            value={goalsQuery}
            onChange={setGoalsQuery}
            placeholder="Search goals by category, status, or description…"
          />
          {filteredPlans.length === 0 && goalsQuery.trim() !== '' ? (
            <p style={{ fontSize: 13, color: c.muted }}>No goals match your search.</p>
          ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredPlans.map((p: any) => (
            <div key={p.planId} style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: c.forest, fontFamily: 'Georgia, serif' }}>{p.planCategory ?? 'Goal'}</p>
                  {p.planDescription && <p style={{ fontSize: 13, color: c.text, marginTop: 4, lineHeight: 1.5 }}>{p.planDescription}</p>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: statusColor(p.status), background: c.sageLight, borderRadius: 20, padding: '3px 12px', whiteSpace: 'nowrap' }}>
                  {p.status ?? 'Unknown'}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 2rem' }}>
                {p.servicesProvided && <Field label="Services Provided" value={p.servicesProvided} fullWidth />}
                {p.targetDate && <Field label="Target Date" value={new Date(p.targetDate).toLocaleDateString()} />}
                {p.caseConferenceDate && <Field label="Case Conference" value={new Date(p.caseConferenceDate).toLocaleDateString()} />}
                {p.targetValue != null && <Field label="Target Value" value={p.targetValue} />}
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

export default function ResidentPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabSlug = searchParams.get('tab');
  const activeNav = useMemo(() => {
    const n = residentSlugToNavItem(tabSlug);
    return (navItems as readonly string[]).includes(n) ? n : 'My Profile';
  }, [tabSlug]);

  useEffect(() => {
    const desired = residentNavItemToSlug(activeNav);
    if (searchParams.get('tab') !== desired) {
      setSearchParams({ tab: desired }, { replace: true });
    }
  }, [activeNav, searchParams, setSearchParams]);

  const setTab = (item: string) => setSearchParams({ tab: residentNavItemToSlug(item) }, { replace: true });
  const residentId = user?.residentId ?? null;
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderContent = () => {
    switch (activeNav) {
      case 'My Profile':       return <MyProfile residentId={residentId} />;
      case 'My Progress':      return <MyProgress residentId={residentId} />;
      case 'Health & Wellbeing': return <HealthWellbeing residentId={residentId} />;
      case 'Education':        return <Education residentId={residentId} />;
      case 'Visit Schedule':   return <VisitSchedule residentId={residentId} />;
      case 'My Goals':         return <MyGoals residentId={residentId} />;
      default: return null;
    }
  };

  return (
    <main id="main-content" style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
      <Sidebar id="resident-sidebar" items={navItems} active={activeNav} setActive={setTab}
        user={user?.userName ?? 'Resident'} onLogout={handleLogout} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
        <section aria-label="Welcome"
          style={{ background: RESIDENT_BANNER_BG, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <p style={{ fontSize: 12, color: 'rgba(251,248,242,0.65)', marginBottom: 3 }}>Your safe space</p>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: c.ivory, fontWeight: 400, margin: 0 }}>
              Welcome, {user?.userName ?? 'Resident'}
            </h1>
          </div>
        </section>
        {renderContent()}
      </div>
    </main>
  );
}
