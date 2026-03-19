'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID ?? '';
const APPLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI ?? '';

interface AuthCtx {
  token: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  loginWithAppleToken: (identityToken: string) => Promise<string | null>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({ token: null, login: async () => null, loginWithAppleToken: async () => null, logout: () => {} });

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
        if (isAdmin) setToken(stored);
        else localStorage.removeItem('admin_token');
        setReady(true);
      });
    } else {
      setReady(true);
    }
  }, []);

  async function saveToken(raw: string): Promise<string | null> {
    const isAdmin = await verifyAdminRole(raw);
    if (!isAdmin) return 'This Apple account does not have admin access.';
    localStorage.setItem('admin_token', raw);
    setToken(raw);
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
    setToken(null);
  }

  if (!ready) return null;
  if (!token) return <LoginScreen login={login} loginWithAppleToken={loginWithAppleToken} />;

  return (
    <Ctx.Provider value={{ token, login, loginWithAppleToken, logout }}>
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
              <svg width="18" height="18" viewBox="0 0 814 1000" fill="white">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 376.8 7.8 312.7 7.8 247.9c0-164.3 124.2-250.6 246.4-250.6 70.2 0 128.6 46.3 172.1 46.3 43.4 0 111.5-49.1 191.6-49.1 30.8 0 132.9 2.9 198.3 99.3zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
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
