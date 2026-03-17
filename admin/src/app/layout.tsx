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
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: '"Inter", system-ui, -apple-system, sans-serif', margin: 0, background: '#3A4C44', color: '#F0EDE4' }}>
        <AuthProvider>
          <Nav />
          <main style={{ padding: 28, maxWidth: 1200, margin: '0 auto' }}>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
