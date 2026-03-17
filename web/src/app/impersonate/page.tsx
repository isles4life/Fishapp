'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ImpersonateInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('fl_token', token);
    }
    router.replace('/profile');
  }, [params, router]);

  return null;
}

export default function ImpersonatePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3A4C44', color: '#F0EDE4', fontSize: 14 }}>
      Signing in…
      <Suspense>
        <ImpersonateInner />
      </Suspense>
    </div>
  );
}
