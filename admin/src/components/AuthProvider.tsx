'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID ?? '';
const APPLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI ?? '';

type AdminRole = 'ADMIN' | 'TOURNAMENT_ADMIN';

interface AuthCtx {
  token: string | null;
  role: AdminRole | null;
  assignedTournamentIds: string[];
  isAdmin: boolean;
  isTournamentAdmin: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  loginWithAppleToken: (identityToken: string) => Promise<string | null>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({
  token: null, role: null, assignedTournamentIds: [], isAdmin: false, isTournamentAdmin: false,
  login: async () => null, loginWithAppleToken: async () => null, logout: () => {},
});

export function useAuth() { return useContext(Ctx); }

async function verifyRole(token: string): Promise<{ role: AdminRole; assignedTournamentIds: string[] } | null> {
  try {
    const res = await fetch(`${BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = await res.json();
    if (user.role !== 'ADMIN' && user.role !== 'TOURNAMENT_ADMIN') return null;
    const role: AdminRole = user.role;
    let assignedTournamentIds: string[] = [];
    if (role === 'TOURNAMENT_ADMIN') {
      const r2 = await fetch(`${BASE}/tournament-admin/my-tournaments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r2.ok) assignedTournamentIds = await r2.json();
    }
    return { role, assignedTournamentIds };
  } catch {
    return null;
  }
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [assignedTournamentIds, setAssignedTournamentIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('admin_token');
    if (stored) {
      verifyRole(stored).then(result => {
        if (result) { setToken(stored); setRole(result.role); setAssignedTournamentIds(result.assignedTournamentIds); }
        else localStorage.removeItem('admin_token');
        setReady(true);
      });
    } else {
      setReady(true);
    }
  }, []);

  async function saveToken(raw: string): Promise<string | null> {
    const result = await verifyRole(raw);
    if (!result) return 'This account does not have admin or tournament director access.';
    localStorage.setItem('admin_token', raw);
    setToken(raw);
    setRole(result.role);
    setAssignedTournamentIds(result.assignedTournamentIds);
    return null;
  }

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
    return saveToken(data.token);
  }

  async function loginWithAppleToken(identityToken: string): Promise<string | null> {
    const res = await fetch(`${BASE}/auth/apple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Platform': 'admin' },
      body: JSON.stringify({ identityToken, displayName: null }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return err.message ?? 'Apple Sign-In failed';
    }
    const data = await res.json();
    return saveToken(data.token);
  }

  function logout() {
    localStorage.removeItem('admin_token');
    setToken(null); setRole(null); setAssignedTournamentIds([]);
  }

  if (!ready) return null;
  if (!token) return <LoginScreen login={login} loginWithAppleToken={loginWithAppleToken} />;

  const isAdmin = role === 'ADMIN';
  const isTournamentAdmin = role === 'TOURNAMENT_ADMIN';

  return (
    <Ctx.Provider value={{ token, role, assignedTournamentIds, isAdmin, isTournamentAdmin, login, loginWithAppleToken, logout }}>
      {children}
    </Ctx.Provider>
  );
}

function LoginScreen({ login, loginWithAppleToken }: { login: AuthCtx['login']; loginWithAppleToken: AuthCtx['loginWithAppleToken'] }) {
  const [email, setEmail] = useState('admin@fishleague.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const appleReady = useRef(false);

  // Load Apple Sign-In JS SDK
  useEffect(() => {
    if (!APPLE_CLIENT_ID || !APPLE_REDIRECT_URI) return;
    if (document.getElementById('apple-signin-sdk')) { initApple(); return; }
    const script = document.createElement('script');
    script.id = 'apple-signin-sdk';
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.onload = initApple;
    document.head.appendChild(script);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initApple() {
    const w = window as any;
    if (!w.AppleID) return;
    w.AppleID.auth.init({
      clientId: APPLE_CLIENT_ID,
      scope: 'name email',
      redirectURI: APPLE_REDIRECT_URI,
      usePopup: true,
    });
    appleReady.current = true;
  }

  async function handleAppleSignIn() {
    const w = window as any;
    if (!w.AppleID || !appleReady.current) {
      setError('Apple Sign-In is not configured. Check NEXT_PUBLIC_APPLE_CLIENT_ID env var.');
      return;
    }
    setAppleLoading(true);
    setError('');
    try {
      const response = await w.AppleID.auth.signIn();
      const identityToken = response?.authorization?.id_token;
      if (!identityToken) throw new Error('No identity token returned from Apple');
      const err = await loginWithAppleToken(identityToken);
      if (err) setError(err);
    } catch (e: any) {
      if (e?.error !== 'popup_closed_by_user') {
        setError(e?.message ?? 'Apple Sign-In failed');
      }
    }
    setAppleLoading(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const err = await login(email, password);
    if (err) setError(err);
    setLoading(false);
  }

  const appleEnabled = !!APPLE_CLIENT_ID && !!APPLE_REDIRECT_URI;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3A4C44' }}>
      <div style={{ background: '#2E3D38', padding: 40, borderRadius: 16, border: '1px solid #4A6058', width: 360 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="FishLeague" style={{ width: 150, display: 'block', margin: '0 auto 20px' }} />
        <h2 style={{ margin: '0 0 4px', color: '#F0EDE4', textAlign: 'center', fontSize: 28, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase' }}>
          <span style={{ color: '#F0EDE4' }}>FISH</span><span style={{ color: '#CFC29C' }}>LEAGUE</span>
        </h2>
        <p style={{ margin: '0 0 28px', color: '#6B7D73', textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Admin Panel</p>

        {/* Apple Sign-In button */}
        {appleEnabled && (
          <>
            <button
              type="button"
              onClick={handleAppleSignIn}
              disabled={appleLoading}
              style={{
                width: '100%', padding: '12px', marginBottom: 16,
                background: '#000', color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 15, fontWeight: 600, cursor: appleLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                opacity: appleLoading ? 0.7 : 1,
              }}
            >
              <svg width="16" height="20" viewBox="0 0 16 20" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.27 10.57c-.02-2.18 1.78-3.23 1.86-3.28-1.01-1.48-2.59-1.68-3.15-1.7-1.34-.14-2.62.79-3.3.79-.68 0-1.73-.77-2.84-.75-1.46.02-2.81.85-3.56 2.16C.8 10.4 1.9 14.96 3.4 17.5c.74 1.24 1.63 2.63 2.79 2.58 1.12-.04 1.55-.72 2.91-.72 1.36 0 1.74.72 2.93.7 1.21-.02 1.97-1.26 2.71-2.5.86-1.44 1.21-2.84 1.23-2.91-.03-.01-2.68-1.03-2.7-4.08zM11.15 3.8C11.74 3.07 12.14 2.06 12.02 1c-.88.04-1.96.59-2.59 1.32-.57.65-1.07 1.69-.93 2.68.97.07 1.97-.49 2.65-1.2z"/>
              </svg>
              {appleLoading ? 'Signing in…' : 'Sign in with Apple'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: '#4A6058' }} />
              <span style={{ color: '#6B7D73', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: '#4A6058' }} />
            </div>
          </>
        )}

        <form onSubmit={submit}>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7D73', textTransform: 'uppercase', letterSpacing: 1 }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ display: 'block', width: '100%', padding: '10px 12px', marginTop: 6, border: '1px solid #4A6058', borderRadius: 8, boxSizing: 'border-box', background: '#3A4C44', color: '#F0EDE4', fontSize: 14 }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7D73', textTransform: 'uppercase', letterSpacing: 1 }}>Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              style={{ display: 'block', width: '100%', padding: '10px 12px', marginTop: 6, border: '1px solid #4A6058', borderRadius: 8, boxSizing: 'border-box', background: '#3A4C44', color: '#F0EDE4', fontSize: 14 }}
            />
          </label>
          {error && <p style={{ color: '#C0392B', background: '#3A1414', border: '1px solid #C0392B50', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: '#CFC29C', color: '#3A4C44', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
