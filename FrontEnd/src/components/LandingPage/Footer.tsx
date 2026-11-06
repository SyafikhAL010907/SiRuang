'use client';

import React from 'react';
import Link from 'next/link';
import { Plus_Jakarta_Sans, Fasthand } from 'next/font/google';
import { NAV_LINKS, handleNavClick } from './Navbar';

const jakarta = Plus_Jakarta_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700', '800'],
});
const fasthand = Fasthand({ subsets: ['latin'], weight: '400' });

const CONTACT = {
    email: 'siruang@unj.ac.id',
    phone: '+62 812 3456 7890',
    website: 'siruang.unj.ac.id',
};

export interface FooterProps {
    variant?: 'web' | 'mobile';
}

export default function Footer({ variant }: FooterProps) {
    return (
        <footer className={`${jakarta.className} bg-[#333333] text-white pt-20 pb-16 px-6 md:px-12 lg:px-24 w-full`}>
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start gap-12 lg:gap-8">
                {/* Left: Brand/Heading */}
                <div className="w-full lg:w-5/12">
                    <div className="text-[2rem] font-bold uppercase leading-[1.3] sm:text-[2.5rem] lg:text-[3.25rem]">
                        <p className="flex items-baseline gap-[0.3em] whitespace-nowrap">
                            Mengenal
                            <span className={`${fasthand.className} text-[1.1em] font-normal normal-case`}>
                                SiRuang
                            </span>
                        </p>
                        {/* "LEBIH" menjorok ke kanan sesuai desain */}
                        <p className="ml-[0.7em]">Lebih</p>
                        <p>Dekat</p>
                    </div>
                </div>

                {/* Middle: Navigation Links */}
                <div className="w-full lg:w-3/12 space-y-4">
                    {NAV_LINKS.map((l, i) => (
                        <Link
                            key={l.label}
                            href={l.href}
                            onClick={(e) => handleNavClick(e, l.href)}
                            className="flex items-center gap-4 text-white/80 hover:text-white transition-colors"
                        >
                            <span className="text-gray-400 text-sm font-medium">{String(i + 1).padStart(2, '0')}</span>
                            <span className="font-semibold text-[13px] tracking-[0.15em] uppercase">{l.label}</span>
                        </Link>
                    ))}
                </div>

                {/* Right: Contact & URL */}
                <div className="w-full lg:w-3/12 space-y-3 font-medium text-[15px] text-gray-200">
                    <a href={`mailto:${CONTACT.email}`} className="block hover:text-white transition-colors">
                        {CONTACT.email}
                    </a>
                    <a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`} className="block hover:text-white transition-colors">
                        {CONTACT.phone}
                    </a>

                    <hr className="border-gray-500 my-6 w-full opacity-60" />

                    <a
                        href={`https://${CONTACT.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:text-white transition-colors"
                    >
                        {CONTACT.website}
                    </a>
                </div>
            </div>
        </footer>
    );
}
