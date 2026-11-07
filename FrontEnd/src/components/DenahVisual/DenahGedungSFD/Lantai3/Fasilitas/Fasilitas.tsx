'use client';

/**
 * Fasilitas - Gedung SFD Lantai 3
 * Isi: penjelasan tiap fasilitas, langkah "Fasilitas" di popup ruangan (FasilitasStep),
 * showcase pilihan ruangan yang berpindah mengikuti scroll (PilihanRuangan: deskripsi + card 3D + chip fasilitas),
 * dan halaman daftar fasilitas (komponen tunggal responsive: Mobile, Tablet, Desktop) — tema Charcoal Noir.
 * Model 3D didaftarkan di ../3DRoom/3DRoom.tsx.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { RUANGAN, fotoRuangan, FOCUS, SfdStyle } from '../Jadwal/Jadwal';
import type { Ruangan } from '../Jadwal/Jadwal';
import { MODEL_3D, MODEL_RUANGAN, Slot3D } from '../3D/3DRoom';

// ----------------------------------------------------------------------------
// Penjelasan fasilitas + slot model 3D
// ----------------------------------------------------------------------------
const PENJELASAN: Record<string, string> = {
  'PC workstation': 'Komputer berspesifikasi tinggi untuk pemrograman, basis data, dan simulasi. Satu unit per mahasiswa.',
  'Proyektor': 'Proyektor di depan ruangan untuk presentasi dosen dan demo layar saat praktikum.',
  'AC': 'Pendingin ruangan supaya perangkat tetap awet dan peserta nyaman sepanjang sesi.',
  'Whiteboard': 'Papan tulis putih untuk menjelaskan alur, diagram, dan diskusi kelompok.',
  'Wi-Fi': 'Jaringan nirkabel kampus di dalam ruangan untuk mengunduh bahan dan mengerjakan tugas daring.',
  'Stop kontak tiap meja': 'Colokan listrik di setiap meja, jadi laptop pribadi bisa dipakai tanpa antre.',
  'PC multimedia': 'Komputer dengan kartu grafis dan layar akurat warna untuk desain, edit video, dan animasi.',
  'Tablet grafis': 'Tablet untuk menggambar digital, mengedit foto, dan membuat ilustrasi dengan pen presisi.',
  'Kamera & tripod': 'Kamera dan penyangga untuk merekam praktik, wawancara, atau konten video.',
  'Green screen': 'Latar hijau untuk produksi video dengan latar belakang yang diganti saat penyuntingan.',
  'Mic & sound system': 'Mikrofon dan pengeras suara agar suara pengajar terdengar jelas dan terekam baik.',
  'Monitor rekaman': 'Layar untuk memutar ulang rekaman praktik mengajar dan mengevaluasinya langsung.',
  'Meja & kursi kelas simulasi': 'Susunan meja dan kursi seperti kelas sungguhan untuk latihan mengajar.',
  'Mixer audio': 'Pengatur suara dari beberapa mikrofon sebelum masuk rekaman.',
  'Monitor kontrol': 'Layar operator untuk memantau kamera dan kualitas rekaman.',
  'Perekam video': 'Perangkat penyimpan rekaman sesi microteaching.',
  '3D printer FDM': 'Printer 3D filamen untuk prototipe cepat dari plastik PLA atau ABS.',
  'Resin printer': 'Printer 3D resin untuk model berdetail halus dan permukaan rapi.',
  'PC desain (CAD)': 'Komputer dengan perangkat lunak CAD untuk merancang model sebelum dicetak.',
  'Alat finishing': 'Perkakas untuk merapikan hasil cetak: amplas, pemotong, dan pencuci resin.',
  'Meja gambar': 'Meja miring dengan penggaris sejajar untuk gambar teknik manual.',
  'Drafting machine': 'Mesin gambar dengan lengan penggaris untuk garis lurus dan sudut yang presisi.',
  'Papan tulis': 'Papan tulis besar untuk penjelasan dosen dan koreksi gambar.',
  'Simulator rantai pasok': 'Perangkat lunak simulasi aliran barang dari pemasok sampai pelanggan.',
  'Rak gudang mini': 'Rak skala kecil untuk berlatih penataan dan pengambilan barang gudang.',
  'Simulator lalu lintas': 'Simulasi arus kendaraan di persimpangan dan ruas jalan.',
  'Maket jaringan jalan': 'Maket jalan untuk presentasi analisis dan perencanaan transportasi.',
  'Trainer PLC': 'Perangkat latih PLC lengkap dengan modul input-output untuk belajar pemrograman ladder dan kontrol otomatis.',
  'Panel kontrol': 'Panel berisi kontaktor, relay, dan tombol untuk merangkai dan menguji sistem kontrol industri.',
  'Meja rapat': 'Meja besar yang muat banyak orang untuk rapat, bimbingan, dan diskusi kelompok.',
  'Layar presentasi': 'Layar besar di depan ruangan agar materi presentasi terlihat jelas dari semua kursi.',
  'Modul tegangan tinggi': 'Perangkat praktik pembangkitan dan pengujian tegangan tinggi dengan pengaman standar laboratorium.',
  'Alat ukur listrik': 'Multimeter, clamp meter, dan alat ukur lain untuk mengukur tegangan, arus, dan daya.',
  'Trainer mesin listrik': 'Modul motor, generator, dan trafo untuk praktikum karakteristik mesin listrik.',
  'Kit robot': 'Perangkat robot beserta aktuator dan rangka untuk dirakit, diprogram, dan diuji.',
  'Mikrokontroler & sensor': 'Papan mikrokontroler dan beragam sensor untuk membuat sistem yang bisa membaca dan merespons lingkungan.',
  'Arena uji robot': 'Area lantai bergaris dan berhalang untuk menguji gerak dan navigasi robot.',
  'Trainer sistem digital': 'Perangkat latih rangkaian logika, flip-flop, dan counter untuk praktikum sistem digital.',
  'Kit FPGA': 'Papan FPGA untuk merancang dan menjalankan rangkaian digital hasil rancangan sendiri.',
  'Osiloskop': 'Alat untuk melihat bentuk gelombang sinyal listrik secara langsung saat praktikum.',
  'Function generator': 'Pembangkit sinyal sinus, kotak, dan segitiga untuk menguji rangkaian analog.',
  'Power supply': 'Catu daya yang tegangannya bisa diatur untuk menyalakan rangkaian praktikum.',
  'Trainer telekomunikasi': 'Modul latih modulasi, demodulasi, dan sistem komunikasi untuk praktikum telekomunikasi.',
  'Spectrum analyzer': 'Alat untuk melihat sebaran frekuensi sinyal, berguna menganalisis pemancar dan kanal komunikasi.',
  'Kit antena': 'Beberapa jenis antena dan perlengkapan ukur untuk mempelajari pola radiasi dan propagasi.',
};
export const penjelasanFasilitas = (nama: string) => PENJELASAN[nama] ?? 'Tersedia untuk pengguna ruangan ini.';

// Ruangan yang punya model interior 3D utuh (tombol "Lihat 3D Ruangan Utuh"). Isi kode ruangan di sini kalau modelnya sudah ada di ../3D/3DRoom.
const INTERIOR_3D = new Set<string>(['R-02', 'R-01', 'R.801']);

// Tema langkah Fasilitas: 'terang' = desain Figma (putih + garis hitam di atas batik), 'gelap' = Charcoal Noir lama
export type TemaFasilitas = 'gelap' | 'terang';

const TEMA_FASILITAS = {
  gelap: {
    judul: '',
    sub: 'text-[#B3B3B3]',
    kartu3D: 'border-[#565656] bg-[#565656]/20',
    caption: 'text-[#B3B3B3] text-xs text-left',
    itemAktif: 'border-[#E0E0E0] bg-[#565656]/30',
    itemBiasa: 'border-[#565656] hover:border-[#848484]',
    ikon: 'text-[#B3B3B3]',
    isi: 'text-[#B3B3B3]',
    toggleAktif: 'border-[#E0E0E0] bg-[#E0E0E0] text-[#2B2B2B]',
    toggleBiasa: 'border-[#848484] text-[#E0E0E0] hover:border-[#E0E0E0]',
    fokus: FOCUS,
  },
  terang: {
    judul: 'text-[#0D0D0D]',
    sub: 'text-[#3A3A3A]',
    kartu3D: 'border-[#0D0D0D] bg-white',
    caption: 'text-[#3A3A3A] text-sm text-center',
    itemAktif: 'border-[#0D0D0D] bg-[#F0F0F0]',
    itemBiasa: 'border-[#0D0D0D] bg-white hover:bg-[#F7F7F7]',
    ikon: 'text-[#0D0D0D]',
    isi: 'text-[#3A3A3A]',
    toggleAktif: 'border-[#0D0D0D] bg-[#0D0D0D] text-white',
    toggleBiasa: 'border-[#0D0D0D] bg-white text-[#0D0D0D] hover:bg-[#F0F0F0]',
    fokus: 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D0D0D]',
  },
} as const;

export function FasilitasStep({ ruangan, tema = 'gelap' }: { ruangan: Ruangan; tema?: TemaFasilitas }) {
  const T = TEMA_FASILITAS[tema];
  const terang = tema === 'terang';
  const adaInterior3D = INTERIOR_3D.has(ruangan.kode) || /meeting/i.test(ruangan.nama) || /mappi/i.test(ruangan.nama) || /plc/i.test(ruangan.nama);
  const [mode3D, setMode3D] = useState(adaInterior3D);
  const [i, setI] = useState(0);
  const nama = ruangan.fasilitas[i];

  return (
    <div className={`grid gap-8 lg:grid-cols-[1.1fr_1fr] ${terang ? 'lg:items-center lg:gap-12' : ''}`}>
      <div className="lg:sticky lg:top-0 lg:self-start">
        <div className={`aspect-4/3 overflow-hidden border ${terang ? 'rounded-2xl' : 'rounded-3xl'} ${T.kartu3D}`}>
          {mode3D ? (
            <Slot3D key={ruangan.kode} kode={ruangan.kode} label={ruangan.nama} ruang={{ kapasitas: ruangan.kapasitas ?? 50, pc: true, kode: ruangan.kode }} />
          ) : (
            <Slot3D key={nama} src={MODEL_3D[nama]} label={nama} />
          )}
        </div>
        <p className={`mt-3 leading-relaxed ${T.caption}`}>
          {mode3D
            ? `Model 3D interaktif ${ruangan.nama}. Putar, zoom, dan lihat tata letak ruangannya.`
            : MODEL_3D[nama]
            ? 'Geser untuk memutar, cubit atau scroll untuk zoom.'
            : 'Tampilan 3D akan muncul di sini setelah model dipasang.'}
        </p>
      </div>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className={`text-2xl font-extrabold tracking-tight ${T.judul}`}>Apa saja isi ruangannya?</h3>
          {adaInterior3D && (
            <button
              onClick={() => setMode3D((v) => !v)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${T.fokus} ${mode3D ? T.toggleAktif : T.toggleBiasa}`}
            >
              {mode3D ? '✓ 3D Ruangan Utuh (Aktif)' : 'Lihat 3D Ruangan Utuh'}
            </button>
          )}
        </div>
        {ruangan.kapasitas && <p className={`mt-2 ${terang ? 'text-xs' : 'text-sm'} ${T.sub}`}>Muat sampai {ruangan.kapasitas} orang. Pilih fasilitas untuk melihat penjelasannya.</p>}
        <ul className={`mt-5 ${terang ? 'space-y-3' : 'space-y-2'}`}>
          {ruangan.fasilitas.map((f, k) => (
            <li key={f}>
              <button
                onClick={() => { setI(k); setMode3D(false); }}
                aria-pressed={!mode3D && k === i}
                className={`w-full border text-left transition ${T.fokus} ${terang ? 'rounded-xl px-4 py-3' : 'rounded-2xl p-4'} ${!mode3D && k === i ? T.itemAktif : T.itemBiasa}`}
              >
                <span className={`flex items-center justify-between gap-3 font-bold ${terang ? 'text-sm text-[#0D0D0D]' : ''}`}>{f}<span aria-hidden className={T.ikon}>{!mode3D && k === i ? '−' : '+'}</span></span>
                {!mode3D && k === i && <span className={`sfd-in mt-2 block text-sm leading-relaxed ${T.isi}`}>{penjelasanFasilitas(f)}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// 5. SHOWCASE PILIHAN RUANGAN — berpindah mengikuti scroll
// ============================================================================
function useNarrow(force: boolean) {
  const [n, setN] = useState(force);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1179px)');
    const f = () => setN(force || mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [force]);
  return n;
}

export function PilihanRuangan({ onExplore, compact = false }: { onExplore: (kode: string) => void; compact?: boolean }) {
  const list = useMemo(() => RUANGAN.filter((r) => r.bookable), []);
  const wrap = useRef<HTMLElement>(null);
  const [idx, setIdx] = useState(0);
  const [target, setTarget] = useState<string | null>(null); // null = model ruangan, selain itu nama fasilitas
  const narrow = useNarrow(compact);

  useEffect(() => { setTarget(null); }, [idx]);

  useEffect(() => {
    let raf = 0;
    const hitung = () => {
      const el = wrap.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / total));
      setIdx(Math.min(list.length - 1, Math.floor(p * list.length)));
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(hitung); };
    hitung();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [list.length]);

  const loncat = (i: number) => {
    const el = wrap.current;
    if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    const atas = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: atas + ((i + 0.5) / list.length) * total, behavior: 'smooth' });
  };

  const aktif = list[idx] ?? list[0];
  if (!aktif) return null;
  const src = target === null ? MODEL_RUANGAN[aktif.kode] : MODEL_3D[target];
  // Dipakai untuk interior 3D bawaan (placeholder) selama model .glb ruangan belum dipasang
  const ruang = { kapasitas: aktif.kapasitas ?? 20, pc: aktif.fasilitas.some((f) => /pc|komputer/i.test(f)), kode: aktif.kode };

  return (
    <section id="pilihan" ref={wrap} style={{ height: `${list.length * 100 + 40}vh` }} className="relative" aria-label="Pilihan ruangan">
      <div className="sticky top-0 h-dvh overflow-hidden bg-[#2B2B2B]">
        {/* Background: foto ruangan, ganti mengikuti scroll */}
        {list.map((r, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={r.kode} src={fotoRuangan(r)} alt="" aria-hidden className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-900 ease-out ${i === idx ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`} />
        ))}
        <div className="absolute inset-0 bg-[#2B2B2B]/75" />
        <div className="absolute inset-0 bg-linear-to-r from-[#2B2B2B] via-[#2B2B2B]/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-[#2B2B2B] to-transparent" />

        {/* Penunjuk langkah vertikal: Bulat 1 & Garis 1, Bulat 2 & Garis 2, Bulat 3 & Garis 3 */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center md:left-10" aria-label="Daftar ruangan">
          {list.map((r, i) => {
            const aktifStep = i === idx;
            return (
              <React.Fragment key={r.kode}>
                {/* Bulat (Ring luar + dot dalam) */}
                <button
                  onClick={() => loncat(i)}
                  aria-label={r.nama}
                  aria-current={aktifStep}
                  className={`group relative flex h-8 w-8 items-center justify-center transition-transform hover:scale-110 ${FOCUS}`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      aktifStep
                        ? 'border-white bg-[#2B2B2B]/80 shadow-[0_0_12px_rgba(255,255,255,0.5)]'
                        : 'border-[#B3B3B3]/80 bg-[#2B2B2B]/50 group-hover:border-white'
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                        aktifStep
                          ? 'bg-white scale-110'
                          : 'bg-[#B3B3B3]/80 group-hover:bg-white'
                      }`}
                    />
                  </span>
                </button>
                {/* Garis vertikal pas di bawah tiap bulatan */}
                <span
                  className={`w-[2px] h-16 transition-colors duration-500 ${
                    i < idx ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.3)]' : 'bg-[#848484]/70'
                  }`}
                />
              </React.Fragment>
            );
          })}
        </div>

        {/* Teks: deskripsi ruangan */}
        <div className={`absolute transition-opacity duration-300 ${narrow ? 'left-16 right-5 top-[12%] h-[36%] md:left-28' : 'left-28 top-1/2 h-104 w-md -translate-y-1/2 xl:w-lg'}`}>
          {list.map((r, i) => (
            <div
              key={r.kode}
              aria-hidden={i !== idx}
              className={`absolute inset-x-0 top-0 transition-[opacity,transform] duration-500 ease-out ${i === idx ? 'translate-y-0 opacity-100' : `pointer-events-none opacity-0 ${i < idx ? '-translate-y-6' : 'translate-y-6'}`}`}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-[#848484]/70 bg-[#2B2B2B]/50 px-3 py-1 text-xs font-semibold text-[#E0E0E0]">
                <i className="h-2 w-2 rounded-full bg-[#E0E0E0]" />{r.kode} · {r.kapasitas} orang
              </span>
              <h2 className="mt-4 text-3xl font-extrabold leading-[1.05] tracking-tight text-[#E0E0E0] sm:text-5xl lg:mt-5 lg:text-6xl">{r.nama}</h2>
              <p className={`mt-4 max-w-md text-sm leading-relaxed text-[#E0E0E0]/85 lg:mt-5 lg:text-base ${narrow ? 'line-clamp-3' : 'line-clamp-5'}`}>{r.deskripsi}</p>
              <button tabIndex={i === idx ? 0 : -1} onClick={() => onExplore(r.kode)} className={`mt-5 inline-flex items-center gap-3 rounded-full border border-[#B3B3B3]/60 px-6 py-2.5 text-xs font-bold tracking-[0.2em] text-[#E0E0E0] transition hover:bg-[#E0E0E0] hover:text-[#2B2B2B] lg:mt-7 ${FOCUS}`}>
                EXPLORE <span aria-hidden>›</span>
              </button>
            </div>
          ))}
        </div>

        {/* Card 3D: interior ruangan yang bisa diputar (smooth fade antar ruangan tanpa remount) */}
        <div className={`absolute z-10 flex flex-col ${narrow ? 'bottom-6 left-16 right-4 top-[50%]' : 'bottom-10 right-10 top-28 w-[min(46vw,760px)] xl:right-16'}`}>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-[#565656] bg-[#2B2B2B]/60 backdrop-blur-sm">
            {list.map((r, i) => {
              const isCurrent = i === idx;
              const rTarget = isCurrent ? target : null;
              const rSrc = rTarget === null ? MODEL_RUANGAN[r.kode] : MODEL_3D[rTarget];
              const rRuang = { kapasitas: r.kapasitas ?? 20, pc: r.fasilitas.some((f) => /pc|komputer/i.test(f)), kode: r.kode };

              return (
                <div
                  key={r.kode}
                  aria-hidden={!isCurrent}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    isCurrent ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'
                  }`}
                >
                  <Slot3D
                    src={rSrc}
                    label={rTarget ?? r.nama}
                    ruang={rTarget === null ? rRuang : undefined}
                    kode={rTarget === null ? r.kode : undefined}
                    scrollSafe
                  />
                </div>
              );
            })}
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[#E0E0E0]/85">{target ? penjelasanFasilitas(target) : `Interior 3D ${aktif.nama}. Seret untuk memutar, lalu pilih fasilitas di bawah untuk melihat modelnya satu per satu.`}</p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mask-[linear-gradient(to_right,black_88%,transparent)]">
            {[null, ...aktif.fasilitas].map((f) => (
              <button key={f ?? 'ruangan'} onClick={() => setTarget(f)} aria-pressed={target === f} className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${FOCUS} ${target === f ? 'border-[#E0E0E0] bg-[#E0E0E0] text-[#2B2B2B]' : 'border-[#848484] text-[#E0E0E0] hover:border-[#E0E0E0]'}`}>{f ?? 'Ruangan'}</button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Fasilitas() {
  const rooms = RUANGAN;

  return (
    <div className="min-h-screen bg-[#2B2B2B] text-[#E0E0E0]" style={{ fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif" }}>
      <SfdStyle />
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
        <header className="rounded-3xl border border-[#565656] p-5 md:p-7">
          <Link
            href="/denah-sfd/lantai3"
            className="mb-4 inline-flex items-center gap-2 rounded-full text-sm font-bold text-[#B3B3B3] transition hover:text-[#E0E0E0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0E0E0]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Kembali ke denah lantai 3
          </Link>
          <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Fasilitas ruangan · Gedung SFD · Lantai 3</h2>
          <p className="mt-2 text-sm text-[#B3B3B3]">Pilih ruangan untuk melihat fasilitas beserta penjelasan dan tampilan 3D-nya.</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r) => {
            const adaModel = r.fasilitas.filter((f) => MODEL_3D[f]).length;
            return (
              <Link
                key={r.kode}
                href={`/denah-sfd/lantai3/${encodeURIComponent(r.kode)}`}
                className="group flex items-center justify-between rounded-2xl border border-[#565656] p-4 transition hover:border-[#E0E0E0] hover:bg-[#565656]/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0E0E0] md:flex-col md:items-start md:gap-3 md:p-5"
              >
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${r.bookable ? 'bg-[#E0E0E0]' : 'border border-[#848484]'}`} />
                  <div>
                    <h3 className="font-bold">{r.nama}</h3>
                    <p className="mt-0.5 text-xs text-[#B3B3B3]">{r.fasilitas.length} fasilitas terdaftar</p>
                  </div>
                </div>
                <span className="rounded-full border border-[#565656] px-3 py-1 text-xs font-semibold text-[#B3B3B3] group-hover:border-[#B3B3B3]">
                  {adaModel > 0 ? `${adaModel} model 3D` : '3D segera hadir'}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { Fasilitas as MainFasilitas };