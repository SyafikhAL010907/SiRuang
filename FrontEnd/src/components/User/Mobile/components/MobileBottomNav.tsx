'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Home, MessageCircle, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const NotchedBackground = () => (
    <div className="absolute inset-0 z-0 pointer-events-none">
        <svg
            width="100%"
            height="100%"
            viewBox="0 0 1000 80"
            preserveAspectRatio="xMidYMin slice"
            className="drop-shadow-[0_-5px_20px_rgba(0,0,0,0.05)] filter transition-all duration-500"
        >
            <path
                d="M-500,40 
                   C-500,18 -482,0 -460,0 
                   L430,0 
                   C450,0 455,5 460,15 
                   C480,62 520,62 540,15 
                   C545,5 550,0 570,0 
                   L1460,0 
                   C1482,0 1500,18 1500,40 
                   L1500,40 
                   C1500,62 1482,80 1460,80 
                   L-460,80 
                   C-482,80 -500,62 -500,40 
                   Z"
                className="fill-white backdrop-blur-3xl stroke-slate-100"
                strokeWidth="1"
            />
        </svg>
    </div>
);

export interface MobileBottomNavProps {
  activeTab: 'home' | 'chats' | 'logout';
  onTabChange: (tab: 'home' | 'chats') => void;
  unreadCount: number;
  onLogout: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadCount,
  onLogout,
}) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 w-[92%] max-w-lg h-19 pointer-events-none"
    >
      <nav className="relative flex items-center justify-between px-10 h-full pointer-events-auto">
        <NotchedBackground />

        {/* Home Tab */}
        <button
          onClick={() => onTabChange('home')}
          className="flex flex-col items-center gap-1 group relative"
        >
          <motion.div
            animate={activeTab === 'home' ? { scale: 1.2, y: -2 } : { scale: 1, y: 0 }}
            className={cn(
              "p-2 transition-all relative",
              activeTab === 'home' ? "text-[#183449]" : "text-slate-400"
            )}
          >
            <Home size={24} />
          </motion.div>
          {activeTab === 'home' && (
            <motion.span
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[8px] font-black uppercase tracking-widest text-[#183449]"
            >
              HOME
            </motion.span>
          )}
        </button>

        {/* Center Floating Chat Button */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onTabChange('chats')}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative",
              activeTab === 'chats'
                ? "bg-[#183449] text-white shadow-[#183449]/30"
                : "bg-white text-[#183449] shadow-slate-200 border border-slate-100"
            )}
          >
            <MessageCircle size={28} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-[#588CBC] text-white text-[10px] font-black rounded-full flex items-center justify-center border-4 border-white">
                {unreadCount}
              </span>
            )}
          </motion.button>
        </div>

        {/* Logout Tab */}
        <button
          onClick={onLogout}
          className="flex flex-col items-center gap-1 group relative"
        >
          <div className="p-2 text-slate-400 group-active:text-rose-600 transition-all">
            <LogOut size={24} />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 group-active:text-rose-600">
            KELUAR
          </span>
        </button>
      </nav>
    </motion.div>
  );
};

export default MobileBottomNav;