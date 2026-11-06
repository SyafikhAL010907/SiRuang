'use client';

/**
 * Shared Fasilitas (Facilities) Tab Component
 * Used in room detail pages across all buildings.
 */

import React from 'react';
import type { RoomInfo } from './types';

export default function TabFasilitas({ ruangan }: { ruangan: RoomInfo }) {
  return (
    <div className="space-y-5">
      {(ruangan.kapasitas || ruangan.keterangan) && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          {ruangan.kapasitas && (
            <p className="font-bold text-blue-900">👥 Kapasitas Maksimal: {ruangan.kapasitas} Orang</p>
          )}
          {ruangan.keterangan && (
            <p className="mt-1 text-xs text-blue-700">{ruangan.keterangan}</p>
          )}
        </div>
      )}
      <div>
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          Daftar Fasilitas
        </h4>
        {ruangan.fasilitas.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
            Belum ada data fasilitas.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ruangan.fasilitas.map((f) => (
              <li
                key={f}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                  ✔️
                </div>
                <span className="text-sm font-semibold text-slate-700">{f}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
