'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Building2,
  DoorClosed,
  ArrowRight,
  Inbox,
  CheckCircle2,
} from 'lucide-react';
import DenahGedungGrid from '../../Shared/Cards/DenahGedungGrid';
import { useMyProfile, loadMyProfile } from '@/lib/profileStore';
import { getAvatarSrc } from '@/lib/avatarValidation';

export interface UserLandingViewProps {
  userName: string;
  userGmail?: string;
  /** Foto profil (opsional). Kosong = logo SiRuang. */
  avatarSrc?: string;
  unreadCount: number;
  /**
   * Dipanggil saat CTA "Buka chat sekarang" diklik.
   * Handler dari WebTabLayout harus: setIsChatOpen(true) + (kalau ada roomId) markAsRead + setUnreadCount(0)
   */
  onOpenChat: () => void;
  /** Link ke halaman profil (diisi nanti). Kosong = tombol tidak melakukan apa-apa. */
  onOpenProfile?: () => void;
  /** Navigasi ke menu Persetujuan Booking Dosen */
  onOpenApprovals?: () => void;
  /** Jumlah permohonan yang menunggu ACC dosen */
  pendingApprovalCount?: number;
}

// Lebar jalur yang DIPAKAI BERSAMA oleh header (search + profil) dan isi dashboard,
// sama persis dengan AdminDashboardView.
const CONTENT_LANE = 'w-full max-w-[1400px] mx-auto';

export const UserLandingView: React.FC<UserLandingViewProps> = ({
  userName,
  userGmail,
  avatarSrc,
  unreadCount,
  onOpenChat,
  onOpenProfile,
  onOpenApprovals,
  pendingApprovalCount = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roomStats, setRoomStats] = useState({
    total: 15,
    tersedia: 13,
    sedangDigunakan: 0,
    loading: true,
  });

  // Fetch status real-time ruangan Gedung SFD (Lantai 3 & 8)
  useEffect(() => {
    async function loadRoomStats() {
      try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        // Gunakan jam sekarang agar status ruangan benar-benar real-time
        // (ruangan di luar jam jadwalnya jadi 'kosong' bukan 'jadwal_resmi')
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const jamSekarang = `${hh}:${mm}`;
        const [res8, res3] = await Promise.all([
          fetch(`/api/rooms/status?gedung=SFD&lantai=8&tanggal=${today}&jam=${jamSekarang}`).then(r => r.ok ? r.json() : null),
          fetch(`/api/rooms/status?gedung=SFD&lantai=3&tanggal=${today}&jam=${jamSekarang}`).then(r => r.ok ? r.json() : null),
        ]);

        const allRooms: any[] = [];
        if (res8?.data) Object.values(res8.data).forEach((r: any) => allRooms.push(r));
        if (res3?.data) Object.values(res3.data).forEach((r: any) => allRooms.push(r));

        if (allRooms.length > 0) {
          const total = allRooms.length;
          // Merah = dipakai (check-in aktif)
          const sedangDigunakan = allRooms.filter(r => r.status === 'dipakai').length;
          // Putih = kosong (tidak ada jadwal/booking aktif pada jam ini)
          const tersedia = allRooms.filter(r => r.bookable && r.status === 'kosong').length;
          setRoomStats({ total, tersedia, sedangDigunakan, loading: false });
        }
      } catch (err) {
        console.warn('Gagal memuat statistik ruangan:', err);
      }
    }

    loadRoomStats();
    const timer = setInterval(loadRoomStats, 15000);
    return () => clearInterval(timer);
  }, []);

  // Profil tersinkronisasi lewat profileStore global
  const { profile, status } = useMyProfile();
  useEffect(() => {
    loadMyProfile();
  }, []);

  const displayName = profile?.fullName || userName;
  const displayAvatar = getAvatarSrc(profile?.avatarUrl || avatarSrc);

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
      <header className="px-8 py-2.5 bg-white/80 backdrop-blur-md border-b border-slate-100 z-10 shrink-0">
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
              className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#588CBC] focus:ring-4 focus:ring-[#588CBC]/10 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={onOpenProfile}
            title="Buka Profil"
            className="flex items-center gap-3 shrink-0 cursor-pointer p-1 -mr-1 rounded-2xl hover:bg-slate-100/70 active:scale-95 transition-all group text-left"
          >
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden group-hover:border-[#588CBC] transition-all">
              {status === 'ready' || status === 'error' || profile?.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={displayAvatar}
                  alt={displayName}
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
              {userGmail && (
                <span className="text-[10px] font-medium text-slate-400">
                  {userGmail}
                </span>
              )}
            </div>
          </button>
        </div>
      </header>

      {/* CONTENT (Ngepas 1 Layar Tanpa Scroll) */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-8 py-4 lg:py-5">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${CONTENT_LANE} flex flex-col gap-3.5 lg:gap-4`}
        >
          {/* DASHBOARD HEADER */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-1 bg-[#588CBC] rounded-full"></div>
              <span className="text-[9px] font-black text-[#183449] uppercase tracking-[0.25em]">Dosen Dashboard</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">Selamat Datang, {displayName}!</h2>
            <p className="text-xs text-slate-400 font-medium max-w-2xl leading-relaxed">
              Tinjau dan setujui permohonan penggunaan ruangan kuliah dari PJ Kelas, pantau ketersediaan ruangan di Gedung SFD, atau hubungi Admin.
            </p>
          </div>

          {/* SHORTCUT & STATS DOSEN (REAL-TIME STATUS SFD) — gaya disamakan dengan card dashboard mahasiswa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 lg:mt-5">
            {/* Card 1: Persetujuan Booking (aksi utama) */}
            <button
              type="button"
              onClick={onOpenApprovals}
              className="group text-left bg-white rounded-2xl border-2 border-[#588CBC]/30 shadow-sm px-4 py-3.5 flex items-center gap-3 hover:border-[#588CBC] hover:shadow-md transition-all cursor-pointer active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#588CBC]/20"
            >
              <div className="relative w-11 h-11 rounded-xl bg-[#183449] text-white flex items-center justify-center shrink-0">
                <Inbox size={20} />
                {pendingApprovalCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white"
                    aria-label={`${pendingApprovalCount} permohonan baru`}
                  >
                    {pendingApprovalCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col leading-tight">
                <span className="text-sm font-black text-slate-800 truncate">Persetujuan Booking</span>
                <span className="text-[11px] text-slate-400 font-medium truncate mt-1">
                  {pendingApprovalCount > 0
                    ? `${pendingApprovalCount} permohonan menunggu ACC`
                    : 'Semua permohonan sudah ditinjau'}
                </span>
              </div>
              <ArrowRight
                size={16}
                className="text-[#588CBC] shrink-0 group-hover:translate-x-0.5 transition-transform"
              />
            </button>

            {/* Card 2: Ruangan Tersedia */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col leading-tight">
                <span className="text-sm font-black text-slate-800 truncate">Ruangan Tersedia</span>
                <span className="text-[11px] text-slate-400 font-medium truncate mt-1">Siap dipinjam saat ini</span>
              </div>
              <div className="flex items-baseline gap-1 shrink-0">
                <span className="text-2xl font-black text-slate-800 leading-none">
                  {roomStats.loading ? '...' : roomStats.tersedia}
                </span>
                <span className="text-[10px] font-medium text-slate-400">ruangan</span>
              </div>
            </div>

            {/* Card 3: Sedang Digunakan */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                <DoorClosed size={20} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col leading-tight">
                <span className="text-sm font-black text-slate-800 truncate">Sedang Digunakan</span>
                <span className="text-[11px] text-slate-400 font-medium truncate mt-1">Check-in aktif saat ini</span>
              </div>
              <div className="flex items-baseline gap-1 shrink-0">
                <span className="text-2xl font-black text-slate-800 leading-none">
                  {roomStats.loading ? '...' : roomStats.sedangDigunakan}
                </span>
                <span className="text-[10px] font-medium text-slate-400">ruangan</span>
              </div>
            </div>

            {/* Card 4: Total Ruangan Gedung SFD */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                <Building2 size={20} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col leading-tight">
                <span className="text-sm font-black text-slate-800 truncate">Gedung SFD</span>
                <span className="text-[11px] text-slate-400 font-medium truncate mt-1">Lantai 3 &amp; 8 terhubung</span>
              </div>
              <div className="flex items-baseline gap-1 shrink-0">
                <span className="text-2xl font-black text-slate-800 leading-none">
                  {roomStats.loading ? '15' : roomStats.total}
                </span>
                <span className="text-[10px] font-medium text-slate-400">ruangan</span>
              </div>
            </div>
          </div>

          {/* DENAH GEDUNG DENGAN FOTO BACKGROUND PENUH SESUAI DESAIN */}
          <DenahGedungGrid variant="web" />
        </motion.div>
      </div>
    </div>
  );
};

export default UserLandingView;