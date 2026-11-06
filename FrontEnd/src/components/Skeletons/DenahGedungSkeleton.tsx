'use client';

import React from 'react';
import { Skeleton, SkeletonCircle, DeferredSkeleton } from './BaseSkeleton';

export function DenahGedungSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <DeferredSkeleton delay={delay}>
      <div className="min-h-screen bg-[#F6F8FA] p-4 md:p-6 lg:p-8 flex flex-col gap-6">
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
          {/* Top Bar: Tombol Kembali & Info Lantai */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <SkeletonCircle size={40} />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>

            {/* Floor Switcher Pills */}
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((fl) => (
                <Skeleton key={fl} className="h-9 w-20 rounded-xl" />
              ))}
            </div>
          </div>

          {/* Main Floor Canvas Skeleton */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col gap-6 min-h-125">
            {/* Header Denah */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <Skeleton className="h-6 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            </div>

            {/* Grid Blueprint Denah Placeholder */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#F8FAFC] rounded-2xl border border-dashed border-gray-200">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((room) => (
                <div
                  key={room}
                  className="bg-white rounded-xl p-4 border border-gray-100 flex flex-col justify-between h-32"
                >
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-4 w-16" />
                    <SkeletonCircle size={10} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Legend */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex gap-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-10 w-36 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </DeferredSkeleton>
  );
}

