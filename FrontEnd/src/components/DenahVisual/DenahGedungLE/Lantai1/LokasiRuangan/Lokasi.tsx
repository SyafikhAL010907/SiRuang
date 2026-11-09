'use client';

import React from 'react';
import { DenahL1LE, FULL_BOX, JALUR } from '../DenahL1LE/DenahL1LE';
import type { Ruangan } from '../Jadwal/Jadwal';

// ============================================================================
// HELPER ARAH & PETUNJUK LORONG
// ============================================================================

export const ARAH = (dx: number, dy: number) =>
  Math.abs(dx) > Math.abs(dy)
    ? dx > 0
      ? 'timur'
      : 'barat'
    : dy > 0
    ? 'selatan'
    : 'utara';

/**
 * Menghasilkan petunjuk teks dari jalur koordinat di denah:
 * arah mata angin + belok kiri / kanan menuju pintu ruangan.
 */
export function petunjuk(kode: string, nama: string): string[] {
  const p = JALUR[kode];
  if (!p || p.length < 2) return ['Ruangan berada tepat di dekat titik "You are here".'];
  const seg: [number, number][] = [];
  for (let i = 0; i < p.length - 1; i++) {
    const dx = p[i + 1][0] - p[i][0];
    const dy = p[i + 1][1] - p[i][1];
    if (Math.hypot(dx, dy) > 8) {
      seg.push([dx, dy]);
    }
  }

  if (seg.length === 1) {
    return [`Dari titik "You are here", jalan lurus ke arah ${ARAH(seg[0][0], seg[0][1])} langsung menuju pintu ${nama}.`];
  }

  return seg.map((s, i) => {
    if (i === 0) return `Dari titik "You are here", susuri lorong ke arah ${ARAH(s[0], s[1])}.`;
    const b = seg[i - 1];
    const belok = b[0] * s[1] - b[1] * s[0] > 0 ? 'kanan' : 'kiri';
    return i === seg.length - 1
      ? `Belok ${belok}, lalu masuk lewat pintu ${nama}.`
      : `Belok ${belok}, lanjutkan ke arah ${ARAH(s[0], s[1])}.`;
  });
}

// ============================================================================
// KOMPONEN LOKASI RUANGAN (LANGKAH KE-3 DALAM POPUP RUANGAN)
// ============================================================================

export interface LokasiProps {
  ruangan: Ruangan;
}

export function Lokasi({ ruangan }: LokasiProps) {
  const langkah = petunjuk(ruangan.kode, ruangan.nama);

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1fr_320px]">
      {/* Area Denah Visual Terang Penuh dengan Garis Rute Beranimasi & Titik You Are Here */}
      <div className="overflow-hidden">
        <DenahL1LE
          tema="terang"
          selectedCode={ruangan.kode}
          onSelectRoom={() => {}}
          viewBox={FULL_BOX.join(' ')}
          showRoute
          className="block h-auto w-full"
        />
      </div>

      {/* Rincian Petunjuk Arah Menuju Ruangan */}
      <div className="text-[#2B2B2B]">
        <h3 className="text-2xl font-extrabold tracking-tight">Ruangannya di mana?</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#565656]">
          Garis putus-putus mengikuti koridor dari titik "You are here" (koridor tengah) dan berbelok sampai pintu ruangan.
        </p>

        <dl className="mt-5 space-y-3 text-sm">
          <div className="rounded-2xl bg-[#0D0D0D] p-4 text-white">
            <dt className="text-xs font-semibold text-[#B3B3B3]">Titik awal</dt>
            <dd className="mt-0.5 font-bold">Koridor Tengah Lantai 1</dd>
          </div>
          <div className="rounded-2xl bg-[#0D0D0D] p-4 text-white">
            <dt className="text-xs font-semibold text-[#B3B3B3]">Tujuan</dt>
            <dd className="mt-0.5 font-bold">
              {ruangan.kode} · {ruangan.nama}
            </dd>
          </div>
        </dl>

        <ol className="mt-5 space-y-3">
          {langkah.map((t, i) => (
            <li key={t} className="flex gap-3 text-sm leading-relaxed">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0D0D0D] text-xs font-bold text-white">
                {i + 1}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>

        <p className="mt-5 text-sm italic leading-relaxed text-[#565656]">
          Kalau jadwal, fasilitas, dan lokasinya sudah sesuai, lanjut ke booking.
        </p>
      </div>
    </div>
  );
}

// Re-export dengan nama LokasiStep agar kompatibel
export { Lokasi as LokasiStep };
export default Lokasi;

