'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { montserrat } from '@/lib/fonts';

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
/*  DETEKSI WARNA BACKGROUND DI BAWAH HEADER (IntersectionObserver)   */
/* ------------------------------------------------------------------ */

type Tone = 'light' | 'dark'; // light = background terang (teks gelap), dark = background gelap (teks putih)

/**
 * Hook: mengamati semua elemen [data-nav-tone] dengan IntersectionObserver.
 * rootMargin memotong area observasi menjadi hanya garis tengah navbar
 * (misalnya: -45px dari atas, sisanya dikurangi dari bawah).
 * Ketika section masuk ke garis itu → tone berubah.
 *
 * Prioritas: elemen yang lebih akhir di DOM (lebih bawah di halaman) menang
 * saat ada overlap, karena secara visual dia yang paling "menutupi" navbar.
 */
function useNavbarTone(headerH: number): Tone {
    const [tone, setTone] = React.useState<Tone>('light');

    React.useEffect(() => {
        // rootMargin: potong viewport sehingga IntersectionObserver hanya "melihat"
        // 1 baris piksel tepat di garis tengah navbar (y = centerY dari atas viewport).
        // rootMargin tidak bisa pakai calc(), jadi kita hitung ulang setiap kali vh berubah.
        const centerY = Math.round(headerH / 2);

        // Map: element → tone-nya. Dipakai untuk hitung winner.
        const intersecting = new Map<Element, Tone>();
        // Urutan semua tone-elements di DOM (stabil).
        let orderedEls: Element[] = [];
        let observer: IntersectionObserver | null = null;

        const recalc = () => {
            // Pilih elemen intersecting yang paling akhir dalam DOM order
            // (paling bawah di halaman = paling "di atas" secara visual di titik scroll itu).
            let winner: Tone = 'light';
            for (const el of orderedEls) {
                if (intersecting.has(el)) {
                    winner = intersecting.get(el)!;
                    // Tidak break — biarkan loop terus supaya elemen TERAKHIR yang menang.
                }
            }
            setTone((prev) => (prev !== winner ? winner : prev));
        };

        const buildObserver = () => {
            if (observer) observer.disconnect();
            intersecting.clear();

            // rootMargin harus pixel (tidak boleh calc di IntersectionObserver).
            // Hitung bottomMargin dari window.innerHeight saat ini.
            const vh = window.innerHeight;
            const topMargin = `-${centerY}px`;
            const bottomMargin = `-${Math.max(0, vh - centerY - 1)}px`;

            observer = new IntersectionObserver(
                (entries) => {
                    for (const entry of entries) {
                        const attr = (entry.target as HTMLElement).getAttribute('data-nav-tone');
                        const t: Tone = attr === 'dark' ? 'dark' : 'light';
                        if (entry.isIntersecting) {
                            intersecting.set(entry.target, t);
                        } else {
                            intersecting.delete(entry.target);
                        }
                    }
                    recalc();
                },
                {
                    root: null, // viewport
                    rootMargin: `${topMargin} 0px ${bottomMargin} 0px`,
                    threshold: 0,
                }
            );

            for (const el of orderedEls) {
                observer.observe(el);
            }
            recalc();
        };

        const observe = () => {
            const els = Array.from(document.querySelectorAll<HTMLElement>('[data-nav-tone]'));
            orderedEls = els;
            buildObserver();
        };

        // Observe pertama kali
        observe();

        // Re-observe kalau DOM berubah (misal lazy-load section baru muncul)
        const mo = new MutationObserver(() => observe());
        mo.observe(document.body, { childList: true, subtree: true });

        // Rebuild observer saat ukuran window berubah (vh berubah → bottomMargin perlu diupdate)
        const onResize = () => buildObserver();
        window.addEventListener('resize', onResize, { passive: true });

        return () => {
            observer?.disconnect();
            mo.disconnect();
            window.removeEventListener('resize', onResize);
        };
    }, [headerH]);

    return tone;
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

    // Tinggi header dalam px (konstan sesuai variant)
    const headerPx = isMobile ? 70 : 100;

    // Deteksi tone via IntersectionObserver — jauh lebih reliable dari BoundingRect/scroll-RAF
    const tone = useNavbarTone(headerPx);

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

    const headerH = isMobile ? 'h-[70px]' : 'h-[100px]';
    const dark = tone === 'dark';

    return (
        <>
            {/* spacer: header fixed, jadi tinggi layout lama tetap terjaga */}
            <div aria-hidden="true" className={headerH} />

            {/* ---------------- HEADER ---------------- */}
            <header
                className={`${montserrat.className} fixed inset-x-0 top-0 z-50 flex items-center justify-center pointer-events-none transition-all duration-300 ${
                    isMobile ? 'h-[70px] px-3' : 'h-[100px] px-4 sm:px-6 lg:px-12'
                }`}
            >
                {/* Kotak Kontainer Kaca Semi-Transparan (Glassmorphism Capsule) */}
                <div
                    className={`pointer-events-auto relative mx-auto flex w-full max-w-360 items-center justify-between transition-all duration-300 backdrop-blur-xl border ${
                        isMobile
                            ? 'h-[52px] px-5 rounded-2xl'
                            : 'h-[72px] lg:h-[78px] px-8 lg:px-16 rounded-2xl lg:rounded-3xl'
                    } ${
                        dark
                            ? 'bg-[#181818]/40 border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)]'
                            : 'bg-white/45 border-slate-300/70 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(255,255,255,0.8)]'
                    }`}
                >
                    {/* kiri: MENU + garis tiga (warna ikut `currentColor`) */}
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        aria-label="Buka menu"
                        aria-expanded={open}
                        aria-controls="main-nav"
                        className={`group flex cursor-pointer items-center gap-3 sm:gap-4 transition-colors duration-300 ${dark ? 'text-white' : 'text-[#1C1C1C]'
                            }`}
                    >
                        <span className="text-[14px] font-bold tracking-[0.35em] lg:text-[17px]">MENU</span>
                        <span className="flex flex-col items-start gap-1 sm:gap-1.5">
                            <span className="block h-0.5 w-6 sm:w-7.5 rounded-full bg-current" />
                            <span className="block h-0.5 w-4.5 sm:w-5.5 rounded-full bg-current transition-[width] duration-300 group-hover:w-6 sm:group-hover:w-7.5" />
                            <span className="block h-0.5 w-3 sm:w-3.5 rounded-full bg-current transition-[width] duration-300 group-hover:w-6 sm:group-hover:w-7.5" />
                        </span>
                    </button>

                    {/* tengah: logo */}
                    <Link
                        href="#"
                        onClick={(e) => handleNavClick(e, '#')}
                        aria-label="SiRuang, ke beranda"
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                    >
                        <AdaptiveLogo dark={dark} height={isMobile ? 34 : 46} />
                    </Link>

                    {/* kanan: Masuk (di layar sempit cukup lewat menu) */}
                    <Link
                        href={LOGIN_HREF}
                        prefetch={true}
                        className={`hidden h-10 w-28 items-center justify-center rounded-xl text-[14px] font-semibold transition-[background-color,color,opacity,transform] duration-300 hover:opacity-85 active:scale-95 sm:flex lg:h-11.5 lg:w-36 lg:rounded-[14px] lg:text-[16px] ${dark ? 'bg-white text-[#1C1C1C]' : 'bg-[#1C1C1C] text-white'
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
                        className="mt-auto flex h-13 w-full items-center justify-center rounded-[15px] bg-white text-[18px] font-semibold text-[#1C1C1C] transition-opacity hover:opacity-90"
                    >
                        Masuk
                    </Link>
                </aside>
            </div>
        </>
    );
}