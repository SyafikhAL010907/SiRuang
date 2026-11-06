'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainAdmin from '@/components/Admin/MainAdmin';

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
      if (parsed.role === 'admin') {
        setAuthorized(true);
      } else {
        router.replace('/user');
      }
    } catch {
      router.replace('/login');
    }
  }, [router]);

  if (!mounted || !authorized) return null;

  return (
    <main className="min-h-screen">
      <MainAdmin />
    </main>
  );
}
