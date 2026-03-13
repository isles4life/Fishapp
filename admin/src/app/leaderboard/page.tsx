'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const C = {
  surface: '#152515', surfaceHigh: '#1D331D', border: '#2A4A2A', accent: '#C9A450',
  green: '#3DAF5A', gold: '#C9A450', silver: '#A0A8A0', bronze: '#8B6F4A',
  red: '#C0392B', text: '#F0EDE4', textSub: '#8BA88B', textMuted: '#4A6A4A',
};

interface Entry { rank: number; displayName: string; fishLengthCm: number; userId: string; }

const rankColor = (r: number) => r === 1 ? C.gold : r === 2 ? C.silver : r === 3 ? C.bronze : C.textMuted;
const medal = (r: number) => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`;

export default function LeaderboardPage() {
  const [tournamentId, setTournamentId] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getTournaments().then(ts => setTournaments(Array.isArray(ts) ? ts : [])).catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    if (!tournamentId) return;
    setError('');
    api.getLeaderboard(tournamentId).then(data => setEntries(Array.isArray(data) ? data : [])).catch(e => setError(e.message));
  }, [tournamentId]);

  return (
    <div>
      <h2 style={{ color: C.text, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 0.5 }}>Leaderboard</h2>
      {error && <div style={{ color: C.red, background: C.red + '15', border: `1px solid ${C.red}50`, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}

      <select value={tournamentId} onChange={e => setTournamentId(e.target.value)} style={{
        padding: '10px 14px', marginBottom: 24, minWidth: 300, borderRadius: 8,
        backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 14,
      }}>
        <option value="">Select tournament...</option>
        {tournaments.map((t: any) => (
          <option key={t.id} value={t.id}>{t.name}{t.isOpen ? ' (open)' : ''}</option>
        ))}
      </select>

      {tournamentId && entries.length === 0 && !error && (
        <p style={{ color: C.textMuted }}>No approved entries yet.</p>
      )}

      {entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 600 }}>
          {entries.map((e) => (
            <div key={e.userId} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              backgroundColor: e.rank <= 3 ? C.surfaceHigh : C.surface,
              borderRadius: 10, padding: '12px 16px',
              border: `1px solid ${e.rank <= 3 ? rankColor(e.rank) + '50' : C.border}`,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 20,
                border: `1.5px solid ${rankColor(e.rank)}60`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: e.rank <= 3 ? 20 : 13, fontWeight: 800, color: rankColor(e.rank), flexShrink: 0,
              }}>
                {medal(e.rank)}
              </div>
              <div style={{ flex: 1, color: C.text, fontWeight: 600 }}>{e.displayName}</div>
              <div style={{ color: C.accent, fontWeight: 800, fontSize: 18 }}>{e.fishLengthCm.toFixed(1)} cm</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
