'use client';

/**
 * Fasilitas - Gedung LS Lantai 1
 * Komponen tunggal responsive (Mobile, Tablet, Desktop)
 */

import React from 'react';
import Link from 'next/link';
import { ROOMS } from '../Web&Tab/Web&TabLayout';

export default function Fasilitas() {
  const rooms = Object.values(ROOMS);

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-8 min-h-screen bg-slate-50/50 space-y-4 md:space-y-6">
      <header className="rounded-2xl border border-slate-100 bg-white p-5 md:p-6 shadow-sm">
        <Link
          href="/denah-ls/lantai1"
          className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-sky-600 hover:text-sky-700 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Kembali ke Denah Lantai 1
        </Link>
        <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
          Fasilitas · Gedung LS · Lantai 1
        </h2>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Daftar fasilitas di semua ruangan lantai 1.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((r) => (
          <Link
            key={r.kode}
            href={`/denah-ls/lantai1/${encodeURIComponent(r.kode)}`}
            className="group flex items-center md:items-start justify-between md:flex-col rounded-2xl border border-slate-200/60 bg-white p-4 md:p-5 shadow-sm transition-all hover:border-sky-300 hover:shadow-md active:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <span
                className={`h-3 w-3 shrink-0 rounded-full ${
                  r.bookable ? 'bg-sky-500 shadow-sm shadow-sky-400' : 'bg-slate-300'
                }`}
              />
              <div>
                <h3 className="font-bold text-slate-800 group-hover:text-sky-700 transition-colors">
                  {r.nama}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {r.fasilitas.length} fasilitas terdaftar
                </p>
              </div>
            </div>
            <svg
              className="h-5 w-5 text-slate-400 md:hidden shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}

export { Fasilitas as MainFasilitas };
