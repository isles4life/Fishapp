'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setToken } from '../../lib/api';

const C = {
  bg:          '#0D1A0D',
  surface:     '#152515',
  surfaceHigh: '#1D331D',
  border:      '#2A4A2A',
  borderGold:  '#C9A450',
  accent:      '#C9A450',
  accentDark:  '#9E7A30',
  verified:    '#3DAF5A',
  verifiedBg:  '#0F3A1E',
  error:       '#C0392B',
  errorBg:     '#3A1414',
  text:        '#F0EDE4',
  textSub:     '#8BA88B',
  textMuted:   '#4A6A4A',
  gold:        '#C9A450',
  silver:      '#A0A8A0',
  bronze:      '#8B6F4A',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocus, setEmailFocus] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.login(email, password);
      setToken(token);
      router.push('/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (focused: boolean): React.CSSProperties => ({
    width: '100%', padding: '14px', marginBottom: 12,
    backgroundColor: C.bg, border: `1px solid ${focused ? C.accent : C.border}`, borderRadius: 10,
    color: C.text, fontSize: 16, boxSizing: 'border-box', outline: 'none',
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ backgroundColor: C.surface, borderRadius: 16, padding: 40, width: '100%', maxWidth: 400, border: `1px solid ${C.border}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="FishLeague" style={{ width: 160, display: 'block', margin: '0 auto 16px' }} />
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: 1.5, color: C.text }}>FISH</span>
          <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: 1.5, color: C.accent }}>LEAGUE</span>
        </div>
        <h1 style={{ color: C.textSub, textAlign: 'center', margin: '0 0 4px', fontSize: 14, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Sign In</h1>
        <p style={{ color: C.textMuted, textAlign: 'center', margin: '0 0 28px', fontSize: 13 }}>Welcome back, angler</p>

        {error && (
          <div style={{ backgroundColor: C.errorBg, border: `1px solid ${C.error}`, color: C.error, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            style={inputStyle(emailFocus)}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onFocus={() => setEmailFocus(true)}
            onBlur={() => setEmailFocus(false)}
            required
          />
          <input
            style={inputStyle(passwordFocus)}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setPasswordFocus(true)}
            onBlur={() => setPasswordFocus(false)}
            required
          />
          <button type="submit" style={{ width: '100%', padding: '13px', backgroundColor: C.accent, color: C.bg, fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 10, cursor: 'pointer', marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ color: C.textMuted, textAlign: 'center', marginTop: 20, fontSize: 14 }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: C.accent, textDecoration: 'none', fontWeight: 600 }}>Register</Link>
        </p>
        <p style={{ color: C.textMuted, textAlign: 'center', marginTop: 8, fontSize: 14 }}>
          <Link href="/" style={{ color: C.textSub, textDecoration: 'none' }}>← Back to Leaderboard</Link>
        </p>
      </div>
    </div>
  );
}
