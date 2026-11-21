'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainAdmin from '@/components/Admin/MainAdmin';
import { AdminDashboardSkeleton } from '@/components/Skeletons';
import { isAnyAdmin } from '@/lib/roles';
import { getRoleDashboardPath } from '@/lib/roleNavigation';

export default function AdminPage() {
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
      if (isAnyAdmin(parsed.role)) {
        // Arahkan ke dashboard spesifik per role
        const targetPath = getRoleDashboardPath(parsed.role);
        if (targetPath !== '/admin') {
          router.replace(targetPath);
          return;
        }
        setAuthorized(true);
      } else if (parsed.role === 'dosen') {
        router.replace('/dosen');
      } else if (parsed.role === 'pj_kelas') {
        router.replace('/pj');
      } else {
        router.replace('/user');
      }
    } catch {
      router.replace('/login');
    }
  }, [router]);

  if (!mounted || !authorized) return <AdminDashboardSkeleton />;

  return (
    <main className="min-h-screen">
      <MainAdmin />
    </main>
  );
}
