'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainDosen from '@/components/Dosen/MainUser';
import { UserDashboardSkeleton } from '@/components/Skeletons';

export default function DosenPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.replace('/login');
      return;
    }
    try {
      const parsed = JSON.parse(storedUser);
      // Khusus role 'dosen'
      if (parsed.role === 'dosen') {
        setAuthorized(true);
      } else if (parsed.role === 'admin') {
        router.replace('/admin');
      } else if (parsed.role === 'pj_kelas') {
        router.replace('/pj');
      } else {
        router.replace('/user');
      }
    } catch {
      router.replace('/login');
    }
  }, [router]);

  if (!mounted || !authorized) return <UserDashboardSkeleton />;

  return (
    <main className="min-h-screen">
      <MainDosen />
    </main>
  );
}

