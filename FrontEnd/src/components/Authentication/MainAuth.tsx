'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';

// Web Components
import AuthSlider from './Web&Tab/AuthSlider';
import CustomAlert from '@/components/Shared/CustomAlert';

// Mobile Components
import MobileLogin from './Mobile/Login';
import MobileSignUp from './Mobile/SignUp';

interface MainAuthProps {
    initialMode: 'login' | 'signup';
    onLoginSuccess?: (user: any) => void;
}

const MainAuth = ({ initialMode, onLoginSuccess }: MainAuthProps) => {
    const isMobile = useIsMobile();
    const router = useRouter();
    const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
    const [mounted, setMounted] = useState(false);

    // Auth State
    const [loading, setLoading] = useState(false);
    const [captcha, setCaptcha] = useState({ kode: 0, pertanyaan: '', jawaban: '' });
    const [alertConfig, setAlertConfig] = useState<{show: boolean, type: 'alert' | 'confirm', message: string, title?: string, onConfirm?: () => void}>({show: false, type: 'alert', message: ''});

    const showAlert = (message: string, title?: string) => setAlertConfig({show: true, type: 'alert', message, title});

    useEffect(() => {
        setMounted(true);
        fetchCaptcha();
    }, []);

    const fetchCaptcha = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/captcha`);
            const data = await res.json();
            if (res.ok) {
                setCaptcha(data);
            }
        } catch (err) {
            console.error('Failed to fetch captcha:', err);
        }
    };

    const handleNavigate = () => {
        const newMode = mode === 'login' ? 'signup' : 'login';
        setMode(newMode);
    };

    const handleLogin = async (payload: any) => {
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('user', JSON.stringify(data));
                if (onLoginSuccess) {
                    onLoginSuccess(data);
                } else {
                    router.push('/');
                }
            } else {
                showAlert(data.error || 'Login Gagal', 'Gagal');
                fetchCaptcha();
            }
        } catch (err) {
            showAlert('Gagal menyambung ke server Backend', 'Error Koneksi');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (payload: any) => {
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (res.ok) {
                showAlert('Pendaftaran Berhasil! Silakan Login.', 'Sukses');
                setMode('login');
            } else {
                showAlert(data.error || 'Pendaftaran Gagal', 'Gagal');
            }
        } catch (err) {
            showAlert('Gagal menyambung ke server Backend', 'Error Koneksi');
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-slate-200 border-t-[#588CBC]" />
            </div>
        );
    }

    // HP: tetap ganti halaman seperti sebelumnya
    if (isMobile) {
        return (
            <>
                {mode === 'login' ? (
                    <MobileLogin
                        onNavigate={handleNavigate}
                        onLogin={handleLogin}
                        loading={loading}
                        captcha={captcha}
                        onRefreshCaptcha={fetchCaptcha}
                    />
                ) : (
                    <MobileSignUp
                        onNavigate={handleNavigate}
                        onSignUp={handleSignUp}
                        loading={loading}
                    />
                )}
                <CustomAlert config={alertConfig} onClose={() => setAlertConfig({ ...alertConfig, show: false })} />
            </>
        );
    }

    // Web & Tab: satu komponen, overlay geser
    return (
        <>
            <AuthSlider
                mode={mode}
                onModeChange={setMode}
                onLogin={handleLogin}
                onRegister={handleSignUp}
                loading={loading}
                captcha={captcha}
                onRefreshCaptcha={fetchCaptcha}
            />
            <CustomAlert config={alertConfig} onClose={() => setAlertConfig({ ...alertConfig, show: false })} />
        </>
    );
};

export default MainAuth;