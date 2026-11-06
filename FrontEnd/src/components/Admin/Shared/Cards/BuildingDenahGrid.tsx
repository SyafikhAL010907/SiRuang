'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Cpu, HardHat, Building2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BuildingDenahGridProps {
  variant?: 'web' | 'mobile';
}

export const BuildingDenahGrid: React.FC<BuildingDenahGridProps> = ({ variant = 'web' }) => {
  const isMobile = variant === 'mobile';

  if (isMobile) {
    const mobileGedungs = [
      { href: '/denah-le', code: 'LE', label: 'Gedung L Rumpun Elektro', desc: 'Eksplorasi denah lantai Gedung LE', icon: Cpu, border: 'border-blue-100 hover:border-blue-400 active:border-blue-400', tile: 'bg-blue-50 text-blue-600', glow: 'bg-blue-400', badge: 'bg-blue-50 text-blue-600', image: '/Lantai3.png' },
      { href: '/denah-sfd', code: 'SFD', label: 'Gedung SFD Tower A', desc: 'Eksplorasi denah lantai Gedung SFD', icon: Building2, border: 'border-[#588CBC]/30 hover:border-[#588CBC] active:border-[#588CBC]', tile: 'bg-[#588CBC]/10 text-[#183449]', glow: 'bg-[#588CBC]', badge: 'bg-[#588CBC]/10 text-[#183449]', image: '/Lantai3.png' },
      { href: '/denah-ls', code: 'LS', label: 'Gedung L Rumpun Sipil', desc: 'Denah lantai Gedung LS (Segera Hadir)', icon: HardHat, border: 'border-orange-100 hover:border-orange-400 active:border-orange-400', tile: 'bg-orange-50 text-orange-600', glow: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600', image: '/Lantai3.png' }
    ];

    return (
      <div className="flex flex-col gap-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">
          Denah Gedung
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mobileGedungs.map((gedung) => (
            <Link
              key={gedung.href}
              href={gedung.href}
              className={cn(
                "group relative flex flex-col gap-3 overflow-hidden rounded-[28px] border-2 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-[0.98]",
                gedung.border
              )}
            >
              {/* Efek Glow Pojok Kanan */}
              <div
                className={cn(
                  "pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-30",
                  gedung.glow
                )}
              />

              {/* Container Gambar (Posisi Teratas) - Tanpa zoom efek */}
              <div className="w-full h-28 rounded-xl overflow-hidden relative flex items-center justify-center bg-slate-50 border-2 border-slate-100/60 shrink-0">
                <img
                  src={gedung.image}
                  alt={gedung.label}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Info Gedung (Bawah Gambar) */}
              <div className="relative z-10 flex min-w-0 items-start gap-3 mt-1">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110",
                    gedung.tile
                  )}
                >
                  <gedung.icon size={22} strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "mb-1 inline-block rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-widest",
                      gedung.badge
                    )}
                  >
                    {gedung.code}
                  </span>
                  <p className="text-xs font-bold leading-snug text-slate-700 truncate">{gedung.label}</p>
                  <p className="mt-0.5 text-[9px] font-medium text-slate-400 truncate">{gedung.desc}</p>
                </div>
              </div>

              {/* Panah (Icon Arrow) di Pojok Kanan Bawah */}
              <div className="mt-auto flex justify-end w-full">
                <ChevronRight
                  size={16}
                  className="relative z-10 shrink-0 text-slate-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-slate-500"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const webGedungs = [
    { href: '/denah-le', code: 'LE', label: 'Gedung L Rumpun Elektro', desc: 'Eksplorasi denah lantai Gedung LE', icon: Cpu, border: 'border-blue-100 hover:border-blue-300', tile: 'bg-blue-50 text-blue-600', glow: 'bg-blue-400', badge: 'bg-blue-50 text-blue-600', arrow: 'group-hover:text-blue-500' },
    { href: '/denah-ls', code: 'LS', label: 'Gedung L Rumpun Sipil', desc: 'Denah lantai Gedung LS (Segera Hadir)', icon: HardHat, border: 'border-orange-100 hover:border-orange-300', tile: 'bg-orange-50 text-orange-600', glow: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600', arrow: 'group-hover:text-orange-500' },
    { href: '/denah-sfd', code: 'SFD', label: 'Gedung SFD Tower A', desc: 'Eksplorasi denah lantai Gedung SFD', icon: Building2, border: 'border-[#588CBC]/30 hover:border-[#588CBC]', tile: 'bg-[#588CBC]/10 text-[#183449]', glow: 'bg-[#588CBC]', badge: 'bg-[#588CBC]/10 text-[#183449]', arrow: 'group-hover:text-[#588CBC]' }
  ];

  return (
    <div className="flex flex-col gap-6">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-6">Denah Gedung</h4>
      <div className="flex flex-col gap-4">
        {webGedungs.map((gedung, i) => (
          <motion.div
            key={gedung.href}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.1 }}
          >
            <Link
              href={gedung.href}
              className={cn(
                "group relative flex items-center justify-between gap-4 overflow-hidden rounded-4xl border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/60",
                gedung.border
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-30",
                  gedung.glow
                )}
              />
              <div className="relative z-10 flex min-w-0 items-center gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110",
                    gedung.tile
                  )}
                >
                  <gedung.icon size={22} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className={cn(
                      "mb-1 inline-block rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest",
                      gedung.badge
                    )}
                  >
                    {gedung.code}
                  </span>
                  <p className="text-sm font-bold leading-snug text-slate-700">{gedung.label}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-400">{gedung.desc}</p>
                </div>
              </div>
              <ChevronRight
                size={18}
                className={cn("relative z-10 shrink-0 text-slate-300 transition-all duration-300 group-hover:translate-x-1", gedung.arrow)}
              />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default BuildingDenahGrid;
