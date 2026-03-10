export default function Home() {
  return (
    <div>
      <h1>FishLeague Admin Dashboard</h1>
      <p>Select a section from the nav to get started.</p>
      <ul>
        <li><a href="/moderation">Moderation Queue</a> – review pending submissions</li>
        <li><a href="/tournaments">Tournaments</a> – create / open / close weekly tournaments</li>
        <li><a href="/leaderboard">Leaderboard</a> – view current standings</li>
      </ul>
    </div>
  );
}
