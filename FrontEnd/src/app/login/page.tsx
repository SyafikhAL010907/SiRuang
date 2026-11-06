'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainAuth from '@/components/Authentication/MainAuth';

export default function LoginPage() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Kalau sudah login, langsung redirect ke dashboard sesuai role
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.role === 'admin') {
          setIsRedirecting(true);
          router.replace('/admin');
          return;
        } else {
          setIsRedirecting(true);
          router.replace('/user');
          return;
        }
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, [router]);

  if (isRedirecting) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-slate-200 border-t-[#588CBC]" />
      </div>
    );
  }

  const handleLoginSuccess = (userData: any) => {
    if (userData.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/user');
    }
  };

  return (
    <MainAuth 
      initialMode="login" 
      onLoginSuccess={handleLoginSuccess} 
    />
  );
}
