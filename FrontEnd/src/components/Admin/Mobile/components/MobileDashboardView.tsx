'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, KeyRound, Network, ChevronRight, User } from 'lucide-react';
import StatGrid from '../../Shared/Cards/StatGrid';
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

// Menu Manajemen — sama dengan Web&Tab AdminDashboardView
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

  const handlers: Record<string, (() => void) | undefined> = {
    'role-access': onOpenRoleAccess,
    'manajemen-akun': onOpenManajemenAkun,
    'relasi-mata-kuliah': onOpenRelasiMataKuliah,
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

      {/* MANAJEMEN ROLE ACCESS (menggantikan Server Status, sama seperti versi web) */}
      {(onOpenRoleAccess || onOpenManajemenAkun || onOpenRelasiMataKuliah) && (
        <div className="bg-black rounded-[28px] p-5 text-white shadow-2xl shadow-black/20 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold tracking-tight">Manajemen Role Access</h3>
            <p className="text-[11px] text-white/60 font-medium leading-relaxed">
              Kelola hak akses pengguna dan atur peran dalam sistem secara mudah dan aman.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {ROLE_ACCESS_MENUS.map(({ label, key, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={handlers[key]}
                className="group bg-white text-slate-800 rounded-2xl p-3 min-h-28 flex flex-col justify-between gap-3 active:scale-95 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
                  <Icon size={16} />
                </div>
                <div className="flex items-end justify-between gap-1">
                  <span className="text-[10px] font-semibold leading-snug">{label}</span>
                  <ChevronRight size={12} className="text-slate-400 shrink-0" />
                </div>
              </button>
            ))}
          </div>
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