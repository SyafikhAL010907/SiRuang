'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
import LoadingPage from './LoadingPage';

const START_DELAY = 1000; // tunggu animasi masuk (judul, logo, ornamen) selesai dulu sebelum progress jalan
const MIN_DURATION = 2000; // lama progress dari 0 ke 100% (ms)
const MAX_WAIT = 8000; // batas tunggu event "load" kalau ada resource yang lambat
const HOLD_AT_100 = 450; // jeda di 100% sebelum tirai membuka
const EXIT_DURATION = 1400; // durasi animasi keluar sebelum overlay dilepas dari DOM

type AppLoaderProps = {
  children: ReactNode;
  /** path logo asli, mis. "/images/logo.png" */
  logoSrc?: string;
  title?: string;
};

// Flag di tingkat modul: saat navigasi SPA (pindah halaman), loader tidak muncul lagi.
// Saat browser di-refresh (F5), script re-run dari awal sehingga flag reset ke false dan loader muncul lagi.
let hasLoadedOnce = false;

export default function AppLoader({
  children,
  logoSrc = '/LogoSiRuangPolos.png', // file ada di public/LogoSiRuangPolos.png
  title,
}: AppLoaderProps) {
  const [progress, setProgress] = useState(hasLoadedOnce ? 100 : 0);
  const [exiting, setExiting] = useState(hasLoadedOnce);
  const [visible, setVisible] = useState(!hasLoadedOnce);

  useEffect(() => {
    if (hasLoadedOnce) {
      document.documentElement.dataset.appLoaded = 'true';
      window.dispatchEvent(new Event('app:loaded'));
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    let raf = 0;
    let p = 0;
    let finished = false;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = Math.max(0, now - start - START_DELAY);
      const timeCap = Math.min(100, (elapsed / MIN_DURATION) * 100);
      const target = timeCap;

      p += (target - p) * 0.08;
      if (target - p < 0.05) p = target;

      setProgress(Number(p.toFixed(1)));

      if (p >= 100 && !finished) {
        finished = true;
        hasLoadedOnce = true;
        timers.push(
          setTimeout(() => {
            document.body.style.overflow = previousOverflow;
            // beri tahu halaman: loader selesai -> animasi hero boleh mulai
            document.documentElement.dataset.appLoaded = 'true';
            window.dispatchEvent(new Event('app:loaded'));
            setExiting(true);
            timers.push(setTimeout(() => setVisible(false), EXIT_DURATION));
          }, HOLD_AT_100)
        );
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <>
      {children}
      {visible && <LoadingPage progress={progress} exiting={exiting} logoSrc={logoSrc} title={title} />}
      {/* kalau JS mati, jangan sampai layar tertutup loader selamanya */}
      <noscript>
        <style>{'.pl-root{display:none !important}'}</style>
      </noscript>
    </>
  );
}
