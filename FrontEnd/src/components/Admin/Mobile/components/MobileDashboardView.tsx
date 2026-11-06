'use client';

import React from 'react';
import { motion } from 'framer-motion';
import StatGrid from '../../Shared/Cards/StatGrid';
import SystemStatusCard from '../../Shared/Cards/SystemStatusCard';
import BuildingDenahGrid from '../../Shared/Cards/BuildingDenahGrid';

export interface MobileDashboardViewProps {
  rooms: any[];
  isInfoActive: boolean;
  networkLatency: number;
  totalUsersCount: number;
}

export const MobileDashboardView: React.FC<MobileDashboardViewProps> = ({
  rooms,
  isInfoActive,
  networkLatency,
  totalUsersCount,
}) => {
  return (
    <motion.div
      key="info-dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6 pt-4"
    >
      {/* STATS GRID */}
      <StatGrid variant="mobile" rooms={rooms} isInfoActive={isInfoActive} />

      {/* SYSTEM STATUS CARD (Dark Blue Theme) */}
      <SystemStatusCard variant="mobile" networkLatency={networkLatency} totalUsersCount={totalUsersCount} />

      {/* DENAH GEDUNG */}
      <BuildingDenahGrid variant="mobile" />

      {/* QUOTE / TIP */}
      <div className="bg-[#588CBC]/10 p-6 rounded-4xl border border-[#588CBC]/20 flex gap-4 items-start">
        <div className="text-xl">💡</div>
        <p className="text-[11px] font-medium text-[#183449] leading-relaxed">
          *Tips:* Pastikan selalu membalas pesan user dalam waktu kurang dari 15 menit untuk menjaga performa layanan Admin UNJ.
        </p>
      </div>
    </motion.div>
  );
};

export default MobileDashboardView;
