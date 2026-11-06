'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Clock,
  CheckCheck,
  Megaphone,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const NotchedBackground = () => (
  <svg
    viewBox="0 0 400 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="absolute inset-0 w-full h-full drop-shadow-[0_15px_30px_rgba(24,52,73,0.15)] preserve-3d"
    preserveAspectRatio="none"
  >
    <path
      d="M0 40C0 17.9086 17.9086 0 40 0H145C155 0 162 4 168 12C175 22 186 32 200 32C214 32 225 22 232 12C238 4 245 0 255 0H360C382.091 0 400 17.9086 400 40C400 62.0914 382.091 80 360 80H40C17.9086 80 0 62.0914 0 40Z"
      fill="white"
      className="transition-colors duration-500"
    />
  </svg>
);

export interface MobileBottomNavProps {
  showBlessModal: boolean;
  setShowBlessModal: (show: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setActiveFilter: (filter: 'unreading' | 'reading') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  showBlessModal,
  setShowBlessModal,
  activeTab,
  setActiveTab,
  setActiveFilter,
}) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: LayoutGrid },
    { id: 'unreading', label: 'Unreading', icon: Clock },
    { id: 'fab', label: '', isFAB: true },
    { id: 'reading', label: 'Reading', icon: CheckCheck },
    { id: 'logout', label: 'Keluar', icon: LogOut },
  ];

  return (
    <AnimatePresence>
      {!showBlessModal && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 w-[92%] max-w-lg h-19 pointer-events-none"
        >
          <nav className="relative flex items-center justify-between px-6 h-full pointer-events-auto">
            <NotchedBackground />

            {navItems.map((item) => {
              if (item.isFAB) {
                return (
                  <div key="fab-slot" className="relative flex flex-col items-center w-15">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowBlessModal(true)}
                      className="absolute -top-14 w-16 h-16 bg-[#183449] rounded-full flex items-center justify-center shadow-[0_15px_30px_rgba(24,52,73,0.35)] z-70 border-4 border-white overflow-hidden group"
                    >
                      {/* Professional Megaphone Model */}
                      <div className="relative flex items-center justify-center">
                        <Megaphone size={28} className="text-white relative z-10 drop-shadow-md" strokeWidth={2.5} fill="rgba(255,255,255,0.1)" />
                        <div className="absolute inset-0 bg-linear-to-tr from-white/5 via-white/20 to-transparent rounded-full blur-md opacity-50 scale-150"></div>
                        <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/5 to-white/20 rounded-full"></div>
                      </div>
                    </motion.button>
                  </div>
                );
              }

              const ActiveIcon = item.icon!;
              const active = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={async () => {
                    setActiveTab(item.id);
                    if (item.id === 'unreading') setActiveFilter('unreading');
                    if (item.id === 'reading') setActiveFilter('reading');

                    if (item.id === 'logout') {
                      const storedUser = localStorage.getItem('user');
                      if (storedUser) {
                        const { token } = JSON.parse(storedUser);
                        try {
                          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
                            method: 'POST',
                            headers: { 'Authorization': token }
                          });
                        } catch {}
                      }
                      localStorage.removeItem('user');
                      window.location.href = '/login';
                      return;
                    }
                  }}
                  className={cn(
                    "relative flex flex-col items-center justify-center w-12.5 transition-all duration-500 py-1",
                    active ? "scale-105" : "opacity-40 hover:opacity-100"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-2xl transition-all duration-300 relative",
                    active ? "bg-[#588CBC]/10 text-[#183449] shadow-[inset_0_2px_4px_rgba(24,52,73,0.05)]" : "text-slate-500"
                  )}>
                    <ActiveIcon size={22} strokeWidth={active ? 2.5 : 2} />
                    {active && (
                      <motion.div
                        layoutId="nav-dot"
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#588CBC] rounded-full shadow-sm"
                      />
                    )}
                  </div>
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-tighter mt-1 transition-all duration-300",
                    active ? "text-[#183449] opacity-100" : "text-slate-400 opacity-0"
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileBottomNav;
