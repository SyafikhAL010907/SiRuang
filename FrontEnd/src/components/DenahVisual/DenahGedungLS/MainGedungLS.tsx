'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Undo2, ArrowUpRight } from 'lucide-react';
import { getRoleDashboardPath } from '@/lib/roleNavigation';

// Aset: sementara foto lantai pakai punya L Elektro (public/PilihLantaiLElektro/).
// Nanti kalau foto LS udah ada, ganti BASE_FOTO / path img di FLOORS.
// Background Batik.png & logo di root public/
const BASE_FOTO = '/PilihLantaiLElektro';
const BACKGROUND = '/Batik.png';
const LOGO = '/LogoSiRuangDatar.png';

// Font halaman ini (samain dengan SFD). Kalau mau ganti font, cukup ubah FONT_NAMA.
const FONT_NAMA = 'Geom';
const FONT_UTAMA = `'${FONT_NAMA}', ui-sans-serif, system-ui, sans-serif`;
const FONT_URL = `https://fonts.googleapis.com/css2?family=${FONT_NAMA.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap`;

const GEDUNG = { nama: 'Gedung LS', base: '/denah-ls' };

const FLOORS = [
  { label: 1, img: `${BASE_FOTO}/Lantai1.png`, href: `${GEDUNG.base}/lantai1` },
  { label: 2, img: `${BASE_FOTO}/Lantai2.png`, href: `${GEDUNG.base}/lantai2` },
  { label: 3, img: `${BASE_FOTO}/Lantai3.png`, href: `${GEDUNG.base}/lantai3` },
  { label: 4, img: `${BASE_FOTO}/Lantai4.png`, href: `${GEDUNG.base}/lantai4` },
];

// ---- Ukuran kartu & bentuk lekukan (px) ----
const W = 250;   // lebar kartu
const H = 332;   // tinggi kartu
const R = 20;    // corner radius 4 sudut kartu

// Tombol
const BTN = 44;  // diameter tombol (w-11 h-11)

// Subtract: lingkaran pengurang (Figma: 69 x 69)
const SUB = 69;
const SR = SUB / 2;          // radius lingkaran subtract = 34.5

// Pusat lingkaran subtract = pusat tombol (nempel di pojok kanan bawah)
const CX = W - BTN / 2;
const CY = H - BTN / 2;

// Radius penghalus di titik pertemuan card x lingkaran (ujung lekukan).
const F = 12;

const f = (n: number) => n.toFixed(2);

// Titik tengah fillet (lingkaran kecil yang menyinggung sisi card & lingkaran subtract)
const dOff = Math.sqrt((SR + F) ** 2 - (BTN / 2 - F) ** 2);

// Fillet atas (nempel di sisi kanan card)
const tFcx = W - F;
const tFcy = CY - dOff;
const tP1x = CX + ((tFcx - CX) * SR) / (SR + F);
const tP1y = CY + ((tFcy - CY) * SR) / (SR + F);

// Fillet kiri (nempel di sisi bawah card)
const lFcx = CX - dOff;
const lFcy = H - F;
const lP2x = CX + ((lFcx - CX) * SR) / (SR + F);
const lP2y = CY + ((lFcy - CY) * SR) / (SR + F);

const CARD_PATH = [
  `M ${R} 0`,
  `H ${W - R}`,
  `A ${R} ${R} 0 0 1 ${W} ${R}`,
  `V ${f(tFcy)}`,                                   // turun sampai awal lekukan
  `A ${F} ${F} 0 0 1 ${f(tP1x)} ${f(tP1y)}`,        // penghalus atas
  `A ${SR} ${SR} 0 0 0 ${f(lP2x)} ${f(lP2y)}`,      // lengkung Subtract (lingkaran 69)
  `A ${F} ${F} 0 0 1 ${f(lFcx)} ${H}`,              // penghalus kiri
  `H ${R}`,
  `A ${R} ${R} 0 0 1 0 ${H - R}`,
  `V ${R}`,
  `A ${R} ${R} 0 0 1 ${R} 0`,
  'Z',
].join(' ');

export default function MainGedungLS() {
  const router = useRouter();

  const handleBack = () => {
    const target = getRoleDashboardPath();
    router.push(target);
  };

  return (
    <div
      className="min-h-screen w-full bg-white bg-cover bg-center flex flex-col items-center px-6 py-5"
      style={{ backgroundImage: `url('${BACKGROUND}')`, fontFamily: FONT_UTAMA }}
    >
      <style>{`@import url('${FONT_URL}');`}</style>

      {/* Header: Kembali + Logo */}
      <header className="w-full max-w-5xl flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-3 text-sm font-medium text-black hover:opacity-70 transition-opacity cursor-pointer"
        >
          <Undo2 size={18} />
          Kembali
        </button>

        {/* Logo: ubah h-14 / md:h-20 kalau mau lebih besar/kecil */}
        <img
          src={LOGO}
          alt="SiRuang"
          className="h-14 md:h-20 w-auto object-contain -my-3"
        />
      </header>

      {/* Judul */}
      <div className="text-center mt-4 md:mt-6 mb-8">
        <h1 className="text-2xl md:text-3xl text-black leading-snug">
          <span className="font-normal">Pilih Lantai </span>
          <span className="font-bold">dan Temukan</span>
          <br />
          <span className="font-bold">
            Ruang Kelas yang tersedia di {GEDUNG.nama}
          </span>
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-sm text-black leading-relaxed">
          Temukan ruang kelas yang tersedia di setiap lantai {GEDUNG.nama} dan
          pantau status ketersediaannya untuk kebutuhan akademik Anda.
        </p>
      </div>

      {/* 4 Kartu Lantai (di tengah) */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-8">
        {FLOORS.map((floor) => (
          <Link
            key={floor.label}
            href={floor.href}
            prefetch={true}
            className="group relative block cursor-pointer shrink-0"
            style={{ width: W, height: H }}
          >
            {/* Kartu dengan lekukan hasil Subtract */}
            <div
              className="absolute inset-0 bg-gray-300 overflow-hidden"
              style={{ clipPath: `path('${CARD_PATH}')` }}
            >
              <img
                src={floor.img}
                alt={`Lantai ${floor.label}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

              <div className="absolute left-5 bottom-5 right-20 text-white">
                <h2 className="text-xl font-bold leading-tight">
                  Lantai {floor.label}
                </h2>
                <p className="text-xs leading-snug mt-1 text-white/90">
                  Lihat denah visual dan cek status ketersediaannya
                </p>
              </div>
            </div>

            {/* Tombol panah: hitam -> kuning saat hover */}
            <span
              className="absolute right-0 bottom-0 rounded-full bg-black text-white flex items-center justify-center transition-colors duration-300 group-hover:bg-[#FFC61A] group-hover:text-black"
              style={{ width: BTN, height: BTN }}
            >
              <ArrowUpRight size={18} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}