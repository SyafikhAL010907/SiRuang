'use client';

import React from 'react';
import { Skeleton, SkeletonCircle, SkeletonText, DeferredSkeleton } from './BaseSkeleton';

export function UserDashboardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <DeferredSkeleton delay={delay}>
      <div className="min-h-screen bg-[#F6F8FA] p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
          {/* Kolom Kiri - Profil & Info */}
          <aside className="w-full lg:w-[320px] flex flex-col gap-5 shrink-0">
            {/* Card Profil */}
            <div className="bg-[#183449]/10 rounded-3xl p-6 flex flex-col gap-4 border border-[#183449]/10">
              <div className="flex items-center gap-3">
                <SkeletonCircle size={52} className="bg-[#183449]/20" />
                <div className="flex-1 flex flex-col gap-2">
                  <Skeleton className="h-4 w-24 bg-[#183449]/20" />
                  <Skeleton className="h-3 w-16 bg-[#183449]/15" />
                </div>
              </div>
              <Skeleton className="h-7 w-3/4 bg-[#183449]/20 mt-2" />
              <Skeleton className="h-8 w-32 rounded-full bg-[#183449]/20" />
            </div>

            {/* Card Panduan Cepat */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col gap-3 shadow-sm">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>

            {/* Card Jam Layanan */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col gap-3 shadow-sm">
              <Skeleton className="h-3 w-24" />
              <div className="flex items-center gap-3">
                <SkeletonCircle size={32} />
                <div className="flex-1 flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
              </div>
            </div>

            {/* Tombol Logout Placeholder */}
            <Skeleton className="h-10 w-36 rounded-xl mt-auto" />
          </aside>

          {/* Kolom Kanan - Chat Hero & Denah */}
          <main className="flex-1 flex flex-col gap-8">
            {/* Hero Card Buka Chat */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center gap-4">
              <SkeletonCircle size={72} />
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-12 w-full max-w-md rounded-2xl" />
              <Skeleton className="h-4 w-64 mt-1" />
              <Skeleton className="h-14 w-full max-w-sm rounded-2xl mt-2" />
            </div>

            {/* Section Denah Gedung */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-20" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-3"
                  >
                    <Skeleton className="h-36 w-full rounded-xl" />
                    <div className="flex justify-between items-center pt-2">
                      <Skeleton className="h-5 w-28" />
                      <SkeletonCircle size={28} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </DeferredSkeleton>
  );
}

