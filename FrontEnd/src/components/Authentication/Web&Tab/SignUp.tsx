'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, ArrowRight } from 'lucide-react';
import Logo from '@/components/Shared/Logo';

interface SignUpProps {
  onNavigate: () => void;
  onSignUp: (payload: any) => void;
  loading: boolean;
}

const WebSignUp = ({ onNavigate, onSignUp, loading }: SignUpProps) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    onSignUp({ username, gmail: email, password, role: 'user' });
  };

  return (
    <div className="min-h-screen bg-[#07111E] flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-[#588CBC]/20 selection:text-[#183449]">
      {/* FULL BACKGROUND IMAGE */}
      <div
        className="absolute inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/BackgroundLogSign.png')`,
          filter: 'brightness(0.6) contrast(1.15)',
        }}
      />

      {/* Dark Overlay Layer - Clean Deep Dark */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-slate-950/75" />

      {/* SOPHISTICATED BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-150 h-150 bg-[#588CBC]/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-150 h-150 bg-[#183449]/10 rounded-full blur-[150px]" />
      </div>

      <div className="w-full max-w-5xl flex bg-white/60 backdrop-blur-3xl rounded-[48px] shadow-[0_32px_80px_rgba(24,52,73,0.12)] border border-white relative z-10 overflow-hidden">


        {/* LEFT PANEL - DARK NAVY BRANDING */}
        <div
          className="hidden lg:flex flex-1 bg-linear-to-br from-[#07111E] to-[#0F2238] p-16 flex-col justify-center items-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0F2238 0%, #07111E 100%)' }}
        >
          {/* Decorative Circles - Soft blue glow */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#588CBC]/15 rounded-full blur-[100px] -ml-32 -mt-32 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#0d1d2a]/50 rounded-full blur-[90px] -mr-20 -mb-20 pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 flex flex-col items-center text-center"
          >
            <div className="-mt-8 lg:-mt-12 drop-shadow-2xl">
              <Logo onlyLogo width={340} height={340} className="w-64 h-64 lg:w-80 lg:h-80 object-contain drop-shadow-2xl" />
            </div>

            <div className="-mt-4 lg:-mt-6 flex flex-col items-center gap-3">
              <p className="text-xs font-semibold text-slate-300 tracking-wider">
                Sudah memiliki akun?
              </p>
              <button
                type="button"
                onClick={onNavigate}
                className="px-8 py-3.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white font-black text-xs tracking-widest uppercase transition-all backdrop-blur-md shadow-lg shadow-black/20 hover:scale-[1.03] active:scale-[0.98] flex items-center gap-2 cursor-pointer group"
              >
                <span>Masuk ke Akun</span>
                <ArrowRight size={16} className="text-white/70 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* RIGHT PANEL - SIGNUP FORM WITH SUBTLE BATIK WATERMARK */}
        <div className="flex-[0.8] p-12 lg:p-20 flex flex-col justify-center bg-slate-50/60 relative overflow-hidden">
          {/* Subtle Batik Watermark Background */}
          <div
            className="absolute inset-0 z-0 pointer-events-none opacity-80"
            style={{
              backgroundImage: `url('/Batik.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto w-full relative z-10"
          >
            <div className="mb-10">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Buat Akun Baru</h2>
              <p className="text-slate-500 font-medium mt-2">Daftar sebagai pengguna untuk mengakses layanan.</p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={20} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="syafikh_unj"
                    className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={20} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="syafikh@gmail.com"
                    className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kata Sandi</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={20} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-linear-to-br from-[#07111E] to-[#0F2238] text-white py-4.5 rounded-3xl font-black text-sm shadow-xl shadow-[#183449]/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                <span>{loading ? 'MEMPROSES...' : 'DAFTAR SEKARANG'}</span>
                {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default WebSignUp;
