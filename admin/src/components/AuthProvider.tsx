'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

interface AuthCtx {
  token: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({ token: null, login: async () => null, logout: () => {} });

export function useAuth() { return useContext(Ctx); }

async function verifyAdminRole(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const user = await res.json();
    return user.role === 'ADMIN';
  } catch {
    return false;
  }
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('admin_token');
    if (stored) {
      verifyAdminRole(stored).then(isAdmin => {
        if (isAdmin) {
          setToken(stored);
        } else {
          localStorage.removeItem('admin_token');
        }
        setReady(true);
      });
    } else {
      setReady(true);
    }
  }, []);

  async function login(email: string, password: string): Promise<string | null> {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Platform': 'admin' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return err.message ?? 'Invalid credentials';
    }
    const data = await res.json();
    const isAdmin = await verifyAdminRole(data.token);
    if (!isAdmin) return 'This account does not have admin access.';
    localStorage.setItem('admin_token', data.token);
    setToken(data.token);
    return null;
  }

  function logout() {
    localStorage.removeItem('admin_token');
    setToken(null);
  }

  if (!ready) return null;

  if (!token) return <LoginScreen login={login} />;

  return (
    <Ctx.Provider value={{ token, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

function LoginScreen({ login }: { login: AuthCtx['login'] }) {
  const [email, setEmail] = useState('admin@fishleague.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const err = await login(email, password);
    if (err) setError(err);
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D1A0D' }}>
      <form onSubmit={submit} style={{ background: '#152515', padding: 40, borderRadius: 16, border: '1px solid #2A4A2A', width: 360 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="FishLeague" style={{ width: 72, display: 'block', margin: '0 auto 16px' }} />
        <h2 style={{ margin: '0 0 4px', color: '#F0EDE4', textAlign: 'center', fontSize: 22, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>
          <span style={{ color: '#F0EDE4' }}>FISH</span><span style={{ color: '#C9A450' }}>LEAGUE</span>
        </h2>
        <p style={{ margin: '0 0 24px', color: '#4A6A4A', textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Admin Panel</p>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4A6A4A', textTransform: 'uppercase', letterSpacing: 1 }}>Email</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: '10px 12px', marginTop: 6, border: '1px solid #2A4A2A', borderRadius: 8, boxSizing: 'border-box', background: '#0D1A0D', color: '#F0EDE4', fontSize: 14 }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 20 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4A6A4A', textTransform: 'uppercase', letterSpacing: 1 }}>Password</span>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            style={{ display: 'block', width: '100%', padding: '10px 12px', marginTop: 6, border: '1px solid #2A4A2A', borderRadius: 8, boxSizing: 'border-box', background: '#0D1A0D', color: '#F0EDE4', fontSize: 14 }}
          />
        </label>
        {error && <p style={{ color: '#C0392B', background: '#3A1414', border: '1px solid #C0392B50', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '12px', background: '#C9A450', color: '#0D1A0D', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
