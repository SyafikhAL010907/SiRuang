'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search,
  CalendarCheck,
  ArrowRight,
  Building2,
  Cpu,
  HardHat,
  ChevronRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import StatGrid from '../Admin/Shared/Cards/StatGrid';
import { useMyProfile, loadMyProfile } from '@/lib/profileStore';
import { getAvatarSrc } from '@/lib/avatarValidation';
import { AdminGedungConfig } from './types';
import { cn } from '@/lib/utils';

export interface AdminGedungLandingBaseProps {
  config: AdminGedungConfig;
  adminName: string;
  adminGmail?: string;
  rooms: any[];
  isInfoActive: boolean;
  onOpenProfile?: () => void;
  onOpenBookingManagement?: () => void;
}

const CONTENT_LANE = 'w-full max-w-[1400px] mx-auto';

export const AdminGedungLandingBase: React.FC<AdminGedungLandingBaseProps> = ({
  config,
  adminName,
  adminGmail,
  rooms,
  isInfoActive,
  onOpenProfile,
  onOpenBookingManagement,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isLoadingCount, setIsLoadingCount] = useState<boolean>(true);

  const { profile, status } = useMyProfile();
  useEffect(() => {
    loadMyProfile();
  }, []);

  const displayName = profile?.fullName || adminName;

  // Ambil jumlah pending approval untuk gedung ini
  useEffect(() => {
    let isMounted = true;
    async function fetchPending() {
      try {
        const res = await fetch('/api/admin/bookings');
        if (res.ok) {
          const json = await res.json();
          const data = json.data || [];
          const pending = data.filter((b: any) =>
            b.approval_admin_gedung === 'pending' &&
            (b.status === 'menunggu_approval' || b.status === 'menunggu_dosen')
          );
          if (isMounted) {
            setPendingCount(pending.length);
          }
        }
      } catch (err) {
        console.error('Gagal mengambil pending bookings:', err);
      } finally {
        if (isMounted) setIsLoadingCount(false);
      }
    }
    fetchPending();
    return () => {
      isMounted = false;
    };
  }, []);

  const BuildingIcon =
    config.gedung === 'SFD'
      ? Building2
      : config.gedung === 'LE'
      ? Cpu
      : HardHat;

  return (
    <div
      className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F8FAFB]"
      style={{
        backgroundImage: `url('/Batik.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* TOP BAR: SEARCH + PROFIL */}
      <header className="px-8 py-3 bg-white/80 backdrop-blur-md border-b border-slate-100 z-10 shrink-0">
        <div className={`${CONTENT_LANE} flex items-center justify-between gap-6`}>
          <div className="flex-1 min-w-0 max-w-3xl relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari aktivitas bantuan atau ruangan..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-full text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#588CBC] focus:ring-4 focus:ring-[#588CBC]/10 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={onOpenProfile}
            title="Buka Profil Administrator"
            className="flex items-center gap-3 shrink-0 cursor-pointer p-1.5 -mr-1.5 rounded-2xl hover:bg-slate-100/70 active:scale-95 transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden group-hover:border-[#588CBC] transition-all">
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
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-black text-slate-800 group-hover:text-[#588CBC] transition-colors">
                {displayName}
              </span>
              <span className="text-[10px] font-semibold text-[#588CBC]">
                Admin {config.gedung}
              </span>
            </div>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-8 py-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${CONTENT_LANE} flex flex-col gap-6`}
        >
          {/* DASHBOARD HEADER */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-1 bg-[#588CBC] rounded-full" />
              <span className="text-[10px] font-black text-[#183449] uppercase tracking-[0.3em]">
                Administrator {config.label}
              </span>
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">
              Selamat Datang, {adminName}!
            </h2>
            <p className="text-sm text-slate-400 font-medium max-w-2xl leading-relaxed">
              Pantau seluruh aktivitas bantuan dan sistem user secara real-time dari panel kendali utama Anda.
            </p>
          </div>

          {/* STATS GRID (Live Sync, Total Chat, Perlu Respon/Unread, Terbaca, Auto-Response, User Online) */}
          <StatGrid variant="web" rooms={rooms} isInfoActive={isInfoActive} />

          {/* TWO MAIN CARDS: DENAH GEDUNG SENDIRI & ACC PENGAJUAN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* CARD 1: DENAH GEDUNG (HANYA GEDUNG INI) */}
            <div className="bg-white rounded-[28px] border-2 border-slate-100/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
              <div
                className={cn(
                  "pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-30",
                  config.glowColor
                )}
              />

              <div className="flex flex-col gap-4 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <BuildingIcon size={14} className="text-[#588CBC]" />
                    Denah Gedung Terkelola
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black tracking-wider">
                    {config.gedung}
                  </span>
                </div>

                <div className="w-full h-44 rounded-2xl overflow-hidden relative flex items-center justify-center bg-slate-50 border border-slate-100 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={config.denahImage}
                    alt={config.label}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                  <div className="absolute bottom-3 left-4 text-white font-black text-sm drop-shadow-md">
                    {config.label}
                  </div>
                </div>

                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Pantau ketersediaan, denah lantai visual, dan status okupansi ruangan di {config.buildingName}.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 relative z-10">
                <Link
                  href={config.denahHref}
                  className="w-full inline-flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 hover:bg-[#183449] text-slate-700 hover:text-white font-bold text-xs transition-all group/btn"
                >
                  <span>Buka Denah Visual {config.gedung}</span>
                  <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* CARD 2: PENGAJUAN ACC BOOKING */}
            <div className="bg-white rounded-[28px] border-2 border-[#588CBC]/30 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-30 bg-[#588CBC]" />

              <div className="flex flex-col gap-4 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CalendarCheck size={14} className="text-[#588CBC]" />
                    Persetujuan Booking
                  </span>
                  {isLoadingCount ? (
                    <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" />
                  ) : pendingCount > 0 ? (
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black tracking-wider animate-pulse flex items-center gap-1">
                      <Clock size={10} />
                      {pendingCount} Perlu Respon
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={10} />
                      Semua Terproses
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                  <div className="w-12 h-12 rounded-xl bg-[#183449] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#183449]/20">
                    <CalendarCheck size={22} className="text-[#38BDF8]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-slate-800 tracking-tight">
                      ACC Pengajuan Ruangan
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                      Tinjau permohonan peminjaman ruangan dari dosen dan PJ Kelas untuk {config.buildingName}.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Status Persetujuan
                    </span>
                    <span className="text-sm font-black text-slate-800 mt-0.5 block">
                      Admin {config.gedung}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Tindakan Pending
                    </span>
                    <span className={cn(
                      "text-sm font-black mt-0.5 block",
                      pendingCount > 0 ? "text-amber-600 font-black" : "text-slate-800"
                    )}>
                      {pendingCount} Pengajuan
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 relative z-10">
                <button
                  type="button"
                  onClick={onOpenBookingManagement}
                  className="w-full inline-flex items-center justify-between px-4 py-3 rounded-xl bg-[#183449] hover:bg-[#0f2434] text-white font-bold text-xs transition-all shadow-md shadow-[#183449]/20 cursor-pointer group/btn"
                >
                  <span>Kelola Pengajuan & Beri ACC</span>
                  <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform text-[#38BDF8]" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminGedungLandingBase;

