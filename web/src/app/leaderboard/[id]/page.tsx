'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '../../../components/Nav';
import { api } from '../../../lib/api';
import type { Tournament, LeaderboardEntry } from '../../../lib/api';

const C = {
  bg:          '#3A4C44',
  surface:     '#2E3D38',
  surfaceHigh: '#445C54',
  border:      '#4A6058',
  borderGold:  '#CFC29C',
  accent:      '#CFC29C',
  text:        '#F0EDE4',
  textSub:     '#9DB5A8',
  textMuted:   '#6B7D73',
  gold:        '#CFC29C',
  silver:      '#A0A8A0',
  bronze:      '#8B6F4A',
};

function initials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function rankColor(rank: number) {
  if (rank === 1) return C.gold;
  if (rank === 2) return C.silver;
  if (rank === 3) return C.bronze;
  return C.textSub;
}

function rankLabel(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export default function PublicLeaderboardPage({ params }: { params: { id: string } }) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [t, lb] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fishleague.app'}/tournaments/${params.id}`)
            .then(r => r.json()) as Promise<Tournament>,
          api.getLeaderboard(params.id),
        ]);
        setTournament(t);
        setEntries(lb);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [params.id]);

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg }}>
      <Nav active="leaderboard" />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 80px' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: C.textMuted, padding: 60 }}>Loading...</div>
        )}

        {error && !loading && (
          <div style={{ textAlign: 'center', padding: 60, color: C.textMuted }}>
            Tournament not found. <Link href="/" style={{ color: C.accent }}>Go home</Link>
          </div>
        )}

        {!loading && !error && tournament && (
          <>
            {/* Tournament header */}
            <div style={{
              backgroundColor: C.surface, borderRadius: 16,
              border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.accent}`,
              padding: '20px 20px', marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
                    {tournament.isOpen ? '🟢 Live Tournament' : 'Final Results'}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{tournament.name}</div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
                    Week {tournament.weekNumber} · {tournament.region?.name ?? 'All Regions'} ·{' '}
                    {entries.length} angler{entries.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleCopyLink}
                    style={{
                      backgroundColor: copied ? C.surfaceHigh : 'transparent',
                      color: copied ? C.accent : C.textSub,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8, padding: '8px 14px',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {copied ? '✓ Copied!' : '🔗 Share'}
                  </button>
                  <Link href="/register" style={{
                    backgroundColor: C.accent, color: C.bg,
                    fontWeight: 700, padding: '8px 16px', borderRadius: 8,
                    textDecoration: 'none', fontSize: 13, letterSpacing: 0.5,
                  }}>
                    Join League
                  </Link>
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            {entries.length === 0 ? (
              <div style={{ textAlign: 'center', color: C.textMuted, padding: 60, backgroundColor: C.surface, borderRadius: 16, border: `1px solid ${C.border}` }}>
                No approved catches yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {entries.map((e, i) => (
                  <Link
                    key={e.userId}
                    href={e.username ? `/profile/${e.username}` : '#'}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{
                      backgroundColor: i < 3 ? C.surfaceHigh : C.surface,
                      border: `1px solid ${i === 0 ? C.accent + '60' : C.border}`,
                      borderRadius: 12, padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 14,
                      transition: 'border-color 0.15s',
                    }}>
                      {/* Rank */}
                      <div style={{
                        width: 36, textAlign: 'center', fontSize: i < 3 ? 20 : 15,
                        fontWeight: 800, color: rankColor(e.rank), flexShrink: 0,
                        fontFamily: 'Oswald, sans-serif',
                      }}>
                        {rankLabel(e.rank)}
                      </div>

                      {/* Avatar */}
                      {e.profilePhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.profilePhotoUrl} alt="" style={{ width: 40, height: 40, borderRadius: 20, objectFit: 'cover', border: `1.5px solid ${C.borderGold}`, flexShrink: 0 }} />
                      ) : (
                        <div style={{
                          width: 40, height: 40, borderRadius: 20,
                          backgroundColor: C.bg, border: `1.5px solid ${C.borderGold}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 700, color: C.textSub, flexShrink: 0,
                        }}>
                          {initials(e.displayName)}
                        </div>
                      )}

                      {/* Name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {e.displayName}
                        </div>
                        {e.speciesName && (
                          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }}>{e.speciesName}</div>
                        )}
                      </div>

                      {/* Length */}
                      <div style={{
                        fontSize: 18, fontWeight: 800, color: rankColor(e.rank),
                        fontFamily: 'Oswald, sans-serif', flexShrink: 0,
                      }}>
                        {(e.fishLengthCm / 2.54).toFixed(1)}"
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* CTA for non-logged-in spectators */}
            <div style={{
              marginTop: 40, textAlign: 'center', padding: '32px 20px',
              backgroundColor: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                Want to compete?
              </div>
              <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 20 }}>
                Download FishLeague and enter the next tournament.
              </div>
              <Link href="/register" style={{
                backgroundColor: C.accent, color: C.bg, fontWeight: 700,
                padding: '12px 28px', borderRadius: 8, textDecoration: 'none',
                fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', display: 'inline-block',
              }}>
                Join Free
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
