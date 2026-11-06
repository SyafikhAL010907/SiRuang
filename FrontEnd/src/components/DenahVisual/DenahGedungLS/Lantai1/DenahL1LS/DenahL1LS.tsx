'use client';

import React from 'react';

const NON_BOOKABLE = new Set(["RUANG_DOSEN"]);

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

function RoomLabel({ x, y, lines, size = 22 }: { x: number; y: number; lines: string[]; size?: number }) {
  return (
    <text x={x} textAnchor="middle" fontSize={size} fill={TEXT} className="pointer-events-none select-none font-sans font-semibold">
      {lines.map((line, i) => (<tspan key={line} x={x} y={y + i * 26} dominantBaseline="central">{line}</tspan>))}
    </text>
  );
}

export interface DenahL1LSProps {
  selectedCode: string | null;
  onSelectRoom: (k: string) => void;
  className?: string;
}

export function DenahL1LS({ selectedCode, onSelectRoom, className }: DenahL1LSProps) {
  const common = (kode: string) => ({ kode, selected: selectedCode === kode, muted: NON_BOOKABLE.has(kode), onSelect: onSelectRoom });
  return (
    <svg viewBox="0 130 1600 610" className={className}>
      <defs><marker id="l1-arrow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill={GREEN} /></marker></defs>

      {/* ================= LANTAI (koridor + area tangga) ================= */}
      <path d="M357 395 H1582 V490 H357 Z" fill={FLOOR} />
      <path d="M710 145 H975 V395 H710 Z" fill={FLOOR} />
      <path d="M10 395 H25 V490 H10 Z" fill="#ffffff" />

      {/* ================= RUANGAN (bisa diklik) ================= */}

      {/* ===== KODE RUANGAN: R107 (bekas R. 302) ===== */}
      <RoomHit {...common('R107')} nama="R. 107 Kuliah" d="M10 145 H425 V395 H10 Z"><RoomLabel x={176} y={268} lines={['R. 107', 'Kuliah']} /></RoomHit>

      {/* ===== KODE RUANGAN: RUANG_DOSEN (bekas Toilet Wanita + Toilet Pria, digabung) ===== */}
      <RoomHit {...common('RUANG_DOSEN')} nama="Ruang Dosen" d="M425 145 H710 V395 H425 Z"><RoomLabel x={567} y={222} lines={['Ruang', 'Dosen']} /></RoomHit>

      {/* ===== KODE RUANGAN: R102 (bekas R. 303 + Lab Multimedia, digabung = kapasitas 2 kelas) ===== */}
      <RoomHit {...common('R102')} nama="R. 102 Kuliah" d="M975 145 H1582 V395 H975 Z"><RoomLabel x={1278} y={257} lines={['R. 102', 'Kuliah']} /></RoomHit>

      {/* ===== KODE RUANGAN: LAB_BENGKEL_MEKANIK_LISTRIK (bekas R. Teknisi Gedung) ===== */}
      <RoomHit {...common('LAB_BENGKEL_MEKANIK_LISTRIK')} nama="Lab Bengkel Mekanik Dan Instalasi Listrik" d="M25 395 H357 V490 H25 Z"><RoomLabel x={160} y={430} size={18} lines={['Lab Bengkel Mekanik', 'Dan Instalasi Listrik']} /></RoomHit>

      {/* ===== KODE RUANGAN: R106 (bekas R. 307) ===== */}
      <RoomHit {...common('R106')} nama="R. 106 Kuliah" d="M10 490 H433 V725 H10 Z"><RoomLabel x={187} y={593} lines={['R. 106', 'Kuliah']} /></RoomHit>

      {/* ===== KODE RUANGAN: LAB_GAMBAR_TEKNIK (bekas R. 306) ===== */}
      <RoomHit {...common('LAB_GAMBAR_TEKNIK')} nama="Lab Gambar Teknik" d="M433 490 H710 V725 H433 Z"><RoomLabel x={557} y={583} lines={['Lab Gambar', 'Teknik']} /></RoomHit>

      {/* ===== KODE RUANGAN: LAB_PERANCANGAN (bekas R. 305) ===== */}
      <RoomHit {...common('LAB_PERANCANGAN')} nama="Lab Perancangan" d="M710 490 H978 V725 H710 Z"><RoomLabel x={828} y={586} lines={['Lab', 'Perancangan']} /></RoomHit>

      {/* ===== KODE RUANGAN: LAB_PNEUMATIK_HIDROLIK (bagian kiri bekas R. 304, dekat tangga) ===== */}
      <RoomHit {...common('LAB_PNEUMATIK_HIDROLIK')} nama="Lab Pneumatik Hidrolik" d="M978 490 H1280 V725 H978 Z"><RoomLabel x={1129} y={591} lines={['Lab Pneumatik', 'Hidrolik']} /></RoomHit>

      {/* ===== KODE RUANGAN: R101 (bagian kanan bekas R. 304, pintunya hadap-hadapan dengan R102) ===== */}
      <RoomHit {...common('R101')} nama="R. 101 Kuliah" d="M1280 490 H1582 V725 H1280 Z"><RoomLabel x={1500} y={591} lines={['R. 101', 'Kuliah']} /></RoomHit>

      {/* ================= DINDING & PINTU ================= */}
      <g className="pointer-events-none" fill="none" stroke={WALL}>
        {/* Dinding. Ujung kanan koridor (x=1582, y 395-490) SENGAJA TERBUKA = pintu masuk */}
        <path d="M10 145 H1582 M10 725 H1582 M10 145 V725 M1582 145 V395 M1582 490 V725 M10 395 H363 M421 395 H637 M690 395 H710 M975 395 H1390 M1442 395 H1582 M10 490 H365 M425 490 H450 M502 490 H816 M868 490 H990 M1042 490 H1390 M1442 490 H1582 M425 145 V395 M710 145 V395 M975 145 V395 M25 395 V490 M357 395 V405 M357 485 V490 M433 490 V725 M710 490 V725 M978 490 V725 M1280 490 V725" strokeWidth={5} />
        {/* Ambang pintu */}
        <path d="M363 395 H421 M637 395 H690 M1390 395 H1442 M365 490 H425 M450 490 H502 M816 490 H868 M990 490 H1042 M1390 490 H1442" strokeWidth={1.5} opacity={0.55} />
        {/* Daun pintu */}
        <path d="M419 395 V345 M687 395 V345 M1439 395 V345 M423 490 V560 M500 490 V545 M866 490 V540 M993 490 V540 M1439 490 V540" strokeWidth={2.5} />
        <rect x={353} y={405} width={8} height={80} fill="#ffffff" strokeWidth={2} />
      </g>

      {/* ================= DETAIL (tangga, panah evakuasi, simbol) ================= */}
      <g className="pointer-events-none">
        <g fill="none" stroke={WALL}>
          <path d="M713 208 A131 63 0 0 1 975 208" strokeWidth={2} />
          {Array.from({ length: 10 }, (_, i) => 195 + i * 15).map(y => <line key={y} x1={713} y1={y} x2={829} y2={y} strokeWidth={2} />)}
          <rect x={829} y={200} width={26} height={135} strokeWidth={3} /> <line x1={842} y1={206} x2={842} y2={329} strokeWidth={1.5} />
          <path d="M855 290 L905 278 L912 262 L970 238" strokeWidth={2} /> <line x1={910} y1={214} x2={910} y2={236} strokeWidth={1.5} />
        </g>
        {/* Label pintu masuk (ujung kanan koridor) - hapus baris ini kalau tidak mau ada teksnya */}
        <text x={1500} y={420} textAnchor="middle" fontSize={16} fill="#64748b" className="select-none font-sans font-semibold">Pintu Masuk</text>
        <g stroke={GREEN} strokeWidth={3} strokeLinecap="round" fill="none" markerEnd="url(#l1-arrow-head)">
          {[[392, 272, 392, 334], [670, 270, 670, 334], [1416, 272, 1416, 334], [282, 432, 336, 432], [403, 617, 403, 567], [476, 607, 476, 549], [842, 607, 842, 547], [1013, 605, 1013, 545], [1416, 607, 1416, 547], [413, 458, 470, 458], [487, 458, 556, 458], [568, 458, 637, 458], [650, 458, 716, 458], [1530, 452, 1464, 452], [1448, 452, 1382, 452], [1366, 452, 1300, 452], [1284, 452, 1218, 452], [1202, 452, 1156, 452], [1138, 452, 1072, 452], [1056, 452, 986, 452], [975, 452, 906, 452], [890, 452, 824, 452]].map(([x1, y1, x2, y2]) => (<line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />))}
        </g>
        <path d="M771 360 V190 Q771 180 781 180 H900 Q910 180 910 190 V204" stroke={GREEN} strokeWidth={3} strokeLinecap="round" fill="none" markerEnd="url(#l1-arrow-head)" />
        <g>
          <rect x={520} y={411} width={14} height={30} rx={5} fill={RED} />
          <path d="M524 411 V405 H533 V411" fill="none" stroke="#1f1f1f" strokeWidth={2.2} />
        </g>
        <g>
          <ellipse cx={735} cy={459} rx={17} ry={9} fill="#fff" stroke={WALL} strokeWidth={2} />
          <circle cx={735} cy={436} r={5} fill="#1f1f1f" /> <path d="M728.5 457 V447 Q728.5 441.5 735 441.5 Q741.5 441.5 741.5 447 V457 Z" fill="#1f1f1f" />
        </g>
      </g>
    </svg>
  );
}

export default DenahL1LS;
export { DenahL1LS as FloorPlanSvg };
