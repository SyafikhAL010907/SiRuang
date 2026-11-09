'use client';

/**
 * Jadwal - Gedung LE Lantai 4
 * Dasar data untuk semua file lain:
 *   - tipe, konstanta hari/jam, jadwal dummy (JADWAL_RUANGAN), data ruangan (RUANGAN)
 *   - helper jadwal (slotKosong, statusHari, useHariIni)
 *   - token UI bersama (FOCUS, tombol, input, font) dan <SfdStyle />
 *   - langkah "Jadwal" di popup ruangan (JadwalStep) — punya 2 tema: gelap & terang
 *   - halaman daftar jadwal (komponen tunggal responsive: Mobile, Tablet, Desktop) — tema Charcoal Noir
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

// ============================================================================
// 1. DATA RUANGAN & JADWAL (Senin - Jumat, 08:00 - 17:00)
// ============================================================================
export const NOMOR_LANTAI = 4;
export const LANTAI_LABEL = `Lantai ${NOMOR_LANTAI} · Gedung L Elektro`;

/** Foto sementara. Ganti per ruangan lewat field `foto` di data di bawah. */
export const FOTO_SEMENTARA = '/Batik.png';

export type Hari = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';

export type Jadwal = {
  hari: Hari;
  mulai: string;
  selesai: string;
  kegiatan: string;
  kelas: string;
  prodi: string;
  dosen: string;
  pj: string;
  kontak: string;
};

export type Ruangan = {
  kode: string;
  nama: string;
  bookable: boolean;
  kapasitas?: number;
  keterangan?: string;
  deskripsi?: string;
  foto?: string;
  fasilitas: string[];
  jadwal: Jadwal[];
};

export const URUTAN_HARI: Hari[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
export const HARI_DARI_INDEX: Hari[] = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const HARI_KERJA: Hari[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
export const JAM_BUKA = '08:00';
export const JAM_TUTUP = '17:00';

const j = (
  hari: Hari,
  mulai: string,
  selesai: string,
  kegiatan: string,
  kelas: string,
  prodi: string,
  dosen: string,
  pj: string,
  kontak: string
): Jadwal => ({ hari, mulai, selesai, kegiatan, kelas, prodi, dosen, pj, kontak });

const TE = 'Teknik Elektro';
const PTE = 'Pendidikan Teknik Elektro';

export const JADWAL_RUANGAN: Record<string, Jadwal[]> = {
  R403: [
    j('Senin', '08:00', '11:00', 'Praktikum Robotika Industri', 'TE-3A', TE, 'Dr. Aris, M.T.', 'Ilham', '0812-4030-0001'),
    j('Rabu', '13:00', '16:00', 'Mekatronika Lanjut', 'PTE-3B', PTE, 'Pak Hadi, M.T.', 'Bima', '0812-4030-0002'),
  ],
  R405: [
    j('Selasa', '08:00', '11:00', 'Praktikum Instrumentasi & SCADA', 'TE-3B', TE, 'Dr. Sri, M.T.', 'Fikri', '0812-4050-0001'),
    j('Kamis', '13:00', '16:00', 'Sistem Otomasi Industri & PLC', 'TE-4A', TE, 'Pak Bambang, M.T.', 'Rian', '0812-4050-0002'),
  ],
  R406A: [
    j('Senin', '13:00', '16:00', 'Praktikum Antena & Propagasi', 'TE-3A', TE, 'Pak Yoga, M.T.', 'Danang', '0812-4061-0001'),
    j('Kamis', '08:00', '11:00', 'Komunikasi Nirkabel & Seluler', 'TE-4B', TE, 'Pak Yoga, M.T.', 'Arif', '0812-4061-0002'),
  ],
  R406B: [
    j('Selasa', '13:30', '16:00', 'Rapat Koordinasi Laboratorium FT', 'DOSEN-FT', TE, 'Ketua Lab FT', 'Staf Lab', '0812-4062-0001'),
    j('Jumat', '09:00', '11:30', 'Diskusi Tugas Akhir & Riset', 'MAHASISWA-TA', TE, 'Tim Pembimbing', 'Admin Gedung', '0812-0000-0000'),
  ],
  R407: [
    j('Rabu', '08:00', '11:00', 'Praktikum Elektronika Dasar', 'PTE-1A', PTE, 'Bu Susi, M.Si.', 'Dimas', '0812-4070-0001'),
    j('Jumat', '13:30', '16:30', 'Sistem Audio Video Digital', 'PTE-2A', PTE, 'Bu Susi, M.Si.', 'Wahyu', '0812-4070-0002'),
  ],
  TPJM: [
    j('Senin', '09:00', '12:00', 'Audit Mutu Internal Prodi', 'TIM-TPJM', TE, 'Ketua TPJM', 'Sekretaris TPJM', '0812-4000-0001'),
    j('Kamis', '10:00', '12:30', 'Evaluasi Kurikulum & Akreditasi', 'GABUNGAN', TE, 'Dekanat FT', 'Sekretaris TPJM', '0812-4000-0002'),
  ],
  DOSEN_INSTRUMENTASI: [],
  DOSEN_ELEKTRONIKA: [],
  DOSEN_MEKATRONIKA: [],
  DOSEN_TELEKOMUNIKASI: [],
  R401: [],
};

export const RUANGAN: Ruangan[] = [
  {
    kode: 'R403',
    nama: 'R. 403 Lab Mekatronika & Robotika',
    bookable: true,
    kapasitas: 35,
    deskripsi: 'Laboratorium rekayasa mekatronika dan otomasi robotika tingkat lanjut. Memiliki unit lengan robotik industri, kit konveyor sortir, dan stasiun kalibrasi osiloskop.',
    fasilitas: ['Trainer Robotika', 'Osiloskop', 'Solder Station', 'AC (2 Unit)', 'Proyektor'],
    jadwal: JADWAL_RUANGAN['R403'] ?? [],
  },
  {
    kode: 'R405',
    nama: 'R. 405 Lab Sistem Instrumentasi Kendali',
    bookable: true,
    kapasitas: 35,
    deskripsi: 'Pusat riset dan praktikum instrumentasi industri terpadu dengan panel PLC modular, sistem monitoring SCADA, sensor kit presisi tinggi, dan workstation komputer.',
    fasilitas: ['Trainer SCADA', 'Sensor Kit Presisi', 'PLC Siemens', 'PC (30 Unit)', 'AC (2 Unit)'],
    jadwal: JADWAL_RUANGAN['R405'] ?? [],
  },
  {
    kode: 'R406A',
    nama: 'R. 406A Lab Telekomunikasi',
    bookable: true,
    kapasitas: 30,
    deskripsi: 'Laboratorium frekuensi radio dan transmisi sinyal nirkabel. Dilengkapi trainer modulasi antena mikrostrip, spectrum analyzer RF hingga 3GHz, dan generator sinyal.',
    fasilitas: ['Trainer Antena', 'Spectrum Analyzer', 'Generator Sinyal RF', 'AC', 'Proyektor'],
    jadwal: JADWAL_RUANGAN['R406A'] ?? [],
  },
  {
    kode: 'R406B',
    nama: 'R. 406B Ruang Rapat & Perpustakaan',
    bookable: true,
    kapasitas: 25,
    deskripsi: 'Ruang rapat departemen elektro dan ruang baca buku teks teknik serta jurnal referensi tugas akhir dengan suasana tenang dan kondusif.',
    fasilitas: ['Meja Rapat Oval', 'Proyektor', 'Rak Buku Referensi', 'AC', 'Wi-Fi'],
    jadwal: JADWAL_RUANGAN['R406B'] ?? [],
  },
  {
    kode: 'R407',
    nama: 'R. 407 Lab Elektronika Dasar & Audio Video',
    bookable: true,
    kapasitas: 35,
    deskripsi: 'Laboratorium perakitan sirkuit analog dan digital, analisis sinyal gelombang audio, pemancar video komposit, dan catu daya terisolasi.',
    fasilitas: ['Trainer Elektronika Digital', 'Audio Generator', 'Osiloskop Dual-Channel', 'AC (2 Unit)', 'Proyektor'],
    jadwal: JADWAL_RUANGAN['R407'] ?? [],
  },
  {
    kode: 'TPJM',
    nama: 'Ruang TPjM (Penjaminan Mutu)',
    bookable: true,
    kapasitas: 20,
    deskripsi: 'Ruang kerja tim penjaminan mutu fakultas dan prodi teknik elektro, dilengkapi fasilitas presentasi Smart TV dan meja diskusi koordinasi.',
    fasilitas: ['Meja Rapat', 'Smart TV', 'AC', 'Wi-Fi'],
    jadwal: JADWAL_RUANGAN['TPJM'] ?? [],
  },
  {
    kode: 'DOSEN_INSTRUMENTASI',
    nama: 'R. Dosen Instrumentasi Kendali',
    bookable: false,
    deskripsi: 'Ruang kerja staf dosen keahlian sistem instrumentasi dan kontrol otomasi.',
    fasilitas: ['AC', 'Meja Kerja', 'Wi-Fi'],
    jadwal: [],
  },
  {
    kode: 'DOSEN_ELEKTRONIKA',
    nama: 'R. Dosen Elektronika Dasar',
    bookable: false,
    deskripsi: 'Ruang kerja staf dosen rumpun ilmu elektronika dan rangkaian listrik.',
    fasilitas: ['AC', 'Meja Kerja', 'Wi-Fi'],
    jadwal: [],
  },
  {
    kode: 'DOSEN_MEKATRONIKA',
    nama: 'R. Dosen Mekatronika & Robotika',
    bookable: false,
    deskripsi: 'Ruang kerja staf dosen pembina laboratorium robotika dan mekatronika.',
    fasilitas: ['AC', 'Meja Kerja', 'Wi-Fi'],
    jadwal: [],
  },
  {
    kode: 'DOSEN_TELEKOMUNIKASI',
    nama: 'R. Dosen Telekomunikasi',
    bookable: false,
    deskripsi: 'Ruang kerja staf dosen kelompok bidang keahlian telekomunikasi dan jaringan nirkabel.',
    fasilitas: ['AC', 'Meja Kerja', 'Wi-Fi'],
    jadwal: [],
  },
  {
    kode: 'R401',
    nama: 'R. 401 Ruang Teknisi / Toolman',
    bookable: false,
    deskripsi: 'Ruang penyimpanan suku cadang praktikum, peminjaman alat ukur, dan teknisi lantai 4.',
    fasilitas: ['Toolset', 'Rak Penyimpanan Komponen', 'AC'],
    jadwal: [],
  },
];

export const cariRuangan = (kode: string) => RUANGAN.find((r) => r.kode === kode) ?? RUANGAN[0];
export const fotoRuangan = (r: Ruangan) => r?.foto ?? FOTO_SEMENTARA;

// Helper jadwal
const mnt = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const pad = (n: number) => String(n).padStart(2, '0');
const BUKA = mnt(JAM_BUKA);
const TUTUP = mnt(JAM_TUTUP);
const durasi = (m: number) => `${(m / 60).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jam`;

/** Rentang jam kosong [mulaiMenit, selesaiMenit] pada hari tertentu. */
export function slotKosong(r: Ruangan, hari: Hari): [number, number][] {
  const out: [number, number][] = [];
  let cur = BUKA;
  r.jadwal
    .filter((s) => s.hari === hari)
    .sort((a, b) => a.mulai.localeCompare(b.mulai))
    .forEach((s) => {
      if (mnt(s.mulai) > cur) out.push([cur, mnt(s.mulai)]);
      cur = Math.max(cur, mnt(s.selesai));
    });
  if (cur < TUTUP) out.push([cur, TUTUP]);
  return out;
}

export function statusHari(r: Ruangan, hari: Hari): string {
  if (!r.bookable) return 'Fasilitas umum';
  if (!HARI_KERJA.includes(hari)) return 'Tutup akhir pekan';
  const kosong = slotKosong(r, hari).reduce((a, [s, e]) => a + e - s, 0);
  if (kosong === TUTUP - BUKA) return 'Kosong seharian';
  if (kosong === 0) return 'Penuh hari ini';
  return `${durasi(kosong)} kosong hari ini`;
}

/** Hari ini, dihitung setelah mount supaya SSR dan client sama. */
export function useHariIni(): Hari {
  const [h, setH] = useState<Hari>('Senin');
  useEffect(() => setH(HARI_DARI_INDEX[new Date().getDay()]), []);
  return h;
}

// ============================================================================
// 2. TOKEN UI
// ============================================================================
export const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0E0E0]';
export const BTN_UTAMA = `inline-flex items-center justify-center gap-2 rounded-full bg-[#E0E0E0] px-6 py-3 text-sm font-bold text-[#2B2B2B] transition hover:bg-[#B3B3B3] disabled:pointer-events-none disabled:opacity-40 ${FOCUS}`;
export const BTN_TEPI = `inline-flex items-center justify-center gap-2 rounded-full border border-[#848484] px-6 py-3 text-sm font-semibold text-[#E0E0E0] transition hover:border-[#E0E0E0] hover:bg-[#565656]/40 ${FOCUS}`;
export const INPUT =
  'w-full rounded-xl border border-[#565656] bg-[#2B2B2B] px-4 py-3 text-sm text-[#E0E0E0] outline-none transition placeholder:text-[#848484] focus:border-[#E0E0E0] focus:ring-4 focus:ring-[#E0E0E0]/10 [color-scheme:dark]';
export const LABEL = 'mb-1.5 block text-xs font-semibold text-[#B3B3B3]';
export const FONT = "'Montserrat', ui-sans-serif, system-ui, sans-serif";

export function SfdStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
      @keyframes sfd-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
      @keyframes sfd-spin{from{transform:rotateX(-22deg) rotateY(0)}to{transform:rotateX(-22deg) rotateY(360deg)}}
      @keyframes sfd-dash{to{stroke-dashoffset:-18}}
      @keyframes sfd-geser{0%,100%{transform:translateX(-5px)}50%{transform:translateX(5px)}}
      .sfd-in{animation:sfd-in .45s cubic-bezier(.2,.7,.2,1) both}
      .sfd-spin{animation:sfd-spin 14s linear infinite}
      .sfd-dash{animation:sfd-dash 1.2s linear infinite}
      .sfd-geser{display:inline-block;animation:sfd-geser 1.4s ease-in-out infinite}
      @media (prefers-reduced-motion:reduce){.sfd-in,.sfd-spin,.sfd-dash,.sfd-geser{animation:none}}
    `}</style>
  );
}

// Alias SfdStyle to LeStyle
export { SfdStyle as LeStyle };

// ============================================================================
// LANGKAH "JADWAL" di popup ruangan
// ============================================================================
export type TemaJadwal = 'gelap' | 'terang';

const TEMA_JADWAL = {
  gelap: {
    judul: '',
    isi: 'text-[#B3B3B3]',
    sumbu: 'text-[#B3B3B3]',
    barisAktif: 'border-[#E0E0E0] bg-[#565656]/30',
    barisBiasa: 'border-[#565656] hover:border-[#848484]',
    track: 'border-[#565656]',
    blok: 'bg-[#E0E0E0]',
    sisa: 'text-[#B3B3B3]',
    subJudul: 'text-[#B3B3B3]',
    pil: 'border-[#B3B3B3]',
    kartu: 'border-[#565656]',
    garisKartu: 'border-[#565656]',
    badge: 'bg-[#E0E0E0] text-[#2B2B2B]',
    infoKartu: 'text-[#B3B3B3]',
  },
  terang: {
    judul: 'text-[#0D0D0D]',
    isi: 'text-[#3A3A3A]',
    sumbu: 'text-[#0D0D0D]',
    barisAktif: 'border-[#0D0D0D] bg-[#F0F0F0]',
    barisBiasa: 'border-[#0D0D0D] bg-white hover:bg-[#F7F7F7]',
    track: 'border-[#0D0D0D]',
    blok: 'bg-[#0D0D0D]',
    sisa: 'text-[#0D0D0D]',
    subJudul: 'text-[#3A3A3A]',
    pil: 'border-[#0D0D0D]',
    kartu: 'border-[#0D0D0D] bg-white',
    garisKartu: 'border-[#0D0D0D]',
    badge: 'bg-[#0D0D0D] text-white',
    infoKartu: 'text-[#3A3A3A]',
  },
} as const;

export function JadwalStep({ ruangan, tema = 'gelap' }: { ruangan: Ruangan; tema?: TemaJadwal }) {
  const T = TEMA_JADWAL[tema];
  const terang = tema === 'terang';
  const hariIni = useHariIni();
  const [pilih, setPilih] = useState<Hari | null>(null);
  const aktif: Hari = pilih ?? (HARI_KERJA.includes(hariIni) ? hariIni : 'Senin');
  const sesi = ruangan.jadwal.filter((s) => s.hari === aktif).sort((a, b) => a.mulai.localeCompare(b.mulai));
  const kosong = slotKosong(ruangan, aktif);
  const pos = (m: number) => `${((m - BUKA) / (TUTUP - BUKA)) * 100}%`;
  const kolom = 'grid grid-cols-[3rem_1fr_6.5rem] items-center gap-3';
  const fokus = terang
    ? 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D0D0D]'
    : FOCUS;

  return (
    <div className={`grid gap-8 lg:grid-cols-[1.25fr_1fr] ${terang ? 'lg:items-start lg:gap-10' : ''}`}>
      <div>
        <h3 className={`text-2xl font-extrabold tracking-tight ${T.judul}`}>Apakah ruangan ini kosong?</h3>
        <p className={`mt-2 max-w-xl text-sm leading-relaxed ${T.isi}`}>
          Jam operasional Senin sampai Jumat, {JAM_BUKA.replace(':', '.')}–{JAM_TUTUP.replace(':', '.')}. Blok terang berarti sudah terjadwal, garis putus-putus berarti kosong. Pilih hari untuk melihat detailnya.
        </p>
        <div className="mt-6 space-y-2">
          <div className={`${kolom} px-3`} aria-hidden>
            <span />
            <div className={`relative h-4 text-[10px] font-semibold ${T.sumbu}`}>
              {[8, 10, 12, 14, 16, 17].map((h) => (
                <span key={h} className="absolute -translate-x-1/2" style={{ left: pos(h * 60) }}>
                  {pad(h)}
                </span>
              ))}
            </div>
            <span />
          </div>
          {HARI_KERJA.map((h) => {
            const bebas = slotKosong(ruangan, h).reduce((a, [s, e]) => a + e - s, 0);
            return (
              <button
                key={h}
                onClick={() => setPilih(h)}
                aria-pressed={h === aktif}
                className={`${kolom} w-full rounded-xl border px-3 py-2.5 text-left transition ${fokus} ${
                  h === aktif ? T.barisAktif : T.barisBiasa
                }`}
              >
                <span className={`text-sm font-bold ${terang ? 'text-[#0D0D0D]' : ''}`}>{h.slice(0, 3)}</span>
                <span className={`relative h-6 rounded-md border border-dashed ${T.track}`}>
                  {ruangan.jadwal
                    .filter((s) => s.hari === h)
                    .map((s) => (
                      <i
                        key={s.mulai}
                        className={`absolute inset-y-0 rounded-sm ${T.blok}`}
                        style={{
                          left: pos(mnt(s.mulai)),
                          width: `${((mnt(s.selesai) - mnt(s.mulai)) / (TUTUP - BUKA)) * 100}%`,
                        }}
                      />
                    ))}
                </span>
                <span className={`text-right text-xs font-semibold ${T.sisa} ${terang ? 'font-bold' : ''}`}>
                  {bebas === TUTUP - BUKA ? 'Kosong' : bebas === 0 ? 'Penuh' : `${durasi(bebas)} kosong`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div key={aktif} className="sfd-in">
        <h4 className={`text-lg font-bold ${T.judul}`}>{aktif}</h4>
        <p className={`mt-1 text-sm ${T.subJudul}`}>
          {sesi.length === 0 ? 'Tidak ada kelas. Ruangan kosong seharian.' : `${sesi.length} sesi terjadwal`}
        </p>
        {kosong.length > 0 && (
          <div className="mt-4">
            <p className={`mb-2 text-xs font-semibold ${terang ? 'text-[#0D0D0D]' : 'text-[#B3B3B3]'}`}>Jam kosong</p>
            <div className="flex flex-wrap gap-2">
              {kosong.map(([s, e]) => (
                <span
                  key={s}
                  className={`rounded-full border border-dashed px-3 py-1 text-xs font-semibold ${T.pil} ${
                    terang ? 'bg-white text-[#0D0D0D]' : ''
                  }`}
                >
                  {pad(Math.floor(s / 60))}:{pad(s % 60)} – {pad(Math.floor(e / 60))}:{pad(e % 60)}
                </span>
              ))}
            </div>
          </div>
        )}
        <ul className="mt-5 space-y-3">
          {sesi.map((s) => (
            <li key={s.mulai} className={`rounded-2xl border p-4 ${T.kartu}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`font-bold ${terang ? 'text-[#0D0D0D]' : ''}`}>{s.kegiatan}</p>
                  <p className={`mt-0.5 text-xs ${T.infoKartu}`}>
                    {s.kelas} · {s.prodi}
                  </p>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${T.badge}`}>
                  {s.mulai}–{s.selesai}
                </span>
              </div>
              <p className={`mt-3 border-t pt-3 text-xs ${T.garisKartu} ${T.infoKartu}`}>
                Dosen {s.dosen} · PJ {s.pj} ({s.kontak})
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Jadwal() {
  const rooms = RUANGAN;
  const hariIni = useHariIni();

  return (
    <div
      className="min-h-screen bg-[#2B2B2B] text-[#E0E0E0]"
      style={{ fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif" }}
    >
      <SfdStyle />
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
        <header className="rounded-3xl border border-[#565656] p-5 md:p-7">
          <Link
            href="/denah-le/lantai4"
            className="mb-4 inline-flex items-center gap-2 rounded-full text-sm font-bold text-[#B3B3B3] transition hover:text-[#E0E0E0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0E0E0]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Kembali ke denah lantai 4
          </Link>
          <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Jadwal ruangan · Gedung LE · Lantai 4</h2>
          <p className="mt-2 text-sm text-[#B3B3B3]">Pilih ruangan untuk melihat jadwal Senin–Jumat, 08.00–17.00.</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r) => (
            <Link
              key={r.kode}
              href={`/denah-le/lantai4/${encodeURIComponent(r.kode)}`}
              className="group flex items-center justify-between rounded-2xl border border-[#565656] p-4 transition hover:border-[#E0E0E0] hover:bg-[#565656]/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0E0E0] md:flex-col md:items-start md:gap-3 md:p-5"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 shrink-0 rounded-full ${
                    r.bookable ? 'bg-[#E0E0E0]' : 'border border-[#848484]'
                  }`}
                />
                <div>
                  <h3 className="font-bold">{r.nama}</h3>
                  <p className="mt-0.5 text-xs text-[#B3B3B3]">{r.jadwal.length} jadwal terdaftar</p>
                </div>
              </div>
              <span className="rounded-full border border-[#565656] px-3 py-1 text-xs font-semibold text-[#B3B3B3] group-hover:border-[#B3B3B3]">
                {statusHari(r, hariIni)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export { Jadwal as MainJadwal };
