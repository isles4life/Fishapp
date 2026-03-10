'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface Tournament {
  id: string;
  name: string;
  weekNumber: number;
  year: number;
  startsAt: string;
  endsAt: string;
  isOpen: boolean;
  region: { name: string };
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    regionId: '',
    name: '',
    weekNumber: '',
    year: new Date().getFullYear().toString(),
    startsAt: '',
    endsAt: '',
  });

  async function load() {
    try {
      const [ts, rs] = await Promise.all([api.getTournaments(), api.getRegions()]);
      setTournaments(Array.isArray(ts) ? ts : []);
      setRegions(Array.isArray(rs) ? rs : []);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.createTournament({
        ...form,
        weekNumber: parseInt(form.weekNumber),
        year: parseInt(form.year),
      });
      await load();
      setForm(f => ({ ...f, name: '', weekNumber: '', startsAt: '', endsAt: '' }));
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h2>Tournaments</h2>
      {error && <p style={{ color: 'red', background: '#fff0f0', padding: '8px 12px', borderRadius: 4 }}>{error}</p>}

      <form onSubmit={create} style={{ background: 'white', padding: 20, borderRadius: 8, marginBottom: 24, border: '1px solid #ddd', maxWidth: 560 }}>
        <h3 style={{ marginTop: 0 }}>Create Tournament</h3>
        <label>Region<br />
          <select value={form.regionId} onChange={e => setForm(f => ({ ...f, regionId: e.target.value }))} required style={{ width: '100%', marginBottom: 10, padding: 6 }}>
            <option value="">Select region...</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label>Name<br />
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Week 1 – Pacific NW" style={{ width: '100%', marginBottom: 10, padding: 6 }} />
        </label>
        <div style={{ display: 'flex', gap: 12 }}>
          <label>Week #<br /><input type="number" value={form.weekNumber} onChange={e => setForm(f => ({ ...f, weekNumber: e.target.value }))} required style={{ width: 80, padding: 6 }} /></label>
          <label>Year<br /><input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} required style={{ width: 100, padding: 6 }} /></label>
        </div>
        <label style={{ marginTop: 10, display: 'block' }}>Start<br /><input type="datetime-local" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} required style={{ padding: 6 }} /></label>
        <label style={{ marginTop: 10, display: 'block' }}>End<br /><input type="datetime-local" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} required style={{ padding: 6 }} /></label>
        <button type="submit" style={{ marginTop: 16, background: '#1565c0', color: 'white', padding: '8px 20px', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          Create
        </button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden' }}>
        <thead style={{ background: '#1a3a5c', color: 'white' }}>
          <tr>
            {['Name', 'Region', 'Week', 'Start', 'End', 'Status', 'Actions'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tournaments.length === 0 && (
            <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#999' }}>No tournaments yet. Create one above.</td></tr>
          )}
          {tournaments.map((t, i) => (
            <tr key={t.id} style={{ background: i % 2 === 0 ? '#fafafa' : 'white' }}>
              <td style={{ padding: '10px 14px' }}>{t.name}</td>
              <td style={{ padding: '10px 14px' }}>{t.region?.name}</td>
              <td style={{ padding: '10px 14px' }}>Wk {t.weekNumber}</td>
              <td style={{ padding: '10px 14px' }}>{new Date(t.startsAt).toLocaleString()}</td>
              <td style={{ padding: '10px 14px' }}>{new Date(t.endsAt).toLocaleString()}</td>
              <td style={{ padding: '10px 14px' }}>
                <span style={{ color: t.isOpen ? '#2e7d32' : '#999', fontWeight: 600 }}>
                  {t.isOpen ? '● Open' : '○ Closed'}
                </span>
              </td>
              <td style={{ padding: '10px 14px' }}>
                {t.isOpen
                  ? <button onClick={() => api.closeTournament(t.id).then(load).catch(e => setError(e.message))} style={{ background: '#c62828', color: 'white', border: 'none', padding: '4px 12px', borderRadius: 4, cursor: 'pointer' }}>Close</button>
                  : <button onClick={() => api.openTournament(t.id).then(load).catch(e => setError(e.message))} style={{ background: '#2e7d32', color: 'white', border: 'none', padding: '4px 12px', borderRadius: 4, cursor: 'pointer' }}>Open</button>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
