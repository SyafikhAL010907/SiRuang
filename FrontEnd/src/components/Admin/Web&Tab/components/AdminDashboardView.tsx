'use client';

import React from 'react';
import { motion } from 'framer-motion';
import StatGrid from '../../Shared/Cards/StatGrid';
import SystemStatusCard from '../../Shared/Cards/SystemStatusCard';
import BuildingDenahGrid from '../../Shared/Cards/BuildingDenahGrid';

export interface AdminDashboardViewProps {
  adminName: string;
  rooms: any[];
  isInfoActive: boolean;
  networkLatency: number;
  totalUsersCount: number;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  adminName,
  rooms,
  isInfoActive,
  networkLatency,
  totalUsersCount,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-12 scrollbar-hide bg-[#F8FAFB]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto flex flex-col gap-10"
      >
        {/* DASHBOARD HEADER */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-1 bg-[#588CBC] rounded-full"></div>
            <span className="text-[10px] font-black text-[#183449] uppercase tracking-[0.3em]">Administrator Dashboard</span>
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Selamat Datang, {adminName}!</h2>
          <p className="text-slate-400 font-medium max-w-lg leading-relaxed">
            Pantau seluruh aktivitas bantuan dan sistem user secara real-time dari panel kendali utama Anda.
          </p>
        </div>

        {/* STATS GRID */}
        <StatGrid variant="web" rooms={rooms} isInfoActive={isInfoActive} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* SYSTEM STATUS CARD - DARK BLUE THEME */}
          <SystemStatusCard variant="web" networkLatency={networkLatency} totalUsersCount={totalUsersCount} />

          {/* QUICK ACTIONS PANEL */}
          <div className="flex flex-col gap-6">
            {/* DENAH GEDUNG */}
            <BuildingDenahGrid variant="web" />
          </div>
        </div>

        {/* FOOTER TIPS */}
        <div className="bg-white/50 p-8 rounded-[40px] border border-slate-100 flex gap-6 items-center">
          <div className="w-14 h-14 bg-[#588CBC]/10 rounded-2xl flex items-center justify-center text-2xl shadow-inner">💡</div>
          <div>
            <h5 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-1">Petunjuk Admin</h5>
            <p className="text-sm font-medium text-slate-500 leading-relaxed">
              Gunakan panel sidebar untuk membalas chat user secara cepat. Anda juga bisa mengaktifkan <span className="text-[#588CBC] font-bold">Auto-Response AI</span> di bagian atas header untuk membantu menjawab pertanyaan umum secara otomatis.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboardView;
