'use client';

import React from 'react';
import { DenahL3SFD, FULL_BOX, JALUR } from '../DenahL3SFD/DenahL3SFD';
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
  if (!p || p.length < 4) return ['Lobby lift tepat di depan titik "You are here".'];
  const q = p.slice(1); // lewati jalan pendek dari pin ke kolom lobby
  const seg = q.slice(1).map((t, i) => [t[0] - q[i][0], t[1] - q[i][1]]);
  return seg.map((s, i) => {
    if (i === 0) return `Dari titik "You are here", jalan ke arah ${ARAH(s[0], s[1])} sampai lorong utama.`;
    const b = seg[i - 1];
    const belok = b[0] * s[1] - b[1] * s[0] > 0 ? 'kanan' : 'kiri';
    return i === seg.length - 1
      ? `Belok ${belok}, lalu masuk lewat pintu ${nama}.`
      : `Belok ${belok}, susuri lorong ke arah ${ARAH(s[0], s[1])}.`;
  });
}

// ============================================================================
// KOMPONEN LOKASI RUANGAN (LANGKAH KE-3 DALAM POPUP RUANGAN)
// ============================================================================

export interface LokasiProps {
  ruangan: Ruangan;
}

export function Lokasi({ ruangan }: LokasiProps) {
  // Denah selalu tampil penuh (tanpa zoom); rute putus-putus tetap menunjukkan jalan ke ruangan.
  const langkah = petunjuk(ruangan.kode, ruangan.nama);

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1fr_320px]">
      {/* Area Denah Visual Terang dengan Garis Rute Beranimasi */}
      <div className="overflow-hidden">
        <DenahL3SFD
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
          Garis putus-putus mengikuti lorong dari lobby lift dan berbelok sampai pintu ruangan.
        </p>

        <dl className="mt-5 space-y-3 text-sm">
          <div className="rounded-2xl bg-[#0D0D0D] p-4 text-white">
            <dt className="text-xs font-semibold text-[#B3B3B3]">Titik awal</dt>
            <dd className="mt-0.5 font-bold">Lobby Lift (R-11)</dd>
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

// Re-export dengan nama LokasiStep agar kompatibel dengan kode sebelumnya
export { Lokasi as LokasiStep };
export default Lokasi;