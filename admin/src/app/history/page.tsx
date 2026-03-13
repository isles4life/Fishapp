'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const C = {
  bg: '#0d1821', surface: '#162032', surfaceHigh: '#1e2d40', border: '#2a3f55',
  green: '#2ecc71', red: '#e74c3c', orange: '#e67e22', gold: '#f0b429',
  blue: '#3498db', purple: '#9b59b6',
  text: '#e8f0fe', textSub: '#7a9bbf', textMuted: '#4a6580',
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
  TOURNAMENT_CREATED:      { label: 'Tournament Created',      color: C.blue,   icon: '🏆' },
  TOURNAMENT_OPENED:       { label: 'Tournament Opened',       color: C.green,  icon: '▶' },
  TOURNAMENT_CLOSED:       { label: 'Tournament Closed',       color: C.orange, icon: '■' },
  USER_PROMOTED_TO_ADMIN:  { label: 'Promoted to Admin',       color: C.gold,   icon: '★' },
  USER_DEMOTED_TO_USER:    { label: 'Demoted to User',         color: C.textSub,'icon': '↓' },
  USER_SUSPENDED:          { label: 'User Suspended',          color: C.red,    icon: '⊘' },
  USER_UNSUSPENDED:        { label: 'User Unsuspended',        color: C.green,  icon: '✓' },
};

function getDetails(entry: AuditEntry): string {
  const d = entry.details;
  if (!d) return '';
  if (entry.action.startsWith('TOURNAMENT')) {
    if (d.name) return d.name + (d.weekNumber ? ` · Week ${d.weekNumber}, ${d.year}` : '');
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

  useEffect(() => {
    api.getAuditLog()
      .then(setEntries)
      .catch((e: any) => setError(e.message));
  }, []);

  const categories = [
    { key: 'ALL', label: 'All' },
    { key: 'TOURNAMENT', label: 'Tournaments' },
    { key: 'USER', label: 'Users' },
  ];

  const filtered = entries.filter(e =>
    filter === 'ALL' || e.action.startsWith(filter)
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <h2 style={{ color: C.text, margin: 0 }}>History</h2>
        <span style={{ color: C.textMuted, fontSize: 14 }}>{entries.length} events</span>
      </div>

      {error && (
        <div style={{ color: C.red, background: C.red + '15', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
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
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: C.textMuted, fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{h}</th>
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
