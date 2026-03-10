'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

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

  async function load() {
    const data = await api.getPending();
    setSubmissions(data);
  }

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
      <h2>Moderation Queue ({submissions.length} pending)</h2>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* List */}
        <div style={{ width: 380, overflowY: 'auto', maxHeight: '80vh' }}>
          {submissions.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelected(s)}
              style={{
                padding: 12,
                marginBottom: 8,
                background: selected?.id === s.id ? '#e3f2fd' : 'white',
                border: '1px solid #ddd',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              <strong>{s.user.displayName}</strong>
              <div style={{ fontSize: 13, color: '#555' }}>{s.tournament.name}</div>
              <div style={{ fontSize: 13 }}>{s.fishLengthCm} cm</div>
              {s.flagDuplicateHash && <span style={{ color: 'red', fontSize: 12 }}>⚠ Dup Hash</span>}
              {s.flagDuplicateGps && <span style={{ color: 'orange', fontSize: 12 }}> ⚠ Dup GPS</span>}
            </div>
          ))}
          {submissions.length === 0 && <p>No pending submissions.</p>}
        </div>

        {/* Detail */}
        {selected && (
          <div style={{ flex: 1, background: 'white', padding: 20, borderRadius: 8, border: '1px solid #ddd' }}>
            <h3>{selected.user.displayName} — {selected.fishLengthCm} cm</h3>
            <p>
              <b>Email:</b> {selected.user.email}<br />
              <b>Tournament:</b> {selected.tournament.name}<br />
              <b>Mat Serial:</b> {selected.matSerial.serialCode}<br />
              <b>Captured:</b> {new Date(selected.capturedAt).toLocaleString()}<br />
              <b>GPS:</b> {selected.gpsLat.toFixed(5)}, {selected.gpsLng.toFixed(5)}<br />
              {selected.flagDuplicateHash && <span style={{ color: 'red' }}>⚠ Duplicate image hash detected<br /></span>}
              {selected.flagDuplicateGps && <span style={{ color: 'orange' }}>⚠ Duplicate GPS location<br /></span>}
            </p>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 600 }}>Photo 1 – Fish on mat</p>
                <img
                  src={`${S3_BASE}/${selected.photo1Key}`}
                  alt="Fish on mat"
                  style={{ width: 260, borderRadius: 6, border: '1px solid #ccc' }}
                />
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 600 }}>Photo 2 – Angler holding</p>
                <img
                  src={`${S3_BASE}/${selected.photo2Key}`}
                  alt="Angler holding"
                  style={{ width: 260, borderRadius: 6, border: '1px solid #ccc' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <a
                href={`https://maps.google.com/?q=${selected.gpsLat},${selected.gpsLng}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#1976d2' }}
              >
                📍 View GPS on Google Maps
              </a>
            </div>

            <textarea
              placeholder="Moderation note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 4 }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => act('APPROVE')}
                disabled={loading}
                style={{ background: '#2e7d32', color: 'white', padding: '8px 20px', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                ✓ Approve
              </button>
              <button
                onClick={() => act('REJECT')}
                disabled={loading}
                style={{ background: '#c62828', color: 'white', padding: '8px 20px', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                ✗ Reject
              </button>
              <button
                onClick={() => act('FLAG')}
                disabled={loading}
                style={{ background: '#e65100', color: 'white', padding: '8px 20px', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                ⚑ Flag
              </button>
              <button
                onClick={() => act('SUSPEND_USER')}
                disabled={loading}
                style={{ background: '#4a148c', color: 'white', padding: '8px 20px', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                🚫 Suspend User
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
