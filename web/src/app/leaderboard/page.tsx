'use client';
import { useEffect, useCallback, useState, useRef } from 'react';
import Nav from '../../components/Nav';
import { api } from '../../lib/api';
import type { Tournament, LeaderboardEntry, CatchComment } from '../../lib/api';

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

const SPECIES_FILTERS = ['All', 'Bass', 'Walleye', 'Trout', 'Pike', 'Catfish', 'Panfish', 'Other'];

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

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function PropButton({ submissionId }: { submissionId: string }) {
  const [propped, setPropped] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    api.getProps(submissionId)
      .then(r => { setCount(r.count); setPropped(r.userHasPropped); })
      .catch(() => {});
  }, [submissionId]);

  async function handleToggle() {
    if (loading) return;
    setLoading(true);
    try {
      const r = await api.toggleProp(submissionId);
      setPropped(r.propped);
      setCount(r.count);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: propped ? C.accent + '20' : C.surfaceHigh,
        border: `1px solid ${propped ? C.accent + '70' : C.border}`,
        borderRadius: 8, padding: '4px 10px', cursor: loading ? 'wait' : 'pointer',
        fontSize: 12, fontWeight: 700,
        color: propped ? C.accent : C.textMuted,
      }}
    >
      👍 {count}
    </button>
  );
}

function CommentsSection({ submissionId }: { submissionId: string }) {
  const [comments, setComments] = useState<CatchComment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getComments(submissionId)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [submissionId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const comment = await api.addComment(submissionId, trimmed);
      setComments(prev => [...prev, comment]);
      setBody('');
    } catch {
      // silently handle
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      backgroundColor: C.surfaceHigh,
      borderRadius: '0 0 14px 14px',
      borderTop: `1px solid ${C.border}`,
      padding: '14px 20px',
    }}>
      {loading ? (
        <div style={{ color: C.textMuted, fontSize: 13 }}>Loading comments…</div>
      ) : (
        <>
          {comments.length === 0 && (
            <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 10 }}>No comments yet.</div>
          )}
          {comments.map(c => (
            <div key={c.id} style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.textSub }}>{c.user.displayName}</span>
              <span style={{ fontSize: 13, color: C.text, marginLeft: 8 }}>{c.body}</span>
            </div>
          ))}
        </>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Add a comment…"
          maxLength={500}
          style={{
            flex: 1, padding: '7px 12px', fontSize: 13,
            backgroundColor: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 8, color: C.text, outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!body.trim() || submitting}
          style={{
            background: C.accent, color: C.bg, border: 'none',
            borderRadius: 8, padding: '7px 16px', cursor: 'pointer',
            fontWeight: 700, fontSize: 13, opacity: (!body.trim() || submitting) ? 0.5 : 1,
          }}
        >
          {submitting ? '…' : 'Post'}
        </button>
      </form>
    </div>
  );
}

type Tab = 'largest' | 'season';

export default function LeaderboardPage() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('largest');
  const [speciesFilter, setSpeciesFilter] = useState('All');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const load = useCallback(async (species?: string) => {
    try {
      const t = await api.getActiveTournament();
      setTournament(t);
      const board = await api.getLeaderboard(t.id, species === 'All' ? undefined : species);
      setEntries(board);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(speciesFilter);
    const interval = setInterval(() => load(speciesFilter), 30000);
    return () => clearInterval(interval);
  }, [load, speciesFilter]);

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

  function toggleExpanded(userId: string) {
    setExpandedUserId(prev => (prev === userId ? null : userId));
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, paddingBottom: 80 }}>
      <Nav active="leaderboard" />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="display" style={{ fontSize: 'clamp(22px, 5vw, 36px)', fontWeight: 900, color: C.text, margin: '0 0 6px', letterSpacing: -1, textTransform: 'uppercase' }}>
            Leaderboard
          </h1>
          {tournament && (
            <p style={{ color: C.textSub, fontSize: 15, margin: '0 0 4px' }}>
              {tournament.name} · {tournament.region.name} · Ends {new Date(tournament.endsAt).toLocaleDateString()}
            </p>
          )}
          {tournament && (tournament.entryFeeCents > 0 || tournament.prizePoolCents > 0) && (
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              {tournament.entryFeeCents > 0 && (
                <span style={{ fontSize: 13, color: C.textSub, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 10px' }}>
                  Entry: {formatCents(tournament.entryFeeCents)}
                </span>
              )}
              {tournament.prizePoolCents > 0 && (
                <span style={{ fontSize: 13, color: C.accent, background: C.accent + '18', border: `1px solid ${C.accent}50`, borderRadius: 6, padding: '3px 10px', fontWeight: 700 }}>
                  🏆 Prize Pool: {formatCents(tournament.prizePoolCents)}
                </span>
              )}
            </div>
          )}
          <p style={{ color: C.textMuted, fontSize: 11, margin: '8px 0 0', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Auto-refreshes every 30s
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 16 }}>
          <button style={tabStyle('largest')} onClick={() => setTab('largest')}>Largest Fish</button>
          <button style={tabStyle('season')} onClick={() => setTab('season')}>Season Standings</button>
        </div>

        {/* Species filter pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {SPECIES_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setSpeciesFilter(f)}
              style={{
                background: speciesFilter === f ? C.accent + '25' : C.surface,
                border: `1px solid ${speciesFilter === f ? C.accent : C.border}`,
                borderRadius: 20, padding: '5px 14px', cursor: 'pointer',
                fontSize: 12, fontWeight: speciesFilter === f ? 700 : 500,
                color: speciesFilter === f ? C.accent : C.textMuted,
              }}
            >
              {f}
            </button>
          ))}
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
              <div key={entry.userId}>
                <div
                  onClick={() => toggleExpanded(entry.userId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: entry.rank === 1 ? C.surfaceHigh : C.surface,
                    border: `1px solid ${entry.rank === 1 ? C.accent + '40' : C.border}`,
                    borderRadius: expandedUserId === entry.userId ? '14px 14px 0 0' : 14,
                    padding: '16px 20px',
                    gap: 14,
                    cursor: 'pointer',
                  }}
                >
                  {/* Rank circle */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 20, flexShrink: 0,
                    border: `2px solid ${rankBorderColor(entry.rank)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: entry.rank <= 3 ? 18 : 13, fontWeight: 800,
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
                    {entry.speciesName && (
                      <div style={{ fontSize: 12, color: C.accent, marginTop: 2 }}>{entry.speciesName}</div>
                    )}
                  </div>

                  {/* Measurement + prop btn */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div>
                      <span style={{ fontSize: 22, fontWeight: 900, color: C.accent }}>{cmToInches(entry.fishLengthCm)}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.textSub, marginLeft: 3 }}>IN</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{entry.rank} PTS</div>
                    {entry.submissionId && (
                      <div style={{ marginTop: 6 }} onClick={e => e.stopPropagation()}>
                        <PropButton submissionId={entry.submissionId} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Comments section */}
                {expandedUserId === entry.userId && entry.submissionId && (
                  <CommentsSection submissionId={entry.submissionId} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
