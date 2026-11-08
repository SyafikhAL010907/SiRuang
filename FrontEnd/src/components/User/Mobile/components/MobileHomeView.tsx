'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import DenahGedungGrid from '../../Shared/Cards/DenahGedungGrid';

export interface MobileHomeViewProps {
  userName: string;
  unreadCount: number;
  onOpenChat: () => void;
}

export const MobileHomeView: React.FC<MobileHomeViewProps> = ({
  userName,
  unreadCount,
  onOpenChat,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-slate-50 overflow-hidden"
    >
      {/* Fixed Header - Higher Layer (z-30) */}
      <div className="bg-linear-to-br from-[#183449] to-[#2B5474] rounded-b-[40px] px-8 pt-10 pb-12 shadow-2xl relative overflow-hidden shrink-0 z-30">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#588CBC]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-5 -left-5 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>

        <header className="relative z-10 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <Image
                  src="/LogoSiRuangPolos.png"
                  alt="Logo SiRuang"
                  width={48}
                  height={48}
                  className="drop-shadow-2xl object-contain"
                />
              </motion.div>
              <div className="flex flex-col">
                <h2 className="text-sm font-black text-white tracking-tighter leading-none uppercase">Admin  UNJ</h2>
                <span className="text-[8px] font-black text-[#588CBC] uppercase tracking-widest mt-0.5">UNJ  2026</span>
              </div>
            </div>
          </div>

          <div className="mt-1">
            <motion.h1
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-2xl font-black text-white tracking-tight leading-tight"
            >
              Halo, <span className="text-[#588CBC]">{userName}!</span>
            </motion.h1>
            <div className="flex items-center gap-2 mt-3">
              <span className="w-1.5 h-1.5 bg-[#588CBC] rounded-full animate-pulse"></span>
              <p className="text-[9px] font-black text-white/80 uppercase tracking-[0.15em]">Admin Siap Membantu</p>
            </div>
          </div>
        </header>
      </div>

      {/* Scrollable Content - Lower Layer (z-10) */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 -mt-10 relative z-10 pb-32">
        <div className="flex flex-col gap-8">
          {/* Chat Landing Section */}
          <div className="flex flex-col items-center justify-center p-10 text-center bg-white rounded-[40px] shadow-xl shadow-slate-200/30 border border-slate-100 mt-12 mb-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center max-w-sm"
            >
              <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-slate-200 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[#588CBC]/10 scale-0 group-hover:scale-100 transition-transform duration-700 rounded-full"></div>
                <Image src="/LogoSiRuangPolos.png" alt="Logo" width={50} height={50} className="relative z-10 object-contain" />
              </div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight mb-2">Admin  UNJ</h2>
              <p className="text-[12px] font-medium text-slate-400 leading-relaxed mb-8 px-4">
                Klik tombol dibawah ini untuk mulai berkonsultasi dengan petugas kami.
              </p>
              <button
                onClick={onOpenChat}
                className="px-8 py-3.5 bg-[#183449] hover:bg-[#588CBC] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#183449]/30 hover:scale-105 active:scale-95 transition-all w-full relative"
              >
                BUKA CHAT SEKARANG
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-[#588CBC] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>
            </motion.div>
          </div>



          {/* Denah Gedung Section */}
          <DenahGedungGrid variant="mobile" />
        </div>
      </div>
    </motion.div>
  );
};

export default MobileHomeView;