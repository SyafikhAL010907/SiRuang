'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function MainGedungLS() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Tombol Kembali ke Beranda */}
      <div className="w-full max-w-4xl mb-6 flex items-center justify-start">
        <Link
          href="/"
          prefetch={true}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:text-[#183449] hover:border-[#588CBC]/40 hover:shadow-xs transition-all"
        >
          <ArrowLeft size={16} />
          Kembali ke Beranda
        </Link>
      </div>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
          Denah Visual Gedung LS
        </h1>
        <p className="text-gray-500 text-base">
          Silakan pilih lantai untuk melihat denah visual
        </p>
      </div>

      {/* Grid 2 Kolom untuk 4 Kotak */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        
        {/* Kotak Lantai 1 */}
        <Link
          href="/denah-ls/lantai1"
          prefetch={true}
          className="cursor-pointer bg-white border-2 border-slate-100 hover:border-[#588CBC] rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group h-64"
        >
          <div className="w-full h-36 mb-4 bg-[#588CBC]/5 rounded-xl flex items-center justify-center relative overflow-hidden">
            <img 
              src="/Lantai3.png" 
              alt="Preview Denah Lantai 1" 
              className="w-full h-full object-contain p-2"
              loading="lazy"
            />
          </div>
          <div className="flex flex-col items-center text-center">
            <h2 className="text-xl font-bold text-gray-800 group-hover:text-[#183449] transition-colors">Lantai 1</h2>
            <p className="text-sm text-gray-500 mt-1">Buka denah Lantai 1</p>
          </div>
        </Link>

        {/* Kotak Lantai 2 */}
        <Link
          href="/denah-ls/lantai2"
          prefetch={true}
          className="cursor-pointer bg-white border-2 border-teal-100 hover:border-teal-500 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group h-64"
        >
          <div className="w-full h-36 mb-4 bg-teal-50/50 rounded-xl flex items-center justify-center relative overflow-hidden">
            <img 
              src="/Lantai3.png" 
              alt="Preview Denah Lantai 2" 
              className="w-full h-full object-contain p-2"
              loading="lazy"
            />
          </div>
          <div className="flex flex-col items-center text-center">
            <h2 className="text-xl font-bold text-gray-800 group-hover:text-teal-600 transition-colors">Lantai 2</h2>
            <p className="text-sm text-gray-500 mt-1">Buka denah Lantai 2</p>
          </div>
        </Link>

        {/* Kotak Lantai 3 */}
        <Link
          href="/denah-ls/lantai3"
          prefetch={true}
          className="cursor-pointer bg-white border-2 border-cyan-100 hover:border-cyan-500 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group h-64"
        >
          <div className="w-full h-36 mb-4 bg-cyan-50/50 rounded-xl flex items-center justify-center relative overflow-hidden">
            <img 
              src="/Lantai3.png" 
              alt="Preview Denah Lantai 3" 
              className="w-full h-full object-contain p-2"
              loading="lazy"
            />
          </div>
          <div className="flex flex-col items-center text-center">
            <h2 className="text-xl font-bold text-gray-800 group-hover:text-cyan-600 transition-colors">Lantai 3</h2>
            <p className="text-sm text-gray-500 mt-1">Buka denah Lantai 3</p>
          </div>
        </Link>

        {/* Kotak Lantai 4 */}
        <Link
          href="/denah-ls/lantai4"
          prefetch={true}
          className="cursor-pointer bg-white border-2 border-blue-100 hover:border-blue-500 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group h-64"
        >
          <div className="w-full h-36 mb-4 bg-blue-50/50 rounded-xl flex items-center justify-center relative overflow-hidden">
            <img 
              src="/Lantai3.png" 
              alt="Preview Denah Lantai 4" 
              className="w-full h-full object-contain p-2"
              loading="lazy"
            />
          </div>
          <div className="flex flex-col items-center text-center">
            <h2 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">Lantai 4</h2>
            <p className="text-sm text-gray-500 mt-1">Buka denah Lantai 4</p>
          </div>
        </Link>

      </div>
    </div>
  );
}