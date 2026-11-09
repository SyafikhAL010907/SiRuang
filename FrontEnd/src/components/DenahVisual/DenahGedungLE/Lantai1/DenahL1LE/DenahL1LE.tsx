'use client';

/**
 * Denah Gedung Elektro (LE) - Lantai 1
 * File Khusus Komponen Denah Visual SVG (DenahL1LE)
 *
 * Karakter & API disamain dengan DenahL8SFD:
 *  - 2 TEMA: 'gelap' (default, halaman web) dan 'terang' (langkah Lokasi)
 *  - hover berbasis kedekatan kursor (onHoverRoom)
 *  - viewBox bisa dikontrol dari luar (animasi zoom ke ruangan) -> boxFokus + useAnimatedBox
 *  - jalur arah putus-putus dari "You are here" ke pintu ruangan (showRoute)
 *  - hanya ruangan yang bisa dibooking yang bisa diklik / di-hover
 *
 * Geometri denah LE (dinding, ruangan, pintu, tangga) TIDAK diubah.
 *
 * Cara pakai:
 *   <DenahL1LE tema="gelap"  ... />   // denah gelap (default)
 *   <DenahL1LE tema="terang" ... />   // denah terang
 */

import React, { useEffect, useRef, useState } from 'react';

// Ganti di sini kalau nomor lantai / nama gedung berubah
export const NOMOR_LANTAI = 1;
const NAMA_GEDUNG = 'Gedung Elektro';
const LANTAI_LABEL = `Lantai ${NOMOR_LANTAI} · ${NAMA_GEDUNG}`;

// Ruangan yang TIDAK bisa dibooking (selain ini semuanya bisa dibooking)
const NON_BOOKABLE = new Set(['RUANG_DOSEN']);

const GREEN = '#5cb82f'; // panah evakuasi
const RED = '#d93a35'; // APAR

// ============================================================================
// TEMA WARNA DENAH — ubah warna di sini saja
// ============================================================================
export type TemaDenah = 'gelap' | 'terang';

const TEMA = {
  gelap: {
    luarFill: 'none',
    luarStroke: '#565656',
    luarW: 2,
    labelLantai: '#848484',
    lantaiFill: 'rgba(43,43,43,0.45)',
    dinding: '#A8A8A8',
    pasifFill: 'rgba(86,86,86,0.3)',
    pasifStroke: '#7A7A7A',
    garis: '#A8A8A8',
    simbol: '#E0E0E0',
    aktifFill: 'rgba(224,224,224,0.92)',
    aktifStroke: '#E0E0E0',
    hoverFill: 'rgba(179,179,179,0.85)',
    hoverStroke: '#E0E0E0',
    bookFill: 'rgba(86,86,86,0.5)',
    bookStroke: '#B3B3B3',
    tidakFill: 'rgba(86,86,86,0.3)',
    tidakStroke: '#7A7A7A',
    teksAktif: '#2B2B2B',
    teksHover: '#2B2B2B',
    teksBook: '#E0E0E0',
    teksTidak: '#D0D0D0',
    teksPintuMasuk: '#B3B3B3',
    pintuCelah: '#2B2B2B',
    pintuDaun: '#B3B3B3',
    pintuBusur: '#A8A8A8',
    pinFill: '#E0E0E0',
    pinStroke: '#2B2B2B',
    pinBulat: '#2B2B2B',
    pinTeks: '#E0E0E0',
    pinGelombang: 'rgba(224,224,224,0.4)',
    rutePinggir: '#2B2B2B',
    ruteGaris: '#E0E0E0',
    ruteMarkerFill: '#E0E0E0',
    ruteMarkerStroke: '#2B2B2B',
    fokusRing: 'group-focus-visible:stroke-[#E0E0E0]',
  },
  terang: {
    luarFill: 'none',
    luarStroke: '#2B2B2B',
    luarW: 3,
    labelLantai: '#9A9A9A',
    lantaiFill: 'rgba(255,255,255,0.55)',
    dinding: '#3A3A3A',
    pasifFill: 'rgba(250,250,250,0.8)',
    pasifStroke: '#767676',
    garis: '#767676',
    simbol: '#1F1F1F',
    aktifFill: '#2B2B2B',
    aktifStroke: '#2B2B2B',
    hoverFill: '#E0E0E0',
    hoverStroke: '#2B2B2B',
    bookFill: 'rgba(250,250,250,0.88)',
    bookStroke: '#767676',
    tidakFill: 'rgba(250,250,250,0.88)',
    tidakStroke: '#767676',
    teksAktif: '#FFFFFF',
    teksHover: '#2B2B2B',
    teksBook: '#4A4A4A',
    teksTidak: '#4A4A4A',
    teksPintuMasuk: '#6A6A6A',
    pintuCelah: '#FAFAFA',
    pintuDaun: '#4A4A4A',
    pintuBusur: '#767676',
    pinFill: '#FFFFFF',
    pinStroke: '#2B2B2B',
    pinBulat: '#2B2B2B',
    pinTeks: '#FFFFFF',
    pinGelombang: 'rgba(43,43,43,0.35)',
    rutePinggir: '#FFFFFF',
    ruteGaris: '#2B2B2B',
    ruteMarkerFill: '#2B2B2B',
    ruteMarkerStroke: '#FFFFFF',
    fokusRing: 'group-focus-visible:stroke-[#2B2B2B]',
  },
} as const;

// ============================================================================
// ZOOM: kotak (x, y, w, h) tiap ruangan + helper viewBox
// ============================================================================
export type Box = [number, number, number, number];
export const FULL_BOX: Box = [0, 100, 1600, 640];
const ASPECT = FULL_BOX[2] / FULL_BOX[3];
export const PIN: [number, number] = [735, 459]; // titik "You are here" di koridor tengah (menggantikan ikon orang)
const HOVER_RADIUS = 38; // radius "mendekati" ruangan, dalam unit denah penuh

// Hanya ruangan yang bisa dibooking (yang bisa di-hover / diklik)
export const ROOM_BOX: Record<string, Box> = {
  R107: [10, 145, 415, 250],
  R102: [975, 145, 607, 250],
  LAB_BENGKEL_MEKANIK_LISTRIK: [25, 395, 332, 95],
  R106: [10, 490, 423, 235],
  LAB_GAMBAR_TEKNIK: [433, 490, 277, 235],
  LAB_PERANCANGAN: [710, 490, 268, 235],
  LAB_PNEUMATIK_HIDROLIK: [978, 490, 302, 235],
  R101: [1280, 490, 302, 235],
};

// ----------------------------------------------------------------------------
// JALUR ARAH: dari "You are here" (koridor tengah [735, 459]) susuri lorong
// ke timur atau barat, lalu belok ke pintu tiap ruangan.
// ----------------------------------------------------------------------------
const LORONG_Y = 459; // garis jalur di tengah koridor
const lewat = (x: number, yPintu: number): [number, number][] => [PIN, [x, LORONG_Y], [x, yPintu]];

export const JALUR: Record<string, [number, number][]> = {
  R107: lewat(392, 395), // pintu di sisi utara R.107
  R102: lewat(1416, 395), // pintu di sisi utara R.102
  LAB_BENGKEL_MEKANIK_LISTRIK: [PIN, [380, LORONG_Y]], // pintu di sisi barat, lurus dari koridor
  R106: lewat(395, 490), // pintu di sisi selatan R.106
  LAB_GAMBAR_TEKNIK: lewat(476, 490),
  LAB_PERANCANGAN: lewat(842, 490),
  LAB_PNEUMATIK_HIDROLIK: lewat(1016, 490),
  R101: lewat(1416, 490),
};

/** Ubah titik-titik jalur jadi path SVG dengan sudut belokan membulat. */
export function jalurRapi(titik: [number, number][], r = 20): string {
  const pts = titik.filter((q, i) => i === 0 || q[0] !== titik[i - 1][0] || q[1] !== titik[i - 1][1]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1], [x, y] = pts[i], [nx, ny] = pts[i + 1];
    const l1 = Math.hypot(x - px, y - py), l2 = Math.hypot(nx - x, ny - y);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    d += ` L${x + ((px - x) / l1) * rr} ${y + ((py - y) / l1) * rr} Q${x} ${y} ${x + ((nx - x) / l2) * rr} ${y + ((ny - y) / l2) * rr}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last[0]} ${last[1]}`;
}

/** viewBox yang membingkai satu ruangan (opsional + seluruh jalur dari "You are here"). */
export function boxFokus(kode: string | null, denganPin = false): Box {
  const b = kode ? ROOM_BOX[kode] : undefined;
  if (!b) return FULL_BOX;
  let x0 = b[0], y0 = b[1], x1 = b[0] + b[2], y1 = b[1] + b[3];
  if (denganPin) {
    x0 = Math.min(x0, PIN[0] - 25);
    x1 = Math.max(x1, PIN[0] + 25);
    y0 = Math.min(y0, PIN[1] - 50);
    y1 = Math.max(y1, PIN[1] + 8);
    for (const [px, py] of (kode && JALUR[kode]) || []) {
      x0 = Math.min(x0, px); x1 = Math.max(x1, px);
      y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
  }
  const pad = Math.min(0.2 * Math.max(x1 - x0, y1 - y0) + 16, 45);
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  let w = x1 - x0, h = y1 - y0;
  if (w / h < ASPECT) { const nw = h * ASPECT; x0 -= (nw - w) / 2; w = nw; }
  else { const nh = w / ASPECT; y0 -= (nh - h) / 2; h = nh; }
  if (w >= FULL_BOX[2]) {
    w = FULL_BOX[2] * 0.85;
    h = w / ASPECT;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    x0 = cx - w / 2;
    y0 = cy - h / 2;
  }
  x0 = Math.max(FULL_BOX[0] - 10, Math.min(FULL_BOX[0] + FULL_BOX[2] - w + 10, x0));
  y0 = Math.max(FULL_BOX[1] - 10, Math.min(FULL_BOX[1] + FULL_BOX[3] - h + 10, y0));
  return [x0, y0, w, h];
}

/** Menganimasikan perpindahan viewBox (ease-out). Menghormati reduced-motion. */
export function useAnimatedBox(target: Box, ms = 800, awal?: Box): Box {
  const [box, setBox] = useState<Box>(awal ?? target);
  const ref = useRef<Box>(awal ?? target);
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = reduce ? 1 : ms;
    const from = ref.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 4);
      const next = from.map((v, i) => v + (target[i] - v) * e) as Box;
      ref.current = next;
      setBox(next);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target[0], target[1], target[2], target[3], ms]);
  return box;
}

// ============================================================================
// ELEMEN DENAH
// ============================================================================

/**
 * Pintu: daun pintu (dari engsel) + busur ayunan, gaya sama dengan Door di SFD.
 * (hx, hy) = engsel di garis dinding, up = arah daun (-1 ke atas / 1 ke bawah),
 * dir = arah busur sepanjang dinding (-1 ke kiri / 1 ke kanan).
 */
export function Door({ hx, hy, up, dir, r = 50, tema = 'gelap' }: { hx: number; hy: number; up: -1 | 1; dir: -1 | 1; r?: number; tema?: TemaDenah }) {
  const T = TEMA[tema];
  const tip: [number, number] = [hx, hy + up * r];
  const end: [number, number] = [hx + dir * r, hy];
  const sweep = (tip[0] - hx) * (end[1] - hy) - (tip[1] - hy) * (end[0] - hx) > 0 ? 1 : 0;
  return (
    <g pointerEvents="none" fill="none">
      <line x1={hx} y1={hy} x2={tip[0]} y2={tip[1]} stroke={T.pintuDaun} strokeWidth={2.5} />
      <path d={`M${tip[0]} ${tip[1]} A${r} ${r} 0 0 ${sweep} ${end[0]} ${end[1]}`} stroke={T.pintuBusur} strokeWidth={1.5} />
    </g>
  );
}

export function YouAreHere({ tema = 'gelap' }: { tema?: TemaDenah }) {
  const T = TEMA[tema];
  return (
    <g transform={`translate(${PIN[0]} ${PIN[1]}) scale(1.5)`} pointerEvents="none">
      <circle cx={0} cy={0} r={6} fill={T.pinGelombang} className="motion-reduce:hidden">
        <animate attributeName="r" values="6;24" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
      </circle>
      <path
        d="M0 0 C -8 -10 -18 -17 -18 -30 A18 18 0 1 1 18 -30 C 18 -17 8 -10 0 0 Z"
        fill={T.pinFill}
        stroke={T.pinStroke}
        strokeWidth={1.5}
      />
      <circle cx={0} cy={-30} r={13} fill={T.pinBulat} />
      <text x={0} y={-32} textAnchor="middle" fontSize={6} fontWeight={700} fill={T.pinTeks}>
        YOU ARE
      </text>
      <text x={0} y={-25} textAnchor="middle" fontSize={6} fontWeight={700} fill={T.pinTeks}>
        HERE
      </text>
    </g>
  );
}

export interface RoomShapeProps {
  kode: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  lines: string[];
  fs?: number;
  selected?: string | null;
  hovered?: string | null;
  onSelect?: (kode: string) => void;
  onFocusRoom?: (kode: string | null) => void;
  children?: React.ReactNode;
  bookable?: boolean;
  tema?: TemaDenah;
}

export function RoomShape({
  kode,
  x,
  y,
  w,
  h,
  cx,
  cy,
  lines,
  fs = 22,
  selected,
  hovered,
  onSelect,
  onFocusRoom,
  children,
  bookable,
  tema = 'gelap',
}: RoomShapeProps) {
  const T = TEMA[tema];
  const isBookable = bookable !== undefined ? bookable : !NON_BOOKABLE.has(kode);
  const aktif = selected === kode;
  const hover = hovered === kode;
  const fokus = hovered ?? selected ?? null;
  const redup = fokus !== null && fokus !== kode && !aktif;

  const isi = aktif ? T.aktifFill : hover ? T.hoverFill : isBookable ? T.bookFill : T.tidakFill;
  const garis = aktif ? T.aktifStroke : hover ? T.hoverStroke : isBookable ? T.bookStroke : T.tidakStroke;
  const teks = aktif ? T.teksAktif : hover ? T.teksHover : isBookable ? T.teksBook : T.teksTidak;

  return (
    <g
      id={`ruangan-${kode}`}
      className={`group ${isBookable ? 'cursor-pointer' : 'cursor-default pointer-events-none'} outline-none transition-opacity duration-300 ${redup ? 'opacity-40' : ''}`}
      role={isBookable ? 'button' : undefined}
      tabIndex={isBookable ? 0 : -1}
      aria-label={lines.join(' ')}
      onClick={() => { if (isBookable) onSelect?.(kode); }}
      onFocus={() => { if (isBookable) onFocusRoom?.(kode); }}
      onBlur={() => onFocusRoom?.(null)}
      onKeyDown={(e) => {
        if (!isBookable) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(kode);
        }
      }}
    >
      <rect x={x} y={y} width={w} height={h} strokeWidth={2.5} fill={isi} stroke={garis} className={`transition-colors ${T.fokusRing}`} />
      {children}
      <g transform={`translate(${cx} ${cy})`} className="pointer-events-none select-none">
        {lines.map((t: string, i: number) => (
          <text
            key={t}
            x={0}
            y={(i - (lines.length - 1) / 2) * (fs + 6)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={fs}
            fontWeight={700}
            letterSpacing="0.04em"
            fill={teks}
            className="font-sans transition-colors"
          >
            {t}
          </text>
        ))}
      </g>
    </g>
  );
}

// ============================================================================
// KOMPONEN DENAH
// ============================================================================
export interface DenahL1LEProps {
  selectedCode: string | null;
  onSelectRoom: (kode: string) => void;
  className?: string;
  /** viewBox "x y w h" — dipakai untuk animasi zoom. Default: denah penuh. */
  viewBox?: string;
  /** Kode ruangan yang sedang ditunjuk kursor (dikontrol parent). */
  hoveredCode?: string | null;
  /** Dipanggil saat kursor mendekati / menjauhi ruangan. pos = koordinat layar. */
  onHoverRoom?: (kode: string | null, pos: { x: number; y: number } | null) => void;
  /** Gambar garis putus-putus dari "You are here" ke ruangan terpilih. */
  showRoute?: boolean;
  /** Tema warna denah: 'gelap' (default) atau 'terang'. */
  tema?: TemaDenah;
}

const PANAH_EVAKUASI: [number, number, number, number][] = [
  [392, 272, 392, 334], [670, 270, 670, 334], [1416, 272, 1416, 334], [282, 432, 336, 432],
  [403, 617, 403, 567], [476, 607, 476, 549], [842, 607, 842, 547], [1013, 605, 1013, 545], [1416, 607, 1416, 547],
  [413, 458, 470, 458], [487, 458, 556, 458], [568, 458, 637, 458], [650, 458, 716, 458],
  [1505, 452, 1464, 452], [1448, 452, 1382, 452], [1366, 452, 1300, 452], [1284, 452, 1218, 452],
  [1202, 452, 1156, 452], [1138, 452, 1072, 452], [1056, 452, 986, 452], [975, 452, 906, 452], [890, 452, 824, 452],
];

export function DenahL1LE({
  selectedCode = null,
  onSelectRoom = () => {},
  className,
  viewBox,
  hoveredCode = null,
  onHoverRoom,
  showRoute = false,
  tema = 'gelap',
}: DenahL1LEProps) {
  const T = TEMA[tema];
  const ref = useRef<SVGSVGElement>(null);
  const vb = viewBox ?? FULL_BOX.join(' ');
  const p = {
    selected: selectedCode,
    hovered: hoveredCode,
    onSelect: onSelectRoom,
    onFocusRoom: (k: string | null) => onHoverRoom?.(k, null),
    tema,
  };

  // Hover berbasis kedekatan: kursor cukup "mendekati" ruangan (bukan harus tepat di atasnya)
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onHoverRoom || e.pointerType === 'touch') return;
    const svg = ref.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const q = pt.matrixTransform(m.inverse());
    const radius = (HOVER_RADIUS * Number(vb.split(' ')[2])) / FULL_BOX[2];
    let best: string | null = null;
    let bd = radius + 0.001;
    for (const [k, [x, y, w, h]] of Object.entries(ROOM_BOX)) {
      const d = Math.hypot(Math.max(x - q.x, 0, q.x - x - w), Math.max(y - q.y, 0, q.y - y - h));
      if (d < bd) { bd = d; best = k; }
    }
    onHoverRoom(best, { x: e.clientX, y: e.clientY });
  };

  const jalur = showRoute && selectedCode ? JALUR[selectedCode] : undefined;

  return (
    <svg
      ref={ref}
      viewBox={vb}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      style={{ cursor: hoveredCode ? 'pointer' : 'default', touchAction: 'manipulation' }}
      onPointerMove={onMove}
      onPointerLeave={() => onHoverRoom?.(null, null)}
      onClick={() => { if (hoveredCode) onSelectRoom(hoveredCode); }}
    >
      <text x={1582} y={126} textAnchor="end" fontSize={22} fill={T.labelLantai} className="font-sans">
        {LANTAI_LABEL}
      </text>

      {/* ================= GARIS PEMBATAS LUAR DENAH ================= */}
      <rect
        x={-10}
        y={125}
        width={1610}
        height={615}
        rx={40}
        fill={T.luarFill}
        stroke={T.luarStroke}
        strokeWidth={T.luarW}
      />

      {/* ================= LANTAI (koridor + area tangga) ================= */}
      <path d="M357 395 H1582 V490 H357 Z" fill={T.lantaiFill} />
      <path d="M710 145 H975 V395 H710 Z" fill={T.pasifFill} />
      <path d="M10 395 H25 V490 H10 Z" fill={T.pasifFill} />

      {/* ================= RUANGAN ================= */}

      {/* ===== R107 · KULIAH ===== */}
      <RoomShape kode="R107" x={10} y={145} w={415} h={250} cx={176} cy={281} lines={['R. 107', 'KULIAH']} {...p} />

      {/* ===== RUANG DOSEN (tidak bisa dibooking) ===== */}
      <RoomShape kode="RUANG_DOSEN" x={425} y={145} w={285} h={250} cx={567} cy={235} lines={['RUANG', 'DOSEN']} {...p} />

      {/* ===== R102 · KULIAH (gabungan 2 kelas) ===== */}
      <RoomShape kode="R102" x={975} y={145} w={607} h={250} cx={1278} cy={270} lines={['R. 102', 'KULIAH']} {...p} />

      {/* ===== LAB BENGKEL MEKANIK DAN INSTALASI LISTRIK ===== */}
      <RoomShape kode="LAB_BENGKEL_MEKANIK_LISTRIK" x={25} y={395} w={332} h={95} cx={162} cy={443} lines={['LAB BENGKEL MEKANIK', 'DAN INSTALASI LISTRIK']} fs={15} {...p} />

      {/* ===== R106 · KULIAH ===== */}
      <RoomShape kode="R106" x={10} y={490} w={423} h={235} cx={187} cy={606} lines={['R. 106', 'KULIAH']} {...p} />

      {/* ===== LAB GAMBAR TEKNIK ===== */}
      <RoomShape kode="LAB_GAMBAR_TEKNIK" x={433} y={490} w={277} h={235} cx={557} cy={596} lines={['LAB GAMBAR', 'TEKNIK']} {...p} />

      {/* ===== LAB PERANCANGAN ===== */}
      <RoomShape kode="LAB_PERANCANGAN" x={710} y={490} w={268} h={235} cx={828} cy={599} lines={['LAB', 'PERANCANGAN']} {...p} />

      {/* ===== LAB PNEUMATIK HIDROLIK ===== */}
      <RoomShape kode="LAB_PNEUMATIK_HIDROLIK" x={978} y={490} w={302} h={235} cx={1129} cy={604} lines={['LAB PNEUMATIK', 'HIDROLIK']} {...p} />

      {/* ===== R101 · KULIAH ===== */}
      <RoomShape kode="R101" x={1280} y={490} w={302} h={235} cx={1500} cy={604} lines={['R. 101', 'KULIAH']} {...p} />

      {/* ================= DINDING & PINTU ================= */}
      <g className="pointer-events-none" fill="none" stroke={T.dinding}>
        {/* Dinding. Ujung kanan koridor (x=1582, y 395-490) SENGAJA TERBUKA = pintu masuk */}
        <path d="M10 145 H1582 M10 725 H1582 M10 145 V725 M1582 145 V395 M1582 490 V725 M10 395 H363 M421 395 H637 M690 395 H710 M975 395 H1390 M1442 395 H1582 M10 490 H365 M425 490 H450 M502 490 H816 M868 490 H990 M1042 490 H1390 M1442 490 H1582 M425 145 V395 M710 145 V395 M975 145 V395 M25 395 V490 M357 395 V405 M357 485 V490 M433 490 V725 M710 490 V725 M978 490 V725 M1280 490 V725" strokeWidth={5} />
        {/* Ambang pintu */}
        <path d="M363 395 H421 M637 395 H690 M1390 395 H1442 M365 490 H425 M450 490 H502 M816 490 H868 M990 490 H1042 M1390 490 H1442" stroke={T.garis} strokeWidth={1.5} opacity={0.55} />
        {/* Bukaan Lab Bengkel ke koridor */}
        <rect x={353} y={405} width={8} height={80} fill={T.pintuCelah} strokeWidth={2} />
      </g>

      {/* Daun pintu + busur ayun (gaya Door SFD) */}
      <Door hx={419} hy={395} up={-1} dir={-1} tema={tema} />
      <Door hx={687} hy={395} up={-1} dir={-1} tema={tema} />
      <Door hx={1439} hy={395} up={-1} dir={-1} tema={tema} />
      <Door hx={423} hy={490} up={1} dir={-1} tema={tema} />
      <Door hx={500} hy={490} up={1} dir={-1} tema={tema} />
      <Door hx={866} hy={490} up={1} dir={-1} tema={tema} />
      <Door hx={993} hy={490} up={1} dir={1} tema={tema} />
      <Door hx={1439} hy={490} up={1} dir={-1} tema={tema} />

      {/* ================= DETAIL (tangga, panah evakuasi, simbol) ================= */}
      <g className="pointer-events-none">
        <g fill="none" stroke={T.garis}>
          <path d="M713 208 A131 63 0 0 1 975 208" strokeWidth={2} />
          {Array.from({ length: 10 }, (_, i) => 195 + i * 15).map((y) => <line key={y} x1={713} y1={y} x2={829} y2={y} strokeWidth={2} />)}
          <rect x={829} y={200} width={26} height={135} strokeWidth={3} /> <line x1={842} y1={206} x2={842} y2={329} strokeWidth={1.5} />
          <path d="M855 290 L905 278 L912 262 L970 238" strokeWidth={2} /> <line x1={910} y1={214} x2={910} y2={236} strokeWidth={1.5} />
        </g>

        <text x={1472} y={420} textAnchor="middle" fontSize={14} fontWeight={600} fill={T.teksPintuMasuk} className="select-none font-sans">
          Pintu Masuk
        </text>

        {/* Panah evakuasi disembunyikan saat jalur arah tampil biar tidak ramai */}
        {!jalur && (
          <>
            <defs>
              <marker id="l1-arrow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">
                <path d="M0 0 L10 5 L0 10 z" fill={GREEN} />
              </marker>
            </defs>
            <g stroke={GREEN} strokeWidth={3} strokeLinecap="round" fill="none" markerEnd="url(#l1-arrow-head)">
              {PANAH_EVAKUASI.map(([x1, y1, x2, y2]) => (
                <line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
              ))}
              <path d="M771 360 V190 Q771 180 781 180 H900 Q910 180 910 190 V204" />
            </g>
          </>
        )}

        {/* APAR */}
        <g>
          <rect x={520} y={411} width={14} height={30} rx={5} fill={RED} />
          <path d="M524 411 V405 H533 V411" fill="none" stroke={T.simbol} strokeWidth={2.2} />
        </g>
      </g>

      {/* Jalur arah menyusuri koridor, berbelok ke pintu ruangan (langkah Lokasi) */}
      {jalur && (
        <g pointerEvents="none">
          <defs>
            <marker id="le-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto">
              <path d="M0 0 L10 5 L0 10 z" fill={T.ruteMarkerFill} stroke={T.ruteMarkerStroke} strokeWidth={1.2} strokeLinejoin="round" />
            </marker>
          </defs>
          <path d={jalurRapi(jalur)} fill="none" stroke={T.rutePinggir} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
          <path
            d={jalurRapi(jalur)}
            fill="none"
            className="sfd-dash"
            stroke={T.ruteGaris}
            strokeWidth={5.5}
            strokeDasharray="14 11"
            strokeLinecap="butt"
            strokeLinejoin="round"
            markerEnd="url(#le-arrow)"
          />
        </g>
      )}

      <YouAreHere tema={tema} />
    </svg>
  );
}

export default DenahL1LE;

// Re-export dengan nama lama agar backward-compatible
export { DenahL1LE as FloorPlanSvg };