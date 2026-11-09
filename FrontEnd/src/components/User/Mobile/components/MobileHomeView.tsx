'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Building2,
  LayoutGrid,
  DoorClosed,
  CalendarDays,
  ArrowRight,
  MessageCircle,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import DenahGedungGrid from '../../Shared/Cards/DenahGedungGrid';
import Avatar from '@/components/Shared/Avatar';
import { useMyProfile, loadMyProfile } from '@/lib/profileStore';
import { getAvatarSrc } from '@/lib/avatarValidation';

export interface MobileHomeViewProps {
  userName: string;
  userGmail?: string;
  avatarSrc?: string;
  unreadCount: number;
  onOpenChat: () => void;
  onOpenChatDosen?: () => void;
  onOpenProfile?: () => void;
}

export const MobileHomeView: React.FC<MobileHomeViewProps> = ({
  userName,
  userGmail,
  avatarSrc,
  unreadCount,
  onOpenChat,
  onOpenChatDosen,
  onOpenProfile,
}) => {
  // Profil tersinkronisasi lewat profileStore global
  const { profile, status } = useMyProfile();
  useEffect(() => {
    loadMyProfile();
  }, []);

  const displayName = profile?.fullName || userName;
  const displayAvatar = getAvatarSrc(profile?.avatarUrl || avatarSrc);

  const handleDosenClick = () => {
    if (onOpenChatDosen) {
      onOpenChatDosen();
    } else {
      alert('Chat Dosen (Demo):\n\nFitur konsultasi langsung dengan dosen pengampu mata kuliah perkuliahan Anda saat ini sedang dalam pengembangan.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-[#F8FAFB] overflow-hidden select-none"
      style={{
        backgroundImage: `url('/Batik.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Curved Header Section (z-30) */}
      <div className="bg-linear-to-br from-[#183449] to-[#2B5474] rounded-b-[36px] px-6 pt-7 pb-8 shadow-2xl relative overflow-hidden shrink-0 z-30">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#588CBC]/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute -bottom-5 -left-5 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <header className="relative z-10 flex flex-col gap-4">
          {/* Top Bar: Logo & Profile Button */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-1.5 shadow-lg"
              >
                <Image
                  src="/LogoSiRuangPolos.png"
                  alt="Logo SiRuang"
                  width={36}
                  height={36}
                  className="drop-shadow-md object-contain"
                />
              </motion.div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-white tracking-tight uppercase leading-none">
                  SiRuang UNJ
                </span>
                <span className="text-[8px] font-bold text-[#588CBC] uppercase tracking-widest mt-1">
                  Portal Mahasiswa
                </span>
              </div>
            </div>

            {/* Profile Avatar Button */}
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-2 p-1 pl-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-[11px] font-bold text-white max-w-[90px] truncate">
                {displayName.split(' ')[0]}
              </span>
              <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 overflow-hidden shrink-0">
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
                  <div className="w-full h-full bg-white/30 animate-pulse" />
                )}
              </div>
            </button>
          </div>

          {/* Welcome Text */}
          <div className="mt-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-1 bg-[#588CBC] rounded-full" />
              <span className="text-[9px] font-black text-sky-200 uppercase tracking-[0.25em]">
                User Dashboard
              </span>
            </div>
            <motion.h1
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-2xl font-black text-white tracking-tight leading-tight"
            >
              Selamat Datang, <span className="text-[#588CBC]">{displayName}!</span>
            </motion.h1>
            <p className="text-[11px] text-slate-300 font-medium leading-relaxed mt-1 line-clamp-2">
              Tanyakan seputar perkuliahan dan ruangan kepada Admin, atau lihat denah gedung kampus di bawah ini.
            </p>
          </div>
        </header>
      </div>

      {/* Scrollable Content Area — Clean padding (pt-5) tanpa tumpang tindih */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 sm:px-6 pt-5 pb-36 relative z-10">
        <div className="flex flex-col gap-5">

          {/* 4 STATS OVERVIEW CARDS (2x2 Grid) */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Card 1: Total Ruangan */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center shrink-0">
                <Building2 size={18} />
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[10px] font-semibold text-slate-500 truncate">Total Ruangan</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-black text-slate-800">48</span>
                  <span className="text-[9px] font-medium text-slate-400">ruang</span>
                </div>
              </div>
            </div>

            {/* Card 2: Tersedia */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                <LayoutGrid size={18} />
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[10px] font-semibold text-slate-500 truncate">Tersedia</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-black text-slate-800">16</span>
                  <span className="text-[9px] font-medium text-slate-400">ruang</span>
                </div>
              </div>
            </div>

            {/* Card 3: Sedang Digunakan */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <DoorClosed size={18} />
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[10px] font-semibold text-slate-500 truncate">Dipakai</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-black text-slate-800">32</span>
                  <span className="text-[9px] font-medium text-slate-400">ruang</span>
                </div>
              </div>
            </div>

            {/* Card 4: Booking Mendatang */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                <CalendarDays size={18} />
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[10px] font-semibold text-slate-500 truncate">Booking</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-sm font-black text-slate-800 truncate">Belum Ada</span>
                </div>
              </div>
            </div>
          </div>

          {/* KONSULTASI & BANTUAN SECTION (ADMIN & DOSEN DUMMY) */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <MessageCircle size={15} className="text-[#183449]" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Konsultasi &amp; Chat
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400">2 Saluran</span>
            </div>

            {/* ROOM 1: ADMIN UNJ */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-100 shadow-md shadow-slate-200/40 p-4 transition-all">
              <div className="flex items-center gap-3.5 mb-3.5">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 bg-[#588CBC]/10 rounded-2xl flex items-center justify-center shadow-xs">
                    <Image
                      src="/LogoSiRuangPolos.png"
                      alt="Admin UNJ"
                      width={30}
                      height={30}
                      className="object-contain"
                    />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4 className="text-sm font-black text-slate-800 truncate tracking-tight">Admin UNJ</h4>
                      <span className="px-1.5 py-0.5 rounded-md bg-[#588CBC]/15 text-[#183449] text-[8px] font-black uppercase tracking-wider">
                        Helpdesk
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                      Aktif
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium truncate">
                    Konsultasi jadwal kuliah &amp; peminjaman ruangan
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenChat}
                className="w-full py-2.5 px-4 bg-[#183449] hover:bg-[#588CBC] text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer relative"
              >
                <span>Buka Chat Admin</span>
                <ArrowRight size={13} />
                {unreadCount > 0 && (
                  <span className="ml-1 min-w-5 h-5 px-1 bg-[#588CBC] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* ROOM 2: DOSEN (DUMMY PERSIS VERSI WEB DENGAN PP BOTAK) */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-100 shadow-md shadow-slate-200/40 p-4 transition-all">
              <div className="flex items-center gap-3.5 mb-3.5">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200/60 overflow-hidden">
                    <Avatar size="md" alt="Dosen" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4 className="text-sm font-black text-slate-800 truncate tracking-tight">Dosen</h4>
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[8px] font-black uppercase tracking-wider">
                        Dosen
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 shrink-0">
                      10:30
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium truncate">
                    Halo, ada yang bisa saya bantu terkait perkuliahan?
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDosenClick}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-200/70 transition-all active:scale-[0.98] cursor-pointer"
              >
                <GraduationCap size={14} className="text-slate-500" />
                <span>Chat Dosen (Demo)</span>
              </button>
            </div>
          </div>

          {/* DENAH GEDUNG SECTION */}
          <DenahGedungGrid variant="mobile" />
        </div>
      </div>
    </motion.div>
  );
};

export default MobileHomeView;
