'use client';

import React, { useEffect, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { Home, Map, MessageCircle, CalendarDays, User } from 'lucide-react';

/* ───────────────────────── GEOMETRI NAVBAR ─────────────────────────
   Sama persis dengan versi admin. Semua angka dalam px.

   Mangkuk = SETENGAH LINGKARAN (radius BOWL_R) berpusat di garis atas bar.
   Bola (FAB) ngambang di dalam mangkuk dengan jarak BALL_GAP dari dasarnya. */
const NAV_H = 104;        // tinggi total container (termasuk ruang untuk bola yang menonjol)
const TOP_Y = 40;         // garis atas bar putih (= pusat setengah lingkaran)
const BOWL_R = 34;        // radius mangkuk (setengah lingkaran)
const FILLET_X = 14;      // lebar transisi halus bar → mangkuk
const FILLET_Y = 8;       // tinggi transisi halus bar → mangkuk
const CORNER_R = 28;      // radius sudut bar
const FAB_SIZE = 52;      // diameter bola
const BALL_GAP = 10;      // jarak bola ↔ dasar mangkuk (naikin = bola makin naik)
const FAB_COLOR = '#183449';
const ITEM_COUNT = 5;

const BOWL_BOTTOM_Y = TOP_Y + BOWL_R;
const FAB_CENTER_Y = BOWL_BOTTOM_Y - BALL_GAP - FAB_SIZE / 2;
const LABEL_TOP = BOWL_BOTTOM_Y + 6;

// Posisi badge notif (di layer paling atas, bebas dari clipping)
const ICON_CENTER_Y = TOP_Y + (NAV_H - TOP_Y) / 2; // pusat icon tab non-aktif
const BADGE_SIZE = 20;

const buildPath = (cx: number, w: number) => {
  const rimL = cx - BOWL_R;
  const rimR = cx + BOWL_R;

  const fl = Math.max(0, Math.min(FILLET_X, rimL));
  const fr = Math.max(0, Math.min(FILLET_X, w - rimR));
  const rl = Math.max(0, Math.min(CORNER_R, rimL - fl));
  const rr = Math.max(0, Math.min(CORNER_R, w - rimR - fr));

  const dx = Math.sqrt(BOWL_R * BOWL_R - FILLET_Y * FILLET_Y);
  const pl = { x: cx - dx, y: TOP_Y + FILLET_Y };
  const pr = { x: cx + dx, y: TOP_Y + FILLET_Y };

  return [
    `M ${rl},${TOP_Y}`,
    `H ${rimL - fl}`,
    `Q ${rimL},${TOP_Y} ${pl.x},${pl.y}`,
    `A ${BOWL_R} ${BOWL_R} 0 0 0 ${pr.x},${pr.y}`,
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

export type UserNavTab = 'home' | 'denah' | 'chats' | 'booking' | 'profile';

export interface MobileBottomNavProps {
  activeTab: UserNavTab;
  onTabChange: (tab: UserNavTab) => void;
  unreadCount: number;
  onLogout?: () => void;
}

const NAV_ITEMS = [
  { id: 'home' as const, label: 'Home', icon: Home },
  { id: 'denah' as const, label: 'Denah', icon: Map },
  { id: 'chats' as const, label: 'Chat', icon: MessageCircle },
  { id: 'booking' as const, label: 'Booking', icon: CalendarDays },
  { id: 'profile' as const, label: 'Profil', icon: User },
];

const CHATS_INDEX = NAV_ITEMS.findIndex((i) => i.id === 'chats');

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadCount,
}) => {
  const activeIndex = Math.max(0, NAV_ITEMS.findIndex((i) => i.id === activeTab));
  const activeItem = NAV_ITEMS[activeIndex];
  const ActiveIcon = activeItem.icon;
  const isChatsActive = activeItem.id === 'chats';
  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);
  const hasBadge = unreadCount > 0;

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

  // Posisi X badge: nempel di pojok kanan atas bola (saat Chat aktif) atau di icon Chat (saat tidak aktif)
  const ballBadgeLeft = useTransform(springCx, (cx) => cx + FAB_SIZE / 2 - 10);
  const tabBadgeLeft = useTransform(
    widthMV,
    (w) => (CHATS_INDEX + 0.5) * (w / ITEM_COUNT) + 6
  );

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
  }, []);

  // Ganti tab → mangkuk meluncur ke tab baru
  useEffect(() => {
    springCx.set((activeIndex + 0.5) * (widthMV.get() / ITEM_COUNT));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const badgeClass =
    'absolute z-30 pointer-events-none flex items-center justify-center rounded-full bg-[#588CBC] text-white font-black border-2 border-white shadow-md';

  return (
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
        aria-label="Navigasi utama"
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
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isCurrent = item.id === activeItem.id;

            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-current={isCurrent ? 'page' : undefined}
                onClick={() => onTabChange(item.id)}
                style={{ paddingTop: TOP_Y }}
                className="relative z-10 flex h-full items-center justify-center cursor-pointer outline-none"
              >
                <motion.span
                  whileTap={{ scale: 0.88 }}
                  animate={{ opacity: isCurrent ? 0 : 1, scale: isCurrent ? 0.6 : 1 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center text-slate-400"
                >
                  <Icon size={22} strokeWidth={1.75} />
                </motion.span>
              </button>
            );
          })}
        </div>

        {/* Bola tunggal yang ngambang di dalam mangkuk & ikut meluncur */}
        <motion.button
          type="button"
          aria-label={activeItem.label}
          onClick={() => onTabChange(activeItem.id)}
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
        </motion.button>

        {/* Label tab aktif: tepat di bawah dasar mangkuk */}
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

        {/* ── BADGE NOTIF: layer paling atas (z-30), di luar tombol/bola → tidak ikut terpotong ── */}
        <AnimatePresence>
          {hasBadge && isChatsActive && (
            <motion.span
              key="badge-ball"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              style={{
                left: ballBadgeLeft,
                top: FAB_CENTER_Y - FAB_SIZE / 2 - 6,
                minWidth: BADGE_SIZE,
                height: BADGE_SIZE,
              }}
              className={`${badgeClass} px-1 text-[10px] leading-none`}
            >
              {badgeText}
            </motion.span>
          )}
          {hasBadge && !isChatsActive && (
            <motion.span
              key="badge-tab"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              style={{
                left: tabBadgeLeft,
                top: ICON_CENTER_Y - 11 - BADGE_SIZE / 2,
                minWidth: BADGE_SIZE,
                height: BADGE_SIZE,
              }}
              className={`${badgeClass} px-1 text-[10px] leading-none`}
            >
              {badgeText}
            </motion.span>
          )}
        </AnimatePresence>
      </nav>
    </motion.div>
  );
};

export default MobileBottomNav;