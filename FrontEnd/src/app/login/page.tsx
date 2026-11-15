'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainAuth from '@/components/Authentication/MainAuth';
import { getRoleDashboardPath } from '@/lib/roleNavigation';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const redirectParam = searchParams.get('redirect');

  useEffect(() => {
    // Kalau sudah login, langsung redirect ke dashboard sesuai role (Langkah 3.6)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.role) {
          setIsRedirecting(true);
          const defaultPath = getRoleDashboardPath(parsed.role);

          // Cek apakah ada redirect param yang cocok dengan role user
          if (redirectParam && redirectParam.startsWith('/')) {
            if (
              (redirectParam.startsWith('/admin') && parsed.role === 'admin') ||
              (redirectParam.startsWith('/dosen') && parsed.role === 'dosen') ||
              (redirectParam.startsWith('/pj') && parsed.role === 'pj_kelas') ||
              (redirectParam.startsWith('/user') && parsed.role === 'user')
            ) {
              router.replace(redirectParam);
              return;
            }
          }

          router.replace(defaultPath);
          return;
        }
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, [router, redirectParam]);

  if (isRedirecting) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-slate-200 border-t-[#588CBC]" />
      </div>
    );
  }

  const handleLoginSuccess = (userData: any) => {
    const role = userData?.role;
    const defaultPath = getRoleDashboardPath(role);

    if (redirectParam && redirectParam.startsWith('/')) {
      if (
        (redirectParam.startsWith('/admin') && role === 'admin') ||
        (redirectParam.startsWith('/dosen') && role === 'dosen') ||
        (redirectParam.startsWith('/pj') && role === 'pj_kelas') ||
        (redirectParam.startsWith('/user') && role === 'user')
      ) {
        router.push(redirectParam);
        return;
      }
    }

    router.push(defaultPath);
  };

  return (
    <MainAuth 
      initialMode="login" 
      onLoginSuccess={handleLoginSuccess} 
    />
  );
}
