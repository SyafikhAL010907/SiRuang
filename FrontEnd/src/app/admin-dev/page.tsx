'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainAdmin from '@/components/Admin/MainAdmin';
import { AdminDashboardSkeleton } from '@/components/Skeletons';
import { isAdminDev } from '@/lib/roles';
import { getRoleDashboardPath } from '@/lib/roleNavigation';

export default function AdminDevPage() {
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
      if (isAdminDev(parsed.role)) {
        setAuthorized(true);
      } else {
        router.replace(getRoleDashboardPath(parsed.role));
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
