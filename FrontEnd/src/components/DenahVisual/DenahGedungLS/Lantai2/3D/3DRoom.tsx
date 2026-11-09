'use client';

/**
 * 3D Room - Gedung LE Lantai 2
 * Daftar model .glb (MODEL_3D, MODEL_RUANGAN), interior ruangan 3D bawaan yang bisa diputar (RuangDrag),
 * dan Slot3D yang dipakai di showcase serta langkah Fasilitas.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const Ruang208LE = dynamic(() => import('./3DRuang208LE'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#cfd3d8]" style={{ minHeight: 300 }}>
      <div className="flex flex-col items-center gap-2">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-400 border-t-gray-800" />
        <span className="text-xs font-semibold text-gray-700">Memuat visual 3D Ruang 208...</span>
      </div>
    </div>
  ),
});

export { Ruang208LE };

export const MODEL_3D: Record<string, string> = {};
export const MODEL_RUANGAN: Record<string, string> = {};

function PetunjukPutar({ tampil }: { tampil: boolean }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 bottom-4 flex justify-center transition-opacity duration-500 ${
        tampil ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-[#848484] bg-[#2B2B2B]/80 px-4 py-2 text-xs font-semibold text-[#E0E0E0] backdrop-blur">
        <span className="inline-block animate-pulse text-base leading-none">↔</span> Seret untuk memutar 360°
      </span>
    </div>
  );
}

function Kotak({
  x,
  z,
  w,
  d,
  h,
  y0 = 0,
  H,
  c,
}: {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  y0?: number;
  H: number;
  c: [string, string, string];
}) {
  const sisi = { position: 'absolute' as const, border: '1px solid rgba(43,43,43,.55)' };
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transformStyle: 'preserve-3d',
        transform: `translate3d(${x}px, ${H / 2 - y0 - h / 2}px, ${z}px)`,
      }}
    >
      <i
        style={{
          ...sisi,
          width: w,
          height: d,
          left: -w / 2,
          top: -d / 2,
          background: c[0],
          transform: `translateY(${-h / 2}px) rotateX(90deg)`,
        }}
      />
      <i
        style={{
          ...sisi,
          width: w,
          height: h,
          left: -w / 2,
          top: -h / 2,
          background: c[1],
          transform: `translateZ(${d / 2}px)`,
        }}
      />
      <i
        style={{
          ...sisi,
          width: w,
          height: h,
          left: -w / 2,
          top: -h / 2,
          background: c[1],
          transform: `translateZ(${-d / 2}px)`,
        }}
      />
      <i
        style={{
          ...sisi,
          width: d,
          height: h,
          left: -d / 2,
          top: -h / 2,
          background: c[2],
          transform: `rotateY(-90deg) translateZ(${w / 2}px)`,
        }}
      />
      <i
        style={{
          ...sisi,
          width: d,
          height: h,
          left: -d / 2,
          top: -h / 2,
          background: c[2],
          transform: `rotateY(90deg) translateZ(${w / 2}px)`,
        }}
      />
    </div>
  );
}

export function RuangDrag({
  kapasitas,
  pc,
  label,
}: {
  kapasitas: number;
  pc: boolean;
  label: string;
}) {
  const kotak = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const st = useRef({ x: -26, y: -35, drag: false, px: 0, py: 0, idle: 0 });
  const [dipakai, setDipakai] = useState(false);
  const [skala, setSkala] = useState(1);

  const meja = Math.max(2, Math.ceil(Math.min(kapasitas, 40) / 2));
  const kolom = Math.min(8, Math.max(2, Math.ceil(Math.sqrt(meja * 1.5))));
  const baris = Math.ceil(meja / kolom);
  const GX = 34,
    GZ = 32,
    H = 120;
  const W = kolom * GX + 30;
  const D = baris * GZ + 78;
  const susun = useMemo(
    () =>
      Array.from({ length: meja }, (_, n) => ({
        x: ((n % kolom) - (kolom - 1) / 2) * GX,
        z: -D / 2 + 54 + Math.floor(n / kolom) * GZ,
      })),
    [meja, kolom, D]
  );

  useEffect(() => {
    const el = kotak.current;
    if (!el) return;
    const hitung = () =>
      setSkala(Math.max(0.5, (Math.min(el.clientWidth, el.clientHeight) * 0.78) / Math.hypot(W, D, H * 0.6)));
    hitung();
    const ro = new ResizeObserver(hitung);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W, D]);

  useEffect(() => {
    const kurangGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const loop = () => {
      if (!st.current.drag && !kurangGerak) {
        st.current.idle += 1;
        if (st.current.idle > 120) st.current.y += 0.12;
      }
      if (scene.current) {
        scene.current.style.transform = `scale3d(${skala},${skala},${skala}) rotateX(${st.current.x}deg) rotateY(${st.current.y}deg)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [skala]);

  const mulai = (cx: number, cy: number) => {
    st.current.drag = true;
    st.current.px = cx;
    st.current.py = cy;
    st.current.idle = 0;
    setDipakai(true);
  };
  const gerak = (cx: number, cy: number) => {
    if (!st.current.drag) return;
    const dx = cx - st.current.px,
      dy = cy - st.current.py;
    st.current.px = cx;
    st.current.py = cy;
    st.current.y += dx * 0.45;
    st.current.x = Math.max(-75, Math.min(10, st.current.x - dy * 0.35));
  };
  const lepas = () => {
    st.current.drag = false;
  };

  return (
    <div
      ref={kotak}
      tabIndex={0}
      role="application"
      aria-label={`${label}, model interior 3D. Seret untuk memutar.`}
      className="relative flex h-full w-full select-none items-center justify-center overflow-hidden bg-[#1E1E1E] outline-none"
      style={{ perspective: 950 }}
      onMouseDown={(e) => mulai(e.clientX, e.clientY)}
      onMouseMove={(e) => gerak(e.clientX, e.clientY)}
      onMouseUp={lepas}
      onMouseLeave={lepas}
      onTouchStart={(e) => e.touches[0] && mulai(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => e.touches[0] && gerak(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={lepas}
      onKeyDown={(e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
          st.current.idle = 0;
          setDipakai(true);
          if (e.key === 'ArrowLeft') st.current.y -= 5;
          if (e.key === 'ArrowRight') st.current.y += 5;
          if (e.key === 'ArrowUp') st.current.x = Math.max(-75, st.current.x - 4);
          if (e.key === 'ArrowDown') st.current.x = Math.min(10, st.current.x + 4);
        }
      }}
    >
      <div ref={scene} style={{ position: 'relative', width: 0, height: 0, transformStyle: 'preserve-3d' }}>
        <div
          style={{
            position: 'absolute',
            width: W,
            height: D,
            left: -W / 2,
            top: -D / 2,
            background: '#2B2B2B',
            border: '2px solid #565656',
            transform: `translateY(${H / 2}px) rotateX(90deg)`,
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            width: W,
            height: H,
            left: -W / 2,
            top: -H / 2,
            background: 'linear-gradient(to bottom, #3A3A3A, #252525)',
            border: '1px solid #565656',
            transform: `translateZ(${-D / 2}px)`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: W * 0.55,
              height: H * 0.38,
              left: W * 0.225,
              top: H * 0.22,
              background: '#FAFAFA',
              border: '3px solid #111111',
              borderRadius: 4,
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            }}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            width: D,
            height: H,
            left: -D / 2,
            top: -H / 2,
            background: 'linear-gradient(to bottom, #323232, #202020)',
            border: '1px solid #565656',
            transform: `rotateY(90deg) translateZ(${-W / 2}px)`,
          }}
        />

        <Kotak x={0} z={-D / 2 + 24} w={54} d={22} h={16} H={H} c={['#848484', '#565656', '#3A3A3A']} />

        {susun.map((s, idx) => (
          <React.Fragment key={idx}>
            <Kotak x={s.x} z={s.z} w={26} d={16} h={14} H={H} c={['#B3B3B3', '#848484', '#565656']} />
            {pc && (
              <Kotak
                x={s.x}
                z={s.z - 3}
                w={10}
                d={2}
                h={7}
                y0={14}
                H={H}
                c={['#111111', '#2B2B2B', '#111111']}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <PetunjukPutar tampil={!dipakai} />
    </div>
  );
}

export function Slot3D({
  src,
  label,
  ruang,
  kode,
  scrollSafe = false,
}: {
  src?: string;
  label: string;
  ruang?: { kapasitas: number; pc: boolean; kode: string };
  kode?: string;
  scrollSafe?: boolean;
}) {
  const is208 = kode === 'R208' || ruang?.kode === 'R208';
  if (is208) {
    return <Ruang208LE scrollSafe={scrollSafe} />;
  }

  if (src) {
    return (
      <div className="relative h-full w-full bg-[#1E1E1E]">
        <div className="flex h-full w-full items-center justify-center p-4 text-center">
          <p className="text-xs text-[#B3B3B3]">Model 3D: {label}</p>
        </div>
      </div>
    );
  }

  return (
    <RuangDrag
      kapasitas={ruang?.kapasitas ?? 30}
      pc={ruang?.pc ?? true}
      label={label}
    />
  );
}

