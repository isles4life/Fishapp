export default function Home() {
  const C = { surface: '#2E3D38', border: '#4A6058', accent: '#CFC29C', text: '#F0EDE4', textSub: '#9DB5A8', textMuted: '#6B7D73' };
  const cards = [
    { href: '/moderation', label: 'Moderation Queue', desc: 'Review and approve pending catch submissions', icon: '🔍' },
    { href: '/tournaments', label: 'Tournaments', desc: 'Create, open, and close weekly tournaments', icon: '🏆' },
    { href: '/leaderboard', label: 'Leaderboard', desc: 'View current standings for any tournament', icon: '📊' },
    { href: '/users', label: 'Users', desc: 'Manage anglers, roles, and passwords', icon: '👥' },
    { href: '/history', label: 'History', desc: 'Audit log of all admin actions', icon: '📋' },
  ];
  return (
    <div>
      <h1 style={{ color: C.text, fontSize: 28, fontWeight: 800, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Dashboard</h1>
      <p style={{ color: C.textMuted, marginBottom: 32, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>FishLeague Admin Panel</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {cards.map(card => (
          <a key={card.href} href={card.href} style={{ textDecoration: 'none', display: 'block', backgroundColor: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.accent}`, borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{card.icon}</div>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{card.label}</div>
            <div style={{ color: C.textSub, fontSize: 14 }}>{card.desc}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
