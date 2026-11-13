'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MessageSquare,
  Settings,
  Trash2,
  Plus,
  LogOut,
  ChevronLeft
} from 'lucide-react';
import { format } from 'date-fns';
import Avatar from '@/components/Shared/Avatar';
import { cn } from '@/lib/utils';
import BlessChatModal from '../../Shared/Modals/BlessChatModal';
import { clearMyProfile } from '@/lib/profileStore';

export interface AdminSidebarProps {
  adminName: string;
  rooms: any[];
  filteredRooms: any[];
  selectedChat: any | null;
  activeFilter: 'unreading' | 'reading';
  setActiveFilter: (filter: 'unreading' | 'reading') => void;
  roomSearchQuery: string;
  setRoomSearchQuery: (query: string) => void;
  isDeleteMode: boolean;
  setIsDeleteMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  selectedRooms: number[];
  setSelectedRooms: (val: number[] | ((prev: number[]) => number[])) => void;
  toggleSelectRoom: (id: number) => void;
  toggleSelectAll: () => void;
  handleBulkDelete: () => void;
  handleSelectRoom: (room: any) => void;
  isInfoActive: boolean;
  isAILoading: boolean;
  handleAIToggleRequest: (state: boolean) => void;
  showBlessModal: boolean;
  setShowBlessModal: (show: boolean) => void;
  blessMessage: string;
  setBlessMessage: (msg: string) => void;
  blessFile: any;
  setBlessFile: (file: any) => void;
  blessTargetMode: 'waiting_room' | 'all_users' | 'specific_users';
  setBlessTargetMode: (mode: 'waiting_room' | 'all_users' | 'specific_users') => void;
  allUsers: { username: string; gmail: string }[];
  selectedBlessUsers: string[];
  setSelectedBlessUsers: React.Dispatch<React.SetStateAction<string[]>>;
  userSearchQuery: string;
  setUserSearchQuery: (q: string) => void;
  isBlasting: boolean;
  handleBlessChat: () => void;
  viewFile: (dataUrl: string, fileName?: string) => void;
  showAlert: (message: string, title?: string) => void;
}

const SIDEBAR_STORAGE_KEY = 'adminSidebarOpen';

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  adminName,
  rooms,
  filteredRooms,
  selectedChat,
  activeFilter,
  setActiveFilter,
  roomSearchQuery,
  setRoomSearchQuery,
  isDeleteMode,
  setIsDeleteMode,
  selectedRooms,
  setSelectedRooms,
  toggleSelectRoom,
  toggleSelectAll,
  handleBulkDelete,
  handleSelectRoom,
  isInfoActive,
  isAILoading,
  handleAIToggleRequest,
  showBlessModal,
  setShowBlessModal,
  blessMessage,
  setBlessMessage,
  blessFile,
  setBlessFile,
  blessTargetMode,
  setBlessTargetMode,
  allUsers,
  selectedBlessUsers,
  setSelectedBlessUsers,
  userSearchQuery,
  setUserSearchQuery,
  isBlasting,
  handleBlessChat,
  viewFile,
  showAlert,
}) => {
  // ── Buka / tutup sidebar (state disimpan di sini supaya WebTabLayout tidak perlu diubah) ──
  const [isOpen, setIsOpen] = useState(true);

  // Tooltip kotak info saat kursor di atas foto profil (sidebar mini).
  // Pakai posisi "fixed" supaya tidak terpotong oleh sidebar yang sempit.
  const [railTip, setRailTip] = useState<{ chat: any; top: number; left: number } | null>(null);

  const showRailTip = (e: React.SyntheticEvent<HTMLElement>, chat: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRailTip({ chat, top: rect.top + rect.height / 2, left: rect.right + 10 });
  };
  const hideRailTip = () => setRailTip(null);

  // Ingat pilihan terakhir user
  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'false') setIsOpen(false);
    } catch {
      /* abaikan kalau localStorage tidak tersedia */
    }
  }, []);

  const toggleSidebar = () => {
    const next = !isOpen;
    setIsOpen(next);
    setRailTip(null);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    } catch {
      /* abaikan */
    }
  };

  return (
    <div className="relative flex shrink-0 z-20">
      <aside
        className={cn(
          "relative bg-white flex overflow-hidden border-r border-slate-100 shadow-[10px_0_30px_-15px_rgba(0,0,0,0.05)]",
          "transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          isOpen ? "w-72 lg:w-80" : "w-20"
        )}
      >
        {/* ───────────── SIDEBAR PENUH (saat terbuka) ─────────────
            Lebar isi dikunci supaya tidak "gepeng" saat animasi buka-tutup */}
        <div
          aria-hidden={!isOpen}
          className={cn(
            "shrink-0 w-72 lg:w-80 flex flex-col transition-all duration-300",
            isOpen ? "opacity-100 delay-150" : "opacity-0 invisible pointer-events-none"
          )}
        >
          {/* TOP PREMIUM CARD (Floating Style, versi ringkas) */}
          <div className="px-5 pt-4 pb-2">
            <div className="bg-linear-to-br from-[#07111E] via-[#0B1B30] to-[#123252] rounded-[28px] p-4 text-white shadow-xl shadow-[#0B192C]/30 ring-1 ring-white/10 relative overflow-hidden group">
              {/* Decorative Elements */}
              <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
              <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-[#38BDF8]/25 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent"></div>

              <div className="relative z-10 flex flex-col gap-3">
                {/* Top Row: Logo & Welcome Message */}
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="shrink-0"
                  >
                    <Image
                      src="/LogoSiRuangPolos.png"
                      alt="Logo SiRuang"
                      width={46}
                      height={46}
                      className="object-contain drop-shadow-lg"
                    />
                  </motion.div>
                  <div className="flex flex-col min-w-0">
                    <h4 className="text-base font-bold leading-snug tracking-tight text-white drop-shadow-sm">Selamat Datang,<br />{adminName}!</h4>
                  </div>
                </div>

                {/* Bottom Row: Integrated Stats & Toggle (Stretched 50/50) */}
                <div className="flex items-center gap-2 w-full relative z-20">
                  {/* Mini Stats - Flex 1 */}
                  <div className="flex-1 flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md py-1.5 rounded-xl border border-white/10 shadow-sm">
                    <div className="w-5 h-5 bg-[#38BDF8] rounded-lg flex items-center justify-center text-[#0B192C] shadow-sm">
                      <MessageSquare size={10} />
                    </div>
                    <span className="text-[9px] font-black text-white whitespace-nowrap uppercase tracking-tighter">
                      {rooms.filter(r => (r.unread_count || 0) > 0).length} Respon
                    </span>
                  </div>

                  {/* Mini Toggle - Flex 1 */}
                  <div className="flex-1 flex items-center justify-between gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-sm group/mini">
                    <div className="flex items-center gap-1.5">
                      <Settings size={12} className="text-[#38BDF8] group-hover/mini:rotate-90 transition-transform duration-500" />
                      <span className="text-[9px] font-black text-white uppercase tracking-tighter">AI</span>
                    </div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        // ⚠️  DISABLE: Ganti handleAIToggleRequest → setIsInfoActive(!isInfoActive)
                        if (!isAILoading) handleAIToggleRequest(!isInfoActive);
                      }}
                      className={cn(
                        "relative w-8 h-4 rounded-full p-0.5 transition-all duration-500 cursor-pointer",
                        isInfoActive ? "bg-[#38BDF8]" : "bg-white/20",
                        isAILoading && "opacity-60 cursor-wait"
                      )}
                    >
                      <motion.div
                        animate={{ x: isInfoActive ? 16 : 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="w-3 h-3 bg-white rounded-full shadow-md flex items-center justify-center"
                      >
                        {isAILoading ? (
                          <div className="w-2 h-2 border border-[#38BDF8] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className={cn(
                            "w-1 h-1 rounded-full",
                            isInfoActive ? "bg-[#0B192C]" : "bg-slate-300"
                          )} />
                        )}
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pb-2">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#38BDF8] transition-colors duration-300">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={roomSearchQuery}
                onChange={(e) => setRoomSearchQuery(e.target.value)}
                placeholder="Cari user atau pesan..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-[#38BDF8] focus:ring-4 focus:ring-[#38BDF8]/10 transition-all duration-300"
              />
            </div>
          </div>

          <div className="px-4 pb-2">
            <div className="flex bg-slate-50/80 p-1 rounded-2xl border border-slate-100 min-h-10 items-center justify-center relative overflow-hidden">
              <AnimatePresence mode="wait">
                {isDeleteMode ? (
                  <motion.div
                    key="delete-mode-active"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="flex w-full gap-1.5"
                  >
                    <button
                      onClick={toggleSelectAll}
                      className="flex-1 py-1.5 px-3 rounded-xl text-[10px] font-black text-[#183449] bg-white shadow-xs border border-[#588CBC]/20 whitespace-nowrap"
                    >
                      {selectedRooms.length === filteredRooms.length ? "Batal Semua" : "Pilih Semua"}
                    </button>

                    <button
                      onClick={() => {
                        setIsDeleteMode(false);
                        setSelectedRooms([]);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl text-[10px] font-black text-red-600 bg-red-50 border border-red-100 shadow-xs"
                    >
                      Batal
                    </button>

                    <button
                      onClick={handleBulkDelete}
                      disabled={selectedRooms.length === 0}
                      className={cn(
                        "flex-1 py-1.5 px-3 rounded-xl text-[10px] font-black text-white shadow-lg transition-all active:scale-95 whitespace-nowrap",
                        selectedRooms.length > 0 ? "bg-red-500 shadow-red-200" : "bg-slate-300 shadow-none grayscale cursor-not-allowed"
                      )}
                    >
                      Hapus ({selectedRooms.length})
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="delete-mode-off"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setIsDeleteMode(true)}
                    className="w-full flex items-center justify-center gap-2 py-1.5 px-4 bg-white text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xs hover:bg-slate-50 transition-all"
                  >
                    <Trash2 size={14} />
                    Mode Hapus
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="px-4 pb-2">
            <div className="flex bg-slate-50/80 p-1 rounded-2xl border border-slate-100 gap-1">
              <button
                onClick={() => setActiveFilter('unreading')}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-1.5",
                  activeFilter === 'unreading'
                    ? "bg-white text-[#183449] shadow-sm ring-1 ring-slate-200/50"
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                )}
              >
                Unreading
                {rooms.filter(r => r.unread > 0).length > 0 && (
                  <span className="flex h-2 w-2 rounded-full bg-[#588CBC] animate-pulse"></span>
                )}
              </button>
              <button
                onClick={() => setActiveFilter('reading')}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all duration-300",
                  activeFilter === 'reading'
                    ? "bg-white text-[#183449] shadow-sm ring-1 ring-slate-200/50"
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                )}
              >
                Reading
              </button>
              <button
                onClick={() => setShowBlessModal(true)}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all duration-300 text-[#588CBC] hover:text-[#183449] hover:bg-[#588CBC]/10"
                )}
              >
                Bless Chat
              </button>
            </div>
          </div>

          {/* Bless Chat Modal */}
          <BlessChatModal
            variant="web"
            showBlessModal={showBlessModal}
            setShowBlessModal={setShowBlessModal}
            blessMessage={blessMessage}
            setBlessMessage={setBlessMessage}
            blessFile={blessFile}
            setBlessFile={setBlessFile}
            blessTargetMode={blessTargetMode}
            setBlessTargetMode={setBlessTargetMode}
            allUsers={allUsers}
            selectedBlessUsers={selectedBlessUsers}
            setSelectedBlessUsers={setSelectedBlessUsers}
            userSearchQuery={userSearchQuery}
            setUserSearchQuery={setUserSearchQuery}
            isBlasting={isBlasting}
            handleBlessChat={handleBlessChat}
            viewFile={viewFile}
            showAlert={showAlert}
          />

          <div className="flex-1 overflow-y-auto px-4 pb-3 scrollbar-hide">
            <div className="flex flex-col gap-1 pt-1">
              {filteredRooms.map(chat => {
                const isActive = selectedChat?.id === chat.id;
                return (
                  <motion.div
                    key={chat.id}
                    initial={false}
                    onClick={() => isDeleteMode ? toggleSelectRoom(chat.id) : handleSelectRoom(chat)}
                    className={cn(
                      "relative p-3 flex items-center gap-3 rounded-3xl cursor-pointer transition-all duration-300 group",
                      isDeleteMode && selectedRooms.includes(chat.id) ? "bg-red-50 border-red-100 shadow-sm" :
                        isActive
                          ? "bg-white shadow-md border border-[#588CBC]/20"
                          : "hover:bg-slate-50/80 border border-transparent"
                    )}
                  >
                    {isDeleteMode && (
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
                        selectedRooms.includes(chat.id) ? "bg-red-500 border-red-500 text-white" : "border-slate-200 bg-white"
                      )}>
                        {selectedRooms.includes(chat.id) && <Plus size={14} className="rotate-45" />}
                      </div>
                    )}

                    {/* Garis vertikal di samping profil (tampil di semua item, sesuai Figma) */}
                    {!isDeleteMode && !isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-[#183449] rounded-r-full"
                      />
                    )}

                    {/* Garis item aktif (animasi perpindahan tetap sama seperti sebelumnya) */}
                    {isActive && !isDeleteMode && (
                      <motion.div
                        layoutId="activeBar"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-[#183449] rounded-r-full"
                      />
                    )}

                    <div className="relative shrink-0">
                      <Avatar
                        size="md"
                        src={chat.avatar_url && chat.avatar_url.startsWith('https://') ? chat.avatar_url : undefined}
                        alt={chat.user_name || chat.user_gmail}
                        className="transition-transform duration-300 group-hover:scale-105"
                      />
                      {chat.is_online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#588CBC] border-2 border-white rounded-full shadow-sm animate-pulse"></span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <h3 className={cn(
                          "font-bold truncate text-sm tracking-tight transition-colors",
                          isActive ? "text-[#183449]" : "text-slate-700"
                        )}>
                          {chat.user_name || chat.user_gmail}
                        </h3>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                          {format(new Date(chat.updated_at), 'HH:mm')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className={cn(
                          "text-xs truncate pr-4 mt-0.5 flex-1",
                          (chat.unread > 0 || chat.is_marked_unread) ? "text-slate-700 font-bold" : "text-slate-400 font-medium"
                        )}>
                          {chat.lastMessage}
                        </p>
                        {chat.unread > 0 ? (
                          <div className="bg-[#588CBC] text-white text-[10px] font-bold h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full shadow-sm animate-bounce">
                            {chat.unread}
                          </div>
                        ) : chat.is_marked_unread ? (
                          <div className="bg-[#588CBC] w-3 h-3 rounded-full shadow-sm animate-pulse mt-1 mr-1"></div>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* LOGOUT BUTTON AT BOTTOM */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={async () => {
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                  const { token } = JSON.parse(storedUser);
                  try {
                    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                  } catch (err) {
                    console.error("Logout error:", err);
                  }
                }
                localStorage.removeItem('user');
                clearMyProfile();
                window.location.href = '/login';
              }}
              className="w-full flex items-center justify-center gap-3 py-2.5 bg-white border border-rose-100 text-rose-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all duration-300 shadow-sm active:scale-[0.98]"
            >
              <LogOut size={18} />
              Keluar Akun
            </button>
          </div>
        </div>

        {/* ───────────── SIDEBAR MINI / RAIL (saat tertutup) ─────────────
            Logo polos (tanpa background) di atas, tombol panah menempel di tepi kanan sejajar logo,
            lalu daftar foto profil tiap chat. */}
        <div
          aria-hidden={isOpen}
          className={cn(
            "absolute inset-y-0 left-0 w-20 flex flex-col items-center pt-[30px] pb-3 transition-all duration-300",
            isOpen ? "opacity-0 invisible pointer-events-none" : "opacity-100 delay-200"
          )}
        >
          <Image
            src="/LogoSiRuangPolos.png"
            alt="Logo SiRuang"
            width={40}
            height={40}
            className="object-contain shrink-0"
          />

          <div className="w-8 h-px bg-slate-200 my-4 shrink-0" />

          <div
            onScroll={hideRailTip}
            className="flex-1 w-full overflow-y-auto scrollbar-hide flex flex-col items-center gap-1.5 pb-2"
          >
            {rooms.map(chat => {
              const isActive = selectedChat?.id === chat.id;
              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => handleSelectRoom(chat)}
                  onMouseEnter={(e) => showRailTip(e, chat)}
                  onMouseLeave={hideRailTip}
                  onFocus={(e) => showRailTip(e, chat)}
                  onBlur={hideRailTip}
                  aria-label={`Buka chat ${chat.user_name || chat.user_gmail}`}
                  tabIndex={isOpen ? -1 : 0}
                  className="relative w-full flex justify-center py-1.5 group outline-none"
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#183449] rounded-r-full"
                    />
                  )}
                  <div
                    className={cn(
                      "relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-focus-visible:scale-110 group-active:scale-95",
                      isActive && "ring-2 ring-[#588CBC]/70 ring-offset-2"
                    )}
                  >
                    <Avatar
                      size="md"
                      src={chat.avatar_url && chat.avatar_url.startsWith('https://') ? chat.avatar_url : undefined}
                      alt={chat.user_name || chat.user_gmail}
                    />
                    {chat.is_online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#588CBC] border-2 border-white rounded-full shadow-sm animate-pulse"></span>
                    )}
                    {chat.unread > 0 ? (
                      <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#588CBC] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white shadow-sm">
                        {chat.unread}
                      </span>
                    ) : chat.is_marked_unread ? (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#588CBC] ring-2 ring-white shadow-sm animate-pulse"></span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* TOOLTIP INFO CHAT (muncul di samping foto profil saat sidebar mini).
          Posisi "fixed" supaya tidak terpotong oleh lebar sidebar. */}
      <AnimatePresence>
        {!isOpen && railTip && (
          <motion.div
            key="rail-tip"
            initial={{ opacity: 0, x: -6, y: '-50%', scale: 0.96 }}
            animate={{ opacity: 1, x: 0, y: '-50%', scale: 1 }}
            exit={{ opacity: 0, x: -6, y: '-50%', scale: 0.96 }}
            transition={{ duration: 0.16 }}
            style={{ top: railTip.top, left: railTip.left }}
            className="fixed z-50 pointer-events-none min-w-44 max-w-64 bg-[#183449] text-white rounded-2xl px-4 py-3 shadow-xl shadow-[#0B192C]/30 ring-1 ring-white/10 transition-[top] duration-150 ease-out"
          >
            {/* Panah kecil ke arah foto profil */}
            <span
              aria-hidden="true"
              className="absolute -left-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 bg-[#183449]"
            />
            <p className="text-[9px] font-black uppercase tracking-widest text-sky-300/80 mb-0.5">
              Room Chat
            </p>
            <p className="text-sm font-bold leading-snug truncate">
              {railTip.chat.user_name || railTip.chat.user_gmail}
            </p>
            {railTip.chat.user_name && railTip.chat.user_gmail && (
              <p className="text-[11px] font-medium text-white/60 truncate">
                {railTip.chat.user_gmail}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  railTip.chat.is_online ? "bg-[#38BDF8]" : "bg-slate-400"
                )}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                {railTip.chat.is_online ? 'Online' : 'Offline'}
              </span>
              {railTip.chat.unread > 0 ? (
                <span className="ml-auto text-[10px] font-bold text-sky-300">
                  {railTip.chat.unread} pesan baru
                </span>
              ) : railTip.chat.is_marked_unread ? (
                <span className="ml-auto text-[10px] font-bold text-sky-300">
                  Belum dibaca
                </span>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOMBOL BUKA / TUTUP SIDEBAR
          Selalu menempel di garis tepi sidebar (terbuka maupun tertutup), sejajar dengan logo. */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={isOpen ? 'Tutup sidebar' : 'Buka sidebar'}
        aria-expanded={isOpen}
        title={isOpen ? 'Tutup sidebar' : 'Buka sidebar'}
        className={cn(
          "absolute top-9 left-full -translate-x-1/2 z-30 w-7 h-7 rounded-full bg-white border border-slate-200 text-[#183449] shadow-md flex items-center justify-center",
          "hover:bg-[#183449] hover:text-white hover:border-[#183449] hover:shadow-lg active:scale-90",
          "transition-all duration-300"
        )}
      >
        <ChevronLeft
          size={16}
          className={cn("transition-transform duration-500", !isOpen && "rotate-180")}
        />
      </button>
    </div>
  );
};

export default AdminSidebar;