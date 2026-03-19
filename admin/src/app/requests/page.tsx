'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { api } from '../../lib/api';

const C = {
  bg: '#3A4C44', surface: '#2E3D38', surfaceHigh: '#445C54',
  border: '#4A6058', accent: '#CFC29C',
  green: '#3DAF5A', greenBg: '#0F3A1E',
  red: '#C0392B', redBg: '#3A1414',
  orange: '#D4820A', orangeBg: '#3A2200',
  text: '#F0EDE4', textSub: '#9DB5A8', textMuted: '#6B7D73',
};

interface TAdminRequest {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  user: { id: string; displayName: string; email: string };
  tournament: { id: string; name: string; weekNumber: number; year: number };
}

export default function RequestsPage() {
  const { isAdmin } = useAuth();
  const [requests, setRequests] = useState<TAdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectTarget, setRejectTarget] = useState<TAdminRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api.getTournamentAdminRequests();
      setRequests(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  if (!isAdmin) {
    return <div style={{ color: C.textMuted, padding: 40, textAlign: 'center' }}>Access denied.</div>;
  }

  async function handleApprove(r: TAdminRequest) {
    setActing(r.id);
    try {
      await api.approveTournamentAdminRequest(r.id);
      setRequests(prev => prev.filter(x => x.id !== r.id));
    } catch (e: any) { setError(e.message); }
    finally { setActing(null); }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setActing(rejectTarget.id);
    try {
      await api.rejectTournamentAdminRequest(rejectTarget.id, rejectNote || undefined);
      setRequests(prev => prev.filter(x => x.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectNote('');
    } catch (e: any) { setError(e.message); }
    finally { setActing(null); }
  }

  const pending = requests.filter(r => r.status === 'PENDING');

  return (
    <div>
      <h2 style={{ color: C.text, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Tournament Director Requests
      </h2>

      {error && <div style={{ color: C.red, background: C.redBg, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14, border: `1px solid ${C.red}50` }}>{error}</div>}

      {/* Reject modal */}
      {rejectTarget && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ backgroundColor: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 28, maxWidth: 440, width: '100%' }}>
            <h3 style={{ color: C.text, margin: '0 0 8px', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>Reject Request</h3>
            <p style={{ color: C.textMuted, fontSize: 13, margin: '0 0 16px' }}>
              {rejectTarget.user.displayName} — {rejectTarget.tournament.name}
            </p>
            <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Note (optional)</label>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              rows={3} maxLength={500}
              placeholder="Reason for rejection..."
              style={{ width: '100%', padding: '9px 12px', fontSize: 14, backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleReject}
                disabled={!!acting}
                style={{ flex: 1, background: C.red, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 700, fontSize: 13, cursor: acting ? 'default' : 'pointer', opacity: acting ? 0.7 : 1 }}
              >
                {acting ? 'Rejecting...' : 'Reject'}
              </button>
              <button
                onClick={() => { setRejectTarget(null); setRejectNote(''); }}
                style={{ flex: 1, background: 'transparent', color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 0', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: C.textMuted, padding: 40, textAlign: 'center' }}>Loading...</div>
      ) : pending.length === 0 ? (
        <div style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 40, textAlign: 'center', color: C.textMuted }}>
          No pending requests.
        </div>
      ) : (
        <div style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Angler', 'Tournament', 'Message', 'Requested', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pending.map(r => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{r.user.displayName}</div>
                    <div style={{ color: C.textMuted, fontSize: 12 }}>{r.user.email}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ color: C.text, fontSize: 14 }}>{r.tournament.name}</div>
                    <div style={{ color: C.textMuted, fontSize: 12 }}>Week {r.tournament.weekNumber} · {r.tournament.year}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: r.message ? C.textSub : C.textMuted, fontSize: 13, fontStyle: r.message ? 'normal' : 'italic', maxWidth: 200 }}>
                    {r.message ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: C.textMuted, fontSize: 13 }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleApprove(r)}
                        disabled={acting === r.id}
                        style={{ background: C.greenBg, color: C.green, border: `1px solid ${C.green}50`, padding: '5px 14px', borderRadius: 6, cursor: acting === r.id ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, opacity: acting === r.id ? 0.7 : 1 }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => setRejectTarget(r)}
                        disabled={!!acting}
                        style={{ background: C.redBg, color: C.red, border: `1px solid ${C.red}50`, padding: '5px 14px', borderRadius: 6, cursor: acting ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, opacity: acting ? 0.7 : 1 }}
                      >
                        ✕ Reject
                      </button>
                    </div>
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
