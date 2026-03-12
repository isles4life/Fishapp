'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, clearToken, isLoggedIn } from '../lib/api';
import type { Tournament, LeaderboardEntry } from '../lib/api';

export default function HomePage() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

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
    setLoggedIn(isLoggedIn());
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  function handleLogout() {
    clearToken();
    setLoggedIn(false);
  }

  const medalFor = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111111' }}>
      {/* Nav */}
      <nav style={nav}>
        <div style={navInner}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="FishLeague" style={{ height: 36, marginRight: 10 }} />
          <span style={{ color: '#39FF14', fontWeight: 800, fontSize: 20 }}>FishLeague</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            {loggedIn ? (
              <button onClick={handleLogout} style={ghostBtn}>Sign Out</button>
            ) : (
              <>
                <Link href="/login" style={ghostBtn}>Sign In</Link>
                <Link href="/register" style={greenBtn}>Join Now</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 16px' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 42, fontWeight: 900, color: '#39FF14', margin: '0 0 8px' }}>
            Live Leaderboard
          </h1>
          {tournament && (
            <p style={{ color: '#888', fontSize: 16, margin: 0 }}>
              {tournament.name} · {tournament.region.name} · Ends {new Date(tournament.endsAt).toLocaleDateString()}
            </p>
          )}
          <p style={{ color: '#555', fontSize: 13, marginTop: 6 }}>Auto-refreshes every 30 seconds</p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', color: '#555', padding: 60 }}>Loading...</div>
        )}

        {error && !loading && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ color: '#555', fontSize: 18 }}>No active tournament right now.</p>
            <p style={{ color: '#444', fontSize: 14 }}>Check back when the next week opens.</p>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div style={{ textAlign: 'center', color: '#555', padding: 60, fontSize: 16 }}>
            No entries yet — tournament just opened!
          </div>
        )}

        {!loading && entries.length > 0 && (
          <div>
            {entries.map((entry) => (
              <div key={entry.userId} style={entry.rank <= 3 ? topRow : row}>
                <span style={{ fontSize: 28, width: 52, display: 'inline-block', textAlign: 'center' }}>
                  {medalFor(entry.rank)}
                </span>
                <div style={{ flex: 1, marginLeft: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 17, color: '#fff' }}>{entry.displayName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#39FF14' }}>{entry.fishLengthCm} cm</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA for non-logged-in */}
        {!loggedIn && (
          <div style={ctaBox}>
            <h3 style={{ margin: '0 0 8px', color: '#39FF14', fontSize: 20 }}>Want to compete?</h3>
            <p style={{ margin: '0 0 16px', color: '#888', fontSize: 15 }}>
              Download the FishLeague app, create an account, and start submitting catches.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/register" style={greenBtn}>Create Account</Link>
              <Link href="/login" style={ghostBtn}>Sign In</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const nav: React.CSSProperties = {
  backgroundColor: '#1a1a1a',
  borderBottom: '1px solid #39FF14',
  position: 'sticky', top: 0, zIndex: 10,
};
const navInner: React.CSSProperties = {
  maxWidth: 720, margin: '0 auto', padding: '12px 16px',
  display: 'flex', alignItems: 'center',
};
const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center',
  backgroundColor: '#1a1a1a', borderRadius: 10,
  padding: '14px 16px', marginBottom: 8,
};
const topRow: React.CSSProperties = {
  ...row,
  border: '1.5px solid #39FF14',
};
const greenBtn: React.CSSProperties = {
  backgroundColor: '#39FF14', color: '#111', fontWeight: 700,
  padding: '8px 18px', borderRadius: 6, textDecoration: 'none',
  fontSize: 14, border: 'none', cursor: 'pointer', display: 'inline-block',
};
const ghostBtn: React.CSSProperties = {
  backgroundColor: 'transparent', color: '#39FF14', fontWeight: 600,
  padding: '8px 18px', borderRadius: 6, textDecoration: 'none',
  fontSize: 14, border: '1px solid #39FF14', cursor: 'pointer', display: 'inline-block',
};
const ctaBox: React.CSSProperties = {
  marginTop: 48, backgroundColor: '#1a1a1a', borderRadius: 12,
  padding: 28, textAlign: 'center', border: '1px solid #333',
};
