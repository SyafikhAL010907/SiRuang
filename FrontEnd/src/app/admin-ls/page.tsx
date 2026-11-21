'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLSMain from '@/components/AdminGedung/AdminLS/AdminLSMain';
import { AdminDashboardSkeleton } from '@/components/Skeletons';
import { getRoleDashboardPath } from '@/lib/roleNavigation';

export default function AdminLSPage() {
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
      if (parsed.role === 'admin_ls') {
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
      <AdminLSMain />
    </main>
  );
}
