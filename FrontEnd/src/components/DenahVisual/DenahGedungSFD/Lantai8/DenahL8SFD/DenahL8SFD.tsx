'use client';

/**
 * Denah Gedung SFD - Lantai 8
 * File Khusus Komponen Denah Visual SVG (DenahL8SFD)
 *
 * Geometri denah TIDAK diubah. Yang berubah hanya:
 *  - warna (palette Charcoal Noir)
 *  - hover berbasis kedekatan kursor (onHoverRoom)
 *  - viewBox bisa dikontrol dari luar (untuk animasi zoom ke ruangan)
 *  - 2 TEMA: 'gelap' (default, dipakai di halaman web) dan 'terang' (dipakai di langkah Lokasi)
 *
 * Cara pakai di halaman lain:
 *   <DenahL8SFD tema="gelap"  ... />   // denah hitam gelap (default)
 *   <DenahL8SFD tema="terang" ... />   // denah putih/terang
 *
 * Palette: #2B2B2B Charcoal Noir · #565656 Ironclad Grey · #848484 Urban Fog
 *          #B3B3B3 Moonlit Silver · #E0E0E0 Cloud Veil
 */

import React, { useEffect, useRef, useState } from 'react';

// Ganti di sini kalau nomor lantai / nama tower berubah
export const NOMOR_LANTAI = 8;
const LANTAI_LABEL = `Lantai ${NOMOR_LANTAI} · Tower A`;
const LABEL_VERTICAL = true;

// Ruangan yang dapat dibooking di Lantai 8 (hanya 3 ruangan aktif)
const BOOKABLE_ROOMS = new Set([
  'R.801',
  'R.802',
  'R.805',
]);

// ============================================================================
// TEMA WARNA DENAH — ubah warna di sini saja
// ============================================================================
export type TemaDenah = 'gelap' | 'terang';

const TEMA = {
  gelap: {
    luarFill: 'none',
    luarStroke: '#565656',
    luarW: 2,
    badanFill: 'rgba(43,43,43,0.45)',
    badanStroke: '#A8A8A8',
    labelLantai: '#848484',
    atapFill: 'rgba(132,132,132,0.5)',
    atapStroke: '#B3B3B3',
    atapKiriFill: 'rgba(179,179,179,0.3)',
    atapKiriStroke: '#848484',
    batangHijau: null as string | null,
    barFill: 'rgba(132,132,132,0.5)',
    barStroke: '#B3B3B3',
    pasifFill: 'rgba(86,86,86,0.3)',
    pasifStroke: '#7A7A7A',
    areaFill: 'rgba(43,43,43,0.45)',
    areaStroke: '#7A7A7A',
    garis: '#A8A8A8',
    shaftFill: 'rgba(86,86,86,0.4)',
    shaftStroke: '#A8A8A8',
    shaftW: 2,
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
    badanFill: 'rgba(255,255,255,0.55)',
    badanStroke: '#5E5E5E',
    labelLantai: '#9A9A9A',
    atapFill: '#BBF0C6',
    atapStroke: '#8FD6A2',
    atapKiriFill: '#BBF0C6',
    atapKiriStroke: '#8FD6A2',
    batangHijau: '#5FC37D',
    barFill: '#8A8A8A',
    barStroke: '#7A7A7A',
    pasifFill: 'rgba(250,250,250,0.8)',
    pasifStroke: '#767676',
    areaFill: 'rgba(250,250,250,0.8)',
    areaStroke: '#767676',
    garis: '#767676',
    shaftFill: 'rgba(242,242,242,0.85)',
    shaftStroke: '#767676',
    shaftW: 2.5,
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
    pintuCelah: '#FAFAFA',
    pintuDaun: '#4A4A4A',
    pintuBusur: '#767676',
    pinFill: '#2E2E2E',
    pinStroke: '#FFFFFF',
    pinBulat: '#2E2E2E',
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
export const FULL_BOX: Box = [100, 55, 1050, 635];
const ASPECT = FULL_BOX[2] / FULL_BOX[3];
export const PIN: [number, number] = [432, 462]; // titik "You are here"

export const ROOM_BOX: Record<string, Box> = {
  'R.801': [193, 160, 172, 160],
  'R.802': [365, 160, 90, 202],
  'R.805': [700, 135, 165, 220],
};

// ----------------------------------------------------------------------------
// JALUR ARAH: dari "You are here" menyusuri lorong sampai pintu tiap ruangan.
// Lorong utama membentang horizontal di y=390 (antara deretan ruang atas & bawah).
// Titik-titik di bawah hanya lurus horizontal/vertikal; belokannya dibulatkan
// oleh jalurRapi(). Kalau denah berubah, cukup sesuaikan angka di sini.
// ----------------------------------------------------------------------------
const LORONG_Y = 390; // garis tengah lorong utama
const LOBBY_X = 458; // kolom lobby lift
const DASAR: [number, number][] = [[432, 462], [LOBBY_X, 462], [LOBBY_X, LORONG_Y]];
const lewat = (x: number, yPintu: number): [number, number][] => [...DASAR, [x, LORONG_Y], [x, yPintu]];

export const JALUR: Record<string, [number, number][]> = {
  'R.801': lewat(330, 320), // pintu di sisi bawah R.801
  'R.802': lewat(410, 362),
  'R.803': lewat(528, 362),
  'R.803A': lewat(558, 362),
  'R.804': lewat(640, 362),
  'R.805': lewat(848, 355),
  'R.806': lewat(945, 345),
  'R.807': lewat(948, 412), // pintu di sisi atas R.807
  'R.808': lewat(850, 420),
  'U-01': lewat(745, 420),
  'U-02': lewat(517, 430),
  'U-03': lewat(589, 428),
  'U-04': lewat(671, 428),
  'U-06': lewat(400, 430),
  'U-07': lewat(350, 432),
  'U-05': [[432, 462], [LOBBY_X, 462], [LOBBY_X, 487]],
};

/** Ubah titik-titik jalur jadi path SVG dengan sudut belokan membulat. */
export function jalurRapi(titik: [number, number][], r = 14): string {
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
  const pad = 0.3 * Math.max(x1 - x0, y1 - y0) + 16;
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  let w = x1 - x0, h = y1 - y0;
  if (w / h < ASPECT) { const nw = h * ASPECT; x0 -= (nw - w) / 2; w = nw; }
  else { const nh = w / ASPECT; y0 -= (nh - h) / 2; h = nh; }
  if (w >= FULL_BOX[2]) return FULL_BOX;
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
export function Shaft({ x, y, w, h, tema = 'gelap' }: { x: number; y: number; w: number; h: number; tema?: TemaDenah }) {
  const T = TEMA[tema];
  return (
    <g stroke={T.shaftStroke} strokeWidth={T.shaftW} pointerEvents="none">
      <rect x={x} y={y} width={w} height={h} fill={T.shaftFill} />
      <line x1={x} y1={y} x2={x + w} y2={y + h} />
      <line x1={x + w} y1={y} x2={x} y2={y + h} />
    </g>
  );
}

export function Door({ x, y, r = 14, rot = 0, tema = 'gelap' }: { x: number; y: number; r?: number; rot?: number; tema?: TemaDenah }) {
  const T = TEMA[tema];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} pointerEvents="none">
      <line x1={0} y1={0} x2={r} y2={0} stroke={T.pintuCelah} strokeWidth={4} />
      <line x1={0} y1={0} x2={0} y2={-r} stroke={T.pintuDaun} strokeWidth={2} />
      <path d={`M0 ${-r} A${r} ${r} 0 0 1 ${r} 0`} fill="none" stroke={T.pintuBusur} strokeWidth={1.5} />
    </g>
  );
}

export function YouAreHere({ tema = 'gelap' }: { tema?: TemaDenah }) {
  const T = TEMA[tema];
  return (
    <g transform="translate(432 462)" pointerEvents="none">
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
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  cx: number;
  cy: number;
  lines: string[];
  fs?: number;
  selected?: string | null;
  hovered?: string | null;
  onSelect?: (kode: string) => void;
  onFocusRoom?: (kode: string | null) => void;
  children?: React.ReactNode;
  points?: string;
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
  fs = 14,
  selected,
  hovered,
  onSelect,
  onFocusRoom,
  children,
  points,
  bookable,
  tema = 'gelap',
}: RoomShapeProps) {
  const T = TEMA[tema];
  const isBookable = bookable !== undefined ? bookable : BOOKABLE_ROOMS.has(kode);
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
      {points ? (
        <polygon points={points} strokeWidth={2.5} fill={isi} stroke={garis} className={`transition-colors ${T.fokusRing}`} />
      ) : (
        <rect x={x} y={y} width={w} height={h} strokeWidth={2.5} fill={isi} stroke={garis} className={`transition-colors ${T.fokusRing}`} />
      )}
      {children}
      <g transform={`translate(${cx} ${cy}) rotate(${LABEL_VERTICAL ? 90 : 0})`} className="pointer-events-none select-none">
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

export interface DenahL8SFDProps {
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

export function DenahL8SFD({
  selectedCode = null,
  onSelectRoom = () => {},
  className,
  viewBox,
  hoveredCode = null,
  onHoverRoom,
  showRoute = false,
  tema = 'gelap',
}: DenahL8SFDProps) {
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

  // Hover berbasis kedekatan: kursor cukup "mendekati" ruangan (radius ~26 unit denah)
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onHoverRoom || e.pointerType === 'touch') return;
    const svg = ref.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const q = pt.matrixTransform(m.inverse());
    const radius = (26 * Number(vb.split(' ')[2])) / FULL_BOX[2];
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
      <text x={1130} y={72} textAnchor="end" fontSize={15} fill={T.labelLantai} className="font-sans">
        {LANTAI_LABEL}
      </text>
      <rect x={120} y={85} width={1010} height={585} rx={80} fill={T.luarFill} stroke={T.luarStroke} strokeWidth={T.luarW} />
      <rect x={165} y={125} width={900} height={510} fill={T.badanFill} stroke={T.badanStroke} strokeWidth={4.5} />
      <polygon
        points="370,98 535,122 697,96 940,124 940,132 370,132"
        fill={T.atapFill}
        stroke={T.atapStroke}
        strokeWidth={1.5}
      />
      <rect x={165} y={118} width={185} height={16} fill={T.atapKiriFill} stroke={T.atapKiriStroke} strokeWidth={1} />
      {T.batangHijau && <rect x={165} y={125} width={775} height={9} fill={T.batangHijau} pointerEvents="none" />}
      <rect x={1045} y={425} width={22} height={185} fill={T.barFill} stroke={T.barStroke} strokeWidth={1} />
      <rect x={725} y={600} width={340} height={22} fill={T.barFill} stroke={T.barStroke} strokeWidth={1} />

      {/* ===== R.801 · LAB KELAS MAPPI ===== */}
      <RoomShape kode="R.801" x={193} y={160} w={172} h={160} cx={310} cy={240} lines={['R.801', 'LAB KELAS MAPPI']} fs={13} {...p}>
        <rect x={193} y={228} width={62} height={90} fill="none" stroke={T.garis} strokeWidth={2} />
      </RoomShape>

      {/* ===== R.802 · LAB MULTIMEDIA (pecahan Meeting Room) ===== */}
      <RoomShape kode="R.802" x={365} y={160} w={90} h={202} cx={410} cy={261} lines={['R.802', 'LAB MULTIMEDIA']} fs={13} {...p} />

      {/* ===== R.803 · LAB MICROTEACHING (pecahan Meeting Room, persegi lurus) ===== */}
      <RoomShape kode="R.803" x={455} y={160} w={100} h={202} cx={505} cy={261} lines={['R.803', 'LAB MICROTEACHING']} fs={13} {...p}>
        <line x1={525} y1={160} x2={525} y2={185} stroke={T.garis} strokeWidth={2} />
        <line x1={545} y1={160} x2={545} y2={185} stroke={T.garis} strokeWidth={2} />
      </RoomShape>

      {/* ===== R.803A · RUANG OPERATOR MICROTEACHING ===== */}
      <RoomShape kode="R.803A" x={555} y={160} w={45} h={202} cx={578} cy={261} lines={['OPERATOR', 'MICROTEACHING']} fs={9} {...p} />

      {/* ===== R.804 · 3D PRINTING & DESAIN (pecahan Meeting Room) ===== */}
      <RoomShape kode="R.804" x={600} y={160} w={100} h={202} cx={650} cy={261} lines={['R.804', '3D PRINTING', '& DESAIN']} fs={13} {...p} />

      {/* ===== R.805 · LAB KOMPUTER ===== */}
      <RoomShape kode="R.805" x={700} y={135} w={165} h={220} cx={790} cy={235} lines={['R.805', 'LAB KOMPUTER']} fs={15} {...p}>
        <rect x={702} y={293} width={38} height={60} fill="none" stroke={tema === 'terang' && selectedCode === 'R.805' ? '#B3B3B3' : T.garis} strokeWidth={2} />
      </RoomShape>

      {/* ===== R.806 · STUDIO GAMBAR TEKNIK ===== */}
      <RoomShape kode="R.806" x={865} y={135} w={90} h={210} cx={910} cy={225} lines={['R.806', 'STUDIO GAMBAR', 'TEKNIK']} fs={12} {...p} />
      <g pointerEvents="none">
        <rect x={955} y={135} width={85} height={210} fill={T.pasifFill} stroke={T.pasifStroke} strokeWidth={2.5} />
        <rect x={968} y={285} width={22} height={52} fill="none" stroke={T.garis} strokeWidth={2} />
      </g>
      <g pointerEvents="none">
        <rect x={190} y={322} width={80} height={112} fill={T.pasifFill} stroke={T.pasifStroke} strokeWidth={2.5} />
      </g>
      <Shaft x={222} y={352} w={48} h={48} tema={tema} />
      <g pointerEvents="none">
        <rect x={195} y={437} width={65} height={178} fill={T.pasifFill} stroke={T.pasifStroke} strokeWidth={2.5} />
        <rect x={262} y={437} width={68} height={178} fill={T.pasifFill} stroke={T.pasifStroke} strokeWidth={2.5} />
        <rect x={270} y={505} width={42} height={8} fill="none" stroke={T.garis} strokeWidth={2} />
        <rect x={290} y={505} width={8} height={40} fill="none" stroke={T.garis} strokeWidth={2} />
        <rect x={268} y={545} width={46} height={50} fill="none" stroke={T.garis} strokeWidth={2} />
      </g>

      <RoomShape kode="U-07" x={330} y={432} w={40} h={185} cx={351} cy={525} lines={['ELECTRICAL PANEL ROOM']} fs={10} {...p} />
      <RoomShape kode="U-06" x={372} y={430} w={55} h={58} cx={400} cy={459} lines={['ELECTRONICA', 'PANEL ROOM']} fs={8} {...p} />
      <Shaft x={372} y={488} w={53} h={128} tema={tema} />
      <RoomShape kode="U-05" x={430} y={487} w={57} h={133} cx={458} cy={555} lines={['LOBBY LIFT']} fs={13} {...p} />
      <RoomShape kode="U-02" x={487} y={430} w={60} h={115} cx={517} cy={490} lines={['PANTRY']} fs={13} {...p} />
      <Shaft x={487} y={547} w={68} h={70} tema={tema} />

      <g pointerEvents="none">
        <rect x={548} y={428} width={164} height={34} fill={T.areaFill} stroke={T.areaStroke} strokeWidth={2.5} />
        <circle cx={575} cy={445} r={5} fill="none" stroke={T.garis} strokeWidth={1.5} />
        <circle cx={600} cy={445} r={5} fill="none" stroke={T.garis} strokeWidth={1.5} />
        <circle cx={660} cy={445} r={5} fill="none" stroke={T.garis} strokeWidth={1.5} />
        <circle cx={685} cy={445} r={5} fill="none" stroke={T.garis} strokeWidth={1.5} />
      </g>
      <RoomShape kode="U-03" x={548} y={462} w={82} h={150} cx={572} cy={545} lines={['MAN TOILET']} fs={13} {...p}>
        <rect x={595} y={470} width={30} height={34} fill="none" stroke={T.garis} strokeWidth={2} />
      </RoomShape>
      <RoomShape kode="U-04" x={630} y={462} w={82} h={146} cx={690} cy={540} lines={['WOMAN TOILET']} fs={13} {...p}>
        <rect x={634} y={470} width={30} height={34} fill="none" stroke={T.garis} strokeWidth={2} />
      </RoomShape>

      {/* ===== U-01 · MUSHOLA ===== */}
      <RoomShape kode="U-01" x={720} y={420} w={95} h={185} cx={770} cy={510} lines={['MUSHOLA']} fs={14} {...p} />

      {/* ===== R.808 · LAB TRANSPORTASI ===== */}
      <RoomShape kode="R.808" x={815} y={420} w={120} h={180} cx={850} cy={515} lines={['R.808', 'LAB TRANSPORTASI']} fs={13} {...p}>
        <rect x={880} y={420} width={55} height={80} fill="none" stroke={T.garis} strokeWidth={2} />
      </RoomShape>

      {/* ===== R.807 · LAB LOGISTIK ===== */}
      <RoomShape kode="R.807" x={940} y={412} w={108} h={185} cx={995} cy={500} lines={['R.807', 'LAB LOGISTIK']} fs={13} {...p} />

      <Door x={330} y={320} rot={0} tema={tema} />
      <Door x={410} y={362} r={12} rot={0} tema={tema} />
      <Door x={528} y={362} r={12} rot={0} tema={tema} />
      <Door x={558} y={362} r={12} rot={0} tema={tema} />
      <Door x={640} y={362} r={12} rot={0} tema={tema} />
      <Door x={848} y={355} r={14} rot={0} tema={tema} />
      <Door x={945} y={345} r={12} rot={0} tema={tema} />
      <Door x={745} y={420} r={14} rot={180} tema={tema} />
      <Door x={850} y={420} r={14} rot={180} tema={tema} />
      <Door x={948} y={412} r={14} rot={180} tema={tema} />

      {/* Jalur arah menyusuri lorong, berbelok di persimpangan (langkah Lokasi) */}
      {jalur && (
        <g pointerEvents="none">
          <defs>
            <marker id="sfd-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto">
              <path d="M0 0 L10 5 L0 10 z" fill={T.ruteMarkerFill} stroke={T.ruteMarkerStroke} strokeWidth={1.2} strokeLinejoin="round" />
            </marker>
          </defs>
          <path d={jalurRapi(jalur)} fill="none" stroke={T.rutePinggir} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
          <path
            d={jalurRapi(jalur)}
            fill="none"
            className="sfd-dash"
            stroke={T.ruteGaris}
            strokeWidth={4}
            strokeDasharray="10 8"
            strokeLinecap="butt"
            strokeLinejoin="round"
            markerEnd="url(#sfd-arrow)"
          />
        </g>
      )}
      <YouAreHere tema={tema} />
    </svg>
  );
}

export default DenahL8SFD;

// Re-export dengan nama lama agar backward-compatible
export { DenahL8SFD as DenahSvgSfd };