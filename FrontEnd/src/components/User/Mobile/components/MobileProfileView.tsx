'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LogOut, Bell, BellOff } from 'lucide-react';
import UserProfile from '@/components/Profile/User/UserProfile';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

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
  const { status, isLoading, subscribe, unsubscribe } = usePushNotifications();

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

        {/* Card Notifikasi */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-2 pb-4">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 mb-1 flex items-center gap-2">
              <Bell size={16} className="text-[#588CBC]" /> Notifikasi Web Push
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Dapatkan pemberitahuan pesan chat masuk langsung ke perangkat ini meskipun web ditutup.
            </p>

            {status !== 'unsupported' ? (
              <button
                type="button"
                onClick={status === 'granted' ? unsubscribe : subscribe}
                disabled={isLoading || status === 'denied'}
                className={cn(
                  "w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.98]",
                  status === 'granted'
                    ? "bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 border border-emerald-200/60"
                    : status === 'denied'
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    : "bg-[#183449] hover:bg-[#183449]/90 active:bg-[#183449]/80 text-white"
                )}
              >
                {isLoading ? (
                  'Memuat...'
                ) : status === 'granted' ? (
                  <>
                    <BellOff size={16} /> Notifikasi Aktif (Nonaktifkan)
                  </>
                ) : status === 'denied' ? (
                  <>
                    <BellOff size={16} /> Izin Ditolak
                  </>
                ) : (
                  <>
                    <Bell size={16} /> Aktifkan Notifikasi
                  </>
                )}
              </button>
            ) : (
              <div className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                {typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)
                  ? 'Di iPhone/iPad: tap ikon Share di Safari lalu pilih "Add to Home Screen", kemudian buka SiRuang dari layar utama untuk mengaktifkan notifikasi.'
                  : 'Browser ini tidak mendukung Web Push Notification.'}
              </div>
            )}
            {status === 'denied' && (
              <p className="text-[11px] text-amber-600 mt-2 text-center">
                Izin notifikasi diblokir di browser. Ubah izin di pengaturan browser untuk mengaktifkan.
              </p>
            )}
          </div>
        </div>

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
