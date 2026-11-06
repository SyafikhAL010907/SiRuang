'use client';

import React from 'react';

const NON_BOOKABLE = new Set(["DOSEN_INSTRUMENTASI","R401","TOILET","DOSEN_ELEKTRONIKA","TPJM","DOSEN_MEKATRONIKA","DOSEN_TELEKOMUNIKASI"]);

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

// Label rata kiri seperti di gambar asli (anchor="middle" untuk label tengah)
function RoomLabel({ x, y, lines, anchor = 'start', size = 19, step = 27 }: { x: number; y: number; lines: string[]; anchor?: 'start' | 'middle'; size?: number; step?: number }) {
  return (
    <text x={x} textAnchor={anchor} fontSize={size} fill={TEXT} className="pointer-events-none select-none font-sans font-semibold">
      {lines.map((line, i) => (<tspan key={line} x={x} y={y + i * step} dominantBaseline="central">{line}</tspan>))}
    </text>
  );
}

export interface DenahL4LSProps {
  selectedCode: string | null;
  onSelectRoom: (k: string) => void;
  className?: string;
}

export function DenahL4LS({ selectedCode, onSelectRoom, className }: DenahL4LSProps) {
  const common = (kode: string) => ({ kode, selected: selectedCode === kode, muted: NON_BOOKABLE.has(kode), onSelect: onSelectRoom });
  return (
    <svg viewBox="40 55 1750 650" className={className}>
      <defs><marker id="l4-arrow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill={GREEN} /></marker></defs>

      {/* ================= LANTAI (koridor + area tangga) ================= */}
      <path d="M547 343 H1330 V443 H547 Z" fill={FLOOR} />
      <path d="M842 80 H1127 V343 H842 Z" fill={FLOOR} />

      {/* ================= RUANGAN (bisa diklik) ================= */}

      {/* ===== KODE RUANGAN: DOSEN_INSTRUMENTASI - R. Dosen Instrumentasi Kendali ===== */}
      <RoomHit {...common('DOSEN_INSTRUMENTASI')} nama="R. Dosen Instrumentasi Kendali" d="M60 80 H317 V343 H60 Z"><RoomLabel x={88} y={210} lines={['R. DOSEN', 'Instrumentasi Kendali']} /></RoomHit>

      {/* ===== KODE RUANGAN: R401 - R. 401 Ruang Teknisi Laboratorium/Toolman ===== */}
      <RoomHit {...common('R401')} nama="R. 401 Ruang Teknisi Laboratorium/Toolman" d="M317 80 H547 V343 H317 Z"><RoomLabel x={340} y={121} lines={['R. 401', 'Ruang Teknisi', 'Laboratorium/Tool', 'man']} /></RoomHit>

      {/* ===== KODE RUANGAN: TOILET (area atas + bilik closet) ===== */}
      <RoomHit {...common('TOILET')} nama="Toilet" d="M547 80 H752 V235 H610 V165 H547 Z"><RoomLabel x={693} y={144} anchor="middle" lines={['TOILET']} /></RoomHit>

      {/* ===== KODE RUANGAN: DOSEN_ELEKTRONIKA - R. Dosen Elektronika Dasar ===== */}
      <RoomHit {...common('DOSEN_ELEKTRONIKA')} nama="R. Dosen Elektronika Dasar" d="M752 80 H842 V343 H547 V165 H610 V235 H752 Z"><RoomLabel x={645} y={274} lines={['R. DOSEN', 'Elektronika Dasar']} /></RoomHit>

      {/* ===== KODE RUANGAN: TPJM - R. TPjM ===== */}
      <RoomHit {...common('TPJM')} nama="R. TPjM" d="M1127 80 H1242 V343 H1127 Z"><RoomLabel x={1150} y={182} lines={['R. TPjM']} /></RoomHit>

      {/* ===== KODE RUANGAN: R403 - R. 403 Lab. Mekatronika dan Robotika ===== */}
      <RoomHit {...common('R403')} nama="R. 403 Lab. Mekatronika dan Robotika" d="M1242 80 H1765 V343 H1242 Z"><RoomLabel x={1328} y={201} lines={['R. 403', 'Lab. Mekatronika dan Robotika']} /></RoomHit>

      {/* ===== KODE RUANGAN: DOSEN_MEKATRONIKA - R. Dosen Mekatronika dan Robotika ===== */}
      <RoomHit {...common('DOSEN_MEKATRONIKA')} nama="R. Dosen Mekatronika dan Robotika" d="M1330 343 H1735 V443 H1330 Z"><RoomLabel x={1470} y={376} lines={['R. DOSEN', 'Mekatronika dan Robotika']} /></RoomHit>

      {/* ===== KODE RUANGAN: R407 - R. 407 Lab. Elektronika Dasar, Digital dan Audio Video ===== */}
      <RoomHit {...common('R407')} nama="R. 407 Lab. Elektronika Dasar, Digital dan Audio Video" d="M115 343 H547 V684 H68 V444 H115 Z"><RoomLabel x={187} y={474} lines={['R. 407', 'Lab. Elektronika Dasar,', 'Digital dan Audio Video']} /></RoomHit>

      {/* ===== KODE RUANGAN: R406B - R. 406B Ruang Rapat dan Perpustakaan ===== */}
      <RoomHit {...common('R406B')} nama="R. 406B Ruang Rapat dan Perpustakaan" d="M547 443 H842 V614 H547 Z"><RoomLabel x={585} y={501} lines={['R. 406B', 'Ruang Rapat dan', 'Perpustakaan']} /></RoomHit>

      {/* ===== KODE RUANGAN: DOSEN_TELEKOMUNIKASI - R. Dosen Telekomunikasi ===== */}
      <RoomHit {...common('DOSEN_TELEKOMUNIKASI')} nama="R. Dosen Telekomunikasi" d="M547 614 H842 V684 H547 Z"><RoomLabel x={617} y={638} lines={['R. DOSEN', 'Telekomunikasi']} /></RoomHit>

      {/* ===== KODE RUANGAN: R406A - R. 406A Lab. Telekomunikasi ===== */}
      <RoomHit {...common('R406A')} nama="R. 406A Lab. Telekomunikasi" d="M842 443 H1127 V684 H842 Z"><RoomLabel x={887} y={552} lines={['R. 406A', 'Lab. Telekomunikasi']} /></RoomHit>

      {/* ===== KODE RUANGAN: R405 - R. 405 Lab. Sistem Instrumentasi Kendali ===== */}
      <RoomHit {...common('R405')} nama="R. 405 Lab. Sistem Instrumentasi Kendali" d="M1127 443 H1765 V684 H1127 Z"><RoomLabel x={1280} y={550} lines={['R. 405', 'Lab. Sistem Instrumentasi Kendali']} /></RoomHit>

      {/* ================= DINDING & PINTU ================= */}
      <g className="pointer-events-none" fill="none" stroke={WALL}>
        {/* dinding utama (celah = pintu) */}
        <path d="M60 80 H1765 M68 684 H1765 M60 80 V343 M115 343 V444 H68 V684 M1765 80 V343 H1735 V443 H1765 V684 M60 343 H240 M290 343 H480 M540 343 H565 M625 343 H842 M1127 343 H1140 M1195 343 H1258 M1310 343 H1765 M547 443 H772 M818 443 H870 M918 443 H1140 M1195 443 H1765 M547 614 H670 M722 614 H842 M317 80 V343 M547 80 V350 M547 403 V684 M752 80 V235 M842 80 V343 M1127 80 V343 M1242 80 V343 M1330 343 V385 M1330 437 V443 M842 443 V684 M1127 443 V684 M1735 343 V443 M547 165 H630 M686 165 H752 M610 165 V235 H752" strokeWidth={5} strokeLinecap="square" />
        {/* ambang pintu */}
        <path d="M240 343 H290 M480 343 H540 M565 343 H625 M1140 343 H1195 M1258 343 H1310 M772 443 H818 M870 443 H918 M1140 443 H1195 M670 614 H722 M630 165 H686 M1330 385 V437" strokeWidth={1.5} opacity={0.55} />
        {/* daun pintu */}
        <path d="M622 343 V295 M547 352 H492 M774 443 V493 M1143 443 V495 M1330 385 H1385 M686 165 V218" strokeWidth={2.5} />
        {/* panel pintu / jendela di dinding */}
        <g fill="#ffffff" strokeWidth={2}>
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
        {/* tangga */}
        <g fill="none" stroke={WALL}>
          <path d="M850 160 A135 72 0 0 1 1120 160" strokeWidth={2} />
          {Array.from({ length: 11 }, (_, i) => 157 + i * 12.5).map(y => <line key={y} x1={848} y1={y} x2={975} y2={y} strokeWidth={2} />)}
          {Array.from({ length: 4 }, (_, i) => 244.5 + i * 12.5).map(y => <line key={`r${y}`} x1={998} y1={y} x2={1122} y2={y} strokeWidth={2} />)}
          <rect x={975} y={146} width={23} height={136} strokeWidth={3} /> <line x1={986} y1={152} x2={986} y2={276} strokeWidth={1.5} />
          <path d="M1000 238 L1040 226 L1048 208 L1066 204 L1100 190" strokeWidth={2} /> <line x1={1058} y1={168} x2={1058} y2={190} strokeWidth={1.5} />
        </g>
        {/* closet toilet */}
        <g fill="#ffffff" stroke="#94a3b8" strokeWidth={2}>
          <ellipse cx={643} cy={203} rx={12} ry={10} /> <rect x={620} y={195} width={14} height={16} rx={3} />
        </g>
        {/* panah evakuasi */}
        <g stroke={GREEN} strokeWidth={3} strokeLinecap="round" fill="none" markerEnd="url(#l4-arrow-head)">
          {[
            [260, 262, 260, 322], [505, 200, 505, 265], [597, 203, 597, 268], [1158, 211, 1158, 274], [1275, 210, 1275, 273],
            [1445, 405, 1385, 405], [420, 381, 487, 381], [795, 561, 795, 501], [895, 525, 895, 465], [1170, 561, 1170, 501],
            [610, 406, 680, 406], [697, 406, 768, 406], [783, 406, 855, 406],
            [1293, 406, 1222, 406], [1205, 406, 1135, 406], [1120, 406, 1052, 406], [1035, 406, 965, 406],
          ].map(([x1, y1, x2, y2]) => (<line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />))}
        </g>
        {/* percabangan koridor -> tangga */}
        <g stroke={GREEN} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M868 408 C893 408 912 398 912 380" />
          <path d="M958 408 C933 408 912 398 912 380" />
          <path d="M912 382 V362" />
          <path d="M903 372 L912 360 L921 372" />
        </g>
        {/* jalur evakuasi di dalam tangga */}
        <path d="M911 308 V135 Q911 125 921 125 H1048 Q1058 125 1058 135 V152" stroke={GREEN} strokeWidth={3} strokeLinecap="round" fill="none" markerEnd="url(#l4-arrow-head)" />
        {/* rambu tangga darurat */}
        <g>
          <rect x={890} y={311} width={42} height={28} fill={RED} rx={1} />
          <circle cx={902} cy={319} r={2.6} fill="#fff" />
          <path d="M902 323 L906 330 L901 335 M906 330 L912 327 M902 323 L897 329" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x={916} y={316} width={8} height={18} fill="none" stroke="#fff" strokeWidth={1.6} />
        </g>
        {/* APAR */}
        <g>
          <rect x={645} y={351} width={14} height={36} rx={5} fill={RED} />
          <path d="M649 351 V345 H658 V351" fill="none" stroke="#1f1f1f" strokeWidth={2.2} />
        </g>
        {/* posisi Anda */}
        <g>
          <ellipse cx={846} cy={392} rx={17} ry={8} fill="#fff" stroke={WALL} strokeWidth={2} />
          <circle cx={846} cy={364} r={5} fill="#1f1f1f" /> <path d="M839 390 V378 Q839 371 846 371 Q853 371 853 378 V390 Z" fill="#1f1f1f" />
        </g>
      </g>
    </svg>
  );
}

export default DenahL4LS;
export { DenahL4LS as FloorPlanSvg };
