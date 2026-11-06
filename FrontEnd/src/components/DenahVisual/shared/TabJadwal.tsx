'use client';

/**
 * Shared Jadwal (Schedule) Tab Component
 * Used in room detail pages across all buildings.
 */

import React, { useState } from 'react';
import { URUTAN_HARI, HARI_DARI_INDEX, type RoomInfo, type Hari } from './types';

export default function TabJadwal({ ruangan }: { ruangan: RoomInfo }) {
  const [hariAktif, setHariAktif] = useState<Hari>(HARI_DARI_INDEX[new Date().getDay()]);

  if (ruangan.jadwal.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50 p-6 text-center">
        <span className="mb-2 block text-3xl">📅</span>
        <p className="text-sm font-medium text-slate-500">Belum ada jadwal terdaftar untuk ruangan ini.</p>
      </div>
    );
  }

  const jadwalHariIni = ruangan.jadwal
    .filter((s) => s.hari === hariAktif)
    .sort((a, b) => a.mulai.localeCompare(b.mulai));

  return (
    <div className="space-y-5 pb-4">
      {/* Day selector pills */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-hide">
        {URUTAN_HARI.map((h) => (
          <button
            key={h}
            onClick={() => setHariAktif(h)}
            className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-all ${
              hariAktif === h
                ? 'bg-sky-600 text-white shadow-md shadow-sky-500/30'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {h}
          </button>
        ))}
      </div>

      {/* Schedule list */}
      {jadwalHariIni.length === 0 ? (
        <p className="rounded-xl border border-slate-100 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">
          Tidak ada kelas di hari {hariAktif}. Ruangan kosong! 🎉
        </p>
      ) : (
        <ul className="space-y-4">
          {jadwalHariIni.map((s) => (
            <li
              key={`${s.hari}-${s.mulai}`}
              className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-sky-300 hover:shadow-md p-5 pl-6"
            >
              <div className="absolute bottom-0 left-0 top-0 w-2 bg-sky-500" />
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-bold text-slate-800 text-base">{s.kegiatan}</h4>
                  <p className="text-xs font-semibold text-sky-600 mt-0.5">{s.kelas} · {s.prodi}</p>
                </div>
                <span className="rounded-md bg-sky-100 px-2 py-1 text-xs font-black text-sky-700 shrink-0">
                  {s.mulai} – {s.selesai}
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-400">Dosen</span>
                <span className="font-semibold text-slate-700">{s.dosen}</span>
                <span className="font-semibold text-slate-400">PJ Kelas</span>
                <span className="font-semibold text-slate-700">
                  {s.pj} <span className="text-sky-600 ml-1">({s.kontak})</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
