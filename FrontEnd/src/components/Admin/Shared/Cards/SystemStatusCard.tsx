'use client';

import React from 'react';
import Image from 'next/image';
import { HelpCircle } from 'lucide-react';
import { formatNumber } from '../utils';

export interface SystemStatusCardProps {
  variant?: 'web' | 'mobile';
  networkLatency: number;
  totalUsersCount: number;
}

export const SystemStatusCard: React.FC<SystemStatusCardProps> = ({
  variant = 'web',
  networkLatency,
  totalUsersCount,
}) => {
  const isMobile = variant === 'mobile';

  if (isMobile) {
    return (
      <div className="bg-linear-to-br from-[#07111E] to-[#0F2238] p-7 rounded-[40px] text-white shadow-xl shadow-[#0B192C]/50 relative overflow-hidden">
        {/* Ambient Effect */}
        <div className="absolute -right-5 -top-5 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>

        <div className="flex items-center justify-between relative z-10 mb-8">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-black text-[#38BDF8] uppercase tracking-widest">Server Status</p>
            <h4 className="text-lg font-bold text-white">Admin UNJ Gateway</h4>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 bg-[#38BDF8] rounded-full animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.8)]"></span>
              <span className="text-[10px] font-black text-[#38BDF8] uppercase">System Operational</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
            <HelpCircle size={24} className="text-white/80" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10 relative z-10">
          <div>
            <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-widest mb-1">Network Latency</p>
            <p className="text-lg font-bold text-white">
              {networkLatency}ms{' '}
              <span className="text-[10px] font-medium text-[#38BDF8]">
                {networkLatency < 50 ? 'Excellent' : 'Good'}
              </span>
            </p>
          </div>
          <div>
            <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-widest mb-1">Total User</p>
            <p className="text-lg font-bold text-white">
              {formatNumber(totalUsersCount)}{' '}
              <span className="text-[10px] font-medium text-[#38BDF8]">Reg.</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-2 bg-linear-to-br from-[#07111E] to-[#0F2238] p-10 rounded-[48px] text-white shadow-2xl shadow-[#0B192C]/50 relative overflow-hidden group">
      {/* Ambient Glow Effects */}
      <div className="absolute -right-10 -top-10 w-80 h-80 bg-white/5 rounded-full blur-[80px] group-hover:scale-110 transition-transform duration-1000"></div>
      <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#38BDF8]/15 rounded-full blur-[60px]"></div>

      <div className="relative z-10 h-full flex flex-col justify-between gap-12">
        {/* Top Section */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <span className="px-3 py-1 bg-[#38BDF8]/20 border border-[#38BDF8]/30 rounded-full text-[9px] font-black uppercase tracking-[0.2em] w-fit backdrop-blur-md text-[#E0F2FE]">
              System Performance
            </span>
            <h4 className="text-3xl font-bold tracking-tight text-white">Gateway Admin UNJ</h4>
            <div className="flex items-center gap-3 mt-2">
              <div className="relative flex items-center justify-center">
                <span className="w-3 h-3 bg-[#38BDF8] rounded-full animate-ping opacity-75"></span>
                <span className="absolute w-2 h-2 bg-[#38BDF8] rounded-full"></span>
              </div>
              <span className="text-xs font-bold text-[#38BDF8] uppercase tracking-widest">Server Operational</span>
            </div>
          </div>

          {/* Logo Wrapper */}
          <div className="w-16 h-16 bg-white/10 rounded-[28px] flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden p-2">
            <Image src="/unj.png" alt="UNJ Logo" width={36} height={36} className="object-contain drop-shadow-md" />
          </div>
        </div>

        {/* Bottom Section - Metrics */}
        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/10">
          <div>
            <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-widest mb-1">Network Latency</p>
            <p className="text-xl font-bold text-white">
              {networkLatency}ms{' '}
              <span className="text-[10px] font-medium text-[#38BDF8]">
                {networkLatency < 50 ? 'Excellent' : networkLatency < 100 ? 'Good' : 'Fair'}
              </span>
            </p>
          </div>
          <div>
            <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-widest mb-1">Total User</p>
            <p className="text-xl font-bold text-white">
              {formatNumber(totalUsersCount)}{' '}
              <span className="text-[10px] font-medium text-[#38BDF8]">Registered</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatusCard;
