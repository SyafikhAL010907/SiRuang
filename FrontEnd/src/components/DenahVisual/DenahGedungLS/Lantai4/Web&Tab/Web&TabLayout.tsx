'use client';

import React, { useEffect, useMemo, useState } from 'react';

// ============================================================================
// 1. DATA RUANGAN & TIPE - LANTAI 4
// ============================================================================
export type Hari = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';
export type RoomCode =
  | 'DOSEN_INSTRUMENTASI'
  | 'R401'
  | 'TOILET'
  | 'DOSEN_ELEKTRONIKA'
  | 'TPJM'
  | 'R403'
  | 'DOSEN_MEKATRONIKA'
  | 'R407'
  | 'R406B'
  | 'DOSEN_TELEKOMUNIKASI'
  | 'R406A'
  | 'R405';

export const URUTAN_HARI: Hari[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
export const HARI_DARI_INDEX: Hari[] = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export type Jadwal = { hari: Hari; mulai: string; selesai: string; kegiatan: string; kelas: string; prodi: string; dosen: string; pj: string; kontak: string; };
export type RoomInfo = { kode: RoomCode; nama: string; bookable: boolean; kapasitas?: number; keterangan?: string; fasilitas: string[]; jadwal: Jadwal[]; };

const j = (hari: Hari, mulai: string, selesai: string, kegiatan: string, kelas: string, prodi: string, dosen: string, pj: string, kontak: string): Jadwal =>
  ({ hari, mulai, selesai, kegiatan, kelas, prodi, dosen, pj, kontak });

const PTE = 'Pendidikan Teknik Elektro';
const PTMK = 'Pendidikan Teknik Mekatronika';

// DATA DI BAWAH INI DUMMY - ganti dengan data asli / fetch API
export const ROOMS: Record<RoomCode, RoomInfo> = {
  // ===== KODE RUANGAN: DOSEN_INSTRUMENTASI - R. Dosen Instrumentasi Kendali =====
  DOSEN_INSTRUMENTASI: {
    kode: 'DOSEN_INSTRUMENTASI', nama: 'R. Dosen Instrumentasi Kendali', bookable: false, keterangan: 'Ruang khusus dosen Instrumentasi Kendali.',
    fasilitas: ['AC', 'Meja Kerja Dosen', 'WiFi'], jadwal: [],
  },

  // ===== KODE RUANGAN: R401 - R. 401 Ruang Teknisi Laboratorium/Toolman =====
  R401: {
    kode: 'R401', nama: 'R. 401 Ruang Teknisi Laboratorium/Toolman', bookable: false, keterangan: 'Ruang khusus teknisi laboratorium dan toolman.',
    fasilitas: ['Lemari Peralatan', 'Meja Kerja', 'Rak Tools'], jadwal: [],
  },

  // ===== KODE RUANGAN: TOILET =====
  TOILET: {
    kode: 'TOILET', nama: 'Toilet', bookable: false, keterangan: 'Fasilitas umum lantai 4.',
    fasilitas: ['Wastafel', 'Bilik toilet'], jadwal: [],
  },

  // ===== KODE RUANGAN: DOSEN_ELEKTRONIKA - R. Dosen Elektronika Dasar =====
  DOSEN_ELEKTRONIKA: {
    kode: 'DOSEN_ELEKTRONIKA', nama: 'R. Dosen Elektronika Dasar', bookable: false, keterangan: 'Ruang khusus dosen Elektronika Dasar.',
    fasilitas: ['AC', 'Meja Kerja Dosen', 'WiFi'], jadwal: [],
  },

  // ===== KODE RUANGAN: TPJM - R. TPjM =====
  TPJM: {
    kode: 'TPJM', nama: 'R. TPjM', bookable: false, keterangan: 'Ruang TPjM.',
    fasilitas: ['AC', 'Meja Kerja', 'WiFi'], jadwal: [],
  },

  // ===== KODE RUANGAN: R403 - R. 403 Lab. Mekatronika dan Robotika =====
  R403: {
    kode: 'R403', nama: 'R. 403 Lab. Mekatronika dan Robotika', bookable: true, kapasitas: 30,
    fasilitas: ['Trainer Mekatronika', 'Kit Robotika', 'PLC Trainer', 'PC Workstation', 'AC', 'Proyektor'],
    jadwal: [
      j('Senin', '08:00', '11:00', 'Praktikum Mekatronika', 'PTMK-3A', PTMK, 'Pak Eko, M.T.', 'Rangga', '0812-4030-0001'),
      j('Rabu', '13:00', '16:00', 'Praktikum Robotika', 'PTMK-3B', PTMK, 'Bu Wulan, M.T.', 'Dina', '0812-4030-0002'),
    ],
  },

  // ===== KODE RUANGAN: DOSEN_MEKATRONIKA - R. Dosen Mekatronika dan Robotika =====
  DOSEN_MEKATRONIKA: {
    kode: 'DOSEN_MEKATRONIKA', nama: 'R. Dosen Mekatronika dan Robotika', bookable: false, keterangan: 'Ruang khusus dosen Mekatronika dan Robotika.',
    fasilitas: ['AC', 'Meja Kerja Dosen', 'WiFi'], jadwal: [],
  },

  // ===== KODE RUANGAN: R407 - R. 407 Lab. Elektronika Dasar, Digital dan Audio Video =====
  R407: {
    kode: 'R407', nama: 'R. 407 Lab. Elektronika Dasar, Digital dan Audio Video', bookable: true, kapasitas: 36,
    fasilitas: ['Trainer Elektronika Dasar', 'Trainer Digital', 'Perangkat Audio Video', 'Osiloskop', 'AC', 'Proyektor'],
    jadwal: [
      j('Senin', '09:00', '12:00', 'Praktikum Elektronika Dasar', 'PTE-1A', PTE, 'Pak Bambang, M.T.', 'Siti', '0812-4070-0001'),
      j('Kamis', '13:00', '16:00', 'Praktikum Sistem Digital', 'PTE-2A', PTE, 'Pak Bambang, M.T.', 'Budi', '0812-4070-0002'),
    ],
  },

  // ===== KODE RUANGAN: R406B - R. 406B Ruang Rapat dan Perpustakaan =====
  R406B: {
    kode: 'R406B', nama: 'R. 406B Ruang Rapat dan Perpustakaan', bookable: true, kapasitas: 20,
    keterangan: 'Ruang rapat sekaligus perpustakaan jurusan.',
    fasilitas: ['Meja Rapat', 'Rak Buku', 'Proyektor', 'AC', 'WiFi'],
    jadwal: [
      j('Selasa', '10:00', '11:30', 'Rapat Prodi', 'INTERNAL', 'Fakultas Teknik', 'Koordinator Prodi', 'Admin Prodi', '0812-4060-0001'),
      j('Jumat', '13:30', '15:00', 'Rapat Dosen', 'INTERNAL', 'Fakultas Teknik', 'Ketua Jurusan', 'Admin Jurusan', '0812-4060-0002'),
    ],
  },

  // ===== KODE RUANGAN: DOSEN_TELEKOMUNIKASI - R. Dosen Telekomunikasi =====
  DOSEN_TELEKOMUNIKASI: {
    kode: 'DOSEN_TELEKOMUNIKASI', nama: 'R. Dosen Telekomunikasi', bookable: false, keterangan: 'Ruang khusus dosen Telekomunikasi.',
    fasilitas: ['AC', 'Meja Kerja Dosen', 'WiFi'], jadwal: [],
  },

  // ===== KODE RUANGAN: R406A - R. 406A Lab. Telekomunikasi =====
  R406A: {
    kode: 'R406A', nama: 'R. 406A Lab. Telekomunikasi', bookable: true, kapasitas: 30,
    fasilitas: ['Trainer Telekomunikasi', 'Trainer Antena', 'Spectrum Analyzer', 'AC', 'Proyektor'],
    jadwal: [
      j('Selasa', '08:00', '11:00', 'Praktikum Telekomunikasi', 'PTE-3A', PTE, 'Pak Hadi, M.T.', 'Reza', '0812-4061-0001'),
      j('Jumat', '08:00', '11:00', 'Praktikum Antena dan Propagasi', 'PTE-3B', PTE, 'Pak Hadi, M.T.', 'Keysha', '0812-4061-0002'),
    ],
  },

  // ===== KODE RUANGAN: R405 - R. 405 Lab. Sistem Instrumentasi Kendali =====
  R405: {
    kode: 'R405', nama: 'R. 405 Lab. Sistem Instrumentasi Kendali', bookable: true, kapasitas: 36,
    fasilitas: ['Trainer Instrumentasi', 'Trainer Kendali', 'PLC', 'Sensor Kit', 'PC', 'AC'],
    jadwal: [
      j('Senin', '13:00', '16:00', 'Praktikum Sistem Kendali', 'PTE-3B', PTE, 'Pak Eko, M.T.', 'Rafif', '0812-4050-0001'),
      j('Rabu', '08:00', '11:00', 'Praktikum Instrumentasi', 'PTE-3A', PTE, 'Bu Wulan, M.T.', 'Lina', '0812-4050-0002'),
    ],
  },
};

export const BOOKABLE_ROOMS = Object.values(ROOMS).filter(r => r.bookable);

// ============================================================================
// 2. KOMPONEN DENAH SVG (GEDUNG LE - LANTAI 4)
//    Koordinat dipetakan dari foto denah (perspektif foto sudah diluruskan).
//    viewBox "40 55 1750 650"
// ============================================================================
// ============================================================================
// 2. KOMPONEN DENAH SVG (GEDUNG LS - LANTAI 4) - Diimpor dari DenahL4LS/DenahL4LS.tsx
// ============================================================================
export { DenahL4LS, FloorPlanSvg } from '../DenahL4LS/DenahL4LS';
import { DenahL4LS, FloorPlanSvg } from '../DenahL4LS/DenahL4LS';

export function FloorPlanLegend({ className = '' }: { className?: string }) {
  const item = 'flex items-center gap-2 text-xs font-medium text-slate-500';
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}>
      <span className={item}><i className="h-3 w-3 rounded-sm border border-slate-400 bg-white" /> Bisa dibooking</span>
      <span className={item}><i className="h-3 w-3 rounded-sm border border-slate-400 bg-slate-100" /> Tidak bisa dibooking</span>
      <span className={item}><i className="h-3 w-3 rounded-sm border border-sky-600 bg-sky-200" /> Dipilih</span>
    </div>
  );
}

export function DaftarRuangan({ selected, onSelect, grid = false }: any) {
  return (
    <ul className={grid ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}>
      {Object.values(ROOMS).map((r) => (
        <li key={r.kode}>
          <button onClick={() => onSelect(r.kode)} className={`flex w-full items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-all ${selected === r.kode ? 'border-sky-500 bg-sky-50 text-sky-800 shadow-sm' : 'border-slate-100 bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50'}`}>
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.bookable ? 'bg-sky-500 shadow-sm shadow-sky-400' : 'bg-slate-300'}`} /> <span className="truncate">{r.nama}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// 3. UI POP-UP PREMIUM (BOOKING, JADWAL, FASILITAS)
// ============================================================================
type Tab = 'booking' | 'jadwal' | 'fasilitas';
const INPUT = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10';
const LABEL = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500';

function TabBooking({ ruangan }: { ruangan: RoomInfo }) {
  const [form, setForm] = useState({ nama: '', kontak: '', tanggal: '', mulai: '', selesai: '', keperluan: '' });
  const [terkirim, setTerkirim] = useState(false);
  const set = (k: keyof typeof form) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const waktuValid = form.mulai !== '' && form.selesai !== '' && form.mulai < form.selesai;

  const bentrok = useMemo(() => {
    if (!form.tanggal || !waktuValid) return [];
    const hari = HARI_DARI_INDEX[new Date(`${form.tanggal}T00:00:00`).getDay()];
    return ruangan.jadwal.filter((s) => s.hari === hari && form.mulai < s.selesai && form.selesai > s.mulai);
  }, [form, waktuValid, ruangan.jadwal]);

  const lengkap = form.nama.trim() !== '' && form.kontak.trim() !== '' && form.tanggal !== '' && waktuValid;

  if (!ruangan.bookable) return <div className="rounded-xl bg-slate-50 p-6 text-center"><span className="mb-2 block text-3xl">🔒</span><h4 className="font-bold text-slate-800">Ruangan Terkunci</h4><p className="text-sm text-slate-500">{ruangan.keterangan}</p></div>;
  if (terkirim) return <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center"><span className="mb-3 block text-4xl">✅</span><h4 className="text-lg font-bold text-emerald-800">Booking Berhasil Diajukan!</h4><p className="mt-2 text-sm text-emerald-700"><strong>{ruangan.nama}</strong><br />{form.tanggal} | {form.mulai} – {form.selesai}</p><button onClick={() => setTerkirim(false)} className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700">Booking Jadwal Lain</button></div>;

  return (
    <div className="space-y-4">
      <div><label className={LABEL}>Nama Peminjam</label><input className={INPUT} value={form.nama} onChange={set('nama')} placeholder="Masukkan nama lengkap..." /></div>
      <div><label className={LABEL}>Kontak (WA / Akun)</label><input className={INPUT} value={form.kontak} onChange={set('kontak')} placeholder="0812xxxx / @username" /></div>
      <div><label className={LABEL}>Tanggal Booking</label><input type="date" className={INPUT} value={form.tanggal} onChange={set('tanggal')} min={new Date().toISOString().slice(0, 10)} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className={LABEL}>Jam Mulai</label><input type="time" className={INPUT} value={form.mulai} onChange={set('mulai')} /></div>
        <div><label className={LABEL}>Jam Selesai</label><input type="time" className={INPUT} value={form.selesai} onChange={set('selesai')} /></div>
      </div>
      {form.mulai && form.selesai && !waktuValid && <p className="text-xs font-medium text-rose-500">⚠️ Jam selesai harus setelah jam mulai.</p>}
      <div><label className={LABEL}>Keperluan</label><textarea className={INPUT} rows={2} value={form.keperluan} onChange={set('keperluan')} placeholder="Contoh: Praktikum pengganti..." /></div>

      {bentrok.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-900">⚠️ Jadwal Bentrok!</p><ul className="mt-3 space-y-3">{bentrok.map((s) => (<li key={`${s.hari}-${s.mulai}`} className="rounded-lg bg-white p-3 text-sm border border-amber-100 shadow-sm"><span className="font-bold text-slate-800">{s.kegiatan}</span> <span className="text-sky-600">({s.mulai}–{s.selesai})</span><p className="mt-1 text-xs text-slate-500">PJ: {s.pj} <span className="font-bold text-amber-700">({s.kontak})</span></p></li>))}</ul></div>
      )}
      <button onClick={() => setTerkirim(true)} disabled={!lengkap} className="mt-2 w-full rounded-xl bg-linear-to-r from-sky-600 to-blue-600 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.01] hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none">{bentrok.length > 0 ? 'Ajukan Paksa' : 'Ajukan Booking Sekarang'}</button>
    </div>
  );
}

function TabJadwal({ ruangan }: { ruangan: RoomInfo }) {
  const [hariAktif, setHariAktif] = useState<Hari>(HARI_DARI_INDEX[new Date().getDay()]);
  if (ruangan.jadwal.length === 0) return <div className="rounded-xl bg-slate-50 p-6 text-center"><span className="mb-2 block text-3xl">📅</span><p className="text-sm font-medium text-slate-500">Belum ada jadwal terdaftar untuk ruangan ini.</p></div>;

  const jadwalHariIni = ruangan.jadwal.filter((s) => s.hari === hariAktif).sort((a, b) => a.mulai.localeCompare(b.mulai));

  return (
    <div className="space-y-5 pb-8">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-hide">
        {URUTAN_HARI.map((h) => (
          <button key={h} onClick={() => setHariAktif(h)} className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-all ${hariAktif === h ? 'bg-sky-600 text-white shadow-md shadow-sky-500/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{h}</button>
        ))}
      </div>
      {jadwalHariIni.length === 0 ? <p className="rounded-xl border border-slate-100 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">Tidak ada kelas di hari {hariAktif}. Ruangan kosong! 🎉</p> : (
        <ul className="space-y-4">
          {jadwalHariIni.map((s) => (
            <li key={`${s.hari}-${s.mulai}`} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-sky-300 hover:shadow-md p-5 pl-6">
              <div className="absolute bottom-0 left-0 top-0 w-2 bg-sky-500" />
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-bold text-slate-800 text-base">{s.kegiatan}</h4>
                  <p className="text-xs font-semibold text-sky-600 mt-0.5">{s.kelas} · {s.prodi}</p>
                </div>
                <span className="rounded-md bg-sky-100 px-2 py-1 text-xs font-black text-sky-700 shrink-0">{s.mulai} – {s.selesai}</span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-400">Dosen</span><span className="font-semibold text-slate-700">{s.dosen}</span>
                <span className="font-semibold text-slate-400">PJ Kelas</span><span className="font-semibold text-slate-700">{s.pj} <span className="text-sky-600 ml-1">({s.kontak})</span></span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TabFasilitas({ ruangan }: { ruangan: RoomInfo }) {
  return (
    <div className="space-y-5">
      {(ruangan.kapasitas || ruangan.keterangan) && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          {ruangan.kapasitas && <p className="font-bold text-blue-900">👥 Kapasitas Maksimal: {ruangan.kapasitas} Orang</p>}
          {ruangan.keterangan && <p className="mt-1 text-xs text-blue-700">{ruangan.keterangan}</p>}
        </div>
      )}
      <div>
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Daftar Fasilitas</h4>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ruangan.fasilitas.map((f) => (
            <li key={f} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-600">✔️</div><span className="text-sm font-semibold text-slate-700">{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function RoomPopup({ ruangan, onClose }: { ruangan: RoomInfo; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>(ruangan.bookable ? 'booking' : 'jadwal');
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    // Animasi muncul (Scale up / Fade In)
    requestAnimationFrame(() => setIsOpening(true));

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, []);

  // Animasi hilang (Scale down / Fade Out) sebelum function onClose dipanggil
  const handleClose = () => {
    setIsOpening(false);
    setTimeout(onClose, 300);
  };

  const tombol: { id: Tab; label: string }[] = [{ id: 'booking', label: ' Booking' }, { id: 'jadwal', label: ' Jadwal' }, { id: 'fasilitas', label: ' Fasilitas' }];

  return (
    <div
      className={`fixed inset-0 z-999 flex flex-col justify-end sm:items-center sm:justify-center transition-colors duration-300 ${isOpening ? 'bg-slate-900/60 backdrop-blur-sm' : 'bg-transparent backdrop-blur-none'}`}
      onClick={handleClose}
    >
      <div
        className={`flex w-full flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300 transform 
          ${isOpening ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-20 sm:translate-y-0 sm:scale-95 opacity-0'}
          h-[92vh] sm:h-auto sm:max-h-[90vh] sm:max-w-lg rounded-t-4xl sm:rounded-4xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-linear-to-br from-blue-600 to-sky-500 p-6 pt-10 sm:pt-8 text-white">
          <button onClick={handleClose} className="absolute right-5 top-6 sm:top-5 rounded-full bg-white/20 p-2 text-white backdrop-blur-md transition hover:bg-white/40">✕</button>
          <span className="mb-2 inline-block rounded-md bg-white/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider">{ruangan.kode} · Lantai 4</span>
          <h3 className="text-2xl font-black tracking-tight">{ruangan.nama}</h3>
        </div>
        <div className="px-5 pt-5">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1.5 shadow-inner">
            {tombol.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${tab === t.id ? 'bg-white text-sky-600 shadow' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'}`}>{t.label}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {tab === 'booking' && <TabBooking ruangan={ruangan} />} {tab === 'jadwal' && <TabJadwal ruangan={ruangan} />} {tab === 'fasilitas' && <TabFasilitas ruangan={ruangan} />}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. MAIN LAYOUT: WEB & TAB (TAMPILAN WEB)
// ============================================================================
export default function WebTabLayout() {
  const [selectedCode, setSelectedCode] = useState<RoomCode | null>(null);
  const selectedRoom = selectedCode ? ROOMS[selectedCode] : null;

  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-8 bg-slate-50/50 min-h-screen">
      <header className="mb-6">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Denah Gedung LE · Lantai 4</h2>
        <p className="text-sm text-slate-500 mt-1 font-medium">Klik pada ruangan interaktif untuk melihat jadwal, fasilitas, atau mengajukan booking.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <div className="mb-5"><FloorPlanLegend /></div>
          <div className="overflow-x-auto scrollbar-hide">
            <FloorPlanSvg selectedCode={selectedCode} onSelectRoom={(c) => setSelectedCode(c as RoomCode)} className="block h-auto w-full min-w-175" />
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm lg:self-start">
          <h3 className="mb-4 px-1 text-sm font-bold text-slate-800 uppercase tracking-wider">Daftar Ruangan</h3>
          <DaftarRuangan selected={selectedCode} onSelect={(c: any) => setSelectedCode(c)} />
        </aside>
      </div>

      {selectedRoom && <RoomPopup key={selectedRoom.kode} ruangan={selectedRoom} onClose={() => setSelectedCode(null)} />}
    </div>
  );
}
