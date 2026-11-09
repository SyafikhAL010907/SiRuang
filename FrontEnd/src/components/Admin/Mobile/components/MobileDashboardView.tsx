'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, KeyRound, Network, ChevronRight, User } from 'lucide-react';
import StatGrid from '../../Shared/Cards/StatGrid';
import SystemStatusCard from '../../Shared/Cards/SystemStatusCard';
import BuildingDenahGrid from '../../Shared/Cards/BuildingDenahGrid';
import { useMyProfile, loadMyProfile } from '@/lib/profileStore';
import { getAvatarSrc } from '@/lib/avatarValidation';

export interface MobileDashboardViewProps {
  rooms: any[];
  isInfoActive: boolean;
  networkLatency: number;
  totalUsersCount: number;
  adminName?: string;
  adminGmail?: string;
  onOpenProfile?: () => void;
  onOpenRoleAccess?: () => void;
  onOpenManajemenAkun?: () => void;
  onOpenRelasiMataKuliah?: () => void;
}

// Menu navigasi tambahan — sama dengan Web&Tab AdminDashboardView
const ROLE_ACCESS_MENUS: {
  label: string;
  key: 'role-access' | 'manajemen-akun' | 'relasi-mata-kuliah';
  icon: React.ElementType;
}[] = [
  { label: 'Konfigurasi Role Akses', key: 'role-access', icon: ShieldCheck },
  { label: 'Manajemen Akun', key: 'manajemen-akun', icon: KeyRound },
  { label: 'Manajemen Relasi Mata Kuliah', key: 'relasi-mata-kuliah', icon: Network },
];

export const MobileDashboardView: React.FC<MobileDashboardViewProps> = ({
  rooms,
  isInfoActive,
  networkLatency,
  totalUsersCount,
  adminName = 'Admin',
  adminGmail,
  onOpenProfile,
  onOpenRoleAccess,
  onOpenManajemenAkun,
  onOpenRelasiMataKuliah,
}) => {
  const { profile, status } = useMyProfile();

  useEffect(() => {
    loadMyProfile();
  }, []);

  const displayName = profile?.fullName || adminName;

  const handleMenuClick = (key: 'role-access' | 'manajemen-akun' | 'relasi-mata-kuliah') => {
    if (key === 'role-access' && onOpenRoleAccess) onOpenRoleAccess();
    if (key === 'manajemen-akun' && onOpenManajemenAkun) onOpenManajemenAkun();
    if (key === 'relasi-mata-kuliah' && onOpenRelasiMataKuliah) onOpenRelasiMataKuliah();
  };

  return (
    <motion.div
      key="info-dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6 pt-4"
    >
      {/* PROFILE CARD — navigasi ke halaman profil */}
      {onOpenProfile && (
        <button
          type="button"
          onClick={onOpenProfile}
          className="w-full flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-[#588CBC]/30 active:scale-[0.98] transition-all text-left"
        >
          <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
            {status === 'ready' || status === 'error' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getAvatarSrc(profile?.avatarUrl)}
                alt="Foto profil"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/LogoSiRuangPolos.png';
                }}
              />
            ) : (
              <div className="w-full h-full bg-slate-200 animate-pulse" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-800 truncate">{displayName}</p>
            {adminGmail && <p className="text-[11px] text-slate-400 font-medium truncate">{adminGmail}</p>}
          </div>
          <User size={16} className="text-slate-400 shrink-0" />
        </button>
      )}

      {/* STATS GRID */}
      <StatGrid variant="mobile" rooms={rooms} isInfoActive={isInfoActive} />

      {/* SYSTEM STATUS CARD */}
      <SystemStatusCard variant="mobile" networkLatency={networkLatency} totalUsersCount={totalUsersCount} />

      {/* MENU ADMIN — RoleAccess / ManajemenAkun / RelasiMataKuliah */}
      {(onOpenRoleAccess || onOpenManajemenAkun || onOpenRelasiMataKuliah) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 pt-4 pb-2">
            Menu Admin
          </p>
          {ROLE_ACCESS_MENUS.map((menu, idx) => {
            const Icon = menu.icon;
            return (
              <button
                key={menu.key}
                type="button"
                onClick={() => handleMenuClick(menu.key)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left ${
                  idx < ROLE_ACCESS_MENUS.length - 1 ? 'border-b border-slate-50' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-[#183449]/8 flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-[#183449]" />
                </div>
                <span className="flex-1 text-sm font-semibold text-slate-700">{menu.label}</span>
                <ChevronRight size={15} className="text-slate-300 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

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
