'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const C = {
  bg: '#0d1821', surface: '#162032', surfaceHigh: '#1e2d40',
  border: '#2a3f55', green: '#2ecc71', red: '#e74c3c', orange: '#e67e22',
  text: '#e8f0fe', textSub: '#7a9bbf', textMuted: '#4a6580',
};

interface Submission {
  id: string;
  user: { displayName: string; email: string };
  tournament: { name: string };
  fishLengthCm: number;
  gpsLat: number;
  gpsLng: number;
  capturedAt: string;
  photo1Key: string;
  photo2Key: string;
  flagDuplicateHash: boolean;
  flagDuplicateGps: boolean;
  matSerial: { serialCode: string };
  status: string;
}

const S3_BASE = process.env.NEXT_PUBLIC_S3_BASE ?? 'https://fishleague-submissions.s3.amazonaws.com';

export default function ModerationPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() { setSubmissions(await api.getPending()); }
  useEffect(() => { load(); }, []);

  async function act(action: string) {
    if (!selected) return;
    setLoading(true);
    await api.moderate(selected.id, action, note);
    setSelected(null);
    setNote('');
    await load();
    setLoading(false);
  }

  return (
    <div>
      <h2 style={{ color: C.text, marginBottom: 20 }}>
        Moderation Queue
        <span style={{ marginLeft: 10, fontSize: 16, color: C.textMuted, fontWeight: 400 }}>
          {submissions.length} pending
        </span>
      </h2>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* List */}
        <div style={{ width: 300, flexShrink: 0, overflowY: 'auto', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {submissions.length === 0 && (
            <p style={{ color: C.textMuted, textAlign: 'center', padding: 24 }}>No pending submissions.</p>
          )}
          {submissions.map((s) => (
            <div key={s.id} onClick={() => setSelected(s)} style={{
              padding: 14, backgroundColor: selected?.id === s.id ? C.surfaceHigh : C.surface,
              border: `1px solid ${selected?.id === s.id ? C.green + '60' : C.border}`,
              borderRadius: 10, cursor: 'pointer',
            }}>
              <div style={{ color: C.text, fontWeight: 600, fontSize: 15 }}>{s.user.displayName}</div>
              <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{s.tournament.name}</div>
              <div style={{ color: C.green, fontWeight: 700, fontSize: 14, marginTop: 4 }}>{s.fishLengthCm} cm</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                {s.flagDuplicateHash && <span style={{ fontSize: 11, color: C.red, background: C.red + '20', padding: '2px 8px', borderRadius: 4 }}>⚠ Dup Hash</span>}
                {s.flagDuplicateGps && <span style={{ fontSize: 11, color: C.orange, background: C.orange + '20', padding: '2px 8px', borderRadius: 4 }}>⚠ Dup GPS</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
        {selected && (
          <div style={{ flex: 1, backgroundColor: C.surface, borderRadius: 12, padding: 24, border: `1px solid ${C.border}` }}>
            <h3 style={{ color: C.text, margin: '0 0 16px' }}>{selected.user.displayName} — {selected.fishLengthCm} cm</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', marginBottom: 20, fontSize: 14 }}>
              {[
                ['Email', selected.user.email],
                ['Tournament', selected.tournament.name],
                ['Mat Serial', selected.matSerial.serialCode],
                ['Captured', new Date(selected.capturedAt).toLocaleString()],
                ['GPS', `${selected.gpsLat.toFixed(5)}, ${selected.gpsLng.toFixed(5)}`],
              ].map(([k, v]) => (
                <div key={k}>
                  <span style={{ color: C.textMuted }}>{k}: </span>
                  <span style={{ color: C.textSub }}>{v}</span>
                </div>
              ))}
            </div>

            {(selected.flagDuplicateHash || selected.flagDuplicateGps) && (
              <div style={{ backgroundColor: '#2a1500', border: `1px solid ${C.orange}40`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
                {selected.flagDuplicateHash && <div style={{ color: C.red, fontSize: 13 }}>⚠ Duplicate image hash detected</div>}
                {selected.flagDuplicateGps && <div style={{ color: C.orange, fontSize: 13 }}>⚠ Duplicate GPS location</div>}
              </div>
            )}

            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              {[['Photo 1 – Fish on mat', selected.photo1Key], ['Photo 2 – Angler holding', selected.photo2Key]].map(([label, key]) => (
                <div key={label}>
                  <p style={{ margin: '0 0 8px', color: C.textSub, fontSize: 13, fontWeight: 600 }}>{label}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${S3_BASE}/${key}`} alt={label} style={{ width: 260, borderRadius: 8, border: `1px solid ${C.border}` }} />
                </div>
              ))}
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
              {[
                { action: 'APPROVE', label: '✓ Approve', color: '#2e7d32' },
                { action: 'REJECT', label: '✗ Reject', color: '#c62828' },
                { action: 'FLAG', label: '⚑ Flag', color: '#e65100' },
                { action: 'SUSPEND_USER', label: '🚫 Suspend', color: '#4a148c' },
              ].map(({ action, label, color }) => (
                <button key={action} onClick={() => act(action)} disabled={loading} style={{
                  background: color, color: 'white', padding: '9px 20px',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
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
