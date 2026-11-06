'use client';

/**
 * Shared Room Detail Page Component
 * Full-page view of a room with Jadwal, Fasilitas, and Booking tabs.
 * Used by all buildings and floors via dynamic route [ruang]/page.tsx.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import type { RoomInfo } from './types';
import TabJadwal from './TabJadwal';
import TabFasilitas from './TabFasilitas';
import TabBooking from './TabBooking';

type Tab = 'jadwal' | 'fasilitas' | 'booking';

interface RoomDetailPageProps {
  ruangan: RoomInfo;
  gedung: string;      // e.g. "Gedung LE"
  lantai: string;      // e.g. "Lantai 1"
  backHref: string;    // e.g. "/denah-le/lantai1"
}

export default function RoomDetailPage({ ruangan, gedung, lantai, backHref }: RoomDetailPageProps) {
  const [tab, setTab] = useState<Tab>('jadwal');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'jadwal', label: 'Jadwal', icon: '📅' },
    { id: 'fasilitas', label: 'Fasilitas', icon: '🏗️' },
    { id: 'booking', label: 'Booking', icon: '📝' },
  ];

  return (
    <div className="w-full min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-linear-to-br from-blue-600 via-sky-500 to-cyan-400 px-4 pb-8 pt-6 sm:px-8 sm:pt-8">
        <div className="mx-auto max-w-4xl">
          {/* Back button */}
          <Link
            href={backHref}
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/25"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Kembali ke Denah
          </Link>

          {/* Room info */}
          <div className="mt-2">
            <span className="mb-2 inline-block rounded-md bg-white/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">
              {ruangan.kode} · {gedung} · {lantai}
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              {ruangan.nama}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${ruangan.bookable
                    ? 'bg-emerald-400/20 text-emerald-100'
                    : 'bg-rose-400/20 text-rose-100'
                  }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${ruangan.bookable ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                />
                {ruangan.bookable ? 'Bisa Dibooking' : 'Tidak Bisa Dibooking'}
              </span>
              {ruangan.kapasitas && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
                  👥 {ruangan.kapasitas} Orang
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab navigation + content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-8">
        {/* Tab pills - stuck to header area */}
        <div className="-mt-5 mb-6 rounded-2xl border border-slate-200/60 bg-white p-1.5 shadow-lg">
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-xl py-3 text-sm font-bold transition-all ${tab === t.id
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-500/30'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
              >
                <span className="mr-1.5">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm sm:p-8 mb-8">
          {tab === 'jadwal' && <TabJadwal ruangan={ruangan} />}
          {tab === 'fasilitas' && <TabFasilitas ruangan={ruangan} />}
          {tab === 'booking' && <TabBooking ruangan={ruangan} />}
        </div>
      </div>
    </div>
  );
}
