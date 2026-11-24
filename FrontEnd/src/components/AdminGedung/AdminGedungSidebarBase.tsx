'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MessageSquare,
  LogOut,
  ChevronLeft,
  CalendarCheck,
  LayoutDashboard,
  User,
  Clock,
  Trash2,
  UserPlus,
} from 'lucide-react';
import Avatar from '@/components/Shared/Avatar';
import { cn } from '@/lib/utils';
import { clearMyProfile } from '@/lib/profileStore';
import { AdminGedungConfig } from './types';

export interface AdminGedungSidebarBaseProps {
  config: AdminGedungConfig;
  adminName: string;
  currentView?: string;
  onSelectView?: (view: 'dashboard' | 'booking-management' | 'profile') => void;
  onDeselectChat?: () => void;
  rooms: any[];
  filteredRooms: any[];
  selectedChat: any | null;
  activeFilter: 'unreading' | 'reading';
  setActiveFilter: (filter: 'unreading' | 'reading') => void;
  roomSearchQuery: string;
  setRoomSearchQuery: (query: string) => void;
  handleSelectRoom: (room: any) => void;
  showAlert: (message: string, title?: string) => void;
  onOpenSearchUser?: () => void;
}

const SIDEBAR_STORAGE_KEY = 'adminGedungSidebarOpen';

export const AdminGedungSidebarBase: React.FC<AdminGedungSidebarBaseProps> = ({
  config,
  adminName,
  currentView = 'dashboard',
  onSelectView,
  onDeselectChat,
  rooms,
  filteredRooms,
  selectedChat,
  activeFilter,
  setActiveFilter,
  roomSearchQuery,
  setRoomSearchQuery,
  handleSelectRoom,
  showAlert,
  onOpenSearchUser,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Ambil jumlah pending approval
  useEffect(() => {
    let isMounted = true;
    async function fetchCount() {
      try {
        const res = await fetch('/api/admin/bookings');
        if (res.ok) {
          const json = await res.json();
          const data = json.data || [];
          const pending = data.filter((b: any) =>
            b.approval_admin_gedung === 'pending' &&
            (b.status === 'menunggu_approval' || b.status === 'menunggu_dosen')
          );
          if (isMounted) setPendingCount(pending.length);
        }
      } catch {}
    }
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'false') setIsOpen(false);
    } catch {}
  }, []);

  const toggleSidebar = () => {
    const next = !isOpen;
    setIsOpen(next);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    } catch {}
  };

  const handleLogout = () => {
    clearMyProfile();
    localStorage.clear();
    // Hapus auth cookie jika ada
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/login';
  };

  const unreadChatCount = rooms.filter((r) => (r.unread_count || 0) > 0).length;

  return (
    <div className="relative flex shrink-0 z-20">
      <aside
        className={cn(
          "relative bg-white flex overflow-hidden border-r border-slate-100 shadow-[10px_0_30px_-15px_rgba(0,0,0,0.05)]",
          "transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          isOpen ? "w-72 lg:w-80" : "w-20"
        )}
      >
        <div
          aria-hidden={!isOpen}
          className={cn(
            "shrink-0 w-72 lg:w-80 flex flex-col transition-all duration-300",
            isOpen ? "opacity-100 delay-150" : "opacity-0 invisible pointer-events-none"
          )}
        >
          {/* TOP BANNER */}
          <div className="px-5 pt-4 pb-2">
            <div
              onClick={() => {
                if (onDeselectChat) onDeselectChat();
                if (onSelectView) onSelectView('dashboard');
              }}
              title="Klik untuk kembali ke Beranda Dashboard"
              className="bg-gradient-to-br from-[#07111E] via-[#0B1B30] to-[#123252] rounded-[28px] p-4 text-white shadow-xl shadow-[#0B192C]/30 ring-1 ring-white/10 relative overflow-hidden group cursor-pointer"
            >
              <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-[#38BDF8]/25 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="shrink-0">
                    <Image
                      src="/LogoSiRuangPolos.png"
                      alt="Logo SiRuang"
                      width={44}
                      height={44}
                      className="object-contain drop-shadow-lg"
                    />
                  </motion.div>
                  <div className="flex flex-col min-w-0">
                    <h4 className="text-sm font-black leading-snug tracking-tight text-white drop-shadow-sm truncate">
                      {adminName}
                    </h4>
                    <span className="text-[10px] font-bold text-[#38BDF8] tracking-wider uppercase">
                      Admin Gedung {config.gedung}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full">
                  <div className="flex-1 flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md py-1.5 rounded-xl border border-white/10 shadow-sm">
                    <div className="w-5 h-5 bg-[#38BDF8] rounded-lg flex items-center justify-center text-[#0B192C] shadow-sm">
                      <MessageSquare size={10} />
                    </div>
                    <span className="text-[9px] font-black text-white whitespace-nowrap uppercase tracking-tighter">
                      {unreadChatCount} Respon Chat
                    </span>
                  </div>
                  <div className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 backdrop-blur-md py-1.5 rounded-xl border border-white/10 shadow-sm">
                    <span className="text-[9px] font-black text-[#38BDF8] whitespace-nowrap uppercase tracking-tighter">
                      {config.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CHAT SECTION HEADER & SEARCH */}
          <div className="px-4 pt-2 pb-1">
            <div className="px-1 pb-1.5 flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <MessageSquare size={12} className="text-[#588CBC]" />
                Pesan Bantuan User
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                {rooms.length} Room
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative group flex-1">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors">
                  <Search size={14} />
                </div>
                <input
                  type="text"
                  placeholder="Cari user atau pesan..."
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#588CBC] transition-all"
                />
              </div>
              {onOpenSearchUser && (
                <button
                  type="button"
                  onClick={onOpenSearchUser}
                  title="Mulai Chat Baru"
                  className="p-2 bg-[#183449] hover:bg-[#588CBC] text-white rounded-xl shadow-xs transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                >
                  <UserPlus size={15} />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 mt-2 p-1 bg-slate-100/60 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveFilter('unreading')}
                className={cn(
                  "flex-1 py-1 text-[10px] font-black rounded-lg transition-all",
                  activeFilter === 'unreading'
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Belum Terbaca ({unreadChatCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('reading')}
                className={cn(
                  "flex-1 py-1 text-[10px] font-black rounded-lg transition-all",
                  activeFilter === 'reading'
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Semua Chat ({rooms.length})
              </button>
            </div>
          </div>

          {/* CHAT ROOM LIST */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200">
            {filteredRooms.length === 0 ? (
              <div className="text-center py-8 px-4 text-slate-400 text-xs">
                Tidak ada riwayat chat
              </div>
            ) : (
              filteredRooms.map((room) => {
                const isSelected = selectedChat?.id === room.id;
                const unread = room.unread_count || 0;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleSelectRoom(room)}
                    className={cn(
                      "w-full p-2.5 rounded-2xl flex items-center gap-3 transition-all text-left cursor-pointer",
                      isSelected
                        ? "bg-[#183449] text-white shadow-md shadow-[#183449]/20"
                        : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        src={room.avatar_url || '/LogoSiRuangPolos.png'}
                        alt={room.user_name || 'User'}
                        size="md"
                        className="rounded-full border border-slate-200"
                      />
                      {room.is_online && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn(
                          "text-xs font-bold truncate",
                          isSelected ? "text-white" : "text-slate-800"
                        )}>
                          {room.user_name || room.user_identifier || 'User'}
                        </span>
                        {unread > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white shrink-0">
                            {unread}
                          </span>
                        )}
                      </div>
                      <p className={cn(
                        "text-[10px] truncate mt-0.5",
                        isSelected ? "text-slate-300" : "text-slate-400"
                      )}>
                        {room.last_message || 'Belum ada pesan'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* BOTTOM ACTIONS: PROFIL & LOGOUT */}
          <div className="p-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                if (onDeselectChat) onDeselectChat();
                if (onSelectView) onSelectView('profile');
              }}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <User size={15} />
              <span>Profil Saya</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              title="Keluar dari akun"
              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* TOGGLE BUTTON */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 z-30 transition-transform cursor-pointer"
        >
          <ChevronLeft size={14} className={cn("transition-transform duration-300", !isOpen && "rotate-180")} />
        </button>
      </aside>
    </div>
  );
};

export default AdminGedungSidebarBase;

