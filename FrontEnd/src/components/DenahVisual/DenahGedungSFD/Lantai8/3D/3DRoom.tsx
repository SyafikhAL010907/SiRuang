'use client';

/**
 * 3D Room - Gedung SFD Lantai 8
 * Daftar model .glb (MODEL_3D, MODEL_RUANGAN), interior ruangan 3D bawaan yang bisa diputar (RuangDrag),
 * dan Slot3D yang dipakai di showcase serta langkah Fasilitas.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const Ruang805SFD = dynamic(() => import('./3DRuang805SFD'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#cfd3d8]" style={{ minHeight: 300 }}>
      <div className="flex flex-col items-center gap-2">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-400 border-t-gray-800" />
        <span className="text-xs font-semibold text-gray-700">Memuat visual 3D...</span>
      </div>
    </div>
  ),
});

export { Ruang805SFD };

/**
 * SLOT 3D — daftarkan model per fasilitas di sini.
 * Taruh file .glb di /public/models/, lalu isi path-nya. Contoh:
 *   'PC workstation': '/models/pc-workstation.glb',
 * Fasilitas yang belum punya model menampilkan placeholder.
 */
export const MODEL_3D: Record<string, string> = {};

/**
 * SLOT 3D RUANGAN — model satu ruangan utuh, tampil di showcase (tombol "3D").
 * Kuncinya kode ruangan. Contoh:
 *   'R.805': '/models/lab-komputer.glb',
 */
export const MODEL_RUANGAN: Record<string, string> = {};

/** Petunjuk kecil "bisa diputar", hilang setelah pengguna mulai menyeret. */
function PetunjukPutar({ tampil }: { tampil: boolean }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-x-0 bottom-4 flex justify-center transition-opacity duration-500 ${tampil ? 'opacity-100' : 'opacity-0'}`}>
      <span className="inline-flex items-center gap-2 rounded-full border border-[#848484] bg-[#2B2B2B]/80 px-4 py-2 text-xs font-semibold text-[#E0E0E0] backdrop-blur">
        <span className="sfd-geser text-base leading-none">↔</span>Seret untuk memutar 360°
      </span>
    </div>
  );
}

/** Balok 3D sederhana (dasar menempel di lantai). Dipakai untuk meja, monitor, dll. */
function Kotak({ x, z, w, d, h, y0 = 0, H, c }: { x: number; z: number; w: number; d: number; h: number; y0?: number; H: number; c: [string, string, string] }) {
  const sisi = { position: 'absolute' as const, border: '1px solid rgba(43,43,43,.55)' };
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d', transform: `translate3d(${x}px, ${H / 2 - y0 - h / 2}px, ${z}px)` }}>
      <i style={{ ...sisi, width: w, height: d, left: -w / 2, top: -d / 2, background: c[0], transform: `translateY(${-h / 2}px) rotateX(90deg)` }} />
      <i style={{ ...sisi, width: w, height: h, left: -w / 2, top: -h / 2, background: c[1], transform: `translateZ(${d / 2}px)` }} />
      <i style={{ ...sisi, width: w, height: h, left: -w / 2, top: -h / 2, background: c[1], transform: `translateZ(${-d / 2}px)` }} />
      <i style={{ ...sisi, width: d, height: h, left: -d / 2, top: -h / 2, background: c[2], transform: `rotateY(-90deg) translateZ(${w / 2}px)` }} />
      <i style={{ ...sisi, width: d, height: h, left: -d / 2, top: -h / 2, background: c[2], transform: `rotateY(90deg) translateZ(${w / 2}px)` }} />
    </div>
  );
}

/**
 * Interior ruangan 3D bawaan (tanpa file model): lantai, dinding, papan, meja dosen, dan meja mahasiswa
 * sesuai kapasitas. Bisa diputar 360° dengan drag (mouse / sentuh) atau tombol panah.
 * Berhenti memutar sendiri saat disentuh, lanjut pelan setelah dilepas.
 */
function RuangDrag({ kapasitas, pc, label }: { kapasitas: number; pc: boolean; label: string }) {
  const kotak = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const st = useRef({ x: -26, y: -35, drag: false, px: 0, py: 0, idle: 0 });
  const [dipakai, setDipakai] = useState(false);
  const [skala, setSkala] = useState(1);

  const meja = Math.max(2, Math.ceil(Math.min(kapasitas, 40) / 2));
  const kolom = Math.min(8, Math.max(2, Math.ceil(Math.sqrt(meja * 1.5))));
  const baris = Math.ceil(meja / kolom);
  const GX = 34, GZ = 32, H = 120;
  const W = kolom * GX + 30;
  const D = baris * GZ + 78;
  const susun = useMemo(
    () => Array.from({ length: meja }, (_, n) => ({ x: ((n % kolom) - (kolom - 1) / 2) * GX, z: -D / 2 + 54 + Math.floor(n / kolom) * GZ })),
    [meja, kolom, D],
  );

  useEffect(() => {
    const el = kotak.current;
    if (!el) return;
    const hitung = () => setSkala(Math.max(0.5, (Math.min(el.clientWidth, el.clientHeight) * 0.78) / Math.hypot(W, D, H * 0.6)));
    hitung();
    const ro = new ResizeObserver(hitung);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W, D]);

  useEffect(() => {
    const kurangGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let t = performance.now();
    const loop = (now: number) => {
      const s = st.current;
      const dt = now - t;
      t = now;
      if (!s.drag && !kurangGerak && now - s.idle > 2500) s.y += dt * 0.012;
      if (scene.current) scene.current.style.transform = `rotateX(${s.x}deg) rotateY(${s.y}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const lepas = () => { st.current.drag = false; st.current.idle = performance.now(); };
  const dinding = { position: 'absolute' as const, background: 'rgba(224,224,224,.06)', border: '1px solid rgba(179,179,179,.45)' };
  const meja3: [string, string, string] = ['#B3B3B3', '#848484', '#6b6b6b'];

  return (
    <div
      ref={kotak}
      tabIndex={0}
      role="img"
      aria-label={`Interior 3D ${label}. Seret atau tekan tombol panah untuk memutar.`}
      className="sfd-in relative h-full w-full cursor-grab touch-pan-y select-none active:cursor-grabbing focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#E0E0E0]"
      onPointerDown={(e) => { const s = st.current; s.drag = true; s.px = e.clientX; s.py = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); setDipakai(true); }}
      onPointerMove={(e) => {
        const s = st.current;
        if (!s.drag) return;
        s.y += (e.clientX - s.px) * 0.5;
        s.x = Math.min(-8, Math.max(-80, s.x - (e.clientY - s.py) * 0.4));
        s.px = e.clientX; s.py = e.clientY;
      }}
      onPointerUp={lepas}
      onPointerCancel={lepas}
      onKeyDown={(e) => {
        const s = st.current;
        if (e.key === 'ArrowLeft') s.y -= 12;
        else if (e.key === 'ArrowRight') s.y += 12;
        else if (e.key === 'ArrowUp') s.x = Math.max(-80, s.x - 8);
        else if (e.key === 'ArrowDown') s.x = Math.min(-8, s.x + 8);
        else return;
        e.preventDefault();
        s.idle = performance.now();
        setDipakai(true);
      }}
    >
      <div className="absolute left-1/2 top-[48%]" style={{ perspective: 1400 }}>
        <div style={{ transformStyle: 'preserve-3d', transform: `scale(${skala})` }}>
          <div ref={scene} style={{ transformStyle: 'preserve-3d' }}>
            {/* lantai & dinding */}
            <i style={{ ...dinding, background: 'rgba(86,86,86,.55)', width: W, height: D, left: -W / 2, top: -D / 2, transform: `translateY(${H / 2}px) rotateX(90deg)` }} />
            <i style={{ ...dinding, width: W, height: H, left: -W / 2, top: -H / 2, transform: `translateZ(${-D / 2}px)` }} />
            <i style={{ ...dinding, width: W, height: H, left: -W / 2, top: -H / 2, transform: `translateZ(${D / 2}px)` }} />
            <i style={{ ...dinding, width: D, height: H, left: -D / 2, top: -H / 2, transform: `rotateY(-90deg) translateZ(${W / 2}px)` }} />
            <i style={{ ...dinding, width: D, height: H, left: -D / 2, top: -H / 2, transform: `rotateY(90deg) translateZ(${W / 2}px)` }} />
            {/* papan di dinding depan */}
            <i style={{ position: 'absolute', width: W * 0.5, height: H * 0.32, left: -W * 0.25, top: -H / 2 + 16, background: 'rgba(224,224,224,.3)', border: '1px solid #E0E0E0', transform: `translateZ(${-D / 2 + 1}px)` }} />
            {/* meja dosen */}
            <Kotak x={0} z={-D / 2 + 24} w={44} d={16} h={13} H={H} c={['#E0E0E0', '#B3B3B3', '#848484']} />
            {/* meja mahasiswa */}
            {susun.map((m, n) => (
              <React.Fragment key={n}>
                <Kotak x={m.x} z={m.z} w={26} d={15} h={11} H={H} c={meja3} />
                {pc && <Kotak x={m.x} z={m.z - 3} w={11} d={2} h={8} y0={11} H={H} c={['#565656', '#2B2B2B', '#2B2B2B']} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      <span className="pointer-events-none absolute left-4 top-4 rounded-full border border-[#565656] bg-[#2B2B2B]/70 px-3 py-1 text-xs font-semibold text-[#B3B3B3] backdrop-blur">3D · {label}</span>
      <PetunjukPutar tampil={!dipakai} />
    </div>
  );
}

/** Slot 3D: pakai model-viewer bila ada file .glb, atau Ruang805SFD bila R.805, atau interior ruangan bawaan (bila `ruang`) atau placeholder kubus. */
export function Slot3D({
  src,
  label,
  ruang,
  scrollSafe = false,
  kode,
}: {
  src?: string;
  label: string;
  ruang?: { kapasitas: number; pc: boolean; kode?: string };
  scrollSafe?: boolean;
  kode?: string;
}) {
  const [dipakai, setDipakai] = useState(false);

  useEffect(() => {
    if (!src || customElements.get('model-viewer')) return;
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';
    document.head.appendChild(s);
  }, [src]);

  // Cek apakah target adalah ruangan R.805 (Lab Komputer)
  const is805Room =
    (kode === 'R.805' ||
      ruang?.kode === 'R.805' ||
      label === 'R.805' ||
      label.includes('805') ||
      label.toLowerCase().includes('lab komputer')) &&
    !src;

  if (is805Room && (ruang || label.includes('805') || label.toLowerCase().includes('lab komputer') || label === 'Ruangan')) {
    return (
      <div className="relative h-full w-full overflow-hidden" onPointerDown={() => setDipakai(true)}>
        <Ruang805SFD scrollSafe={scrollSafe} />
        <span className="pointer-events-none absolute left-4 top-4 z-10 rounded-full border border-[#565656] bg-[#2B2B2B]/80 px-3 py-1 text-xs font-semibold text-[#E0E0E0] backdrop-blur">
          Three.js · R.805 Lab Komputer (50 Mahasiswa + Dosen)
        </span>
        <PetunjukPutar tampil={!dipakai} />
      </div>
    );
  }

  if (src) {
    // scrollSafe: scroll mouse tidak dipakai zoom, supaya halaman tetap bisa discroll saat kursor di atas model
    const extra = scrollSafe ? { 'disable-zoom': true, 'touch-action': 'pan-y' } : {};
    return (
      <div className="relative h-full w-full" onPointerDown={() => setDipakai(true)}>
        {React.createElement('model-viewer', { src, alt: `Model 3D ${label}`, 'camera-controls': true, 'auto-rotate': true, 'shadow-intensity': '1', ...extra, style: { width: '100%', height: '100%' } })}
        <PetunjukPutar tampil={!dipakai} />
      </div>
    );
  }
  if (ruang) return <RuangDrag kapasitas={ruang.kapasitas} pc={ruang.pc} label={label} />;

  const sisi = [0, 90, 180, 270].map((r) => `rotateY(${r}deg) translateZ(56px)`).concat(['rotateX(90deg) translateZ(56px)', 'rotateX(-90deg) translateZ(56px)']);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="h-28 w-28" style={{ perspective: 600 }}>
        <div className="sfd-spin relative h-28 w-28" style={{ transformStyle: 'preserve-3d' }}>
          {sisi.map((t) => <div key={t} className="absolute inset-0 border border-[#848484] bg-[#565656]/30" style={{ transform: t }} />)}
        </div>
      </div>
      <div>
        <p className="font-bold">Slot model 3D · {label}</p>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-[#B3B3B3]">Model belum dipasang. Taruh file .glb di public/models/ lalu daftarkan di MODEL_RUANGAN (model ruangan) atau MODEL_3D (model fasilitas) agar bisa diputar dan di-zoom di sini.</p>
      </div>
    </div>
  );
}
