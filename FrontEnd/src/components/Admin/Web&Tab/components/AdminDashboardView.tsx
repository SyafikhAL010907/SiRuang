'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  ChevronRight,
  ShieldCheck,
  KeyRound,
  Network,
  CalendarCheck,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import StatGrid from '../../Shared/Cards/StatGrid';
import BuildingDenahGrid from '../../Shared/Cards/BuildingDenahGrid';
import { useMyProfile, loadMyProfile } from '@/lib/profileStore';
import { getAvatarSrc } from '@/lib/avatarValidation';

export interface AdminDashboardViewProps {
  adminName: string;
  adminGmail?: string; // opsional biar pemanggil lain nggak error
  rooms: any[];
  isInfoActive: boolean;
  networkLatency: number;
  totalUsersCount: number;
  onOpenProfile?: () => void;
  onOpenRoleAccess?: () => void;
  onOpenManajemenAkun?: () => void;
  onOpenRelasiMataKuliah?: () => void;
  onOpenBookingManagement?: () => void;
  onOpenImportJadwal?: () => void;
}

// ── Menu Role Access ──
const ROLE_ACCESS_MENUS: {
  label: string;
  key: 'role-access' | 'manajemen-akun' | 'relasi-mata-kuliah';
  icon: React.ElementType;
}[] = [
  { label: 'Konfigurasi Role Akses', key: 'role-access', icon: ShieldCheck },
  { label: 'Manajemen Akun', key: 'manajemen-akun', icon: KeyRound },
  { label: 'Manajemen Relasi Mata Kuliah', key: 'relasi-mata-kuliah', icon: Network },
];

// Skala card Denah Gedung (1 = ukuran asli). Kecilkan lagi (mis. 0.75) kalau masih ada scroll,
// atau besarkan (mis. 0.9) kalau mau lebih lega.
const DENAH_SCALE = 0.8;

// Lebar jalur yang DIPAKAI BERSAMA oleh header (search + profil) dan isi dashboard.
// Karena keduanya memakai kelas yang sama, tepi kiri search = tepi kiri konten,
// dan tepi kanan profil = tepi kanan konten. Saat sidebar menyusut/ditutup, jalurnya
// otomatis melebar mengikuti area yang tersedia (sampai batas maksimal ini).
// Mau konten lebih lebar/sempit di layar besar? Ubah angka 1400px.
const CONTENT_LANE = 'w-full max-w-[1400px] mx-auto';

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  adminName,
  adminGmail,
  rooms,
  isInfoActive,
  onOpenProfile,
  onOpenRoleAccess,
  onOpenManajemenAkun,
  onOpenRelasiMataKuliah,
  onOpenBookingManagement,
  onOpenImportJadwal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Profil dimuat sekali di sini dan dibagikan ke halaman profil lewat store,
  // jadi foto sudah siap sebelum user membuka profil.
  const { profile, status } = useMyProfile();
  useEffect(() => {
    loadMyProfile();
  }, []);
  const displayName = profile?.fullName || adminName;

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
              placeholder="Cari nama atau kode ruangan..."
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
              {adminGmail && (
                <span className="text-[10px] font-medium text-slate-400">
                  {adminGmail}
                </span>
              )}
            </div>
          </button>
        </div>
      </header>

      {/* CONTENT
          overflow-y-auto + scrollbar-hide: konten bisa di-scroll tanpa scrollbar terlihat,
          jadi 2 card baru di paling bawah tinggal digulir ke bawah. */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-8 py-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${CONTENT_LANE} flex flex-col gap-4`}
        >
          {/* DASHBOARD HEADER */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-1 bg-[#588CBC] rounded-full"></div>
              <span className="text-[10px] font-black text-[#183449] uppercase tracking-[0.3em]">Administrator Dashboard</span>
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Selamat Datang, {adminName}!</h2>
            <p className="text-sm text-slate-400 font-medium max-w-2xl leading-relaxed">
              Pantau seluruh aktivitas bantuan dan sistem user secara real-time dari panel kendali utama Anda.
            </p>
          </div>

          {/* STATS GRID */}
          <StatGrid variant="web" rooms={rooms} isInfoActive={isInfoActive} />

          {/* items-stretch: kartu hitam ikut setinggi kolom Denah Gedung,
              jadi bagian bawahnya sejajar dengan card denah paling bawah */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-stretch">
            {/* MANAJEMEN ROLE ACCESS */}
            <div className="lg:col-span-3 min-w-0 bg-black rounded-[32px] p-7 text-white shadow-2xl shadow-black/20 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <h3 className="text-2xl font-bold tracking-tight">Manajemen Role Access</h3>
                <p className="text-sm text-white/60 font-medium leading-relaxed max-w-xs">
                  Kelola hak akses pengguna dan atur peran dalam sistem secara mudah dan aman.
                </p>
              </div>

              {/* flex-1: baris kotak putih mengisi sisa tinggi kartu */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ROLE_ACCESS_MENUS.map(({ label, key, icon: Icon }) => {
                  const handlers: Record<string, (() => void) | undefined> = {
                    'role-access': onOpenRoleAccess,
                    'manajemen-akun': onOpenManajemenAkun,
                    'relasi-mata-kuliah': onOpenRelasiMataKuliah,
                  };
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={handlers[key]}
                      className="group bg-white text-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-5 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-pointer text-left"
                    >
                      <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center">
                        <Icon size={18} />
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <span className="text-[11px] font-semibold leading-snug">{label}</span>
                        <ChevronRight
                          size={14}
                          className="text-slate-400 shrink-0 group-hover:translate-x-0.5 group-hover:text-slate-700 transition-all"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PILIH GEDUNG (diperkecil lewat DENAH_SCALE, komponen aslinya tidak diubah) */}
            <div className="lg:col-span-2 min-w-0 flex flex-col">
              <div style={{ zoom: DENAH_SCALE }}>
                <BuildingDenahGrid variant="web" />
              </div>
            </div>
          </div>

          {/* PENGAJUAN BOOKING & IMPORT JADWAL SIAKAD (paling bawah) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
            {/* Card: Pengajuan & Monitoring Booking */}
            <button
              type="button"
              onClick={onOpenBookingManagement}
              className="group text-left bg-white rounded-2xl border-2 border-[#588CBC]/30 shadow-sm px-5 py-4 flex items-center gap-4 hover:border-[#588CBC] hover:shadow-md transition-all cursor-pointer active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#588CBC]/20"
            >
              <div className="w-12 h-12 rounded-xl bg-[#183449] text-white flex items-center justify-center shrink-0">
                <CalendarCheck size={22} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col leading-tight">
                <span className="text-sm font-black text-slate-800">Pengajuan Booking Ruangan</span>
                <span className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1 line-clamp-2">
                  Pantau pengajuan ruangan, persetujuan dosen, jadwal aktif, dan riwayat presensi di seluruh gedung perkuliahan.
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 text-[#588CBC] flex items-center justify-center shrink-0 group-hover:bg-[#183449] group-hover:border-[#183449] group-hover:text-white transition-all">
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            {/* Card: Import Jadwal Resmi (SIAKAD) */}
            <button
              type="button"
              onClick={onOpenImportJadwal}
              className="group text-left bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-4 hover:border-[#588CBC]/60 hover:shadow-md transition-all cursor-pointer active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#588CBC]/20"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 text-[#183449] flex items-center justify-center shrink-0 group-hover:bg-[#183449] group-hover:border-[#183449] group-hover:text-white transition-all">
                <FileSpreadsheet size={22} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col leading-tight">
                <span className="text-sm font-black text-slate-800">Import Jadwal Resmi (SIAKAD)</span>
                <span className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1 line-clamp-2">
                  Unggah spreadsheet jadwal kuliah semester dari SIAKAD agar status jadwal resmi di denah ikut terbarui.
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 text-[#588CBC] flex items-center justify-center shrink-0 group-hover:bg-[#183449] group-hover:border-[#183449] group-hover:text-white transition-all">
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboardView;