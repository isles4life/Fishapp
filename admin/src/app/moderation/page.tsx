'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const C = {
  bg: '#3A4C44', surface: '#2E3D38', surfaceHigh: '#445C54',
  border: '#4A6058', accent: '#CFC29C',
  green: '#3DAF5A', greenBg: '#0F3A1E',
  red: '#C0392B', redBg: '#3A1414',
  orange: '#D4820A', orangeBg: '#3A2800',
  text: '#F0EDE4', textSub: '#9DB5A8', textMuted: '#6B7D73',
};

interface Submission {
  id: string;
  user: { displayName: string; email: string };
  tournament: { name: string };
  fishLengthCm: number;
  gpsLat: number;
  gpsLng: number;
  capturedAt: string;
  photo1Key: string | null;
  photo2Key: string;
  photo1Url: string | null;
  photo2Url: string | null;
  flagDuplicateHash: boolean;
  flagDuplicateGps: boolean;
  flagSuspectPhoto: boolean;
  matSerial: { serialCode: string } | null;
  status: string;
}

interface ConfirmState {
  action: string;
  label: string;
  ids: string[];
  isBulk: boolean;
}


const ACTIONS = [
  { action: 'APPROVE',      label: '✓ Approve',  color: '#1a4a1a',   text: C.green,    needsConfirm: false },
  { action: 'REJECT',       label: '✗ Reject',   color: C.redBg,     text: C.red,      needsConfirm: true  },
  { action: 'FLAG',         label: '⚑ Flag',     color: C.orangeBg,  text: C.orange,   needsConfirm: false },
  { action: 'SUSPEND_USER', label: '🚫 Suspend', color: '#2a1040',   text: '#9b59b6',  needsConfirm: true  },
];

export default function ModerationPage() {
  const [tab, setTab] = useState<'pending' | 'flagged'>('pending');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  async function load() {
    const data = tab === 'pending' ? await api.getPending() : await api.getFlagged();
    setSubmissions(data);
    setSelected(null);
    setCheckedIds(new Set());
  }

  useEffect(() => { load(); }, [tab]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function toggleCheck(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (checkedIds.size === submissions.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(submissions.map(s => s.id)));
    }
  }

  // Request an action — shows confirm dialog for dangerous actions
  function requestAction(action: string, ids: string[], isBulk: boolean) {
    const def = ACTIONS.find(a => a.action === action)!;
    if (def.needsConfirm) {
      setConfirm({ action, label: def.label, ids, isBulk });
    } else {
      executeAction(action, ids, isBulk);
    }
  }

  async function executeAction(action: string, ids: string[], isBulk: boolean) {
    setConfirm(null);
    setLoading(true);
    try {
      if (isBulk) {
        const result = await api.moderateBulk(ids, action, note || undefined);
        showToast(`${result.succeeded} approved, ${result.failed} skipped`);
      } else {
        await api.moderate(ids[0], action, note || undefined);
        showToast('Done');
      }
      setSelected(null);
      setNote('');
      setCheckedIds(new Set());
      await load();
    } catch {
      showToast('Error — action failed');
    } finally {
      setLoading(false);
    }
  }

  const allChecked = submissions.length > 0 && checkedIds.size === submissions.length;
  const someChecked = checkedIds.size > 0;

  return (
    <div style={{ position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: C.surfaceHigh, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 18px', fontSize: 14, zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {toast}
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, maxWidth: 400, width: '90%' }}>
            <h3 style={{ color: C.text, margin: '0 0 12px', fontSize: 18 }}>Confirm: {confirm.label}</h3>
            <p style={{ color: C.textSub, fontSize: 14, margin: '0 0 20px' }}>
              {confirm.isBulk
                ? `This will ${confirm.action.toLowerCase()} ${confirm.ids.length} submission${confirm.ids.length > 1 ? 's' : ''}. This cannot be undone.`
                : `Are you sure you want to ${confirm.action.toLowerCase()} this submission?`}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirm(null)} style={{ background: 'transparent', color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 14 }}>
                Cancel
              </button>
              <button onClick={() => executeAction(confirm.action, confirm.ids, confirm.isBulk)} style={{ background: C.redBg, color: C.red, border: `1px solid ${C.red}50`, borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <h2 style={{ color: C.text, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Moderation Queue
          <span style={{ marginLeft: 10, fontSize: 16, color: C.textMuted, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
            {submissions.length} {tab}
          </span>
        </h2>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {(['pending', 'flagged'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
              background: tab === t ? C.accent : 'transparent',
              color: tab === t ? C.bg : C.textMuted,
              border: `1px solid ${tab === t ? C.accent : C.border}`,
            }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* List */}
        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Select-all row */}
          {submissions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', backgroundColor: C.surface, borderRadius: '10px 10px 0 0', border: `1px solid ${C.border}`, borderBottom: 'none' }}>
              <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: C.accent, width: 15, height: 15 }} />
              <span style={{ color: C.textMuted, fontSize: 12 }}>
                {someChecked ? `${checkedIds.size} selected` : 'Select all'}
              </span>
            </div>
          )}

          {/* Bulk action bar */}
          {someChecked && (
            <div style={{ display: 'flex', gap: 6, padding: '8px 10px', backgroundColor: C.surfaceHigh, border: `1px solid ${C.accent}40`, flexWrap: 'wrap' }}>
              {ACTIONS.filter(a => a.action !== 'SUSPEND_USER' && a.action !== 'FLAG').map(({ action, label, text }) => (
                <button key={action} onClick={() => requestAction(action, Array.from(checkedIds), true)} disabled={loading} style={{
                  background: 'transparent', color: text, border: `1px solid ${text}50`,
                  borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                }}>
                  {label} ({checkedIds.size})
                </button>
              ))}
            </div>
          )}

          {/* Submission list */}
          <div style={{ overflowY: 'auto', maxHeight: '72vh', display: 'flex', flexDirection: 'column', gap: 0, border: `1px solid ${C.border}`, borderRadius: submissions.length > 0 ? '0 0 10px 10px' : 10 }}>
            {submissions.length === 0 && (
              <p style={{ color: C.textMuted, textAlign: 'center', padding: 24, margin: 0 }}>
                {tab === 'pending' ? 'No pending submissions.' : 'No flagged submissions.'}
              </p>
            )}
            {submissions.map((s, i) => (
              <div key={s.id} onClick={() => setSelected(s)} style={{
                padding: 12, backgroundColor: selected?.id === s.id ? C.surfaceHigh : C.surface,
                borderBottom: i < submissions.length - 1 ? `1px solid ${C.border}` : 'none',
                cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <div onClick={(e) => toggleCheck(s.id, e)} style={{ paddingTop: 2 }}>
                  <input type="checkbox" checked={checkedIds.has(s.id)} onChange={() => {}} style={{ cursor: 'pointer', accentColor: C.accent, width: 15, height: 15 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{s.user.displayName}</div>
                  <div style={{ color: C.textMuted, fontSize: 11, marginTop: 1 }}>{s.tournament.name}</div>
                  <div style={{ color: C.accent, fontWeight: 700, fontSize: 13, marginTop: 3 }}>{(s.fishLengthCm / 2.54).toFixed(1)}"</div>
                  <div style={{ marginTop: 5, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {s.status !== 'PENDING' && <span style={{ fontSize: 10, color: C.textMuted, background: C.bg, padding: '1px 6px', borderRadius: 4 }}>{s.status}</span>}
                    {s.flagDuplicateHash && <span style={{ fontSize: 10, color: C.red, background: C.redBg, padding: '1px 6px', borderRadius: 4 }}>⚠ Dup Hash</span>}
                    {s.flagDuplicateGps && <span style={{ fontSize: 10, color: C.orange, background: C.orangeBg, padding: '1px 6px', borderRadius: 4 }}>⚠ Dup GPS</span>}
                    {s.flagSuspectPhoto && <span style={{ fontSize: 10, color: C.red, background: C.redBg, padding: '1px 6px', borderRadius: 4 }}>🤖 No Fish Detected</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ flex: 1, backgroundColor: C.surface, borderRadius: 12, padding: 24, border: `1px solid ${C.border}` }}>
            <h3 style={{ color: C.text, margin: '0 0 16px' }}>{selected.user.displayName} — {(selected.fishLengthCm / 2.54).toFixed(1)}"</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', marginBottom: 20, fontSize: 14 }}>
              {([
                ['Email', selected.user.email],
                ['Tournament', selected.tournament.name],
                ['Mat Serial', selected.matSerial?.serialCode ?? '— mat-free'],
                ['Captured', new Date(selected.capturedAt).toLocaleString()],
                ['GPS', `${selected.gpsLat.toFixed(5)}, ${selected.gpsLng.toFixed(5)}`],
                ['Status', selected.status],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k}>
                  <span style={{ color: C.textMuted }}>{k}: </span>
                  <span style={{ color: C.textSub }}>{v}</span>
                </div>
              ))}
            </div>

            {(selected.flagDuplicateHash || selected.flagDuplicateGps || selected.flagSuspectPhoto) && (
              <div style={{ backgroundColor: C.orangeBg, border: `1px solid ${C.orange}40`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
                {selected.flagSuspectPhoto && <div style={{ color: C.red, fontSize: 13, marginBottom: 4 }}>🤖 AI detected no fish in photo — review carefully</div>}
                {selected.flagDuplicateHash && <div style={{ color: C.red, fontSize: 13 }}>⚠ Duplicate image hash detected</div>}
                {selected.flagDuplicateGps && <div style={{ color: C.orange, fontSize: 13 }}>⚠ Duplicate GPS location</div>}
              </div>
            )}

            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              {selected.photo1Url && (
                <div>
                  <p style={{ margin: '0 0 8px', color: C.textSub, fontSize: 13, fontWeight: 600 }}>Photo 1 – Mat</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.photo1Url} alt="Mat photo" style={{ width: 260, borderRadius: 8, border: `1px solid ${C.border}` }} />
                </div>
              )}
              {selected.photo2Url && (
                <div>
                  <p style={{ margin: '0 0 8px', color: C.textSub, fontSize: 13, fontWeight: 600 }}>Fish Photo</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.photo2Url} alt="Fish photo" style={{ width: 260, borderRadius: 8, border: `1px solid ${C.border}` }} />
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <a href={`https://maps.google.com/?q=${selected.gpsLat},${selected.gpsLng}`} target="_blank" rel="noreferrer"
                style={{ color: C.green, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
                📍 View GPS on Google Maps
              </a>
            </div>

            <textarea
              placeholder="Moderation note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              style={{ width: '100%', marginBottom: 14, padding: 10, borderRadius: 8, backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
            />

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {ACTIONS.map(({ action, label, color, text }) => (
                <button key={action} onClick={() => requestAction(action, [selected.id], false)} disabled={loading} style={{
                  background: color, color: text, padding: '9px 20px',
                  border: `1px solid ${text}50`, borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
