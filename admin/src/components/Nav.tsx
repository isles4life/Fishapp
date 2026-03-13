'use client';
import { useAuth } from './AuthProvider';

const C = { surface: '#162032', border: '#2a3f55', text: '#e8f0fe', textSub: '#7a9bbf', green: '#2ecc71' };

export default function Nav() {
  const { logout } = useAuth();

  return (
    <nav style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', height: 56, gap: 4 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="FishLeague" style={{ height: 32, marginRight: 10 }} />
      <span style={{ color: C.text, fontWeight: 800, fontSize: 16, marginRight: 24 }}>FishLeague</span>
      {[
        { href: '/moderation', label: 'Moderation' },
        { href: '/tournaments', label: 'Tournaments' },
        { href: '/leaderboard', label: 'Leaderboard' },
        { href: '/users', label: 'Users' },
        { href: '/history', label: 'History' },
      ].map(link => (
        <a key={link.href} href={link.href} style={{
          color: C.textSub, textDecoration: 'none', padding: '6px 14px',
          borderRadius: 6, fontSize: 14, fontWeight: 500,
        }}>
          {link.label}
        </a>
      ))}
      <span style={{ marginLeft: 'auto' }}>
        <button onClick={logout} style={{
          background: 'transparent', border: `1px solid ${C.border}`,
          color: C.textSub, padding: '5px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
        }}>
          Sign Out
        </button>
      </span>
    </nav>
  );
}
