import type { Metadata } from 'next';
import AuthProvider from '../components/AuthProvider';
import Nav from '../components/Nav';

export const metadata: Metadata = { title: 'FishLeague Admin' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, background: '#f5f5f5' }}>
        <AuthProvider>
          <Nav />
          <main style={{ padding: 24 }}>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
