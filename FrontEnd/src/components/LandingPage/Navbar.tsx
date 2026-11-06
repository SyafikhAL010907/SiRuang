'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({
    subsets: ['latin'],
    weight: ['500', '600', '700'],
});

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const LOGIN_HREF = '/login';

/* Logo: satu file, dipecah jadi 3 lapis (ikon / tulisan / titik i).
   Semua angka di bawah dalam PIXEL file aslinya. Kalau hasilnya kurang pas, tinggal geser angkanya. */
const LOGO = {
    src: '/LogoSiRuangDatar.png', // harus PNG dengan background transparan
    imgW: 1660, // lebar file asli
    imgH: 934, // tinggi file asli

    // posisi ikon "S" di file asli
    iconL: 105,
    iconR: 550,
    iconCy: 497, // titik tengah vertikal ikon
    iconH: 515, // tinggi ikon

    // ukuran ikon relatif ke aslinya (1 = asli). Tulisan tidak ikut berubah.
    //  - ikon masih kegedean -> turunkan (0.7)
    //  - ikon kekecilan      -> naikkan (0.9)
    iconScale: 0.8,

    // x tempat ikon berakhir dan tulisan dimulai
    splitX: 565,
    // kotak titik "i" kuning: kiri, atas, kanan, bawah
    dot: { l: 750, t: 398, r: 822, b: 459 },
};

// Area konten logo (tanpa ruang kosong), dihitung otomatis dari angka di atas
const REF_H = 525; // tinggi konten SEBELUM ikon dikecilkan (patokan ukuran tulisan)
const SHRINK_W = (LOGO.iconR - LOGO.iconL) * (1 - LOGO.iconScale);
const BOX_X = LOGO.iconL - 5 + SHRINK_W;
const BOX = {
    x: BOX_X,
    y: LOGO.iconCy - (LOGO.iconH * LOGO.iconScale) / 2 - 8,
    w: 1610 - BOX_X,
    h: LOGO.iconH * LOGO.iconScale + 16,
};

// Dipakai juga oleh Footer.tsx supaya navigasi header & footer selalu sama.
export const NAV_LINKS = [
    { label: 'Beranda', href: '#' },
    { label: 'Data RealTime', href: '#data-real-time' },
    { label: 'Fitur', href: '#fitur' },
    { label: 'Cara Kerja', href: '#cara-kerja' },
];

// Smooth scroll ke section berdasarkan id. href '#' = balik ke paling atas.
export function handleNavClick(
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
    after?: () => void
) {
    if (!href.startsWith('#')) return;
    e.preventDefault();

    if (href === '#') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        document
            .getElementById(href.slice(1))
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    after?.();
}

/* ------------------------------------------------------------------ */
/*  LOGO ADAPTIF                                                       */
/* ------------------------------------------------------------------ */

const pctX = (v: number) => (v / LOGO.imgW) * 100;
const pctY = (v: number) => (v / LOGO.imgH) * 100;

// Lapis tulisan: dari splitX ke kanan, dengan "celah" kecil di atas titik i
// supaya titik i tidak ikut berubah warna.
const TEXT_CLIP = `polygon(
  ${pctX(LOGO.splitX)}% 0%,
  ${pctX(LOGO.dot.l)}% 0%,
  ${pctX(LOGO.dot.l)}% ${pctY(LOGO.dot.b)}%,
  ${pctX(LOGO.dot.r)}% ${pctY(LOGO.dot.b)}%,
  ${pctX(LOGO.dot.r)}% 0%,
  100% 0%,
  100% 100%,
  ${pctX(LOGO.splitX)}% 100%
)`;

const ICON_CLIP = `inset(0 ${100 - pctX(LOGO.splitX)}% 0 0)`;

const DOT_CLIP = `inset(${pctY(LOGO.dot.t)}% ${100 - pctX(LOGO.dot.r)}% ${100 - pctY(LOGO.dot.b)}% ${pctX(LOGO.dot.l)}%)`;

// Ikon mengecil ke arah tulisan (titik tumpu = tepi kanan ikon), jadi jarak ke tulisan tetap
const ICON_ORIGIN = `${pctX(LOGO.iconR)}% ${pctY(LOGO.iconCy)}%`;

/**
 * `height` = ukuran patokan (sama seperti sebelumnya). Ukuran TULISAN tetap sama
 * walau ikon dikecilkan; yang berubah hanya ikonnya.
 */
function AdaptiveLogo({ dark, height }: { dark: boolean; height: number }) {
    const { imgW, imgH, src } = LOGO;
    const renderH = height * (BOX.h / REF_H);

    const layer = 'pointer-events-none absolute inset-0 h-full w-full select-none';

    return (
        <span
            role="img"
            aria-label="SiRuang"
            className="relative block shrink-0 overflow-hidden"
            style={{ height: renderH, aspectRatio: `${BOX.w} / ${BOX.h}` }}
        >
            {/* "panggung" seukuran file asli, digeser supaya yang kelihatan hanya area konten */}
            <span
                className="absolute block"
                style={{
                    left: `${(-BOX.x / BOX.w) * 100}%`,
                    top: `${(-BOX.y / BOX.h) * 100}%`,
                    width: `${(imgW / BOX.w) * 100}%`,
                    height: `${(imgH / BOX.h) * 100}%`,
                }}
            >
                {/* 1. ikon: warna asli, dikecilkan */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={src}
                    alt=""
                    draggable={false}
                    className={layer}
                    style={{
                        clipPath: ICON_CLIP,
                        transform: `scale(${LOGO.iconScale})`,
                        transformOrigin: ICON_ORIGIN,
                    }}
                />

                {/* 2. tulisan: putih bersih di background gelap, warna asli di background terang */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={src}
                    alt=""
                    draggable={false}
                    className={`${layer} transition-[filter] duration-300`}
                    style={{
                        clipPath: TEXT_CLIP,
                        filter: dark
                            ? 'brightness(0) invert(1)' // semua jadi hitam dulu, lalu dibalik jadi putih murni
                            : 'brightness(1) invert(0)', // tidak berubah (warna asli)
                    }}
                />

                {/* 3. titik i: kuning asli, tidak pernah diubah */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" draggable={false} className={layer} style={{ clipPath: DOT_CLIP }} />
            </span>
        </span>
    );
}

/* ------------------------------------------------------------------ */
/*  DETEKSI WARNA BACKGROUND DI BAWAH HEADER                           */
/* ------------------------------------------------------------------ */

type Tone = 'light' | 'dark'; // light = background terang (teks gelap), dark = background gelap (teks putih)

let colorCtx: CanvasRenderingContext2D | null = null;

// Ubah warna CSS apa pun (hex, rgb, oklch, dll) jadi [r, g, b, a].
// Return null kalau warnanya tidak bisa dibaca browser (supaya tidak salah dianggap hitam).
function toRGBA(color: string): [number, number, number, number] | null {
    if (!color) return null;
    const trimmed = color.trim().toLowerCase();

    // Fast-path: Hex color (tanpa akses canvas/GPU)
    if (trimmed.startsWith('#')) {
        const hex = trimmed.slice(1);
        if (hex.length === 3) {
            return [
                parseInt(hex[0] + hex[0], 16),
                parseInt(hex[1] + hex[1], 16),
                parseInt(hex[2] + hex[2], 16),
                1,
            ];
        }
        if (hex.length === 6) {
            return [
                parseInt(hex.slice(0, 2), 16),
                parseInt(hex.slice(2, 4), 16),
                parseInt(hex.slice(4, 6), 16),
                1,
            ];
        }
        if (hex.length === 8) {
            return [
                parseInt(hex.slice(0, 2), 16),
                parseInt(hex.slice(2, 4), 16),
                parseInt(hex.slice(4, 6), 16),
                parseInt(hex.slice(6, 8), 16) / 255,
            ];
        }
    }

    // Fast-path: rgb / rgba (tanpa akses canvas/GPU)
    if (trimmed.startsWith('rgb')) {
        const parts = trimmed.match(/[\d.]+/g);
        if (parts && parts.length >= 3) {
            return [
                parseFloat(parts[0]),
                parseFloat(parts[1]),
                parseFloat(parts[2]),
                parts.length >= 4 ? parseFloat(parts[3]) : 1,
            ];
        }
    }

    if (!colorCtx) {
        colorCtx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    }
    if (!colorCtx) return null;

    // fillStyle yang tidak valid TIDAK mengubah nilai sebelumnya, jadi pakai penanda dulu
    const SENTINEL = '#010203';
    colorCtx.fillStyle = SENTINEL;
    colorCtx.fillStyle = color;
    if (colorCtx.fillStyle === SENTINEL && trimmed !== SENTINEL) return null;

    colorCtx.clearRect(0, 0, 1, 1);
    colorCtx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = colorCtx.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
}

const luminance = (r: number, g: number, b: number) =>
    (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const COLOR_RE = /(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)|#[0-9a-fA-F]{3,8}/g;

function detectTone(header: HTMLElement): Tone {
    const x = window.innerWidth / 2;
    const y = header.offsetHeight / 2;

    for (const el of document.elementsFromPoint(x, y)) {
        if (header.contains(el)) continue;

        // Opsional: paksa nada section lewat atribut data-nav-tone="dark" / "light"
        const forced = (el as HTMLElement).closest?.('[data-nav-tone]') as HTMLElement | null;
        if (forced) return forced.dataset.navTone === 'dark' ? 'dark' : 'light';

        const cs = getComputedStyle(el);

        // gradasi (misal banner biru): ambil warna pertama yang BENAR-BENAR terlihat
        // (abaikan "transparent" / warna yang tidak bisa dibaca, supaya tidak dianggap hitam)
        if (cs.backgroundImage !== 'none' && !cs.backgroundImage.startsWith('url')) {
            const matches = cs.backgroundImage.match(COLOR_RE) ?? [];
            for (const m of matches) {
                const rgba = toRGBA(m);
                if (!rgba) continue;
                const [r, g, b, a] = rgba;
                if (a > 0.5) return luminance(r, g, b) < 0.5 ? 'dark' : 'light';
            }
            // tidak ada warna solid di gradasi ini -> lanjut cek background-color / elemen di bawahnya
        }

        const rgba = toRGBA(cs.backgroundColor);
        if (rgba) {
            const [r, g, b, a] = rgba;
            if (a > 0.5) return luminance(r, g, b) < 0.5 ? 'dark' : 'light';
        }
    }
    return 'light';
}

/* ------------------------------------------------------------------ */
/*  NAVBAR                                                             */
/* ------------------------------------------------------------------ */

export interface NavbarProps {
    variant: 'web' | 'mobile';
}

export default function Navbar({ variant }: NavbarProps) {
    const isMobile = variant === 'mobile';
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [tone, setTone] = useState<Tone>('light');
    const headerRef = useRef<HTMLElement>(null);
    const rafRef = useRef<number | null>(null);

    // Header jadi "kaca" setelah di-scroll + deteksi warna di bawahnya.
    // Deteksi dijalankan ulang otomatis (bukan cuma saat scroll), supaya elemen sementara
    // seperti loading screen / animasi fade-in tidak membuat nada nyangkut salah di awal.
    useEffect(() => {
        const update = () => {
            rafRef.current = null;
            setScrolled(window.scrollY > 12);
            if (headerRef.current) {
                const next = detectTone(headerRef.current);
                setTone((prev) => (prev !== next ? next : prev));
            }
        };
        const schedule = () => {
            if (rafRef.current == null) rafRef.current = requestAnimationFrame(update);
        };

        schedule();

        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        window.addEventListener('load', schedule);
        window.addEventListener('pageshow', schedule);
        window.addEventListener('app:loaded', schedule);
        // animasi / transisi di halaman selesai -> cek ulang
        document.addEventListener('transitionend', schedule, true);
        document.addEventListener('animationend', schedule, true);

        // Jangan observe 'style' karena Framer Motion terus mengupdate inline style pada seluruh subtree!
        const mo = new MutationObserver(schedule);
        mo.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'hidden'],
        });

        // font selesai dimuat
        document.fonts?.ready.then(schedule).catch(() => { });

        // jaring pengaman: cek ulang rutin
        const interval = window.setInterval(schedule, 600);

        return () => {
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            window.removeEventListener('load', schedule);
            window.removeEventListener('pageshow', schedule);
            window.removeEventListener('app:loaded', schedule);
            document.removeEventListener('transitionend', schedule, true);
            document.removeEventListener('animationend', schedule, true);
            mo.disconnect();
            window.clearInterval(interval);
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    // Escape untuk tutup + kunci scroll body saat menu terbuka
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open]);

    const headerH = isMobile ? 'h-[64px]' : 'h-[90px]';
    const dark = tone === 'dark';

    const glass = scrolled
        ? dark
            ? 'border-b border-white/10 bg-black/20 shadow-[0_4px_30px_rgba(0,0,0,0.10)] backdrop-blur-md'
            : 'border-b border-black/5 bg-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.04)] backdrop-blur-md'
        : 'border-b border-transparent bg-transparent';

    return (
        <>
            {/* spacer: header fixed, jadi tinggi layout lama tetap terjaga */}
            <div aria-hidden="true" className={headerH} />

            {/* ---------------- HEADER ---------------- */}
            <header
                ref={headerRef}
                className={`${montserrat.className} fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-500 ${headerH} ${glass}`}
            >
                <div className="relative mx-auto flex h-full w-full max-w-360 items-center justify-between px-4 lg:px-21">
                    {/* kiri: MENU + garis tiga (warna ikut `currentColor`) */}
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        aria-label="Buka menu"
                        aria-expanded={open}
                        aria-controls="main-nav"
                        className={`group flex cursor-pointer items-center gap-4 transition-colors duration-300 ${dark ? 'text-white' : 'text-[#333333]'
                            }`}
                    >
                        <span className="text-[15px] font-bold tracking-[0.35em] lg:text-[18px]">MENU</span>
                        <span className="flex flex-col items-start gap-1.5">
                            <span className="block h-0.5 w-7.5 rounded-full bg-current" />
                            <span className="block h-0.5 w-5.5 rounded-full bg-current transition-[width] duration-300 group-hover:w-7.5" />
                            <span className="block h-0.5 w-3.5 rounded-full bg-current transition-[width] duration-300 group-hover:w-7.5" />
                        </span>
                    </button>

                    {/* tengah: logo */}
                    <Link
                        href="#"
                        onClick={(e) => handleNavClick(e, '#')}
                        aria-label="SiRuang, ke beranda"
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    >
                        <AdaptiveLogo dark={dark} height={isMobile ? 40 : 58} />
                    </Link>

                    {/* kanan: Masuk (di layar sempit cukup lewat menu) */}
                    <Link
                        href={LOGIN_HREF}
                        prefetch={true}
                        className={`hidden h-11.5 w-35 items-center justify-center rounded-[15px] text-[16px] font-semibold transition-[background-color,color,opacity] duration-300 hover:opacity-85 sm:flex lg:h-13 lg:w-42.5 lg:text-[18px] ${dark ? 'bg-white text-[#333333]' : 'bg-[#333333] text-white'
                            }`}
                    >
                        Masuk
                    </Link>
                </div>
            </header>

            {/* ---------------- DRAWER ---------------- */}
            <div
                className={`${montserrat.className} fixed inset-0 z-60 ${open ? 'pointer-events-auto' : 'pointer-events-none'
                    }`}
                aria-hidden={!open}
            >
                {/* overlay blur */}
                <div
                    onClick={() => setOpen(false)}
                    className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-500 ${open ? 'opacity-100' : 'opacity-0'
                        }`}
                />

                {/* panel kaca gelap */}
                <aside
                    id="main-nav"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menu navigasi"
                    className={`absolute left-0 top-0 flex h-full w-[min(440px,88vw)] flex-col border-r border-white/10 bg-[#222222]/70 px-8 py-7 text-white shadow-[0_0_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:px-12 ${open ? 'translate-x-0' : '-translate-x-full'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        {/* panel selalu gelap, jadi tulisan selalu putih */}
                        <AdaptiveLogo dark height={46} />
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            aria-label="Tutup menu"
                            tabIndex={open ? 0 : -1}
                            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                            </svg>
                        </button>
                    </div>

                    <nav className="mt-14 flex flex-col gap-7">
                        {NAV_LINKS.map((l, i) => (
                            <Link
                                key={l.label}
                                href={l.href}
                                tabIndex={open ? 0 : -1}
                                onClick={(e) => handleNavClick(e, l.href, () => setOpen(false))}
                                style={{ transitionDelay: open ? `${150 + i * 70}ms` : '0ms' }}
                                className={`flex items-start gap-4 text-[26px] font-semibold text-white/60 transition-all duration-500 hover:text-white ${open ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
                                    }`}
                            >
                                <span className="mt-1.5 w-5.5 text-[11px] font-medium text-white/40">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                {l.label}
                            </Link>
                        ))}
                    </nav>

                    <Link
                        href={LOGIN_HREF}
                        prefetch={true}
                        tabIndex={open ? 0 : -1}
                        className="mt-auto flex h-13 w-full items-center justify-center rounded-[15px] bg-white text-[18px] font-semibold text-[#333333] transition-opacity hover:opacity-90"
                    >
                        Masuk
                    </Link>
                </aside>
            </div>
        </>
    );
}