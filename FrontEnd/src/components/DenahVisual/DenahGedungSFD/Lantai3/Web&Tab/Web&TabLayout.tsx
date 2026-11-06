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
 *   DenahL8SFD/DenahL8SFD.tsx  gambar denah SVG
 *
 * Palette: #2B2B2B Charcoal Noir · #565656 Ironclad Grey · #848484 Urban Fog
 *          #B3B3B3 Moonlit Silver · #E0E0E0 Cloud Veil
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DenahL8SFD, boxFokus, useAnimatedBox, FULL_BOX, JALUR } from '../DenahL8SFD/DenahL8SFD';
import { NOMOR_LANTAI, LANTAI_LABEL, RUANGAN, cariRuangan, statusHari, useHariIni, JadwalStep, FOCUS, BTN_UTAMA, BTN_TEPI, FONT, SfdStyle } from '../Jadwal/Jadwal';
import type { Ruangan } from '../Jadwal/Jadwal';
import { FasilitasStep } from '../Fasilitas/Fasilitas';
import { BookingStep } from '../Booking/Booking';

// Export lama dipertahankan agar import dari file ini di tempat lain tetap jalan
export type { Hari, Jadwal } from '../Jadwal/Jadwal';
export { URUTAN_HARI, HARI_DARI_INDEX, HARI_KERJA, JAM_BUKA, JAM_TUTUP, NOMOR_LANTAI, FOTO_SEMENTARA, RUANGAN, cariRuangan, fotoRuangan, slotKosong, statusHari, useHariIni, SfdStyle } from '../Jadwal/Jadwal';
export { penjelasanFasilitas, PilihanRuangan } from '../Fasilitas/Fasilitas';
export { MODEL_3D, MODEL_RUANGAN, Slot3D, Ruang805SFD } from '../3D/3DRoom';
export { DenahL8SFD, DenahSvgSfd } from '../DenahL8SFD/DenahL8SFD';
export type { Ruangan } from '../Jadwal/Jadwal';

export function Legenda({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-xs md:text-sm font-bold text-white ${className}`}>
      <span className="flex items-center gap-2">
        <i className="h-4 w-4 shrink-0 rounded-[4px] bg-white shadow-xs" />
        Kelas Kosong
      </span>
      <span className="flex items-center gap-2">
        <i className="h-4 w-4 shrink-0 rounded-[4px] bg-[#FFEB3B] shadow-xs" />
        Kelas dalam Pengajuan
      </span>
      <span className="flex items-center gap-2">
        <i className="h-4 w-4 shrink-0 rounded-[4px] bg-[#E53935] shadow-xs" />
        Kelas Dipakai
      </span>
      <span className="flex items-center gap-2">
        <i className="h-4 w-4 shrink-0 rounded-[4px] bg-[#757575] shadow-xs" />
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
// 4. PETA INTERAKTIF — tanda hover + zoom saat klik
// ============================================================================
function KartuRuangan({ ruangan, onLanjut, onReset, compact }: { ruangan: Ruangan; onLanjut: () => void; onReset: () => void; compact: boolean }) {
  const hari = useHariIni();
  return (
    <div className={`sfd-in rounded-2xl border border-[#565656] bg-[#2B2B2B]/90 p-5 backdrop-blur ${compact ? 'mt-3' : 'absolute bottom-4 left-4 w-[min(320px,calc(100%-2rem))]'}`}>
      <p className="text-xs font-semibold text-[#B3B3B3]">{ruangan.kode}</p>
      <h3 className="mt-0.5 text-xl font-extrabold tracking-tight text-[#E0E0E0]">{ruangan.nama}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#B3B3B3]">{ruangan.deskripsi ?? ruangan.keterangan}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#E0E0E0]">
        {ruangan.kapasitas && <span className="rounded-full border border-[#565656] px-3 py-1">{ruangan.kapasitas} orang</span>}
        <span className="rounded-full border border-[#565656] px-3 py-1">{statusHari(ruangan, hari)}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onLanjut} className={`${BTN_UTAMA} px-5! py-2.5!`}>Cek jadwal ruangan</button>
        <button onClick={onReset} className={`${BTN_TEPI} px-5! py-2.5!`}>Denah penuh</button>
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
    <div>
      <div
        ref={wrap}
        className="relative overflow-hidden rounded-3xl border border-[#565656]"
        style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(86,86,86,.45), rgba(43,43,43,0) 70%)' }}
      >
        <DenahL8SFD
          selectedCode={selectedCode}
          onSelectRoom={onSelect}
          viewBox={vb}
          hoveredCode={hover?.kode ?? null}
          onHoverRoom={onHover}
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
          <KartuRuangan ruangan={selectedRoom} compact={false} onLanjut={() => onLanjut(selectedRoom.kode)} onReset={() => onSelect(null)} />
        )}
      </div>
      {compact && selectedRoom && (
        <KartuRuangan ruangan={selectedRoom} compact onLanjut={() => onLanjut(selectedRoom.kode)} onReset={() => onSelect(null)} />
      )}
    </div>
  );
}

// ============================================================================
// LOKASI — langkah ketiga di popup ruangan (denah + petunjuk arah)
// ============================================================================
const ARAH = (dx: number, dy: number) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'timur' : 'barat') : dy > 0 ? 'selatan' : 'utara');

/** Petunjuk teks dari jalur di denah: arah mata angin + belok kiri/kanan. */
function petunjuk(kode: string, nama: string): string[] {
  const p = JALUR[kode];
  if (!p || p.length < 4) return ['Lobby lift tepat di depan titik "You are here".'];
  const q = p.slice(1); // lewati jalan pendek dari pin ke kolom lobby
  const seg = q.slice(1).map((t, i) => [t[0] - q[i][0], t[1] - q[i][1]]);
  return seg.map((s, i) => {
    if (i === 0) return `Dari titik "You are here", jalan ke arah ${ARAH(s[0], s[1])} sampai lorong utama.`;
    const b = seg[i - 1];
    const belok = b[0] * s[1] - b[1] * s[0] > 0 ? 'kanan' : 'kiri';
    return i === seg.length - 1 ? `Belok ${belok}, lalu masuk lewat pintu ${nama}.` : `Belok ${belok}, susuri lorong ke arah ${ARAH(s[0], s[1])}.`;
  });
}

function LokasiStep({ ruangan }: { ruangan: Ruangan }) {
  const box = useAnimatedBox(useMemo(() => boxFokus(ruangan.kode, true), [ruangan.kode]), 1000, FULL_BOX);
  const langkah = petunjuk(ruangan.kode, ruangan.nama);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="overflow-hidden rounded-3xl border border-[#565656]" style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(86,86,86,.45), rgba(43,43,43,0) 70%)' }}>
        <DenahL8SFD selectedCode={ruangan.kode} onSelectRoom={() => {}} viewBox={box.map((n) => n.toFixed(1)).join(' ')} showRoute className="block h-auto w-full" />
      </div>
      <div>
        <h3 className="text-2xl font-extrabold tracking-tight">Ruangannya di mana?</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#B3B3B3]">Garis putus-putus mengikuti lorong dari lobby lift dan berbelok sampai pintu ruangan.</p>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="rounded-2xl border border-[#565656] p-4"><dt className="text-xs font-semibold text-[#B3B3B3]">Titik awal</dt><dd className="mt-0.5 font-bold">Lobby Lift (U-05)</dd></div>
          <div className="rounded-2xl border border-[#E0E0E0] p-4"><dt className="text-xs font-semibold text-[#B3B3B3]">Tujuan</dt><dd className="mt-0.5 font-bold">{ruangan.kode} · {ruangan.nama}</dd></div>
        </dl>
        <ol className="mt-5 space-y-3">
          {langkah.map((t, i) => (
            <li key={t} className="flex gap-3 text-sm leading-relaxed">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E0E0E0] text-xs font-bold text-[#2B2B2B]">{i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-sm leading-relaxed text-[#B3B3B3]">Kalau jadwal, fasilitas, dan lokasinya sudah sesuai, lanjut ke booking.</p>
      </div>
    </div>
  );
}

// ============================================================================
// 6. ALUR RUANGAN: Jadwal → Fasilitas → Lokasi → Booking
// ============================================================================
const LANGKAH = ['Denah', 'Jadwal', 'Fasilitas', 'Lokasi', 'Booking'];

export function RoomFlow({ ruangan, onClose }: { ruangan: Ruangan; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [maks, setMaks] = useState(1);
  const [buka, setBuka] = useState(false);
  const body = useRef<HTMLDivElement>(null);

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${ruangan.nama}, alur ruangan`}
      className={`fixed inset-0 z-50 flex flex-col bg-[#2B2B2B] text-[#E0E0E0] transition-[opacity,transform] duration-300 ease-out ${buka ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0'}`}
      style={{ fontFamily: FONT }}
    >
      <header className="flex items-center justify-between gap-4 border-b border-[#565656] px-5 py-4 md:px-10">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#B3B3B3]">{ruangan.kode} · {LANTAI_LABEL}</p>
          <h2 className="truncate text-lg font-extrabold tracking-tight md:text-xl">{ruangan.nama}</h2>
        </div>
        <button onClick={tutup} aria-label="Tutup" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#848484] transition hover:border-[#E0E0E0] ${FOCUS}`}>✕</button>
      </header>

      <nav aria-label="Langkah" className="border-b border-[#565656] px-5 py-3 md:px-10">
        <ol className="mx-auto flex max-w-3xl items-center">
          {LANGKAH.map((l, i) => {
            const selesai = i < step, aktif = i === step, bisa = i <= maks;
            return (
              <React.Fragment key={l}>
                <li>
                  <button onClick={() => bisa && ke(i)} disabled={!bisa} aria-current={aktif ? 'step' : undefined} className={`flex items-center gap-2 rounded-full py-1 pr-1 text-xs font-bold transition md:pr-3 ${FOCUS} ${aktif ? 'text-[#E0E0E0]' : bisa ? 'text-[#B3B3B3] hover:text-[#E0E0E0]' : 'text-[#848484]'}`}>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${aktif ? 'border-[#E0E0E0] bg-[#E0E0E0] text-[#2B2B2B]' : selesai ? 'border-[#B3B3B3] text-[#E0E0E0]' : 'border-[#565656]'}`}>{selesai ? '✓' : i + 1}</span>
                    <span className="hidden sm:inline">{l}</span>
                  </button>
                </li>
                {i < LANGKAH.length - 1 && <span className={`mx-1 h-px flex-1 ${i < step ? 'bg-[#B3B3B3]' : 'bg-[#565656]'}`} />}
              </React.Fragment>
            );
          })}
        </ol>
      </nav>

      <div ref={body} className="flex-1 overflow-y-auto px-5 py-8 md:px-10">
        <div key={step} className="sfd-in mx-auto max-w-6xl">
          {step === 1 && <JadwalStep ruangan={ruangan} />}
          {step === 2 && <FasilitasStep ruangan={ruangan} />}
          {step === 3 && <LokasiStep ruangan={ruangan} />}
          {step === 4 && <BookingStep ruangan={ruangan} />}
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-[#565656] px-5 py-4 md:px-10">
        <button onClick={() => ke(step - 1)} className={BTN_TEPI}>{step === 1 ? 'Kembali ke denah' : 'Kembali'}</button>
        {step < 4 && <button onClick={() => ke(step + 1)} disabled={step === 3 && !ruangan.bookable} className={BTN_UTAMA}>{step === 3 && !ruangan.bookable ? 'Tidak bisa dibooking' : lanjutLabel}</button>}
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
  const jumlah = RUANGAN.filter((r) => r.bookable).length;

  const fakta = [
    { v: `${jumlah} ruangan`, d: 'Lab, studio, dan ruang praktik yang bisa dibooking di lantai ini.' },
    { v: '08.00–17.00', d: 'Jam operasional Senin sampai Jumat. Sabtu dan Minggu tutup.' },
    { v: 'Lobby Lift', d: 'Titik "You are here" ada di lobby lift, tengah denah.' },
  ];

  return (
    <div className="min-h-screen bg-[#2B2B2B] text-[#E0E0E0] antialiased" style={{ fontFamily: FONT }}>
      <SfdStyle />

      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-[#565656]/60 bg-[#2B2B2B]/70 px-5 backdrop-blur-md md:px-10">
        <span className="text-xs font-semibold text-[#B3B3B3]">Gedung SFD</span>
        <span className="text-lg font-extrabold tracking-tight">SiRuang</span>
        <span className="text-xs font-semibold text-[#B3B3B3]">Lantai {NOMOR_LANTAI}</span>
      </header>

      <section id="peta" className="px-5 pb-20 pt-24 md:px-10 lg:px-16">
        <p className="inline-flex items-center gap-3 rounded-xl border border-[#565656] px-4 py-2.5 text-sm font-medium">
          <i className="flex h-5 w-5 items-center justify-center rounded-full border border-[#B3B3B3] text-[11px] not-italic">i</i>
          {compact ? 'Ketuk ruangan di denah untuk zoom' : 'Arahkan kursor ke ruangan, lalu klik untuk zoom'}
        </p>

        <div className="mt-8 grid items-center gap-8 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)_minmax(220px,270px)] lg:gap-10">
          <div>
            <h1 className="text-5xl font-extrabold uppercase leading-none tracking-tight lg:text-6xl">Lantai {NOMOR_LANTAI}</h1>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-[#B3B3B3]">
              Gedung SFD lantai 8 berisi laboratorium komputer, studio, dan ruang praktik. Cek jadwal dan fasilitasnya dulu, lihat lokasinya di denah, baru booking.
            </p>
          </div>

          <div>
            <PetaInteraktif selectedCode={selected} onSelect={setSelected} onLanjut={setFlow} compact={compact} />
            <Legenda className="mt-4" />
          </div>

          <div className="relative pl-8">
            {/* Garis vertikal kontinu rapi */}
            <div className="absolute left-2.5 top-2.5 bottom-2.5 w-[2px] bg-[#565656]" />

            <ul className="space-y-8">
              {fakta.map((x) => (
                <li key={x.v} className="relative">
                  {/* Bulatan konsentris: ring luar + dot dalam, pas di tengah garis */}
                  <span className="absolute -left-8 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#E0E0E0] bg-[#2B2B2B] shadow-xs">
                    <i className="h-2 w-2 rounded-full bg-[#E0E0E0]" />
                  </span>
                  <p className="text-xl font-extrabold leading-snug text-[#E0E0E0]">{x.v}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#B3B3B3]">{x.d}</p>
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

export default function WebTabLayoutSfd() {
  return <SfdPage />;
}
