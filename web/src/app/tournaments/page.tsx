'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '../../components/Nav';
import { api } from '../../lib/api';
import type { Tournament } from '../../lib/api';

const C = {
  bg:          '#3A4C44',
  surface:     '#2E3D38',
  surfaceHigh: '#445C54',
  border:      '#4A6058',
  borderGold:  '#CFC29C',
  accent:      '#CFC29C',
  accentDark:  '#B8A882',
  verified:    '#3DAF5A',
  verifiedBg:  '#0F3A1E',
  error:       '#C0392B',
  errorBg:     '#3A1414',
  text:        '#F0EDE4',
  textSub:     '#9DB5A8',
  textMuted:   '#6B7D73',
  gold:        '#CFC29C',
  silver:      '#A0A8A0',
  bronze:      '#8B6F4A',
};

type Tab = 'active' | 'upcoming';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('active');

  useEffect(() => {
    api.getActiveTournaments()
      .then(ts => { setTournaments(ts); setError(''); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, paddingBottom: 80 }}>
      <Nav active="tournaments" />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="display" style={{ fontSize: 'clamp(22px, 5vw, 36px)', fontWeight: 900, color: C.text, margin: '0 0 6px', letterSpacing: -1, textTransform: 'uppercase' }}>
            Tournaments
          </h1>
          <p style={{ color: C.textSub, fontSize: 15, margin: 0 }}>
            Competitive fishing leagues in your region
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 28 }}>
          <button style={tabStyle('active')} onClick={() => setTab('active')}>Active</button>
          <button style={tabStyle('upcoming')} onClick={() => setTab('upcoming')}>Upcoming</button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', color: C.textMuted, padding: 60 }}>Loading...</div>
        )}

        {/* ACTIVE TAB */}
        {!loading && tab === 'active' && (
          <>
            {(error || tournaments.length === 0) ? (
              <div style={{
                textAlign: 'center', padding: '60px 20px',
                backgroundColor: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
              }}>
                <p style={{ color: C.textSub, fontSize: 18, margin: '0 0 8px' }}>No active tournament right now.</p>
                <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>Check back when the next week opens.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {tournaments.map(tournament => (
                  <div key={tournament.id} style={{
                    backgroundColor: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 16, overflow: 'hidden',
                  }}>
                    <div style={{ height: 4, backgroundColor: C.accent }} />
                    <div style={{ padding: '16px' }}>
                      <div style={{ marginBottom: 12 }}>
                        <span style={{
                          backgroundColor: C.accent, color: C.bg,
                          borderRadius: 20, padding: '4px 12px',
                          fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase',
                        }}>Active</span>
                      </div>
                      <h2 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {tournament.name}
                      </h2>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                        <div style={{ backgroundColor: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, color: C.textSub, fontWeight: 600 }}>
                          📍 {tournament.region?.name ?? 'All Regions'}
                        </div>
                        <div style={{ backgroundColor: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, color: C.textSub, fontWeight: 600 }}>
                          📅 Ends {new Date(tournament.endsAt).toLocaleDateString()}
                        </div>
                        <div style={{ backgroundColor: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, color: C.textSub, fontWeight: 600 }}>
                          📆 Week {tournament.weekNumber} · {tournament.year}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Link href={`/leaderboard/${tournament.id}`} style={{
                          backgroundColor: C.accent, color: C.bg, fontWeight: 700,
                          padding: '11px 24px', borderRadius: 10, textDecoration: 'none',
                          fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', display: 'inline-block',
                        }}>
                          Tournament Details &amp; Leaderboard
                        </Link>
                        <span style={{ color: C.textMuted, fontSize: 13 }}>📱 Get the app to compete</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* UPCOMING TAB */}
        {!loading && tab === 'upcoming' && (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            backgroundColor: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
            <h3 style={{ color: C.textSub, fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
              Check Back for Upcoming Tournaments
            </h3>
            <p style={{ color: C.textMuted, fontSize: 14, margin: '0 0 24px' }}>
              New weekly tournaments are announced every Sunday.
            </p>
            <Link href="/register" style={{
              backgroundColor: C.accent, color: C.bg, fontWeight: 700,
              padding: '11px 24px', borderRadius: 10, textDecoration: 'none',
              fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', display: 'inline-block',
            }}>
              Create Account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
