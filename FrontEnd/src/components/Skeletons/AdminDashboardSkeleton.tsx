'use client';

import React from 'react';
import { Skeleton, SkeletonCircle, DeferredSkeleton } from './BaseSkeleton';

export function AdminDashboardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <DeferredSkeleton delay={delay}>
      <div className="flex h-screen w-full bg-[#F6F8FA] p-3 md:p-4 gap-4 overflow-hidden">
        {/* Kolom Kiri: Sidebar Admin & Daftar Chat */}
        <aside className="w-full md:w-[340px] lg:w-[380px] h-full flex flex-col gap-3.5 shrink-0">
          {/* Card Header Admin */}
          <div className="bg-[#183449]/15 rounded-3xl p-5 border border-[#183449]/10 flex flex-col gap-3.5">
            <div className="flex items-center gap-3">
              <SkeletonCircle size={48} className="bg-[#183449]/20" />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32 bg-[#183449]/20" />
                <Skeleton className="h-3 w-20 bg-[#183449]/15" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-7 w-24 rounded-full bg-[#183449]/20" />
              <Skeleton className="h-7 w-20 rounded-full bg-[#183449]/20" />
            </div>
          </div>

          {/* Search Bar & Mode Hapus */}
          <Skeleton className="h-11 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-2xl" />

          {/* Tab Filters */}
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1 rounded-xl" />
            <Skeleton className="h-9 flex-1 rounded-xl" />
            <Skeleton className="h-9 flex-1 rounded-xl" />
          </div>

          {/* Daftar Chat Rooms Placeholder */}
          <div className="flex-1 overflow-hidden flex flex-col gap-2.5 pt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm flex items-center gap-3"
              >
                <SkeletonCircle size={44} />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>

          {/* Tombol Logout */}
          <Skeleton className="h-10 w-36 rounded-xl mt-auto" />
        </aside>

        {/* Kolom Kanan: Area Pesan Chat */}
        <main className="hidden md:flex flex-1 h-full bg-white rounded-3xl border border-gray-100 shadow-sm flex-col overflow-hidden">
          {/* Chat Room Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SkeletonCircle size={42} />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
            <div className="flex gap-2">
              <SkeletonCircle size={32} />
              <SkeletonCircle size={32} />
            </div>
          </div>

          {/* Chat Messages Placeholder */}
          <div className="flex-1 p-6 flex flex-col justify-end gap-4 overflow-hidden">
            {/* Pesan User (Kiri) */}
            <div className="flex gap-3 max-w-md">
              <SkeletonCircle size={32} />
              <Skeleton className="h-14 flex-1 rounded-2xl rounded-tl-none" />
            </div>

            {/* Pesan Admin/AI (Kanan) */}
            <div className="flex justify-end gap-3 max-w-lg self-end w-full">
              <Skeleton className="h-20 w-3/4 rounded-2xl rounded-tr-none bg-[#183449]/10" />
            </div>

            {/* Pesan User (Kiri) */}
            <div className="flex gap-3 max-w-sm">
              <SkeletonCircle size={32} />
              <Skeleton className="h-10 flex-1 rounded-2xl rounded-tl-none" />
            </div>

            {/* Pesan Admin (Kanan) */}
            <div className="flex justify-end gap-3 max-w-md self-end w-full">
              <Skeleton className="h-12 w-2/3 rounded-2xl rounded-tr-none bg-[#183449]/10" />
            </div>
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 border-t border-gray-100 flex items-center gap-3">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <SkeletonCircle size={36} />
            <Skeleton className="h-12 flex-1 rounded-2xl" />
            <SkeletonCircle size={42} />
          </div>
        </main>
      </div>
    </DeferredSkeleton>
  );
}

