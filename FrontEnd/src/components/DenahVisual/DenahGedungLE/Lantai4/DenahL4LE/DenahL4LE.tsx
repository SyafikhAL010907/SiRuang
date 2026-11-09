'use client';

/**
 * Denah Gedung Elektro (LE) - Lantai 4
 * Komponen Denah Visual SVG (DenahL4LE)
 */

import React, { useEffect, useRef, useState } from 'react';

export const NOMOR_LANTAI = 4;
const NAMA_GEDUNG = 'Gedung L Elektro';
const LANTAI_LABEL = `Lantai ${NOMOR_LANTAI} · ${NAMA_GEDUNG}`;

const NON_BOOKABLE = new Set([
  'DOSEN_INSTRUMENTASI',
  'R401',
  'TOILET',
  'DOSEN_ELEKTRONIKA',
  'DOSEN_MEKATRONIKA',
  'DOSEN_TELEKOMUNIKASI',
]);

const GREEN = '#5cb82f';
const RED = '#d93a35';

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
    aktifFill: 'rgba(31,31,31,0.95)',
    aktifStroke: '#1F1F1F',
    hoverFill: 'rgba(86,86,86,0.22)',
    hoverStroke: '#1F1F1F',
    bookFill: '#FFFFFF',
    bookStroke: '#2B2B2B',
    tidakFill: 'rgba(235,235,235,0.9)',
    tidakStroke: '#767676',
    teksAktif: '#FFFFFF',
    teksHover: '#1F1F1F',
    teksBook: '#1F1F1F',
    teksTidak: '#565656',
    teksPintuMasuk: '#565656',
    pintuCelah: '#FFFFFF',
    pintuDaun: '#1F1F1F',
    pintuBusur: '#767676',
    pinFill: '#FFFFFF',
    pinStroke: '#2B2B2B',
    pinBulat: '#2B2B2B',
    pinTeks: '#FFFFFF',
    pinGelombang: 'rgba(43,43,43,0.35)',
    rutePinggir: '#FFFFFF',
    ruteGaris: '#1F1F1F',
    ruteMarkerFill: '#1F1F1F',
    ruteMarkerStroke: '#FFFFFF',
    fokusRing: 'group-focus-visible:stroke-[#1F1F1F]',
  },
} as const;

export type Box = [number, number, number, number];
export const FULL_BOX: Box = [40, 55, 1750, 650];
const ASPECT = FULL_BOX[2] / FULL_BOX[3];
export const PIN: [number, number] = [846, 392];
const HOVER_RADIUS = 40;

export const ROOM_BOX: Record<string, Box> = {
  DOSEN_INSTRUMENTASI: [60, 80, 257, 263],
  R401: [317, 80, 230, 263],
  TOILET: [547, 80, 205, 155],
  DOSEN_ELEKTRONIKA: [547, 165, 295, 178],
  TPJM: [1127, 80, 115, 263],
  R403: [1242, 80, 523, 263],
  DOSEN_MEKATRONIKA: [1330, 343, 405, 100],
  R407: [68, 343, 479, 341],
  R406B: [547, 443, 295, 171],
  DOSEN_TELEKOMUNIKASI: [547, 614, 295, 70],
  R406A: [842, 443, 285, 241],
  R405: [1127, 443, 638, 241],
};

const LORONG_Y = 392;
const lewat = (x: number, yPintu: number): [number, number][] => [PIN, [x, LORONG_Y], [x, yPintu]];

export const JALUR: Record<string, [number, number][]> = {
  DOSEN_INSTRUMENTASI: lewat(265, 343),
  R401: lewat(510, 343),
  TOILET: lewat(660, 235),
  DOSEN_ELEKTRONIKA: lewat(595, 343),
  TPJM: lewat(1165, 343),
  R403: lewat(1284, 343),
  DOSEN_MEKATRONIKA: [PIN, [1330, LORONG_Y]],
  R407: [PIN, [547, LORONG_Y], [547, 375]],
  R406B: lewat(795, 443),
  DOSEN_TELEKOMUNIKASI: lewat(696, 614),
  R406A: lewat(895, 443),
  R405: lewat(1165, 443),
};

export function jalurRapi(titik: [number, number][], r = 20): string {
  const pts = titik.filter((q, i) => i === 0 || q[0] !== titik[i - 1][0] || q[1] !== titik[i - 1][1]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1],
      [x, y] = pts[i],
      [nx, ny] = pts[i + 1];
    const l1 = Math.hypot(x - px, y - py),
      l2 = Math.hypot(nx - x, ny - y);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    d += ` L${x + ((px - x) / l1) * rr} ${y + ((py - y) / l1) * rr} Q${x} ${y} ${x + ((nx - x) / l2) * rr} ${
      y + ((ny - y) / l2) * rr
    }`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last[0]} ${last[1]}`;
}

export function boxFokus(kode: string | null, denganPin = false): Box {
  const b = kode ? ROOM_BOX[kode] : undefined;
  if (!b) return FULL_BOX;
  let x0 = b[0],
    y0 = b[1],
    x1 = b[0] + b[2],
    y1 = b[1] + b[3];
  if (denganPin) {
    x0 = Math.min(x0, PIN[0] - 25);
    x1 = Math.max(x1, PIN[0] + 25);
    y0 = Math.min(y0, PIN[1] - 50);
    y1 = Math.max(y1, PIN[1] + 8);
    for (const [px, py] of (kode && JALUR[kode]) || []) {
      x0 = Math.min(x0, px);
      x1 = Math.max(x1, px);
      y0 = Math.min(y0, py);
      y1 = Math.max(y1, py);
    }
  }
  const pad = Math.min(0.2 * Math.max(x1 - x0, y1 - y0) + 16, 45);
  x0 -= pad;
  y0 -= pad;
  x1 += pad;
  y1 += pad;
  let w = x1 - x0,
    h = y1 - y0;
  if (w / h < ASPECT) {
    const nw = h * ASPECT;
    x0 -= (nw - w) / 2;
    w = nw;
  } else {
    const nh = w / ASPECT;
    y0 -= (nh - h) / 2;
    h = nh;
  }
  if (w >= FULL_BOX[2]) {
    w = FULL_BOX[2] * 0.85;
    h = w / ASPECT;
  }
  x0 = Math.max(FULL_BOX[0] - 20, Math.min(x0, FULL_BOX[0] + FULL_BOX[2] - w + 20));
  y0 = Math.max(FULL_BOX[1] - 20, Math.min(y0, FULL_BOX[1] + FULL_BOX[3] - h + 20));
  return [x0, y0, w, h];
}

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
  }, [target[0], target[1], target[2], target[3], ms]);
  return box;
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

function RoomHit({
  kode,
  nama,
  d,
  selectedCode,
  hoveredCode,
  onSelect,
  tema = 'gelap',
  children,
}: {
  kode: string;
  nama: string;
  d: string;
  selectedCode: string | null;
  hoveredCode: string | null;
  onSelect: (k: string) => void;
  tema?: TemaDenah;
  children: React.ReactNode;
}) {
  const T = TEMA[tema];
  const isBookable = !NON_BOOKABLE.has(kode);
  const aktif = selectedCode === kode;
  const hover = hoveredCode === kode;

  const isi = aktif ? T.aktifFill : hover ? T.hoverFill : isBookable ? T.bookFill : T.tidakFill;
  const garis = aktif ? T.aktifStroke : hover ? T.hoverStroke : isBookable ? T.bookStroke : T.tidakStroke;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={nama}
      className="group cursor-pointer outline-none"
      onClick={() => onSelect(kode)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(kode);
        }
      }}
    >
      <path
        d={d}
        fill={isi}
        stroke={garis}
        strokeWidth={aktif ? 5 : hover ? 4 : 2}
        className={`transition-colors duration-200 ${T.fokusRing}`}
      />
      {React.Children.map(children, (child) =>
        React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<{ aktif?: boolean }>, { aktif }) : child
      )}
    </g>
  );
}

function RoomLabel({
  x,
  y,
  lines,
  anchor = 'start',
  size = 19,
  step = 27,
  tema = 'gelap',
  aktif = false,
}: {
  x: number;
  y: number;
  lines: string[];
  anchor?: 'start' | 'middle';
  size?: number;
  step?: number;
  tema?: TemaDenah;
  aktif?: boolean;
}) {
  const T = TEMA[tema];
  return (
    <text
      x={x}
      textAnchor={anchor}
      fontSize={size}
      fill={aktif ? T.teksAktif : T.teksBook}
      className="pointer-events-none select-none font-sans font-semibold"
    >
      {lines.map((line, i) => (
        <tspan key={line} x={x} y={y + i * step} dominantBaseline="central">
          {line}
        </tspan>
      ))}
    </text>
  );
}

export interface DenahL4LEProps {
  selectedCode: string | null;
  onSelectRoom: (kode: string) => void;
  className?: string;
  viewBox?: string;
  hoveredCode?: string | null;
  onHoverRoom?: (kode: string | null, pos: { x: number; y: number } | null) => void;
  showRoute?: boolean;
  tema?: TemaDenah;
}

export function DenahL4LE({
  selectedCode = null,
  onSelectRoom = () => {},
  className = '',
  viewBox,
  hoveredCode = null,
  onHoverRoom,
  showRoute = false,
  tema = 'gelap',
}: DenahL4LEProps) {
  const ref = useRef<SVGSVGElement>(null);
  const T = TEMA[tema];
  const vb = viewBox ?? FULL_BOX.join(' ');

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
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    onHoverRoom(best, { x: e.clientX, y: e.clientY });
  };

  const jalur = showRoute && selectedCode ? JALUR[selectedCode] : undefined;
  const p = { selectedCode, hoveredCode, onSelect: onSelectRoom, tema };

  return (
    <svg
      ref={ref}
      viewBox={vb}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      style={{ cursor: hoveredCode ? 'pointer' : 'default', touchAction: 'manipulation' }}
      onPointerMove={onMove}
      onPointerLeave={() => onHoverRoom?.(null, null)}
      onClick={() => {
        if (hoveredCode) onSelectRoom(hoveredCode);
      }}
    >
      <text x={1765} y={68} textAnchor="end" fontSize={22} fill={T.labelLantai} className="font-sans">
        {LANTAI_LABEL}
      </text>

      {/* Border Lapis 1 (Garis pembatas denah di dalam SVG) */}
      <rect
        x={48}
        y={65}
        width={1730}
        height={635}
        rx={36}
        fill={T.luarFill}
        stroke={T.luarStroke}
        strokeWidth={T.luarW}
      />

      <defs>
        <marker id="l4-arrow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill={GREEN} />
        </marker>
        <marker id="l4-rute-panah" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 1.5 L8 5 L0 8.5 z" fill={T.ruteMarkerFill} stroke={T.ruteMarkerStroke} strokeWidth={1} />
        </marker>
      </defs>

      {/* ================= LANTAI (koridor + area tangga) ================= */}
      <path d="M547 343 H1330 V443 H547 Z" fill={T.lantaiFill} />
      <path d="M842 80 H1127 V343 H842 Z" fill={T.lantaiFill} />

      {/* ================= RUANGAN ================= */}
      <RoomHit {...p} kode="DOSEN_INSTRUMENTASI" nama="R. Dosen Instrumentasi Kendali" d="M60 80 H317 V343 H60 Z">
        <RoomLabel x={88} y={210} lines={['R. DOSEN', 'Instrumentasi Kendali']} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="R401" nama="R. 401 Ruang Teknisi Toolman" d="M317 80 H547 V343 H317 Z">
        <RoomLabel x={340} y={121} lines={['R. 401', 'Ruang Teknisi', 'Laboratorium/Tool', 'man']} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="TOILET" nama="Toilet" d="M547 80 H752 V235 H610 V165 H547 Z">
        <RoomLabel x={693} y={144} anchor="middle" lines={['TOILET']} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="DOSEN_ELEKTRONIKA" nama="R. Dosen Elektronika Dasar" d="M752 80 H842 V343 H547 V165 H610 V235 H752 Z">
        <RoomLabel x={645} y={274} lines={['R. DOSEN', 'Elektronika Dasar']} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="TPJM" nama="R. TPjM" d="M1127 80 H1242 V343 H1127 Z">
        <RoomLabel x={1150} y={182} lines={['R. TPjM']} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="R403" nama="R. 403 Lab. Mekatronika dan Robotika" d="M1242 80 H1765 V343 H1242 Z">
        <RoomLabel x={1328} y={201} lines={['R. 403', 'Lab. Mekatronika dan Robotika']} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="DOSEN_MEKATRONIKA" nama="R. Dosen Mekatronika dan Robotika" d="M1330 343 H1735 V443 H1330 Z">
        <RoomLabel x={1470} y={376} lines={['R. DOSEN', 'Mekatronika dan Robotika']} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="R407" nama="R. 407 Lab. Elektronika Dasar, Digital dan Audio Video" d="M115 343 H547 V684 H68 V444 H115 Z">
        <RoomLabel x={187} y={474} lines={['R. 407', 'Lab. Elektronika Dasar,', 'Digital dan Audio Video']} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="R406B" nama="R. 406B Ruang Rapat dan Perpustakaan" d="M547 443 H842 V614 H547 Z">
        <RoomLabel x={585} y={501} lines={['R. 406B', 'Ruang Rapat dan', 'Perpustakaan']} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="DOSEN_TELEKOMUNIKASI" nama="R. Dosen Telekomunikasi" d="M547 614 H842 V684 H547 Z">
        <RoomLabel x={617} y={638} lines={['R. DOSEN', 'Telekomunikasi']} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="R406A" nama="R. 406A Lab. Telekomunikasi" d="M842 443 H1127 V684 H842 Z">
        <RoomLabel x={887} y={552} lines={['R. 406A', 'Lab. Telekomunikasi']} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="R405" nama="R. 405 Lab. Sistem Instrumentasi Kendali" d="M1127 443 H1765 V684 H1127 Z">
        <RoomLabel x={1280} y={550} lines={['R. 405', 'Lab. Sistem Instrumentasi Kendali']} tema={tema} />
      </RoomHit>

      {/* ================= DINDING & PINTU ================= */}
      <g className="pointer-events-none" fill="none" stroke={T.dinding}>
        <path
          d="M60 80 H1765 M68 684 H1765 M60 80 V343 M115 343 V444 H68 V684 M1765 80 V343 H1735 V443 H1765 V684 M60 343 H240 M290 343 H480 M540 343 H565 M625 343 H842 M1127 343 H1140 M1195 343 H1258 M1310 343 H1765 M547 443 H772 M818 443 H870 M918 443 H1140 M1195 443 H1765 M547 614 H670 M722 614 H842 M317 80 V343 M547 80 V350 M547 403 V684 M752 80 V235 M842 80 V343 M1127 80 V343 M1242 80 V343 M1330 343 V385 M1330 437 V443 M842 443 V684 M1127 443 V684 M1735 343 V443 M547 165 H630 M686 165 H752 M610 165 V235 H752"
          strokeWidth={5}
          strokeLinecap="square"
        />
        <path
          d="M240 343 H290 M480 343 H540 M565 343 H625 M1140 343 H1195 M1258 343 H1310 M772 443 H818 M870 443 H918 M1140 443 H1195 M670 614 H722 M630 165 H686 M1330 385 V437"
          strokeWidth={1.5}
          stroke={T.pasifStroke}
        />
        <path
          d="M622 343 V295 M547 352 H492 M774 443 V493 M1143 443 V495 M1330 385 H1385 M686 165 V218"
          strokeWidth={2.5}
          stroke={T.pintuDaun}
        />
        <g fill={T.pintuCelah} strokeWidth={2} stroke={T.pintuDaun}>
          <rect x={313} y={267} width={8} height={48} />
          <rect x={543} y={96} width={8} height={50} />
          <rect x={543} y={260} width={8} height={45} />
          <rect x={543} y={350} width={8} height={53} />
          <rect x={1668} y={339} width={44} height={8} />
          <rect x={1665} y={439} width={47} height={8} />
        </g>
      </g>

      {/* ================= DETAIL (tangga, closet, panah evakuasi, simbol) ================= */}
      <g className="pointer-events-none">
        <g fill="none" stroke={T.simbol}>
          <path d="M850 160 A135 72 0 0 1 1120 160" strokeWidth={2} />
          {Array.from({ length: 11 }, (_, i) => 157 + i * 12.5).map((y) => (
            <line key={y} x1={848} y1={y} x2={975} y2={y} strokeWidth={2} />
          ))}
          {Array.from({ length: 4 }, (_, i) => 244.5 + i * 12.5).map((y) => (
            <line key={`r${y}`} x1={998} y1={y} x2={1122} y2={y} strokeWidth={2} />
          ))}
          <rect x={975} y={146} width={23} height={136} strokeWidth={3} />
          <line x1={986} y1={152} x2={986} y2={276} strokeWidth={1.5} />
          <path d="M1000 238 L1040 226 L1048 208 L1066 204 L1100 190" strokeWidth={2} />
          <line x1={1058} y1={168} x2={1058} y2={190} strokeWidth={1.5} />
        </g>

        <g fill={T.pintuCelah} stroke={T.pasifStroke} strokeWidth={2}>
          <ellipse cx={643} cy={203} rx={12} ry={10} />
          <rect x={620} y={195} width={14} height={16} rx={3} />
        </g>

        <g stroke={GREEN} strokeWidth={3} strokeLinecap="round" fill="none" markerEnd="url(#l4-arrow-head)">
          {[
            [260, 262, 260, 322],
            [505, 200, 505, 265],
            [597, 203, 597, 268],
            [1158, 211, 1158, 274],
            [1275, 210, 1275, 273],
            [1445, 405, 1385, 405],
            [420, 381, 487, 381],
            [795, 561, 795, 501],
            [895, 525, 895, 465],
            [1170, 561, 1170, 501],
            [610, 406, 680, 406],
            [697, 406, 768, 406],
            [783, 406, 855, 406],
            [1293, 406, 1222, 406],
            [1205, 406, 1135, 406],
            [1120, 406, 1052, 406],
            [1035, 406, 965, 406],
          ].map(([x1, y1, x2, y2]) => (
            <line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
        </g>

        <g stroke={GREEN} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M868 408 C893 408 912 398 912 380" />
          <path d="M958 408 C933 408 912 398 912 380" />
          <path d="M912 382 V362" />
          <path d="M903 372 L912 360 L921 372" />
        </g>
        <path
          d="M911 308 V135 Q911 125 921 125 H1048 Q1058 125 1058 135 V152"
          stroke={GREEN}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
          markerEnd="url(#l4-arrow-head)"
        />

        <g>
          <rect x={890} y={311} width={42} height={28} fill={RED} rx={1} />
          <circle cx={902} cy={319} r={2.6} fill="#fff" />
          <path
            d="M902 323 L906 330 L901 335 M906 330 L912 327 M902 323 L897 329"
            stroke="#fff"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x={916} y={316} width={8} height={18} fill="none" stroke="#fff" strokeWidth={1.6} />
        </g>

        <g>
          <rect x={645} y={351} width={14} height={36} rx={5} fill={RED} />
          <path d="M649 351 V345 H658 V351" fill="none" stroke="#1f1f1f" strokeWidth={2.2} />
        </g>
      </g>

      {/* JALUR RUTE BERANIMASI MENUJU RUANGAN */}
      {jalur && (
        <g className="pointer-events-none">
          <path
            d={jalurRapi(jalur)}
            fill="none"
            stroke={T.rutePinggir}
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.65}
          />
          <path
            d={jalurRapi(jalur)}
            fill="none"
            stroke={T.ruteGaris}
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="10 8"
            className="sfd-dash"
            markerEnd="url(#l4-rute-panah)"
          />
        </g>
      )}

      {/* PIN / YOU ARE HERE (Gaya Lantai 1 & 2: Pin Teardrop + Badge) */}
      <YouAreHere tema={tema} />
    </svg>
  );
}

export default DenahL4LE;
export { DenahL4LE as FloorPlanSvg };
