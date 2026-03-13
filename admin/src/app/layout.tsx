import type { Metadata } from 'next';
import AuthProvider from '../components/AuthProvider';
import Nav from '../components/Nav';

export const metadata: Metadata = { title: 'FishLeague Admin' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin: 0, background: '#0D1A0D', color: '#F0EDE4' }}>
        <AuthProvider>
          <Nav />
          <main style={{ padding: 28, maxWidth: 1200, margin: '0 auto' }}>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
