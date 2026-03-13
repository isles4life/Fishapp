'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const C = {
  bg: '#0D1A0D', surface: '#152515', surfaceHigh: '#1D331D',
  border: '#2A4A2A', accent: '#C9A450',
  green: '#3DAF5A', red: '#C0392B', orange: '#D4820A',
  blue: '#3A7ABF', purple: '#9b59b6',
  text: '#F0EDE4', textSub: '#8BA88B', textMuted: '#4A6A4A',
};

interface AuditEntry {
  id: string;
  action: string;
  actorName: string | null;
  targetId: string | null;
  details: Record<string, any> | null;
  createdAt: string;
}

const ACTION_META: Record<string, { label: string; color: string; icon: string }> = {
  TOURNAMENT_CREATED:      { label: 'Tournament Created',  color: C.blue,   icon: '🏆' },
  TOURNAMENT_OPENED:       { label: 'Tournament Opened',   color: C.green,  icon: '▶' },
  TOURNAMENT_CLOSED:       { label: 'Tournament Closed',   color: C.orange, icon: '■' },
  USER_PROMOTED_TO_ADMIN:  { label: 'Promoted to Admin',   color: C.accent, icon: '★' },
  USER_DEMOTED_TO_USER:    { label: 'Demoted to User',     color: C.textSub, icon: '↓' },
  USER_SUSPENDED:          { label: 'User Suspended',      color: C.red,    icon: '⊘' },
  USER_UNSUSPENDED:        { label: 'User Unsuspended',    color: C.green,  icon: '✓' },
  USER_LOGIN:              { label: 'Login',               color: C.textSub, icon: '→' },
};

function getDetails(entry: AuditEntry): string {
  const d = entry.details;
  if (!d) return '';
  if (entry.action.startsWith('TOURNAMENT')) {
    if (d.name) return d.name + (d.weekNumber ? ` · Week ${d.weekNumber}, ${d.year}` : '');
  }
  if (entry.action === 'USER_LOGIN') {
    const platform = d.platform ? d.platform.charAt(0).toUpperCase() + d.platform.slice(1) : '';
    const provider = d.authProvider === 'APPLE' ? 'Apple' : 'Email';
    return [platform, provider, d.email].filter(Boolean).join(' · ');
  }
  if (entry.action.startsWith('USER')) {
    if (d.targetName) return d.targetName + (d.targetEmail ? ` (${d.targetEmail})` : '');
  }
  return JSON.stringify(d);
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try { setEntries(await api.getAuditLog()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const categories = [
    { key: 'ALL', label: 'All' },
    { key: 'TOURNAMENT', label: 'Tournaments' },
    { key: 'USER_LOGIN', label: 'Logins' },
    { key: 'USER', label: 'Users' },
  ];

  const filtered = entries.filter(e => {
    if (filter === 'ALL') return true;
    if (filter === 'USER_LOGIN') return e.action === 'USER_LOGIN';
    if (filter === 'USER') return e.action.startsWith('USER') && e.action !== 'USER_LOGIN';
    return e.action.startsWith(filter);
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <h2 style={{ color: C.text, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>History</h2>
        <span style={{ color: C.textMuted, fontSize: 14 }}>{entries.length} events</span>
        <button onClick={load} disabled={loading} style={{ marginLeft: 'auto', background: C.surfaceHigh, color: C.textSub, border: `1px solid ${C.border}`, padding: '5px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ color: C.red, background: C.red + '15', border: `1px solid ${C.red}50`, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {categories.map(c => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            style={{
              padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: filter === c.key ? C.surfaceHigh : 'transparent',
              color: filter === c.key ? C.text : C.textMuted,
              border: `1px solid ${filter === c.key ? C.border : 'transparent'}`,
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['Event', 'Details', 'Actor', 'Time'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 32, textAlign: 'center', color: C.textMuted }}>
                  No events yet.
                </td>
              </tr>
            )}
            {filtered.map(entry => {
              const meta = ACTION_META[entry.action] ?? { label: entry.action, color: C.textSub, icon: '•' };
              return (
                <tr key={entry.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 13, fontWeight: 600,
                      color: meta.color,
                      background: meta.color + '18',
                      border: `1px solid ${meta.color}40`,
                      padding: '3px 10px', borderRadius: 6,
                    }}>
                      <span>{meta.icon}</span>
                      {meta.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: C.textSub, fontSize: 13 }}>
                    {getDetails(entry) || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: C.textMuted, fontSize: 13 }}>
                    {entry.actorName ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: C.textMuted, fontSize: 13, whiteSpace: 'nowrap' }}>
                    <div>{new Date(entry.createdAt).toLocaleDateString()}</div>
                    <div style={{ fontSize: 11, marginTop: 2 }}>{new Date(entry.createdAt).toLocaleTimeString()}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
