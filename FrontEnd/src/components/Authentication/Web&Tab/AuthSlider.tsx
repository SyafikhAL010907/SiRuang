'use client';

import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, RefreshCw, ArrowRight, User } from 'lucide-react';
import Logo from '@/components/Shared/Logo';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

type Mode = 'login' | 'signup';

interface Captcha {
    kode: number;
    pertanyaan: string;
    jawaban: string;
}

export interface AuthSliderProps {
    mode: Mode;
    onModeChange: (mode: Mode) => void;
    onLogin: (payload: any) => void;
    onRegister: (payload: any) => void;
    loading: boolean;
    captcha: Captcha;
    onRefreshCaptcha: () => void;
}

// transition-colors / box-shadow saja (bukan transition-all) biar ringan
const inputCls =
    'w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-[border-color,box-shadow] shadow-sm';
const labelCls = 'text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1';
const iconCls =
    'absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors';

/* ------------------------------------------------------------------ */
/*  FORMS (di luar komponen utama supaya tidak ke-remount)             */
/* ------------------------------------------------------------------ */

function LoginForm({
    onLogin,
    loading,
    captcha,
    onRefreshCaptcha,
}: Pick<AuthSliderProps, 'onLogin' | 'loading' | 'captcha' | 'onRefreshCaptcha'>) {
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
        <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
                <h2 className="text-3xl font-black tracking-tight text-slate-800">Selamat Datang</h2>
                <p className="mt-2 font-medium text-slate-500">Masuk ke akun admin Anda untuk melanjutkan.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <label className={labelCls}>Email Komersial</label>
                    <div className="group relative">
                        <Mail className={iconCls} size={20} />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@unj.ac.id"
                            className={inputCls}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kata Sandi</label>
                        <button type="button" className="text-[10px] font-black uppercase tracking-widest text-[#588CBC] hover:underline">
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
                <div className="pt-2">
                    <div className="relative overflow-hidden rounded-4xl border border-[#B3B3B3] bg-linear-to-br from-slate-50 to-[#588CBC]/10 p-5 shadow-lg shadow-slate-200/50">
                        <div className="relative z-10 mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm">
                                    <ShieldCheck size={16} className="text-[#588CBC]" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#183449]/70">
                                    Security Verification
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    onRefreshCaptcha();
                                    setUserAnswer('');
                                }}
                                className="group flex items-center gap-2 rounded-full border border-[#B3B3B3] bg-white/50 px-3 py-1.5 text-[#588CBC] shadow-sm transition-colors hover:bg-[#588CBC] hover:text-white"
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest">Refresh</span>
                                <RefreshCw size={14} className="transition-transform duration-500 group-hover:rotate-180" />
                            </button>
                        </div>

                        <div className="relative z-10 flex items-center gap-5">
                            <div className="min-w-0 flex-1">
                                <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Verify Calculation:</p>
                                <div className="flex items-center gap-3 whitespace-nowrap text-3xl font-black tracking-tight text-[#183449]">
                                    <span className="shrink-0">{captcha.pertanyaan || '...'}</span>
                                    <span className="text-[#588CBC]">=</span>
                                    <span className="animate-pulse text-[#588CBC]">?</span>
                                </div>
                            </div>
                            <div className="w-28 shrink-0">
                                <input
                                    type="text"
                                    placeholder="Hasil"
                                    value={userAnswer}
                                    onChange={(e) => setUserAnswer(e.target.value)}
                                    className={cn(
                                        'w-full rounded-2xl px-4 py-3.5 text-center text-lg font-black transition-colors focus:outline-none',
                                        isCaptchaSolved
                                            ? 'bg-[#588CBC] text-white shadow-lg shadow-[#588CBC]/30'
                                            : 'border border-[#B3B3B3] bg-white text-[#183449] placeholder:text-slate-300 focus:border-[#588CBC]'
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={!isCaptchaSolved || loading}
                    className={cn(
                        'mt-4 flex w-full items-center justify-center gap-3 rounded-3xl py-4 text-sm font-black tracking-widest transition-transform',
                        isCaptchaSolved && !loading
                            ? 'bg-linear-to-br from-[#183449] to-[#2B5474] text-white shadow-xl shadow-[#183449]/20 hover:scale-[1.02] active:scale-[0.98]'
                            : 'cursor-not-allowed bg-slate-100 text-slate-400'
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
                </button>
            </form>
        </div>
    );
}

function SignUpForm({
    onRegister,
    loading,
}: Pick<AuthSliderProps, 'onRegister' | 'loading'>) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onRegister({ username, gmail: email, password, role: 'user' });
    };

    return (
        <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
                <h2 className="text-3xl font-black tracking-tight text-slate-800">Buat Akun Baru</h2>
                <p className="mt-2 font-medium text-slate-500">Daftar sebagai pengguna untuk mengakses layanan.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <label className={labelCls}>Username</label>
                    <div className="group relative">
                        <User className={iconCls} size={20} />
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="syafikh_unj"
                            className={inputCls}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className={labelCls}>Alamat Email</label>
                    <div className="group relative">
                        <Mail className={iconCls} size={20} />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="syafikh@gmail.com"
                            className={inputCls}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className={labelCls}>Kata Sandi</label>
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

                <button
                    type="submit"
                    disabled={loading}
                    className="group mt-2 flex w-full items-center justify-center gap-2 rounded-3xl bg-linear-to-br from-[#07111E] to-[#0F2238] py-4 text-sm font-black text-white shadow-xl shadow-[#183449]/20 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                    <span>{loading ? 'MEMPROSES...' : 'DAFTAR SEKARANG'}</span>
                    {!loading && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
                </button>
            </form>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  OVERLAY PANEL                                                      */
/* ------------------------------------------------------------------ */

function OverlayPanel({
    className,
    question,
    cta,
    onClick,
}: {
    className: string;
    question: string;
    cta: string;
    onClick: () => void;
}) {
    return (
        <div
            className={cn(
                'absolute top-0 flex h-full w-1/2 flex-col items-center justify-center px-10 text-center text-white transition-transform duration-700 ease-in-out will-change-transform motion-reduce:transition-none lg:px-14',
                className
            )}
        >
            <div className="-mt-8 lg:-mt-12 drop-shadow-2xl">
                <Logo onlyLogo width={340} height={340} className="w-64 h-64 lg:w-80 lg:h-80 object-contain drop-shadow-2xl" />
            </div>

            <div className="-mt-4 lg:-mt-6 flex flex-col items-center gap-3">
                <p className="text-xs font-semibold tracking-wider text-slate-300">{question}</p>
                <button
                    type="button"
                    onClick={onClick}
                    className="group flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/10 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-black/20 transition-[background-color,transform] hover:scale-[1.03] hover:bg-white/20 active:scale-[0.98]"
                >
                    <span>{cta}</span>
                    <ArrowRight size={16} className="text-white/70 transition-transform group-hover:translate-x-1" />
                </button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  MAIN SLIDER                                                        */
/* ------------------------------------------------------------------ */

const AuthSlider = ({
    mode,
    onModeChange,
    onLogin,
    onRegister,
    loading,
    captcha,
    onRefreshCaptcha,
}: AuthSliderProps) => {
    // true  => overlay di kiri, form Register tampil di kanan
    // false => overlay di kanan, form Login tampil di kiri
    const isRightPanelActive = mode === 'signup';

    const handleSignIn = () => onModeChange('login');
    const handleSignUp = () => onModeChange('signup');

    const slide = 'transition-[transform,opacity,visibility] duration-700 ease-in-out will-change-transform motion-reduce:transition-none';
    const formPane = 'absolute left-0 top-0 h-full w-1/2 overflow-y-auto px-8 py-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:px-14';

    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#07111E] p-6 font-sans selection:bg-[#588CBC]/20 selection:text-[#183449]">
            {/* BACKGROUND (statis) */}
            <div
                className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: `url('/BackgroundLogSign.png')`,
                    filter: 'brightness(0.6) contrast(1.15)',
                }}
            />
            {/* Dark Overlay Layer - Clean Deep Dark */}
            <div className="pointer-events-none absolute inset-0 z-0 bg-slate-950/75" />
            {/* Ambient Soft Glow (Clean tanpa dot grid pattern) */}
            <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{
                    backgroundImage:
                        'radial-gradient(circle at 90% 0%, rgba(88,140,188,0.12), transparent 45%), radial-gradient(circle at 0% 100%, rgba(24,52,73,0.15), transparent 45%)',
                }}
            />

            {/* KARTU UTAMA. Tanpa backdrop-blur karena bikin lag saat anak-anaknya bergerak */}
            <div className="relative z-10 h-180 w-full max-w-5xl overflow-hidden rounded-[48px] border border-white bg-white/90 shadow-[0_32px_80px_rgba(24,52,73,0.12)]">
                {/* batik watermark statis di bawah semua form */}
                <div
                    className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-80"
                    style={{ backgroundImage: `url('/Batik.png')` }}
                />

                {/* ===== FORM LOGIN: kiri, geser ke kanan waktu Register aktif ===== */}
                <div
                    className={cn(
                        formPane,
                        slide,
                        isRightPanelActive
                            ? 'invisible z-10 translate-x-full opacity-0'
                            : 'visible z-20 translate-x-0 opacity-100'
                    )}
                    aria-hidden={isRightPanelActive}
                >
                    <div className="flex min-h-full flex-col justify-center">
                        <LoginForm
                            onLogin={onLogin}
                            loading={loading}
                            captcha={captcha}
                            onRefreshCaptcha={onRefreshCaptcha}
                        />
                    </div>
                </div>

                {/* ===== FORM REGISTER: numpuk di kiri (tersembunyi), geser ke kanan waktu aktif ===== */}
                <div
                    className={cn(
                        formPane,
                        slide,
                        isRightPanelActive
                            ? 'visible z-20 translate-x-full opacity-100'
                            : 'invisible z-10 translate-x-0 opacity-0'
                    )}
                    aria-hidden={!isRightPanelActive}
                >
                    <div className="flex min-h-full flex-col justify-center">
                        <SignUpForm onRegister={onRegister} loading={loading} />
                    </div>
                </div>

                {/* ===== OVERLAY CONTAINER: separuh kanan, geser ke kiri ===== */}
                <div
                    className={cn(
                        'absolute left-1/2 top-0 z-30 h-full w-1/2 overflow-hidden transition-transform duration-700 ease-in-out will-change-transform motion-reduce:transition-none',
                        isRightPanelActive ? '-translate-x-full' : 'translate-x-0'
                    )}
                >
                    {/* overlay 2x lebar, geser berlawanan arah biar isinya "kelihatan diam" */}
                    <div
                        className={cn(
                            'relative -left-full h-full w-[200%] transition-transform duration-700 ease-in-out will-change-transform motion-reduce:transition-none',
                            isRightPanelActive ? 'translate-x-1/2' : 'translate-x-0'
                        )}
                        style={{
                            background:
                                'radial-gradient(circle at 15% 10%, rgba(88,140,188,0.18), transparent 35%), linear-gradient(135deg, #0F2238 0%, #07111E 100%)',
                        }}
                    >
                        {/* panel kiri overlay: kelihatan saat Register aktif */}
                        <OverlayPanel
                            className={cn('left-0', isRightPanelActive ? 'translate-x-0' : 'translate-x-[-20%]')}
                            question="Sudah memiliki akun?"
                            cta="Masuk ke Akun"
                            onClick={handleSignIn}
                        />
                        {/* panel kanan overlay: kelihatan saat Login aktif */}
                        <OverlayPanel
                            className={cn('right-0', isRightPanelActive ? 'translate-x-[20%]' : 'translate-x-0')}
                            question="Belum memiliki akun?"
                            cta="Daftar Sekarang"
                            onClick={handleSignUp}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthSlider;