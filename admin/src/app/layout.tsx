import type { Metadata } from 'next';
import AuthProvider from '../components/AuthProvider';
import Nav from '../components/Nav';

export const metadata: Metadata = { title: 'FishLeague Admin' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, background: '#0d1821', color: '#e8f0fe' }}>
        <AuthProvider>
          <Nav />
          <main style={{ padding: 28, maxWidth: 1200, margin: '0 auto' }}>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
