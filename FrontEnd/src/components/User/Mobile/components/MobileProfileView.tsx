'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import UserProfile from '@/components/Profile/User/UserProfile';

export interface MobileProfileViewProps {
  userName: string;
  userGmail?: string;
  onBack?: () => void;
  onLogout: () => void;
}

export const MobileProfileView: React.FC<MobileProfileViewProps> = ({
  userName,
  userGmail,
  onBack,
  onLogout,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex flex-col h-full bg-[#F8FAFB] overflow-hidden select-none"
    >
      <div className="flex-1 overflow-y-auto pb-36 scrollbar-hide">
        <UserProfile
          userName={userName}
          userGmail={userGmail}
          onBack={onBack}
        />

        {/* Card Logout di bagian bawah profil */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-2 pb-8">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-rose-100 p-5 sm:p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 mb-1">Keluar Akun</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Keluar dari sesi saat ini. Anda harus masuk kembali untuk mengakses portal SiRuang.
            </p>
            <button
              onClick={onLogout}
              type="button"
              className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-rose-200/60 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
            >
              <LogOut size={16} />
              Keluar dari Akun
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MobileProfileView;
