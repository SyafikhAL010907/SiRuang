'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  LayoutGrid,
  HelpCircle,
  LogOut,
  ChevronLeft,
  Paperclip,
  Image as ImageIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import Avatar from '@/components/Shared/Avatar';
import { cn } from '@/lib/utils';

export interface UserSidebarProps {
  userName: string;
  unreadCount: number;
  isChatOpen?: boolean;
  lastMessage?: any;
  activeRoom?: 'admin' | 'dosen';
  onSelectRoom?: (room: 'admin' | 'dosen') => void;
  onOpenChat: () => void;
  onOpenTemplate: () => void;
  onLogout: () => void;
  /** Foto profil Admin UNJ. Kosong = logo SiRuang. */
  adminAvatarSrc?: string;
}

const USER_SIDEBAR_STORAGE_KEY = 'userSidebarOpen';

export const UserSidebar: React.FC<UserSidebarProps> = ({
  userName,
  unreadCount,
  isChatOpen = false,
  lastMessage,
  activeRoom = 'admin',
  onSelectRoom,
  onOpenChat,
  onOpenTemplate,
  onLogout,
  adminAvatarSrc,
}) => {
  const adminAvatar = adminAvatarSrc || '/LogoSiRuangPolos.png';
  // State room chat yang dipilih (admin atau dosen)
  const [selectedRoom, setSelectedRoom] = useState<'admin' | 'dosen'>(activeRoom);

  useEffect(() => {
    if (activeRoom) setSelectedRoom(activeRoom);
  }, [activeRoom]);

  const handleSelectAdmin = () => {
    setSelectedRoom('admin');
    if (onSelectRoom) {
      onSelectRoom('admin');
    } else {
      onOpenChat();
    }
  };

  const handleSelectDosen = () => {
    setSelectedRoom('dosen');
    if (onSelectRoom) {
      onSelectRoom('dosen');
    } else {
      onOpenChat();
    }
  };

  // Buka / tutup sidebar (disimpan di localStorage seperti AdminSidebar)
  const [isOpen, setIsOpen] = useState(true);

  // Tooltip kotak info saat kursor di atas icon pada sidebar mini (rail)
  const [railTip, setRailTip] = useState<{
    title: string;
    subtitle?: string;
    badge?: string;
    top: number;
    left: number;
  } | null>(null);

  const showRailTip = (
    e: React.SyntheticEvent<HTMLElement>,
    info: { title: string; subtitle?: string; badge?: string }
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRailTip({
      ...info,
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
  };

  const hideRailTip = () => setRailTip(null);

  // Ingat pilihan terakhir user
  useEffect(() => {
    try {
      if (localStorage.getItem(USER_SIDEBAR_STORAGE_KEY) === 'false') {
        setIsOpen(false);
      }
    } catch {
      /* abaikan */
    }
  }, []);

  const toggleSidebar = () => {
    const next = !isOpen;
    setIsOpen(next);
    setRailTip(null);
    try {
      localStorage.setItem(USER_SIDEBAR_STORAGE_KEY, String(next));
    } catch {
      /* abaikan */
    }
  };

  const formatMessageTime = (ts?: string) => {
    if (!ts) return '';
    try {
      return format(new Date(ts), 'HH:mm');
    } catch {
      return '';
    }
  };

  // Helper agar tampilan preview pesan terakhir rapi seperti di Admin (bukan JSON mentah)
  const renderLastMessagePreview = (msg: any) => {
    if (!msg) {
      return <span>Mulai obrolan...</span>;
    }

    const text = typeof msg === 'string' ? msg : msg.text || '';
    const type = typeof msg === 'object' ? msg.type : '';

    // Cek apakah JSON file / multi-file
    if (
      type === 'file' ||
      type === 'multi_file' ||
      text.startsWith('{"files"') ||
      text.startsWith('{"files":') ||
      (text.startsWith('{') && text.includes('"files"'))
    ) {
      try {
        const parsed = JSON.parse(text);
        if (parsed.caption && parsed.caption.trim()) {
          return (
            <span className="flex items-center gap-1.5 truncate">
              <Paperclip size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{parsed.caption}</span>
            </span>
          );
        }
      } catch {}
      return (
        <span className="flex items-center gap-1.5 text-slate-400 font-medium">
          <Paperclip size={12} className="text-slate-400 shrink-0" />
          <span>Lampiran File</span>
        </span>
      );
    }

    // Cek gambar
    if (type === 'image' || text.startsWith('data:image/')) {
      return (
        <span className="flex items-center gap-1.5 text-slate-400 font-medium">
          <ImageIcon size={12} className="text-slate-400 shrink-0" />
          <span>Gambar</span>
        </span>
      );
    }

    return <span className="truncate">{text}</span>;
  };

  const lastTimeText =
    formatMessageTime(lastMessage?.timestamp) ||
    (lastMessage ? format(new Date(), 'HH:mm') : '');

  return (
    <div className="relative flex shrink-0 z-20">
      <aside
        className={cn(
          "relative bg-white flex overflow-hidden border-r border-slate-100 shadow-[10px_0_30px_-15px_rgba(0,0,0,0.05)]",
          "transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          isOpen ? "w-72 lg:w-80" : "w-20"
        )}
      >
        {/* ───────────── SIDEBAR PENUH (saat terbuka) ───────────── */}
        <div
          aria-hidden={!isOpen}
          className={cn(
            "shrink-0 w-72 lg:w-80 flex flex-col h-full transition-all duration-300",
            isOpen ? "opacity-100 delay-150" : "opacity-0 invisible pointer-events-none"
          )}
        >
          {/* TOP PREMIUM CARD (Floating Style ala Admin) */}
          <div className="px-4 pt-4 pb-2">
            <div className="bg-linear-to-br from-[#07111E] via-[#0B1B30] to-[#123252] rounded-[28px] p-4 text-white shadow-xl shadow-[#0B192C]/30 ring-1 ring-white/10 relative overflow-hidden group">
              {/* Decorative Elements */}
              <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
              <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-[#588CBC]/25 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
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
                      width={44}
                      height={44}
                      className="object-contain drop-shadow-lg"
                    />
                  </motion.div>
                  <div className="flex flex-col min-w-0">
                    <h4 className="text-base font-bold leading-snug tracking-tight text-white drop-shadow-sm truncate">
                      Selamat Datang,<br />
                      <span className="text-[#588CBC]">{userName}!</span>
                    </h4>
                  </div>
                </div>

                {/* Pill Balasan Baru (Sesuai Gambar 1) */}
                <div
                  onClick={onOpenChat}
                  className={cn(
                    "flex items-center gap-2 w-fit px-3 py-1.5 rounded-full border backdrop-blur-sm cursor-pointer transition-all duration-300 relative z-20",
                    unreadCount > 0
                      ? "bg-rose-500/20 border-rose-500/30 text-rose-300 hover:bg-rose-500/30"
                      : "bg-white/10 border-white/10 text-white/80 hover:bg-white/15"
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      unreadCount > 0
                        ? "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse"
                        : "bg-[#588CBC]"
                    )}
                  />
                  <span className="text-[10px] font-bold tracking-tight">
                    {unreadCount > 0 ? `${unreadCount} Balasan Baru` : `${unreadCount} Balasan`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN SCROLLABLE SECTION */}
          <div className="flex-1 overflow-y-auto px-4 pb-3 scrollbar-hide flex flex-col gap-4 pt-2">
            {/* PANDUAN CEPAT SECTION */}
            <div className="flex flex-col gap-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
                Panduan Cepat
              </h4>

              {/* Template Pertanyaan */}
              <button
                type="button"
                onClick={onOpenTemplate}
                className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-[#588CBC]/5 hover:border-[#588CBC]/30 transition-all select-none w-full shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#588CBC]/10 flex items-center justify-center group-hover:bg-[#588CBC] group-hover:text-white transition-all">
                    <LayoutGrid size={16} className="text-[#588CBC] group-hover:text-white transition-all" />
                  </div>
                  <span className="text-xs font-black text-slate-700 group-hover:text-[#183449] tracking-tight leading-tight">
                    Template Pertanyaan
                  </span>
                </div>
                <HelpCircle size={14} className="text-slate-300 group-hover:text-[#588CBC]" />
              </button>
            </div>

            {/* CHAT ROOM LIST (DI BAWAH TEMPLATE PERTANYAAN, RAPI PERSIS SEPERTI DI ADMIN) */}
            <div className="flex flex-col gap-1.5">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
                Pesan Bantuan
              </h4>

              {/* Room 1: Admin UNJ (Official Helpdesk) */}
              <motion.div
                initial={false}
                onClick={handleSelectAdmin}
                className={cn(
                  "relative p-3 flex items-center gap-3 rounded-3xl cursor-pointer transition-all duration-300 group",
                  isChatOpen && selectedRoom === 'admin'
                    ? "bg-white shadow-md border border-[#588CBC]/20"
                    : "hover:bg-slate-50/80 border border-transparent bg-slate-50/60"
                )}
              >
                {/* Garis vertikal di samping profil (sama persis AdminSidebar) */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 rounded-r-full transition-all duration-300",
                    isChatOpen && selectedRoom === 'admin' ? "bg-[#183449]" : "bg-[#183449]/30 group-hover:bg-[#183449]"
                  )}
                />

                {/* Avatar bulat persis seperti Gambar 2 dengan status online dot */}
                <div className="relative shrink-0 ml-1">
                  <Avatar
                    size="md"
                    src={adminAvatar}
                    alt="Admin UNJ"
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#588CBC] border-2 border-white rounded-full shadow-sm animate-pulse" />
                </div>

                {/* Info & Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h3 className={cn(
                      "font-bold truncate text-sm tracking-tight transition-colors flex items-center gap-1.5",
                      isChatOpen && selectedRoom === 'admin' ? "text-[#183449]" : "text-slate-700"
                    )}>
                      <span>Admin UNJ</span>
                      <span className="px-1.5 py-0.2 bg-[#183449] text-[8px] font-black text-white rounded uppercase tracking-wider">
                        Official
                      </span>
                    </h3>
                    {lastTimeText && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 ml-1">
                        {lastTimeText}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <div className={cn(
                      "text-xs truncate pr-2 mt-0.5 flex-1 flex items-center",
                      (unreadCount > 0) ? "text-slate-700 font-bold" : "text-slate-400 font-medium"
                    )}>
                      {renderLastMessagePreview(lastMessage)}
                    </div>
                    {unreadCount > 0 && (
                      <div className="bg-[#588CBC] text-white text-[10px] font-bold h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full shadow-sm animate-bounce shrink-0">
                        {unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Room 2: Dosen (Dummy Chat Room dengan PP Botak seperti di Admin) */}
              <motion.div
                initial={false}
                onClick={handleSelectDosen}
                className={cn(
                  "relative p-3 flex items-center gap-3 rounded-3xl cursor-pointer transition-all duration-300 group",
                  isChatOpen && selectedRoom === 'dosen'
                    ? "bg-white shadow-md border border-[#588CBC]/20"
                    : "hover:bg-slate-50/80 border border-transparent bg-slate-50/60"
                )}
              >
                {/* Garis vertikal di samping profil */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 rounded-r-full transition-all duration-300",
                    isChatOpen && selectedRoom === 'dosen' ? "bg-[#183449]" : "bg-[#183449]/30 group-hover:bg-[#183449]"
                  )}
                />

                {/* Avatar PP Botak (tanpa src, memakai icon default botak UserCircle bawaan) */}
                <div className="relative shrink-0 ml-1">
                  <Avatar
                    size="md"
                    alt="Dosen"
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full shadow-sm" />
                </div>

                {/* Info & Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h3 className={cn(
                      "font-bold truncate text-sm tracking-tight transition-colors flex items-center gap-1.5",
                      isChatOpen && selectedRoom === 'dosen' ? "text-[#183449]" : "text-slate-700"
                    )}>
                      <span>Dosen</span>
                      <span className="px-1.5 py-0.2 bg-slate-200 text-[8px] font-black text-slate-600 rounded uppercase tracking-wider">
                        Dosen
                      </span>
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 ml-1">
                      10:30
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <p className="text-xs truncate pr-2 mt-0.5 flex-1 text-slate-400 font-medium">
                      Halo, ada yang bisa saya bantu terkait perkuliahan?
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* LOGOUT BUTTON AT BOTTOM (Sama persis AdminSidebar) */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 mt-auto">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-3 py-2.5 bg-white border border-rose-100 text-rose-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all duration-300 shadow-sm active:scale-[0.98]"
            >
              <LogOut size={16} />
              Keluar Akun
            </button>
          </div>
        </div>

        {/* ───────────── SIDEBAR MINI / RAIL (saat tertutup) ───────────── */}
        <div
          aria-hidden={isOpen}
          className={cn(
            "absolute inset-y-0 left-0 w-20 flex flex-col items-center pt-[30px] pb-4 transition-all duration-300",
            isOpen ? "opacity-0 invisible pointer-events-none" : "opacity-100 delay-200"
          )}
        >
          {/* Logo di atas */}
          <Image
            src="/LogoSiRuangPolos.png"
            alt="Logo SiRuang"
            width={40}
            height={40}
            className="object-contain shrink-0"
          />

          <div className="w-8 h-px bg-slate-200 my-4 shrink-0" />

          {/* Icon navigasi di rail */}
          <div
            onScroll={hideRailTip}
            className="flex-1 w-full overflow-y-auto scrollbar-hide flex flex-col items-center gap-3 pb-2"
          >
            {/* Tombol Template Pertanyaan */}
            <button
              type="button"
              onClick={onOpenTemplate}
              onMouseEnter={(e) =>
                showRailTip(e, {
                  title: 'Template Pertanyaan',
                  subtitle: 'Pilih template pertanyaan cepat',
                })
              }
              onMouseLeave={hideRailTip}
              onFocus={(e) =>
                showRailTip(e, {
                  title: 'Template Pertanyaan',
                  subtitle: 'Pilih template pertanyaan cepat',
                })
              }
              onBlur={hideRailTip}
              aria-label="Buka Template Pertanyaan"
              tabIndex={isOpen ? -1 : 0}
              className="w-full flex justify-center py-1 group outline-none"
            >
              <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#588CBC]/10 hover:text-[#588CBC] hover:border-[#588CBC]/30 transition-all duration-300 group-hover:scale-105">
                <LayoutGrid size={18} />
              </div>
            </button>

            {/* Tombol Room 1: Admin UNJ */}
            <button
              type="button"
              onClick={handleSelectAdmin}
              onMouseEnter={(e) =>
                showRailTip(e, {
                  title: 'Admin UNJ (Official)',
                  subtitle: lastMessage?.text?.startsWith('{')
                    ? '📎 Lampiran File'
                    : lastMessage?.text || 'Konsultasi perkuliahan & ruangan',
                  badge: unreadCount > 0 ? `${unreadCount} pesan baru` : undefined,
                })
              }
              onMouseLeave={hideRailTip}
              onFocus={(e) =>
                showRailTip(e, {
                  title: 'Admin UNJ (Official)',
                  subtitle: lastMessage?.text?.startsWith('{')
                    ? '📎 Lampiran File'
                    : lastMessage?.text || 'Konsultasi perkuliahan & ruangan',
                  badge: unreadCount > 0 ? `${unreadCount} pesan baru` : undefined,
                })
              }
              onBlur={hideRailTip}
              aria-label="Buka Chat Admin"
              tabIndex={isOpen ? -1 : 0}
              className="relative w-full flex justify-center py-1 group outline-none"
            >
              {isChatOpen && selectedRoom === 'admin' && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#183449] rounded-r-full"
                />
              )}
              <div
                className={cn(
                  "relative rounded-full transition-all duration-300 group-hover:scale-110 group-focus-visible:scale-110 group-active:scale-95",
                  isChatOpen && selectedRoom === 'admin' && "ring-2 ring-[#588CBC]/70 ring-offset-2"
                )}
              >
                <Avatar
                  size="md"
                  src={adminAvatar}
                  alt="Admin UNJ"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#588CBC] border-2 border-white rounded-full shadow-sm animate-pulse" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#588CBC] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white shadow-sm animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </div>
            </button>

            {/* Tombol Room 2: Dosen (PP Botak) */}
            <button
              type="button"
              onClick={handleSelectDosen}
              onMouseEnter={(e) =>
                showRailTip(e, {
                  title: 'Dosen',
                  subtitle: 'Konsultasi perkuliahan & bimbingan',
                })
              }
              onMouseLeave={hideRailTip}
              onFocus={(e) =>
                showRailTip(e, {
                  title: 'Dosen',
                  subtitle: 'Konsultasi perkuliahan & bimbingan',
                })
              }
              onBlur={hideRailTip}
              aria-label="Buka Chat Dosen"
              tabIndex={isOpen ? -1 : 0}
              className="relative w-full flex justify-center py-1 group outline-none"
            >
              {isChatOpen && selectedRoom === 'dosen' && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#183449] rounded-r-full"
                />
              )}
              <div
                className={cn(
                  "relative rounded-full transition-all duration-300 group-hover:scale-110 group-focus-visible:scale-110 group-active:scale-95",
                  isChatOpen && selectedRoom === 'dosen' && "ring-2 ring-[#588CBC]/70 ring-offset-2"
                )}
              >
                <Avatar
                  size="md"
                  alt="Dosen"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full shadow-sm" />
              </div>
            </button>
          </div>

          {/* Tombol Logout di Rail */}
          <div className="w-full px-2 pt-2 border-t border-slate-100 flex justify-center">
            <button
              type="button"
              onClick={onLogout}
              onMouseEnter={(e) =>
                showRailTip(e, {
                  title: 'Keluar Akun',
                  subtitle: 'Akhiri sesi masuk',
                })
              }
              onMouseLeave={hideRailTip}
              aria-label="Keluar Akun"
              tabIndex={isOpen ? -1 : 0}
              className="w-10 h-10 rounded-2xl bg-white border border-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all duration-300"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ───────────── FLOATING TOOLTIP SAAT RAIL ───────────── */}
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
            {/* Panah kecil ke arah icon */}
            <span
              aria-hidden="true"
              className="absolute -left-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 bg-[#183449]"
            />
            <p className="text-[9px] font-black uppercase tracking-widest text-sky-300/80 mb-0.5">
              ROOM CHAT
            </p>
            <p className="text-sm font-bold leading-snug truncate">
              {railTip.title}
            </p>
            {railTip.subtitle && (
              <p className="text-[11px] font-medium text-white/60 truncate mt-0.5">
                {railTip.subtitle}
              </p>
            )}
            {railTip.badge && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-[#588CBC] animate-pulse" />
                <span className="text-[10px] font-bold text-sky-300">
                  {railTip.badge}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────────── TOMBOL BUKA / TUTUP SIDEBAR ─────────────
          Menempel di garis tepi sidebar, sejajar dengan logo / header */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={isOpen ? 'Tutup sidebar' : 'Buka sidebar'}
        aria-expanded={isOpen}
        title={isOpen ? 'Tutup sidebar' : 'Buka sidebar'}
        className={cn(
          "absolute top-9 left-full -translate-x-1/2 z-30 w-7 h-7 rounded-full bg-white border border-slate-200 text-[#183449] shadow-md flex items-center justify-center cursor-pointer",
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

export default UserSidebar;