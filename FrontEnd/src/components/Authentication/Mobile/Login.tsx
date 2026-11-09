'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShieldCheck, Hash, Lock, RefreshCw, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoginProps {
  onNavigate: () => void;
  onLogin: (payload: any) => void;
  loading: boolean;
  captcha: { kode: number; pertanyaan: string; jawaban: string };
  onRefreshCaptcha: () => void;
}

const SLIDE_S = 0.7; // sama dengan duration-700 di AuthSlider web
const EASE = 'easeInOut' as const;
const AUTH_SWAP_KEY = 'auth-swap';
const RECOVER_MS = 3000; // kalau navigasi tidak unmount halaman ini, kembalikan kartu ke posisi awal

// Style token — sama dengan SignUp mobile
const inputCls =
  'w-full pl-14 pr-5 py-4 bg-white border border-slate-100 rounded-3xl text-[16px] font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-[border-color,box-shadow] shadow-sm';
const labelCls = 'text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1';
const iconCls =
  'absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors';

const readSwapFlag = () => {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(AUTH_SWAP_KEY) === '1';
  } catch {
    return false;
  }
};
const setSwapFlag = (on: boolean) => {
  try {
    if (on) sessionStorage.setItem(AUTH_SWAP_KEY, '1');
    else sessionStorage.removeItem(AUTH_SWAP_KEY);
  } catch {}
};

const MobileLogin = ({ onNavigate, onLogin, loading, captcha, onRefreshCaptcha }: LoginProps) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [userAnswer, setUserAnswer] = useState('');

  const [leaving, setLeaving] = useState(false);
  const [dist, setDist] = useState({ panel: 0, form: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const leavingRef = useRef(false);
  const navigatedRef = useRef(false);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // true jika halaman ini muncul setelah slide dari SignUp (panel sudah di posisi akhir = atas).
  // Hanya MEMBACA di sini; flag dihapus di useEffect (aman untuk Strict Mode).
  const [arrived] = useState(readSwapFlag);

  const isCaptchaSolved =
    userAnswer.trim() !== '' && captcha.jawaban !== '' && userAnswer.trim() === String(captcha.jawaban);

  const clearTimers = () => {
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    if (recoverTimer.current) clearTimeout(recoverTimer.current);
    fallbackTimer.current = null;
    recoverTimer.current = null;
  };

  const reset = useCallback(() => {
    clearTimers();
    navigatedRef.current = false;
    leavingRef.current = false;
    setSwapFlag(false);
    setLeaving(false);
  }, []);

  useEffect(() => {
    setSwapFlag(false);
    return clearTimers;
  }, []);

  // Back / swipe-back (bfcache) bisa mengembalikan halaman dalam state "leaving" -> reset
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) reset();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [reset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCaptchaSolved || loading || leavingRef.current) return;
    onLogin({ identifier: identifier.trim(), password });
  };

  // Pindah halaman dijalankan SEKALI, setelah animasi selesai
  const finish = useCallback(() => {
    if (navigatedRef.current || !leavingRef.current) return;
    navigatedRef.current = true;
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    onNavigate();
    // Kalau 3 detik kemudian komponen ini masih hidup (route lambat/gagal), jangan stuck
    recoverTimer.current = setTimeout(reset, RECOVER_MS);
  }, [onNavigate, reset]);

  // Panel hitam turun ke bawah, form naik ke atas (slider vertikal), lalu pindah ke SignUp
  const goToSignUp = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setDist({
      panel: formRef.current?.offsetHeight ?? 0,
      form: panelRef.current?.offsetHeight ?? 0,
    });
    setSwapFlag(true);
    setLeaving(true);
    // timer cadangan kalau onAnimationComplete tidak terpanggil
    fallbackTimer.current = setTimeout(finish, SLIDE_S * 1000 + 400);
  };

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-[#07111E] px-4 pb-8 pt-5 font-sans selection:bg-[#588CBC]/20 selection:text-[#183449]">
      {/* BACKGROUND */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/BackgroundLogSign.png')`,
          filter: 'brightness(0.6) contrast(1.15)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-slate-950/75" />
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 90% 0%, rgba(88,140,188,0.12), transparent 45%), radial-gradient(circle at 0% 100%, rgba(24,52,73,0.15), transparent 45%)',
        }}
      />

      {/* Tombol Kembali */}
      <Link
        href="/"
        className="relative z-30 mb-5 inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md transition-all active:scale-95"
      >
        <ArrowLeft size={16} />
        <span>Kembali ke Beranda</span>
      </Link>

      {/* CARD */}
      <div className="relative z-10 flex flex-1 flex-col justify-center">
        <motion.div
          initial={arrived ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-[40px] border border-white bg-white/90 shadow-[0_32px_80px_rgba(24,52,73,0.25)]"
        >
          {/* Batik */}
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-80"
            style={{ backgroundImage: `url('/Batik.png')` }}
          />

          {/* PANEL HITAM — posisi awal: ATAS. Saat slide: turun ke bawah */}
          <motion.div
            ref={panelRef}
            initial={false}
            animate={
              leaving
                ? {
                    y: dist.panel,
                    borderTopLeftRadius: 40,
                    borderTopRightRadius: 40,
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                  }
                : {
                    y: 0,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    borderBottomLeftRadius: 40,
                    borderBottomRightRadius: 40,
                  }
            }
            transition={{ duration: SLIDE_S, ease: EASE }}
            onAnimationComplete={finish}
            className="relative z-20 flex flex-col items-center overflow-hidden px-6 py-6 text-center will-change-transform"
            style={{ background: '#000000' }}
          >
            <div className="pointer-events-none absolute left-0 top-0 -ml-20 -mt-20 h-60 w-60 rounded-full bg-[#588CBC]/15 blur-[80px]" />
            <div className="pointer-events-none absolute bottom-0 right-0 -mb-16 -mr-12 h-48 w-48 rounded-full bg-[#0d1d2a]/50 blur-[70px]" />

            <div className="relative z-10 drop-shadow-2xl">
              <Image
                src="/LogoSiRuang.png"
                alt="Logo SiRuang"
                width={200}
                height={200}
                priority
                className="h-32 w-32 object-contain drop-shadow-2xl"
              />
            </div>

            <motion.div
              initial={arrived ? { opacity: 0 } : false}
              animate={{ opacity: leaving ? 0 : 1 }}
              transition={
                leaving
                  ? { duration: 0.25, delay: SLIDE_S * 0.6 }
                  : { duration: 0.3, delay: arrived ? 0.05 : 0 }
              }
              className="relative z-10 -mt-1 flex flex-col items-center gap-2.5"
            >
              <p className="text-xs font-semibold tracking-wider text-slate-300">Belum memiliki akun?</p>
              <button
                type="button"
                onClick={goToSignUp}
                disabled={leaving}
                className="group flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-black/20 backdrop-blur-md transition-[background-color,transform] active:scale-[0.97]"
              >
                <span>Daftar Sekarang</span>
                <ArrowRight size={16} className="text-white/70 transition-transform group-active:translate-x-1" />
              </button>
            </motion.div>
          </motion.div>

          {/* FORM — posisi awal: bawah. Saat slide: naik ke atas */}
          <motion.div
            ref={formRef}
            initial={arrived ? { opacity: 0 } : false}
            animate={leaving ? { y: -dist.form, opacity: 0 } : { y: 0, opacity: 1 }}
            transition={
              leaving
                ? { y: { duration: SLIDE_S, ease: EASE }, opacity: { duration: 0.3, delay: SLIDE_S * 0.45 } }
                : { duration: 0.35, delay: arrived ? 0.05 : 0 }
            }
            aria-hidden={leaving}
            className={cn(
              'relative z-10 flex min-h-[640px] flex-col justify-center px-6 py-7 will-change-transform',
              leaving && 'pointer-events-none'
            )}
          >
            <div className="mb-6">
              <h2 className="text-3xl font-black tracking-tight text-slate-800">Selamat Datang</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Masuk menggunakan NIM atau NIP Anda.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* NIM / NIP */}
              <div className="space-y-2">
                <label className={labelCls}>NIM / NIP</label>
                <div className="group relative">
                  <Hash className={iconCls} size={20} />
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Masukkan NIM atau NIP"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kata Sandi</label>
                  <button
                    type="button"
                    className="text-[10px] font-black uppercase tracking-widest text-[#588CBC] active:opacity-70"
                  >
                    Lupa Password?
                  </button>
                </div>
                <div className="group relative">
                  <Lock className={iconCls} size={20} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* CAPTCHA */}
              <div className="relative overflow-hidden rounded-3xl border border-[#B3B3B3] bg-linear-to-br from-slate-50 to-[#588CBC]/10 p-4 shadow-lg shadow-slate-200/50">
                <div className="pointer-events-none absolute right-0 top-0 -mr-12 -mt-12 h-24 w-24 rounded-full bg-white/40 blur-2xl" />

                <div className="relative z-10 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm">
                      <ShieldCheck size={16} className="text-[#588CBC]" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#183449]/70">
                      Security Check
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onRefreshCaptcha();
                      setUserAnswer('');
                    }}
                    className="flex items-center gap-1.5 rounded-full border border-[#B3B3B3] bg-white/60 px-3 py-1.5 text-[#588CBC] shadow-sm transition-all active:scale-95"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">Refresh</span>
                    <RefreshCw size={13} />
                  </button>
                </div>

                <div className="relative z-10 flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Verify Calculation:
                    </p>
                    <div className="flex items-center gap-2 whitespace-nowrap text-2xl font-black tracking-tight text-[#183449]">
                      <span className="shrink-0">{captcha.pertanyaan || '...'}</span>
                      <span className="text-[#588CBC]">=</span>
                      <span className="animate-pulse text-[#588CBC]">?</span>
                    </div>
                  </div>
                  <div className="w-28 shrink-0">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Hasil"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      className={cn(
                        'w-full rounded-2xl px-4 py-3.5 text-center text-[16px] font-black transition-all focus:outline-none',
                        isCaptchaSolved
                          ? 'bg-[#588CBC] text-white shadow-lg shadow-[#588CBC]/30'
                          : 'border border-[#B3B3B3] bg-white text-[#183449] placeholder:text-slate-300 focus:border-[#588CBC]'
                      )}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!isCaptchaSolved || loading || leaving}
                className={cn(
                  'group mt-2 flex w-full items-center justify-center gap-2 rounded-3xl py-4 text-sm font-black tracking-widest transition-transform active:scale-[0.98]',
                  isCaptchaSolved && !loading
                    ? 'bg-linear-to-br from-[#183449] to-[#2B5474] text-white shadow-xl shadow-[#183449]/20'
                    : 'cursor-not-allowed bg-slate-100 text-slate-400 shadow-none'
                )}
              >
                {loading ? (
                  <RefreshCw className="animate-spin" size={20} />
                ) : (
                  <>
                    <span>MASUK KE SISTEM</span>
                    <ArrowRight size={18} className="opacity-50 transition-transform group-active:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default MobileLogin;