'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  LayoutGrid,
  MessageSquare,
  SlidersHorizontal,
  Map,
  User,
  ShieldCheck,
  KeyRound,
  Network,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ───────────────────────── GEOMETRI NAVBAR ─────────────────────────
   Semua angka dalam px. Ubah di sini kalau mau fine-tuning.

   Konsep: mangkuk = SETENGAH LINGKARAN (radius BOWL_R) berpusat di garis atas bar.
   Bola (FAB) ngambang di dalam mangkuk, posisinya dinaikkan sehingga ada
   jarak (BALL_GAP) antara bola dan dasar mangkuk. */
const NAV_H = 104;        // tinggi total container (termasuk ruang untuk bola yang menonjol)
const TOP_Y = 40;         // garis atas bar putih (= pusat setengah lingkaran)
const BOWL_R = 34;        // radius mangkuk (setengah lingkaran)
const FILLET_X = 14;      // lebar transisi halus bar → mangkuk
const FILLET_Y = 8;       // tinggi transisi halus bar → mangkuk
const CORNER_R = 28;      // radius sudut bar
const FAB_SIZE = 52;      // diameter bola
const BALL_GAP = 10;      // jarak bola ↔ dasar mangkuk (naikin angka = bola makin naik)
const FAB_COLOR = '#183449';
const ITEM_COUNT = 5;

// Pusat bola, dihitung dari dasar mangkuk supaya jaraknya selalu konsisten
const BOWL_BOTTOM_Y = TOP_Y + BOWL_R;
const FAB_CENTER_Y = BOWL_BOTTOM_Y - BALL_GAP - FAB_SIZE / 2;
const LABEL_TOP = BOWL_BOTTOM_Y + 6; // label tepat di bawah dasar mangkuk

// Path SVG bar putih + mangkuk setengah lingkaran di posisi cx
const buildPath = (cx: number, w: number) => {
  const rimL = cx - BOWL_R;
  const rimR = cx + BOWL_R;

  // transisi halus & radius sudut mengecil otomatis kalau mangkuk mepet tepi
  const fl = Math.max(0, Math.min(FILLET_X, rimL));
  const fr = Math.max(0, Math.min(FILLET_X, w - rimR));
  const rl = Math.max(0, Math.min(CORNER_R, rimL - fl));
  const rr = Math.max(0, Math.min(CORNER_R, w - rimR - fr));

  // titik di lingkaran tempat transisi bertemu (sedikit di bawah garis atas)
  const dx = Math.sqrt(BOWL_R * BOWL_R - FILLET_Y * FILLET_Y);
  const pl = { x: cx - dx, y: TOP_Y + FILLET_Y };
  const pr = { x: cx + dx, y: TOP_Y + FILLET_Y };

  return [
    `M ${rl},${TOP_Y}`,
    `H ${rimL - fl}`,
    // transisi halus ke sisi kiri mangkuk
    `Q ${rimL},${TOP_Y} ${pl.x},${pl.y}`,
    // setengah lingkaran (sapuan lewat bawah)
    `A ${BOWL_R} ${BOWL_R} 0 0 0 ${pr.x},${pr.y}`,
    // transisi halus keluar dari sisi kanan mangkuk
    `Q ${rimR},${TOP_Y} ${rimR + fr},${TOP_Y}`,
    `H ${w - rr}`,
    `A ${rr} ${rr} 0 0 1 ${w},${TOP_Y + rr}`,
    `V ${NAV_H - CORNER_R}`,
    `A ${CORNER_R} ${CORNER_R} 0 0 1 ${w - CORNER_R},${NAV_H}`,
    `H ${CORNER_R}`,
    `A ${CORNER_R} ${CORNER_R} 0 0 1 0,${NAV_H - CORNER_R}`,
    `V ${TOP_Y + rl}`,
    `A ${rl} ${rl} 0 0 1 ${rl},${TOP_Y}`,
    'Z',
  ].join(' ');
};

// Dibiarkan ter-export supaya import lama di file lain tidak putus.
export const NotchedBackground = () => (
  <svg
    viewBox="0 0 400 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="absolute inset-0 w-full h-full drop-shadow-[0_15px_30px_rgba(24,52,73,0.15)] preserve-3d pointer-events-none"
    preserveAspectRatio="none"
  >
    <path
      d="M0 40C0 17.9086 17.9086 0 40 0H145C155 0 162 4 168 12C175 22 186 32 200 32C214 32 225 22 232 12C238 4 245 0 255 0H360C382.091 0 400 17.9086 400 40C400 62.0914 382.091 80 360 80H40C17.9086 80 0 62.0914 0 40Z"
      fill="white"
      className="transition-colors duration-500"
    />
  </svg>
);

export interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  subView?: string;
  unreadCount?: number;
  onSelectManagement?: (key: 'role-access' | 'manajemen-akun' | 'relasi-mata-kuliah') => void;
  onOpenProfile?: () => void;
  showBlessModal?: boolean;
  setShowBlessModal?: (show: boolean) => void;
  setActiveFilter?: (filter: 'unreading' | 'reading') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  subView = 'dashboard',
  unreadCount = 0,
  onSelectManagement,
  onOpenProfile,
  showBlessModal = false,
  setActiveFilter,
}) => {
  const [isManagementMenuOpen, setIsManagementMenuOpen] = useState(false);

  const isManagemenActive =
    activeTab === 'managemen' ||
    ((activeTab === 'managemen' || activeTab === 'home') &&
      ['role-access', 'manajemen-akun', 'relasi-mata-kuliah'].includes(subView));
  const isProfileActive =
    activeTab === 'profile' || (activeTab === 'home' && subView === 'profile');
  const isHomeActive = activeTab === 'home' && subView === 'dashboard';
  const isMessageActive =
    activeTab === 'message' || activeTab === 'unreading' || activeTab === 'reading';
  const isDenahActive = activeTab === 'denah';

  const navItems = [
    { id: 'home', label: 'Home', icon: LayoutGrid, active: isHomeActive },
    {
      id: 'message',
      label: 'Message',
      icon: MessageSquare,
      active: isMessageActive,
      badge: unreadCount,
    },
    {
      id: 'managemen',
      label: 'Managemen',
      icon: SlidersHorizontal,
      active: isManagemenActive,
    },
    { id: 'denah', label: 'Denah', icon: Map, active: isDenahActive },
    { id: 'profile', label: 'Profile', icon: User, active: isProfileActive },
  ];

  // Tab yang sedang "dipegang" mangkuk. Saat popup manajemen terbuka, mangkuk pindah ke Managemen.
  const activeId = isManagementMenuOpen
    ? 'managemen'
    : navItems.find((i) => i.active)?.id ?? 'home';
  const activeIndex = Math.max(0, navItems.findIndex((i) => i.id === activeId));
  const activeItem = navItems[activeIndex];
  const ActiveIcon = activeItem.icon;

  // ── Animasi mangkuk (pusat X mengalir pakai spring) ──
  const navRef = useRef<HTMLElement | null>(null);
  const widthMV = useMotionValue(360);
  const springCx = useSpring((activeIndex + 0.5) * (360 / ITEM_COUNT), {
    stiffness: 280,
    damping: 28,
    mass: 0.9,
  });
  const pathD = useTransform([springCx, widthMV], (latest) => {
    const [cx, w] = latest as number[];
    return buildPath(cx, w);
  });

  // Ukur lebar nav (responsive) → posisi langsung lompat tanpa animasi
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      if (!w) return;
      widthMV.set(w);
      springCx.jump((activeIndex + 0.5) * (w / ITEM_COUNT));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBlessModal]);

  // Ganti tab → mangkuk meluncur ke tab baru
  useEffect(() => {
    springCx.set((activeIndex + 0.5) * (widthMV.get() / ITEM_COUNT));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const handleSelectManagementSubView = (
    key: 'role-access' | 'manajemen-akun' | 'relasi-mata-kuliah'
  ) => {
    setIsManagementMenuOpen(false);
    if (onSelectManagement) {
      onSelectManagement(key);
    } else {
      setActiveTab('managemen');
    }
  };

  const handleItemClick = (id: string) => {
    if (id === 'managemen') {
      setIsManagementMenuOpen((prev) => !prev);
      return;
    }

    setIsManagementMenuOpen(false);

    if (id === 'home') {
      setActiveTab('home');
    } else if (id === 'message') {
      setActiveTab('message');
      if (setActiveFilter) {
        if (unreadCount === 0) {
          setActiveFilter('reading');
        } else {
          setActiveFilter('unreading');
        }
      }
    } else if (id === 'denah') {
      setActiveTab('denah');
    } else if (id === 'profile') {
      setActiveTab('profile');
      if (onOpenProfile) onOpenProfile();
    }
  };

  return (
    <>
      {/* ── POPUP MENU MANAJEMEN (NGELINK 3 HALAMAN) ── */}
      <AnimatePresence>
        {isManagementMenuOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsManagementMenuOpen(false)}
              className="fixed inset-0 z-70 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Floating Card */}
            <motion.div
              initial={{ opacity: 0, y: 25, scale: 0.92, x: '-50%' }}
              animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
              exit={{ opacity: 0, y: 25, scale: 0.92, x: '-50%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="fixed bottom-36 left-1/2 z-80 w-[90%] max-w-sm bg-white rounded-3xl p-4 shadow-2xl border border-slate-100 flex flex-col gap-2.5"
            >
              {/* Header Popup */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#588CBC]/15 flex items-center justify-center text-[#183449]">
                    <SlidersHorizontal size={13} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider leading-none">
                      Menu Manajemen
                    </h4>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                      Pilih halaman pengelolaan
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManagementMenuOpen(false)}
                  className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                >
                  <X size={13} />
                </button>
              </div>

              {/* 3 Quick Links */}
              <div className="flex flex-col gap-2">
                {/* 1. Konfigurasi Role */}
                <button
                  type="button"
                  onClick={() => handleSelectManagementSubView('role-access')}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-2xl transition-all text-left group',
                    subView === 'role-access' && (activeTab === 'managemen' || activeTab === 'home')
                      ? 'bg-[#588CBC]/15 border border-[#588CBC]/30'
                      : 'bg-slate-50/80 hover:bg-slate-100 active:scale-[0.98]'
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800">Konfigurasi Role</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      Pengaturan hak akses & peran akun
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0"
                  />
                </button>

                {/* 2. Manajemen Akun */}
                <button
                  type="button"
                  onClick={() => handleSelectManagementSubView('manajemen-akun')}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-2xl transition-all text-left group',
                    subView === 'manajemen-akun' && (activeTab === 'managemen' || activeTab === 'home')
                      ? 'bg-[#588CBC]/15 border border-[#588CBC]/30'
                      : 'bg-slate-50/80 hover:bg-slate-100 active:scale-[0.98]'
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <KeyRound size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800">Manajemen Akun</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      Kelola akun user, status & sandi
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0"
                  />
                </button>

                {/* 3. Manajemen Relasi */}
                <button
                  type="button"
                  onClick={() => handleSelectManagementSubView('relasi-mata-kuliah')}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-2xl transition-all text-left group',
                    subView === 'relasi-mata-kuliah' && (activeTab === 'managemen' || activeTab === 'home')
                      ? 'bg-[#588CBC]/15 border border-[#588CBC]/30'
                      : 'bg-slate-50/80 hover:bg-slate-100 active:scale-[0.98]'
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-[#588CBC] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Network size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800">Manajemen Relasi</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      Relasi mata kuliah & alokasi ruangan
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0"
                  />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── BOTTOM NAV BAR (LIQUID BOWL) ── */}
      <AnimatePresence>
        {!showBlessModal && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            style={{ height: NAV_H }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 w-[94%] max-w-lg pointer-events-none"
          >
            <nav
              ref={navRef}
              className="relative w-full h-full pointer-events-none"
              aria-label="Navigasi admin"
            >
              {/* Latar putih + mangkuk: path `d` dianimasikan mengikuti tab aktif */}
              <svg
                width="100%"
                height={NAV_H}
                className="absolute inset-0 overflow-visible pointer-events-none"
                style={{ filter: 'drop-shadow(0 10px 24px rgba(24,52,73,0.16))' }}
                aria-hidden="true"
              >
                <motion.path d={pathD} fill="#FFFFFF" />
              </svg>

              {/* 5 tab: icon sejajar tengah bar */}
              <div className="absolute inset-0 grid grid-cols-5 pointer-events-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isCurrent = item.id === activeId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={item.label}
                      aria-current={isCurrent ? 'page' : undefined}
                      onClick={() => handleItemClick(item.id)}
                      style={{ paddingTop: TOP_Y }}
                      className="relative z-10 flex h-full items-center justify-center cursor-pointer outline-none"
                    >
                      <motion.span
                        whileTap={{ scale: 0.88 }}
                        animate={{ opacity: isCurrent ? 0 : 1, scale: isCurrent ? 0.6 : 1 }}
                        transition={{ duration: 0.2 }}
                        className="relative flex items-center justify-center text-slate-400"
                      >
                        <Icon size={22} strokeWidth={1.75} />
                        {item.badge !== undefined && item.badge > 0 && !isCurrent && (
                          <span className="absolute -top-1.5 -right-2 min-w-4.5 h-4.5 px-1 bg-[#588CBC] text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </motion.span>
                    </button>
                  );
                })}
              </div>

              {/* Bola tunggal yang ngambang di dalam mangkuk & ikut meluncur */}
              <motion.button
                type="button"
                aria-label={activeItem.label}
                onClick={() => handleItemClick(activeId)}
                whileTap={{ scale: 0.92 }}
                style={{
                  left: springCx,
                  x: '-50%',
                  top: FAB_CENTER_Y - FAB_SIZE / 2,
                  width: FAB_SIZE,
                  height: FAB_SIZE,
                  backgroundColor: FAB_COLOR,
                }}
                className="absolute z-20 rounded-full flex items-center justify-center text-white shadow-[0_10px_24px_rgba(24,52,73,0.35)] cursor-pointer pointer-events-auto outline-none"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={activeItem.id}
                    initial={{ opacity: 0, scale: 0.5, rotate: -25 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.5, rotate: 25 }}
                    transition={{ duration: 0.22 }}
                    className="flex items-center justify-center"
                  >
                    <ActiveIcon size={24} strokeWidth={2.25} />
                  </motion.span>
                </AnimatePresence>

                {activeItem.badge !== undefined && activeItem.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 bg-[#588CBC] text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {activeItem.badge > 99 ? '99+' : activeItem.badge}
                  </span>
                )}
              </motion.button>

              {/* Label tab aktif: tepat di bawah dasar mangkuk, X sama dengan bola */}
              <motion.div
                style={{ left: springCx, x: '-50%', top: LABEL_TOP }}
                className="absolute z-10 pointer-events-none"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={activeItem.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="block whitespace-nowrap text-[9px] font-black uppercase tracking-wider text-[#183449]"
                  >
                    {activeItem.label}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileBottomNav;