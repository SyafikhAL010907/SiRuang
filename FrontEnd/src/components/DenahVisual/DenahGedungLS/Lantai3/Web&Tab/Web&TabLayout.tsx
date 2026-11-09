'use client';

/**
 * Denah Gedung LE - Lantai 3
 * WEB & TAB VIEW — tema Charcoal Noir
 *
 * Alur pengguna: Denah → Jadwal → Fasilitas → Lokasi (denah lagi) → Booking
 *
 * Isi file ini: peta interaktif + legenda + daftar ruangan, langkah Lokasi, popup RoomFlow, dan LePage.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DenahL3LE, boxFokus, useAnimatedBox } from '../DenahL3LE/DenahL3LE';
import {
  NOMOR_LANTAI,
  LANTAI_LABEL,
  RUANGAN,
  cariRuangan,
  statusHari,
  useHariIni,
  JadwalStep,
  FOCUS,
  BTN_UTAMA,
  BTN_TEPI,
  FONT,
  SfdStyle,
} from '../Jadwal/Jadwal';
import type { Ruangan } from '../Jadwal/Jadwal';
import { FasilitasStep, PilihanRuangan, penjelasanFasilitas } from '../Fasilitas/Fasilitas';
import { BookingStep } from '../Booking/Booking';
import { LokasiStep, Lokasi } from '../LokasiRuangan/Lokasi';
import { MODEL_3D, MODEL_RUANGAN, Slot3D } from '../3D/3DRoom';

// Re-exports untuk kompatibilitas import di berbagai halaman
export type { Hari, Jadwal } from '../Jadwal/Jadwal';
export {
  URUTAN_HARI,
  HARI_DARI_INDEX,
  HARI_KERJA,
  JAM_BUKA,
  JAM_TUTUP,
  NOMOR_LANTAI,
  FOTO_SEMENTARA,
  RUANGAN,
  cariRuangan,
  fotoRuangan,
  slotKosong,
  statusHari,
  useHariIni,
  SfdStyle,
} from '../Jadwal/Jadwal';
export { penjelasanFasilitas, PilihanRuangan } from '../Fasilitas/Fasilitas';
export { MODEL_3D, MODEL_RUANGAN, Slot3D, Ruang305LE } from '../3D/3DRoom';
export { DenahL3LE, FloorPlanSvg } from '../DenahL3LE/DenahL3LE';
export { LokasiStep, Lokasi } from '../LokasiRuangan/Lokasi';
export type { Ruangan } from '../Jadwal/Jadwal';

// ROOMS map untuk kompatibilitas dengan page `[ruang]`
export const ROOMS: Record<string, Ruangan> = RUANGAN.reduce((acc, r) => {
  acc[r.kode] = r;
  return acc;
}, {} as Record<string, Ruangan>);
export const BOOKABLE_ROOMS = RUANGAN.filter((r) => r.bookable);

const BG_GEDUNG = '/GedungLElektro/GedungLElektro.png';
const LOGO_SIRUANG = '/LogoSiRuangDatar.png';
const BG_BATIK = '/Batik.png';

// Tombol tema terang
const BTN_TERANG_UTAMA =
  'rounded-full bg-[#111111] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40';
const BTN_TERANG_TEPI =
  'rounded-full border border-[#2B2B2B] bg-white px-6 py-2.5 text-sm font-bold text-[#2B2B2B] transition hover:bg-[#E0E0E0]';

export function Legenda({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] md:text-xs font-bold text-white ${className}`}
    >
      <span className="flex items-center gap-2">
        <i className="h-3.5 w-3.5 shrink-0 rounded-full bg-white" />
        Kelas Kosong
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

export function DaftarRuangan({
  selected,
  onSelect,
  grid = false,
}: {
  selected: string | null;
  onSelect: (k: string) => void;
  grid?: boolean;
}) {
  return (
    <ul className={grid ? 'grid grid-cols-2 gap-2 lg:grid-cols-4' : 'flex flex-col gap-2'}>
      {RUANGAN.map((r) => (
        <li key={r.kode}>
          <button
            onClick={() => onSelect(r.kode)}
            className={`flex w-full items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${FOCUS} ${
              selected === r.kode
                ? 'border-[#E0E0E0] bg-[#E0E0E0] text-[#2B2B2B]'
                : 'border-[#565656] text-[#E0E0E0] hover:border-[#B3B3B3] hover:bg-[#565656]/40'
            }`}
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                r.bookable
                  ? selected === r.kode
                    ? 'bg-[#2B2B2B]'
                    : 'bg-[#E0E0E0]'
                  : 'border border-[#848484]'
              }`}
            />
            <span className="truncate">{r.nama}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// PETA INTERAKTIF — tanda hover + zoom saat klik
// ============================================================================
function KartuRuangan({
  ruangan,
  onLanjut,
  onReset,
  compact,
}: {
  ruangan: Ruangan;
  onLanjut: () => void;
  onReset: () => void;
  compact: boolean;
}) {
  const hari = useHariIni();
  return (
    <div
      className={`sfd-in rounded-2xl bg-white p-4 text-[#2B2B2B] shadow-xl ${
        compact ? 'mt-3' : 'absolute bottom-4 left-4 w-[min(260px,calc(100%-2rem))]'
      }`}
    >
      <p className="flex items-center gap-1 text-[10px] font-semibold text-[#565656]">
        <span aria-hidden>◂</span>
        {ruangan.kode}
      </p>
      <h3 className="mt-0.5 text-base font-extrabold tracking-tight">{ruangan.nama}</h3>
      <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-[#565656]">
        {ruangan.deskripsi ?? ruangan.keterangan}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[9px] font-semibold text-[#2B2B2B]">
        {ruangan.kapasitas && (
          <span className="rounded-full border border-[#B3B3B3] px-2 py-0.5">{ruangan.kapasitas} orang</span>
        )}
        <span className="rounded-full border border-[#B3B3B3] px-2 py-0.5">{statusHari(ruangan, hari)}</span>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        <button
          onClick={onLanjut}
          className={`flex w-full items-center justify-center gap-2 rounded-full bg-[#2B2B2B] px-4 py-2 text-[11px] font-bold text-white transition hover:bg-black ${FOCUS}`}
        >
          Cek jadwal ruangan <span aria-hidden>→</span>
        </button>
        <button
          onClick={onReset}
          className={`w-full rounded-full border border-[#2B2B2B] bg-white px-4 py-2 text-[11px] font-bold text-[#2B2B2B] transition hover:bg-[#E0E0E0] ${FOCUS}`}
        >
          Denah penuh
        </button>
      </div>
    </div>
  );
}

export function PetaInteraktif({
  selectedCode,
  onSelect,
  onLanjut,
  compact = false,
}: {
  selectedCode: string | null;
  onSelect: (kode: string | null) => void;
  onLanjut: (kode: string) => void;
  compact?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ kode: string | null; x: number; y: number; w: number } | null>(null);
  const box = useAnimatedBox(useMemo(() => boxFokus(selectedCode), [selectedCode]));
  const vb = box.map((n) => n.toFixed(1)).join(' ');
  const selectedRoom = selectedCode ? cariRuangan(selectedCode) : null;
  const hovered = hover?.kode ? cariRuangan(hover.kode) : null;

  const onHover = (kode: string | null, pos: { x: number; y: number } | null) => {
    const r = wrap.current?.getBoundingClientRect();
    setHover({ kode, x: pos && r ? pos.x - r.left : -1, y: pos && r ? pos.y - r.top : -1, w: r?.width ?? 0 });
  };

  return (
    <div className="relative">
      {!compact && selectedRoom && (
        <p className="absolute -top-6 right-6 text-[11px] font-medium text-white/60">
          {LANTAI_LABEL}
        </p>
      )}

      <div
        ref={wrap}
        className="relative overflow-hidden rounded-[2.5rem] border-2 border-white backdrop-blur-[2px]"
        style={{ background: 'rgba(20,20,20,.30)' }}
      >
        <DenahL3LE
          tema="gelap"
          selectedCode={selectedCode}
          onSelectRoom={onSelect}
          viewBox={vb}
          hoveredCode={hover?.kode ?? null}
          onHoverRoom={onHover}
          className="block h-auto w-full"
        />

        {!compact && hovered && hover && hover.x >= 0 && (
          <div
            className="pointer-events-none absolute z-10 rounded-2xl border border-[#848484] bg-[#2B2B2B]/90 px-5 py-3 backdrop-blur"
            style={{
              left: hover.x,
              top: hover.y,
              transform: `translate(${hover.x > hover.w - 280 ? 'calc(-100% - 18px)' : '18px'}, 18px)`,
            }}
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
            onLanjut={() => onLanjut(selectedRoom.kode)}
            onReset={() => onSelect(null)}
          />
        )}
      </div>

      {compact && selectedRoom && (
        <KartuRuangan
          ruangan={selectedRoom}
          compact
          onLanjut={() => onLanjut(selectedRoom.kode)}
          onReset={() => onSelect(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// ALUR RUANGAN: Jadwal → Fasilitas → Lokasi → Booking
// ============================================================================
const LANGKAH = ['Denah', 'Jadwal', 'Fasilitas', 'Lokasi', 'Booking'];
const STEP_JADWAL = 1;
const STEP_FASILITAS = 2;
const STEP_LOKASI = 3;
const STEP_BOOKING = 4;

export function RoomFlow({ ruangan, onClose }: { ruangan: Ruangan; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [maks, setMaks] = useState(1);
  const [buka, setBuka] = useState(false);
  const body = useRef<HTMLDivElement>(null);

  const terang =
    step === STEP_JADWAL || step === STEP_FASILITAS || step === STEP_LOKASI || step === STEP_BOOKING;

  const tutup = () => {
    setBuka(false);
    setTimeout(onClose, 300);
  };

  useEffect(() => {
    requestAnimationFrame(() => setBuka(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBuka(false);
        setTimeout(onClose, 300);
      }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

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
      className={`fixed inset-0 z-50 flex flex-col transition-[opacity,transform,background-color,color] duration-300 ease-out ${
        terang ? 'bg-white text-[#2B2B2B]' : 'bg-[#2B2B2B] text-[#E0E0E0]'
      } ${buka ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0'}`}
      style={{ fontFamily: FONT }}
    >
      <header
        className={`flex items-center justify-between gap-4 border-b px-5 py-4 md:px-10 ${garisBatas} ${
          terang ? 'bg-white' : ''
        }`}
      >
        <div className="min-w-0">
          <p className={`text-xs font-semibold ${terang ? 'text-[#565656]' : 'text-[#B3B3B3]'}`}>
            {ruangan.kode} · {LANTAI_LABEL}
          </p>
          <h2 className="truncate text-lg font-extrabold tracking-tight md:text-xl">{ruangan.nama}</h2>
        </div>
        <button
          onClick={tutup}
          aria-label="Tutup"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${FOCUS} ${
            terang ? 'border-[#2B2B2B] hover:bg-[#E0E0E0]' : 'border-[#848484] hover:border-[#E0E0E0]'
          }`}
        >
          ✕
        </button>
      </header>

      <nav aria-label="Langkah" className={`border-b px-5 py-3 md:px-10 ${garisBatas} ${terang ? 'bg-white' : ''}`}>
        <ol className="mx-auto flex max-w-3xl items-center">
          {LANGKAH.map((l, i) => {
            const selesai = i < step,
              aktif = i === step,
              bisa = i <= maks;
            const warnaTeks = aktif
              ? terang
                ? 'text-[#2B2B2B]'
                : 'text-[#E0E0E0]'
              : bisa
              ? terang
                ? 'text-[#565656] hover:text-[#2B2B2B]'
                : 'text-[#B3B3B3] hover:text-[#E0E0E0]'
              : terang
              ? 'text-[#B3B3B3]'
              : 'text-[#848484]';
            const warnaBulat = aktif
              ? terang
                ? 'border-[#0D0D0D] bg-[#0D0D0D] text-white'
                : 'border-[#E0E0E0] bg-[#E0E0E0] text-[#2B2B2B]'
              : selesai
              ? terang
                ? 'border-[#2B2B2B] text-[#2B2B2B]'
                : 'border-[#B3B3B3] text-[#E0E0E0]'
              : terang
              ? 'border-[#B3B3B3]'
              : 'border-[#565656]';
            const warnaGaris =
              i < step
                ? terang
                  ? 'bg-[#2B2B2B]'
                  : 'bg-[#B3B3B3]'
                : terang
                ? 'bg-[#D0D0D0]'
                : 'bg-[#565656]';
            return (
              <React.Fragment key={l}>
                <li>
                  <button
                    onClick={() => bisa && ke(i)}
                    disabled={!bisa}
                    aria-current={aktif ? 'step' : undefined}
                    className={`flex items-center gap-2 rounded-full py-1 pr-1 text-xs font-bold transition md:pr-3 ${FOCUS} ${warnaTeks}`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${warnaBulat}`}>
                      {selesai ? '✓' : i + 1}
                    </span>
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
        style={
          terang
            ? {
                backgroundColor: '#FFFFFF',
                backgroundImage: `url('${BG_BATIK}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }
            : undefined
        }
      >
        <div key={step} className="sfd-in mx-auto max-w-6xl">
          {step === 1 && <JadwalStep ruangan={ruangan} tema="terang" />}
          {step === 2 && <FasilitasStep ruangan={ruangan} tema="terang" />}
          {step === 3 && <LokasiStep ruangan={ruangan} />}
          {step === 4 && <BookingStep ruangan={ruangan} tema="terang" />}
        </div>
      </div>

      <footer
        className={`flex items-center justify-between gap-3 border-t px-5 py-4 md:px-10 ${garisBatas} ${
          terang ? 'bg-white' : ''
        }`}
      >
        <button onClick={() => ke(step - 1)} className={terang ? BTN_TERANG_TEPI : BTN_TEPI}>
          {step === 1 ? 'Kembali ke denah' : 'Kembali'}
        </button>
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

// ============================================================================
// HALAMAN UTAMA: LE PAGE
// ============================================================================
export function LePage({ compact = false }: { compact?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [flow, setFlow] = useState<string | null>(null);
  const jumlah = RUANGAN.filter((r) => r.bookable).length;

  const fakta = [
    { v: `${jumlah} ruangan`, d: 'Smart class interaktif, laboratorium multimedia grafis, dan ruang kuliah teori di lantai 3.' },
    { v: '08.00–17.00', d: 'Jam operasional perkuliahan & praktikum Senin sampai Jumat. Sabtu dan Minggu tutup.' },
    { v: 'Koridor Tengah', d: 'Titik "You are here" berada di koridor tengah lantai 3, di depan tangga utama & R.305.' },
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
        <span className="text-lg font-bold tracking-tight text-white md:text-2xl lg:text-[26px]">Gedung L Elektro</span>
        <span className="flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_SIRUANG}
            alt="SiRuang"
            className="h-11 w-auto select-none object-contain md:h-14 lg:h-16"
            draggable={false}
          />
        </span>
        <span className="text-right text-lg font-bold tracking-tight text-white md:text-2xl lg:text-[26px]">
          Lantai {NOMOR_LANTAI}
        </span>
      </header>

      <section id="peta" className="relative z-10 flex min-h-screen items-center px-5 pb-12 pt-32 md:px-10 md:pt-36 lg:px-14">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(230px,290px)_minmax(0,1fr)_minmax(210px,260px)] lg:gap-8">
          {/* Kiri: judul + deskripsi */}
          <div>
            <h1 className="text-5xl font-bold leading-none tracking-tight text-white lg:text-[56px]">
              Lantai {NOMOR_LANTAI}
            </h1>
            <p className="mt-6 max-w-[260px] text-sm font-medium leading-snug text-white md:text-base">
              Gedung L Elektro lantai 3 berisi smart class interaktif berlayar sentuh, laboratorium multimedia grafis, dan ruang kuliah teori berteknologi modern. Cek jadwal dan fasilitas, lihat rute lorong, lalu ajukan booking.
            </p>
            <Link
              href="/denah-le"
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

      {flow && <RoomFlow key={flow} ruangan={cariRuangan(flow)} onClose={() => setFlow(null)} />}
    </div>
  );
}

// Export default
export default function WebTabLayoutLe() {
  return <LePage />;
}
