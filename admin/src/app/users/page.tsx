'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const C = {
  bg: '#0D1A0D', surface: '#152515', surfaceHigh: '#1D331D',
  border: '#2A4A2A', accent: '#C9A450',
  green: '#3DAF5A', greenBg: '#0F3A1E',
  red: '#C0392B', redBg: '#3A1414',
  orange: '#D4820A', orangeBg: '#3A2800',
  blue: '#3A7ABF', blueBg: '#0E2236',
  text: '#F0EDE4', textSub: '#8BA88B', textMuted: '#4A6A4A',
};

interface User {
  id: string;
  displayName: string;
  email: string | null;
  role: 'USER' | 'ADMIN';
  suspended: boolean;
  authProvider: string;
  createdAt: string;
  region: { name: string };
}

function Initials({ name }: { name: string }) {
  const letters = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      backgroundColor: C.surfaceHigh, border: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, color: C.textSub, letterSpacing: '0.5px',
    }}>
      {letters}
    </div>
  );
}

function Badge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
      color, backgroundColor: bg, border: `1px solid ${border}`,
      whiteSpace: 'nowrap', letterSpacing: '0.3px',
    }}>
      {label}
    </span>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [pwInputs, setPwInputs] = useState<Record<string, string>>({});
  const [pwVisible, setPwVisible] = useState<Record<string, boolean>>({});
  const [pwLoading, setPwLoading] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  async function load() {
    try { setUsers(await api.getUsers()); }
    catch (e: any) { setError(e.message); }
  }

  useEffect(() => { load(); }, []);

  async function setRole(user: User, role: 'USER' | 'ADMIN') {
    setLoading(user.id);
    try { await api.updateUser(user.id, { role }); await load(); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(null); }
  }

  async function toggleSuspend(user: User) {
    setLoading(user.id);
    try { await api.updateUser(user.id, { suspended: !user.suspended }); await load(); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(null); }
  }

  async function resetPassword(user: User) {
    const pw = pwInputs[user.id] ?? '';
    if (pw.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setPwLoading(user.id);
    setError('');
    try {
      await api.resetPassword(user.id, pw);
      setPwInputs(prev => { const n = { ...prev }; delete n[user.id]; return n; });
      setPwVisible(prev => { const n = { ...prev }; delete n[user.id]; return n; });
      setPwSuccess(user.id);
      setTimeout(() => setPwSuccess(null), 3000);
    } catch (e: any) { setError(e.message); }
    finally { setPwLoading(null); }
  }

  function togglePwInput(userId: string) {
    setPwVisible(prev => ({ ...prev, [userId]: !prev[userId] }));
    if (pwVisible[userId]) {
      setPwInputs(prev => { const n = { ...prev }; delete n[userId]; return n; });
    }
  }

  const filtered = users.filter(u =>
    (u.displayName + (u.email ?? '') + u.region?.name).toLowerCase().includes(search.toLowerCase())
  );

  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const suspendedCount = users.filter(u => u.suspended).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: C.text, margin: '0 0 6px', fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Users</h2>
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ color: C.textMuted, fontSize: 13 }}><span style={{ color: C.textSub, fontWeight: 600 }}>{users.length}</span> total</span>
            <span style={{ color: C.textMuted, fontSize: 13 }}><span style={{ color: C.accent, fontWeight: 600 }}>{adminCount}</span> admin</span>
            <span style={{ color: C.textMuted, fontSize: 13 }}><span style={{ color: C.red, fontWeight: 600 }}>{suspendedCount}</span> suspended</span>
          </div>
        </div>
        <input
          placeholder="Search name, email, region…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: 280, padding: '9px 14px', fontSize: 13,
            backgroundColor: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 8, color: C.text, outline: 'none',
          }}
        />
      </div>

      {error && (
        <div style={{ color: C.red, background: C.redBg, border: `1px solid ${C.red}50`, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              <th style={thStyle}>Angler</th>
              <th style={thStyle}>Region</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Joined</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '32px 24px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>
                  No users found.
                </td>
              </tr>
            )}
            {filtered.map((u, i) => (
              <tr
                key={u.id}
                style={{
                  borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
                  opacity: loading === u.id ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {/* Angler */}
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Initials name={u.displayName} />
                    <div>
                      <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{u.displayName}</div>
                      <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
                        {u.email ?? (
                          <span style={{ color: C.textSub }}>
                            {u.authProvider === 'APPLE' ? '🍎 Apple Sign‑In' : '—'}
                          </span>
                        )}
                      </div>
                      {u.email && (
                        <div style={{ color: C.textMuted, fontSize: 11, marginTop: 3 }}>✉ Email</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Region */}
                <td style={{ padding: '14px 20px', color: C.textSub, fontSize: 13, whiteSpace: 'nowrap' }}>
                  {u.region?.name ?? '—'}
                </td>

                {/* Role */}
                <td style={{ padding: '14px 20px' }}>
                  {u.role === 'ADMIN'
                    ? <Badge label="★ Admin" color={C.accent} bg={C.accent + '20'} border={C.accent + '50'} />
                    : <Badge label="User" color={C.textMuted} bg={C.surfaceHigh} border={C.border} />
                  }
                </td>

                {/* Status */}
                <td style={{ padding: '14px 20px' }}>
                  {u.suspended
                    ? <Badge label="⊘ Suspended" color={C.red} bg={C.redBg} border={C.red + '50'} />
                    : <Badge label="● Active" color={C.green} bg={C.greenBg} border={C.green + '50'} />
                  }
                </td>

                {/* Joined */}
                <td style={{ padding: '14px 20px', color: C.textMuted, fontSize: 13, whiteSpace: 'nowrap' }}>
                  {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>

                {/* Actions */}
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {u.role === 'USER'
                        ? <ActionBtn onClick={() => setRole(u, 'ADMIN')} disabled={!!loading} color={C.accent} bg={C.accent + '18'}>Make Admin</ActionBtn>
                        : <ActionBtn onClick={() => setRole(u, 'USER')} disabled={!!loading} color={C.orange} bg={C.orangeBg}>Revoke Admin</ActionBtn>
                      }
                      <ActionBtn
                        onClick={() => toggleSuspend(u)}
                        disabled={!!loading}
                        color={u.suspended ? C.green : C.red}
                        bg={u.suspended ? C.greenBg : C.redBg}
                      >
                        {u.suspended ? 'Unsuspend' : 'Suspend'}
                      </ActionBtn>
                      {u.authProvider !== 'APPLE' && (
                        <ActionBtn onClick={() => togglePwInput(u.id)} color={C.blue} bg={C.blueBg}>
                          {pwVisible[u.id] ? 'Cancel' : 'Reset PW'}
                        </ActionBtn>
                      )}
                    </div>

                    {pwVisible[u.id] && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          type="password"
                          placeholder="New password (min 8)"
                          value={pwInputs[u.id] ?? ''}
                          onChange={e => setPwInputs(prev => ({ ...prev, [u.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && resetPassword(u)}
                          style={{
                            padding: '5px 10px', fontSize: 12,
                            backgroundColor: C.bg, border: `1px solid ${C.border}`,
                            borderRadius: 6, color: C.text, width: 160,
                          }}
                        />
                        <ActionBtn onClick={() => resetPassword(u)} disabled={pwLoading === u.id} color={C.blue} bg={C.blueBg}>
                          {pwLoading === u.id ? '…' : 'Set'}
                        </ActionBtn>
                      </div>
                    )}

                    {pwSuccess === u.id && (
                      <span style={{ fontSize: 12, color: C.green }}>✓ Password updated</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, color: C.textMuted, fontSize: 12, textAlign: 'right' }}>
        {filtered.length} of {users.length} users
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '11px 20px',
  textAlign: 'left',
  color: '#4A6A4A',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
};

function ActionBtn({
  children, onClick, disabled, color, bg,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  color: string;
  bg: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: bg,
        color,
        border: `1px solid ${color}50`,
        padding: '5px 11px',
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}
