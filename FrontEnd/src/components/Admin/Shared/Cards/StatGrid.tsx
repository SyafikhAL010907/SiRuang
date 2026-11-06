'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Clock, CheckCheck, Settings, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatGridProps {
  variant?: 'web' | 'mobile';
  rooms: any[];
  isInfoActive: boolean;
}

export const StatGrid: React.FC<StatGridProps> = ({
  variant = 'web',
  rooms,
  isInfoActive,
}) => {
  const isMobile = variant === 'mobile';

  if (isMobile) {
    const mobileStats = [
      { label: 'Total Chat', value: rooms.length, icon: MessageSquare, color: 'blue', detail: 'Live' },
      { label: 'Unread', value: rooms.filter(r => (r.unread_count || 0) > 0).length, icon: Clock, color: 'rose', detail: 'Pending' },
      { label: 'Reading', value: rooms.filter(r => (r.unread_count || 0) === 0).length, icon: CheckCheck, color: 'cyan', detail: 'Terbaca' },
      { label: 'Sistem AI', value: isInfoActive ? 'Aktif' : 'Non-Aktif', icon: Settings, color: 'indigo', detail: 'Auto' },
      { label: 'User Online', value: rooms.filter(r => r.is_online).length, icon: Search, color: 'amber', detail: 'Live' }
    ];

    return (
      <div className="grid grid-cols-2 gap-4">
        {mobileStats.map((stat, i) => (
          <div
            key={stat.label}
            className={cn(
              "bg-white p-5 rounded-4xl border border-slate-100 shadow-sm flex flex-col gap-3 relative overflow-hidden group",
              i === 4 ? "col-span-2" : ""
            )}
          >
            <div
              className={cn(
                "absolute -right-2 -top-2 w-16 h-16 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 opacity-20",
                stat.color === 'blue' ? "bg-[#588CBC]" :
                  stat.color === 'rose' ? "bg-rose-400" :
                    stat.color === 'cyan' ? "bg-cyan-400" :
                      stat.color === 'indigo' ? "bg-indigo-400" : "bg-amber-400"
              )}
            />
            <div className="flex justify-between items-start relative z-10">
              <div
                className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500",
                  stat.color === 'blue' ? "bg-[#588CBC]/10 text-[#183449]" :
                    stat.color === 'rose' ? "bg-rose-50 text-rose-600" :
                      stat.color === 'cyan' ? "bg-cyan-50 text-cyan-600" :
                        stat.color === 'indigo' ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
                )}
              >
                <stat.icon size={20} />
              </div>
              <span
                className={cn(
                  "text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest",
                  stat.color === 'blue' ? "bg-[#588CBC]/10 text-[#183449]" :
                    stat.color === 'rose' ? "bg-rose-50 text-rose-600" :
                      stat.color === 'cyan' ? "bg-cyan-50 text-cyan-600" :
                        stat.color === 'indigo' ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
                )}
              >
                {stat.detail}
              </span>
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{stat.label}</p>
              <h3 className="text-xl font-black text-slate-800 mt-1 tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis">
                {stat.value}
              </h3>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const webStats = [
    { label: 'Total Chat', value: rooms.length, icon: MessageSquare, color: 'blue', detail: 'Live Sync' },
    { label: 'Unread', value: rooms.filter(r => (r.unread_count || 0) > 0).length, icon: Clock, color: 'rose', detail: 'Perlu Respon' },
    { label: 'Reading', value: rooms.filter(r => (r.unread_count || 0) === 0).length, icon: CheckCheck, color: 'cyan', detail: 'Terbaca' },
    { label: 'Sistem AI', value: isInfoActive ? 'Aktif' : 'Non-Aktif', icon: Settings, color: 'indigo', detail: 'Auto-Response' },
    { label: 'Aktif Online', value: rooms.filter(r => r.is_online).length, icon: Search, color: 'amber', detail: 'User Online' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
      {webStats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden"
        >
          <div
            className={cn(
              "absolute -right-4 -top-4 w-16 h-16 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 opacity-20",
              stat.color === 'blue' ? "bg-[#588CBC]" :
                stat.color === 'rose' ? "bg-rose-400" :
                  stat.color === 'cyan' ? "bg-cyan-400" :
                    stat.color === 'indigo' ? "bg-indigo-400" : "bg-amber-400"
            )}
          />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500",
                stat.color === 'blue' ? "bg-[#588CBC]/10 text-[#183449]" :
                  stat.color === 'rose' ? "bg-rose-50 text-rose-600" :
                    stat.color === 'cyan' ? "bg-cyan-50 text-cyan-600" :
                      stat.color === 'indigo' ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
              )}
            >
              <stat.icon size={20} />
            </div>
            <span
              className={cn(
                "text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap",
                stat.color === 'blue' ? "bg-[#588CBC]/10 text-[#183449]" :
                  stat.color === 'rose' ? "bg-rose-50 text-rose-600" :
                    stat.color === 'cyan' ? "bg-cyan-50 text-cyan-600" :
                      stat.color === 'indigo' ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
              )}
            >
              {stat.detail}
            </span>
          </div>
          <div className="relative z-10">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{stat.label}</p>
            <h3 className="text-xl font-black text-slate-800 mt-1 tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis">
              {stat.value}
            </h3>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default StatGrid;
