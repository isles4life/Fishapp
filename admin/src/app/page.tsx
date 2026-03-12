export default function Home() {
  const C = { surface: '#162032', border: '#2a3f55', text: '#e8f0fe', textSub: '#7a9bbf', green: '#2ecc71' };
  const cards = [
    { href: '/moderation', label: 'Moderation Queue', desc: 'Review and approve pending catch submissions', icon: '🔍' },
    { href: '/tournaments', label: 'Tournaments', desc: 'Create, open, and close weekly tournaments', icon: '🏆' },
    { href: '/leaderboard', label: 'Leaderboard', desc: 'View current standings for any tournament', icon: '📊' },
  ];
  return (
    <div>
      <h1 style={{ color: C.text, fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Dashboard</h1>
      <p style={{ color: C.textSub, marginBottom: 32, fontSize: 15 }}>FishLeague Admin Panel</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {cards.map(card => (
          <a key={card.href} href={card.href} style={{ textDecoration: 'none', display: 'block', backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{card.icon}</div>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{card.label}</div>
            <div style={{ color: C.textSub, fontSize: 14 }}>{card.desc}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
