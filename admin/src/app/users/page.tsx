'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const C = {
  bg: '#0d1821', surface: '#162032', surfaceHigh: '#1e2d40', border: '#2a3f55',
  green: '#2ecc71', greenMuted: '#1a3a2a', red: '#e74c3c', orange: '#e67e22',
  gold: '#f0b429', text: '#e8f0fe', textSub: '#7a9bbf', textMuted: '#4a6580',
  blue: '#3498db',
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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  // password reset state: { [userId]: newPassword }
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <h2 style={{ color: C.text, margin: 0 }}>Users</h2>
        <span style={{ color: C.textMuted, fontSize: 14 }}>{users.length} total</span>
      </div>

      {error && <div style={{ color: C.red, background: C.red + '15', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}

      <input
        placeholder="Search by name, email or region..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', maxWidth: 400, padding: '9px 12px', marginBottom: 20, fontSize: 14, backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, boxSizing: 'border-box' }}
      />

      <div style={{ backgroundColor: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['User', 'Region', 'Auth', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: C.textMuted, fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: C.textMuted }}>No users found.</td></tr>
            )}
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}`, opacity: loading === u.id ? 0.5 : 1 }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ color: C.text, fontWeight: 600 }}>{u.displayName}</div>
                  <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{u.email ?? '—'}</div>
                </td>
                <td style={{ padding: '12px 16px', color: C.textSub, fontSize: 14 }}>{u.region?.name ?? '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 12, color: u.authProvider === 'APPLE' ? C.textSub : C.textMuted }}>
                    {u.authProvider === 'APPLE' ? '🍎 Apple' : '✉ Email'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                    color: u.role === 'ADMIN' ? C.gold : C.textSub,
                    backgroundColor: u.role === 'ADMIN' ? C.gold + '20' : C.bg,
                    border: `1px solid ${u.role === 'ADMIN' ? C.gold + '50' : C.border}`,
                  }}>
                    {u.role === 'ADMIN' ? '★ Admin' : 'User'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                    color: u.suspended ? C.red : C.green,
                    backgroundColor: u.suspended ? C.red + '20' : C.greenMuted,
                    border: `1px solid ${u.suspended ? C.red + '50' : C.green + '50'}`,
                  }}>
                    {u.suspended ? '⊘ Suspended' : '● Active'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: C.textMuted, fontSize: 13 }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {u.role === 'USER'
                        ? <button onClick={() => setRole(u, 'ADMIN')} disabled={!!loading} style={btnStyle('#7c5c00', C.gold)}>Make Admin</button>
                        : <button onClick={() => setRole(u, 'USER')} disabled={!!loading} style={btnStyle('#3a1a00', C.orange)}>Revoke Admin</button>
                      }
                      <button onClick={() => toggleSuspend(u)} disabled={!!loading} style={btnStyle(u.suspended ? '#1a3a2a' : '#3a0f0f', u.suspended ? C.green : C.red)}>
                        {u.suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                      {u.authProvider !== 'APPLE' && (
                        <button onClick={() => togglePwInput(u.id)} style={btnStyle('#0e2236', C.blue)}>
                          {pwVisible[u.id] ? 'Cancel' : 'Reset Password'}
                        </button>
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
                          style={{ padding: '5px 10px', fontSize: 13, backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, width: 180 }}
                        />
                        <button
                          onClick={() => resetPassword(u)}
                          disabled={pwLoading === u.id}
                          style={btnStyle('#0e2236', C.blue)}
                        >
                          {pwLoading === u.id ? '...' : 'Set'}
                        </button>
                      </div>
                    )}

                    {pwSuccess === u.id && (
                      <span style={{ fontSize: 12, color: C.green }}>Password updated.</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const btnStyle = (bg: string, color: string): React.CSSProperties => ({
  background: bg, color, border: `1px solid ${color}50`,
  padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
});
