'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LogOut, User } from 'lucide-react';

export interface MobileProfileViewProps {
  userName: string;
  onLogout: () => void;
}

export const MobileProfileView: React.FC<MobileProfileViewProps> = ({
  userName,
  onLogout,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-slate-50 p-10 items-center justify-center"
    >
      <div className="w-24 h-24 bg-[#588CBC]/20 rounded-full flex items-center justify-center mb-6 ring-4 ring-white shadow-xl">
        <User size={48} className="text-[#183449]" />
      </div>
      <h2 className="text-2xl font-black text-slate-800">{userName}</h2>
      <p className="text-sm text-slate-400 font-medium">User Baru - 2026</p>

      <button
        onClick={onLogout}
        className="mt-12 w-full max-w-50 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-rose-100 flex items-center justify-center gap-2 active:bg-rose-100 transition-all"
      >
        <LogOut size={16} />
        Keluar Akun
      </button>
    </motion.div>
  );
};

export default MobileProfileView;