'use client';

/**
 * Denah Gedung Elektro (LE) - Lantai 3
 * Komponen Denah Visual SVG (DenahL3LE)
 */

import React, { useEffect, useRef, useState } from 'react';

export const NOMOR_LANTAI = 3;
const NAMA_GEDUNG = 'Gedung L Elektro';
const LANTAI_LABEL = `Lantai ${NOMOR_LANTAI} · ${NAMA_GEDUNG}`;

const NON_BOOKABLE = new Set(['TOILET_WANITA', 'TOILET_PRIA', 'R_TEKNISI']);

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
export const FULL_BOX: Box = [0, 100, 1600, 640];
const ASPECT = FULL_BOX[2] / FULL_BOX[3];
export const PIN: [number, number] = [735, 459];
const HOVER_RADIUS = 38;

export const ROOM_BOX: Record<string, Box> = {
  R302: [10, 145, 415, 250],
  TOILET_WANITA: [425, 145, 142, 250],
  TOILET_PRIA: [567, 145, 143, 250],
  R303: [975, 145, 267, 250],
  LAB_MULTIMEDIA: [1242, 145, 340, 345],
  R_TEKNISI: [25, 395, 332, 95],
  R307: [10, 490, 423, 235],
  R306: [433, 490, 277, 235],
  R305: [710, 490, 268, 235],
  R304: [978, 490, 604, 235],
};

const LORONG_Y = 459;
const lewat = (x: number, yPintu: number): [number, number][] => [PIN, [x, LORONG_Y], [x, yPintu]];

export const JALUR: Record<string, [number, number][]> = {
  R302: lewat(419, 395),
  TOILET_WANITA: lewat(447, 395),
  TOILET_PRIA: lewat(687, 395),
  R303: lewat(990, 395),
  LAB_MULTIMEDIA: lewat(1242, 417),
  R_TEKNISI: [PIN, [357, LORONG_Y]],
  R307: lewat(423, 490),
  R306: lewat(695, 490),
  R305: lewat(965, 490),
  R304: lewat(993, 490),
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

export interface DenahL3LEProps {
  selectedCode: string | null;
  onSelectRoom: (kode: string) => void;
  className?: string;
  viewBox?: string;
  hoveredCode?: string | null;
  onHoverRoom?: (kode: string | null, pos: { x: number; y: number } | null) => void;
  showRoute?: boolean;
  tema?: TemaDenah;
}

export function DenahL3LE({
  selectedCode = null,
  onSelectRoom = () => {},
  className = '',
  viewBox,
  hoveredCode = null,
  onHoverRoom,
  showRoute = false,
  tema = 'gelap',
}: DenahL3LEProps) {
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

      {/* Border Lapis 1 (Garis pembatas denah di dalam SVG) */}
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

      <defs>
        <marker id="l3-arrow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill={GREEN} />
        </marker>
        <marker id="l3-rute-panah" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 1.5 L8 5 L0 8.5 z" fill={T.ruteMarkerFill} stroke={T.ruteMarkerStroke} strokeWidth={1} />
        </marker>
      </defs>

      {/* Lantai dasar koridor */}
      <path d="M357 395 H1242 V490 H357 Z" fill={T.lantaiFill} />
      <path d="M710 145 H975 V395 H710 Z" fill={T.lantaiFill} />
      <path d="M10 395 H25 V490 H10 Z" fill={T.lantaiFill} />

      {/* Ruangan-ruangan Lantai 3 */}
      <RoomHit {...p} kode="R302" nama="R. 302 Kuliah" d="M10 145 H425 V395 H10 Z">
        <RoomLabel x={176} y={268} lines={['R. 302', 'Kuliah']} tema={tema} />
      </RoomHit>
      <RoomHit {...p} kode="TOILET_WANITA" nama="Toilet Wanita" d="M425 145 H567 V395 H425 Z">
        <RoomLabel x={489} y={222} lines={['TOILET', 'WANITA']} size={16} tema={tema} />
      </RoomHit>
      <RoomHit {...p} kode="TOILET_PRIA" nama="Toilet Pria" d="M567 145 H710 V395 H567 Z">
        <RoomLabel x={627} y={223} lines={['TOILET', 'PRIA']} size={16} tema={tema} />
      </RoomHit>
      <RoomHit {...p} kode="R303" nama="R. 303 Kuliah" d="M975 145 H1242 V395 H975 Z">
        <RoomLabel x={1100} y={238} lines={['R. 303', 'Kuliah']} tema={tema} />
      </RoomHit>
      <RoomHit {...p} kode="LAB_MULTIMEDIA" nama="R. Lab Multimedia" d="M1242 145 H1582 V385 H1556 V490 H1242 Z">
        <RoomLabel x={1395} y={292} lines={['R. Lab', 'Multimedia']} tema={tema} />
      </RoomHit>
      <RoomHit {...p} kode="R_TEKNISI" nama="R. Teknisi Gedung" d="M25 395 H357 V490 H25 Z">
        <RoomLabel x={175} y={448} lines={['R. Teknisi Gedung']} size={18} tema={tema} />
      </RoomHit>
      <RoomHit {...p} kode="R307" nama="R. 307 Kuliah" d="M10 490 H433 V725 H10 Z">
        <RoomLabel x={187} y={593} lines={['R. 307', 'Kuliah']} tema={tema} />
      </RoomHit>
      <RoomHit {...p} kode="R306" nama="R. 306 Kuliah" d="M433 490 H710 V725 H433 Z">
        <RoomLabel x={557} y={583} lines={['R. 306', 'Kuliah']} tema={tema} />
      </RoomHit>
      <RoomHit {...p} kode="R305" nama="R. 305 Kuliah" d="M710 490 H978 V725 H710 Z">
        <RoomLabel x={828} y={586} lines={['R. 305', 'Kuliah']} tema={tema} />
      </RoomHit>
      <RoomHit {...p} kode="R304" nama="R. 304 Kuliah" d="M978 490 H1582 V725 H978 Z">
        <RoomLabel x={1156} y={591} lines={['R. 304', 'Kuliah']} tema={tema} />
      </RoomHit>

      {/* Dinding struktural & pintu */}
      <g className="pointer-events-none" fill="none" stroke={T.dinding}>
        <path
          d="M10 145 H1582 M10 725 H1582 M10 145 V725 M1582 145 V385 H1556 V490 M1582 490 V725 M10 395 H363 M421 395 H445 M497 395 H637 M690 395 H710 M975 395 H985 M1042 395 H1242 M10 490 H365 M425 490 H645 M697 490 H915 M968 490 H990 M1042 490 H1582 M425 145 V395 M567 145 V395 M710 145 V395 M975 145 V395 M1242 145 V417 M1242 480 V490 M25 395 V490 M357 395 V405 M357 485 V490 M433 490 V725 M710 490 V725 M978 490 V725"
          strokeWidth={5}
        />
        <path
          d="M363 395 H421 M445 395 H497 M637 395 H690 M985 395 H1042 M365 490 H425 M645 490 H697 M915 490 H968 M990 490 H1042 M1242 417 V480"
          strokeWidth={1.5}
          stroke={T.pasifStroke}
        />
        <path
          d="M419 395 V345 M447 395 V345 M687 395 V345 M990 395 V338 M1242 417 H1297 M423 490 V560 M695 490 V545 M965 490 V540 M993 490 V540"
          strokeWidth={2.5}
          stroke={T.pintuDaun}
        />
        <rect x={353} y={405} width={8} height={80} fill={T.pintuCelah} strokeWidth={2} stroke={T.pintuDaun} />
      </g>

      {/* Tangga & Simbol Arsitektural */}
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
        <g fill={T.pintuCelah} stroke={T.pasifStroke} strokeWidth={2}>
          <ellipse cx={538} cy={205} rx={11} ry={9} />
          <rect x={534} y={188} width={22} height={10} rx={3} />
          <ellipse cx={683} cy={204} rx={11} ry={9} />
          <rect x={679} y={187} width={22} height={10} rx={3} />
        </g>
        <g stroke={GREEN} strokeWidth={3} strokeLinecap="round" fill="none" markerEnd="url(#l3-arrow-head)">
          {[
            [392, 272, 392, 334],
            [461, 272, 461, 336],
            [670, 270, 670, 334],
            [1006, 262, 1006, 326],
            [1385, 430, 1327, 430],
            [272, 432, 334, 432],
            [403, 617, 403, 567],
            [675, 607, 675, 549],
            [946, 607, 946, 547],
            [1013, 605, 1013, 545],
            [413, 458, 470, 458],
            [487, 458, 556, 458],
            [568, 458, 637, 458],
            [650, 458, 716, 458],
            [1138, 452, 1072, 452],
            [1056, 452, 986, 452],
            [975, 452, 906, 452],
            [890, 452, 824, 452],
          ].map(([x1, y1, x2, y2]) => (
            <line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
        </g>
        <path
          d="M771 360 V190 Q771 180 781 180 H900 Q910 180 910 190 V204"
          stroke={GREEN}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
          markerEnd="url(#l3-arrow-head)"
        />
        <g>
          <rect x={520} y={411} width={14} height={30} rx={5} fill={RED} />
          <path d="M524 411 V405 H533 V411" fill="none" stroke="#1f1f1f" strokeWidth={2.2} />
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
            markerEnd="url(#l3-rute-panah)"
          />
        </g>
      )}

      {/* PIN / YOU ARE HERE (Gaya Lantai 1 & 2: Pin Teardrop + Badge) */}
      <YouAreHere tema={tema} />
    </svg>
  );
}

export default DenahL3LE;
export { DenahL3LE as FloorPlanSvg };
