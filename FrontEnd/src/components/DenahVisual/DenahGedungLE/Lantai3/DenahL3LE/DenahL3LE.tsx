'use client';

import React from 'react';

const NON_BOOKABLE = new Set(["TOILET_WANITA","TOILET_PRIA","R_TEKNISI"]);

const WALL = '#3a302e';
const FLOOR = '#eef3f2';
const GREEN = '#5cb82f';
const RED = '#d93a35';
const TEXT = '#3f3f46';

function RoomHit({ kode, nama, d, selected, onSelect, children }: any) {
  return (
    <g role="button" tabIndex={0} aria-label={`${nama}`} className="group cursor-pointer outline-none" onClick={() => onSelect(kode)}>
      <path d={d} strokeWidth={5} className={selected ? 'fill-sky-100 stroke-transparent' : 'fill-white stroke-transparent group-hover:fill-sky-50 transition-colors'} />
      {children}
    </g>
  );
}

function RoomLabel({ x, y, lines }: { x: number; y: number; lines: string[] }) {
  return (
    <text x={x} textAnchor="middle" fontSize={22} fill={TEXT} className="pointer-events-none select-none font-sans font-semibold">
      {lines.map((line, i) => (<tspan key={line} x={x} y={y + i * 26} dominantBaseline="central">{line}</tspan>))}
    </text>
  );
}

export interface DenahL3LEProps {
  selectedCode: string | null;
  onSelectRoom: (k: string) => void;
  className?: string;
}

export function DenahL3LE({ selectedCode, onSelectRoom, className }: DenahL3LEProps) {
  const common = (kode: string) => ({ kode, selected: selectedCode === kode, onSelect: onSelectRoom });
  return (
    <svg viewBox="0 130 1600 610" className={className}>
      <defs><marker id="l3-arrow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill={GREEN} /></marker></defs>

      <path d="M357 395 H1242 V490 H357 Z" fill={FLOOR} />
      <path d="M710 145 H975 V395 H710 Z" fill={FLOOR} />
      <path d="M10 395 H25 V490 H10 Z" fill="#ffffff" />

      <RoomHit {...common('R302')} nama="R. 302 Kuliah" d="M10 145 H425 V395 H10 Z"><RoomLabel x={176} y={268} lines={['R. 302', 'Kuliah']} /></RoomHit>
      <RoomHit {...common('TOILET_WANITA')} nama="Toilet Wanita" d="M425 145 H567 V395 H425 Z"><RoomLabel x={489} y={222} lines={['TOILET', 'WANITA']} /></RoomHit>
      <RoomHit {...common('TOILET_PRIA')} nama="Toilet Pria" d="M567 145 H710 V395 H567 Z"><RoomLabel x={627} y={223} lines={['TOILET', 'PRIA']} /></RoomHit>
      <RoomHit {...common('R303')} nama="R. 303 Kuliah" d="M975 145 H1242 V395 H975 Z"><RoomLabel x={1100} y={238} lines={['R. 303', 'Kuliah']} /></RoomHit>
      <RoomHit {...common('LAB_MULTIMEDIA')} nama="R. Lab Multimedia" d="M1242 145 H1582 V385 H1556 V490 H1242 Z"><RoomLabel x={1395} y={292} lines={['R. Lab Multimedia']} /></RoomHit>
      <RoomHit {...common('R_TEKNISI')} nama="R. Teknisi Gedung" d="M25 395 H357 V490 H25 Z"><RoomLabel x={175} y={448} lines={['R. Teknisi Gedung']} /></RoomHit>
      <RoomHit {...common('R307')} nama="R. 307 Kuliah" d="M10 490 H433 V725 H10 Z"><RoomLabel x={187} y={593} lines={['R. 307', 'Kuliah']} /></RoomHit>
      <RoomHit {...common('R306')} nama="R. 306 Kuliah" d="M433 490 H710 V725 H433 Z"><RoomLabel x={557} y={583} lines={['R. 306', 'Kuliah']} /></RoomHit>
      <RoomHit {...common('R305')} nama="R. 305 Kuliah" d="M710 490 H978 V725 H710 Z"><RoomLabel x={828} y={586} lines={['R. 305', 'Kuliah']} /></RoomHit>
      <RoomHit {...common('R304')} nama="R. 304 Kuliah" d="M978 490 H1582 V725 H978 Z"><RoomLabel x={1156} y={591} lines={['R. 304', 'Kuliah']} /></RoomHit>

      <g className="pointer-events-none" fill="none" stroke={WALL}>
        <path d="M10 145 H1582 M10 725 H1582 M10 145 V725 M1582 145 V385 H1556 V490 M1582 490 V725 M10 395 H363 M421 395 H445 M497 395 H637 M690 395 H710 M975 395 H985 M1042 395 H1242 M10 490 H365 M425 490 H645 M697 490 H915 M968 490 H990 M1042 490 H1582 M425 145 V395 M567 145 V395 M710 145 V395 M975 145 V395 M1242 145 V417 M1242 480 V490 M25 395 V490 M357 395 V405 M357 485 V490 M433 490 V725 M710 490 V725 M978 490 V725" strokeWidth={5} />
        <path d="M363 395 H421 M445 395 H497 M637 395 H690 M985 395 H1042 M365 490 H425 M645 490 H697 M915 490 H968 M990 490 H1042 M1242 417 V480" strokeWidth={1.5} opacity={0.55} />
        <path d="M419 395 V345 M447 395 V345 M687 395 V345 M990 395 V338 M1242 417 H1297 M423 490 V560 M695 490 V545 M965 490 V540 M993 490 V540" strokeWidth={2.5} />
        <rect x={353} y={405} width={8} height={80} fill="#ffffff" strokeWidth={2} />
      </g>
      <g className="pointer-events-none">
        <g fill="none" stroke={WALL}>
          <path d="M713 208 A131 63 0 0 1 975 208" strokeWidth={2} />
          {Array.from({ length: 10 }, (_, i) => 195 + i * 15).map(y => <line key={y} x1={713} y1={y} x2={829} y2={y} strokeWidth={2} />)}
          <rect x={829} y={200} width={26} height={135} strokeWidth={3} /> <line x1={842} y1={206} x2={842} y2={329} strokeWidth={1.5} />
          <path d="M855 290 L905 278 L912 262 L970 238" strokeWidth={2} /> <line x1={910} y1={214} x2={910} y2={236} strokeWidth={1.5} />
        </g>
        <g fill="#ffffff" stroke="#94a3b8" strokeWidth={2}>
          <ellipse cx={538} cy={205} rx={11} ry={9} /> <rect x={534} y={188} width={22} height={10} rx={3} />
          <ellipse cx={683} cy={204} rx={11} ry={9} /> <rect x={679} y={187} width={22} height={10} rx={3} />
        </g>
        <g stroke={GREEN} strokeWidth={3} strokeLinecap="round" fill="none" markerEnd="url(#l3-arrow-head)">
          {[[392, 272, 392, 334], [461, 272, 461, 336], [670, 270, 670, 334], [1006, 262, 1006, 326], [1385, 430, 1327, 430], [272, 432, 334, 432], [403, 617, 403, 567], [675, 607, 675, 549], [946, 607, 946, 547], [1013, 605, 1013, 545], [413, 458, 470, 458], [487, 458, 556, 458], [568, 458, 637, 458], [650, 458, 716, 458], [1138, 452, 1072, 452], [1056, 452, 986, 452], [975, 452, 906, 452], [890, 452, 824, 452]].map(([x1, y1, x2, y2]) => (<line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />))}
        </g>
        <path d="M771 360 V190 Q771 180 781 180 H900 Q910 180 910 190 V204" stroke={GREEN} strokeWidth={3} strokeLinecap="round" fill="none" markerEnd="url(#l3-arrow-head)" />
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

export default DenahL3LE;
export { DenahL3LE as FloorPlanSvg };
