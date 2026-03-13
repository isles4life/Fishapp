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

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem('admin_token'));
    setReady(true);
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1821' }}>
      <form onSubmit={submit} style={{ background: '#162032', padding: 40, borderRadius: 12, border: '1px solid #2a3f55', width: 360 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="FishLeague" style={{ width: 72, display: 'block', margin: '0 auto 16px' }} />
        <h2 style={{ margin: '0 0 24px', color: '#e8f0fe', textAlign: 'center' }}>FishLeague Admin</h2>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: '#7a9bbf' }}>Email</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: '8px 10px', marginTop: 4, border: '1px solid #2a3f55', borderRadius: 6, boxSizing: 'border-box', background: '#0d1821', color: '#e8f0fe' }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 20 }}>
          <span style={{ fontSize: 13, color: '#7a9bbf' }}>Password</span>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            style={{ display: 'block', width: '100%', padding: '8px 10px', marginTop: 4, border: '1px solid #2a3f55', borderRadius: 6, boxSizing: 'border-box', background: '#0d1821', color: '#e8f0fe' }}
          />
        </label>
        {error && <p style={{ color: '#e74c3c', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '10px', background: '#2ecc71', color: '#0d1821', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
