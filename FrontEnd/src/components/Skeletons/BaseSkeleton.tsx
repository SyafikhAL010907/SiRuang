'use client';

import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Elemen dasar Skeleton dengan animasi denyut (pulse) halus
 */
export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-[#E6ECF1]/80 ${className}`}
      {...props}
    />
  );
}

/**
 * Skeleton khusus lingkaran (avatar, icon button)
 */
export function SkeletonCircle({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <Skeleton
      style={{ width: size, height: size }}
      className={`rounded-full shrink-0 ${className}`}
    />
  );
}

/**
 * Skeleton baris teks
 */
export function SkeletonText({
  lines = 1,
  className = '',
  gap = 'gap-2',
}: {
  lines?: number;
  className?: string;
  gap?: string;
}) {
  return (
    <div className={`flex flex-col ${gap} w-full`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'} ${className}`}
        />
      ))}
    </div>
  );
}

/**
 * Pembungkus cerdas agar skeleton HANYA muncul jika loading memakan waktu > delay (default 200ms).
 * Jika rendering cepat (< 200ms), skeleton TIDAK AKAN MUNCUL sama sekali, sehingga transisi langsung mulus tanpa kedip (flicker).
 */
export function DeferredSkeleton({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const [show, setShow] = React.useState(delay === 0);

  React.useEffect(() => {
    if (delay === 0) return;
    const timer = setTimeout(() => {
      setShow(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;

  return (
    <div className="transition-opacity duration-200 opacity-100">
      {children}
    </div>
  );
}

