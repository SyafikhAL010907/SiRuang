'use client';

/**
 * Booking - Gedung SFD Lantai 8
 * Isi: form & langkah "Booking" di popup ruangan (BookingStep) dan halaman daftar booking
 * Terintegrasi dengan Akun PJ Kelas, Course Relations, dan API Bookings SiRuang.
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  RUANGAN,
  SfdStyle,
  BTN_TEPI,
  BTN_UTAMA,
  INPUT,
  LABEL,
  HARI_DARI_INDEX,
  HARI_KERJA,
  JAM_BUKA,
  JAM_TUTUP,
  statusHari,
  useHariIni,
} from '../Jadwal/Jadwal';
import type { Ruangan } from '../Jadwal/Jadwal';
import { useMyProfile, loadMyProfile } from '@/lib/profileStore';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  Sparkles,
  RefreshCw,
  MapPin,
  XCircle,
} from 'lucide-react';

export type TemaBooking = 'gelap' | 'terang';

interface UserRelation {
  id: string;
  mata_kuliah: string;
  kelas: string;
  dosen_id: number;
  nama_dosen: string;
  dosen_nidn: string;
  dosen_email: string;
  jadwal_hari: string;
  jadwal_jam: string;
  semester: string;
}

type FormBooking = {
  nama: string;
  nim: string;
  kelas: string;
  angkatan: string;
  prodi: string;
  matkul: string;
  dosen: string;
  dosen_id: number | null;
  relation_id: string | null;
  fakultas: string;
  tanggal: string;
  sks: number;
  mulai: string;
  selesai: string;
};

const FORM_KOSONG: FormBooking = {
  nama: '',
  nim: '',
  kelas: '',
  angkatan: '',
  prodi: '',
  matkul: '',
  dosen: '',
  dosen_id: null,
  relation_id: null,
  fakultas: '',
  tanggal: '',
  sks: 2,
  mulai: '08:00',
  selesai: '09:40',
};

/* ───────────── Helper waktu & tanggal ───────────── */

function toMin(t: string): number {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

function fromMin(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMinutesToTime(timeStr: string, minutes: number): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return '';
  return fromMin(h * 60 + m + minutes);
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI_PENDEK = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

// Konversi SKS → jam (1 SKS = 50 menit), ditampilkan dalam jam saja
const SKS_OPSI: { sks: number; jam: string }[] = [
  { sks: 1, jam: '0,8' },
  { sks: 2, jam: '1,7' },
  { sks: 3, jam: '2,5' },
  { sks: 4, jam: '3,3' },
];

const SLIDER_CSS = `
.sr-range{-webkit-appearance:none;appearance:none;width:100%;height:22px;background:transparent;cursor:pointer;outline:none;margin:0}
.sr-range::-webkit-slider-runnable-track{height:6px;border-radius:999px;background:linear-gradient(to right,var(--sl-fill) var(--pct),var(--sl-track) var(--pct))}
.sr-range::-moz-range-track{height:6px;border-radius:999px;background:var(--sl-track)}
.sr-range::-moz-range-progress{height:6px;border-radius:999px;background:var(--sl-fill)}
.sr-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;box-sizing:border-box;width:22px;height:22px;margin-top:-8px;border-radius:50%;background:var(--sl-thumb);border:4px solid var(--sl-fill);box-shadow:0 2px 6px rgba(0,0,0,.28);transition:transform .15s ease}
.sr-range::-moz-range-thumb{box-sizing:border-box;width:22px;height:22px;border-radius:50%;background:var(--sl-thumb);border:4px solid var(--sl-fill);box-shadow:0 2px 6px rgba(0,0,0,.28)}
.sr-range:hover::-webkit-slider-thumb{transform:scale(1.12)}
.sr-range:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 5px var(--sl-ring)}
.sr-range:focus-visible::-moz-range-thumb{box-shadow:0 0 0 5px var(--sl-ring)}
`;

const TEMA_BOOKING = {
  gelap: {
    judul: '',
    sub: 'text-sm text-[#B3B3B3]',
    label: 'mb-1.5 block text-[11px] font-bold tracking-wide text-[#E0E0E0]',
    input: INPUT,
    field:
      'w-full rounded-2xl border border-[#E0E0E0]/70 bg-transparent px-4 py-3 text-sm font-medium text-[#E0E0E0] outline-none transition hover:border-[#E0E0E0] focus:ring-4 focus:ring-white/10 [color-scheme:dark]',
    inputDisabled:
      'w-full rounded-2xl border border-[#4A4A4A] bg-[#363636] py-3 pl-4 pr-10 text-sm font-semibold text-[#D6D6D6] cursor-default select-none',
    lock: 'text-[#9A9A9A]',
    box: 'rounded-2xl border border-[#E0E0E0]/70 bg-transparent text-[#E0E0E0]',
    boxDisabled: 'rounded-2xl border border-[#4A4A4A] bg-[#363636] text-[#D6D6D6]',
    sliderVars: { '--sl-fill': '#E0E0E0', '--sl-track': '#4F4F4F', '--sl-thumb': '#2B2B2B', '--sl-ring': 'rgba(255,255,255,.22)' },
    sksOn: 'border-[#E0E0E0] bg-[#E0E0E0] text-[#0D0D0D]',
    sksOff: 'border-[#E0E0E0]/40 bg-transparent text-[#E0E0E0] hover:border-[#E0E0E0]',
    tick: 'text-[#9A9A9A]',
    pop: 'border-[#E0E0E0]/70 bg-[#2B2B2B] text-[#E0E0E0] shadow-2xl',
    popNav: 'hover:bg-white/10',
    popDay: 'hover:bg-white/10',
    popOn: 'bg-[#E0E0E0] text-[#0D0D0D]',
    popToday: 'ring-1 ring-[#E0E0E0]/60',
    popOff: 'text-[#E0E0E0]/25 cursor-not-allowed',
    popHead: 'text-[#9A9A9A]',
    btnUtama: BTN_UTAMA,
    btnTepi: BTN_TEPI,
    pesan: 'font-semibold text-[#E0E0E0]',
    kotakBentrok: 'rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-200',
    listBentrok: 'mt-2 space-y-1 text-amber-300/80 text-xs',
    kartuTutup: 'rounded-3xl border border-[#565656] p-8',
    kartuOk: 'rounded-3xl border border-[#E0E0E0] p-8',
    dt: 'text-[#B3B3B3]',
  },
  terang: {
    judul: 'text-[#0D0D0D]',
    sub: 'text-xs text-[#3A3A3A]',
    label: 'mb-1.5 block text-[11px] font-bold tracking-wide text-[#0D0D0D]',
    input: 'w-full rounded-xl border border-[#0D0D0D] bg-white px-4 py-2.5 text-xs text-[#0D0D0D] outline-none transition placeholder:text-[#9A9A9A] focus:ring-4 focus:ring-black/10 [color-scheme:light]',
    field:
      'w-full rounded-2xl border border-[#0D0D0D] bg-white px-4 py-3 text-sm font-medium text-[#0D0D0D] outline-none transition hover:bg-[#FAFAFA] focus:ring-4 focus:ring-black/10 [color-scheme:light]',
    inputDisabled:
      'w-full rounded-2xl border border-[#B8C0CC] bg-[#E8ECF1] py-3 pl-4 pr-10 text-sm font-semibold text-[#1E2A38] cursor-default select-none [color-scheme:light]',
    lock: 'text-[#586374]',
    box: 'rounded-2xl border border-[#0D0D0D] bg-white text-[#0D0D0D]',
    boxDisabled: 'rounded-2xl border border-[#B8C0CC] bg-[#E8ECF1] text-[#1E2A38]',
    sliderVars: { '--sl-fill': '#0D0D0D', '--sl-track': '#D3D8DF', '--sl-thumb': '#FFFFFF', '--sl-ring': 'rgba(0,0,0,.15)' },
    sksOn: 'border-[#0D0D0D] bg-[#0D0D0D] text-white',
    sksOff: 'border-[#0D0D0D]/35 bg-white text-[#0D0D0D] hover:border-[#0D0D0D]',
    tick: 'text-[#586374]',
    pop: 'border-[#0D0D0D] bg-white text-[#0D0D0D] shadow-2xl',
    popNav: 'hover:bg-[#EDEFF2]',
    popDay: 'hover:bg-[#EDEFF2]',
    popOn: 'bg-[#0D0D0D] text-white',
    popToday: 'ring-1 ring-[#0D0D0D]/60',
    popOff: 'text-[#0D0D0D]/25 cursor-not-allowed',
    popHead: 'text-[#586374]',
    btnUtama: 'inline-flex items-center justify-center gap-2 rounded-full bg-[#0D0D0D] px-6 py-3 text-sm font-bold text-white transition hover:bg-black disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D0D0D]',
    btnTepi: 'inline-flex items-center justify-center gap-2 rounded-full border border-[#0D0D0D] bg-white px-6 py-3 text-sm font-semibold text-[#0D0D0D] transition hover:bg-[#F0F0F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D0D0D]',
    pesan: 'text-xs font-bold text-[#0D0D0D]',
    kotakBentrok: 'rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900',
    listBentrok: 'mt-2 space-y-1 text-amber-800 text-xs',
    kartuTutup: 'rounded-3xl border border-[#0D0D0D] bg-white p-8',
    kartuOk: 'rounded-3xl border border-[#0D0D0D] bg-white p-8',
    dt: 'text-[#3A3A3A]',
  },
} as const;

/* ───────────── Date picker kustom (hari kerja saja) ───────────── */

function DatePicker({
  id,
  value,
  onChange,
  tema,
}: {
  id: string;
  value: string;
  onChange: (iso: string) => void;
  tema: TemaBooking;
}) {
  const T = TEMA_BOOKING[tema];
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const todayISO = toISO(new Date());
  const base = value ? new Date(`${value}T00:00:00`) : new Date();
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const now = new Date();
  const canPrev = view.y > now.getFullYear() || (view.y === now.getFullYear() && view.m > now.getMonth());
  const offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Senin di kolom pertama
  const jumlahHari = new Date(view.y, view.m + 1, 0).getDate();
  const sel = value ? new Date(`${value}T00:00:00`) : null;

  const geser = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  const label = sel
    ? `${HARI_DARI_INDEX[sel.getDay()]}, ${sel.getDate()} ${BULAN[sel.getMonth()]} ${sel.getFullYear()}`
    : 'Pilih tanggal';

  return (
    <div ref={wrapRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${T.field} flex cursor-pointer items-center justify-between text-left`}
      >
        <span className={sel ? '' : 'opacity-55'}>{label}</span>
        <CalendarDays size={16} className="shrink-0" />
      </button>

      {open && (
        <div role="dialog" aria-label="Pilih tanggal" className={`absolute left-0 top-full z-30 mt-2 w-[19rem] max-w-[calc(100vw-3rem)] rounded-2xl border p-3 ${T.pop}`}>
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => geser(-1)}
              disabled={!canPrev}
              aria-label="Bulan sebelumnya"
              className={`flex h-8 w-8 items-center justify-center rounded-full transition disabled:opacity-25 disabled:pointer-events-none cursor-pointer ${T.popNav}`}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-extrabold">
              {BULAN[view.m]} {view.y}
            </span>
            <button
              type="button"
              onClick={() => geser(1)}
              aria-label="Bulan berikutnya"
              className={`flex h-8 w-8 items-center justify-center rounded-full transition cursor-pointer ${T.popNav}`}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center">
            {HARI_PENDEK.map((h) => (
              <span key={h} className={`py-1 text-[10px] font-bold ${T.popHead}`}>
                {h}
              </span>
            ))}
            {Array.from({ length: offset }).map((_, i) => (
              <span key={`e${i}`} />
            ))}
            {Array.from({ length: jumlahHari }).map((_, i) => {
              const day = i + 1;
              const d = new Date(view.y, view.m, day);
              const iso = toISO(d);
              const kerja = HARI_KERJA.includes(HARI_DARI_INDEX[d.getDay()]);
              const off = iso < todayISO || !kerja;
              const on = iso === value;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={off}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={`mx-auto my-0.5 flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition ${
                    off ? T.popOff : on ? T.popOn : `cursor-pointer ${T.popDay}`
                  } ${!on && iso === todayISO ? T.popToday : ''}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── Tampilan kartu status pengajuan (setelah booking dikirim) ───────────── */

type TahapKey = 'menunggu' | 'disetujui' | 'berlangsung' | 'ditolak' | 'selesai' | 'hangus';
type StatusLangkah = 'done' | 'aktif' | 'tunggu' | 'gagal';
type IkonKomponen = React.ComponentType<{ size?: number; className?: string }>;

function tahapDari(status: string): TahapKey {
  if (status === 'berlangsung') return 'berlangsung';
  if (status === 'ditolak_dosen') return 'ditolak';
  if (status === 'selesai') return 'selesai';
  if (status === 'hangus') return 'hangus';
  if (status === 'disetujui_dosen' || status === 'dijadwalkan_admin' || status === 'menunggu_checkin') return 'disetujui';
  return 'menunggu';
}

const STATUS_TERAKHIR = ['ditolak_dosen', 'selesai', 'hangus'];

const TAHAP_INFO: Record<TahapKey, { judul: string; ikon: IkonKomponen; nada: string; denah: string; dot: string }> = {
  menunggu: { judul: 'Menunggu Persetujuan Dosen', ikon: Clock, nada: 'amber', denah: 'Dalam pengajuan', dot: 'bg-amber-300' },
  disetujui: { judul: 'Booking Disetujui Dosen', ikon: CheckCircle2, nada: 'emerald', denah: 'Dipesan', dot: 'bg-amber-400' },
  berlangsung: { judul: 'Ruangan Sedang Digunakan', ikon: Clock, nada: 'sky', denah: 'Sedang digunakan', dot: 'bg-rose-500' },
  ditolak: { judul: 'Booking Ditolak Dosen', ikon: XCircle, nada: 'rose', denah: 'Tidak aktif', dot: 'bg-slate-400' },
  selesai: { judul: 'Peminjaman Selesai', ikon: CheckCircle2, nada: 'slate', denah: 'Selesai', dot: 'bg-slate-400' },
  hangus: { judul: 'Pengajuan Kedaluwarsa', ikon: AlertTriangle, nada: 'slate', denah: 'Tidak aktif', dot: 'bg-slate-400' },
};

const LANGKAH_POLA: Record<TahapKey, StatusLangkah[]> = {
  menunggu: ['done', 'aktif', 'tunggu', 'tunggu'],
  disetujui: ['done', 'done', 'aktif', 'tunggu'],
  berlangsung: ['done', 'done', 'done', 'aktif'],
  ditolak: ['done', 'gagal', 'tunggu', 'tunggu'],
  selesai: ['done', 'done', 'done', 'done'],
  hangus: ['done', 'tunggu', 'tunggu', 'tunggu'],
};

const NADA_STATUS: Record<string, { badge: string; box: string }> = {
  amber: { badge: 'border-amber-500/40 bg-amber-500/10 text-amber-500', box: 'border-amber-500/30 bg-amber-500/10' },
  emerald: { badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500', box: 'border-emerald-500/30 bg-emerald-500/10' },
  sky: { badge: 'border-sky-500/40 bg-sky-500/10 text-sky-500', box: 'border-sky-500/30 bg-sky-500/10' },
  rose: { badge: 'border-rose-500/40 bg-rose-500/10 text-rose-500', box: 'border-rose-500/30 bg-rose-500/10' },
  slate: { badge: 'border-slate-400/40 bg-slate-400/10 text-slate-400', box: 'border-slate-400/30 bg-slate-400/10' },
};

const STATUS_TEMA = {
  gelap: {
    teks: 'text-[#E0E0E0]',
    muted: 'text-[#B3B3B3]',
    panel: 'rounded-2xl border border-[#4A4A4A] bg-[#363636]',
    garis: 'border-[#4A4A4A]',
    garisOff: 'bg-[#4A4A4A]',
    nomor: 'border-[#5A5A5A] text-[#9A9A9A]',
  },
  terang: {
    teks: 'text-[#0D0D0D]',
    muted: 'text-[#586374]',
    panel: 'rounded-2xl border border-[#D3D8DF] bg-[#F7F8FA]',
    garis: 'border-[#E3E7EC]',
    garisOff: 'bg-[#D3D8DF]',
    nomor: 'border-[#B8C0CC] text-[#586374]',
  },
} as const;

function BarisInfo({
  label,
  children,
  muted,
  last,
  garis,
}: {
  label: string;
  children: React.ReactNode;
  muted: string;
  last?: boolean;
  garis: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 py-2.5 text-xs ${last ? '' : `border-b ${garis}`}`}>
      <span className={`shrink-0 font-medium ${muted}`}>{label}</span>
      <span className="min-w-0 text-right font-semibold leading-snug">{children}</span>
    </div>
  );
}

export function BookingStep({
  ruangan,
  initialBooking,
  tema = 'gelap',
  onClose,
}: {
  ruangan: Ruangan;
  initialBooking?: any;
  tema?: TemaBooking;
  onClose?: () => void;
}) {
  const T = TEMA_BOOKING[tema];
  const terang = tema === 'terang';

  const { profile } = useMyProfile();
  const [relations, setRelations] = useState<UserRelation[]>([]);
  const [f, setF] = useState<FormBooking>(() => {
    if (initialBooking) {
      return {
        relation_id: initialBooking.relation_id || '',
        nama: initialBooking.nama_pemohon || '',
        nim: initialBooking.nim_pemohon || '',
        kelas: initialBooking.kelas || '',
        prodi: initialBooking.prodi || '',
        fakultas: initialBooking.fakultas || '',
        angkatan: initialBooking.angkatan || '',
        matkul: initialBooking.mata_kuliah || '',
        dosen: initialBooking.nama_dosen || '',
        dosen_id: initialBooking.dosen_id || 0,
        tanggal: initialBooking.tanggal || '',
        sks: initialBooking.sks || 2,
        mulai: initialBooking.jam_mulai ? initialBooking.jam_mulai.slice(0, 5) : '08:00',
        selesai: initialBooking.jam_selesai ? initialBooking.jam_selesai.slice(0, 5) : '09:40',
      };
    }
    return FORM_KOSONG;
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [terkirim, setTerkirim] = useState<boolean>(!!initialBooking);
  const [submittedData, setSubmittedData] = useState<any>(initialBooking || null);
  const [liveBooking, setLiveBooking] = useState<any>(initialBooking || null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingActiveBooking, setLoadingActiveBooking] = useState<boolean>(false);
  const [conflictCheck, setConflictCheck] = useState<{
    roomConflict: any;
    pjConflict: any;
    officialConflict: any;
    canBook: boolean;
  } | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);

  const bookingId = liveBooking?.id || submittedData?.id;
  const currentStatus = liveBooking?.status || submittedData?.status || 'menunggu_dosen';

  // 0. Cek apakah ruangan ini sudah memiliki peminjaman aktif yang diajukan
  useEffect(() => {
    let isMounted = true;
    async function loadActiveBooking() {
      try {
        setLoadingActiveBooking(true);
        const res = await fetch(`/api/bookings/active?room_kode=${encodeURIComponent(ruangan.kode)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.hasActiveBooking && json.booking && isMounted) {
            setSubmittedData(json.booking);
            setLiveBooking(json.booking);
            setTerkirim(true);
            setF({
              relation_id: json.booking.relation_id || '',
              nama: json.booking.nama_pemohon || '',
              nim: json.booking.nim_pemohon || '',
              kelas: json.booking.kelas || '',
              prodi: json.booking.prodi || '',
              fakultas: json.booking.fakultas || '',
              angkatan: json.booking.angkatan || '',
              matkul: json.booking.mata_kuliah || '',
              dosen: json.booking.nama_dosen || '',
              dosen_id: json.booking.dosen_id || 0,
              tanggal: json.booking.tanggal || '',
              sks: json.booking.sks || 2,
              mulai: json.booking.jam_mulai ? json.booking.jam_mulai.slice(0, 5) : '08:00',
              selesai: json.booking.jam_selesai ? json.booking.jam_selesai.slice(0, 5) : '09:40',
            });
          }
        }
      } catch (err) {
        console.warn('Gagal memuat booking aktif ruangan:', err);
      } finally {
        if (isMounted) setLoadingActiveBooking(false);
      }
    }

    loadActiveBooking();
    return () => {
      isMounted = false;
    };
  }, [ruangan.kode]);

  const fetchLiveStatus = useCallback(async (id: string, isManual = false) => {
    if (!id) return;
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/bookings/${id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setLiveBooking(json.data);
        }
      }
    } catch (e) {
      console.warn('Gagal memuat status live booking:', e);
    } finally {
      if (isManual) setRefreshing(false);
    }
  }, []);

  // Status diperbarui otomatis (realtime): polling 3 detik + segera saat tab kembali aktif.
  // Berhenti sendiri bila keputusan sudah final (ditolak / selesai / hangus).
  useEffect(() => {
    if (!terkirim || !bookingId) return;
    if (STATUS_TERAKHIR.includes(currentStatus)) return;

    fetchLiveStatus(bookingId);

    const interval = setInterval(() => {
      fetchLiveStatus(bookingId);
    }, 3000);

    const onFocus = () => fetchLiveStatus(bookingId);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [terkirim, bookingId, currentStatus, fetchLiveStatus]);

  const handleCheckin = async () => {
    if (!bookingId) return;
    setCheckingIn(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/checkin`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal melakukan check-in');
      }
      await fetchLiveStatus(bookingId);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('siruang:booking-updated'));
      }
    } catch (err: any) {
      alert(err.message || 'Gagal melakukan check-in ruangan');
    } finally {
      setCheckingIn(false);
    }
  };

  // 1. Muat profil akun saat mount
  useEffect(() => {
    loadMyProfile();
  }, []);

  // 2. Muat relasi mata kuliah milik PJ Kelas
  useEffect(() => {
    async function fetchRelations() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch('/api/user/relations', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            setRelations(json.data);
          }
        }
      } catch (e) {
        console.warn('Gagal memuat relasi pengguna:', e);
      }
    }
    fetchRelations();
  }, []);

  // 3. Sinkronkan profil & relasi ke form secara otomatis
  useEffect(() => {
    if (profile) {
      setF((prev) => ({
        ...prev,
        nama: profile.fullName || profile.username || prev.nama,
        nim: profile.identifier || prev.nim,
        kelas: profile.kelas || prev.kelas || 'STI-3A',
        prodi: profile.prodi || prev.prodi || 'STI',
        fakultas: profile.faculty || prev.fakultas || 'Fakultas Teknik',
        angkatan: profile.angkatan || prev.angkatan || '2024',
      }));
    }
  }, [profile]);

  // Sinkronkan relasi mata kuliah pertama (default)
  useEffect(() => {
    if (relations.length > 0 && !f.relation_id) {
      const first = relations[0];
      setF((prev) => ({
        ...prev,
        relation_id: first.id,
        matkul: first.mata_kuliah,
        dosen: first.nama_dosen,
        dosen_id: first.dosen_id,
        kelas: first.kelas || prev.kelas,
      }));
    }
  }, [relations, f.relation_id]);

  // 4. Hitung jam selesai otomatis saat mulai atau SKS berubah
  const handleMulaiChange = (newMulai: string) => {
    const end = addMinutesToTime(newMulai, f.sks * 50);
    setF((prev) => ({ ...prev, mulai: newMulai, selesai: end }));
  };

  const handleSksChange = (newSks: number) => {
    // Geser jam mulai ke belakang bila durasi baru melewati jam tutup
    const maxMulai = toMin(JAM_TUTUP) - newSks * 50;
    const mulaiBaru = fromMin(Math.max(toMin(JAM_BUKA), Math.min(toMin(f.mulai), maxMulai)));
    setF((prev) => ({
      ...prev,
      sks: newSks,
      mulai: mulaiBaru,
      selesai: addMinutesToTime(mulaiBaru, newSks * 50),
    }));
  };

  const handleRelationChange = (relId: string) => {
    const rel = relations.find((r) => r.id === relId);
    if (rel) {
      setF((prev) => ({
        ...prev,
        relation_id: rel.id,
        matkul: rel.mata_kuliah,
        dosen: rel.nama_dosen,
        dosen_id: rel.dosen_id,
        kelas: rel.kelas || prev.kelas,
      }));
    }
  };

  const hari = f.tanggal ? HARI_DARI_INDEX[new Date(`${f.tanggal}T00:00:00`).getDay()] : null;
  const hariOk = !hari || HARI_KERJA.includes(hari);
  const urut = f.mulai !== '' && f.selesai !== '' && f.mulai < f.selesai;
  const jamOk = urut && f.mulai >= JAM_BUKA && f.selesai <= JAM_TUTUP;

  // Batas slider jam mulai
  const sliderMin = toMin(JAM_BUKA);
  const sliderMax = Math.max(sliderMin, toMin(JAM_TUTUP) - f.sks * 50);
  const sliderVal = Math.min(Math.max(toMin(f.mulai || JAM_BUKA), sliderMin), sliderMax);
  const sliderPct = sliderMax > sliderMin ? ((sliderVal - sliderMin) / (sliderMax - sliderMin)) * 100 : 0;

  const bentrok = useMemo(
    () => (hari && urut ? ruangan.jadwal.filter((s) => s.hari === hari && f.mulai < s.selesai && f.selesai > s.mulai) : []),
    [hari, urut, f.mulai, f.selesai, ruangan.jadwal]
  );

  // Cek ketersediaan ruangan & bentrok jadwal PJ ke server realtime
  useEffect(() => {
    if (!f.tanggal || !f.mulai || !urut || !jamOk) {
      setConflictCheck(null);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setCheckingConflict(true);
      try {
        const res = await fetch(
          `/api/bookings/check-conflict?room_kode=${encodeURIComponent(
            ruangan.kode
          )}&tanggal=${f.tanggal}&jam_mulai=${f.mulai}&sks=${f.sks}`
        );
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            setConflictCheck(json);
          }
        }
      } catch (err) {
        console.warn('Gagal cek konflik:', err);
      } finally {
        if (isMounted) setCheckingConflict(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [f.tanggal, f.mulai, f.sks, urut, jamOk, ruangan.kode]);

  const hasHardConflict = Boolean(
    conflictCheck?.roomConflict?.hasConflict || conflictCheck?.pjConflict?.hasConflict
  );

  const nimOk = /^\d+$/.test(f.nim.trim());
  const formValid =
    f.nama.trim() !== '' &&
    nimOk &&
    f.matkul.trim() !== '' &&
    f.tanggal !== '' &&
    hariOk &&
    jamOk &&
    !hasHardConflict &&
    !checkingConflict &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        room_kode: ruangan.kode,
        relation_id: f.relation_id,
        mata_kuliah: f.matkul,
        kelas: f.kelas,
        prodi: f.prodi,
        fakultas: f.fakultas,
        angkatan: f.angkatan,
        dosen_id: f.dosen_id || 3, // Fallback demo dosen
        nama_dosen: f.dosen || 'Dosen Demo',
        tanggal: f.tanggal,
        sks: f.sks,
        jam_mulai: f.mulai,
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengajukan booking');
      }

      setSubmittedData(data.data);
      setLiveBooking(data.data);
      setTerkirim(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('siruang:booking-updated'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  if (!ruangan.bookable) {
    return (
      <div className={`mx-auto max-w-md text-center ${T.kartuTutup}`}>
        <h3 className={`text-xl font-extrabold ${T.judul}`}>Ruangan ini tidak bisa dibooking</h3>
        <p className={`mt-2 text-sm leading-relaxed ${T.dt}`}>{ruangan.keterangan || 'Ruangan non-bookable'}</p>
      </div>
    );
  }

  if (terkirim) {
    const S = STATUS_TEMA[tema];
    const tahap = tahapDari(currentStatus);
    const info = TAHAP_INFO[tahap];
    const nada = NADA_STATUS[info.nada];
    const Ikon = info.ikon;
    const steps = LANGKAH_POLA[tahap];
    const final = tahap === 'ditolak' || tahap === 'selesai' || tahap === 'hangus';
    const isCond = liveBooking?.is_conditional ?? submittedData?.is_conditional;

    const dosen = liveBooking?.nama_dosen || f.dosen || 'dosen pengampu';
    const jamCheckin = liveBooking?.checked_in_at
      ? new Date(liveBooking.checked_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      : null;

    const tgl10 = (f.tanggal || '').slice(0, 10);
    const tglObj = tgl10 ? new Date(`${tgl10}T00:00:00`) : null;
    const tglLabel =
      tglObj && !isNaN(tglObj.getTime())
        ? `${HARI_DARI_INDEX[tglObj.getDay()]}, ${tglObj.getDate()} ${BULAN[tglObj.getMonth()]} ${tglObj.getFullYear()}`
        : tgl10 || '-';

    const deskripsi: Record<TahapKey, string> = {
      menunggu: `Permohonan Anda sudah dikirim ke email ${dosen}. Halaman ini akan berubah otomatis begitu dosen memberi keputusan.`,
      disetujui: `${dosen} telah menyetujui peminjaman ini. Email check-in sudah dikirim ke PJ Kelas.`,
      berlangsung: 'Check-in sudah tercatat. Ruangan kini tampil sebagai sedang digunakan pada denah lantai.',
      ditolak: `Pengajuan peminjaman ini tidak disetujui oleh ${dosen}.`,
      selesai: 'Peminjaman ruangan ini telah selesai.',
      hangus: 'Pengajuan ini sudah melewati batas waktu dan tidak berlaku lagi.',
    };

    const langkah = [
      { judul: 'Pengajuan terkirim', ket: `Permohonan dikirim ke email ${dosen}.` },
      {
        judul: 'Persetujuan dosen',
        ket:
          steps[1] === 'done'
            ? `Disetujui oleh ${dosen}.`
            : steps[1] === 'gagal'
            ? `Ditolak oleh ${dosen}.`
            : `Menunggu ${dosen} menyetujui lewat email.`,
      },
      {
        judul: 'Check-in PJ Kelas',
        ket:
          steps[2] === 'done'
            ? jamCheckin
              ? `Check-in tercatat pukul ${jamCheckin}.`
              : 'Check-in sudah tercatat.'
            : steps[2] === 'aktif'
            ? 'Email check-in sudah dikirim ke PJ Kelas. Check-in dilakukan saat perkuliahan dimulai.'
            : 'Email check-in dikirim ke PJ Kelas setelah dosen menyetujui.',
      },
      {
        judul: 'Ruangan digunakan',
        ket:
          steps[3] === 'done'
            ? 'Ruangan telah digunakan sesuai jadwal.'
            : steps[3] === 'aktif'
            ? 'Ruangan sedang digunakan saat ini.'
            : 'Aktif setelah check-in dilakukan.',
      },
    ];

    // Kotak "langkah berikutnya" / catatan sesuai tahap
    let kotakJudul = '';
    let kotakIsi = '';
    if (tahap === 'menunggu') {
      kotakJudul = 'Langkah berikutnya';
      kotakIsi =
        'Dosen menerima email berisi tautan persetujuan satu klik. Setelah disetujui, email check-in otomatis dikirim ke PJ Kelas.';
    } else if (tahap === 'disetujui') {
      kotakJudul = 'Siap check-in';
      kotakIsi =
        'Lakukan check-in melalui menu Jadwal & Check-in di dashboard PJ Kelas saat perkuliahan dimulai.';
    } else if (tahap === 'berlangsung') {
      kotakJudul = 'Selama ruangan digunakan';
      kotakIsi = 'Harap menjaga ketertiban dan kebersihan fasilitas ruangan hingga waktu peminjaman berakhir.';
    } else if (tahap === 'ditolak') {
      kotakJudul = 'Catatan dari dosen';
      kotakIsi = `${liveBooking?.catatan_dosen || 'Dosen tidak menyertakan catatan.'} Anda dapat mengajukan peminjaman baru dengan waktu lain.`;
    } else if (tahap === 'hangus') {
      kotakJudul = 'Perlu ruangan lagi?';
      kotakIsi = 'Silakan ajukan peminjaman baru bila ruangan ini masih dibutuhkan.';
    }

    return (
      <div className={`sfd-in mx-auto max-w-lg ${T.kartuOk} border shadow-xl ${S.teks}`}>
        {/* Header status */}
        <div className="flex items-start gap-3.5">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${nada.badge}`}>
            <Ikon size={22} />
          </div>
          <div className="min-w-0">
            <h3 className={`text-xl font-black tracking-tight ${T.judul}`}>{info.judul}</h3>
            <p className={`mt-1 text-xs leading-relaxed ${S.muted}`}>{deskripsi[tahap]}</p>
          </div>
        </div>

        {/* Linimasa proses */}
        <div className={`mt-6 p-4 ${S.panel}`}>
          <p className={`mb-4 text-[11px] font-bold uppercase tracking-wider ${S.muted}`}>Proses Peminjaman</p>
          <ol>
            {langkah.map((l, i) => {
              const st = steps[i];
              const berikutDone = i < langkah.length - 1 && st === 'done' && steps[i + 1] !== 'tunggu';
              return (
                <li key={l.judul} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < langkah.length - 1 && (
                    <span
                      aria-hidden
                      className={`absolute left-[11px] top-7 bottom-0 w-px ${berikutDone ? 'bg-emerald-500/60' : S.garisOff}`}
                    />
                  )}
                  <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
                    {st === 'done' ? (
                      <CheckCircle2 size={22} className="text-emerald-500" />
                    ) : st === 'gagal' ? (
                      <XCircle size={22} className="text-rose-500" />
                    ) : st === 'aktif' ? (
                      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-sky-500">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
                      </span>
                    ) : (
                      <span
                        className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border text-[10px] font-bold ${S.nomor}`}
                      >
                        {i + 1}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p
                      className={`text-xs font-bold ${
                        st === 'tunggu' ? S.muted : st === 'gagal' ? 'text-rose-500' : ''
                      }`}
                    >
                      {l.judul}
                    </p>
                    <p className={`mt-0.5 text-[11px] leading-relaxed ${S.muted}`}>{l.ket}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Catatan sesuai tahap */}
        {kotakJudul && (
          <div className={`mt-3 rounded-2xl border p-4 ${nada.box}`}>
            <p className="text-xs font-bold">{kotakJudul}</p>
            <p className={`mt-1 text-[11px] leading-relaxed ${S.muted}`}>{kotakIsi}</p>
          </div>
        )}

        {/* Peringatan peminjaman bersyarat */}
        {isCond && tahap !== 'ditolak' && tahap !== 'hangus' && (
          <div className={`mt-3 flex items-start gap-2.5 rounded-2xl border p-4 ${NADA_STATUS.amber.box}`}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
            <div>
              <p className="text-xs font-bold">Peminjaman Bersyarat</p>
              <p className={`mt-1 text-[11px] leading-relaxed ${S.muted}`}>
                Slot waktu yang Anda pilih menumpangi jadwal resmi perkuliahan. Peminjaman ini berstatus bersyarat dan berlaku penuh setelah check-in dilakukan.
              </p>
            </div>
          </div>
        )}

        {/* Detail peminjaman */}
        <div className={`mt-3 px-4 py-1 ${S.panel}`}>
          <BarisInfo label="Ruangan" muted={S.muted} garis={S.garis}>
            {ruangan.kode} · {ruangan.nama}
          </BarisInfo>
          <BarisInfo label="Tanggal" muted={S.muted} garis={S.garis}>
            {tglLabel}
          </BarisInfo>
          <BarisInfo label="Waktu" muted={S.muted} garis={S.garis}>
            {f.mulai}–{f.selesai} WIB · {f.sks} SKS
          </BarisInfo>
          <BarisInfo label="Status di Denah" muted={S.muted} garis={S.garis} last>
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${info.dot}`} />
              {info.denah}
            </span>
          </BarisInfo>
        </div>

        <div className={`mt-3 px-4 py-1 ${S.panel}`}>
          <BarisInfo label="Pemohon (PJ Kelas)" muted={S.muted} garis={S.garis}>
            {f.nama} · {f.nim}
          </BarisInfo>
          <BarisInfo label="Kelas / Prodi" muted={S.muted} garis={S.garis}>
            {f.kelas} · {f.prodi} ({f.angkatan})
          </BarisInfo>
          <BarisInfo label="Mata Kuliah" muted={S.muted} garis={S.garis}>
            {f.matkul}
          </BarisInfo>
          <BarisInfo label="Dosen Pengampu" muted={S.muted} garis={S.garis} last>
            {f.dosen || dosen}
          </BarisInfo>
        </div>

        {/* Indikator pembaruan otomatis */}
        {!final && (
          <p className={`mt-4 flex items-center justify-center gap-2 text-[11px] ${S.muted}`}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Status diperbarui otomatis secara langsung
          </p>
        )}

        {/* Tombol aksi */}
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          {onClose ? (
            <button type="button" onClick={onClose} className={`${T.btnTepi} flex-1 cursor-pointer`}>
              <MapPin size={15} />
              <span>Lihat di Denah Lantai</span>
            </button>
          ) : (
            <Link href="/denah-sfd/lantai8" className={`${T.btnTepi} flex-1`}>
              <MapPin size={15} />
              <span>Lihat di Denah Lantai</span>
            </Link>
          )}

          {final && (
            <button
              type="button"
              onClick={() => {
                setF(FORM_KOSONG);
                setTerkirim(false);
                setLiveBooking(null);
                setSubmittedData(null);
              }}
              className={`${T.btnUtama} flex-1 cursor-pointer`}
            >
              Ajukan Peminjaman Baru
            </button>
          )}
        </div>
      </div>
    );
  }

  /* Field read-only yang terisi otomatis */
  const Terkunci = ({ label, value, title }: { label: string; value: string; title?: string }) => (
    <div>
      <label className={T.label}>{label}</label>
      <div className="relative">
        <input disabled value={value} className={T.inputDisabled} title={title || 'Terisi otomatis'} />
        <Lock size={13} className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${T.lock}`} />
      </div>
    </div>
  );

  return (
    <div className={`mx-auto ${terang ? 'max-w-[640px]' : 'max-w-3xl'}`}>
      <style>{SLIDER_CSS}</style>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className={`text-2xl font-extrabold tracking-tight ${T.judul}`}>Booking {ruangan.nama}</h3>
          <p className={`mt-1 text-xs ${T.sub}`}>
            Data identitas dan mata kuliah terisi otomatis dari profil akun PJ Kelas &amp; relasi terdaftar Anda.
          </p>
        </div>
     
      </div>

      {errorMsg && (
        <div className="mt-4 p-3 rounded-xl border border-rose-300 bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6">
        <div className={`grid sm:grid-cols-2 ${terang ? 'gap-x-5 gap-y-4' : 'gap-4'}`}>
          <Terkunci label="Nama Lengkap" value={f.nama} title="Terisi otomatis dari profil akun" />
          <Terkunci label="NIM" value={f.nim} title="Terisi otomatis dari profil akun" />
          <Terkunci label="Kelas" value={f.kelas} />
          <Terkunci label="Program Studi" value={f.prodi} />
          <Terkunci label="Fakultas" value={f.fakultas} />
          <Terkunci label="Angkatan" value={f.angkatan} />

          {/* MATA KULIAH (TERHUBUNG KE RELASI AKUN) */}
          {relations.length > 1 ? (
            <div>
              <label className={T.label}>Mata Kuliah</label>
              <div className="relative">
                <select
                  value={f.relation_id || ''}
                  onChange={(e) => handleRelationChange(e.target.value)}
                  className={`${T.field} cursor-pointer appearance-none pr-10 font-semibold`}
                >
                  {relations.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.mata_kuliah} ({r.kelas})
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          ) : (
            <Terkunci
              label="Mata Kuliah"
              value={f.matkul || 'Memuat relasi...'}
              title="Terisi otomatis dari relasi akun mata kuliah Anda"
            />
          )}

          <Terkunci
            label="Dosen Pengampu"
            value={f.dosen || 'Memuat dosen...'}
            title="Dosen pengampu ditentukan otomatis dari relasi mata kuliah"
          />

          {/* ── BAGIAN YANG PERLU DIISI USER (WAKTU & DURASI) ── */}

          {/* TANGGAL PEMINJAMAN */}
          <div>
            <label htmlFor="bk-tanggal" className={T.label}>
              Tanggal Peminjaman *
            </label>
            <DatePicker id="bk-tanggal" value={f.tanggal} onChange={(iso) => setF((p) => ({ ...p, tanggal: iso }))} tema={tema} />
          </div>

          {/* JUMLAH SKS */}
          <div>
            <span id="bk-sks-label" className={T.label}>
              Jumlah SKS *
            </span>
            <div role="radiogroup" aria-labelledby="bk-sks-label" className="grid grid-cols-4 gap-2">
              {SKS_OPSI.map((o) => {
                const aktif = f.sks === o.sks;
                return (
                  <button
                    key={o.sks}
                    type="button"
                    role="radio"
                    aria-checked={aktif}
                    onClick={() => handleSksChange(o.sks)}
                    className={`cursor-pointer rounded-2xl border px-1 py-2 text-center transition active:scale-[0.97] ${
                      aktif ? T.sksOn : T.sksOff
                    }`}
                  >
                    <span className="block text-sm font-extrabold leading-tight">{o.sks} SKS</span>
                    <span className="block text-[10px] font-medium leading-tight opacity-75">{o.jam} Jam</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* JAM MULAI (SLIDER) & JAM SELESAI */}
          <div className={`grid grid-cols-1 sm:col-span-2 sm:grid-cols-2 ${terang ? 'gap-x-5 gap-y-4' : 'gap-4'}`}>
            <div className="flex flex-col">
              <label htmlFor="bk-mulai" className={T.label}>
                Jam Mulai
              </label>
              <div className={`flex-1 px-4 pb-2.5 pt-3 ${T.box}`}>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold tabular-nums tracking-tight">{f.mulai}</span>
                  <span className={`text-[11px] font-bold ${T.tick}`}>WIB</span>
                </div>
                <input
                  id="bk-mulai"
                  type="range"
                  className="sr-range mt-2"
                  min={sliderMin}
                  max={sliderMax}
                  step={5}
                  value={sliderVal}
                  style={{ ...T.sliderVars, '--pct': `${sliderPct}%` } as unknown as React.CSSProperties}
                  onChange={(e) => handleMulaiChange(fromMin(Number(e.target.value)))}
                  aria-valuetext={`${f.mulai} WIB`}
                />
                <div className={`mt-0.5 flex justify-between text-[10px] font-semibold tabular-nums ${T.tick}`}>
                  <span>{JAM_BUKA}</span>
                  <span>{fromMin(sliderMax)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <label htmlFor="bk-selesai" className={T.label}>
                Jam Selesai
              </label>
              <div
                id="bk-selesai"
                title="Dihitung otomatis dari jam mulai dan SKS"
                className={`relative flex flex-1 cursor-default select-none items-center px-4 py-3 ${T.boxDisabled}`}
              >
                <div className="flex w-full items-baseline justify-between pr-7">
                  <span className="text-2xl font-extrabold tabular-nums tracking-tight">{f.selesai}</span>
                  <span className={`text-[11px] font-bold ${T.lock}`}>WIB</span>
                </div>
                <Clock size={14} className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${T.lock}`} />
              </div>
            </div>
          </div>
        </div>

        {/* PESAN & VALIDASI */}
        <div className="mt-4 space-y-2 text-xs" role="status">
          {f.tanggal && !hariOk && (
            <p className={T.pesan}>
              Tanggal jatuh pada hari {hari}. Peminjaman hanya diizinkan pada hari kerja (Senin - Jumat).
            </p>
          )}
          {f.mulai && f.selesai && !urut && (
            <p className={T.pesan}>Jam selesai harus lebih besar dari jam mulai.</p>
          )}
          {urut && !jamOk && (
            <p className={T.pesan}>
              Waktu operasional gedung adalah antara {JAM_BUKA} sampai {JAM_TUTUP}. Sesuaikan jam mulai atau SKS.
            </p>
          )}

          {/* Indikator Validasi Realtime */}
          {checkingConflict && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400 py-1">
              <RefreshCw size={12} className="animate-spin text-amber-500" />
              <span>Memeriksa ketersediaan ruangan &amp; jadwal peminjaman Anda...</span>
            </div>
          )}

          {/* 1. PERINGATAN DOUBLE BOOKING RUANGAN (LOCKED) */}
          {conflictCheck?.roomConflict?.hasConflict && (
            <div className="p-3.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 text-xs flex items-start gap-2.5 shadow-sm">
              <AlertTriangle size={18} className="shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold text-rose-800">⛔ Ruangan Tidak Dapat Dibooking (Double Booking Dicegah)</p>
                <p className="text-[11px] text-rose-700 leading-relaxed mt-0.5">
                  {conflictCheck.roomConflict.reason}
                </p>
                <p className="text-[10px] text-rose-600 font-semibold mt-1">
                  Sistem mengunci slot ini untuk mencegah peminjaman ganda. Silakan ganti jam atau pilih ruangan lain.
                </p>
              </div>
            </div>
          )}

          {/* 2. PERINGATAN BENTROK JADWAL PJ KELAS (LOCKED) */}
          {conflictCheck?.pjConflict?.hasConflict && (
            <div className="p-3.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 text-xs flex items-start gap-2.5 shadow-sm">
              <AlertTriangle size={18} className="shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold text-rose-800">⚠️ Bentrok Jadwal PJ Kelas (Batas 1 Ruangan per Waktu)</p>
                <p className="text-[11px] text-rose-700 leading-relaxed mt-0.5">
                  {conflictCheck.pjConflict.reason}
                </p>
                <p className="text-[10px] text-rose-600 font-semibold mt-1">
                  Anda tidak diperbolehkan mengajukan lebih dari satu peminjaman ruangan di waktu yang bersamaan.
                </p>
              </div>
            </div>
          )}

          {/* 3. JADWAL KULIAH RESMI (BOOKING BERSYARAT) */}
          {!hasHardConflict && (conflictCheck?.officialConflict?.hasConflict || bentrok.length > 0) && (
            <div className={T.kotakBentrok}>
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertTriangle size={15} />
                <span>Peringatan: Terdapat Jadwal Kuliah di Slot Ini</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {conflictCheck?.officialConflict?.reason || 'Slot waktu ini memiliki jadwal perkuliahan resmi.'} Pengajuan Anda tetap dapat diajukan sebagai <strong>Booking Bersyarat</strong> yang akan divalidasi langsung oleh dosen pengampu.
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!formValid}
          className={`${T.btnUtama} mt-6 w-full sm:w-auto cursor-pointer ${
            hasHardConflict ? 'opacity-60 !cursor-not-allowed bg-rose-700 hover:bg-rose-700 text-white' : ''
          }`}
        >
          {hasHardConflict
            ? 'Tidak Dapat Diajukan (Jadwal Bentrok / Sudah Dibooking)'
            : checkingConflict
            ? 'Memeriksa Ketersediaan...'
            : loading
            ? 'Mengajukan Booking...'
            : 'Ajukan Peminjaman Ruangan'}
        </button>
      </form>
    </div>
  );
}

export default function Booking() {
  const hariIni = useHariIni();
  const rooms = [...RUANGAN].sort((a, b) => Number(b.bookable) - Number(a.bookable));

  return (
    <div className="min-h-screen bg-[#2B2B2B] text-[#E0E0E0]" style={{ fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif" }}>
      <SfdStyle />
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
        <header className="rounded-3xl border border-[#565656] p-5 md:p-7">
          <Link
            href="/denah-sfd/lantai8"
            className="mb-4 inline-flex items-center gap-2 rounded-full text-sm font-bold text-[#B3B3B3] transition hover:text-[#E0E0E0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0E0E0]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Kembali ke denah lantai 8
          </Link>
          <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Booking ruangan · Gedung SFD · Lantai 8</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#B3B3B3]">
            Peminjaman Senin–Jumat, {JAM_BUKA.replace(':', '.')}–{JAM_TUTUP.replace(':', '.')}. Sebaiknya cek jadwal dan fasilitas dulu sebelum booking.
          </p>
        </header>

        <section className="space-y-4">
          <h3 className="text-lg font-bold">Pilih Ruangan untuk Booking</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r) => (
              <div key={r.kode} className="rounded-2xl border border-[#565656] p-5 bg-[#333]/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-black/40 text-[#E0E0E0]">{r.kode}</span>
                    <span className={`text-[10px] font-bold ${r.bookable ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {r.bookable ? 'Tersedia' : 'Non-bookable'}
                    </span>
                  </div>
                  <h4 className="mt-2 text-base font-bold text-white">{r.nama}</h4>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">{r.deskripsi}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#444] flex items-center justify-between text-xs text-slate-400">
                  <span>{statusHari(r, hariIni)}</span>
                  {r.bookable && (
                    <span className="font-bold text-[#E0E0E0] hover:underline cursor-pointer">Pilih &rarr;</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}