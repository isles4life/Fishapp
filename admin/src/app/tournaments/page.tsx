'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const C = {
  bg: '#0D1A0D', surface: '#152515', surfaceHigh: '#1D331D',
  border: '#2A4A2A', accent: '#C9A450',
  green: '#3DAF5A', greenBg: '#0F3A1E',
  red: '#C0392B', redBg: '#3A1414',
  text: '#F0EDE4', textSub: '#8BA88B', textMuted: '#4A6A4A',
};

const inputStyle: React.CSSProperties = {
  width: '100%', marginBottom: 10, padding: '9px 12px', fontSize: 14,
  backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
  color: C.text, boxSizing: 'border-box',
};

interface Tournament {
  id: string; name: string; weekNumber: number; year: number;
  startsAt: string; endsAt: string; isOpen: boolean;
  region: { name: string };
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ regionId: '', name: '', weekNumber: '', year: new Date().getFullYear().toString(), startsAt: '', endsAt: '' });

  async function load() {
    try {
      const [ts, rs] = await Promise.all([api.getTournaments(), api.getRegions()]);
      setTournaments(Array.isArray(ts) ? ts : []);
      setRegions(Array.isArray(rs) ? rs : []);
    } catch (e: any) { setError(e.message); }
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.createTournament({ ...form, weekNumber: parseInt(form.weekNumber), year: parseInt(form.year) });
      await load();
      setForm(f => ({ ...f, name: '', weekNumber: '', startsAt: '', endsAt: '' }));
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <h2 style={{ color: C.text, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tournaments</h2>
      {error && <div style={{ color: C.red, background: C.redBg, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14, border: `1px solid ${C.red}50` }}>{error}</div>}

      {/* Create form */}
      <form onSubmit={create} style={{ backgroundColor: C.surface, padding: 24, borderRadius: 12, marginBottom: 28, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.accent}`, maxWidth: 560 }}>
        <h3 style={{ color: C.text, marginTop: 0, marginBottom: 16, fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Create Tournament</h3>

        <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Region</label>
        <select value={form.regionId} onChange={e => setForm(f => ({ ...f, regionId: e.target.value }))} required style={inputStyle}>
          <option value="">Select region...</option>
          {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Name</label>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Week 1 – Pacific NW" style={inputStyle} />

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Week #</label>
            <input type="number" value={form.weekNumber} onChange={e => setForm(f => ({ ...f, weekNumber: e.target.value }))} required style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Year</label>
            <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} required style={inputStyle} />
          </div>
        </div>

        <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Start</label>
        <input type="datetime-local" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} required style={inputStyle} />

        <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>End</label>
        <input type="datetime-local" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} required style={inputStyle} />

        <button type="submit" style={{ marginTop: 8, backgroundColor: C.accent, color: C.bg, padding: '10px 24px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Create Tournament
        </button>
      </form>

      {/* Table */}
      <div style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['Name', 'Region', 'Week', 'Start', 'End', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tournaments.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: C.textMuted }}>No tournaments yet.</td></tr>
            )}
            {tournaments.map((t) => (
              <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '12px 16px', color: C.text, fontWeight: 600 }}>{t.name}</td>
                <td style={{ padding: '12px 16px', color: C.textSub, fontSize: 14 }}>{t.region?.name}</td>
                <td style={{ padding: '12px 16px', color: C.textSub, fontSize: 14 }}>Wk {t.weekNumber}</td>
                <td style={{ padding: '12px 16px', color: C.textSub, fontSize: 13 }}>{new Date(t.startsAt).toLocaleString()}</td>
                <td style={{ padding: '12px 16px', color: C.textSub, fontSize: 13 }}>{new Date(t.endsAt).toLocaleString()}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    color: t.isOpen ? C.green : C.textMuted,
                    backgroundColor: t.isOpen ? C.greenBg : C.surfaceHigh,
                    border: `1px solid ${t.isOpen ? C.green + '50' : C.border}`,
                    borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700,
                  }}>
                    {t.isOpen ? '● Open' : '○ Closed'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {t.isOpen
                    ? <button onClick={() => api.closeTournament(t.id).then(load).catch(e => setError(e.message))} style={{ background: C.redBg, color: C.red, border: `1px solid ${C.red}50`, padding: '5px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Close</button>
                    : <button onClick={() => api.openTournament(t.id).then(load).catch(e => setError(e.message))} style={{ background: C.greenBg, color: C.green, border: `1px solid ${C.green}50`, padding: '5px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Open</button>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
