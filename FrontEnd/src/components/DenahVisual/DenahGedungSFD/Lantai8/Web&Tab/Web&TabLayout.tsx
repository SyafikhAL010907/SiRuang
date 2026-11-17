'use client';

/**
 * Denah Gedung SFD - Lantai 8
 * WEB & TAB VIEW — tema Charcoal Noir
 *
 * Alur pengguna:  Denah → Jadwal → Fasilitas → Lokasi (denah lagi) → Booking
 *
 * Isi file ini: peta interaktif + legenda + daftar ruangan, langkah Lokasi, popup RoomFlow, dan SfdPage.
 * Bagian lain ada di file topiknya:
 *   Jadwal/Jadwal.tsx          data ruangan, jadwal dummy, helper jadwal, token UI, JadwalStep
 *   Fasilitas/Fasilitas.tsx    penjelasan fasilitas, FasilitasStep, showcase PilihanRuangan
 *   Booking/Booking.tsx        form booking
 *   3DRoom/3DRoom.tsx          model & interior 3D
 *   DenahL8SFD/DenahL8SFD.tsx  gambar denah SVG (punya 2 tema: gelap & terang)
 *
 * Aset:
 *   Latar belakang halaman  → public/GedungSFD/SFD.png
 *   Logo header             → public/LogoSiRuangDatar.png
 *   Latar langkah Lokasi    → public/Batik.png
 *
 * Palette: #2B2B2B Charcoal Noir · #565656 Ironclad Grey · #848484 Urban Fog
 *          #B3B3B3 Moonlit Silver · #E0E0E0 Cloud Veil
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowLeft, Calendar, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock, GraduationCap, Info, X } from 'lucide-react';
import { DenahL8SFD, boxFokus, useAnimatedBox } from '../DenahL8SFD/DenahL8SFD';
import { NOMOR_LANTAI, LANTAI_LABEL, RUANGAN, cariRuangan, statusHari, useHariIni, JadwalStep, FOCUS, BTN_UTAMA, BTN_TEPI, FONT, SfdStyle } from '../Jadwal/Jadwal';
import type { Ruangan } from '../Jadwal/Jadwal';
import { FasilitasStep } from '../Fasilitas/Fasilitas';
import { BookingStep } from '../Booking/Booking';
import { LokasiStep, Lokasi } from '../LokasiRuangan/Lokasi';
import { useRoomStatuses } from '@/hooks/useRoomStatuses';

// Export lama dipertahankan agar import dari file ini di tempat lain tetap jalan
export type { Hari, Jadwal } from '../Jadwal/Jadwal';
export { URUTAN_HARI, HARI_DARI_INDEX, HARI_KERJA, JAM_BUKA, JAM_TUTUP, NOMOR_LANTAI, FOTO_SEMENTARA, RUANGAN, cariRuangan, fotoRuangan, slotKosong, statusHari, useHariIni, SfdStyle } from '../Jadwal/Jadwal';
export { penjelasanFasilitas, PilihanRuangan } from '../Fasilitas/Fasilitas';
export { MODEL_3D, MODEL_RUANGAN, Slot3D, Ruang805SFD } from '../3D/3DRoom';
export { DenahL8SFD, DenahSvgSfd } from '../DenahL8SFD/DenahL8SFD';
export { LokasiStep, Lokasi } from '../LokasiRuangan/Lokasi';
export type { Ruangan } from '../Jadwal/Jadwal';

const BG_GEDUNG = '/GedungSFD/SFD.png';
const LOGO_SIRUANG = '/LogoSiRuangDatar.png';
const BG_BATIK = '/Batik.png';

// Tombol tema terang (dipakai di footer saat langkah Lokasi)
const BTN_TERANG_UTAMA = 'rounded-full bg-[#111111] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40';
const BTN_TERANG_TEPI = 'rounded-full border border-[#2B2B2B] bg-white px-6 py-2.5 text-sm font-bold text-[#2B2B2B] transition hover:bg-[#E0E0E0]';

export function Legenda({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] md:text-xs font-bold text-white ${className}`}>
      <span className="flex items-center gap-2">
        <i className="h-3.5 w-3.5 shrink-0 rounded-full bg-white" />
        Kelas Kosong
      </span>
      <span className="flex items-center gap-2">
        <i className="h-3.5 w-3.5 shrink-0 rounded-full bg-[#3B82F6]" />
        Jadwal Resmi (SIAKAD)
      </span>
      <span className="flex items-center gap-2">
        <i className="h-3.5 w-3.5 shrink-0 rounded-full bg-[#FFEB3B]" />
        Kelas dalam Pengajuan
      </span>
      <span className="flex items-center gap-2">
        <i className="h-3.5 w-3.5 shrink-0 rounded-full bg-[#E53935]" />
        Kelas Dipakai
      </span>
      <span className="flex items-center gap-2">
        <i className="h-3.5 w-3.5 shrink-0 rounded-full bg-[#757575]" />
        Fasilitas Umum
      </span>
    </div>
  );
}

export function DaftarRuangan({ selected, onSelect, grid = false }: { selected: string | null; onSelect: (k: string) => void; grid?: boolean }) {
  return (
    <ul className={grid ? 'grid grid-cols-2 gap-2 lg:grid-cols-4' : 'flex flex-col gap-2'}>
      {RUANGAN.map((r) => (
        <li key={r.kode}>
          <button
            onClick={() => onSelect(r.kode)}
            className={`flex w-full items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${FOCUS} ${selected === r.kode ? 'border-[#E0E0E0] bg-[#E0E0E0] text-[#2B2B2B]' : 'border-[#565656] text-[#E0E0E0] hover:border-[#B3B3B3] hover:bg-[#565656]/40'}`}
          >
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.bookable ? (selected === r.kode ? 'bg-[#2B2B2B]' : 'bg-[#E0E0E0]') : 'border border-[#848484]'}`} />
            <span className="truncate">{r.kode.startsWith('R.') ? `${r.kode} · ` : ''}{r.nama}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// FILTER TANGGAL & JAM — picker kustom (tema gelap, selaras dengan denah)
// Nilai yang dikirim tetap sama: tanggal 'YYYY-MM-DD' dan jam 'all' | '08:00-10:00' | dst.
// ============================================================================
const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const NAMA_HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const NAMA_HARI_PANJANG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const OPSI_JAM = [
  { value: 'all', label: '08:00 – 17:00', sub: 'Semua Jam' },
  { value: '08:00-10:00', label: '08:00 – 10:00', sub: 'Sesi Pagi 1' },
  { value: '10:00-12:00', label: '10:00 – 12:00', sub: 'Sesi Pagi 2' },
  { value: '13:00-15:00', label: '13:00 – 15:00', sub: 'Sesi Siang 1' },
  { value: '15:00-17:00', label: '15:00 – 17:00', sub: 'Sesi Siang 2' },
];

const pad2 = (n: number) => String(n).padStart(2, '0');
const toIso = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
const hariIniIso = () => {
  const n = new Date();
  return toIso(n.getFullYear(), n.getMonth(), n.getDate());
};
const parseIso = (s: string) => {
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(s);
  const [y, m, d] = (ok ? s : hariIniIso()).split('-').map(Number);
  return { y, m: m - 1, d };
};

// Tutup popover saat klik di luar / tekan Escape
function useTutupLuar(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open, onClose]);
  return ref;
}

const TRIGGER_BASE = 'flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-semibold text-white transition-all cursor-pointer outline-none';
const TRIGGER_AKTIF = 'border-[#588CBC] bg-[#588CBC]/15 ring-4 ring-[#588CBC]/15';
const TRIGGER_BIASA = 'border-white/15 bg-white/5 hover:border-white/35 hover:bg-white/10 focus-visible:border-[#588CBC]';
const POPOVER = 'sfd-in absolute top-full z-40 mt-2 rounded-2xl border border-white/15 bg-[#161616]/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl';
const LABEL_FILTER = 'hidden select-none text-[10px] font-bold uppercase tracking-[0.16em] text-white/55 sm:inline';

function PickerTanggal({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const tutup = useCallback(() => setOpen(false), []);
  const ref = useTutupLuar(open, tutup);
  const sel = parseIso(value);
  const [view, setView] = useState({ y: sel.y, m: sel.m });
  const today = hariIniIso();
  const valueIso = toIso(sel.y, sel.m, sel.d);
  const tp = parseIso(today);
  const bulanIni = view.y === tp.y && view.m === tp.m; // tidak bisa mundur dari bulan ini

  // Saat dibuka, kalender langsung menampilkan bulan dari tanggal terpilih
  useEffect(() => {
    if (open) {
      const p = parseIso(value);
      setView({ y: p.y, m: p.m });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const awalBulan = new Date(view.y, view.m, 1).getDay();
  const jumlahHari = new Date(view.y, view.m + 1, 0).getDate();
  const sel_ = [
    ...Array.from({ length: awalBulan }, () => null as number | null),
    ...Array.from({ length: jumlahHari }, (_, i) => i + 1),
  ];

  const geser = (arah: number) =>
    setView((v) => {
      const t = new Date(v.y, v.m + arah, 1);
      return { y: t.getFullYear(), m: t.getMonth() };
    });

  const pilih = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  const namaHari = NAMA_HARI_PANJANG[new Date(sel.y, sel.m, sel.d).getDay()];

  return (
    <div ref={ref} className="relative flex items-center gap-2.5">
      <span className={LABEL_FILTER}>Tanggal</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${TRIGGER_BASE} ${open ? TRIGGER_AKTIF : TRIGGER_BIASA}`}
      >
        <Calendar size={14} className="shrink-0 text-[#588CBC]" />
        <span className="tabular-nums">{namaHari}, {sel.d} {NAMA_BULAN[sel.m].slice(0, 3)} {sel.y}</span>
        {valueIso === today && (
          <span className="rounded-full bg-[#588CBC]/25 px-1.5 py-px text-[9px] font-black uppercase tracking-wider text-[#9CC3E6]">Hari ini</span>
        )}
        <ChevronDown size={14} className={`shrink-0 text-white/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="dialog" aria-label="Pilih tanggal" className={`${POPOVER} left-0 w-[288px]`}>
          {/* Header bulan */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => geser(-1)}
              disabled={bulanIni}
              aria-label="Bulan sebelumnya"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white cursor-pointer disabled:cursor-not-allowed disabled:text-white/20 disabled:hover:bg-transparent disabled:hover:text-white/20"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="select-none text-sm font-extrabold tracking-tight text-white">
              {NAMA_BULAN[view.m]} <span className="font-semibold text-white/60">{view.y}</span>
            </p>
            <button
              type="button"
              onClick={() => geser(1)}
              aria-label="Bulan berikutnya"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Nama hari */}
          <div className="grid grid-cols-7 pb-1">
            {NAMA_HARI_PENDEK.map((h, i) => (
              <span key={h} className={`select-none text-center text-[10px] font-bold uppercase tracking-wider ${i === 0 || i === 6 ? 'text-white/30' : 'text-white/55'}`}>
                {h}
              </span>
            ))}
          </div>

          {/* Tanggal */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {sel_.map((d, i) => {
              if (d === null) return <span key={`k${i}`} />;
              const iso = toIso(view.y, view.m, d);
              const terpilih = iso === valueIso;
              const hariIni = iso === today;
              const akhirPekan = (i % 7 === 0) || (i % 7 === 6);
              const lewat = iso < today; // tanggal yang sudah lewat tidak bisa dipilih
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => !lewat && pilih(iso)}
                  disabled={lewat}
                  aria-label={`${d} ${NAMA_BULAN[view.m]} ${view.y}`}
                  aria-pressed={terpilih}
                  className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-xs tabular-nums transition ${
                    lewat
                      ? 'cursor-not-allowed font-medium text-white/15 line-through decoration-white/10'
                      : terpilih
                        ? 'cursor-pointer bg-[#588CBC] font-black text-white shadow-lg shadow-[#588CBC]/30'
                        : hariIni
                          ? 'cursor-pointer font-bold text-[#9CC3E6] ring-1 ring-[#588CBC]/70 hover:bg-white/10'
                          : `cursor-pointer font-semibold hover:bg-white/10 ${akhirPekan ? 'text-white/40' : 'text-white/85'}`
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
            <button
              type="button"
              onClick={() => pilih(today)}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-[#9CC3E6] transition hover:bg-[#588CBC]/15 cursor-pointer"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={tutup}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white/55 transition hover:bg-white/10 hover:text-white cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function PickerJam({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const tutup = useCallback(() => setOpen(false), []);
  const ref = useTutupLuar(open, tutup);
  const aktif = OPSI_JAM.find((o) => o.value === value) ?? OPSI_JAM[0];

  return (
    <div ref={ref} className="relative flex items-center gap-2.5">
      <span className={LABEL_FILTER}>Filter Jam</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${TRIGGER_BASE} ${open ? TRIGGER_AKTIF : TRIGGER_BIASA}`}
      >
        <Clock size={14} className="shrink-0 text-[#588CBC]" />
        <span className="tabular-nums">{aktif.label}</span>
        <span className="hidden font-medium text-white/50 md:inline">· {aktif.sub}</span>
        <ChevronDown size={14} className={`shrink-0 text-white/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul role="listbox" aria-label="Filter jam" className={`${POPOVER} right-0 w-[260px] !p-1.5`}>
          {OPSI_JAM.map((o) => {
            const terpilih = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={terpilih}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition cursor-pointer ${
                    terpilih ? 'bg-[#588CBC]/20' : 'hover:bg-white/10'
                  }`}
                >
                  <span className="flex flex-col leading-tight">
                    <span className={`text-xs font-bold tabular-nums ${terpilih ? 'text-white' : 'text-white/85'}`}>{o.label}</span>
                    <span className={`mt-0.5 text-[10px] font-medium ${terpilih ? 'text-[#9CC3E6]' : 'text-white/45'}`}>{o.sub}</span>
                  </span>
                  {terpilih && <Check size={15} className="shrink-0 text-[#9CC3E6]" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ============================================================================
// POPUP PENJELASAN "BOOKING BERSYARAT"
// Dirender lewat portal ke <body> supaya blur & overlay menutupi seluruh layar
// (tidak terjebak di dalam kontainer peta yang punya overflow/backdrop-filter).
// Isi masih dummy — tinggal ganti teksnya nanti.
// ============================================================================
function BookingBersyaratModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  const syarat = [
    'Ruangan sudah punya jadwal resmi dari SIAKAD pada jam yang kamu pilih.',
    'Kelas resmi tersebut tidak digunakan atau dikosongkan pada hari itu.',
    'Pengajuan disetujui oleh pihak terkait sebelum ruangan boleh dipakai.',
  ];

  const alur = [
    { t: 'Pilih ruangan & jam', d: 'Cek jadwal ruangan, lalu pilih slot yang ingin diajukan.' },
    { t: 'Isi form pengajuan', d: 'Tulis keperluan dan jumlah peserta dengan jelas.' },
    { t: 'Tunggu persetujuan', d: 'Statusnya bisa kamu pantau langsung di denah.' },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-booking-bersyarat"
      style={{ fontFamily: FONT }}
    >
      {/* Latar belakang blur — klik di sini untuk menutup */}
      <div
        className="sfd-in absolute inset-0 bg-[#111111]/60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />

      <div className="sfd-in relative z-10 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[#E0E0E0] bg-white text-[#2B2B2B] shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E0E0E0] px-6 pb-4 pt-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#848484]">Panduan</p>
            <h2 id="judul-booking-bersyarat" className="mt-0.5 text-lg font-extrabold tracking-tight">
              Apa itu Booking Bersyarat?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#E0E0E0] text-[#565656] transition hover:border-[#2B2B2B] hover:bg-[#E0E0E0] hover:text-[#2B2B2B]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Isi */}
        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <p className="text-sm leading-relaxed text-[#565656]">
            Booking Bersyarat adalah pengajuan peminjaman ruangan yang <strong className="font-bold text-[#2B2B2B]">sudah punya jadwal resmi di SIAKAD</strong>, dengan syarat kelas resminya sedang kosong atau tidak dipakai pada jam tersebut.
          </p>

          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2B2B2B]">Syaratnya</h3>
            <ul className="mt-2 space-y-2">
              {syarat.map((s) => (
                <li key={s} className="flex items-start gap-2.5 text-[13px] leading-snug text-[#565656]">
                  <Check size={14} className="mt-0.5 shrink-0 text-[#2B2B2B]" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2B2B2B]">Alur singkat</h3>
            <ol className="mt-2 space-y-3">
              {alur.map((a, i) => (
                <li key={a.t} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2B2B2B] text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-[13px] leading-snug">
                    <span className="block font-bold text-[#2B2B2B]">{a.t}</span>
                    <span className="text-[#565656]">{a.d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <p className="rounded-xl bg-[#F4F4F4] px-3.5 py-3 text-xs leading-relaxed text-[#565656]">
            Jadwal resmi tetap diprioritaskan. Jika kelas resmi ternyata berlangsung, pengajuanmu bisa dibatalkan.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-[#E0E0E0] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-full bg-[#111111] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-black active:scale-[0.98]"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================================================
// 4. PETA INTERAKTIF — tanda hover + zoom saat klik
// ============================================================================
function KartuRuangan({
  ruangan,
  onLanjut,
  onReset,
  compact,
  statusInfo,
  onCheckin,
  checkinLoading,
}: {
  ruangan: Ruangan;
  onLanjut: () => void;
  onReset: () => void;
  compact: boolean;
  statusInfo?: any;
  onCheckin?: (bookingId: string) => Promise<void>;
  checkinLoading?: boolean;
}) {
  const hari = useHariIni();
  const [infoBersyarat, setInfoBersyarat] = useState(false);
  const activeBooking = statusInfo?.bookings?.find((b: any) =>
    ['disetujui_dosen', 'dijadwalkan_admin', 'menunggu_checkin'].includes(b.status)
  );
  const isBerlangsung = statusInfo?.bookings?.some((b: any) => b.status === 'berlangsung');
  const isJadwalResmi = statusInfo?.status === 'jadwal_resmi' || (statusInfo?.schedules && statusInfo.schedules.length > 0 && !activeBooking && !isBerlangsung);
  const officialSchedule = statusInfo?.schedules?.[0];

  return (
    <div
      className={`sfd-in rounded-2xl bg-white p-4 text-[#2B2B2B] shadow-xl ${compact ? 'mt-3' : 'absolute bottom-4 left-4 w-[min(260px,calc(100%-2rem))] z-20'}`}
    >
      <p className="flex items-center gap-1 text-[10px] font-semibold text-[#565656]">
        <span aria-hidden>◂</span>
        {ruangan.kode}
      </p>
      <h3 className="mt-0.5 text-base font-extrabold tracking-tight">{ruangan.nama}</h3>
      <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-[#565656]">{ruangan.deskripsi ?? ruangan.keterangan}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[9px] font-semibold text-[#2B2B2B]">
        {ruangan.kapasitas && <span className="rounded-full border border-[#B3B3B3] px-2 py-0.5">{ruangan.kapasitas} orang</span>}
        <span className="rounded-full border border-[#B3B3B3] px-2 py-0.5">{statusHari(ruangan, hari)}</span>
      </div>

      {/* Info Jadwal Resmi */}
      {isJadwalResmi && officialSchedule && (
        <div className="mt-3 rounded-xl border border-[#E0E0E0] bg-[#F7F7F7] p-3">
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#565656]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
            <span>Jadwal Resmi SIAKAD</span>
          </div>
          <p className="mt-1.5 line-clamp-1 text-xs font-bold text-[#2B2B2B]">
            {officialSchedule.mata_kuliah} {officialSchedule.kelas ? `(${officialSchedule.kelas})` : ''}
          </p>
          <div className="mt-1.5 space-y-1 text-[10px] text-[#565656]">
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="shrink-0 text-[#848484]" />
              <span className="tabular-nums">{officialSchedule.jam_mulai.slice(0, 5)} - {officialSchedule.jam_selesai.slice(0, 5)} WIB</span>
            </div>
            {officialSchedule.nama_dosen && (
              <div className="flex items-center gap-1.5">
                <GraduationCap size={12} className="shrink-0 text-[#848484]" />
                <span className="truncate">{officialSchedule.nama_dosen}</span>
              </div>
            )}
          </div>
          <p className="mt-2.5 border-t border-[#E0E0E0] pt-2 text-[10px] leading-relaxed text-[#565656]">
            Ruangan ini punya jadwal resmi. Jika kelasnya kosong, kamu bisa mengajukan{' '}
            <button
              type="button"
              onClick={() => setInfoBersyarat(true)}
              className="cursor-pointer font-bold text-[#2B2B2B] underline decoration-[#848484] underline-offset-2 transition hover:decoration-[#2B2B2B]"
            >
              Booking Bersyarat
            </button>
            .
          </p>
        </div>
      )}

      {/* Status Booking Alert */}
      {activeBooking && (
        <div className="mt-3 p-3 rounded-2xl bg-amber-50/90 border border-amber-200 shadow-xs">
          <div className="flex items-center gap-1.5 text-amber-800 text-[10px] font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Disetujui Dosen (Kuning)</span>
          </div>
          <p className="text-xs text-slate-800 font-bold mt-1.5 line-clamp-1">
            {activeBooking.mata_kuliah}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600 mt-1">
            <Clock size={12} className="text-amber-600 shrink-0" />
            <span>{activeBooking.jam_mulai?.slice(0, 5)} - {activeBooking.jam_selesai?.slice(0, 5)} WIB</span>
          </div>
        </div>
      )}

      {isBerlangsung && (
        <div className="mt-3 p-2.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-[10px] font-bold">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>Sedang Digunakan · Merah</span>
        </div>
      )}

      <div className="mt-3.5 flex flex-col gap-2">
        <button
          onClick={onLanjut}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#183449] hover:bg-[#122838] text-white px-4 py-2.5 text-xs font-bold transition shadow-xs active:scale-[0.98] cursor-pointer"
        >
          <span>{isJadwalResmi ? 'Booking Bersyarat / Cek Jadwal' : 'Cek Jadwal Ruangan'}</span>
          <span aria-hidden>→</span>
        </button>
        <button
          onClick={onReset}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] cursor-pointer"
        >
          Denah Penuh
        </button>
      </div>

      {infoBersyarat && <BookingBersyaratModal onClose={() => setInfoBersyarat(false)} />}
    </div>
  );
}

export function PetaInteraktif({
  selectedCode,
  onSelect,
  onLanjut,
  compact = false,
  selectedDate,
  onDateChange,
}: {
  selectedCode: string | null;
  onSelect: (kode: string | null) => void;
  onLanjut: (kode: string) => void;
  compact?: boolean;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [internalDate, setInternalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const activeDate = selectedDate ?? internalDate;
  const [selectedJam, setSelectedJam] = useState<string>('all');
  const { roomStatuses, refresh } = useRoomStatuses({ gedung: 'SFD', lantai: 8, tanggal: activeDate, jam: selectedJam });
  const [hover, setHover] = useState<{ kode: string | null; x: number; y: number; w: number } | null>(null);
  const box = useAnimatedBox(useMemo(() => boxFokus(selectedCode), [selectedCode]));
  const vb = box.map((n) => n.toFixed(1)).join(' ');
  const selectedRoom = selectedCode ? cariRuangan(selectedCode) : null;
  const hovered = hover?.kode ? cariRuangan(hover.kode) : null;
  const [checkinLoading, setCheckinLoading] = useState(false);

  const handleCheckin = async (bookingId: string, kodeRuang: string) => {
    if (!confirm(`Konfirmasi kehadiran presensi dan check-in peminjaman ruangan ${kodeRuang}?`)) return;
    setCheckinLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/checkin`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Gagal melakukan check-in.');
      } else {
        alert(`Check-in berhasil! Ruangan ${kodeRuang} kini berstatus sedang digunakan (Warna berubah jadi Merah).`);
        refresh();
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setCheckinLoading(false);
    }
  };

  // Cek apakah ada ruangan yang siap check-in pada lantai ini
  const pendingCheckinEntry = Object.entries(roomStatuses).find(([_, r]) =>
    r.bookings?.some((b: any) =>
      ['disetujui_dosen', 'dijadwalkan_admin', 'menunggu_checkin'].includes(b.status)
    )
  );

  const readyRoomKode = pendingCheckinEntry ? pendingCheckinEntry[0] : null;
  const readyBooking = pendingCheckinEntry
    ? pendingCheckinEntry[1].bookings?.find((b: any) =>
        ['disetujui_dosen', 'dijadwalkan_admin', 'menunggu_checkin'].includes(b.status)
      )
    : null;

  const onHover = (kode: string | null, pos: { x: number; y: number } | null) => {
    const r = wrap.current?.getBoundingClientRect();
    setHover({ kode, x: pos && r ? pos.x - r.left : -1, y: pos && r ? pos.y - r.top : -1, w: r?.width ?? 0 });
  };

  return (
    <div className="relative">
      {/* Date & Time Picker */}
      <div className="relative z-30 mb-2.5 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md">
        <PickerTanggal
          value={activeDate}
          onChange={(v) => {
            if (onDateChange) onDateChange(v);
            else setInternalDate(v);
          }}
        />
        <PickerJam value={selectedJam} onChange={setSelectedJam} />
      </div>

      {/* Label lokasi di atas peta saat zoom */}
      {!compact && selectedRoom && (
        <p className="absolute -top-6 right-6 text-[11px] font-medium text-white/60">
          {LANTAI_LABEL} · Tower
        </p>
      )}

      <div
        ref={wrap}
        className="relative overflow-hidden rounded-[2.5rem] border-2 border-white backdrop-blur-[2px]"
        style={{ background: 'rgba(20,20,20,.30)' }}
      >
        {/* Halaman utama selalu pakai denah tema GELAP */}
        <DenahL8SFD
          tema="gelap"
          selectedCode={selectedCode}
          onSelectRoom={onSelect}
          viewBox={vb}
          hoveredCode={hover?.kode ?? null}
          onHoverRoom={onHover}
          roomStatuses={roomStatuses}
          className="block h-auto w-full"
        />

        {/* Tanda ruangan yang ditunjuk kursor */}
        {!compact && hovered && hover && hover.x >= 0 && (
          <div
            className="pointer-events-none absolute z-10 rounded-2xl border border-[#848484] bg-[#2B2B2B]/90 px-5 py-3 backdrop-blur"
            style={{ left: hover.x, top: hover.y, transform: `translate(${hover.x > hover.w - 280 ? 'calc(-100% - 18px)' : '18px'}, 18px)` }}
          >
            <p className="text-[11px] font-semibold tracking-widest text-[#B3B3B3]">RUANGAN</p>
            <p className="text-lg font-extrabold leading-tight text-[#E0E0E0]">{hovered.nama}</p>
            <p className="mt-0.5 text-xs text-[#B3B3B3]">{hovered.kode} · klik untuk zoom</p>
          </div>
        )}

        {!compact && selectedRoom && (
          <KartuRuangan
            ruangan={selectedRoom}
            compact={false}
            statusInfo={selectedRoom ? roomStatuses[selectedRoom.kode] : undefined}
            onCheckin={(bookingId) => handleCheckin(bookingId, selectedRoom.kode)}
            checkinLoading={checkinLoading}
            onLanjut={() => onLanjut(selectedRoom.kode)}
            onReset={() => onSelect(null)}
          />
        )}
      </div>
      {compact && selectedRoom && (
        <KartuRuangan
          ruangan={selectedRoom}
          compact
          statusInfo={selectedRoom ? roomStatuses[selectedRoom.kode] : undefined}
          onCheckin={(bookingId) => handleCheckin(bookingId, selectedRoom.kode)}
          checkinLoading={checkinLoading}
          onLanjut={() => onLanjut(selectedRoom.kode)}
          onReset={() => onSelect(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// LOKASI — langkah ketiga di popup ruangan (denah TERANG + petunjuk arah)
// Dipisahkan ke: ../DenahL8SFD/LokasiRuangan/Lokasi.tsx agar mudah diedit
// ============================================================================

// ============================================================================
// 6. ALUR RUANGAN: Jadwal → Fasilitas → Lokasi → Booking
// ============================================================================
const LANGKAH = ['Denah', 'Jadwal', 'Fasilitas', 'Lokasi', 'Booking'];
const STEP_JADWAL = 1;
const STEP_FASILITAS = 2;
const STEP_LOKASI = 3;
const STEP_BOOKING = 4;

export function RoomFlow({
  ruangan,
  initialBooking,
  onClose,
}: {
  ruangan: Ruangan;
  initialBooking?: any;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [maks, setMaks] = useState(1);
  const [buka, setBuka] = useState(false);
  const body = useRef<HTMLDivElement>(null);

  // Langkah Jadwal & Lokasi tampil dengan tema terang + latar batik
  const terang = step === STEP_JADWAL || step === STEP_FASILITAS || step === STEP_LOKASI || step === STEP_BOOKING;

  const tutup = () => { setBuka(false); setTimeout(onClose, 300); };

  useEffect(() => {
    requestAnimationFrame(() => setBuka(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setBuka(false); setTimeout(onClose, 300); } };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ke = (n: number) => {
    if (n === 0) return tutup();
    setStep(n);
    setMaks((m) => Math.max(m, n));
    body.current?.scrollTo({ top: 0 });
  };
  const lanjutLabel = ['', 'Lanjut ke fasilitas', 'Lanjut ke lokasi', 'Lanjut ke booking'][step];

  const garisBatas = terang ? 'border-[#E0E0E0]' : 'border-[#565656]';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${ruangan.nama}, alur ruangan`}
      className={`fixed inset-0 z-50 flex flex-col transition-[opacity,transform,background-color,color] duration-300 ease-out ${terang ? 'bg-white text-[#2B2B2B]' : 'bg-[#2B2B2B] text-[#E0E0E0]'} ${buka ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0'}`}
      style={{ fontFamily: FONT }}
    >
      <header className={`flex items-center justify-between gap-4 border-b px-5 py-4 md:px-10 ${garisBatas} ${terang ? 'bg-white' : ''}`}>
        <div className="min-w-0">
          <p className={`text-xs font-semibold ${terang ? 'text-[#565656]' : 'text-[#B3B3B3]'}`}>{ruangan.kode} · {LANTAI_LABEL}</p>
          <h2 className="truncate text-lg font-extrabold tracking-tight md:text-xl">{ruangan.nama}</h2>
        </div>
        <button
          onClick={tutup}
          aria-label="Tutup"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${FOCUS} ${terang ? 'border-[#2B2B2B] hover:bg-[#E0E0E0]' : 'border-[#848484] hover:border-[#E0E0E0]'}`}
        >
          ✕
        </button>
      </header>

      <nav aria-label="Langkah" className={`border-b px-5 py-3 md:px-10 ${garisBatas} ${terang ? 'bg-white' : ''}`}>
        <ol className="mx-auto flex max-w-3xl items-center">
          {LANGKAH.map((l, i) => {
            const selesai = i < step, aktif = i === step, bisa = i <= maks;
            const warnaTeks = aktif
              ? terang ? 'text-[#2B2B2B]' : 'text-[#E0E0E0]'
              : bisa
                ? terang ? 'text-[#565656] hover:text-[#2B2B2B]' : 'text-[#B3B3B3] hover:text-[#E0E0E0]'
                : terang ? 'text-[#B3B3B3]' : 'text-[#848484]';
            const warnaBulat = aktif
              ? terang ? 'border-[#0D0D0D] bg-[#0D0D0D] text-white' : 'border-[#E0E0E0] bg-[#E0E0E0] text-[#2B2B2B]'
              : selesai
                ? terang ? 'border-[#2B2B2B] text-[#2B2B2B]' : 'border-[#B3B3B3] text-[#E0E0E0]'
                : terang ? 'border-[#B3B3B3]' : 'border-[#565656]';
            const warnaGaris = i < step
              ? terang ? 'bg-[#2B2B2B]' : 'bg-[#B3B3B3]'
              : terang ? 'bg-[#D0D0D0]' : 'bg-[#565656]';
            return (
              <React.Fragment key={l}>
                <li>
                  <button onClick={() => bisa && ke(i)} disabled={!bisa} aria-current={aktif ? 'step' : undefined} className={`flex items-center gap-2 rounded-full py-1 pr-1 text-xs font-bold transition md:pr-3 ${FOCUS} ${warnaTeks}`}>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${warnaBulat}`}>{selesai ? '✓' : i + 1}</span>
                    <span className="hidden sm:inline">{l}</span>
                  </button>
                </li>
                {i < LANGKAH.length - 1 && <span className={`mx-1 h-px flex-1 ${warnaGaris}`} />}
              </React.Fragment>
            );
          })}
        </ol>
      </nav>

      <div
        ref={body}
        className="flex-1 overflow-y-auto px-5 py-8 md:px-10"
        style={terang ? { backgroundColor: '#FFFFFF', backgroundImage: `url('${BG_BATIK}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : undefined}
      >
        <div key={step} className="sfd-in mx-auto max-w-6xl">
          {step === 1 && <JadwalStep ruangan={ruangan} tema="terang" />}
          {step === 2 && <FasilitasStep ruangan={ruangan} tema="terang" />}
          {step === 3 && <LokasiStep ruangan={ruangan} />}
          {step === 4 && <BookingStep ruangan={ruangan} initialBooking={initialBooking} tema="terang" onClose={tutup} />}
        </div>
      </div>

      <footer className={`flex items-center justify-between gap-3 border-t px-5 py-4 md:px-10 ${garisBatas} ${terang ? 'bg-white' : ''}`}>
        <button onClick={() => ke(step - 1)} className={terang ? BTN_TERANG_TEPI : BTN_TEPI}>{step === 1 ? 'Kembali ke denah' : 'Kembali'}</button>
        {step < 4 && (
          <button
            onClick={() => ke(step + 1)}
            disabled={step === 3 && !ruangan.bookable}
            className={terang ? BTN_TERANG_UTAMA : BTN_UTAMA}
          >
            {step === 3 && !ruangan.bookable ? 'Tidak bisa dibooking' : lanjutLabel}
          </button>
        )}
      </footer>
    </div>
  );
}

// Nama lama dipertahankan agar import lama tetap jalan
export { RoomFlow as RoomPopupSfd };

// ============================================================================
// 7. HALAMAN: dipakai Web&Tab dan Mobile (compact)
// ============================================================================
export function SfdPage({ compact = false }: { compact?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [flow, setFlow] = useState<string | null>(null);
  const { roomStatuses } = useRoomStatuses({ gedung: 'SFD', lantai: NOMOR_LANTAI });
  const jumlah = RUANGAN.filter((r) => r.bookable).length;

  const fakta = [
    { v: `${jumlah} ruangan`, d: 'Lab, studio, dan ruang praktik yang bisa dibooking di lantai ini.' },
    { v: '08.00–17.00', d: 'Jam operasional Senin sampai Jumat. Sabtu dan Minggu tutup.' },
    { v: 'Lobby Lift', d: 'Titik "You are here" ada di lobby lift, tengah denah.' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#111111] text-white antialiased" style={{ fontFamily: FONT }}>
      <SfdStyle />

      {/* Latar belakang foto gedung + overlay gelap */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${BG_GEDUNG}')` }}
      />
      <div aria-hidden className="absolute inset-0 bg-black/75" />

      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-30 grid h-20 grid-cols-3 items-center border-b border-white/70 bg-[#111111]/90 px-6 backdrop-blur-md md:h-24 md:px-12">
        <span className="text-lg font-bold tracking-tight text-white md:text-2xl lg:text-[26px]">Gedung SFD</span>
        <span className="flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SIRUANG} alt="SiRuang" className="h-11 w-auto select-none object-contain md:h-14 lg:h-16" draggable={false} />
        </span>
        <span className="text-right text-lg font-bold tracking-tight text-white md:text-2xl lg:text-[26px]">Lantai {NOMOR_LANTAI}</span>
      </header>

      <section id="peta" className="relative z-10 flex min-h-screen items-center px-5 pb-12 pt-32 md:px-10 md:pt-36 lg:px-14">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(230px,290px)_minmax(0,1fr)_minmax(210px,260px)] lg:gap-8">
          {/* Kiri: judul + deskripsi */}
          <div>
            <h1 className="text-5xl font-bold leading-none tracking-tight text-white lg:text-[56px]">Lantai {NOMOR_LANTAI}</h1>
            <p className="mt-6 max-w-[260px] text-sm font-medium leading-snug text-white md:text-base">
              Gedung SFD lantai 8 berisi laboratorium komputer, studio, dan ruang praktik. Cek jadwal dan fasilitasnya dulu, lihat lokasinya di denah, baru booking.
            </p>
            <Link
              href="/denah-sfd"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:border-white/40 cursor-pointer"
            >
              <ArrowLeft size={16} />
              Kembali ke Pilih Lantai
            </Link>
          </div>

          {/* Tengah: peta + legenda */}
          <div>
            <PetaInteraktif selectedCode={selected} onSelect={setSelected} onLanjut={setFlow} compact={compact} />
            <Legenda className="mt-5" />
          </div>

          {/* Kanan: timeline fakta */}
          <div className="relative pl-9">
            <div className="absolute left-[11px] top-3 bottom-3 w-px bg-white/70" />

            <ul className="space-y-5">
              {fakta.map((x) => (
                <li key={x.v} className="relative">
                  <span className="absolute -left-9 top-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-white/90 bg-[#1a1a1a]">
                    <i className="h-2 w-2 rounded-full bg-[#9E9E9E]" />
                  </span>
                  <p className="text-lg font-bold leading-snug text-white">{x.v}</p>
                  <p className="mt-0.5 text-xs font-medium leading-snug text-white/90">{x.d}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {flow && (
        <RoomFlow
          key={flow}
          ruangan={cariRuangan(flow)}
          initialBooking={roomStatuses[flow]?.bookings?.[0]}
          onClose={() => setFlow(null)}
        />
      )}
    </div>
  );
}

export default function WebTabLayoutSfd() {
  return <SfdPage />;
}