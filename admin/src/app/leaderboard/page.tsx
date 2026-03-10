'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface Entry {
  rank: number;
  displayName: string;
  fishLengthCm: number;
  userId: string;
}

export default function LeaderboardPage() {
  const [tournamentId, setTournamentId] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getTournaments()
      .then(ts => setTournaments(Array.isArray(ts) ? ts : []))
      .catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    if (!tournamentId) return;
    setError('');
    api.getLeaderboard(tournamentId)
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message));
  }, [tournamentId]);

  const medal = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

  return (
    <div>
      <h2>Leaderboard</h2>
      {error && <p style={{ color: 'red', background: '#fff0f0', padding: '8px 12px', borderRadius: 4 }}>{error}</p>}

      <select
        value={tournamentId}
        onChange={e => setTournamentId(e.target.value)}
        style={{ padding: 8, marginBottom: 20, minWidth: 280 }}
      >
        <option value="">Select tournament...</option>
        {tournaments.map((t: any) => (
          <option key={t.id} value={t.id}>{t.name} {t.isOpen ? '(open)' : ''}</option>
        ))}
      </select>

      {entries.length > 0 && (
        <table style={{ width: '100%', maxWidth: 600, borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ background: '#1a3a5c', color: 'white' }}>
            <tr>
              <th style={{ padding: '10px 16px', textAlign: 'left' }}>Rank</th>
              <th style={{ padding: '10px 16px', textAlign: 'left' }}>Angler</th>
              <th style={{ padding: '10px 16px', textAlign: 'right' }}>Length (cm)</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.userId} style={{ background: i % 2 === 0 ? '#fafafa' : 'white' }}>
                <td style={{ padding: '10px 16px', fontSize: 20 }}>{medal(e.rank)}</td>
                <td style={{ padding: '10px 16px', fontWeight: e.rank <= 3 ? 700 : 400 }}>{e.displayName}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{e.fishLengthCm.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {tournamentId && entries.length === 0 && !error && <p>No approved entries yet.</p>}
    </div>
  );
}
