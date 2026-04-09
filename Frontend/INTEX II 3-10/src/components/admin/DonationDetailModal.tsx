import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../../lib/api';

const c = {
  ivory: '#FBF8F2',
  forest: '#2A4A35',
  gold: '#D4A44C',
  rose: '#C4867A',
  roseLight: '#F0D8D4',
  sage: '#6B9E7E',
  sageLight: '#D4EAD9',
  text: '#2C2B28',
  muted: '#7A786F',
  white: '#FFFFFF',
};

const tok = () => localStorage.getItem('hh_token') ?? '';
const api = (url: string, opts?: RequestInit) =>
  fetch(apiUrl(url), { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}`, ...(opts?.headers ?? {}) } });

type Donation = {
  donationId: number;
  supporterId: number;
  donationType: string | null;
  donationDate: string | null;
  isRecurring: boolean | null;
  campaignName: string | null;
  channelSource: string | null;
  currencyCode: string | null;
  amount: number | null;
  estimatedValue: number | null;
  impactUnit: string | null;
  notes: string | null;
};

type InKindItem = {
  itemId: number;
  donationId: number;
  itemName: string | null;
  itemCategory: string | null;
  quantity: number | null;
  unitOfMeasure: string | null;
  estimatedUnitValue: number | null;
  intendedUse: string | null;
  receivedCondition: string | null;
};

const CATEGORY_OPTS = ['Food', 'Supplies', 'Clothing', 'SchoolMaterials', 'Hygiene', 'Furniture', 'Medical'] as const;
const UOM_OPTS = ['pcs', 'boxes', 'kg', 'sets', 'packs'] as const;
const INTENDED_USE_OPTS = ['Meals', 'Education', 'Shelter', 'Hygiene', 'Health'] as const;
const CONDITION_OPTS = ['New', 'Good', 'Fair'] as const;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 180, flex: '1 1 180px' }}>
      <div style={{ fontSize: 11, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 13, color: c.text, fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}

export function DonationDetailModal({
  donationId,
  onClose,
  onChanged,
  readOnly = false,
}: {
  donationId: number;
  onClose: () => void;
  onChanged?: () => void;
  readOnly?: boolean;
}) {
  const [donation, setDonation] = useState<Donation | null>(null);
  const [items, setItems] = useState<InKindItem[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<InKindItem, 'itemId'>>({
    donationId,
    itemName: '',
    itemCategory: 'Supplies',
    quantity: 1,
    unitOfMeasure: 'pcs',
    estimatedUnitValue: null,
    intendedUse: 'Shelter',
    receivedCondition: 'Good',
  });

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [d, it, al, sh] = await Promise.all([
        api(`/api/donations/${donationId}`).then((r) => r.json()),
        api(`/api/inkinddonationitems?donationId=${donationId}`).then((r) => r.json()),
        api(`/api/donationallocations?donationId=${donationId}`).then((r) => r.json()),
        api('/api/safehouses').then((r) => r.json()),
      ]);
      setDonation(d && typeof d === 'object' ? (d as Donation) : null);
      setItems(Array.isArray(it) ? (it as InKindItem[]) : []);
      setAllocations(Array.isArray(al) ? (al as Allocation[]) : []);
      setSafehouses(Array.isArray(sh) ? (sh as Safehouse[]) : []);
    } catch {
      setError('Failed to load donation details.');
    } finally {
      setLoading(false);
    }
  }, [donationId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setForm((f) => ({ ...f, donationId }));
  }, [donationId]);

  const isInKind = (donation?.donationType ?? '').toLowerCase() === 'inkind';

  const computedTotal = useMemo(() => {
    const total = items.reduce((sum, x) => sum + (Number(x.quantity ?? 0) * Number(x.estimatedUnitValue ?? 0)), 0);
    return total;
  }, [items]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      donationId,
      itemName: '',
      itemCategory: 'Supplies',
      quantity: 1,
      unitOfMeasure: 'pcs',
      estimatedUnitValue: null,
      intendedUse: 'Shelter',
      receivedCondition: 'Good',
    });
  };

  const startEdit = (row: InKindItem) => {
    setEditingId(row.itemId);
    setForm({
      donationId: row.donationId,
      itemName: row.itemName ?? '',
      itemCategory: (row.itemCategory ?? 'Supplies') as any,
      quantity: row.quantity ?? 1,
      unitOfMeasure: (row.unitOfMeasure ?? 'pcs') as any,
      estimatedUnitValue: row.estimatedUnitValue ?? null,
      intendedUse: (row.intendedUse ?? 'Shelter') as any,
      receivedCondition: (row.receivedCondition ?? 'Good') as any,
    });
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const name = String(form.itemName ?? '').trim();
      const qty = Number(form.quantity ?? 0);
      if (!name) {
        setError('Item name is required.');
        return;
      }
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
        setError('Quantity must be an integer greater than 0.');
        return;
      }

      const payload = {
        donationId,
        itemName: name,
        itemCategory: form.itemCategory,
        quantity: qty,
        unitOfMeasure: form.unitOfMeasure,
        estimatedUnitValue: form.estimatedUnitValue == null || form.estimatedUnitValue === ('' as any)
          ? null
          : Number(form.estimatedUnitValue),
        intendedUse: form.intendedUse,
        receivedCondition: form.receivedCondition,
      };

      let res: Response;
      if (editingId == null) {
        res = await api('/api/inkinddonationitems', { method: 'POST', body: JSON.stringify(payload) });
      } else {
        res = await api(`/api/inkinddonationitems/${editingId}`, { method: 'PUT', body: JSON.stringify({ itemId: editingId, ...payload }) });
      }
      if (!res.ok && res.status !== 201 && res.status !== 204) throw new Error();

      notify(editingId == null ? 'Added item.' : 'Saved changes.');
      resetForm();
      await load();
      onChanged?.();
    } catch {
      setError('Failed to save item.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (itemId: number) => {
    if (readOnly) return;
    if (!window.confirm('Delete this in-kind item?')) return;
    setBusy(true);
    setError('');
    try {
      const r = await api(`/api/inkinddonationitems/${itemId}`, { method: 'DELETE' });
      if (!r.ok && r.status !== 204) throw new Error();
      notify('Deleted item.');
      if (editingId === itemId) resetForm();
      await load();
      onChanged?.();
    } catch {
      setError('Failed to delete item.');
    } finally {
      setBusy(false);
    }
  };

  const [allocEditingId, setAllocEditingId] = useState<number | null>(null);
  const [allocForm, setAllocForm] = useState<Omit<Allocation, 'allocationId'>>({
    donationId,
    safehouseId: 1,
    programArea: 'Operations',
    amountAllocated: null,
    allocationDate: '',
    allocationNotes: '',
  });

  useEffect(() => {
    setAllocForm((f) => ({ ...f, donationId }));
  }, [donationId]);

  useEffect(() => {
    if (safehouses.length > 0 && !safehouses.some((s) => s.safehouseId === allocForm.safehouseId)) {
      setAllocForm((f) => ({ ...f, safehouseId: safehouses[0].safehouseId }));
    }
  }, [safehouses]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetAllocForm = () => {
    setAllocEditingId(null);
    setAllocForm({
      donationId,
      safehouseId: safehouses[0]?.safehouseId ?? 1,
      programArea: 'Operations',
      amountAllocated: null,
      allocationDate: '',
      allocationNotes: '',
    });
  };

  const startEditAlloc = (row: Allocation) => {
    setAllocEditingId(row.allocationId);
    setAllocForm({
      donationId: row.donationId,
      safehouseId: row.safehouseId,
      programArea: row.programArea ?? 'Operations',
      amountAllocated: row.amountAllocated ?? null,
      allocationDate: row.allocationDate ?? '',
      allocationNotes: row.allocationNotes ?? '',
    });
  };

  const saveAlloc = async () => {
    if (readOnly) return;
    setBusy(true);
    setError('');
    try {
      const amt = allocForm.amountAllocated == null ? null : Number(allocForm.amountAllocated);
      if (amt != null && (!Number.isFinite(amt) || amt < 0)) {
        setError('Allocation amount must be 0 or greater.');
        return;
      }

      const payload = {
        donationId,
        safehouseId: Number(allocForm.safehouseId),
        programArea: allocForm.programArea,
        amountAllocated: amt,
        allocationDate: (allocForm.allocationDate ?? '').trim(),
        allocationNotes: (allocForm.allocationNotes ?? '').trim(),
      };

      let res: Response;
      if (allocEditingId == null) {
        res = await api('/api/donationallocations', { method: 'POST', body: JSON.stringify(payload) });
      } else {
        res = await api(`/api/donationallocations/${allocEditingId}`, { method: 'PUT', body: JSON.stringify({ allocationId: allocEditingId, ...payload }) });
      }
      if (!res.ok && res.status !== 201 && res.status !== 204) throw new Error();

      notify(allocEditingId == null ? 'Added allocation.' : 'Saved allocation.');
      resetAllocForm();
      await load();
      onChanged?.();
    } catch {
      setError('Failed to save allocation.');
    } finally {
      setBusy(false);
    }
  };

  const removeAlloc = async (allocationId: number) => {
    if (readOnly) return;
    if (!window.confirm('Delete this allocation?')) return;
    setBusy(true);
    setError('');
    try {
      const r = await api(`/api/donationallocations/${allocationId}`, { method: 'DELETE' });
      if (!r.ok && r.status !== 204) throw new Error();
      notify('Deleted allocation.');
      if (allocEditingId === allocationId) resetAllocForm();
      await load();
      onChanged?.();
    } catch {
      setError('Failed to delete allocation.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Donation ${donationId} details`}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '3rem 1rem',
        overflowY: 'auto',
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ width: 'min(980px, 100%)', background: c.white, borderRadius: 12, border: `1px solid ${c.sageLight}` }}>
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: `1px solid ${c.sageLight}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: c.muted }}>Donation detail</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: c.forest }}>Donation #{donationId}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: `1px solid ${c.sageLight}`,
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
              color: c.text,
              fontWeight: 600,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '1rem 1.25rem' }}>
          {toast && (
            <div style={{ background: c.sageLight, color: c.forest, borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
              {toast}
            </div>
          )}
          {error && <p style={{ color: c.rose, fontSize: 13, marginBottom: 10 }}>{error}</p>}

          {loading ? (
            <p style={{ color: c.muted, fontSize: 13 }}>Loading…</p>
          ) : donation ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                <Field label="Type" value={donation.donationType ?? '—'} />
                <Field label="Date" value={donation.donationDate ? new Date(donation.donationDate).toLocaleDateString() : '—'} />
                <Field label="Supporter ID" value={String(donation.supporterId ?? '—')} />
                <Field label="Campaign" value={donation.campaignName ?? '—'} />
                <Field label="Channel" value={donation.channelSource ?? '—'} />
                <Field label="Recurring" value={donation.isRecurring === true ? 'Yes' : 'No'} />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <Field label="Amount" value={donation.amount != null ? String(donation.amount) : '—'} />
                <Field label="Currency" value={donation.currencyCode ?? '—'} />
                <Field label="Estimated value" value={donation.estimatedValue != null ? String(donation.estimatedValue) : '—'} />
                <Field label="Impact unit" value={donation.impactUnit ?? '—'} />
              </div>

              <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: 13, color: c.forest }}>Allocations</h4>
                  <div style={{ fontSize: 12, color: c.muted }}>{allocations.length} allocation{allocations.length !== 1 ? 's' : ''}</div>
                </div>

                <div style={{ overflowX: 'auto', marginTop: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: c.sageLight }}>
                        {['Safehouse', 'Program area', 'Amount', 'Date', 'Notes', 'Actions'].map((h) => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.length === 0 ? (
                        <tr><td colSpan={6} style={{ padding: '10px 10px', color: c.muted }}>No allocations yet.</td></tr>
                      ) : (
                        allocations.map((a, i) => (
                          <tr key={a.allocationId} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{safehouseLabel(a.safehouseId, safehouses)}</td>
                            <td style={{ padding: '8px 10px', color: c.muted }}>{a.programArea ?? '—'}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 700 }}>{a.amountAllocated != null ? formatMoneyLike(Number(a.amountAllocated)) : '—'}</td>
                            <td style={{ padding: '8px 10px', color: c.muted }}>{a.allocationDate ? new Date(a.allocationDate).toLocaleDateString() : '—'}</td>
                            <td style={{ padding: '8px 10px', color: c.muted, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.allocationNotes ?? '—'}</td>
                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                              {readOnly ? (
                                <span style={{ color: c.muted, fontSize: 12 }}>View only</span>
                              ) : (
                                <>
                                  <button type="button" disabled={busy} onClick={() => startEditAlloc(a)} style={smallBtn()}>
                                    Edit
                                  </button>
                                  <button type="button" disabled={busy} onClick={() => removeAlloc(a.allocationId)} style={dangerBtn()}>
                                    Delete
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {!readOnly && (
                <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: 13, color: c.forest }}>
                      {allocEditingId == null ? 'Add allocation' : `Edit allocation #${allocEditingId}`}
                    </h4>
                    {allocEditingId != null && (
                      <button type="button" onClick={resetAllocForm} style={{ background: 'transparent', border: 'none', color: c.muted, cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>
                        Cancel edit
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 10, marginTop: 10 }}>
                    <div style={{ gridColumn: 'span 4' }}>
                      <Label>Safehouse</Label>
                      <select value={String(allocForm.safehouseId)} onChange={(e) => setAllocForm((f) => ({ ...f, safehouseId: Number(e.target.value) }))} style={inputStyle()} disabled={safehouses.length === 0}>
                        {safehouses.map((s) => (
                          <option key={s.safehouseId} value={s.safehouseId}>
                            {String(s.name ?? s.safehouseCode ?? `Safehouse ${s.safehouseId}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ gridColumn: 'span 3' }}>
                      <Label>Program area</Label>
                      <select value={String(allocForm.programArea ?? '')} onChange={(e) => setAllocForm((f) => ({ ...f, programArea: e.target.value }))} style={inputStyle()}>
                        {PROGRAM_AREA_OPTS.map((x) => (
                          <option key={x} value={x}>{x}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ gridColumn: 'span 3' }}>
                      <Label>Amount (PHP)</Label>
                      <input type="number" min={0} step={0.01} value={allocForm.amountAllocated == null ? '' : String(allocForm.amountAllocated)} onChange={(e) => setAllocForm((f) => ({ ...f, amountAllocated: e.target.value === '' ? null : Number(e.target.value) }))} style={inputStyle()} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <Label>Date</Label>
                      <input type="date" value={allocForm.allocationDate ?? ''} onChange={(e) => setAllocForm((f) => ({ ...f, allocationDate: e.target.value }))} style={inputStyle()} />
                    </div>
                    <div style={{ gridColumn: 'span 10' }}>
                      <Label>Notes</Label>
                      <input value={String(allocForm.allocationNotes ?? '')} onChange={(e) => setAllocForm((f) => ({ ...f, allocationNotes: e.target.value }))} style={inputStyle()} />
                    </div>
                    <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'end', justifyContent: 'flex-end' }}>
                      <button type="button" disabled={busy || safehouses.length === 0} onClick={saveAlloc} style={{ background: c.gold, color: c.text, border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.65 : 1 }}>
                        {busy ? 'Saving…' : allocEditingId == null ? 'Add allocation' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!isInKind ? (
                <div style={{ background: c.ivory, border: `1px solid ${c.sageLight}`, borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ margin: 0, fontSize: 13, color: c.muted }}>
                    This donation is not an <strong>InKind</strong> donation, so there are no line items to manage.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: c.forest }}>In‑kind line items</h3>
                    <div style={{ fontSize: 12, color: c.muted }}>
                      Computed total: <strong style={{ color: c.forest }}>{formatMoneyLike(computedTotal)}</strong>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto', marginBottom: 14 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: c.sageLight }}>
                          {['Item', 'Category', 'Qty', 'UoM', 'Unit value', 'Line total', 'Intended use', 'Condition', 'Actions'].map((h) => (
                            <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: c.forest, fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={9} style={{ padding: '10px 10px', color: c.muted }}>
                              No items yet.
                            </td>
                          </tr>
                        ) : (
                          items.map((it, i) => {
                            const qty = Number(it.quantity ?? 0);
                            const uv = Number(it.estimatedUnitValue ?? 0);
                            const line = qty * uv;
                            return (
                              <tr key={it.itemId} style={{ borderBottom: `1px solid ${c.sageLight}`, background: i % 2 === 0 ? c.ivory : c.white }}>
                                <td style={{ padding: '8px 10px', fontWeight: 600 }}>{it.itemName ?? '—'}</td>
                                <td style={{ padding: '8px 10px', color: c.muted }}>{it.itemCategory ?? '—'}</td>
                                <td style={{ padding: '8px 10px' }}>{it.quantity ?? '—'}</td>
                                <td style={{ padding: '8px 10px', color: c.muted }}>{it.unitOfMeasure ?? '—'}</td>
                                <td style={{ padding: '8px 10px' }}>{it.estimatedUnitValue != null ? formatMoneyLike(Number(it.estimatedUnitValue)) : '—'}</td>
                                <td style={{ padding: '8px 10px', fontWeight: 700 }}>{line ? formatMoneyLike(line) : '—'}</td>
                                <td style={{ padding: '8px 10px', color: c.muted }}>{it.intendedUse ?? '—'}</td>
                                <td style={{ padding: '8px 10px', color: c.muted }}>{it.receivedCondition ?? '—'}</td>
                                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                  {readOnly ? (
                                    <span style={{ color: c.muted, fontSize: 12 }}>View only</span>
                                  ) : (
                                    <>
                                      <button type="button" disabled={busy} onClick={() => startEdit(it)} style={smallBtn()}>
                                        Edit
                                      </button>
                                      <button type="button" disabled={busy} onClick={() => remove(it.itemId)} style={dangerBtn()}>
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {!readOnly && (
                  <div style={{ background: c.white, border: `1px solid ${c.sageLight}`, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, fontSize: 13, color: c.forest }}>
                        {editingId == null ? 'Add item' : `Edit item #${editingId}`}
                      </h4>
                      {editingId != null && (
                        <button
                          type="button"
                          onClick={resetForm}
                          style={{ background: 'transparent', border: 'none', color: c.muted, cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}
                        >
                          Cancel edit
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 10, marginTop: 10 }}>
                      <div style={{ gridColumn: 'span 6' }}>
                        <Label>Item name</Label>
                        <input
                          value={String(form.itemName ?? '')}
                          onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
                          style={inputStyle()}
                        />
                      </div>
                      <div style={{ gridColumn: 'span 3' }}>
                        <Label>Category</Label>
                        <select value={String(form.itemCategory ?? '')} onChange={(e) => setForm((f) => ({ ...f, itemCategory: e.target.value }))} style={inputStyle()}>
                          {CATEGORY_OPTS.map((x) => (
                            <option key={x} value={x}>{x}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ gridColumn: 'span 3' }}>
                        <Label>Intended use</Label>
                        <select value={String(form.intendedUse ?? '')} onChange={(e) => setForm((f) => ({ ...f, intendedUse: e.target.value }))} style={inputStyle()}>
                          {INTENDED_USE_OPTS.map((x) => (
                            <option key={x} value={x}>{x}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ gridColumn: 'span 2' }}>
                        <Label>Qty</Label>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={String(form.quantity ?? '')}
                          onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value === '' ? null : Number(e.target.value) }))} // parsed again on save
                          style={inputStyle()}
                        />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <Label>Unit</Label>
                        <select value={String(form.unitOfMeasure ?? '')} onChange={(e) => setForm((f) => ({ ...f, unitOfMeasure: e.target.value }))} style={inputStyle()}>
                          {UOM_OPTS.map((x) => (
                            <option key={x} value={x}>{x}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ gridColumn: 'span 3' }}>
                        <Label>Unit value (PHP)</Label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={form.estimatedUnitValue == null ? '' : String(form.estimatedUnitValue)}
                          onChange={(e) => setForm((f) => ({ ...f, estimatedUnitValue: e.target.value === '' ? null : Number(e.target.value) }))} // parsed again on save
                          style={inputStyle()}
                        />
                      </div>
                      <div style={{ gridColumn: 'span 3' }}>
                        <Label>Condition</Label>
                        <select value={String(form.receivedCondition ?? '')} onChange={(e) => setForm((f) => ({ ...f, receivedCondition: e.target.value }))} style={inputStyle()}>
                          {CONDITION_OPTS.map((x) => (
                            <option key={x} value={x}>{x}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'end', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={save}
                          style={{
                            background: c.forest,
                            color: c.ivory,
                            border: 'none',
                            borderRadius: 8,
                            padding: '8px 14px',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: busy ? 'wait' : 'pointer',
                            opacity: busy ? 0.65 : 1,
                          }}
                        >
                          {busy ? 'Saving…' : editingId == null ? 'Add item' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                  )}
                </>
              )}
            </>
          ) : (
            <p style={{ color: c.rose, fontSize: 13 }}>Donation not found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 11, color: c.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {children}
    </label>
  );
}

function inputStyle(): React.CSSProperties {
  return { width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${c.sageLight}`, fontSize: 13, boxSizing: 'border-box' };
}

function formatMoneyLike(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(n);
}

type Safehouse = { safehouseId: number; safehouseCode?: string | null; name?: string | null };

type Allocation = {
  allocationId: number;
  donationId: number;
  safehouseId: number;
  programArea: string | null;
  amountAllocated: number | null;
  allocationDate: string | null;
  allocationNotes: string | null;
};

const PROGRAM_AREA_OPTS = ['Education', 'Wellbeing', 'Operations', 'Transport', 'Maintenance', 'Outreach'] as const;

function safehouseLabel(id: number, safehouses: Safehouse[]): string {
  const s = safehouses.find((x) => x.safehouseId === id);
  return String(s?.name ?? s?.safehouseCode ?? `Safehouse ${id}`);
}

function smallBtn(): React.CSSProperties {
  return {
    background: 'transparent',
    border: `1px solid ${c.forest}`,
    color: c.forest,
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    marginRight: 8,
  };
}

function dangerBtn(): React.CSSProperties {
  return {
    background: c.roseLight,
    border: `1px solid ${c.rose}`,
    color: c.rose,
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  };
}

