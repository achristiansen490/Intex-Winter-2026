import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../../lib/api';

const c = {
  ivory: '#FBF8F2', forest: '#2A4A35', gold: '#D4A44C', rose: '#C4867A',
  roseLight: '#F0D8D4', sage: '#6B9E7E', sageLight: '#D4EAD9', goldLight: '#F5E6C8',
  text: '#2C2B28', muted: '#7A786F', white: '#FFFFFF',
};

type ProcessRecording = {
  recordingId: number;
  residentId: number;
  sessionDate: string | null;
  socialWorker: string | null;
  sessionType: string | null;
  sessionDurationMinutes: number | null;
  emotionalStateObserved: string | null;
  emotionalStateEnd: string | null;
  sessionNarrative: string | null;
  interventionsApplied: string | null;
  followUpActions: string | null;
  progressNoted: boolean | null;
  concernsFlagged: boolean | null;
  referralMade: boolean | null;
  notesRestricted: string | null;
};

const tok = () => localStorage.getItem('hh_token') ?? '';
const api = (url: string, opts?: RequestInit) =>
  fetch(apiUrl(url), { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}`, ...(opts?.headers ?? {}) } });

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString();
}

function boolBadge(v: boolean | null | undefined, yesLabel: string) {
  if (v !== true) return null;
  return <span style={{ background: c.sageLight, color: c.forest, borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{yesLabel}</span>;
}

function TextArea({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={3}
      style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: disabled ? c.ivory : c.white, resize: 'vertical' }}
    />
  );
}

function Input({ value, onChange, type, disabled }: { value: string; onChange: (v: string) => void; type?: string; disabled?: boolean }) {
  return (
    <input
      type={type ?? 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: disabled ? c.ivory : c.white }}
    />
  );
}

function SelectBool({
  value,
  onChange,
  disabled,
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value === null ? '' : value ? 'true' : 'false'}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '') onChange(null);
        else onChange(v === 'true');
      }}
      disabled={disabled}
      style={{ marginTop: 4, width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${c.sageLight}`, background: disabled ? c.ivory : c.white }}
    >
      <option value="">—</option>
      <option value="true">True</option>
      <option value="false">False</option>
    </select>
  );
}

type Draft = {
  sessionDate: string;
  socialWorker: string;
  sessionType: string;
  sessionDurationMinutes: string;
  emotionalStateObserved: string;
  emotionalStateEnd: string;
  sessionNarrative: string;
  interventionsApplied: string;
  followUpActions: string;
  progressNoted: boolean | null;
  concernsFlagged: boolean | null;
  referralMade: boolean | null;
  notesRestricted: string;
};

function blankDraft(): Draft {
  return {
    sessionDate: '',
    socialWorker: '',
    sessionType: '',
    sessionDurationMinutes: '',
    emotionalStateObserved: '',
    emotionalStateEnd: '',
    sessionNarrative: '',
    interventionsApplied: '',
    followUpActions: '',
    progressNoted: null,
    concernsFlagged: null,
    referralMade: null,
    notesRestricted: '',
  };
}

function toDraft(r: ProcessRecording): Draft {
  return {
    sessionDate: r.sessionDate ?? '',
    socialWorker: r.socialWorker ?? '',
    sessionType: r.sessionType ?? '',
    sessionDurationMinutes: r.sessionDurationMinutes != null ? String(r.sessionDurationMinutes) : '',
    emotionalStateObserved: r.emotionalStateObserved ?? '',
    emotionalStateEnd: r.emotionalStateEnd ?? '',
    sessionNarrative: r.sessionNarrative ?? '',
    interventionsApplied: r.interventionsApplied ?? '',
    followUpActions: r.followUpActions ?? '',
    progressNoted: r.progressNoted ?? null,
    concernsFlagged: r.concernsFlagged ?? null,
    referralMade: r.referralMade ?? null,
    notesRestricted: r.notesRestricted ?? '',
  };
}

function draftToPayload(d: Draft): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (d.sessionDate.trim() !== '') payload.sessionDate = d.sessionDate.trim();
  if (d.socialWorker.trim() !== '') payload.socialWorker = d.socialWorker.trim();
  if (d.sessionType.trim() !== '') payload.sessionType = d.sessionType.trim();
  if (d.sessionDurationMinutes.trim() !== '') payload.sessionDurationMinutes = Number(d.sessionDurationMinutes);
  if (d.emotionalStateObserved.trim() !== '') payload.emotionalStateObserved = d.emotionalStateObserved.trim();
  if (d.emotionalStateEnd.trim() !== '') payload.emotionalStateEnd = d.emotionalStateEnd.trim();
  if (d.sessionNarrative.trim() !== '') payload.sessionNarrative = d.sessionNarrative.trim();
  if (d.interventionsApplied.trim() !== '') payload.interventionsApplied = d.interventionsApplied.trim();
  if (d.followUpActions.trim() !== '') payload.followUpActions = d.followUpActions.trim();
  if (d.progressNoted !== null) payload.progressNoted = d.progressNoted;
  if (d.concernsFlagged !== null) payload.concernsFlagged = d.concernsFlagged;
  if (d.referralMade !== null) payload.referralMade = d.referralMade;
  if (d.notesRestricted.trim() !== '') payload.notesRestricted = d.notesRestricted.trim();
  return payload;
}

export function ResidentProcessRecordingsModal({
  residentId,
  residentLabel,
  onClose,
  canCreate,
  canEdit,
  canDelete,
}: {
  residentId: number;
  residentLabel: string;
  onClose: () => void;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [rows, setRows] = useState<ProcessRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(() => blankDraft());

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await api(`/api/processrecordings?residentId=${residentId}`).then((r) => r.json());
      setRows(Array.isArray(d) ? d : []);
    } catch {
      setError('Failed to load process recordings.');
    } finally {
      setLoading(false);
    }
  }, [residentId]);

  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(() => {
    // Backend already sorts, but keep stable fallback in UI.
    const copy = [...rows];
    copy.sort((a, b) => String(b.sessionDate ?? '').localeCompare(String(a.sessionDate ?? '')) || (b.recordingId - a.recordingId));
    return copy;
  }, [rows]);

  const startCreate = () => {
    setEditingId(null);
    setDraft(blankDraft());
    setCreating(true);
  };

  const startEdit = (r: ProcessRecording) => {
    setCreating(false);
    setEditingId(r.recordingId);
    setDraft(toDraft(r));
  };

  const cancelEdit = () => {
    setCreating(false);
    setEditingId(null);
    setDraft(blankDraft());
  };

  const save = async () => {
    if (!canCreate && creating) return;
    if (!canEdit && editingId != null) return;
    setSaving(true);
    try {
      const payload = { residentId, ...draftToPayload(draft) };
      if (creating) {
        const res = await api('/api/processrecordings', { method: 'POST', body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('create failed');
        notify('Created.');
      } else if (editingId != null) {
        const res = await api(`/api/processrecordings/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('update failed');
        notify('Saved.');
      }
      cancelEdit();
      await load();
    } catch {
      notify('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!canDelete) return;
    setSaving(true);
    try {
      const res = await api(`/api/processrecordings/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      notify('Deleted.');
      if (editingId === id) cancelEdit();
      await load();
    } catch {
      notify('Delete failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(44,43,40,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(1100px, 94vw)', maxHeight: '90vh', overflow: 'auto', background: c.white, borderRadius: 14, border: `1px solid ${c.sageLight}`, boxShadow: '0 20px 60px rgba(0,0,0,0.20)' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${c.sageLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, color: c.muted, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Resident</p>
            <h2 style={{ margin: 0, color: c.forest, fontSize: 16 }}>{residentLabel}</h2>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {canCreate && (
              <button onClick={startCreate} style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                New recording
              </button>
            )}
            <button onClick={onClose} style={{ background: 'transparent', color: c.muted, border: `1px solid ${c.sageLight}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>

        <div style={{ padding: '1rem 1.25rem' }}>
          {toast && <div style={{ background: c.sageLight, color: c.forest, borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, fontWeight: 700 }}>{toast}</div>}

          {loading ? (
            <p style={{ fontSize: 13, color: c.muted, textAlign: 'center', marginTop: '2rem' }}>Loading…</p>
          ) : error ? (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <p style={{ fontSize: 13, color: c.rose }}>{error}</p>
              <button onClick={load} style={{ marginTop: 8, fontSize: 12, color: c.forest, background: 'none', border: `1px solid ${c.forest}`, borderRadius: 6, padding: '4px 14px', cursor: 'pointer' }}>Retry</button>
            </div>
          ) : (
            <>
              {(creating || editingId != null) && (
                <div style={{ background: c.ivory, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 14 }}>
                  <h3 style={{ margin: 0, color: c.forest, fontSize: 14 }}>
                    {creating ? 'Create process recording' : `Edit process recording #${editingId}`}
                  </h3>

                  <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 10 }}>
                    <label style={{ fontSize: 11, color: c.muted }}>
                      Session date/time
                      <Input type="datetime-local" value={draft.sessionDate} onChange={(v) => setDraft((p) => ({ ...p, sessionDate: v }))} disabled={saving} />
                    </label>
                    <label style={{ fontSize: 11, color: c.muted }}>
                      Social worker
                      <Input value={draft.socialWorker} onChange={(v) => setDraft((p) => ({ ...p, socialWorker: v }))} disabled={saving} />
                    </label>
                    <label style={{ fontSize: 11, color: c.muted }}>
                      Session type
                      <Input value={draft.sessionType} onChange={(v) => setDraft((p) => ({ ...p, sessionType: v }))} disabled={saving} />
                    </label>
                    <label style={{ fontSize: 11, color: c.muted }}>
                      Duration (minutes)
                      <Input type="number" value={draft.sessionDurationMinutes} onChange={(v) => setDraft((p) => ({ ...p, sessionDurationMinutes: v }))} disabled={saving} />
                    </label>
                    <label style={{ fontSize: 11, color: c.muted }}>
                      Emotional state (start)
                      <Input value={draft.emotionalStateObserved} onChange={(v) => setDraft((p) => ({ ...p, emotionalStateObserved: v }))} disabled={saving} />
                    </label>
                    <label style={{ fontSize: 11, color: c.muted }}>
                      Emotional state (end)
                      <Input value={draft.emotionalStateEnd} onChange={(v) => setDraft((p) => ({ ...p, emotionalStateEnd: v }))} disabled={saving} />
                    </label>
                    <label style={{ fontSize: 11, color: c.muted }}>
                      Progress noted
                      <SelectBool value={draft.progressNoted} onChange={(v) => setDraft((p) => ({ ...p, progressNoted: v }))} disabled={saving} />
                    </label>
                    <label style={{ fontSize: 11, color: c.muted }}>
                      Concerns flagged
                      <SelectBool value={draft.concernsFlagged} onChange={(v) => setDraft((p) => ({ ...p, concernsFlagged: v }))} disabled={saving} />
                    </label>
                    <label style={{ fontSize: 11, color: c.muted }}>
                      Referral made
                      <SelectBool value={draft.referralMade} onChange={(v) => setDraft((p) => ({ ...p, referralMade: v }))} disabled={saving} />
                    </label>
                  </div>

                  <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 10 }}>
                    <label style={{ fontSize: 11, color: c.muted }}>
                      Session narrative
                      <TextArea value={draft.sessionNarrative} onChange={(v) => setDraft((p) => ({ ...p, sessionNarrative: v }))} disabled={saving} />
                    </label>
                    <label style={{ fontSize: 11, color: c.muted }}>
                      Interventions applied
                      <TextArea value={draft.interventionsApplied} onChange={(v) => setDraft((p) => ({ ...p, interventionsApplied: v }))} disabled={saving} />
                    </label>
                    <label style={{ fontSize: 11, color: c.muted }}>
                      Follow-up actions
                      <TextArea value={draft.followUpActions} onChange={(v) => setDraft((p) => ({ ...p, followUpActions: v }))} disabled={saving} />
                    </label>
                    <label style={{ fontSize: 11, color: c.muted }}>
                      Restricted notes (Admin/Supervisor visible)
                      <TextArea value={draft.notesRestricted} onChange={(v) => setDraft((p) => ({ ...p, notesRestricted: v }))} disabled={saving} />
                    </label>
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button disabled={saving} onClick={cancelEdit} style={{ background: 'transparent', color: c.muted, border: `1px solid ${c.sageLight}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>
                      Cancel
                    </button>
                    <button
                      disabled={saving || (creating ? !canCreate : !canEdit)}
                      onClick={save}
                      style={{ background: c.forest, color: c.white, border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 800, opacity: saving ? 0.7 : 1 }}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ margin: 0, fontSize: 12, color: c.muted }}>
                  {sorted.length} recording{sorted.length !== 1 ? 's' : ''} (newest first)
                </p>
              </div>

              {sorted.length === 0 ? (
                <p style={{ fontSize: 13, color: c.muted }}>No process recordings found for this resident.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sorted.map((r) => (
                    <div key={r.recordingId} style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 11, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {fmtDate(r.sessionDate)} · {r.sessionType ?? 'Session'} · {r.sessionDurationMinutes != null ? `${r.sessionDurationMinutes} min` : '—'}
                          </p>
                          <p style={{ margin: '4px 0 0', fontSize: 13, color: c.text }}>
                            <span style={{ fontWeight: 800, color: c.forest }}>Social Worker:</span> {r.socialWorker ?? '—'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {boolBadge(r.progressNoted, 'Progress')}
                          {boolBadge(r.concernsFlagged, 'Concerns')}
                          {boolBadge(r.referralMade, 'Referral')}
                          {canEdit && (
                            <button onClick={() => startEdit(r)} style={{ background: 'transparent', color: c.forest, border: `1px solid ${c.forest}`, borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              disabled={saving}
                              onClick={() => remove(r.recordingId)}
                              style={{ background: c.roseLight, color: c.rose, border: `1px solid ${c.rose}`, borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 800, opacity: saving ? 0.7 : 1 }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 11, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Emotion (start)</p>
                          <p style={{ margin: '3px 0 0', fontSize: 13, color: c.text }}>{r.emotionalStateObserved ?? '—'}</p>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 11, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Emotion (end)</p>
                          <p style={{ margin: '3px 0 0', fontSize: 13, color: c.text }}>{r.emotionalStateEnd ?? '—'}</p>
                        </div>
                      </div>

                      {(r.sessionNarrative || r.interventionsApplied || r.followUpActions || r.notesRestricted) ? (
                        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10 }}>
                          <div>
                            <p style={{ margin: 0, fontSize: 11, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Narrative</p>
                            <p style={{ margin: '3px 0 0', fontSize: 13, color: c.text, whiteSpace: 'pre-wrap' }}>{r.sessionNarrative ?? '—'}</p>
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: 11, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Interventions</p>
                            <p style={{ margin: '3px 0 0', fontSize: 13, color: c.text, whiteSpace: 'pre-wrap' }}>{r.interventionsApplied ?? '—'}</p>
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: 11, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Follow-up</p>
                            <p style={{ margin: '3px 0 0', fontSize: 13, color: c.text, whiteSpace: 'pre-wrap' }}>{r.followUpActions ?? '—'}</p>
                          </div>
                          {r.notesRestricted ? (
                            <div>
                              <p style={{ margin: 0, fontSize: 11, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Restricted notes</p>
                              <p style={{ margin: '3px 0 0', fontSize: 13, color: c.text, whiteSpace: 'pre-wrap' }}>{r.notesRestricted}</p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

