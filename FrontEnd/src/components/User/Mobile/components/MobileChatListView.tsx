'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, MessageCircle } from 'lucide-react';
import Image from 'next/image';

export interface MobileChatListViewProps {
  onOpenRoom: () => void;
}

export const MobileChatListView: React.FC<MobileChatListViewProps> = ({
  onOpenRoom,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col h-full"
    >
      {/* List Header */}
      <div className="bg-[#183449] rounded-b-[40px] px-6 pt-12 pb-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-5 -right-5 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <header className="relative z-10">
          <h2 className="text-xl font-black text-white tracking-tight leading-none">Pesan Bantuan</h2>
          <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mt-2">Hubungi Admin UNJ</p>
        </header>
      </div>

      {/* Admin Room Item - Refined & Clean */}
      <main className="flex-1 px-6 overflow-y-auto scrollbar-hide pb-32">
        <div className="flex flex-col gap-4 mt-6">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-2">Admin Helpdesk </h4>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onOpenRoom}
            className="w-full bg-white p-6 rounded-4xl shadow-xl shadow-slate-200/30 border border-slate-100 flex items-center gap-5 group active:bg-[#588CBC]/10 active:border-[#588CBC]/30 transition-all duration-300"
          >
            <div className="relative">
              <div className="w-16 h-16 bg-[#588CBC]/10 rounded-2xl flex items-center justify-center text-[#588CBC] ring-4 ring-slate-50">
                <Image src="/LogoSiRuangPolos.png" alt="SiRuang" width={40} height={40} className="drop-shadow-md object-contain" />
              </div>
            </div>
            <div className="flex-1 text-left">
              <div className="flex justify-between items-center">
                <h4 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-1">
                  <span>Admin </span>
                  <ChevronRight size={16} className="text-slate-400" />
                </h4>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#588CBC] group-hover:text-white transition-all">
              <MessageCircle size={18} />
            </div>
          </motion.button>

          {/* Info Card - Dark Blue & Light Blue Gradient */}
          <div className="p-6 bg-linear-to-br from-[#183449] to-[#2B5474] rounded-4xl text-white relative overflow-hidden shadow-2xl shadow-[#183449]/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#588CBC]/15 rounded-full blur-3xl"></div>
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-white mb-2">Info Layanan</h5>
            <p className="text-[11px] text-[#B3B3B3] font-medium leading-relaxed">Admin akan merespon pesan Anda segera.</p>
          </div>
        </div>
      </main>
    </motion.div>
  );
};

export default MobileChatListView;