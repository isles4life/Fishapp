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
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', backgroundColor: '#0D1A0D', color: '#F0EDE4' }}>
        {children}
        <footer style={{ borderTop: '1px solid #2A4A2A', padding: '16px 24px', textAlign: 'center' }}>
          <a href="/legal" style={{ color: '#4A6A4A', fontSize: 12, textDecoration: 'none' }}>Terms of Service &amp; Privacy Policy</a>
          <span style={{ color: '#2A4A2A', margin: '0 10px' }}>·</span>
          <span style={{ color: '#4A6A4A', fontSize: 12 }}>© 2026 FishLeague</span>
        </footer>
      </body>
    </html>
  );
}
