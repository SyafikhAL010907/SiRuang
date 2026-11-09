'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  Plus,
  ArrowRight,
} from 'lucide-react';

export interface MobileBookingViewProps {
  onGoToDenah?: () => void;
}

export const MobileBookingView: React.FC<MobileBookingViewProps> = ({ onGoToDenah }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'done'>('all');

  const dummyBookings = [
    {
      id: 'BK-2026-001',
      room: 'Lab Perancangan Listrik (R.102)',
      building: 'Gedung L Elektro - Lantai 1',
      date: 'Senin, 16 Nov 2026',
      time: '08.00 - 10.30 WIB',
      purpose: 'Praktikum Sistem Mikrokontroler & IoT',
      status: 'pending',
      statusLabel: 'Menunggu Konfirmasi',
      statusColor: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      id: 'BK-2026-002',
      room: 'Ruang Teori 304 (R.304)',
      building: 'Gedung SFD Tower A - Lantai 3',
      date: 'Kamis, 12 Nov 2026',
      time: '13.00 - 15.30 WIB',
      purpose: 'Kuliah Pengganti Metode Numerik',
      status: 'approved',
      statusLabel: 'Disetujui Admin',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  ];

  const filteredBookings = dummyBookings.filter((b) => {
    if (activeFilter === 'all') return true;
    return b.status === activeFilter;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full bg-[#F8FAFB] overflow-hidden select-none"
      style={{
        backgroundImage: `url('/Batik.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Curved Header */}
      <div className="bg-linear-to-br from-[#183449] to-[#2B5474] rounded-b-[36px] px-6 pt-10 pb-7 shadow-xl relative overflow-hidden shrink-0 z-20">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#588CBC]/20 rounded-full blur-3xl pointer-events-none" />
        <header className="relative z-10 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays size={16} className="text-[#588CBC]" />
            <span className="text-[9px] font-black text-sky-200 uppercase tracking-[0.25em]">
              Reservasi Ruangan
            </span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight leading-tight">
            Riwayat &amp; Pengajuan Booking
          </h2>
          <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
            Pantau status verifikasi peminjaman ruangan dan histori booking Anda.
          </p>
        </header>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 sm:px-6 pt-4 pb-36 relative z-10">
        <div className="flex flex-col gap-4">

          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 p-1 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-100 shadow-xs overflow-x-auto scrollbar-hide">
            {[
              { id: 'all', label: 'Semua (2)' },
              { id: 'pending', label: 'Menunggu (1)' },
              { id: 'approved', label: 'Disetujui (1)' },
              { id: 'done', label: 'Selesai (0)' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === f.id
                    ? 'bg-[#183449] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Booking Cards List */}
          {filteredBookings.length > 0 ? (
            filteredBookings.map((bk) => (
              <div
                key={bk.id}
                className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-100 p-4.5 shadow-md shadow-slate-200/30 flex flex-col gap-3"
              >
                {/* Card Header: Code & Status */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-[#588CBC]" />
                    <span className="text-[10px] font-black text-slate-500 tracking-wider">
                      {bk.id}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${bk.statusColor}`}
                  >
                    {bk.statusLabel}
                  </span>
                </div>

                {/* Card Body */}
                <div className="flex flex-col gap-1.5">
                  <h4 className="text-sm font-black text-slate-800 tracking-tight">
                    {bk.room}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <MapPin size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{bk.building}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <Clock size={12} className="text-slate-400 shrink-0" />
                    <span>{bk.date} • {bk.time}</span>
                  </div>
                </div>

                {/* Purpose Note */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-medium text-slate-600">
                  <span className="font-bold text-slate-700">Keperluan: </span>
                  {bk.purpose}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-100 p-8 text-center flex flex-col items-center justify-center shadow-sm">
              <AlertCircle size={32} className="text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">Tidak ada pengajuan pada filter ini</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Pilih filter Semua untuk melihat seluruh data.</p>
            </div>
          )}

          {/* CTA Pengajuan Baru */}
          <div className="bg-linear-to-br from-[#183449] to-[#2B5474] rounded-3xl p-5 text-white shadow-xl shadow-[#183449]/20 flex flex-col gap-3">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-200">
                Peminjaman Baru
              </span>
              <h4 className="text-sm font-black text-white mt-1">
                Ingin Mengajukan Peminjaman Ruangan?
              </h4>
              <p className="text-[11px] text-slate-300 font-medium leading-relaxed mt-1">
                Pilih ruangan yang tersedia langsung melalui denah interaktif, cek jadwalnya, lalu ajukan reservasi.
              </p>
            </div>

            <button
              type="button"
              onClick={onGoToDenah}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 active:scale-[0.98] text-[#183449] rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <span>Buka Denah Ruangan</span>
              <ArrowRight size={13} />
            </button>
          </div>

        </div>
      </div>
    </motion.div>
  );
};

export default MobileBookingView;

