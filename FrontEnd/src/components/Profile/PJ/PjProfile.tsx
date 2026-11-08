'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Users,
  CalendarCheck,
  Mail,
  Phone,
  Hash,
} from 'lucide-react';

export interface PjProfileProps {
  pjName?: string;
  pjNim?: string;
  onBack?: () => void;
}

export const PjProfile: React.FC<PjProfileProps> = ({
  pjName = 'PJ Kelas UNJ',
  pjNim = '1313620025',
  onBack,
}) => {
  const [name, setName] = useState(pjName);
  const [nim, setNim] = useState(pjNim);
  const [kelas, setKelas] = useState('Ilkom A 2023');
  const [email, setEmail] = useState('pj.ilkom@mhs.unj.ac.id');
  const [phone, setPhone] = useState('081298765432');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex-1 min-w-0 flex flex-col overflow-y-auto bg-[#F8FAFB]"
      style={{
        backgroundImage: `url('/Batik.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* HEADER */}
      <header className="px-8 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 z-10 shrink-0 sticky top-0">
        <div className="w-full max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all text-xs font-bold shadow-sm cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Kembali ke Dashboard</span>
              </button>
            )}
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <h1 className="text-base font-black text-slate-800 tracking-tight">
              Profil PJ Kelas
            </h1>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 text-[11px] font-bold">
            Penanggung Jawab Kelas
          </span>
        </div>
      </header>

      {/* BODY CONTENT */}
      <div className="w-full max-w-[1400px] mx-auto p-6 md:p-8 space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#183449] to-[#3B4D5D] p-6 md:p-8 text-white shadow-xl shadow-[#183449]/15">
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 rounded-3xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-white">
              <User size={46} className="text-white/80" />
            </div>
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <h2 className="text-2xl font-black tracking-tight">{name}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black uppercase tracking-wider">
                  PJ Kelas
                </span>
              </div>
              <p className="text-xs text-slate-200">
                NIM: <span className="font-bold text-white">{nim}</span> · Delegasi Kelas: <span className="font-bold text-amber-300">{kelas}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Form Biodata PJ */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-5">
          <h3 className="text-base font-black text-slate-800 tracking-tight border-b border-slate-100 pb-4">
            Informasi Delegasi Kelas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Nama Lengkap</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">NIM</label>
              <input type="text" value={nim} onChange={(e) => setNim(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Kelas / Angkatan</label>
              <input type="text" value={kelas} onChange={(e) => setKelas(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Email Kontak</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PjProfile;

