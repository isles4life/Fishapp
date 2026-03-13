import type { Metadata } from 'next';
import type { Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'FishLeague – Competitive Fishing',
  description: 'Competitive fishing league with live leaderboards and weekly tournaments',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet" />
        <style>{`
          .display {
            font-family: 'Barlow Condensed', -apple-system, BlinkMacSystemFont, sans-serif;
          }
        `}</style>
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', backgroundColor: '#0D1A0D', color: '#F0EDE4' }}>
        {children}
      </body>
    </html>
  );
}
