'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, MotionConfig } from 'framer-motion';
import { jakarta, fasthand } from '@/lib/fonts';
import { Maximize2 } from 'lucide-react';
import {
  FLOOR_MAPS_REGISTRY,
  FloorPreviewModal,
  type FloorMapItem,
  DotIndicator,
  FiturUtamaCards,
  CaraKerjaSection,
  Reveal,
  EASE_OUT,
} from '../Web&Tab/WebTabLayout';
import Navbar from '@/components/LandingPage/Navbar';
import Footer from '@/components/LandingPage/Footer';

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const LOGIN_HREF = '/login';

const gedungList = [
  { key: 'sfd', label: 'Gedung SFD', base: '/denah-sfd', floors: [3, 8] },
  { key: 'ls', label: 'Gedung L Sipil', base: '/denah-ls', floors: [1, 2, 3, 4] },
  { key: 'le', label: 'Gedung L Elektro', base: '/denah-le', floors: [1, 2, 3, 4] },
];

const QUOTE =
  '“Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.”';

const testimonials = [1, 2, 3, 4, 5].map((n) => ({
  src: `/SolusiMasalah/${n}.png`,
  quote: QUOTE,
}));

/* ------------------------------------------------------------------ */
/*  CAROUSEL CONFIG (canvas 358 x 340, diskalakan sesuai lebar layar) */
/* ------------------------------------------------------------------ */

const CANVAS_W = 358;
const CANVAS_H = 340;

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
    left: 0, top: 110, width: 28, height: 120, radius: 14,
    img: { left: 4, top: 5, width: 20, height: 110, radius: 10 },
  },
  {
    left: 36, top: 80, width: 40, height: 180, radius: 20,
    img: { left: 5, top: 6, width: 30, height: 168, radius: 15 },
  },
  {
    left: 84, top: 0, width: 190, height: 340, radius: 28,
    img: { left: 8, top: 8, width: 174, height: 170, radius: 22 },
  },
  {
    left: 282, top: 80, width: 40, height: 180, radius: 20,
    img: { left: 5, top: 6, width: 30, height: 168, radius: 15 },
  },
  {
    left: 330, top: 110, width: 28, height: 120, radius: 14,
    img: { left: 4, top: 5, width: 20, height: 110, radius: 10 },
  },
];

function useFitScale(designWidth: number, max = 1.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(max, el.clientWidth / designWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [designWidth, max]);

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
          className="relative mx-auto origin-top-left shrink-0"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${scale})`,
            marginLeft: scale >= 1.2 ? 'auto' : 0,
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
                className="absolute overflow-hidden bg-white outline-none transition-all duration-700 ease-in-out"
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
                    className="h-full w-full object-cover object-top"
                  />
                </div>

                <p
                  className={`absolute text-[12px] font-medium leading-4.75 text-black transition-opacity ease-in-out ${
                    isActive
                      ? 'opacity-100 duration-500 delay-500'
                      : 'pointer-events-none opacity-0 duration-200'
                  }`}
                  style={{ left: 14, top: 192, width: 162 }}
                >
                  {item.quote}
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
        className="mt-6"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function MobileLayout() {
  const [activeKey, setActiveKey] = useState<'sfd' | 'ls' | 'le'>('sfd');
  const [slideIndex, setSlideIndex] = useState(0);
  const [previewModal, setPreviewModal] = useState<FloorMapItem | null>(null);

  const sliderRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const activeGedung = gedungList.find((g) => g.key === activeKey) ?? gedungList[0];
  const floorItems = FLOOR_MAPS_REGISTRY[activeKey] || [];

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

  const handleScroll = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!sliderRef.current) return;
      const { scrollLeft, clientWidth } = sliderRef.current;
      if (clientWidth > 0) {
        const newIndex = Math.min(
          floorItems.length - 1,
          Math.max(0, Math.round(scrollLeft / clientWidth))
        );
        setSlideIndex((prev) => (prev !== newIndex ? newIndex : prev));
      }
    });
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className={`${jakarta.className} w-full overflow-x-hidden bg-white text-black`}>
      {/* ---------------- NAVBAR ---------------- */}
      <Navbar variant="mobile" />

      {/* ---------------- HERO ---------------- */}
      <section className="mt-18 px-4">
        <Reveal
          mode="load"
          y={28}
          scale={0.985}
          duration={0.9}
          className="relative rounded-[28px] px-6 pb-8 pt-57.5"
          style={{ background: 'linear-gradient(90deg, #183449 0%, #588CBC 100%)' }}
        >
          <Reveal mode="load" x={36} y={0} delay={0.4} duration={0.95} className="absolute right-0 -top-16 aspect-617/745 w-[62%]">
            <Image
              src="/Landing/GedungSFD.png"
              alt="Gedung SFD"
              width={617}
              height={745}
              priority
              className="h-full w-full rounded-br-[28px] object-cover"
            />
          </Reveal>

          <Reveal mode="load" y={20} delay={0.35} className="text-[#FCFCFC]">
            <span className="block text-[24px] font-bold leading-tight">Selamat Datang Di</span>
            <span className={`${fasthand.className} block text-[42px] font-normal leading-tight mt-1`}>SiRuang</span>
          </Reveal>

          <Reveal as="p" mode="load" y={20} delay={0.47} className="mt-3.5 text-[15px] leading-6 text-[#FCFCFC]">
           Butuh ruangan sekarang? Cek slot kosong dan langsung booking sementara tanpa takut nabrak jadwal akademik kampus.
          </Reveal>
        </Reveal>
      </section>

      {/* ---------------- DATA REAL-TIME ---------------- */}
      <section data-nav-tone="light" id="data-real-time" className="mt-16 px-4">
        <Reveal as="h2" y={20} className="text-center text-[30px] font-semibold leading-10">Data Real-Time</Reveal>
        <Reveal as="p" y={20} delay={0.08} className="mt-3 text-center text-[15px] leading-6">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
        </Reveal>

        {/* tombol gedung (geser ke samping kalau layar sempit) */}
        <Reveal y={20} delay={0.14} className="-mx-4 mt-6 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {gedungList.map((g) => {
            const isActive = g.key === activeKey;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => handleSelectGedung(g.key as 'sfd' | 'ls' | 'le')}
                aria-pressed={isActive}
                className={`h-12 shrink-0 rounded-xl px-6 text-[15px] font-semibold transition-colors duration-300 ${
                  isActive
                    ? 'bg-[#1C1C1C] text-white'
                    : 'border border-[#1C1C1C] bg-transparent text-black'
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </Reveal>

        {/* slider kartu denah lantai: 1 kartu per slide di mobile, swipe horizontal */}
        <motion.div
          key={activeGedung.key}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 'some' }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          className="mt-6 w-full"
        >
          <div
            ref={sliderRef}
            onScroll={handleScroll}
            className="flex w-full overflow-x-auto snap-x snap-mandatory select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {floorItems.map((item) => (
              <div key={item.lantai} className="w-full shrink-0 snap-start px-0.5">
                <div className="block rounded-[20px]">
                  <figure className="flex flex-col items-center">
                    <div className="relative w-full rounded-[20px] bg-[#D9D9D9] p-3 shadow-xs">
                      {/* Tombol Perbesar Popup */}
                      <button
                        type="button"
                        onClick={() => setPreviewModal(item)}
                        aria-label={`Perbesar Denah Lantai ${item.lantai}`}
                        title="Perbesar Tampilan Denah"
                        className="absolute right-5 top-5 z-20 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white shadow-md backdrop-blur-md transition-all hover:bg-black/85 active:scale-95 cursor-pointer"
                      >
                        <Maximize2 size={15} />
                      </button>

                      <div
                        onClick={() => setPreviewModal(item)}
                        className="flex w-full items-center justify-center overflow-hidden rounded-xl bg-white p-2 cursor-pointer transition-opacity active:opacity-90"
                        style={{ aspectRatio: item.ratio }}
                      >
                        <div className="h-full w-full pointer-events-none select-none" aria-hidden="true">
                          <item.Map
                            className="h-full w-full object-contain"
                            selectedCode={null}
                            onSelectRoom={() => {}}
                          />
                        </div>
                      </div>
                    </div>
                    <figcaption className="mt-4 flex flex-col items-center text-center">
                      <span className="text-[18px] font-semibold text-[#1C1C1C]">
                        Lantai {item.lantai}
                      </span>
                      <span className="my-1.5 h-1 w-8 rounded-full bg-[#C2AC72]" />
                      <span className="text-[14px] font-medium text-[#B8B8B8]">
                        {activeGedung.label}
                      </span>
                    </figcaption>
                  </figure>
                </div>
              </div>
            ))}
          </div>

          {floorItems.length > 1 && (
            <div className="mt-6">
              <DotIndicator
                total={floorItems.length}
                activeIndex={slideIndex}
                onSelect={handleSelectSlide}
                variant="light"
              />
            </div>
          )}
        </motion.div>
      </section>

      {/* Modal Popup Perbesar Denah */}
      <FloorPreviewModal
        item={previewModal}
        gedungLabel={activeGedung.label}
        onClose={() => setPreviewModal(null)}
      />

      {/* ---------------- RESPONSIVE WEBSITE ---------------- */}
      <section data-nav-tone="light" className="mt-16 px-4">
        <Reveal y={28} duration={0.9} className="relative z-0 mx-auto aspect-474/558 w-full max-w-75 flex items-center justify-center bg-white">
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
            className="pointer-events-none h-full w-full select-none object-contain scale-[1.14] [clip-path:inset(3px_3px_3px_3px)]"
          />
        </Reveal>

        <Reveal delay={0.1} className="relative z-10 mt-6">
          <p className="text-[15px] font-semibold leading-7 text-[#B8B8B8]">
            Lorem Ipsum dolor sit
          </p>
          <h2 className="mt-1 text-[30px] font-semibold leading-10">Responsive Website</h2>
          <p className="mt-3 text-[15px] leading-6">
            SiRuang dirancang responsif sehingga nyaman diakses dari ponsel maupun laptop. PJ kelas bisa mengecek status ruangan dari rumah atau saat di perjalanan, tanpa harus datang ke kampus hanya untuk memastikan ruangan kosong. Tidak perlu instal aplikasi tambahan, cukup buka lewat browser.
          </p>
          <Link
            href="#"
            className="mt-6 flex h-12 w-40 items-center justify-center rounded-xl bg-[#1C1C1C] text-[16px] font-semibold text-white active:opacity-80"
          >
            Lorem ipsum
          </Link>
        </Reveal>
      </section>

      {/* ---------------- MASALAH YANG DISELESAIKAN ---------------- */}
      <section data-nav-tone="dark" className="mt-16 bg-[#1C1C1C] px-4 pb-16 pt-14">
        <Reveal as="p" y={16} className="text-center text-[14px] leading-6 text-[#E3E3E3]">
          Lorem Ipsum dolor sit
        </Reveal>
        <Reveal as="h2" y={20} delay={0.08} className="mt-1 text-center text-[28px] font-semibold leading-9 text-white">
          Masalah yang Diselesaikan
        </Reveal>

        <Reveal y={32} delay={0.12} duration={0.9} className="mx-auto mt-8 max-w-107.5">
          <TestimonialCarousel />
        </Reveal>
      </section>

      {/* ---------------- FITUR UTAMA ---------------- */}
      <section data-nav-tone="light" className="px-4 pb-20 pt-14">
        {/* ---------------- FITUR UTAMA ---------------- */}
        <div id="fitur">
          <Reveal as="p" y={14} className="text-[11px] font-semibold uppercase tracking-widest text-[#B8B8B8]">
            Semua info ruangan, satu tempat
          </Reveal>
          <Reveal as="h2" y={18} delay={0.07} className="mt-2 text-[28px] font-semibold leading-9">Fitur Utama SiRuang</Reveal>
          <Reveal as="p" y={18} delay={0.14} className="mt-3 text-[15px] leading-6">
            SiRuang membantu PJ kelas, dosen, dan mahasiswa melihat status ruangan, mengajukan
            booking, dan berkomunikasi dalam satu website.
          </Reveal>

          <div className="mt-6">
            <FiturUtamaCards variant="mobile" />
          </div>
        </div>
      </section>

      {/* ---------------- CARA KERJA ---------------- */}
      <CaraKerjaSection variant="mobile" />

      {/* ---------------- FOOTER ---------------- */}
      <Footer variant="mobile" />
    </div>
    </MotionConfig>
  );
}