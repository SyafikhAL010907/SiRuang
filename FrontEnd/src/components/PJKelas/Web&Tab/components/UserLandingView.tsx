'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Building2,
  LayoutGrid,
  DoorClosed,
  CalendarDays,
  ArrowRight,
  Clock,
  CheckCircle2,
  CalendarPlus,
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
  /** Navigasi ke menu PJ Kelas */
  onOpenHistory?: () => void;
  onOpenCheckin?: () => void;
  onOpenBooking?: () => void;
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
  onOpenHistory,
  onOpenCheckin,
  onOpenBooking,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [checkinLoading, setCheckinLoading] = useState(false);
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
          fetch(`/api/rooms/status?gedung=SFD&lantai=8&tanggal=${today}&jam=${jamSekarang}`).then((r) => (r.ok ? r.json() : null)),
          fetch(`/api/rooms/status?gedung=SFD&lantai=3&tanggal=${today}&jam=${jamSekarang}`).then((r) => (r.ok ? r.json() : null)),
        ]);

        const allRooms: any[] = [];
        if (res8?.data) Object.values(res8.data).forEach((r: any) => allRooms.push(r));
        if (res3?.data) Object.values(res3.data).forEach((r: any) => allRooms.push(r));

        if (allRooms.length > 0) {
          const total = allRooms.length;
          // Merah = dipakai (check-in aktif)
          const sedangDigunakan = allRooms.filter((r) => r.status === 'dipakai').length;
          // Putih = kosong (tidak ada jadwal/booking aktif pada jam ini)
          const tersedia = allRooms.filter((r) => r.bookable && r.status === 'kosong').length;
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

  const fetchActiveBookings = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      let list: any[] = [];
      const res = await fetch('/api/bookings', { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          list = json.data;
        }
      }

      if (list.length === 0) {
        const resUser = await fetch('/api/user/bookings', { headers });
        if (resUser.ok) {
          const jsonUser = await resUser.json();
          if (jsonUser.data && Array.isArray(jsonUser.data)) {
            list = jsonUser.data;
          }
        }
      }

      if (list.length === 0) {
        try {
          const [res8, res3] = await Promise.all([
            fetch('/api/rooms/status?gedung=SFD&lantai=8'),
            fetch('/api/rooms/status?gedung=SFD&lantai=3'),
          ]);
          const [json8, json3] = await Promise.all([
            res8.ok ? res8.json() : null,
            res3.ok ? res3.json() : null,
          ]);

          const extracted: any[] = [];
          const extractFromRooms = (dataObj: any) => {
            if (!dataObj) return;
            Object.values(dataObj).forEach((room: any) => {
              if (room.bookings && Array.isArray(room.bookings)) {
                room.bookings.forEach((b: any) => {
                  extracted.push({
                    ...b,
                    rooms: {
                      id: b.room_id || room.id,
                      kode: room.kode || b.rooms?.kode || 'Ruangan',
                      nama: room.nama || b.rooms?.nama || '',
                      gedung: room.gedung || 'SFD',
                      lantai: room.lantai || 8,
                    },
                  });
                });
              }
            });
          };

          extractFromRooms(json8?.data);
          extractFromRooms(json3?.data);

          if (extracted.length > 0) {
            list = extracted;
          }
        } catch {}
      }

      setActiveBookings(list);
    } catch {}
  };

  useEffect(() => {
    fetchActiveBookings();
  }, []);

  // Profil tersinkronisasi lewat profileStore global
  const { profile, status } = useMyProfile();
  useEffect(() => {
    loadMyProfile();
  }, []);

  const displayName = profile?.fullName || userName;
  const displayAvatar = getAvatarSrc(profile?.avatarUrl || avatarSrc);

  const readyBooking = activeBookings.find((b: any) =>
    ['disetujui_dosen', 'dijadwalkan_admin', 'menunggu_checkin'].includes(b.status)
  );

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
              <span className="text-[9px] font-black text-[#183449] uppercase tracking-[0.25em]">PJ Kelas Dashboard</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">Selamat Datang, {displayName}!</h2>
            <p className="text-xs text-slate-400 font-medium max-w-2xl leading-relaxed">
              Kelola pengajuan peminjaman ruangan perkuliahan Gedung SFD, lakukan check-in kehadiran, atau konsultasikan jadwal dengan Dosen dan Admin.
            </p>
          </div>

          {/* BANNER NOTIFIKASI CHECK-IN SAAT ADA BOOKING YANG DI-ACC DOSEN */}
          {readyBooking && (
            <div className="bg-white/95 backdrop-blur-md border border-amber-300/80 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#183449] text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0 border border-slate-200">
                  {readyBooking.rooms?.kode?.replace('R.', '') || 'SFD'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Disetujui Dosen · Kuning
                    </span>
                    <span className="text-xs text-slate-800 font-bold">
                      {readyBooking.rooms?.kode} · {readyBooking.mata_kuliah}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 font-bold mt-1">
                    Peminjaman Anda telah di-ACC Dosen! Ruangan {readyBooking.rooms?.kode} ditandai Kuning di denah.
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span>
                      📅 {new Date(readyBooking.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <span>•</span>
                    <span>
                      ⏰ {readyBooking.jam_mulai?.slice(0, 5)}–{readyBooking.jam_selesai?.slice(0, 5)} WIB
                    </span>
                    <span>•</span>
                    <span className="text-slate-600">Presensi dibuka di menu Check-in</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onOpenCheckin}
                  className="px-5 py-2.5 bg-[#183449] hover:bg-[#122838] text-white text-xs font-bold rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 size={15} className="text-amber-400" />
                  <span>Buka Check-in</span>
                  <ArrowRight size={13} className="text-slate-300" />
                </button>
              </div>
            </div>
          )}

          {/* MENU SHORTCUT & STATS STATUS SFD PJ KELAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 lg:mt-4">
            {/* Shortcut 1: Check-in Ruangan (Presensi Cepat) */}
            <div
              onClick={onOpenCheckin}
              className="bg-white rounded-2xl border-2 border-emerald-200 shadow-md p-3.5 flex items-center justify-between gap-3 hover:border-[#588CBC] hover:shadow-md transition-all cursor-pointer group hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                  <CheckCircle2 size={22} />
                </div>
                <div className="flex flex-col leading-tight min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Presensi
                    </span>
                    {readyBooking && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </div>
                  <span className="text-sm font-black text-slate-800 mt-1 group-hover:text-emerald-700 transition-colors">
                    Check-in Ruangan
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                    Presensi perkuliahan langsung
                  </span>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Shortcut 2: Riwayat Booking */}
            <div
              onClick={onOpenHistory}
              className="bg-white rounded-2xl border-2 border-purple-200 shadow-md p-3.5 flex items-center justify-between gap-3 hover:border-purple-500 hover:shadow-lg transition-all cursor-pointer group hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                  <CalendarDays size={22} />
                </div>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-[9px] font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full w-fit">
                    Riwayat
                  </span>
                  <span className="text-sm font-black text-slate-800 mt-1 group-hover:text-purple-700 transition-colors">
                    Riwayat Booking
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                    Pantau status &amp; jadwal aktif
                  </span>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-all">
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Card 3: Ruangan Tersedia (Putih) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[11px] font-semibold text-slate-500">Ruangan Tersedia</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-slate-800">
                    {roomStats.loading ? '...' : roomStats.tersedia}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">ruangan</span>
                </div>
                <span className="text-[9px] text-emerald-600 font-bold mt-0.5">
                  ● Status Kosong (Putih)
                </span>
              </div>
            </div>

            {/* Card 4: Sedang Digunakan (Merah) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <DoorClosed size={20} />
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[11px] font-semibold text-slate-500">Sedang Digunakan</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-slate-800">
                    {roomStats.loading ? '...' : roomStats.sedangDigunakan}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">ruangan</span>
                </div>
                <span className="text-[9px] text-rose-600 font-bold mt-0.5">
                  ● Kuliah Berlangsung (Merah)
                </span>
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