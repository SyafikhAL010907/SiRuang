'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Logo from '@/components/Shared/Logo';
import { ShieldCheck, Mail, Lock, RefreshCw, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoginProps {
  onNavigate: () => void;
  onLogin: (payload: any) => void;
  loading: boolean;
  captcha: { kode: number, pertanyaan: string, jawaban: string };
  onRefreshCaptcha: () => void;
}

const MobileLogin = ({ onNavigate, onLogin, loading, captcha, onRefreshCaptcha }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userAnswer, setUserAnswer] = useState('');

  const isCaptchaSolved = userAnswer === captcha.jawaban;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCaptchaSolved) return;
    onLogin({ gmail: email, password });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden font-sans selection:bg-[#588CBC]/20 selection:text-[#183449]">
      {/* NAVY & LIGHT BLUE GRADIENT BACKGROUND */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-linear-to-b from-[#588CBC]/15 via-[#183449]/5 to-transparent z-0" />
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-[#588CBC]/15 rounded-full blur-3xl z-0" />
      <div className="absolute bottom-[10%] left-[-10%] w-64 h-64 bg-[#183449]/10 rounded-full blur-3xl z-0" />

      <div className="flex-1 flex flex-col relative z-10 px-8 pt-10 pb-8">
        {/* HEADER SECTION */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="w-24 h-24 bg-white rounded-[28px] shadow-xl shadow-slate-200/50 flex items-center justify-center border border-[#B3B3B3] mb-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-slate-50 to-white opacity-50" />
            <div className="relative z-10 p-2">
              <Logo onlyLogo width={80} height={80} className="w-20 h-20 object-contain" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Masuk Akun</h2>
          <p className="text-[10px] font-black text-[#183449] mt-2 uppercase tracking-[0.2em] bg-[#588CBC]/10 px-3 py-1 rounded-full">SiRuang</p>
        </motion.div>

        {/* LOGIN FORM */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                <button type="button" className="text-[9px] font-black text-[#588CBC] uppercase tracking-widest hover:underline transition-all">Lupa?</button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                />
              </div>
            </div>

            {/* NAVY & LIGHT BLUE CAPTCHA */}
            <div className="bg-linear-to-br from-[#183449] to-[#2B5474] rounded-4xl p-5 shadow-xl shadow-[#183449]/20 relative overflow-hidden">
              {/* Decorative Shine */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#588CBC]/15 rounded-full blur-2xl -mr-16 -mt-16" />

              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2 text-white">
                  <ShieldCheck size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Keamanan Sistem</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onRefreshCaptcha();
                    setUserAnswer('');
                  }}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all"
                >
                  <span className="text-[9px] font-black text-white uppercase tracking-widest">Refresh</span>
                  <motion.div
                    whileTap={{ rotate: 180 }}
                    transition={{ duration: 0.3 }}
                  >
                    <RefreshCw size={12} className="text-white" />
                  </motion.div>
                </button>
              </div>

              <div className="flex items-center gap-4 relative z-10">
                <div className="flex-1 whitespace-nowrap">
                  <div className="text-xl font-black text-white flex items-center gap-2">
                    <span className="shrink-0">{captcha.pertanyaan || '0 + 0'}</span>
                    <span className="opacity-60">=</span>
                    <span className="opacity-80 animate-pulse">?</span>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Hasil"
                  inputMode="numeric"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className={cn(
                    "w-20 px-3 py-3 rounded-xl text-center text-sm font-black focus:outline-none transition-all",
                    isCaptchaSolved
                      ? "bg-white text-[#183449] shadow-lg"
                      : "bg-white/20 border border-white/30 text-white placeholder:text-white/50 focus:bg-white/30"
                  )}
                />
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={!isCaptchaSolved || loading}
              className={cn(
                "w-full py-5 rounded-2xl font-black text-sm transition-all mt-4 flex items-center justify-center gap-3 tracking-widest",
                isCaptchaSolved && !loading
                  ? "bg-linear-to-br from-[#183449] to-[#2B5474] active:from-[#204561] active:to-[#588CBC] text-white shadow-xl shadow-[#183449]/20"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
              )}
            >
              {loading ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : (
                <>
                  MASUK SEKARANG
                  <ArrowRight size={18} className="opacity-40" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* FOOTER */}
        <div className="mt-auto pt-8 text-center relative z-10">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Belum punya akun?{' '}
            <button onClick={onNavigate} className="text-[#588CBC] font-black hover:underline">
              Daftar
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileLogin;
