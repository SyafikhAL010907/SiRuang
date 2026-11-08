'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, Cpu, HardHat, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DenahGedungGridProps {
  variant: 'mobile' | 'web';
}

const MOBILE_BUILDINGS = [
  // Urutan 1: Elektro (LE)
  { href: '/denah-le', code: 'LE', label: 'Gedung L Rumpun Elektro', desc: 'Eksplorasi denah lantai Gedung LE', icon: Cpu, border: 'border-blue-100 hover:border-blue-300', tile: 'bg-blue-50 text-blue-600', glow: 'bg-blue-400', badge: 'bg-blue-50 text-blue-600', image: '/PilihGedung/GedungLElektro.png' },
  // Urutan 2: SFD 
  { href: '/denah-sfd', code: 'SFD', label: 'Gedung SFD Tower A', desc: 'Eksplorasi denah lantai Gedung SFD', icon: Building2, border: 'border-[#588CBC]/30 hover:border-[#588CBC]', tile: 'bg-[#588CBC]/10 text-[#183449]', glow: 'bg-[#588CBC]', badge: 'bg-[#588CBC]/10 text-[#183449]', image: '/PilihGedung/GedungSFD.png' },
  // Urutan 3: Sipil (LS)
  { href: '/denah-ls', code: 'LS', label: 'Gedung L Rumpun Sipil', desc: 'Denah lantai Gedung LS (Segera Hadir)', icon: HardHat, border: 'border-orange-100 hover:border-orange-300', tile: 'bg-orange-50 text-orange-600', glow: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600', image: '/PilihGedung/GedungLSipil.png' }
];

const WEB_BUILDINGS = [
  // Urutan 1: SFD (Gedung SFD Tower A)
  {
    href: '/denah-sfd',
    label: 'Gedung SFD Tower A',
    image: '/PilihGedung/GedungSFD.png',
  },
  // Urutan 2: Sipil (Gedung L Sipil)
  {
    href: '/denah-ls',
    label: 'Gedung L Sipil',
    image: '/PilihGedung/GedungLSipil.png',
  },
  // Urutan 3: Elektro (Gedung L Elektro)
  {
    href: '/denah-le',
    label: 'Gedung L Elektro',
    image: '/PilihGedung/GedungLElektro.png',
  },
];

export const DenahGedungGrid: React.FC<DenahGedungGridProps> = ({ variant }) => {
  if (variant === 'mobile') {
    return (
      <div className="w-full mt-2 bg-white border border-slate-100/80 rounded-[36px] p-5 shadow-xl shadow-slate-200/20 mb-16 select-none">
        <div className="flex flex-col gap-4 text-left">
          {/* Header Section */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <Building2 size={20} className="text-[#183449]" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Denah Gedung</h3>
            </div>
            <span className="px-3 py-1 bg-[#588CBC]/10 text-[#183449] text-[10px] font-black rounded-full uppercase tracking-widest">3 Gedung</span>
          </div>

          {/* List Container - Diubah jadi Grid 3 Kolom biar nyamping */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MOBILE_BUILDINGS.map((gedung, i) => (
              <motion.div
                key={gedung.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="h-full"
              >
                <Link
                  href={gedung.href}
                  className={cn(
                    "group relative flex flex-col w-full h-full gap-4 overflow-hidden rounded-[28px] border bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 active:scale-[0.99]",
                    gedung.border
                  )}
                >
                  {/* Efek Glow di Pojok Kanan Atas */}
                  <div className={cn(
                    "pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20",
                    gedung.glow
                  )}></div>

                  {/* Container Gambar Baru */}
                  <div className="w-full h-32 rounded-2xl overflow-hidden relative flex items-center justify-center bg-slate-50 border border-slate-100/50">
                    <img 
                      src={gedung.image} 
                      alt={gedung.label} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      loading="lazy"
                    />
                  </div>

                  {/* Container Info Bawah (Tetap mempertahankan desain aslinya) */}
                  <div className="relative z-10 flex items-center gap-3 w-full mt-auto">
                    <div className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110",
                      gedung.tile
                    )}>
                      <gedung.icon size={18} strokeWidth={1.75} />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <span className={cn(
                        "mb-1 inline-block rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-widest",
                        gedung.badge
                      )}>{gedung.code}</span>
                      <p className="text-xs font-bold leading-snug text-slate-700 truncate">{gedung.label}</p>
                      <p className="mt-0.5 text-[9px] font-medium text-slate-400 truncate">{gedung.desc}</p>
                    </div>

                    <span className={cn(
                      "flex shrink-0 items-center justify-center h-6 w-6 rounded-full transition-colors",
                      gedung.badge
                    )}>
                      <ChevronRight size={12} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mt-4.5 lg:mt-5.5 border-t border-slate-100/70 pt-3.5">
      <div className="flex flex-col gap-3 text-left">
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-slate-100/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-slate-800" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Denah Gedung
            </h3>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            3 Gedung
          </span>
        </div>

        {/* 3 Kartu Gedung Ringkas (Ngepas 1 Layar Tanpa Scroll) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 mt-1.5">
          {WEB_BUILDINGS.map((gedung, i) => (
            <motion.div
              key={gedung.href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.06 }}
              className="h-full"
            >
              <Link
                href={gedung.href}
                className="group relative h-72 lg:h-[305px] w-full rounded-[28px] overflow-hidden flex flex-col justify-end p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-[0.99] border border-slate-100/60 block"
              >
                {/* Foto Gedung Background */}
                <img
                  src={gedung.image}
                  alt={gedung.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Gradient Overlay Gelap dari Bawah */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/5" />

                {/* Info Text & Tombol Putih */}
                <div className="relative z-10 flex flex-col">
                  <h3 className="text-lg lg:text-xl font-bold text-white tracking-tight leading-snug">
                    {gedung.label}
                  </h3>
                  <p className="text-xs text-white/80 font-normal leading-relaxed mt-1 mb-4 line-clamp-2">
                    Lihat denah gedung, temukan ruang kelas, dan temukan ruangan yang tersedia sesuai kebutuhanmu.
                  </p>

                  <div className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-full font-bold text-xs text-center transition-all shadow-md active:scale-[0.99]">
                    Lihat Denah
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DenahGedungGrid;