'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/Shared/Logo';
import { ShieldCheck, Mail, Lock, RefreshCw, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoginProps {
  onNavigate: () => void;
  onLogin: (payload: any) => void;
  loading: boolean;
  captcha: { kode: number, pertanyaan: string, jawaban: string };
  onRefreshCaptcha: () => void;
}

const WebLogin = ({ onNavigate, onLogin, loading, captcha, onRefreshCaptcha }: LoginProps) => {
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


        {/* LEFT PANEL - LOGIN FORM WITH SUBTLE BATIK WATERMARK */}
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
            <div className="mb-12">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Selamat Datang</h2>
              <p className="text-slate-500 font-medium mt-2">Masuk ke akun admin Anda untuk melanjutkan.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Komersial</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={20} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@unj.ac.id"
                    className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kata Sandi</label>
                  <button type="button" className="text-[10px] text-[#588CBC] font-black uppercase tracking-widest hover:underline">Lupa Password?</button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={20} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* NAVY & LIGHT BLUE CAPTCHA */}
              <div className="pt-4">
                <div className="p-6 bg-linear-to-br from-slate-50 to-[#588CBC]/10 border border-[#B3B3B3] rounded-4xl shadow-xl shadow-slate-200/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-3xl -mr-16 -mt-16" />

                  <div className="flex items-center justify-between mb-5 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <ShieldCheck size={16} className="text-[#588CBC]" />
                      </div>
                      <span className="text-[10px] font-black text-[#183449]/70 uppercase tracking-[0.2em]">Security Verification</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onRefreshCaptcha();
                        setUserAnswer('');
                      }}
                      className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/50 hover:bg-[#588CBC] hover:text-white transition-all text-[#588CBC] shadow-sm border border-[#B3B3B3]"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">Refresh</span>
                      <motion.div
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.5 }}
                      >
                        <RefreshCw size={14} />
                      </motion.div>
                    </button>
                  </div>

                  <div className="flex items-center gap-6 relative z-10">
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Verify Calculation:</p>
                      <div className="text-3xl font-black text-[#183449] tracking-tight flex items-center gap-3 whitespace-nowrap">
                        <span className="shrink-0">{captcha.pertanyaan || '...'}</span>
                        <span className="text-[#588CBC]">=</span>
                        <span className="text-[#588CBC] animate-pulse">?</span>
                      </div>
                    </div>
                    <div className="w-32 shrink-0">
                      <input
                        type="text"
                        placeholder="Hasil"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        className={cn(
                          "w-full px-5 py-4 rounded-2xl text-center text-lg font-black focus:outline-none transition-all",
                          isCaptchaSolved
                            ? "bg-[#588CBC] text-white shadow-lg shadow-[#588CBC]/30"
                            : "bg-white border border-[#B3B3B3] text-[#183449] placeholder:text-slate-300 focus:border-[#588CBC]"
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={!isCaptchaSolved || loading}
                className={cn(
                  "w-full py-5 rounded-3xl font-black text-sm shadow-xl transition-all mt-6 flex items-center justify-center gap-3 tracking-widest",
                  isCaptchaSolved && !loading
                    ? "bg-linear-to-br from-[#183449] to-[#2B5474] hover:from-[#204561] hover:to-[#588CBC] text-white shadow-xl shadow-[#183449]/20"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                )}
              >
                {loading ? (
                  <RefreshCw className="animate-spin" size={20} />
                ) : (
                  <>
                    MASUK KE DASHBOARD
                    <ArrowRight size={20} className="opacity-50" />
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>

        {/* RIGHT PANEL - LIGHT BLUE/GREYISH TO DARK NAVY BRANDING */}
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
                Belum memiliki akun?
              </p>
              <button
                type="button"
                onClick={onNavigate}
                className="px-8 py-3.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white font-black text-xs tracking-widest uppercase transition-all backdrop-blur-md shadow-lg shadow-black/20 hover:scale-[1.03] active:scale-[0.98] flex items-center gap-2 cursor-pointer group"
              >
                <span>Daftar Sekarang</span>
                <ArrowRight size={16} className="text-white/70 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default WebLogin;
