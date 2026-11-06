'use client';

/**
 * Denah Gedung LE - Lantai 2
 * MOBILE VIEW (Premium UI + Animasi Fullscreen)
 */

import React, { useState } from 'react';

// Data, SVG denah, legenda, daftar ruangan & popup di-import dari Web&TabLayout (Lantai 2)
import { DenahL2LE as FloorPlanSvg } from '../DenahL2LE/DenahL2LE';
import {
  FloorPlanLegend,
  RoomPopup,
  DaftarRuangan,
  ROOMS,
  type RoomCode
} from '../Web&Tab/Web&TabLayout';

export default function MobileLayout() {
  const [selectedCode, setSelectedCode] = useState<RoomCode | null>(null);
  const [zoom, setZoom] = useState(1.6);

  const selectedRoom = selectedCode ? ROOMS[selectedCode] : null;
  const ubahZoom = (d: number) => setZoom((z) => Math.min(3, Math.max(1, Math.round((z + d) * 10) / 10)));

  return (
    <div className="w-full min-h-screen flex flex-col space-y-4 p-4 bg-slate-50 pb-10">

      {/* Header Premium */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Gedung LE · Lt. 2</h2>
        <p className="text-sm font-medium text-slate-500 mt-1">Geser & ketuk ruangan untuk booking.</p>
      </div>

      {/* Area Denah (Zoomable) */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <FloorPlanLegend />
          <div className="flex shrink-0 gap-1">
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 active:bg-slate-100 font-bold" onClick={() => ubahZoom(-0.4)} disabled={zoom <= 1}>−</button>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 active:bg-slate-100 font-bold" onClick={() => ubahZoom(0.4)} disabled={zoom >= 3}>+</button>
          </div>
        </div>

        {/* SVG Container dgn Zoom */}
        <div className="overflow-auto rounded-xl bg-slate-50/50 border border-slate-100">
          <div style={{ width: `${zoom * 100}%` }}>
            <FloorPlanSvg
              selectedCode={selectedCode}
              onSelectRoom={(c) => setSelectedCode(c as RoomCode)}
              className="block h-auto w-full"
            />
          </div>
        </div>
      </div>

      {/* Daftar Ruangan List View */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 px-1 text-sm font-bold text-slate-800 uppercase tracking-wider">Daftar Ruangan</h3>
        <DaftarRuangan selected={selectedCode} onSelect={(c: any) => setSelectedCode(c)} grid />
      </div>

      {/* Popup Premium (Fullscreen di Mobile dgn Animasi) */}
      {selectedRoom && (
        <RoomPopup
          key={selectedRoom.kode}
          ruangan={selectedRoom}
          onClose={() => setSelectedCode(null)}
        />
      )}
    </div>
  );
}
