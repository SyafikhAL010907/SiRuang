'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus_Jakarta_Sans, Fasthand } from 'next/font/google';
import { ArrowLeft, ArrowUpRight, Building2, Layers } from 'lucide-react';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});
const fasthand = Fasthand({ subsets: ['latin'], weight: '400' });

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const GEDUNG = { nama: 'Gedung L Elektro', kode: 'LE', base: '/denah-le' };

// Ganti `preview` ke gambar tiap lantai kalau sudah ada, misal '/LE/Lantai1.png'
const FLOORS = [
  { lantai: 1, preview: '/Lantai3.png' },
  { lantai: 2, preview: '/Lantai3.png' },
  { lantai: 3, preview: '/Lantai3.png' },
  { lantai: 4, preview: '/Lantai3.png' },
];

const container = 'mx-auto w-full max-w-[1440px] px-6 lg:px-[84px]';

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function MainGedungLE() {
  return (
    <div className={`${jakarta.className} min-h-screen w-full bg-[#F6F6F4] pb-20 text-[#333333]`}>
      {/* ---------------- TOP BAR ---------------- */}
      <div className={`${container} pt-8 lg:pt-10`}>
        <Link
          href="/"
          prefetch={true}
          className="group inline-flex items-center gap-2 rounded-full border border-[#E3E3E0] bg-white py-2 pl-3 pr-5 text-[14px] font-semibold text-[#333333] transition-colors hover:border-[#333333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2AC72]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F1F1EE] transition-colors group-hover:bg-[#333333] group-hover:text-white">
            <ArrowLeft size={15} />
          </span>
          Kembali ke Beranda
        </Link>
      </div>

      {/* ---------------- HERO ---------------- */}
      <section className={`${container} mt-6 lg:mt-8`}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-[28px] px-7 py-10 text-white sm:px-10 lg:rounded-[40px] lg:px-[56px] lg:py-[64px]"
          style={{ background: 'linear-gradient(90deg, #183449 0%, #588CBC 100%)' }}
        >
          {/* huruf besar sebagai elemen tipografi, bukan hiasan blur */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-10 -right-2 select-none text-[220px] font-extrabold leading-none text-white/[0.07] sm:text-[300px] lg:-bottom-16 lg:right-8 lg:text-[380px]"
          >
            {GEDUNG.kode}
          </span>

          <div className="relative z-10 max-w-[640px]">
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/70">
              <Building2 size={15} />
              {GEDUNG.nama}
            </p>

            <h1 className="mt-5 leading-[1.05]">
              <span className="block text-[34px] font-bold sm:text-[44px] lg:text-[52px]">DENAH VISUAL</span>
              <span className={`${fasthand.className} block text-[48px] font-normal sm:text-[62px] lg:text-[76px]`}>
                Pilih Lantai
              </span>
            </h1>

            <p className="mt-5 max-w-[520px] text-[15px] leading-[26px] text-white/85 sm:text-[17px] sm:leading-[28px]">
              Pilih salah satu lantai untuk membuka denah. Di dalamnya kamu bisa cek status
              ruangan, fasilitas, dan mengajukan booking.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-[13px] font-semibold ring-1 ring-white/20">
                <Layers size={15} />
                {FLOORS.length} lantai
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-[13px] font-semibold ring-1 ring-white/20">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C2AC72] opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#C2AC72]" />
                </span>
                Status real-time
              </span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ---------------- DAFTAR LANTAI ---------------- */}
      <section className={`${container} mt-12 lg:mt-16`}>
        <div className="mb-7 flex items-end justify-between gap-4 lg:mb-9">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9A9A96]">
              {GEDUNG.nama}
            </p>
            <h2 className="mt-2 text-[26px] font-bold leading-[1.2] lg:text-[34px]">Semua Lantai</h2>
          </div>
          <p className="hidden text-[14px] text-[#9A9A96] sm:block">Klik kartu untuk membuka denah</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {FLOORS.map((f, i) => (
            <motion.div
              key={f.lantai}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.12 + i * 0.07, ease: 'easeOut' }}
            >
              <Link
                href={`${GEDUNG.base}/lantai${f.lantai}`}
                prefetch={true}
                aria-label={`Buka denah Lantai ${f.lantai} ${GEDUNG.nama}`}
                className="group relative flex h-full flex-col rounded-[24px] border border-[#E8E8E5] bg-white p-4 transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1.5 hover:border-[#333333] hover:shadow-[0_20px_44px_rgba(0,0,0,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2AC72] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F6F4]"
              >
                {/* preview */}
                <div className="relative flex h-[190px] items-center justify-center overflow-hidden rounded-[16px] bg-[#F3F3F0]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.preview}
                    alt={`Preview denah Lantai ${f.lantai}`}
                    loading="lazy"
                    draggable={false}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="h-full w-full object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold tracking-wider text-[#333333] shadow-sm">
                    {String(f.lantai).padStart(2, '0')}
                  </span>
                </div>

                {/* info */}
                <div className="flex flex-1 items-end justify-between gap-3 px-1 pb-1 pt-5">
                  <div>
                    <h3 className="text-[22px] font-bold leading-[1.2]">Lantai {f.lantai}</h3>
                    <span className="my-2 block h-[4px] w-[32px] rounded-full bg-[#C2AC72]" />
                    <p className="text-[13px] font-medium text-[#9A9A96]">{GEDUNG.nama}</p>
                  </div>

                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E3E3E0] text-[#333333] transition-colors duration-300 group-hover:border-[#333333] group-hover:bg-[#333333] group-hover:text-white">
                    <ArrowUpRight size={20} className="transition-transform duration-300 group-hover:rotate-12" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}