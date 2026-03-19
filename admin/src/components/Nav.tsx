'use client';
import { useAuth } from './AuthProvider';

const C = {
  surface: '#2E3D38', border: '#4A6058', borderGold: '#CFC29C',
  accent: '#CFC29C', text: '#F0EDE4', textSub: '#9DB5A8', textMuted: '#6B7D73',
};

export default function Nav() {
  const { logout, isAdmin, isTournamentAdmin } = useAuth();

  const adminLinks = [
    { href: '/moderation', label: 'Moderation' },
    { href: '/tournaments', label: 'Tournaments' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/users', label: 'Users' },
    { href: '/history', label: 'History' },
    { href: '/requests', label: 'Requests' },
  ];

  const tournamentAdminLinks = [
    { href: '/moderation', label: 'Moderation' },
    { href: '/tournaments', label: 'Tournaments' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/history', label: 'History' },
  ];

  const links = isAdmin ? adminLinks : tournamentAdminLinks;

  return (
    <nav style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 24px 0 6px', display: 'flex', alignItems: 'center', height: 64, gap: 4 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="FishLeague" style={{ height: 44, marginRight: 0 }} />
      <span style={{ fontWeight: 900, fontSize: 16, marginRight: 28, letterSpacing: 1, marginLeft: 6 }}>
        <span style={{ color: C.text }}>FISH</span><span style={{ color: C.accent }}>LEAGUE</span>
        <span style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, marginLeft: 8, letterSpacing: 1.5 }}>
          {isTournamentAdmin ? 'TOURNAMENT DIRECTOR' : 'ADMIN'}
        </span>
      </span>
      {links.map(link => (
        <a key={link.href} href={link.href} style={{
          color: C.textSub, textDecoration: 'none', padding: '6px 14px',
          borderRadius: 6, fontSize: 13, fontWeight: 600, letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}>
          {link.label}
        </a>
      ))}
      <span style={{ marginLeft: 'auto' }}>
        <button onClick={logout} style={{
          background: 'transparent', border: `1px solid ${C.border}`,
          color: C.textSub, padding: '5px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>
          Sign Out
        </button>
      </span>
    </nav>
  );
}
