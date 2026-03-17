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
  entryFeeCents: number; prizePoolCents: number;
  region: { name: string };
}

const PAGE_SIZE = 20;

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  const btn = (active: boolean, disabled?: boolean): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
    background: active ? C.accent : C.surfaceHigh, color: active ? C.bg : disabled ? C.textMuted : C.textSub,
    border: `1px solid ${active ? C.accent : C.border}`, opacity: disabled ? 0.4 : 1,
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, justifyContent: 'flex-end' }}>
      <span style={{ color: C.textMuted, fontSize: 13, marginRight: 8 }}>
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </span>
      <button style={btn(false, page === 1)} disabled={page === 1} onClick={() => onChange(page - 1)}>← Prev</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
        .reduce<(number | '...')[]>((acc, p, i, arr) => {
          if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
          acc.push(p); return acc;
        }, [])
        .map((p, i) => p === '...'
          ? <span key={`e${i}`} style={{ color: C.textMuted, padding: '0 4px' }}>…</span>
          : <button key={p} style={btn(p === page)} onClick={() => onChange(p as number)}>{p}</button>
        )}
      <button style={btn(false, page === totalPages)} disabled={page === totalPages} onClick={() => onChange(page + 1)}>Next →</button>
    </div>
  );
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    regionId: '', name: '', weekNumber: '', year: new Date().getFullYear().toString(),
    startsDate: '', startsTime: '08:00',
    endsDate: '', endsTime: '20:00',
    entryFee: '', prizePool: '',
  });

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
      await api.createTournament({
        regionId: form.regionId,
        name: form.name,
        weekNumber: parseInt(form.weekNumber),
        year: parseInt(form.year),
        startsAt: new Date(`${form.startsDate}T${form.startsTime}:00`).toISOString(),
        endsAt: new Date(`${form.endsDate}T${form.endsTime}:00`).toISOString(),
        entryFeeCents: form.entryFee ? Math.round(parseFloat(form.entryFee) * 100) : 0,
        prizePoolCents: form.prizePool ? Math.round(parseFloat(form.prizePool) * 100) : 0,
      });
      await load();
      setForm(f => ({ ...f, name: '', weekNumber: '', startsDate: '', startsTime: '08:00', endsDate: '', endsTime: '20:00', entryFee: '', prizePool: '' }));
    } catch (e: any) { setError(e.message); }
  }

  const paginatedTournaments = tournaments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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

        <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Start Date &amp; Time</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input type="date" value={form.startsDate} onChange={e => setForm(f => ({ ...f, startsDate: e.target.value }))} required
            style={{ ...inputStyle, marginBottom: 0, flex: 2, color: C.accent, borderColor: C.accent + '80', colorScheme: 'dark' }} />
          <input type="time" value={form.startsTime} onChange={e => setForm(f => ({ ...f, startsTime: e.target.value }))} required
            style={{ ...inputStyle, marginBottom: 0, flex: 1, color: C.accent, borderColor: C.accent + '80', colorScheme: 'dark' }} />
        </div>

        <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>End Date &amp; Time</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input type="date" value={form.endsDate} onChange={e => setForm(f => ({ ...f, endsDate: e.target.value }))} required
            style={{ ...inputStyle, marginBottom: 0, flex: 2, color: C.accent, borderColor: C.accent + '80', colorScheme: 'dark' }} />
          <input type="time" value={form.endsTime} onChange={e => setForm(f => ({ ...f, endsTime: e.target.value }))} required
            style={{ ...inputStyle, marginBottom: 0, flex: 1, color: C.accent, borderColor: C.accent + '80', colorScheme: 'dark' }} />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Entry Fee ($)</label>
            <input type="number" min="0" step="0.01" value={form.entryFee} onChange={e => setForm(f => ({ ...f, entryFee: e.target.value }))} placeholder="0.00" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Prize Pool ($)</label>
            <input type="number" min="0" step="0.01" value={form.prizePool} onChange={e => setForm(f => ({ ...f, prizePool: e.target.value }))} placeholder="0.00" style={inputStyle} />
          </div>
        </div>

        <button type="submit" style={{ marginTop: 8, backgroundColor: C.accent, color: C.bg, padding: '10px 24px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Create Tournament
        </button>
      </form>

      {/* Table */}
      <div style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['Name', 'Region', 'Week', 'Start', 'End', 'Entry', 'Prize Pool', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedTournaments.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: C.textMuted }}>No tournaments yet.</td></tr>
            )}
            {paginatedTournaments.map((t) => (
              <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '12px 16px', color: C.text, fontWeight: 600 }}>{t.name}</td>
                <td style={{ padding: '12px 16px', color: C.textSub, fontSize: 14 }}>{t.region?.name}</td>
                <td style={{ padding: '12px 16px', color: C.textSub, fontSize: 14 }}>Wk {t.weekNumber}</td>
                <td style={{ padding: '12px 16px', color: C.textSub, fontSize: 13 }}>{new Date(t.startsAt).toLocaleString()}</td>
                <td style={{ padding: '12px 16px', color: C.textSub, fontSize: 13 }}>{new Date(t.endsAt).toLocaleString()}</td>
                <td style={{ padding: '12px 16px', color: C.textSub, fontSize: 13 }}>
                  {t.entryFeeCents > 0 ? `$${(t.entryFeeCents / 100).toFixed(2)}` : <span style={{ color: C.textMuted }}>Free</span>}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>
                  {t.prizePoolCents > 0
                    ? <span style={{ color: C.accent, fontWeight: 700 }}>${(t.prizePoolCents / 100).toFixed(2)}</span>
                    : <span style={{ color: C.textMuted }}>—</span>}
                </td>
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
      <Pagination page={currentPage} total={tournaments.length} onChange={setCurrentPage} />
    </div>
  );
}
