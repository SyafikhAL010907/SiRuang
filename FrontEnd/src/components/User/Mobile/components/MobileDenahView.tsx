'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Map, ChevronRight, Cpu, Building2, HardHat, Info, ArrowUpRight } from 'lucide-react';

export interface MobileDenahViewProps {
  onBackToHome?: () => void;
}

const GEDUNG_LIST = [
  {
    code: 'LE',
    name: 'Gedung L Rumpun Elektro',
    desc: 'Laboratorium, bengkel mekanik, studio gambar, dan ruang kuliah.',
    icon: Cpu,
    href: '/denah-le',
    image: '/PilihGedung/GedungLElektro.png',
    floors: [
      { num: 1, label: 'Lantai 1' },
      { num: 2, label: 'Lantai 2' },
      { num: 3, label: 'Lantai 3' },
      { num: 4, label: 'Lantai 4' },
    ],
    accent: 'from-blue-600 to-indigo-700',
    tag: 'Tersedia 4 Lantai',
  },
  {
    code: 'SFD',
    name: 'Gedung SFD Tower A',
    desc: 'Ruang kelas teori, auditorium mini, dan laboratorium terpadu.',
    icon: Building2,
    href: '/denah-sfd',
    image: '/PilihGedung/GedungSFD.png',
    floors: [
      { num: 3, label: 'Lantai 3' },
      { num: 8, label: 'Lantai 8' },
    ],
    accent: 'from-[#183449] to-[#2B5474]',
    tag: 'Tersedia 2 Lantai',
  },
  {
    code: 'LS',
    name: 'Gedung L Rumpun Sipil',
    desc: 'Laboratorium struktur, material, hidrolika, dan ruang dosen.',
    icon: HardHat,
    href: '/denah-ls',
    image: '/PilihGedung/GedungLSipil.png',
    floors: [
      { num: 1, label: 'Lantai 1' },
      { num: 2, label: 'Lantai 2' },
      { num: 3, label: 'Lantai 3' },
      { num: 4, label: 'Lantai 4' },
    ],
    accent: 'from-amber-600 to-orange-700',
    tag: 'Segera Hadir',
  },
];

export const MobileDenahView: React.FC<MobileDenahViewProps> = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full bg-[#F8FAFB] overflow-hidden select-none"
      style={{
        backgroundImage: `url('/Batik.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Curved Header */}
      <div className="bg-linear-to-br from-[#183449] to-[#2B5474] rounded-b-[36px] px-6 pt-10 pb-7 shadow-xl relative overflow-hidden shrink-0 z-20">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#588CBC]/20 rounded-full blur-3xl pointer-events-none" />
        <header className="relative z-10 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 mb-1">
            <Map size={16} className="text-[#588CBC]" />
            <span className="text-[9px] font-black text-sky-200 uppercase tracking-[0.25em]">
              Denah Interaktif
            </span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight leading-tight">
            Eksplorasi Denah Gedung
          </h2>
          <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
            Pilih gedung kampus dan jelajahi denah ruangan perkuliahan secara visual.
          </p>
        </header>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 sm:px-6 pt-5 pb-36 relative z-10">
        <div className="flex flex-col gap-4">

          {/* LIST GEDUNG */}
          {GEDUNG_LIST.map((gedung) => {
            const Icon = gedung.icon;
            return (
              <div
                key={gedung.code}
                className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-100 shadow-md shadow-slate-200/30 overflow-hidden"
              >
                {/* Image Banner */}
                <div className="h-32 w-full relative overflow-hidden bg-slate-100">
                  <Image
                    src={gedung.image}
                    alt={gedung.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-slate-950/85 via-slate-900/30 to-transparent" />
                  
                  {/* Badge & Info on Image */}
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-[9px] font-black uppercase tracking-wider">
                      {gedung.tag}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                        <Icon size={16} />
                      </div>
                      <h3 className="text-sm font-black text-white tracking-tight truncate drop-shadow-sm">
                        {gedung.name}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 flex flex-col gap-3">
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {gedung.desc}
                  </p>

                  {/* Floor Quick Links */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {gedung.floors.map((fl) => (
                      <span
                        key={fl.num}
                        className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-700"
                      >
                        {fl.label}
                      </span>
                    ))}
                  </div>

                  {/* Main Link Button */}
                  <Link
                    href={gedung.href}
                    className="w-full mt-1 py-2.5 px-4 bg-[#183449] hover:bg-[#588CBC] text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span>Buka Denah {gedung.code}</span>
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Legenda Warna Card */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Info size={14} className="text-[#588CBC]" />
              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                Legenda Status Ruangan
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300" />
                <span>Kelas Kosong</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FFEB3B] border border-amber-300" />
                <span>Dalam Pengajuan</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#E53935]" />
                <span>Sedang Digunakan</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#757575]" />
                <span>Fasilitas Umum</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
};

export default MobileDenahView;

