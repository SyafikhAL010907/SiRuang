'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MobileHeaderProps {
  adminName: string;
  rooms: any[];
  activeTab: string;
  isInfoActive: boolean;
  isAILoading: boolean;
  handleAIToggleRequest: (state: boolean) => void;
  roomSearchQuery: string;
  setRoomSearchQuery: (query: string) => void;
  isDeleteMode: boolean;
  setIsDeleteMode: (val: boolean) => void;
  selectedRooms: number[];
  setSelectedRooms: (val: number[]) => void;
  filteredRooms: any[];
  toggleSelectAll: () => void;
  handleBulkDelete: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  adminName,
  rooms,
  activeTab,
  isInfoActive,
  isAILoading,
  handleAIToggleRequest,
  roomSearchQuery,
  setRoomSearchQuery,
  isDeleteMode,
  setIsDeleteMode,
  selectedRooms,
  setSelectedRooms,
  filteredRooms,
  toggleSelectAll,
  handleBulkDelete,
}) => {
  return (
    <div className="sticky top-0 z-40 bg-slate-50 flex flex-col shrink-0 border-b border-slate-100/40">
      {/* Premium Header (Logo & Welcome) */}
      <div className="bg-linear-to-br from-[#07111E] to-[#0F2238] rounded-b-[40px] px-6 pt-12 pb-14 relative overflow-hidden shadow-lg shadow-slate-200/50">
        {/* Decorative Circles */}
        <div className="absolute -top-5 -right-5 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-5 -left-5 w-32 h-32 bg-[#588CBC]/20 rounded-full blur-2xl"></div>

        <header className="relative z-10 flex flex-col gap-6">
          <div className="flex justify-between items-center text-white">
            <div className="flex items-center gap-3 text-white">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <Image
                  src="/unj.png"
                  alt="Logo UNJ"
                  width={48}
                  height={48}
                  className="drop-shadow-2xl"
                />
              </motion.div>
              <div>
                <h1 className="text-xl font-black tracking-tight leading-none">Admin UNJ</h1>
                {/* Warna di-update ke #38BDF8 */}
                <p className="text-[10px] font-bold text-[#38BDF8] uppercase tracking-widest mt-1">Admin 2026</p>
              </div>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="text-white flex items-end justify-between">
            <div>
              <h2 className="text-lg font-bold">Selamat Datang, {adminName}!</h2>
              <div className="flex items-center gap-3">
                <p className="text-xs text-white/80">
                  {activeTab === 'home' ? "Panel Informasi Dashboard" : `Ada ${rooms.filter((r: any) => (r.unread_count || 0) > 0).length} chat baru.`}
                </p>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Top Actions Area */}
      <div className="px-4 -mt-7 relative z-30 pb-3">
        {activeTab === 'home' ? (
          /* PREMIUM LARGE TOGGLE SWITCH (Replaces Quick Access) */
          <div className="w-full bg-white rounded-4xl p-4 shadow-xl shadow-slate-200/50 border border-[#588CBC]/20 flex items-center justify-between group transition-all relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#588CBC]/10 rounded-2xl flex items-center justify-center text-[#183449] shadow-inner">
                <Settings size={24} className="group-hover:rotate-90 transition-transform duration-500" />
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-[#183449] uppercase tracking-widest mb-0.5">Sistem Pintar</p>
                <h4 className="text-sm font-bold text-slate-700 leading-tight">Auto-Response AI</h4>
                <p className="text-[9px] font-medium text-slate-400 mt-0.5">Fitur belum tersedia</p>
              </div>
            </div>

            {/* Elegant Large Toggle */}
            <div
              onClick={() => {
                // ⚠️  DISABLE: Ganti handleAIToggleRequest → setIsInfoActive(!isInfoActive)
                if (!isAILoading) handleAIToggleRequest(!isInfoActive);
              }}
              className={cn(
                "relative w-16 h-9 rounded-full p-1 transition-all duration-500 cursor-pointer",
                isInfoActive ? "bg-[#588CBC] shadow-[0_0_15px_rgba(88,140,188,0.4)]" : "bg-slate-100 shadow-inner",
                isAILoading && "opacity-60 cursor-wait"
              )}
            >
              <motion.div
                animate={{ x: isInfoActive ? 28 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-7 h-7 bg-white rounded-full shadow-lg flex items-center justify-center overflow-hidden"
              >
                {isAILoading ? (
                  <div className="w-3 h-3 border-2 border-[#588CBC] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                    isInfoActive ? "bg-[#588CBC] scale-150" : "bg-slate-300"
                  )} />
                )}
              </motion.div>
            </div>
          </div>
        ) : (
          /* SEARCH & DELETE MODE */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-3"
          >
            <div className="bg-white rounded-full shadow-lg shadow-slate-200/50 border-2 border-slate-100 focus-within:border-[#588CBC] focus-within:ring-4 focus-within:ring-[#588CBC]/10 transition-all duration-300">
              <div className="flex items-center gap-3 px-4 h-11 bg-white rounded-full">
                <Search size={18} className="text-[#183449] shrink-0" />
                <input
                  type="text"
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                  placeholder="Cari user atau pesan..."
                  className="bg-transparent border-none focus:ring-0 text-sm font-bold w-full text-slate-700 placeholder:text-slate-400 focus:outline-none outline-none p-0"
                />
                {roomSearchQuery.trim() && (
                  <button
                    onClick={() => setRoomSearchQuery('')}
                    className="text-slate-400 hover:text-rose-500 transition-colors mr-1"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-50 min-h-11.5 items-center justify-center relative overflow-hidden shadow-xs">
              <AnimatePresence mode="wait">
                {isDeleteMode ? (
                  <motion.div
                    key="delete-mode-active-mob"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="flex w-full gap-1.5"
                  >
                    <button
                      onClick={toggleSelectAll}
                      className="flex-1 py-2 px-3 rounded-xl text-[10px] font-black text-[#183449] bg-[#588CBC]/10 border border-[#588CBC]/20 whitespace-nowrap"
                    >
                      {selectedRooms.length === filteredRooms.length ? "Batal Semua" : "Pilih Semua"}
                    </button>
                    <button
                      onClick={() => {
                        setIsDeleteMode(false);
                        setSelectedRooms([]);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl text-[10px] font-black text-red-600 bg-red-50 border border-red-100"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={selectedRooms.length === 0}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-xl text-[10px] font-black text-white shadow-lg transition-all active:scale-95 whitespace-nowrap",
                        selectedRooms.length > 0 ? "bg-red-500 shadow-red-200" : "bg-slate-300 shadow-none grayscale cursor-not-allowed"
                      )}
                    >
                      Hapus ({selectedRooms.length})
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="delete-mode-off-mob"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setIsDeleteMode(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    <Trash2 size={14} />
                    Mode Hapus
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MobileHeader;
