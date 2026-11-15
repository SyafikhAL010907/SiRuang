'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainUser from '@/components/User/MainUser';
import { UserDashboardSkeleton } from '@/components/Skeletons';

export default function UserPage() {
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
      // Langkah 3.7: Hanya izinkan role 'user' (Mahasiswa). Tolak role lain ke dashboard masing-masing.
      if (parsed.role === 'user') {
        setAuthorized(true);
      } else if (parsed.role === 'admin') {
        router.replace('/admin');
      } else if (parsed.role === 'dosen') {
        router.replace('/dosen');
      } else if (parsed.role === 'pj_kelas') {
        router.replace('/pj');
      } else {
        router.replace('/login');
      }
    } catch {
      router.replace('/login');
    }
  }, [router]);

  if (!mounted || !authorized) return <UserDashboardSkeleton />;

  return (
    <main className="min-h-screen">
      <MainUser />
    </main>
  );
}
