'use client';

import React, { useEffect, useMemo, useState } from 'react';

// ============================================================================
// 1. DATA RUANGAN & TIPE - LANTAI 2
// ============================================================================
export type Hari = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';
export type RoomCode =
  | 'RSTAFF'
  | 'TOILET_WANITA'
  | 'TOILET_PRIA'
  | 'LAB_MAKE_UP'
  | 'LAB_TATA_RIAS'
  | 'RUANG_ROBOTIC'
  | 'LAB_KOMPUTER'
  | 'R208'
  | 'LAB_FLORIST'
  | 'LAB_KOSMETIK';

export const URUTAN_HARI: Hari[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
export const HARI_DARI_INDEX: Hari[] = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export type Jadwal = { hari: Hari; mulai: string; selesai: string; kegiatan: string; kelas: string; prodi: string; dosen: string; pj: string; kontak: string; };
export type RoomInfo = { kode: RoomCode; nama: string; bookable: boolean; kapasitas?: number; keterangan?: string; fasilitas: string[]; jadwal: Jadwal[]; };

const j = (hari: Hari, mulai: string, selesai: string, kegiatan: string, kelas: string, prodi: string, dosen: string, pj: string, kontak: string): Jadwal =>
  ({ hari, mulai, selesai, kegiatan, kelas, prodi, dosen, pj, kontak });

const TRK = 'Pendidikan Tata Rias dan Kecantikan';
const PTE = 'Pendidikan Teknik Elektro';
const PTIK = 'Pendidikan Teknik Informatika & Komputer';

// DATA DI BAWAH INI DUMMY - ganti dengan data asli / fetch API
export const ROOMS: Record<RoomCode, RoomInfo> = {
  // ===== KODE RUANGAN: RSTAFF - R. 302 Kuliah (nama & data diubah sendiri nanti) =====
  RSTAFF: {
    kode: 'RSTAFF', nama: 'R. Staff Only', bookable: true, kapasitas: 40, fasilitas: ['AC (2 Unit)', 'Proyektor', 'Whiteboard'],
    jadwal: [j('Senin', '08:00', '10:30', 'Fisika Dasar', 'TE-1A', 'Teknik Elektro', 'Bu Susi, M.Si.', 'Andi', '0812-1111-0001')],
  },

  // ===== KODE RUANGAN: TOILET_WANITA - khusus dosen & karyawan =====
  TOILET_WANITA: {
    kode: 'TOILET_WANITA', nama: 'Toilet Wanita (Dosen & Karyawan)', bookable: false, keterangan: 'Khusus dosen dan karyawan lantai 2.',
    fasilitas: ['Wastafel', 'Bilik toilet'], jadwal: [],
  },

  // ===== KODE RUANGAN: TOILET_PRIA - khusus dosen & karyawan =====
  TOILET_PRIA: {
    kode: 'TOILET_PRIA', nama: 'Toilet Pria (Dosen & Karyawan)', bookable: false, keterangan: 'Khusus dosen dan karyawan lantai 2.',
    fasilitas: ['Wastafel', 'Bilik toilet', 'Urinoir'], jadwal: [],
  },

  // ===== KODE RUANGAN: LAB_MAKE_UP - Laboratorium Make Up (bekas R. 303) =====
  LAB_MAKE_UP: {
    kode: 'LAB_MAKE_UP', nama: 'Laboratorium Make Up', bookable: true, kapasitas: 30,
    fasilitas: ['Kursi Rias (30 Unit)', 'Cermin Rias', 'Lampu Rias', 'Wastafel', 'AC'],
    jadwal: [
      j('Senin', '08:00', '11:00', 'Praktikum Tata Rias Wajah', 'TRK-2A', TRK, 'Bu Maya, M.Pd.', 'Salsa', '0812-2030-0001'),
      j('Kamis', '13:00', '16:00', 'Make Up Karakter', 'TRK-3A', TRK, 'Bu Laras, M.Pd.', 'Dina', '0812-2030-0002'),
    ],
  },

  // ===== KODE RUANGAN: LAB_TATA_RIAS - Laboratorium Tata Rias (bekas R. Lab Multimedia) =====
  LAB_TATA_RIAS: {
    kode: 'LAB_TATA_RIAS', nama: 'Laboratorium Tata Rias', bookable: true, kapasitas: 30,
    fasilitas: ['Kursi Salon', 'Cermin Rias', 'Hairdryer Station', 'Wastafel Keramas', 'AC'],
    jadwal: [
      j('Selasa', '09:00', '12:00', 'Praktikum Tata Rias Rambut', 'TRK-2B', TRK, 'Bu Laras, M.Pd.', 'Keysha', '0812-2040-0001'),
      j('Rabu', '13:00', '16:00', 'Tata Rias Pengantin', 'TRK-3B', TRK, 'Bu Maya, M.Pd.', 'Rafif', '0812-2040-0002'),
    ],
  },

  // ===== KODE RUANGAN: RUANG_ROBOTIC - Ruang Robotic (bekas R. Teknisi Gedung) =====
  RUANG_ROBOTIC: {
    kode: 'RUANG_ROBOTIC', nama: 'Ruang Robotic', bookable: true, kapasitas: 25,
    fasilitas: ['Kit Robotik', 'Meja Praktik', 'Printer 3D', 'Proyektor', 'AC'],
    jadwal: [
      j('Selasa', '13:00', '16:00', 'Praktikum Robotika', 'PTE-3A', PTE, 'Pak Bambang, M.T.', 'Reza', '0812-2060-0001'),
    ],
  },

  // ===== KODE RUANGAN: LAB_KOMPUTER - Laboratorium Komputer (bekas R. 307) =====
  LAB_KOMPUTER: {
    kode: 'LAB_KOMPUTER', nama: 'Laboratorium Komputer', bookable: true, kapasitas: 40,
    fasilitas: ['AC Central', '40 PC', 'Proyektor', 'Server Lokal', 'WiFi'],
    jadwal: [
      j('Senin', '09:00', '12:00', 'Praktikum Algoritma', 'PTIK-1A', PTIK, 'Pak Andi, M.Kom.', 'Siti', '0812-2070-0001'),
      j('Jumat', '08:00', '11:00', 'Praktikum Basis Data', 'PTIK-2B', PTIK, 'Bu Ratna, M.T.', 'Budi', '0812-2070-0002'),
    ],
  },

  // ===== KODE RUANGAN: R208 - R. 208 Kuliah (bekas R. 306) =====
  R208: {
    kode: 'R208', nama: 'R. 208 Kuliah', bookable: true, kapasitas: 40, fasilitas: ['AC', 'Proyektor', 'Whiteboard'],
    jadwal: [
      j('Kamis', '15:00', '17:00', 'Arsitektur Komputer', 'PTIK-2A', PTIK, 'Bu Ratna, M.T.', 'Admin', '0812-2080-0001'),
    ],
  },

  // ===== KODE RUANGAN: LAB_FLORIST - Laboratorium Florist (bekas R. 305) =====
  LAB_FLORIST: {
    kode: 'LAB_FLORIST', nama: 'Laboratorium Florist', bookable: true, kapasitas: 30,
    fasilitas: ['Meja Kerja Floral', 'Wastafel', 'Kulkas Bunga', 'Proyektor', 'AC'],
    jadwal: [
      j('Senin', '13:00', '16:00', 'Merangkai Bunga', 'TRK-1A', TRK, 'Bu Wulan, M.Pd.', 'Dewi', '0812-2050-0001'),
      j('Rabu', '09:00', '12:00', 'Dekorasi Floral Acara', 'TRK-2A', TRK, 'Bu Wulan, M.Pd.', 'Nadia', '0812-2050-0002'),
    ],
  },

  // ===== KODE RUANGAN: LAB_KOSMETIK - Laboratorium Kosmetik (bekas R. 304) =====
  LAB_KOSMETIK: {
    kode: 'LAB_KOSMETIK', nama: 'Laboratorium Kosmetik', bookable: true, kapasitas: 30,
    fasilitas: ['Meja Praktik Kosmetik', 'Peralatan Formulasi', 'Timbangan Digital', 'Lemari Bahan', 'Wastafel', 'AC'],
    jadwal: [
      j('Selasa', '08:00', '11:00', 'Formulasi Kosmetik', 'TRK-3A', TRK, 'Bu Sari, M.Si.', 'Putri', '0812-2090-0001'),
      j('Jumat', '13:00', '16:00', 'Teknologi Kosmetik', 'TRK-3B', TRK, 'Bu Sari, M.Si.', 'Fajar', '0812-2090-0002'),
    ],
  },
};

export const BOOKABLE_ROOMS = Object.values(ROOMS).filter(r => r.bookable);

// ============================================================================
// 2. KOMPONEN DENAH SVG (GEDUNG LE - LANTAI 2)
// ============================================================================
const WALL = '#3a302e';
const FLOOR = '#eef3f2';
const GREEN = '#5cb82f';
const RED = '#d93a35';
const TEXT = '#3f3f46';

function RoomHit({ kode, nama, d, selected, muted, onSelect, children }: any) {
  const warna = selected
    ? 'fill-sky-100 stroke-transparent'
    : muted
      ? 'fill-slate-100 stroke-transparent group-hover:fill-slate-200 transition-colors'
      : 'fill-white stroke-transparent group-hover:fill-sky-50 transition-colors';
  return (
    <g role="button" tabIndex={0} aria-label={`${nama}`} className="group cursor-pointer outline-none" onClick={() => onSelect(kode)}>
      <path d={d} strokeWidth={5} className={warna} />
      {children}
    </g>
  );
}

function RoomLabel({ x, y, lines, size = 22 }: { x: number; y: number; lines: string[]; size?: number }) {
  return (
    <text x={x} textAnchor="middle" fontSize={size} fill={TEXT} className="pointer-events-none select-none font-sans font-semibold">
      {lines.map((line, i) => (<tspan key={line} x={x} y={y + i * 26} dominantBaseline="central">{line}</tspan>))}
    </text>
  );
}

export function FloorPlanSvg({ selectedCode, onSelectRoom, className }: { selectedCode: string | null; onSelectRoom: (k: string) => void; className?: string; }) {
  const common = (kode: RoomCode) => ({ kode, selected: selectedCode === kode, muted: !ROOMS[kode].bookable, onSelect: onSelectRoom });
  return (
    <svg viewBox="0 130 1600 610" className={className}>
      <defs><marker id="l2-arrow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill={GREEN} /></marker></defs>

      {/* ================= LANTAI (koridor, area tangga, lorong kecil) ================= */}
      <path d="M357 395 H1242 V490 H357 Z" fill={FLOOR} />
      <path d="M710 145 H975 V395 H710 Z" fill={FLOOR} />
      <path d="M975 145 H1010 V395 H975 Z" fill={FLOOR} /> {/* lorong kecil di samping tangga */}
      <path d="M10 395 H25 V490 H10 Z" fill="#ffffff" />

      {/* ================= RUANGAN (bisa diklik) ================= */}

      {/* ===== KODE RUANGAN: RSTAFF (nama diubah sendiri nanti) ===== */}
      <RoomHit {...common('RSTAFF')} nama="R. Staff Only" d="M10 145 H425 V395 H10 Z"><RoomLabel x={176} y={268} lines={['R. Staff Only']} /></RoomHit>

      {/* ===== KODE RUANGAN: TOILET_WANITA (dosen & karyawan) ===== */}
      <RoomHit {...common('TOILET_WANITA')} nama="Toilet Wanita (Dosen & Karyawan)" d="M425 145 H567 V395 H425 Z"><RoomLabel x={489} y={222} lines={['TOILET', 'WANITA']} /></RoomHit>

      {/* ===== KODE RUANGAN: TOILET_PRIA (dosen & karyawan) ===== */}
      <RoomHit {...common('TOILET_PRIA')} nama="Toilet Pria (Dosen & Karyawan)" d="M567 145 H710 V395 H567 Z"><RoomLabel x={627} y={223} lines={['TOILET', 'PRIA']} /></RoomHit>

      {/* ===== KODE RUANGAN: LAB_MAKE_UP (bekas R. 303, batas kanan digeser ke x=1280) ===== */}
      <RoomHit {...common('LAB_MAKE_UP')} nama="Laboratorium Make Up" d="M1010 145 H1280 V395 H1010 Z"><RoomLabel x={1145} y={238} lines={['Laboratorium', 'Make Up']} /></RoomHit>

      {/* ===== KODE RUANGAN: LAB_TATA_RIAS (bekas R. Lab Multimedia, batas kiri atas digeser ke x=1280) ===== */}
      <RoomHit {...common('LAB_TATA_RIAS')} nama="Laboratorium Tata Rias" d="M1280 145 H1582 V385 H1556 V490 H1242 V395 H1280 Z"><RoomLabel x={1431} y={279} lines={['Laboratorium', 'Tata Rias']} /></RoomHit>

      {/* ===== KODE RUANGAN: RUANG_ROBOTIC (bekas R. Teknisi Gedung) ===== */}
      <RoomHit {...common('RUANG_ROBOTIC')} nama="Ruang Robotic" d="M25 395 H357 V490 H25 Z"><RoomLabel x={175} y={448} lines={['Ruang Robotic']} /></RoomHit>

      {/* ===== KODE RUANGAN: LAB_KOMPUTER (bekas R. 307) ===== */}
      <RoomHit {...common('LAB_KOMPUTER')} nama="Laboratorium Komputer" d="M10 490 H433 V725 H10 Z"><RoomLabel x={187} y={593} lines={['Laboratorium', 'Komputer']} /></RoomHit>

      {/* ===== KODE RUANGAN: R208 (bekas R. 306) ===== */}
      <RoomHit {...common('R208')} nama="R. 208 Kuliah" d="M433 490 H710 V725 H433 Z"><RoomLabel x={557} y={583} lines={['R. 208', 'Kuliah']} /></RoomHit>

      {/* ===== KODE RUANGAN: LAB_FLORIST (bekas R. 305, batas kanan digeser ke x=1020) ===== */}
      <RoomHit {...common('LAB_FLORIST')} nama="Laboratorium Florist" d="M710 490 H1020 V725 H710 Z"><RoomLabel x={865} y={586} lines={['Laboratorium', 'Florist']} /></RoomHit>

      {/* ===== KODE RUANGAN: LAB_KOSMETIK (bekas R. 304, batas kiri ikut digeser ke x=1020) ===== */}
      <RoomHit {...common('LAB_KOSMETIK')} nama="Laboratorium Kosmetik" d="M1020 490 H1582 V725 H1020 Z"><RoomLabel x={1301} y={591} lines={['Laboratorium', 'Kosmetik']} /></RoomHit>

      {/* ================= DINDING & PINTU ================= */}
      <g className="pointer-events-none" fill="none" stroke={WALL}>
        <path d="M10 145 H1582 M10 725 H1582 M10 145 V725 M1582 145 V385 H1556 V490 M1582 490 V725 M10 395 H363 M421 395 H445 M497 395 H637 M690 395 H710 M1010 395 H1020 M1075 395 H1280 M10 490 H365 M425 490 H645 M697 490 H915 M968 490 H1105 M1158 490 H1582 M425 145 V395 M567 145 V395 M710 145 V395 M975 145 V395 M1010 145 V395 M1280 145 V395 M1242 395 V417 M1242 480 V490 M25 395 V490 M357 395 V405 M357 485 V490 M433 490 V725 M710 490 V725 M1020 490 V725" strokeWidth={5} />
        <path d="M363 395 H421 M445 395 H497 M637 395 H690 M1020 395 H1075 M365 490 H425 M645 490 H697 M915 490 H968 M1105 490 H1158 M1242 417 V480" strokeWidth={1.5} opacity={0.55} />
        <path d="M419 395 V345 M447 395 V345 M687 395 V345 M1025 395 V338 M1242 417 H1297 M423 490 V560 M695 490 V545 M965 490 V540 M1156 490 V540" strokeWidth={2.5} />
        <rect x={353} y={405} width={8} height={80} fill="#ffffff" strokeWidth={2} />
      </g>

      {/* ================= DETAIL (tangga, toilet, panah evakuasi, simbol) ================= */}
      <g className="pointer-events-none">
        <g fill="none" stroke={WALL}>
          <path d="M713 208 A131 63 0 0 1 975 208" strokeWidth={2} />
          {Array.from({ length: 10 }, (_, i) => 195 + i * 15).map(y => <line key={y} x1={713} y1={y} x2={829} y2={y} strokeWidth={2} />)}
          <rect x={829} y={200} width={26} height={135} strokeWidth={3} /> <line x1={842} y1={206} x2={842} y2={329} strokeWidth={1.5} />
          <path d="M855 290 L905 278 L912 262 L970 238" strokeWidth={2} /> <line x1={910} y1={214} x2={910} y2={236} strokeWidth={1.5} />
        </g>
        <g fill="#ffffff" stroke="#94a3b8" strokeWidth={2}>
          <ellipse cx={538} cy={205} rx={11} ry={9} /> <rect x={534} y={188} width={22} height={10} rx={3} />
          <ellipse cx={683} cy={204} rx={11} ry={9} /> <rect x={679} y={187} width={22} height={10} rx={3} />
        </g>
        <g stroke={GREEN} strokeWidth={3} strokeLinecap="round" fill="none" markerEnd="url(#l2-arrow-head)">
          {[[392, 272, 392, 334], [461, 272, 461, 336], [670, 270, 670, 334], [1046, 262, 1046, 326], [1385, 430, 1327, 430], [272, 432, 334, 432], [403, 617, 403, 567], [675, 607, 675, 549], [946, 607, 946, 547], [1131, 605, 1131, 545], [413, 458, 470, 458], [487, 458, 556, 458], [568, 458, 637, 458], [650, 458, 716, 458], [1138, 452, 1072, 452], [1056, 452, 986, 452], [975, 452, 906, 452], [890, 452, 824, 452]].map(([x1, y1, x2, y2]) => (<line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />))}
        </g>
        <path d="M771 360 V190 Q771 180 781 180 H900 Q910 180 910 190 V204" stroke={GREEN} strokeWidth={3} strokeLinecap="round" fill="none" markerEnd="url(#l2-arrow-head)" />
        <g>
          <rect x={520} y={411} width={14} height={30} rx={5} fill={RED} />
          <path d="M524 411 V405 H533 V411" fill="none" stroke="#1f1f1f" strokeWidth={2.2} />
        </g>
        <g>
          <ellipse cx={735} cy={459} rx={17} ry={9} fill="#fff" stroke={WALL} strokeWidth={2} />
          <circle cx={735} cy={436} r={5} fill="#1f1f1f" /> <path d="M728.5 457 V447 Q728.5 441.5 735 441.5 Q741.5 441.5 741.5 447 V457 Z" fill="#1f1f1f" />
        </g>
      </g>
    </svg>
  );
}

export function FloorPlanLegend({ className = '' }: { className?: string }) {
  const item = 'flex items-center gap-2 text-xs font-medium text-slate-500';
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}>
      <span className={item}><i className="h-3 w-3 rounded-sm border border-slate-400 bg-white" /> Bisa dibooking</span>
      <span className={item}><i className="h-3 w-3 rounded-sm border border-slate-400 bg-slate-100" /> Tidak bisa dibooking</span>
      <span className={item}><i className="h-3 w-3 rounded-sm border border-sky-600 bg-sky-200" /> Dipilih</span>
    </div>
  );
}

export function DaftarRuangan({ selected, onSelect, grid = false }: any) {
  return (
    <ul className={grid ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}>
      {Object.values(ROOMS).map((r) => (
        <li key={r.kode}>
          <button onClick={() => onSelect(r.kode)} className={`flex w-full items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-all ${selected === r.kode ? 'border-sky-500 bg-sky-50 text-sky-800 shadow-sm' : 'border-slate-100 bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50'}`}>
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.bookable ? 'bg-sky-500 shadow-sm shadow-sky-400' : 'bg-slate-300'}`} /> <span className="truncate">{r.nama}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// 3. UI POP-UP PREMIUM (BOOKING, JADWAL, FASILITAS)
// ============================================================================
type Tab = 'booking' | 'jadwal' | 'fasilitas';
const INPUT = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10';
const LABEL = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500';

function TabBooking({ ruangan }: { ruangan: RoomInfo }) {
  const [form, setForm] = useState({ nama: '', kontak: '', tanggal: '', mulai: '', selesai: '', keperluan: '' });
  const [terkirim, setTerkirim] = useState(false);
  const set = (k: keyof typeof form) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const waktuValid = form.mulai !== '' && form.selesai !== '' && form.mulai < form.selesai;

  const bentrok = useMemo(() => {
    if (!form.tanggal || !waktuValid) return [];
    const hari = HARI_DARI_INDEX[new Date(`${form.tanggal}T00:00:00`).getDay()];
    return ruangan.jadwal.filter((s) => s.hari === hari && form.mulai < s.selesai && form.selesai > s.mulai);
  }, [form, waktuValid, ruangan.jadwal]);

  const lengkap = form.nama.trim() !== '' && form.kontak.trim() !== '' && form.tanggal !== '' && waktuValid;

  if (!ruangan.bookable) return <div className="rounded-xl bg-slate-50 p-6 text-center"><span className="mb-2 block text-3xl">🔒</span><h4 className="font-bold text-slate-800">Ruangan Terkunci</h4><p className="text-sm text-slate-500">{ruangan.keterangan}</p></div>;
  if (terkirim) return <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center"><span className="mb-3 block text-4xl">✅</span><h4 className="text-lg font-bold text-emerald-800">Booking Berhasil Diajukan!</h4><p className="mt-2 text-sm text-emerald-700"><strong>{ruangan.nama}</strong><br />{form.tanggal} | {form.mulai} – {form.selesai}</p><button onClick={() => setTerkirim(false)} className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700">Booking Jadwal Lain</button></div>;

  return (
    <div className="space-y-4">
      <div><label className={LABEL}>Nama Peminjam</label><input className={INPUT} value={form.nama} onChange={set('nama')} placeholder="Masukkan nama lengkap..." /></div>
      <div><label className={LABEL}>Kontak (WA / Akun)</label><input className={INPUT} value={form.kontak} onChange={set('kontak')} placeholder="0812xxxx / @username" /></div>
      <div><label className={LABEL}>Tanggal Booking</label><input type="date" className={INPUT} value={form.tanggal} onChange={set('tanggal')} min={new Date().toISOString().slice(0, 10)} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className={LABEL}>Jam Mulai</label><input type="time" className={INPUT} value={form.mulai} onChange={set('mulai')} /></div>
        <div><label className={LABEL}>Jam Selesai</label><input type="time" className={INPUT} value={form.selesai} onChange={set('selesai')} /></div>
      </div>
      {form.mulai && form.selesai && !waktuValid && <p className="text-xs font-medium text-rose-500">⚠️ Jam selesai harus setelah jam mulai.</p>}
      <div><label className={LABEL}>Keperluan</label><textarea className={INPUT} rows={2} value={form.keperluan} onChange={set('keperluan')} placeholder="Contoh: Praktikum pengganti..." /></div>

      {bentrok.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-900">⚠️ Jadwal Bentrok!</p><ul className="mt-3 space-y-3">{bentrok.map((s) => (<li key={`${s.hari}-${s.mulai}`} className="rounded-lg bg-white p-3 text-sm border border-amber-100 shadow-sm"><span className="font-bold text-slate-800">{s.kegiatan}</span> <span className="text-sky-600">({s.mulai}–{s.selesai})</span><p className="mt-1 text-xs text-slate-500">PJ: {s.pj} <span className="font-bold text-amber-700">({s.kontak})</span></p></li>))}</ul></div>
      )}
      <button onClick={() => setTerkirim(true)} disabled={!lengkap} className="mt-2 w-full rounded-xl bg-linear-to-r from-sky-600 to-blue-600 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.01] hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none">{bentrok.length > 0 ? 'Ajukan Paksa' : 'Ajukan Booking Sekarang'}</button>
    </div>
  );
}

function TabJadwal({ ruangan }: { ruangan: RoomInfo }) {
  const [hariAktif, setHariAktif] = useState<Hari>(HARI_DARI_INDEX[new Date().getDay()]);
  if (ruangan.jadwal.length === 0) return <div className="rounded-xl bg-slate-50 p-6 text-center"><span className="mb-2 block text-3xl">📅</span><p className="text-sm font-medium text-slate-500">Belum ada jadwal terdaftar untuk ruangan ini.</p></div>;

  const jadwalHariIni = ruangan.jadwal.filter((s) => s.hari === hariAktif).sort((a, b) => a.mulai.localeCompare(b.mulai));

  return (
    <div className="space-y-5 pb-8">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-hide">
        {URUTAN_HARI.map((h) => (
          <button key={h} onClick={() => setHariAktif(h)} className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-all ${hariAktif === h ? 'bg-sky-600 text-white shadow-md shadow-sky-500/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{h}</button>
        ))}
      </div>
      {jadwalHariIni.length === 0 ? <p className="rounded-xl border border-slate-100 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">Tidak ada kelas di hari {hariAktif}. Ruangan kosong! 🎉</p> : (
        <ul className="space-y-4">
          {jadwalHariIni.map((s) => (
            <li key={`${s.hari}-${s.mulai}`} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-sky-300 hover:shadow-md p-5 pl-6">
              <div className="absolute bottom-0 left-0 top-0 w-2 bg-sky-500" />
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-bold text-slate-800 text-base">{s.kegiatan}</h4>
                  <p className="text-xs font-semibold text-sky-600 mt-0.5">{s.kelas} · {s.prodi}</p>
                </div>
                <span className="rounded-md bg-sky-100 px-2 py-1 text-xs font-black text-sky-700 shrink-0">{s.mulai} – {s.selesai}</span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-400">Dosen</span><span className="font-semibold text-slate-700">{s.dosen}</span>
                <span className="font-semibold text-slate-400">PJ Kelas</span><span className="font-semibold text-slate-700">{s.pj} <span className="text-sky-600 ml-1">({s.kontak})</span></span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TabFasilitas({ ruangan }: { ruangan: RoomInfo }) {
  return (
    <div className="space-y-5">
      {(ruangan.kapasitas || ruangan.keterangan) && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          {ruangan.kapasitas && <p className="font-bold text-blue-900">👥 Kapasitas Maksimal: {ruangan.kapasitas} Orang</p>}
          {ruangan.keterangan && <p className="mt-1 text-xs text-blue-700">{ruangan.keterangan}</p>}
        </div>
      )}
      <div>
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Daftar Fasilitas</h4>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ruangan.fasilitas.map((f) => (
            <li key={f} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-600">✔️</div><span className="text-sm font-semibold text-slate-700">{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function RoomPopup({ ruangan, onClose }: { ruangan: RoomInfo; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>(ruangan.bookable ? 'booking' : 'jadwal');
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    // Animasi muncul (Scale up / Fade In)
    requestAnimationFrame(() => setIsOpening(true));

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, []);

  // Animasi hilang (Scale down / Fade Out) sebelum function onClose dipanggil
  const handleClose = () => {
    setIsOpening(false);
    setTimeout(onClose, 300);
  };

  const tombol: { id: Tab; label: string }[] = [{ id: 'booking', label: ' Booking' }, { id: 'jadwal', label: ' Jadwal' }, { id: 'fasilitas', label: ' Fasilitas' }];

  return (
    <div
      className={`fixed inset-0 z-999 flex flex-col justify-end sm:items-center sm:justify-center transition-colors duration-300 ${isOpening ? 'bg-slate-900/60 backdrop-blur-sm' : 'bg-transparent backdrop-blur-none'}`}
      onClick={handleClose}
    >
      <div
        className={`flex w-full flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300 transform 
          ${isOpening ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-20 sm:translate-y-0 sm:scale-95 opacity-0'}
          h-[92vh] sm:h-auto sm:max-h-[90vh] sm:max-w-lg rounded-t-4xl sm:rounded-4xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-linear-to-br from-blue-600 to-sky-500 p-6 pt-10 sm:pt-8 text-white">
          <button onClick={handleClose} className="absolute right-5 top-6 sm:top-5 rounded-full bg-white/20 p-2 text-white backdrop-blur-md transition hover:bg-white/40">✕</button>
          <span className="mb-2 inline-block rounded-md bg-white/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider">{ruangan.kode} · Lantai 2</span>
          <h3 className="text-2xl font-black tracking-tight">{ruangan.nama}</h3>
        </div>
        <div className="px-5 pt-5">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1.5 shadow-inner">
            {tombol.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${tab === t.id ? 'bg-white text-sky-600 shadow' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'}`}>{t.label}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {tab === 'booking' && <TabBooking ruangan={ruangan} />} {tab === 'jadwal' && <TabJadwal ruangan={ruangan} />} {tab === 'fasilitas' && <TabFasilitas ruangan={ruangan} />}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. MAIN LAYOUT: WEB & TAB (TAMPILAN WEB)
// ============================================================================
export default function WebTabLayout() {
  const [selectedCode, setSelectedCode] = useState<RoomCode | null>(null);
  const selectedRoom = selectedCode ? ROOMS[selectedCode] : null;

  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-8 bg-slate-50/50 min-h-screen">
      <header className="mb-6">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Denah Gedung LE · Lantai 2</h2>
        <p className="text-sm text-slate-500 mt-1 font-medium">Klik pada ruangan interaktif untuk melihat jadwal, fasilitas, atau mengajukan booking.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <div className="mb-5"><FloorPlanLegend /></div>
          <div className="overflow-x-auto scrollbar-hide">
            <FloorPlanSvg selectedCode={selectedCode} onSelectRoom={(c) => setSelectedCode(c as RoomCode)} className="block h-auto w-full min-w-175" />
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm lg:self-start">
          <h3 className="mb-4 px-1 text-sm font-bold text-slate-800 uppercase tracking-wider">Daftar Ruangan</h3>
          <DaftarRuangan selected={selectedCode} onSelect={(c: any) => setSelectedCode(c)} />
        </aside>
      </div>

      {selectedRoom && <RoomPopup key={selectedRoom.kode} ruangan={selectedRoom} onClose={() => setSelectedCode(null)} />}
    </div>
  );
}
