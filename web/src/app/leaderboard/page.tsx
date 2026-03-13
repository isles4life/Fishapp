'use client';
import { useEffect, useCallback, useState } from 'react';
import Nav from '../../components/Nav';
import { api } from '../../lib/api';
import type { Tournament, LeaderboardEntry } from '../../lib/api';

const C = {
  bg:          '#0D1A0D',
  surface:     '#152515',
  surfaceHigh: '#1D331D',
  border:      '#2A4A2A',
  borderGold:  '#C9A450',
  accent:      '#C9A450',
  accentDark:  '#9E7A30',
  verified:    '#3DAF5A',
  verifiedBg:  '#0F3A1E',
  error:       '#C0392B',
  errorBg:     '#3A1414',
  text:        '#F0EDE4',
  textSub:     '#8BA88B',
  textMuted:   '#4A6A4A',
  gold:        '#C9A450',
  silver:      '#A0A8A0',
  bronze:      '#8B6F4A',
};

function initials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function AvatarCircle({ photoUrl, name, size = 42 }: { photoUrl?: string | null; name?: string | null; size?: number }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt="" style={{ width: size, height: size, borderRadius: size / 2, objectFit: 'cover', border: `1.5px solid ${C.borderGold}`, display: 'block', flexShrink: 0 }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: C.surfaceHigh, border: `1.5px solid ${C.borderGold}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 700, color: C.textSub, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

function cmToInches(cm: number): string {
  return (cm / 2.54).toFixed(2);
}

const rankBorderColor = (rank: number) =>
  rank === 1 ? C.gold : rank === 2 ? C.silver : rank === 3 ? C.bronze : C.border;
const medalFor = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

type Tab = 'largest' | 'season';

export default function LeaderboardPage() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('largest');

  const load = useCallback(async () => {
    try {
      const t = await api.getActiveTournament();
      setTournament(t);
      const board = await api.getLeaderboard(t.id);
      setEntries(board);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  function tabStyle(name: Tab): React.CSSProperties {
    const active = tab === name;
    return {
      background: 'none',
      border: 'none',
      borderBottom: active ? `2px solid ${C.accent}` : '2px solid transparent',
      color: active ? C.accent : C.textMuted,
      fontWeight: 700,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: 'uppercase',
      padding: '10px 20px',
      cursor: 'pointer',
    };
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg }}>
      <Nav active="leaderboard" />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="display" style={{ fontSize: 36, fontWeight: 900, color: C.text, margin: '0 0 6px', letterSpacing: -1, textTransform: 'uppercase' }}>
            Leaderboard
          </h1>
          {tournament && (
            <p style={{ color: C.textSub, fontSize: 15, margin: '0 0 4px' }}>
              {tournament.name} · {tournament.region.name} · Ends {new Date(tournament.endsAt).toLocaleDateString()}
            </p>
          )}
          <p style={{ color: C.textMuted, fontSize: 11, margin: 0, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Auto-refreshes every 30s
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
          <button style={tabStyle('largest')} onClick={() => setTab('largest')}>Largest Fish</button>
          <button style={tabStyle('season')} onClick={() => setTab('season')}>Season Standings</button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', color: C.textMuted, padding: 60 }}>Loading...</div>
        )}

        {error && !loading && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ color: C.textSub, fontSize: 18 }}>No active tournament right now.</p>
            <p style={{ color: C.textMuted, fontSize: 14 }}>Check back when the next week opens.</p>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div style={{ textAlign: 'center', color: C.textMuted, padding: 60, fontSize: 16 }}>
            No entries yet — tournament just opened!
          </div>
        )}

        {!loading && entries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {entries.map((entry) => (
              <div key={entry.userId} style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: entry.rank === 1 ? C.surfaceHigh : C.surface,
                border: `1px solid ${entry.rank === 1 ? C.accent + '40' : C.border}`,
                borderRadius: 14,
                padding: '16px 20px',
                gap: 14,
              }}>
                {/* Rank circle */}
                <div style={{
                  width: 48, height: 48, borderRadius: 24, flexShrink: 0,
                  border: `2px solid ${rankBorderColor(entry.rank)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: entry.rank <= 3 ? 20 : 14, fontWeight: 800,
                  color: rankBorderColor(entry.rank),
                  backgroundColor: C.bg,
                }}>
                  {medalFor(entry.rank)}
                </div>

                {/* Avatar */}
                <AvatarCircle photoUrl={entry.profilePhotoUrl} name={entry.displayName} size={42} />

                {/* Name */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{entry.displayName}</div>
                  {entry.username && (
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>@{entry.username}</div>
                  )}
                </div>

                {/* Measurement + pts */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div>
                    <span style={{ fontSize: 22, fontWeight: 900, color: C.accent }}>{cmToInches(entry.fishLengthCm)}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.textSub, marginLeft: 3 }}>IN</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{entry.rank} PTS</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
