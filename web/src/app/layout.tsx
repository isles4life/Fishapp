import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FishLeague – Live Leaderboard',
  description: 'Follow the live competitive fishing leaderboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', backgroundColor: '#111111', color: '#fff' }}>
        {children}
      </body>
    </html>
  );
}
