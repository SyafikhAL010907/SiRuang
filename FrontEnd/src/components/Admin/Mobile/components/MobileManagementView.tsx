'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, KeyRound, Network, ChevronRight, SlidersHorizontal } from 'lucide-react';

export interface MobileManagementViewProps {
  onSelectRoleAccess: () => void;
  onSelectManajemenAkun: () => void;
  onSelectRelasiMataKuliah: () => void;
}

const MANAGEMENT_ITEMS = [
  {
    key: 'role-access',
    title: 'Konfigurasi Role Akses',
    desc: 'Pengaturan hak akses, izin peran admin, dosen, dan mahasiswa dalam sistem.',
    icon: ShieldCheck,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100 hover:border-blue-300',
  },
  {
    key: 'manajemen-akun',
    title: 'Manajemen Akun',
    desc: 'Kelola data akun pengguna, status aktivasi, verifikasi, dan reset kata sandi.',
    icon: KeyRound,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100 hover:border-indigo-300',
  },
  {
    key: 'relasi-mata-kuliah',
    title: 'Manajemen Relasi',
    desc: 'Atur hubungan relasi mata kuliah dengan alokasi ruangan pada denah gedung.',
    icon: Network,
    color: 'text-[#588CBC]',
    bg: 'bg-sky-50',
    border: 'border-sky-100 hover:border-[#588CBC]/40',
  },
];

export const MobileManagementView: React.FC<MobileManagementViewProps> = ({
  onSelectRoleAccess,
  onSelectManajemenAkun,
  onSelectRelasiMataKuliah,
}) => {
  const handlers: Record<string, () => void> = {
    'role-access': onSelectRoleAccess,
    'manajemen-akun': onSelectManajemenAkun,
    'relasi-mata-kuliah': onSelectRelasiMataKuliah,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="flex flex-col gap-4 pt-2 select-none"
    >
      {/* Banner Ringkasan */}
      <div className="bg-linear-to-br from-[#183449] to-[#2B5474] rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-2 mb-2">
          <SlidersHorizontal size={16} className="text-[#38BDF8]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#38BDF8]">
            Pusat Kontrol
          </span>
        </div>
        <h3 className="text-lg font-black tracking-tight leading-tight">
          Manajemen Sistem Admin
        </h3>
        <p className="text-[11px] text-white/70 font-medium mt-1 leading-relaxed">
          Pilih salah satu menu manajemen di bawah untuk mengelola role hak akses, akun pengguna, atau relasi mata kuliah.
        </p>
      </div>

      {/* 3 Menu Cards */}
      <div className="flex flex-col gap-3">
        {MANAGEMENT_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={handlers[item.key]}
              className={`w-full flex items-center gap-4 p-4 rounded-3xl bg-white border-2 ${item.border} shadow-sm active:scale-[0.98] transition-all text-left group`}
            >
              <div
                className={`w-12 h-12 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform`}
              >
                <Icon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black text-slate-800 leading-snug">
                  {item.title}
                </h4>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-0.5 line-clamp-2">
                  {item.desc}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-slate-600 group-hover:bg-slate-100 transition-all shrink-0">
                <ChevronRight size={16} />
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default MobileManagementView;

