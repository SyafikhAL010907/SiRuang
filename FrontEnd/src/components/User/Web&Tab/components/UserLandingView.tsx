'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Building2,
  LayoutGrid,
  DoorClosed,
  CalendarDays,
  ArrowRight,
  Clock,
} from 'lucide-react';
import DenahGedungGrid from '../../Shared/Cards/DenahGedungGrid';
import { useMyProfile, loadMyProfile } from '@/lib/profileStore';
import { getAvatarSrc } from '@/lib/avatarValidation';

export interface UserLandingViewProps {
  userName: string;
  userGmail?: string;
  /** Foto profil (opsional). Kosong = logo SiRuang. */
  avatarSrc?: string;
  unreadCount: number;
  /**
   * Dipanggil saat CTA "Buka chat sekarang" diklik.
   * Handler dari WebTabLayout harus: setIsChatOpen(true) + (kalau ada roomId) markAsRead + setUnreadCount(0)
   */
  onOpenChat: () => void;
  /** Link ke halaman profil (diisi nanti). Kosong = tombol tidak melakukan apa-apa. */
  onOpenProfile?: () => void;
}

// Lebar jalur yang DIPAKAI BERSAMA oleh header (search + profil) dan isi dashboard,
// sama persis dengan AdminDashboardView.
const CONTENT_LANE = 'w-full max-w-[1400px] mx-auto';

export const UserLandingView: React.FC<UserLandingViewProps> = ({
  userName,
  userGmail,
  avatarSrc,
  unreadCount,
  onOpenChat,
  onOpenProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Profil tersinkronisasi lewat profileStore global
  const { profile, status } = useMyProfile();
  useEffect(() => {
    loadMyProfile();
  }, []);

  const displayName = profile?.fullName || userName;
  const displayAvatar = getAvatarSrc(profile?.avatarUrl || avatarSrc);

  return (
    <div
      className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F8FAFB]"
      style={{
        backgroundImage: `url('/Batik.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* TOP BAR: SEARCH + PROFIL */}
      <header className="px-8 py-2.5 bg-white/80 backdrop-blur-md border-b border-slate-100 z-10 shrink-0">
        <div className={`${CONTENT_LANE} flex items-center justify-between gap-6`}>
          <div className="flex-1 min-w-0 max-w-3xl relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau kode ruangan..."
              className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#588CBC] focus:ring-4 focus:ring-[#588CBC]/10 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={onOpenProfile}
            title="Buka Profil"
            className="flex items-center gap-3 shrink-0 cursor-pointer p-1 -mr-1 rounded-2xl hover:bg-slate-100/70 active:scale-95 transition-all group text-left"
          >
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden group-hover:border-[#588CBC] transition-all">
              {status === 'ready' || status === 'error' || profile?.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={displayAvatar}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/LogoSiRuangPolos.png';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-slate-200 animate-pulse" />
              )}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-black text-slate-800 group-hover:text-[#588CBC] transition-colors">
                {displayName}
              </span>
              {userGmail && (
                <span className="text-[10px] font-medium text-slate-400">
                  {userGmail}
                </span>
              )}
            </div>
          </button>
        </div>
      </header>

      {/* CONTENT (Ngepas 1 Layar Tanpa Scroll) */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-8 py-4 lg:py-5">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${CONTENT_LANE} flex flex-col gap-3.5 lg:gap-4`}
        >
          {/* DASHBOARD HEADER */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-1 bg-[#588CBC] rounded-full"></div>
              <span className="text-[9px] font-black text-[#183449] uppercase tracking-[0.25em]">User Dashboard</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">Selamat Datang, {displayName}!</h2>
            <p className="text-xs text-slate-400 font-medium max-w-2xl leading-relaxed">
              Tanyakan seputar perkuliahan dan ruangan kepada Admin, atau lihat denah gedung kampus di bawah ini.
            </p>
          </div>

          {/* STATS OVERVIEW - 4 KARTU PERSIS GAMBAR 2 (COMPACT) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 lg:mt-5">
            {/* Card 1: Total Ruangan */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center shrink-0">
                <Building2 size={20} />
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[11px] font-semibold text-slate-500">Total Ruangan</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-slate-800">48</span>
                  <span className="text-[10px] font-medium text-slate-400">ruangan</span>
                </div>
              </div>
            </div>

            {/* Card 2: Tersedia */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                <LayoutGrid size={20} />
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[11px] font-semibold text-slate-500">Tersedia</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-slate-800">16</span>
                  <span className="text-[10px] font-medium text-slate-400">ruangan</span>
                </div>
              </div>
            </div>

            {/* Card 3: Sedang Digunakan */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <DoorClosed size={20} />
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[11px] font-semibold text-slate-500">Sedang Digunakan</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-slate-800">32</span>
                  <span className="text-[10px] font-medium text-slate-400">ruangan</span>
                </div>
              </div>
            </div>

            {/* Card 4: Booking Mendatang */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex items-center justify-between gap-2.5 relative overflow-hidden">
              <div className="flex flex-col justify-between h-full min-w-0">
                <div className="flex items-center gap-1.5">
                  <CalendarDays size={12} className="text-slate-700 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800 tracking-tight">Booking Mendatang</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-snug">
                  Kamu belum memiliki booking mendatang.
                </p>
                <button
                  type="button"
                  className="text-[10px] font-bold text-[#0284c7] hover:text-[#0369a1] flex items-center gap-1 mt-1 transition-colors cursor-pointer w-fit"
                >
                  Buat booking sekarang <ArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>

              {/* Decorative booking badge icon (kanan) */}
              <div className="relative shrink-0 flex items-center justify-center ml-1">
                <div className="w-11 h-9 rounded-lg bg-slate-50 border border-slate-200/70 p-1 flex flex-col justify-between shadow-xs">
                  <div className="w-full h-2 bg-sky-400 rounded-xs" />
                  <div className="flex gap-0.5">
                    <div className="w-2 h-1 bg-slate-200 rounded-xs" />
                    <div className="w-2 h-1 bg-slate-200 rounded-xs" />
                    <div className="w-2 h-1 bg-slate-200 rounded-xs" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <Clock size={8} />
                </div>
              </div>
            </div>
          </div>

          {/* DENAH GEDUNG DENGAN FOTO BACKGROUND PENUH SESUAI DESAIN */}
          <DenahGedungGrid variant="web" />
        </motion.div>
      </div>
    </div>
  );
};

export default UserLandingView;