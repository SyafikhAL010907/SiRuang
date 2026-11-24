'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainPJ from '@/components/PJKelas/MainUser';
import { UserDashboardSkeleton } from '@/components/Skeletons';

import { getRoleDashboardPath } from '@/lib/roleNavigation';
import { isAnyAdmin } from '@/lib/roles';

export default function PjPage() {
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
      // Khusus role 'pj_kelas'
      if (parsed.role === 'pj_kelas') {
        setAuthorized(true);
      } else if (isAnyAdmin(parsed.role)) {
        router.replace(getRoleDashboardPath(parsed.role));
      } else if (parsed.role === 'dosen') {
        router.replace('/dosen');
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
      <MainPJ />
    </main>
  );
}

