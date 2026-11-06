'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { DenahGedungSkeleton } from './DenahGedungSkeleton';
import { UserDashboardSkeleton } from './UserDashboardSkeleton';
import { AdminDashboardSkeleton } from './AdminDashboardSkeleton';

type SkeletonType = 'denah' | 'user' | 'admin' | null;

/**
 * Komponen cerdas yang langsung memunculkan Skeleton seketika (0 ms)
 * begitu link diklik, selagi Next.js sedang compiling / fetching rute tujuan.
 * Menghilangkan efek 'macet / stuck di halaman lama' saat proses compile.
 */
export function NavigationSkeletonOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeSkeleton, setActiveSkeleton] = useState<SkeletonType>(null);
  const [, startTransition] = useTransition();

  // Begitu rute tujuan selesai di-compile dan URL berubah, hilangkan skeleton overlay
  useEffect(() => {
    setActiveSkeleton(null);
  }, [pathname, searchParams]);

  // Pasang listener global untuk semua klik link navigasi internal
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      // Abaikan jika klik kanan, ctrl+klik, shift+klik, dll
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
        return;
      }

      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      // Abaikan jika membuka tab baru
      if (target.getAttribute('target') === '_blank') {
        return;
      }

      try {
        const url = new URL(href, window.location.href);
        // Abaikan link eksternal ke website lain
        if (url.origin !== window.location.origin) return;

        const targetPath = url.pathname;

        // Abaikan jika mengklik halaman yang sama persis
        if (targetPath === window.location.pathname && url.search === window.location.search) {
          return;
        }

        // Tentukan skeleton apa yang cocok untuk rute tujuan
        if (targetPath.startsWith('/denah-')) {
          startTransition(() => {
            setActiveSkeleton('denah');
          });
        } else if (targetPath.startsWith('/user')) {
          startTransition(() => {
            setActiveSkeleton('user');
          });
        } else if (targetPath.startsWith('/admin')) {
          startTransition(() => {
            setActiveSkeleton('admin');
          });
        }
      } catch (err) {
        // Biarkan navigasi normal jika parsing URL gagal
      }
    };

    document.addEventListener('click', handleAnchorClick, true);
    return () => {
      document.removeEventListener('click', handleAnchorClick, true);
    };
  }, []);

  // Safety fallback: batalkan overlay jika navigasi gagal / dibatalkan setelah 8 detik
  useEffect(() => {
    if (!activeSkeleton) return;
    const safetyTimer = setTimeout(() => {
      setActiveSkeleton(null);
    }, 8000);
    return () => clearTimeout(safetyTimer);
  }, [activeSkeleton]);

  if (!activeSkeleton) return null;

  return (
    <div className="fixed inset-0 z-99999 bg-[#F6F8FA] overflow-y-auto pointer-events-none animate-in fade-in duration-150">
      {activeSkeleton === 'denah' && <DenahGedungSkeleton />}
      {activeSkeleton === 'user' && <UserDashboardSkeleton />}
      {activeSkeleton === 'admin' && <AdminDashboardSkeleton />}
    </div>
  );
}

