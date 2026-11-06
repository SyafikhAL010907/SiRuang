'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion, MotionConfig, useInView, type HTMLMotionProps } from 'framer-motion';
import { jakarta, fasthand } from '@/lib/fonts';
import Navbar from '@/components/LandingPage/Navbar';
import Footer from '@/components/LandingPage/Footer';

/* ------------------------------------------------------------------ */
/*  ANIMASI MASUK (ringan: hanya opacity + transform, GPU-friendly)    */
/* ------------------------------------------------------------------ */

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** jeda tambahan supaya hero baru muncul ketika tirai loader mulai membuka */
const AFTER_LOADER_OFFSET = 0.65;

/**
 * true saat loader (AppLoader) sudah selesai.
 * - refresh / pertama kali buka  -> tunggu event "app:loaded" dari AppLoader
 * - pindah halaman lewat link     -> loader sudah selesai, langsung true
 * - kalau AppLoader tidak dipakai -> langsung true
 */
export function useAppReady() {
  const [state, setState] = useState({ ready: false, offset: 0 });

  useEffect(() => {
    const root = document.documentElement;
    // Jika tidak ada loader atau loader sudah selesai sebelumnya, langsung tampilkan
    if (root.dataset.appLoaded === 'true' || !document.querySelector('.pl-root')) {
      setState({ ready: true, offset: 0 });
      return;
    }

    let timer: ReturnType<typeof setTimeout>;

    // Tunggu event saat tirai loader mulai membuka
    const onLoaded = () => {
      clearTimeout(timer);
      setState({ ready: true, offset: AFTER_LOADER_OFFSET });
    };
    window.addEventListener('app:loaded', onLoaded, { once: true });

    // Fallback keamanan jika event terlewat: tunggu aman (~8s)
    timer = setTimeout(() => {
      setState({ ready: true, offset: 0 });
    }, 8000);

    return () => {
      window.removeEventListener('app:loaded', onLoaded);
      clearTimeout(timer);
    };
  }, []);

  return state;
}

const MOTION_TAGS = {
  div: motion.div,
  p: motion.p,
  h2: motion.h2,
  h3: motion.h3,
  span: motion.span,
} as const;

export type RevealProps = Omit<
  HTMLMotionProps<'div'>,
  'initial' | 'animate' | 'whileInView' | 'viewport' | 'transition' | 'ref'
> & {
  as?: keyof typeof MOTION_TAGS;
  /** 'load' = muncul setelah loader selesai (hero) · 'view' = muncul saat di-scroll ke layar */
  mode?: 'view' | 'load';
  delay?: number;
  x?: number;
  y?: number;
  scale?: number;
  duration?: number;
};

export function Reveal({
  as = 'div',
  mode = 'view',
  delay = 0,
  x = 0,
  y = 24,
  scale = 1,
  duration = 0.8,
  children,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { ready, offset } = useAppReady();
  const inView = useInView(ref, { once: true, amount: 0.05 });
  const Comp = MOTION_TAGS[as] as unknown as typeof motion.div;

  const hidden = { opacity: 0, x, y, scale };
  const shown = { opacity: 1, x: 0, y: 0, scale: 1 };
  const show = ready && (mode === 'load' || inView);

  return (
    <Comp
      ref={ref}
      {...rest}
      initial={hidden}
      animate={show ? shown : hidden}
      transition={{
        duration,
        delay: delay + (mode === 'load' ? offset : 0),
        ease: EASE_OUT,
      }}
    >
      {children}
    </Comp>
  );
}

/* ------------------------------------------------------------------ */
/*  REUSABLE DOT INDICATOR                                            */
/* ------------------------------------------------------------------ */

export interface DotIndicatorProps {
  total: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  variant: 'light' | 'dark';
  className?: string;
}

export function DotIndicator({
  total,
  activeIndex,
  onSelect,
  variant,
  className = '',
}: DotIndicatorProps) {
  if (total <= 1) return null;

  return (
    <div
      role="tablist"
      aria-label="Indikator slide"
      className={`flex items-center justify-center gap-2 ${className}`}
    >
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === activeIndex;
        const colorClass =
          variant === 'light'
            ? isActive
              ? 'bg-[#333333]'
              : 'bg-[#B8B8B8] hover:bg-[#999999]'
            : isActive
              ? 'bg-white'
              : 'bg-white/35 hover:bg-white/60';

        const sizeClass = isActive ? 'w-[28px]' : 'w-[8px]';

        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-label={`Ke slide ${i + 1}`}
            aria-selected={isActive}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => onSelect(i)}
            className={`h-2 rounded-full transition-all duration-500 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2AC72] motion-reduce:transition-none cursor-pointer ${sizeClass} ${colorClass}`}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FLOOR MAP REGISTRY                                                */
/* ------------------------------------------------------------------ */

export interface FloorMapItem {
  lantai: number;
  label: string;
  ratio: number;
  Map: React.ComponentType<{
    selectedCode: string | null;
    onSelectRoom: (k: string) => void;
    className?: string;
  }>;
}

function MapSkeleton() {
  return (
    <div className="flex h-full w-full animate-pulse items-center justify-center bg-slate-100/80 rounded-lg">
      <span className="text-xs font-semibold text-slate-400">Memuat denah...</span>
    </div>
  );
}

// Dynamic imports per floor
const SFDLantai8Map = dynamic(
  () => import('@/components/DenahVisual/DenahGedungSFD/Lantai8/DenahL8SFD/DenahL8SFD').then((m) => m.DenahL8SFD),
  { ssr: false, loading: () => <MapSkeleton /> }
);

const LSLantai1Map = dynamic(
  () => import('@/components/DenahVisual/DenahGedungLS/Lantai1/DenahL1LS/DenahL1LS').then((m) => m.DenahL1LS),
  { ssr: false, loading: () => <MapSkeleton /> }
);
const LSLantai2Map = dynamic(
  () => import('@/components/DenahVisual/DenahGedungLS/Lantai2/DenahL2LS/DenahL2LS').then((m) => m.DenahL2LS),
  { ssr: false, loading: () => <MapSkeleton /> }
);
const LSLantai3Map = dynamic(
  () => import('@/components/DenahVisual/DenahGedungLS/Lantai3/DenahL3LS/DenahL3LS').then((m) => m.DenahL3LS),
  { ssr: false, loading: () => <MapSkeleton /> }
);
const LSLantai4Map = dynamic(
  () => import('@/components/DenahVisual/DenahGedungLS/Lantai4/DenahL4LS/DenahL4LS').then((m) => m.DenahL4LS),
  { ssr: false, loading: () => <MapSkeleton /> }
);

const LELantai1Map = dynamic(
  () => import('@/components/DenahVisual/DenahGedungLE/Lantai1/DenahL1LE/DenahL1LE').then((m) => m.DenahL1LE),
  { ssr: false, loading: () => <MapSkeleton /> }
);
const LELantai2Map = dynamic(
  () => import('@/components/DenahVisual/DenahGedungLE/Lantai2/DenahL2LE/DenahL2LE').then((m) => m.DenahL2LE),
  { ssr: false, loading: () => <MapSkeleton /> }
);
const LELantai3Map = dynamic(
  () => import('@/components/DenahVisual/DenahGedungLE/Lantai3/DenahL3LE/DenahL3LE').then((m) => m.DenahL3LE),
  { ssr: false, loading: () => <MapSkeleton /> }
);
const LELantai4Map = dynamic(
  () => import('@/components/DenahVisual/DenahGedungLE/Lantai4/DenahL4LE/DenahL4LE').then((m) => m.DenahL4LE),
  { ssr: false, loading: () => <MapSkeleton /> }
);

export const FLOOR_MAPS_REGISTRY: Record<'sfd' | 'ls' | 'le', FloorMapItem[]> = {
  sfd: [
    { lantai: 8, label: 'Lantai 8', ratio: 1050 / 635, Map: SFDLantai8Map },
  ],
  ls: [
    { lantai: 1, label: 'Lantai 1', ratio: 1600 / 610, Map: LSLantai1Map },
    { lantai: 2, label: 'Lantai 2', ratio: 1600 / 610, Map: LSLantai2Map },
    { lantai: 3, label: 'Lantai 3', ratio: 1600 / 610, Map: LSLantai3Map },
    { lantai: 4, label: 'Lantai 4', ratio: 1750 / 650, Map: LSLantai4Map },
  ],
  le: [
    { lantai: 1, label: 'Lantai 1', ratio: 1600 / 610, Map: LELantai1Map },
    { lantai: 2, label: 'Lantai 2', ratio: 1600 / 610, Map: LELantai2Map },
    { lantai: 3, label: 'Lantai 3', ratio: 1600 / 610, Map: LELantai3Map },
    { lantai: 4, label: 'Lantai 4', ratio: 1750 / 650, Map: LELantai4Map },
  ],
};

export const floorMaps = FLOOR_MAPS_REGISTRY;

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const LOGIN_HREF = '/login';

const gedungList = [
  { key: 'sfd', label: 'Gedung SFD', base: '/denah-sfd', floors: [3, 8] },
  { key: 'ls', label: 'Gedung L Sipil', base: '/denah-ls', floors: [1, 2, 3, 4] },
  { key: 'le', label: 'Gedung L Elektro', base: '/denah-le', floors: [1, 2, 3, 4] },
];

type Testimonial = {
  src: string;
  quote: string;
  /** siapa orangnya / target penggunanya (tampil di bawah kutipan) */
  role: string;
  /** posisi horizontal fokus foto agar orangnya tidak terpotong (0-100) */
  focusX: number;
};

// Foto: public/SolusiMasalah/1.png - 5.png
const testimonials: Testimonial[] = [
  {
    src: '/SolusiMasalah/1.png',
    role: 'PJ Kelas',
    focusX: 50,
    quote:
      '“Dulu harus keliling gedung cuma buat cari ruang kosong. Sekarang tinggal buka SiRuang dan langsung tahu mana yang tersedia.”',
  },
  {
    src: '/SolusiMasalah/2.png',
    role: 'Dosen',
    focusX: 48,
    quote:
      '“Mau jadwalkan kelas pengganti? Saya cek dulu ruang yang kosong, jadi tidak lagi bentrok dengan kelas lain.”',
  },
  {
    src: '/SolusiMasalah/3.png',
    role: 'Mahasiswa',
    focusX: 45,
    quote:
      '“Cukup dari HP, saya bisa cek ruangan untuk kerja kelompok atau belajar tanpa harus keliling kampus.”',
  },
  {
    src: '/SolusiMasalah/4.png',
    role: 'Admin Akademik',
    focusX: 38,
    quote:
      '“Pengajuan ruangan kini tercatat rapi di satu tempat, tidak ada lagi jadwal ganda atau info yang simpang siur.”',
  },
  {
    src: '/SolusiMasalah/5.png',
    role: 'Ketua Organisasi',
    focusX: 50,
    quote:
      '“Booking ruangan untuk rapat dan acara jadi jauh lebih cepat. Pilih tanggal dan jam, ajukan, lalu tunggu konfirmasi.”',
  },
];

/* ------------------------------------------------------------------ */
/*  CAROUSEL CONFIG (ukuran dari Figma, canvas 1161 x 409)            */
/* ------------------------------------------------------------------ */


const CANVAS_W = 1161;
const CANVAS_H = 409;

type Slot = {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
  img: { left: number; top: number; width: number; height: number; radius: number };
};

const SLOTS: Slot[] = [
  {
    left: 0, top: 88, width: 77, height: 240, radius: 40,
    img: { left: 10.5, top: 12, width: 56, height: 216, radius: 26 },
  },
  {
    left: 121, top: 50, width: 101, height: 315, radius: 40,
    img: { left: 13.5, top: 16, width: 74, height: 283, radius: 26 },
  },
  {
    left: 266, top: 0, width: 629, height: 409, radius: 40,
    img: { left: 327, top: 20, width: 286, height: 368, radius: 40 },
  },
  {
    left: 939, top: 50, width: 101, height: 315, radius: 40,
    img: { left: 13.5, top: 16, width: 74, height: 283, radius: 26 },
  },
  {
    left: 1084, top: 88, width: 77, height: 240, radius: 40,
    img: { left: 10.5, top: 12, width: 56, height: 216, radius: 26 },
  },
];

function useFitScale(designWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / designWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [designWidth]);

  return { ref, scale };
}

function TestimonialCarousel() {
  const [active, setActive] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const { ref, scale } = useFitScale(CANVAS_W);
  const n = testimonials.length;
  const half = Math.floor(n / 2);

  return (
    <div className="flex w-full flex-col items-center">
      <div ref={ref} className="w-full" style={{ height: CANVAS_H * scale }}>
        <div
          className="relative mx-auto shrink-0 origin-top-left"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${scale})`,
          }}
        >
          {testimonials.map((item, i) => {
            const offset = ((i - active + n + half) % n) - half;
            const slot = SLOTS[offset + 2];
            const isActive = offset === 0;

            return (
              <div
                key={i}
                role="button"
                tabIndex={0}
                aria-label={`Testimoni ${i + 1}`}
                aria-current={isActive}
                onClick={() => setActive(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setActive(i);
                }}
                className={`absolute overflow-hidden bg-white transition-all duration-700 ease-in-out outline-none ${isActive ? 'cursor-default' : 'cursor-pointer'
                  }`}
                style={{
                  left: slot.left,
                  top: slot.top,
                  width: slot.width,
                  height: slot.height,
                  borderRadius: slot.radius,
                  zIndex: 30 - Math.abs(offset) * 5,
                }}
              >
                <div
                  className="absolute overflow-hidden transition-all duration-700 ease-in-out bg-[#D9D9D9]"
                  style={{
                    left: slot.img.left,
                    top: slot.img.top,
                    width: slot.img.width,
                    height: slot.img.height,
                    borderRadius: slot.img.radius,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.src}
                    alt={isActive ? `Foto testimoni ${i + 1}` : ''}
                    draggable={false}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: `${item.focusX}% top` }}
                  />
                </div>

                <p
                  className={`absolute text-[20px] font-medium leading-10 text-black transition-opacity ease-in-out ${isActive
                      ? 'opacity-100 duration-500 delay-500'
                      : 'pointer-events-none opacity-0 duration-200'
                    }`}
                  style={{ left: 37, top: 28, width: 249 }}
                >
                  {item.quote}
                </p>

                <p
                  className={`absolute text-[16px] font-semibold text-[#333333] transition-opacity ease-in-out ${isActive
                      ? 'opacity-100 duration-500 delay-500'
                      : 'pointer-events-none opacity-0 duration-200'
                    }`}
                  style={{ left: 37, bottom: 28, width: 249 }}
                >
                  — {item.role}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <DotIndicator
        total={n}
        activeIndex={active}
        onSelect={setActive}
        variant="dark"
        className="mt-8"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FITUR UTAMA + CARA KERJA (dipakai bersama Web/Tab & Mobile)       */
/* ------------------------------------------------------------------ */

const iconProps = {
  className: 'h-[55%] w-[55%]',
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const FITUR_UTAMA = [
  {
    text: 'Lihat denah per lantai dan status ruangan secara real-time.',
    tint: 'bg-[#E4EEE9] text-[#4E7A5C]',
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11z" />
        <circle cx="12" cy="10" r="2.3" />
      </svg>
    ),
  },
  {
    text: 'Ajukan ruangan yang kosong sesuai tanggal dan jam.',
    tint: 'bg-[#FBE6EC] text-[#D0507A]',
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    text: 'Cek jumlah bangku dan fasilitas sebelum memilih ruangan.',
    tint: 'bg-[#E6E9F7] text-[#4F5FB5]',
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <path d="M7 11V6.5A2.5 2.5 0 0 1 9.5 4h5A2.5 2.5 0 0 1 17 6.5V11" />
        <path d="M5 11h14v4H5zM7 15v5M17 15v5" />
      </svg>
    ),
  },
  {
    text: 'Hubungi admin dan dosen, atau tanya chatbot kapan saja.',
    tint: 'bg-[#F1EAE0] text-[#8A6D3B]',
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
      </svg>
    ),
  },
];

const CARA_KERJA = [
  {
    title: 'Pilih gedung dan lantai yang ingin kamu cek',
    desc: 'Tentukan Gedung L atau SFD, lalu pilih lantai untuk membuka denah ruangan yang ingin dicek.',
    illustration: (
      <svg viewBox="0 0 100 100" className="h-full w-auto text-slate-800" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 90h60M30 90V20h40v70M40 35h5M55 35h5M40 50h5M55 50h5M40 65h5M55 65h5M45 90V75h10v15" strokeLinejoin="round" />
        <circle cx="20" cy="50" r="8" fill="#cbd5e1" stroke="none" />
      </svg>
    ),
  },
  {
    title: 'Lihat status ruangan secara real-time',
    desc: 'Cek ruangan yang tersedia, dipesan, atau sedang terpakai secara real-time, lengkap dengan fasilitasnya.',
    illustration: (
      <svg viewBox="0 0 100 100" className="h-full w-auto text-slate-800" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="20" y="25" width="60" height="50" rx="5" />
        <path d="M20 40h60" strokeWidth="2" />
        <circle cx="30" cy="32" r="2" fill="currentColor" />
        <circle cx="40" cy="32" r="2" fill="currentColor" />
        <rect x="30" y="55" width="15" height="10" rx="2" fill="#cbd5e1" stroke="none" />
        <rect x="55" y="55" width="15" height="10" rx="2" />
      </svg>
    ),
  },
  {
    title: 'Ajukan booking untuk ruangan yang kosong',
    desc: 'Pilih ruangan yang kosong, tentukan tanggal dan jam, lalu kirim pengajuan langsung dari website.',
    illustration: (
      <svg viewBox="0 0 100 100" className="h-full w-auto text-slate-800" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="25" y="20" width="50" height="35" rx="3" />
        <path d="M40 55l-5 25M60 55l5 25M30 80h40M45 55v15M55 55v15M30 35l10-5 10 10 15-10" />
      </svg>
    ),
  },
  {
    title: 'Dapatkan konfirmasi langsung',
    desc: 'Terima status pengajuan dan notifikasi, atau tanya lewat chat bila ada kendala.',
    illustration: (
      <svg viewBox="0 0 100 100" className="h-full w-auto text-slate-800" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="35" y="15" width="30" height="60" rx="4" />
        <path d="M45 22h10M40 70h20" strokeLinecap="round" />
        <circle cx="50" cy="50" r="8" fill="#fca5a5" stroke="none" />
        <path d="M47 50l2 2 4-4" />
      </svg>
    ),
  },
];

/* Card fitur: hover / focus => background berubah jadi #333333, teks jadi putih */
export function FiturUtamaCards({ variant }: { variant: 'web' | 'mobile' }) {
  const m = variant === 'mobile';

  return (
    <div
      className={
        m ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6'
      }
    >
      {FITUR_UTAMA.map((item, i) => (
        <Reveal
          key={i}
          tabIndex={0}
          y={28}
          delay={m ? 0 : i * 0.08}
          className={`group flex cursor-pointer flex-col justify-between rounded-2xl border border-[#EFEFEF] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] outline-none transition-colors duration-300 ease-in-out hover:bg-[#333333] focus-visible:bg-[#333333] ${m ? 'min-h-47.5 p-4' : 'min-h-55 p-5 lg:min-h-65 lg:p-6'
            }`}
        >
          <span
            className={`flex items-center justify-center rounded-full ${item.tint} ${m ? 'h-9 w-9' : 'h-11 w-11'
              }`}
          >
            {item.icon}
          </span>
          <p
            className={`font-medium text-[#333333] transition-colors duration-300 ease-in-out group-hover:text-white group-focus-visible:text-white ${m ? 'text-[13px] leading-5' : 'text-[15px] leading-6 lg:text-[17px]'
              }`}
          >
            {item.text}
          </p>
        </Reveal>
      ))}
    </div>
  );
}

export function CaraKerjaSteps({ variant }: { variant: 'web' | 'mobile' }) {
  const m = variant === 'mobile';

  return (
    <div className={m ? 'grid grid-cols-1 gap-12 max-w-90 mx-auto' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8'}>
      {CARA_KERJA.map((step, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-8 relative pt-14 text-center flex flex-col items-center hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] transition-shadow duration-300"
        >
          {/* Floating Number Badge */}
          <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-white rounded-full border-[3px] border-[#333333] flex items-center justify-center text-xl font-bold text-gray-800 shadow-md">
            {i + 1}
          </div>

          {/* SVG Illustration Placeholder */}
          <div className="w-full h-32 mb-6 flex items-center justify-center">
            {step.illustration}
          </div>

          {/* Content */}
          <h3 className="font-bold text-lg mb-3 leading-snug text-gray-900">{step.title}</h3>
          <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
        </div>
      ))}
    </div>
  );
}

// Data statis untuk Card
const stepsData = [
  {
    id: 1,
    image: "/Landing/Caker1.png",
    title: "Pilih gedung dan lantai yang ingin kamu cek",
    desc: "Tentukan Gedung L atau SFD, lalu pilih lantai untuk membuka denah ruangan yang ingin dicek."
  },
  {
    id: 2,
    image: "/Landing/Caker2.png",
    title: "Lihat status ruangan secara real-time",
    desc: "Cek ruangan yang tersedia, dipesan, atau sedang terpakai secara real-time, lengkap dengan fasilitasnya."
  },
  {
    id: 3,
    image: "/Landing/Caker3.png",
    title: "Ajukan booking untuk ruangan yang kosong",
    desc: "Pilih ruangan yang kosong, tentukan tanggal dan jam, lalu kirim pengajuan langsung dari website."
  },
  {
    id: 4,
    image: "/Landing/Caker4.png",
    title: "Dapatkan konfirmasi langsung",
    desc: "Terima status pengajuan dan notifikasi, atau tanya lewat chat bila ada kendala."
  }
];

export function CaraKerjaSection({ variant }: { variant: 'web' | 'mobile' }) {
  const m = variant === 'mobile';

  return (
    <section id="cara-kerja" className="relative w-full overflow-hidden bg-white">
      {/* ================= TOP SECTION (GELAP) ================= */}
      {/* pb harus >= nilai -mt di bawah supaya gelapnya turun sampai tengah kartu */}
      <div className={`bg-[#333333] px-4 text-center ${m ? 'pt-16 pb-52.5' : 'pt-24 pb-50'}`}>
        <div className="max-w-4xl mx-auto">
          <Reveal as="p" y={16} className="text-gray-400 text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase mb-4">
            Semua Info Ruangan, Satu Tempat
          </Reveal>
          <Reveal as="h2" y={20} delay={0.08} className={`text-white font-bold tracking-tight ${m ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl'}`}>
            Cara Kerja SiRuang
          </Reveal>
        </div>
      </div>

      {/* ================= CARDS SECTION (LAYER MENINDIH) ================= */}
      {/* FIX: bg-white DIHAPUS dari wrapper ini (section sudah bg-white).
          Sebelumnya wrapper putih ini ikut tertarik naik oleh -mt dan menutupi area gelap. */}
      <div className={m ? 'pb-16' : 'pb-24 lg:pb-32'}>
        <div
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full ${m ? '-mt-50' : '-mt-47.5'
            }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 pt-8">
            {stepsData.map((step) => (
              <Reveal
                key={step.id}
                y={36}
                delay={m ? 0 : (step.id - 1) * 0.1}
                className="relative bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 flex flex-col items-center text-center mt-6 lg:mt-0"
              >
                {/* Number Badge Bulat */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <div className="w-10 h-10 rounded-full border-2 border-gray-800 flex items-center justify-center">
                    <span className="text-gray-800 font-semibold text-lg">{step.id}</span>
                  </div>
                </div>

                {/* Area Gambar (Caker1 - Caker4) */}
                <div className="w-full h-40 mt-6 mb-6 flex items-center justify-center">
                  <img
                    src={step.image}
                    alt={`Ilustrasi ${step.title}`}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Teks Konten */}
                <h3 className="text-gray-900 font-bold text-lg leading-tight mb-3">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

const container = 'mx-auto w-full max-w-360 px-6 lg:px-21';

export default function WebTabLayout() {
  const [activeKey, setActiveKey] = useState<'sfd' | 'ls' | 'le'>('sfd');
  const [slideIndex, setSlideIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [cardsPerPage, setCardsPerPage] = useState(2);

  const sliderRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartScrollLeft = useRef(0);
  const isPointerDown = useRef(false);
  const rafRef = useRef<number | null>(null);

  const activeGedung = gedungList.find((g) => g.key === activeKey) ?? gedungList[0];
  const floorItems = FLOOR_MAPS_REGISTRY[activeKey] || [];

  useEffect(() => {
    const updateCardsPerPage = () => {
      if (typeof window !== 'undefined') {
        setCardsPerPage(window.innerWidth >= 768 ? 2 : 1);
      }
    };
    updateCardsPerPage();
    window.addEventListener('resize', updateCardsPerPage);
    return () => window.removeEventListener('resize', updateCardsPerPage);
  }, []);

  const totalPages = Math.ceil(floorItems.length / cardsPerPage);

  const pages: FloorMapItem[][] = [];
  for (let i = 0; i < floorItems.length; i += cardsPerPage) {
    pages.push(floorItems.slice(i, i + cardsPerPage));
  }

  const handleSelectGedung = (key: 'sfd' | 'ls' | 'le') => {
    setActiveKey(key);
    setSlideIndex(0);
    if (sliderRef.current) {
      sliderRef.current.scrollLeft = 0;
    }
  };

  const handleSelectSlide = (i: number) => {
    setSlideIndex(i);
    if (sliderRef.current) {
      const pageWidth = sliderRef.current.clientWidth;
      sliderRef.current.scrollTo({
        left: i * pageWidth,
        behavior: 'smooth',
      });
    }
  };

  const handlePrev = () => {
    if (slideIndex > 0) {
      handleSelectSlide(slideIndex - 1);
    }
  };

  const handleNext = () => {
    if (slideIndex < totalPages - 1) {
      handleSelectSlide(slideIndex + 1);
    }
  };

  const handleScroll = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!sliderRef.current) return;
      const { scrollLeft, clientWidth } = sliderRef.current;
      if (clientWidth > 0) {
        const newIndex = Math.min(
          totalPages - 1,
          Math.max(0, Math.round(scrollLeft / clientWidth))
        );
        setSlideIndex((prev) => (prev !== newIndex ? newIndex : prev));
      }
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !sliderRef.current) return;
    isPointerDown.current = true;
    dragStartX.current = e.clientX;
    dragStartScrollLeft.current = sliderRef.current.scrollLeft;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDown.current || !sliderRef.current) return;
    const dx = e.clientX - dragStartX.current;
    if (!isDragging && Math.abs(dx) > 4) {
      setIsDragging(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch { }
    }
    if (isDragging) {
      sliderRef.current.scrollLeft = dragStartScrollLeft.current - dx;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPointerDown.current) {
      isPointerDown.current = false;
      setIsDragging(false);
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch { }
    }
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className={`${jakarta.className} w-full overflow-x-hidden bg-white text-black`}>
      {/* ---------------- NAVBAR ---------------- */}
      <Navbar variant="web" />

      {/* ---------------- HERO ---------------- */}
      <section className={`${container} mt-30 lg:mt-60.75`}>
        <Reveal
          mode="load"
          y={32}
          scale={0.985}
          duration={0.9}
          className="relative min-h-95 rounded-[40px] lg:h-140.25"
          style={{ background: 'linear-gradient(90deg, #183449 0%, #588CBC 100%)' }}
        >
          <div className="relative z-10 flex h-full w-[54%] flex-col justify-center py-10 pl-8 lg:w-150 lg:justify-center lg:py-12 lg:pl-11.75">
            <Reveal mode="load" y={22} delay={0.35} className="text-[#FCFCFC]">
              <span className="text-[30px] font-bold sm:text-[34px] lg:text-[42px] leading-tight block xl:inline">
                Selamat Datang Di&nbsp;
              </span>
              <span className={`${fasthand.className} text-[48px] font-normal sm:text-[56px] lg:text-[68px] leading-tight block xl:inline`}>
                SiRuang
              </span>
            </Reveal>

            <Reveal as="p" mode="load" y={22} delay={0.48} className="mt-5 max-w-130.25 text-[17px] leading-7 text-[#FCFCFC] lg:mt-6 lg:text-[23px] lg:leading-9.5">
             Butuh ruangan sekarang? Cek slot kosong dan langsung booking sementara tanpa takut nabrak jadwal akademik kampus.
            </Reveal>
          </div>

          <Reveal mode="load" x={56} y={0} delay={0.4} duration={0.95} className="absolute bottom-0 right-0 aspect-617/745 w-[50%] lg:w-154.25">
            <Image
              src="/Landing/GedungSFD.png"
              alt="Gedung SFD"
              width={617}
              height={745}
              priority
              className="h-full w-full rounded-br-[40px] object-cover"
            />
          </Reveal>
        </Reveal>
      </section>

      {/* ---------------- DATA REAL-TIME ---------------- */}
      <section id="data-real-time" className={`${container} mt-25 lg:mt-47`}>
        <Reveal as="h2" className="text-center text-[40px] font-semibold leading-15.75 lg:text-[50px]">
          Data Real-Time
        </Reveal>

        <Reveal as="p" delay={0.08} className="mx-auto mt-7 max-w-215 text-center text-[20px] leading-8.5 lg:mt-9.5 lg:text-[25px] lg:leading-10">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
          <br className="hidden lg:block" /> tempor incididunt ut labore et dolore magna aliqua. Ut
          enim ad minim veniam,
        </Reveal>

        {/* tombol gedung */}
        <Reveal delay={0.16} className="mt-7.5 flex flex-wrap items-center justify-center gap-4 lg:mt-9.25 lg:gap-20">
          {gedungList.map((g) => {
            const isActive = g.key === activeKey;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => handleSelectGedung(g.key as 'sfd' | 'ls' | 'le')}
                aria-pressed={isActive}
                className={`flex h-16.25 min-w-51 cursor-pointer items-center justify-center rounded-[15px] px-10 text-[20px] font-semibold transition-colors duration-300 ${isActive
                    ? 'bg-[#333333] text-white'
                    : 'border border-[#333333] bg-transparent text-black hover:bg-[#333333]/5'
                  }`}
              >
                {g.label}
              </button>
            );
          })}
        </Reveal>

        {/* kartu denah lantai slider (lebar penuh container, sejajar hero card) */}
        <motion.div
          key={activeGedung.key}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 'some' }}
          transition={{ duration: 0.55, ease: EASE_OUT }}
          className="mt-10 w-full lg:mt-16.5"
        >
          {totalPages <= 1 ? (
            <div className="flex w-full justify-center gap-7.5">
              {floorItems.map((item) => (
                <div
                  key={item.lantai}
                  className={cardsPerPage === 2 ? 'w-[calc((100%-30px)/2)]' : 'w-full'}
                >
                  <Link
                    href={`${activeGedung.base}/lantai${item.lantai}`}
                    prefetch={true}
                    className="group block rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2AC72]"
                  >
                    <figure className="flex flex-col">
                      <div className="w-full rounded-[20px] bg-[#D9D9D9] p-3 shadow-xs transition-transform duration-300 group-hover:scale-[1.01]">
                        <div
                          className="flex w-full items-center justify-center overflow-hidden rounded-xl bg-white p-2"
                          style={{ aspectRatio: item.ratio }}
                        >
                          <div className="h-full w-full pointer-events-none select-none" aria-hidden="true">
                            <item.Map
                              className="h-full w-full object-contain"
                              selectedCode={null}
                              onSelectRoom={() => { }}
                            />
                          </div>
                        </div>
                      </div>
                      <figcaption className="mt-4 flex flex-col items-center text-center">
                        <span className="text-[18px] font-semibold text-[#333333] transition-colors group-hover:text-sky-700 lg:text-[22px]">
                          Lantai {item.lantai}
                        </span>
                        <span className="my-1.5 h-1 w-8 rounded-full bg-[#C2AC72]" />
                        <span className="text-[14px] font-medium text-[#B8B8B8]">
                          {activeGedung.label}
                        </span>
                      </figcaption>
                    </figure>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative w-full">
              <div
                ref={sliderRef}
                onScroll={handleScroll}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={`flex w-full overflow-x-auto snap-x snap-mandatory select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'
                  }`}
              >
                {pages.map((pageCards, pageIdx) => (
                  <div
                    key={pageIdx}
                    className="flex w-full shrink-0 snap-start gap-7.5"
                  >
                    {pageCards.map((item) => (
                      <div
                        key={item.lantai}
                        className={cardsPerPage === 2 ? 'w-[calc((100%-30px)/2)] shrink-0' : 'w-full shrink-0'}
                      >
                        <Link
                          href={`${activeGedung.base}/lantai${item.lantai}`}
                          prefetch={true}
                          onClick={(e) => {
                            if (isDragging) e.preventDefault();
                          }}
                          className="group block rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2AC72]"
                        >
                          <figure className="flex flex-col">
                            <div className="w-full rounded-[20px] bg-[#D9D9D9] p-3 shadow-xs transition-transform duration-300 group-hover:scale-[1.01]">
                              <div
                                className="flex w-full items-center justify-center overflow-hidden rounded-xl bg-white p-2"
                                style={{ aspectRatio: item.ratio }}
                              >
                                <div className="h-full w-full pointer-events-none select-none" aria-hidden="true">
                                  <item.Map
                                    className="h-full w-full object-contain"
                                    selectedCode={null}
                                    onSelectRoom={() => { }}
                                  />
                                </div>
                              </div>
                            </div>
                            <figcaption className="mt-4 flex flex-col items-center text-center">
                              <span className="text-[18px] font-semibold text-[#333333] transition-colors group-hover:text-sky-700 lg:text-[22px]">
                                Lantai {item.lantai}
                              </span>
                              <span className="my-1.5 h-1 w-8 rounded-full bg-[#C2AC72]" />
                              <span className="text-[14px] font-medium text-[#B8B8B8]">
                                {activeGedung.label}
                              </span>
                            </figcaption>
                          </figure>
                        </Link>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Dot & Desktop Arrows */}
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={slideIndex === 0}
                  aria-label="Halaman sebelumnya"
                  className="hidden h-9 w-9 items-center justify-center rounded-full border border-[#B8B8B8] text-[#333333] transition-all hover:border-[#333333] hover:bg-[#333333] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 lg:flex cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <DotIndicator
                  total={totalPages}
                  activeIndex={slideIndex}
                  onSelect={handleSelectSlide}
                  variant="light"
                />

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={slideIndex >= totalPages - 1}
                  aria-label="Halaman berikutnya"
                  className="hidden h-9 w-9 items-center justify-center rounded-full border border-[#B8B8B8] text-[#333333] transition-all hover:border-[#333333] hover:bg-[#333333] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 lg:flex cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </section>

      {/* ---------------- RESPONSIVE WEBSITE ---------------- */}
      <section className={`${container} mt-25 lg:mt-39.5`}>
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-start lg:gap-0">
          <Reveal y={32} duration={0.9} className="relative z-0 flex h-105 w-89.25 shrink-0 items-center justify-center bg-white lg:ml-6 lg:h-139.5 lg:w-118.5">
            <video
              src="/Landing/Responsive.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              disableRemotePlayback
              controlsList="nodownload noremoteplayback noplaybackrate"
              aria-hidden="true"
              style={{
                filter: 'brightness(1.03) contrast(1.04)',
              }}
              className="pointer-events-none h-full w-full select-none object-contain transition-transform duration-300 md:scale-[1.5] lg:scale-[2] [clip-path:inset(3px_3px_3px_3px)]"
            />
          </Reveal>

          <Reveal delay={0.12} className="relative z-10 w-full max-w-178 lg:ml-15.75 lg:mt-2.25">
            <p className="text-[20px] font-semibold leading-10 text-[#B8B8B8] lg:text-[23px]">
              Lorem Ipsum dolor sit
            </p>
            <h2 className="mt-3 text-[40px] font-semibold leading-15.75 lg:text-[50px]">
              Responsive Website
            </h2>
            <p className="mt-7.5 text-[20px] leading-8.5 lg:text-[25px] lg:leading-10">
              SiRuang dirancang responsif sehingga nyaman diakses dari ponsel maupun laptop. PJ kelas bisa mengecek status ruangan dari rumah atau saat di perjalanan, tanpa harus datang ke kampus hanya untuk memastikan ruangan kosong. Tidak perlu instal aplikasi tambahan, cukup buka lewat browser.
            </p>
            <Link
              href="#"
              className="mt-7.5 flex h-16.25 w-51 items-center justify-center rounded-[15px] bg-[#333333] text-[20px] font-semibold text-white transition-opacity hover:opacity-85"
            >
              Lorem ipsum
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ---------------- MASALAH YANG DISELESAIKAN ---------------- */}
      <section className="mt-25 bg-[#333333] px-4 pb-25 pt-20 lg:mt-48 lg:pb-40 lg:pt-29.75">
        <Reveal as="p" y={16} className="text-center text-[20px] leading-10 text-[#E3E3E3] lg:text-[23px]">
          Lorem Ipsum dolor sit
        </Reveal>
        <Reveal as="h2" y={20} delay={0.08} className="mt-0 text-center text-[36px] font-semibold leading-15.75 text-white lg:text-[50px]">
          Masalah yang Diselesaikan
        </Reveal>

        <Reveal y={40} delay={0.12} duration={0.9} className="mx-auto mt-10 max-w-290.25 lg:mt-20.75">
          <TestimonialCarousel />
        </Reveal>
      </section>

      {/* ---------------- FITUR UTAMA ---------------- */}
      <section className="mx-auto w-full max-w-360 px-6 pb-30 pt-20 lg:px-21 lg:pt-30">
        {/* ---------------- FITUR UTAMA ---------------- */}
        <div id="fitur">
          <Reveal as="p" y={16} className="text-[13px] font-semibold uppercase tracking-widest text-[#B8B8B8]">
            Semua info ruangan, satu tempat
          </Reveal>
          <Reveal as="h2" y={20} delay={0.08} className="mt-3 text-[40px] font-semibold leading-14 lg:text-[50px]">
            Fitur Utama SiRuang
          </Reveal>
          <Reveal as="p" y={20} delay={0.16} className="mt-5 max-w-190 text-[20px] leading-8.5 lg:text-[22px] lg:leading-9">
            SiRuang membantu PJ kelas, dosen, dan mahasiswa melihat status ruangan, mengajukan
            booking, dan berkomunikasi dalam satu website.
          </Reveal>

          <div className="mt-10 lg:mt-14">
            <FiturUtamaCards variant="web" />
          </div>
        </div>
      </section>

      {/* ---------------- CARA KERJA ---------------- */}
      <CaraKerjaSection variant="web" />

      {/* ---------------- FOOTER ---------------- */}
      <Footer variant="web" />
    </div>
    </MotionConfig>
  );
}