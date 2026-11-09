'use client';

/**
 * Denah Gedung Elektro (LE) - Lantai 2
 * Komponen Denah Visual SVG (DenahL2LE)
 */

import React, { useEffect, useRef, useState } from 'react';

export const NOMOR_LANTAI = 2;
const NAMA_GEDUNG = 'Gedung L Elektro';
const LANTAI_LABEL = `Lantai ${NOMOR_LANTAI} · ${NAMA_GEDUNG}`;

const NON_BOOKABLE = new Set(['TOILET_WANITA', 'TOILET_PRIA', 'RSTAFF']);

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

export type Box = [number, number, number, number];
export const FULL_BOX: Box = [0, 100, 1600, 640];
const ASPECT = FULL_BOX[2] / FULL_BOX[3];
export const PIN: [number, number] = [735, 459];
const HOVER_RADIUS = 38;

export const ROOM_BOX: Record<string, Box> = {
  RSTAFF: [10, 145, 415, 250],
  LAB_MAKE_UP: [1010, 145, 270, 250],
  LAB_TATA_RIAS: [1242, 145, 340, 345],
  RUANG_ROBOTIC: [25, 395, 332, 95],
  LAB_KOMPUTER: [10, 490, 423, 235],
  R208: [433, 490, 277, 235],
  LAB_FLORIST: [710, 490, 310, 235],
  LAB_KOSMETIK: [1020, 490, 562, 235],
};

const LORONG_Y = 459;
const lewat = (x: number, yPintu: number): [number, number][] => [PIN, [x, LORONG_Y], [x, yPintu]];

export const JALUR: Record<string, [number, number][]> = {
  RSTAFF: lewat(419, 395),
  TOILET_WANITA: lewat(447, 395),
  TOILET_PRIA: lewat(687, 395),
  LAB_MAKE_UP: lewat(1025, 395),
  LAB_TATA_RIAS: lewat(1242, 417),
  RUANG_ROBOTIC: [PIN, [357, LORONG_Y]],
  LAB_KOMPUTER: lewat(423, 490),
  R208: lewat(695, 490),
  LAB_FLORIST: lewat(965, 490),
  LAB_KOSMETIK: lewat(1156, 490),
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
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    x0 = cx - w / 2;
    y0 = cy - h / 2;
  }
  x0 = Math.max(FULL_BOX[0] - 10, Math.min(FULL_BOX[0] + FULL_BOX[2] - w + 10, x0));
  y0 = Math.max(FULL_BOX[1] - 10, Math.min(FULL_BOX[1] + FULL_BOX[3] - h + 10, y0));
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
  }, [target, ms]);
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
}: any) {
  const T = TEMA[tema as TemaDenah];
  const isBookable = !NON_BOOKABLE.has(kode);
  const aktif = selectedCode === kode;
  const hover = hoveredCode === kode;

  const isi = aktif ? T.aktifFill : hover ? T.hoverFill : isBookable ? T.bookFill : T.tidakFill;
  const garis = aktif ? T.aktifStroke : hover ? T.hoverStroke : isBookable ? T.bookStroke : T.tidakStroke;

  return (
    <g
      role="button"
      tabIndex={isBookable ? 0 : -1}
      aria-label={nama}
      className={`group outline-none ${isBookable ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={() => isBookable && onSelect(kode)}
    >
      <path d={d} fill={isi} stroke={garis} strokeWidth={aktif || hover ? 3.5 : 2} className="transition-colors duration-150" />
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
  size = 22,
  tema = 'gelap',
  aktif = false,
}: {
  x: number;
  y: number;
  lines: string[];
  size?: number;
  tema?: TemaDenah;
  aktif?: boolean;
}) {
  const T = TEMA[tema];
  return (
    <text x={x} textAnchor="middle" fontSize={size} fill={aktif ? T.teksAktif : T.teksBook} className="pointer-events-none select-none font-sans font-semibold">
      {lines.map((line, i) => (
        <tspan key={line} x={x} y={y + i * 26} dominantBaseline="central">
          {line}
        </tspan>
      ))}
    </text>
  );
}

export interface DenahL2LEProps {
  selectedCode: string | null;
  onSelectRoom: (kode: string) => void;
  className?: string;
  viewBox?: string;
  hoveredCode?: string | null;
  onHoverRoom?: (kode: string | null, pos: { x: number; y: number } | null) => void;
  showRoute?: boolean;
  tema?: TemaDenah;
}

export function DenahL2LE({
  tema = 'gelap',
  selectedCode = null,
  onSelectRoom = () => {},
  viewBox,
  hoveredCode = null,
  onHoverRoom,
  showRoute = false,
  className = '',
}: DenahL2LEProps) {
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
      <text x={1582} y={126} textAnchor="end" fontSize={22} fill={T.labelLantai} className="font-sans">
        {LANTAI_LABEL}
      </text>

      {/* Garis pembatas luar denah */}
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

      {/* Koridor + Tangga */}
      <path d="M357 395 H1242 V490 H357 Z" fill={T.lantaiFill} />
      <path d="M710 145 H975 V395 H710 Z" fill={T.pasifFill} />
      <path d="M975 145 H1010 V395 H975 Z" fill={T.pasifFill} />
      <path d="M10 395 H25 V490 H10 Z" fill={T.pasifFill} />

      {/* Ruangan */}
      <RoomHit {...p} kode="RSTAFF" nama="R. Staff Only" d="M10 145 H425 V395 H10 Z">
        <RoomLabel x={176} y={268} lines={['R. Staff Only']} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="TOILET_WANITA" nama="Toilet Wanita" d="M425 145 H567 V395 H425 Z">
        <RoomLabel x={489} y={222} lines={['TOILET', 'WANITA']} size={16} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="TOILET_PRIA" nama="Toilet Pria" d="M567 145 H710 V395 H567 Z">
        <RoomLabel x={627} y={223} lines={['TOILET', 'PRIA']} size={16} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="LAB_MAKE_UP" nama="Laboratorium Make Up" d="M1010 145 H1280 V395 H1010 Z">
        <RoomLabel x={1145} y={238} lines={['Laboratorium', 'Make Up']} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="LAB_TATA_RIAS" nama="Laboratorium Tata Rias" d="M1280 145 H1582 V385 H1556 V490 H1242 V395 H1280 Z">
        <RoomLabel x={1431} y={279} lines={['Laboratorium', 'Tata Rias']} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="RUANG_ROBOTIC" nama="Ruang Robotic" d="M25 395 H357 V490 H25 Z">
        <RoomLabel x={175} y={448} lines={['Ruang Robotic']} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="LAB_KOMPUTER" nama="Laboratorium Komputer" d="M10 490 H433 V725 H10 Z">
        <RoomLabel x={187} y={593} lines={['Laboratorium', 'Komputer']} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="R208" nama="R. 208 Kuliah" d="M433 490 H710 V725 H433 Z">
        <RoomLabel x={557} y={583} lines={['R. 208', 'Kuliah']} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="LAB_FLORIST" nama="Laboratorium Florist" d="M710 490 H1020 V725 H710 Z">
        <RoomLabel x={865} y={586} lines={['Laboratorium', 'Florist']} tema={tema} />
      </RoomHit>

      <RoomHit {...p} kode="LAB_KOSMETIK" nama="Laboratorium Kosmetik" d="M1020 490 H1582 V725 H1020 Z">
        <RoomLabel x={1301} y={591} lines={['Laboratorium', 'Kosmetik']} tema={tema} />
      </RoomHit>

      {/* Dinding */}
      <g className="pointer-events-none" fill="none" stroke={T.dinding}>
        <path
          d="M10 145 H1582 M10 725 H1582 M10 145 V725 M1582 145 V385 H1556 V490 M1582 490 V725 M10 395 H363 M421 395 H445 M497 395 H637 M690 395 H710 M1010 395 H1020 M1075 395 H1280 M10 490 H365 M425 490 H645 M697 490 H915 M968 490 H1105 M1158 490 H1582 M425 145 V395 M567 145 V395 M710 145 V395 M975 145 V395 M1010 145 V395 M1280 145 V395 M1242 395 V417 M1242 480 V490 M25 395 V490 M357 395 V405 M357 485 V490 M433 490 V725 M710 490 V725 M1020 490 V725"
          strokeWidth={5}
        />
        <path
          d="M363 395 H421 M445 395 H497 M637 395 H690 M1020 395 H1075 M365 490 H425 M645 490 H697 M915 490 H968 M1105 490 H1158 M1242 417 V480"
          strokeWidth={1.5}
          opacity={0.55}
        />
        <path
          d="M419 395 V345 M447 395 V345 M687 395 V345 M1025 395 V338 M1242 417 H1297 M423 490 V560 M695 490 V545 M965 490 V540 M1156 490 V540"
          strokeWidth={2.5}
          stroke={T.pintuDaun}
        />
        <rect x={353} y={405} width={8} height={80} fill={T.pintuCelah} strokeWidth={2} />
      </g>

      {/* Detail Tangga & Simbol */}
      <g className="pointer-events-none">
        <g fill="none" stroke={T.simbol}>
          <path d="M713 208 A131 63 0 0 1 975 208" strokeWidth={2} />
          {Array.from({ length: 10 }, (_, i) => 195 + i * 15).map((y) => (
            <line key={y} x1={713} y1={y} x2={829} y2={y} strokeWidth={2} />
          ))}
          <rect x={829} y={200} width={26} height={135} strokeWidth={3} />
          <line x1={842} y1={206} x2={842} y2={329} strokeWidth={1.5} />
          <path d="M855 290 L905 278 L912 262 L970 238" strokeWidth={2} />
          <line x1={910} y1={214} x2={910} y2={236} strokeWidth={1.5} />
        </g>
        <g fill={T.lantaiFill} stroke={T.garis} strokeWidth={2}>
          <ellipse cx={538} cy={205} rx={11} ry={9} /> <rect x={534} y={188} width={22} height={10} rx={3} />
          <ellipse cx={683} cy={204} rx={11} ry={9} /> <rect x={679} y={187} width={22} height={10} rx={3} />
        </g>
        <g>
          <rect x={520} y={411} width={14} height={30} rx={5} fill={RED} />
          <path d="M524 411 V405 H533 V411" fill="none" stroke={T.simbol} strokeWidth={2.2} />
        </g>
      </g>

      {/* Jalur Arah */}
      {jalur && (
        <g pointerEvents="none">
          <defs>
            <marker id="l2-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto">
              <path d="M0 0 L10 5 L0 10 z" fill={T.ruteMarkerFill} stroke={T.ruteMarkerStroke} strokeWidth={1.2} strokeLinejoin="round" />
            </marker>
          </defs>
          <path d={jalurRapi(jalur)} fill="none" stroke={T.rutePinggir} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
          <path
            d={jalurRapi(jalur)}
            fill="none"
            stroke={T.ruteGaris}
            strokeWidth={4.5}
            strokeDasharray="12 9"
            strokeLinecap="butt"
            strokeLinejoin="round"
            markerEnd="url(#l2-arrow)"
          />
        </g>
      )}

      <YouAreHere tema={tema} />
    </svg>
  );
}

export default DenahL2LE;
export { DenahL2LE as FloorPlanSvg };
