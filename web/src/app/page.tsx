'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, clearToken, isLoggedIn } from '../lib/api';
import type { Tournament, LeaderboardEntry, AnglerProfile } from '../lib/api';

const C = {
  bg: '#0d1821', surface: '#162032', surfaceHigh: '#1e2d40',
  border: '#2a3f55', green: '#2ecc71',
  gold: '#FFD700', silver: '#C0C0C0', bronze: '#CD7F32',
  text: '#e8f0fe', textSub: '#7a9bbf', textMuted: '#4a6580',
};

const greenBtn: React.CSSProperties = {
  backgroundColor: C.green, color: C.bg, fontWeight: 700,
  padding: '9px 20px', borderRadius: 8, textDecoration: 'none',
  fontSize: 14, border: 'none', cursor: 'pointer', display: 'inline-block',
};
const ghostBtn: React.CSSProperties = {
  backgroundColor: 'transparent', color: C.textSub, fontWeight: 600,
  padding: '9px 20px', borderRadius: 8, textDecoration: 'none',
  fontSize: 14, border: `1px solid ${C.border}`, cursor: 'pointer', display: 'inline-block',
};

function initials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function AvatarCircle({ photoUrl, name, size = 36 }: { photoUrl?: string | null; name?: string | null; size?: number }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt="" style={{ width: size, height: size, borderRadius: size / 2, objectFit: 'cover', border: `1.5px solid ${C.border}`, display: 'block' }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: C.surfaceHigh, border: `1.5px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: C.textSub, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

export default function HomePage() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState<AnglerProfile | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    const li = isLoggedIn();
    setLoggedIn(li);
    if (li) api.getMyProfile().then(setProfile).catch(() => {});
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setNavOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLogout() { clearToken(); setLoggedIn(false); setProfile(null); setNavOpen(false); }

  const rankColor = (rank: number) => rank === 1 ? C.gold : rank === 2 ? C.silver : rank === 3 ? C.bronze : C.textMuted;
  const medalFor = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg }}>
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav style={{ backgroundColor: C.surface, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="FishLeague" style={{ height: 34, marginRight: 10 }} />
          <span style={{ color: C.text, fontWeight: 800, fontSize: 18 }}>FishLeague</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            {loggedIn ? (
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setNavOpen(o => !o)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <AvatarCircle photoUrl={profile?.profilePhotoUrl} name={profile?.user?.displayName} size={36} />
                  <span style={{ color: C.textSub, fontSize: 13, fontWeight: 600 }}>
                    {profile?.username ? `@${profile.username}` : 'My Account'}
                  </span>
                  <span style={{ color: C.textMuted, fontSize: 10 }}>{navOpen ? '▲' : '▼'}</span>
                </button>
                {navOpen && (
                  <div style={{
                    position: 'absolute', top: 44, right: 0, minWidth: 170,
                    backgroundColor: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    zIndex: 100,
                  }}>
                    <Link href="/profile" onClick={() => setNavOpen(false)} style={{ display: 'block', padding: '12px 16px', color: C.text, textDecoration: 'none', fontSize: 14, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>
                      👤 My Profile
                    </Link>
                    <button onClick={handleLogout} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', color: C.textSub, background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" style={ghostBtn}>Sign In</Link>
                <Link href="/register" style={greenBtn}>Join Now</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 38, fontWeight: 900, color: C.text, margin: '0 0 8px' }}>Live Leaderboard</h1>
          {tournament && (
            <p style={{ color: C.textSub, fontSize: 15, margin: 0 }}>
              {tournament.name} · {tournament.region.name} · Ends {new Date(tournament.endsAt).toLocaleDateString()}
            </p>
          )}
          <p style={{ color: C.textMuted, fontSize: 12, marginTop: 6, letterSpacing: '0.5px' }}>AUTO-REFRESHES EVERY 30 SECONDS</p>
        </div>

        {loading && <div style={{ textAlign: 'center', color: C.textMuted, padding: 60 }}>Loading...</div>}

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map((entry) => (
              <div key={entry.userId} style={{
                display: 'flex', alignItems: 'center',
                backgroundColor: entry.rank <= 3 ? C.surfaceHigh : C.surface,
                borderRadius: 12, padding: '14px 18px',
                border: `1px solid ${entry.rank <= 3 ? rankColor(entry.rank) + '50' : C.border}`,
              }}>
                {/* Rank */}
                <div style={{
                  width: 44, height: 44, borderRadius: 22,
                  border: `1.5px solid ${rankColor(entry.rank)}60`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: entry.rank <= 3 ? 22 : 13, fontWeight: 800,
                  color: rankColor(entry.rank), marginRight: 14, flexShrink: 0,
                }}>
                  {medalFor(entry.rank)}
                </div>
                {/* Avatar */}
                <div style={{ marginRight: 12, flexShrink: 0 }}>
                  <AvatarCircle photoUrl={entry.profilePhotoUrl} name={entry.displayName} size={38} />
                </div>
                {/* Name */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, color: C.text }}>{entry.displayName}</div>
                  {entry.username && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }}>@{entry.username}</div>}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{entry.fishLengthCm} cm</div>
              </div>
            ))}
          </div>
        )}

        {!loggedIn && (
          <div style={{ marginTop: 48, backgroundColor: C.surface, borderRadius: 14, padding: 32, textAlign: 'center', border: `1px solid ${C.border}` }}>
            <h3 style={{ margin: '0 0 8px', color: C.text, fontSize: 20, fontWeight: 700 }}>Want to compete?</h3>
            <p style={{ margin: '0 0 20px', color: C.textSub, fontSize: 15 }}>
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
