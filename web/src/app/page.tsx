'use client';
import { useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import Nav from '../components/Nav';
import { api, isLoggedIn } from '../lib/api';
import type { Tournament, LeaderboardEntry } from '../lib/api';

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

const accentBtn: React.CSSProperties = {
  backgroundColor: C.accent, color: C.bg, fontWeight: 700,
  padding: '9px 20px', borderRadius: 8, textDecoration: 'none',
  fontSize: 14, border: 'none', cursor: 'pointer', display: 'inline-block',
  letterSpacing: 1, textTransform: 'uppercase',
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
      <img src={photoUrl} alt="" style={{ width: size, height: size, borderRadius: size / 2, objectFit: 'cover', border: `1.5px solid ${C.borderGold}`, display: 'block' }} />
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

function cmToInches(cm: number): string {
  return (cm / 2.54).toFixed(2);
}

const rankColor = (rank: number) => rank === 1 ? C.gold : rank === 2 ? C.silver : rank === 3 ? C.bronze : C.textMuted;
const medalFor = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg }}>
      <Nav active="home" />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>

        {/* ── Hero / Tournament Banner ─────────────────────────────── */}
        {loading && (
          <div style={{ textAlign: 'center', color: C.textMuted, padding: 60 }}>Loading...</div>
        )}

        {error && !loading && (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            backgroundColor: C.surface, borderRadius: 20, border: `1px solid ${C.border}`,
            marginBottom: 40,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="FishLeague" style={{ width: 64, marginBottom: 16, opacity: 0.5 }} />
            <h2 style={{ color: C.textSub, fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>No Active Tournament</h2>
            <p style={{ color: C.textMuted, fontSize: 15, margin: '0 0 24px' }}>Check back when the next week opens.</p>
            <Link href="/register" style={accentBtn}>Join Now</Link>
          </div>
        )}

        {!loading && !error && tournament && (
          <div style={{
            backgroundColor: C.surface,
            borderRadius: 20,
            border: `1px solid ${C.border}`,
            borderLeft: `4px solid ${C.accent}`,
            padding: '28px 32px',
            marginBottom: 40,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
              Active Tournament
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: C.text, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: -0.5 }}>
              {tournament.name}
            </h1>
            <p style={{ color: C.textSub, fontSize: 15, margin: '0 0 24px' }}>
              {tournament.region.name} · Ends {new Date(tournament.endsAt).toLocaleDateString()}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/leaderboard" style={accentBtn}>📊 View Leaderboard</Link>
              <Link href="/tournaments" style={ghostBtn}>🏆 View Tournaments</Link>
            </div>
          </div>
        )}

        {/* ── Recent Catches ───────────────────────────────────────── */}
        {!loading && !error && entries.length > 0 && (
          <>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Recent Catches
              </h2>
              <p style={{ color: C.textMuted, fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
                Live Activity Feed
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {entries.map((entry) => (
                <div key={entry.userId} style={{
                  backgroundColor: C.surface,
                  border: `1px solid ${entry.rank <= 3 ? C.accent + '40' : C.border}`,
                  borderRadius: 16,
                  padding: 20,
                  overflow: 'hidden',
                }}>
                  {/* Top row: rank + avatar + name + verified */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 20, flexShrink: 0,
                      border: `2px solid ${rankColor(entry.rank)}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: entry.rank <= 3 ? 18 : 13, fontWeight: 800,
                      color: rankColor(entry.rank),
                      backgroundColor: C.surfaceHigh,
                    }}>
                      {medalFor(entry.rank)}
                    </div>
                    <AvatarCircle photoUrl={entry.profilePhotoUrl} name={entry.displayName} size={42} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{entry.displayName}</span>
                        {entry.rank <= 3 && (
                          <span style={{
                            fontSize: 10, fontWeight: 800, color: C.verified,
                            backgroundColor: C.verifiedBg, padding: '2px 7px',
                            borderRadius: 10, letterSpacing: 0.5, textTransform: 'uppercase',
                          }}>✓ VERIFIED</span>
                        )}
                      </div>
                      {entry.username && (
                        <div style={{ color: C.textMuted, fontSize: 12, marginTop: 1 }}>@{entry.username}</div>
                      )}
                    </div>
                  </div>

                  {/* Fish catch measurement */}
                  <div style={{
                    backgroundColor: C.surfaceHigh,
                    borderRadius: 12,
                    padding: '16px 20px',
                    textAlign: 'center',
                    marginBottom: 12,
                  }}>
                    <div style={{ fontSize: 36, fontWeight: 900, color: C.accent, letterSpacing: -1 }}>
                      {cmToInches(entry.fishLengthCm)} <span style={{ fontSize: 18, fontWeight: 700 }}>IN</span>
                    </div>
                    <div style={{
                      fontSize: 13, fontWeight: 900, color: C.text,
                      textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4,
                    }}>
                      {entry.displayName} IS RANKED #{entry.rank}
                    </div>
                  </div>

                  {/* Meta row */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                    {tournament && (
                      <span style={{ color: C.textSub, fontSize: 13 }}>📍 {tournament.region.name}</span>
                    )}
                    <span style={{ color: C.textSub, fontSize: 13 }}>🏅 {entry.rank} PTS</span>
                  </div>

                  {/* Action row */}
                  <div style={{ display: 'flex', gap: 16, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    <button disabled style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 13, cursor: 'not-allowed', padding: 0 }}>
                      🏆 Props
                    </button>
                    <button disabled style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 13, cursor: 'not-allowed', padding: 0 }}>
                      💬 Comments
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && !error && entries.length === 0 && tournament && (
          <div style={{ textAlign: 'center', color: C.textMuted, padding: 60, fontSize: 16 }}>
            No entries yet — tournament just opened!
          </div>
        )}

        {/* ── CTA (non-logged-in) ──────────────────────────────────── */}
        {!loggedIn && !loading && (
          <div style={{ marginTop: 48, backgroundColor: C.surface, borderRadius: 16, padding: 32, textAlign: 'center', border: `1px solid ${C.border}` }}>
            <h3 style={{ margin: '0 0 8px', color: C.text, fontSize: 20, fontWeight: 700 }}>Download the app to compete</h3>
            <p style={{ margin: '0 0 20px', color: C.textSub, fontSize: 15 }}>
              Submit catches from your phone with GPS verification and real-time leaderboard updates.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/register" style={accentBtn}>Create Account</Link>
              <Link href="/login" style={ghostBtn}>Sign In</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
