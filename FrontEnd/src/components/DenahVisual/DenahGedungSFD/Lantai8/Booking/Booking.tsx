'use client';

/**
 * Booking - Gedung SFD Lantai 8
 * Isi: form & langkah "Booking" di popup ruangan (BookingStep) dan halaman daftar booking
 * (komponen tunggal responsive: Mobile, Tablet, Desktop) — tema Charcoal Noir.
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { RUANGAN, SfdStyle, BTN_TEPI, BTN_UTAMA, INPUT, LABEL, HARI_DARI_INDEX, HARI_KERJA, JAM_BUKA, JAM_TUTUP, statusHari, useHariIni } from '../Jadwal/Jadwal';
import type { Ruangan } from '../Jadwal/Jadwal';

type FormBooking = { nama: string; nim: string; kelas: string; angkatan: string; prodi: string; matkul: string; dosen: string; fakultas: string; tanggal: string; mulai: string; selesai: string };
const FORM_KOSONG: FormBooking = { nama: '', nim: '', kelas: '', angkatan: '', prodi: '', matkul: '', dosen: '', fakultas: '', tanggal: '', mulai: '', selesai: '' };
const TAHUN = new Date().getFullYear();
const ANGKATAN = Array.from({ length: 7 }, (_, i) => String(TAHUN - i));
const PRODI = ['STI', 'Pend. Teknik Informatika', 'Teknik Mesin', 'Teknik Sipil', 'Teknik Industri'];
const FIELD: { k: keyof FormBooking; label: string; ph: string; mode?: 'numeric' }[] = [
  { k: 'nama', label: 'Nama', ph: 'Nama lengkap' },
  { k: 'nim', label: 'NIM', ph: 'Contoh: 2201234567', mode: 'numeric' },
  { k: 'kelas', label: 'Kelas', ph: 'Contoh: STI-3A' },
  { k: 'prodi', label: 'Prodi', ph: 'Pilih atau ketik prodi' },
  { k: 'matkul', label: 'Mata kuliah', ph: 'Contoh: Basis Data' },
  { k: 'dosen', label: 'Dosen pengampu', ph: 'Nama dosen' },
  { k: 'fakultas', label: 'Fakultas', ph: 'Contoh: Fakultas Teknik' },
];

export function BookingStep({ ruangan }: { ruangan: Ruangan }) {
  const [f, setF] = useState<FormBooking>(FORM_KOSONG);
  const [terkirim, setTerkirim] = useState(false);
  const set = (k: keyof FormBooking) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  const hari = f.tanggal ? HARI_DARI_INDEX[new Date(`${f.tanggal}T00:00:00`).getDay()] : null;
  const hariOk = !hari || HARI_KERJA.includes(hari);
  const urut = f.mulai !== '' && f.selesai !== '' && f.mulai < f.selesai;
  const jamOk = urut && f.mulai >= JAM_BUKA && f.selesai <= JAM_TUTUP;
  const bentrok = useMemo(
    () => (hari && urut ? ruangan.jadwal.filter((s) => s.hari === hari && f.mulai < s.selesai && f.selesai > s.mulai) : []),
    [hari, urut, f.mulai, f.selesai, ruangan.jadwal],
  );
  const nimOk = /^\d+$/.test(f.nim.trim());
  const lengkap = FIELD.every(({ k }) => f[k].trim() !== '') && f.angkatan !== '' && f.tanggal !== '' && nimOk && hariOk && jamOk && bentrok.length === 0;

  if (!ruangan.bookable) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-[#565656] p-8 text-center">
        <h3 className="text-xl font-extrabold">Ruangan ini tidak bisa dibooking</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#B3B3B3]">{ruangan.keterangan}</p>
      </div>
    );
  }

  if (terkirim) {
    return (
      <div className="sfd-in mx-auto max-w-lg rounded-3xl border border-[#E0E0E0] p-8">
        <h3 className="text-2xl font-extrabold tracking-tight">Booking diajukan</h3>
        <p className="mt-2 text-sm text-[#B3B3B3]">Simpan ringkasan ini. Pengajuan akan ditinjau pengelola ruangan.</p>
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
          {[['Ruangan', `${ruangan.kode} · ${ruangan.nama}`], ['Waktu', `${hari}, ${f.tanggal} · ${f.mulai}–${f.selesai}`], ['Peminjam', `${f.nama} (${f.nim})`], ['Kelas', `${f.kelas} · angkatan ${f.angkatan}`], ['Prodi', `${f.prodi} · ${f.fakultas}`], ['Mata kuliah', `${f.matkul} · ${f.dosen}`]].map(([a, b]) => (
            <React.Fragment key={a}><dt className="text-[#B3B3B3]">{a}</dt><dd className="font-semibold">{b}</dd></React.Fragment>
          ))}
        </dl>
        <button onClick={() => { setF(FORM_KOSONG); setTerkirim(false); }} className={`${BTN_TEPI} mt-7 w-full`}>Booking jadwal lain</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h3 className="text-2xl font-extrabold tracking-tight">Booking {ruangan.nama}</h3>
      <p className="mt-2 text-sm text-[#B3B3B3]">Semua kolom wajib diisi. Peminjaman hanya Senin–Jumat, {JAM_BUKA.replace(':', '.')}–{JAM_TUTUP.replace(':', '.')}.</p>
      <datalist id="daftar-prodi">{PRODI.map((p) => <option key={p} value={p} />)}</datalist>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {FIELD.map(({ k, label, ph, mode }) => (
          <div key={k}>
            <label htmlFor={`bk-${k}`} className={LABEL}>{label}</label>
            <input id={`bk-${k}`} className={INPUT} value={f[k]} onChange={set(k)} placeholder={ph} inputMode={mode} list={k === 'prodi' ? 'daftar-prodi' : undefined} autoComplete="off" />
          </div>
        ))}
        <div>
          <label htmlFor="bk-angkatan" className={LABEL}>Angkatan</label>
          <select id="bk-angkatan" className={INPUT} value={f.angkatan} onChange={set('angkatan')}>
            <option value="">Pilih angkatan</option>
            {ANGKATAN.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="bk-tanggal" className={LABEL}>Tanggal</label>
          <input id="bk-tanggal" type="date" className={INPUT} value={f.tanggal} onChange={set('tanggal')} min={new Date().toISOString().slice(0, 10)} />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:col-span-2">
          <div><label htmlFor="bk-mulai" className={LABEL}>Jam mulai</label><input id="bk-mulai" type="time" className={INPUT} value={f.mulai} onChange={set('mulai')} min={JAM_BUKA} max={JAM_TUTUP} /></div>
          <div><label htmlFor="bk-selesai" className={LABEL}>Jam selesai</label><input id="bk-selesai" type="time" className={INPUT} value={f.selesai} onChange={set('selesai')} min={JAM_BUKA} max={JAM_TUTUP} /></div>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm" role="status">
        {f.nim && !nimOk && <p className="font-semibold text-[#E0E0E0]">NIM hanya boleh berisi angka.</p>}
        {!hariOk && <p className="font-semibold text-[#E0E0E0]">Tanggal ini jatuh di hari {hari}. Pilih tanggal Senin sampai Jumat.</p>}
        {f.mulai && f.selesai && !urut && <p className="font-semibold text-[#E0E0E0]">Jam selesai harus setelah jam mulai.</p>}
        {urut && !jamOk && <p className="font-semibold text-[#E0E0E0]">Waktu harus berada di antara {JAM_BUKA} dan {JAM_TUTUP}.</p>}
        {bentrok.length > 0 && (
          <div className="rounded-2xl border border-[#E0E0E0] p-4">
            <p className="font-bold">Jadwal bentrok. Ubah jam atau tanggal.</p>
            <ul className="mt-2 space-y-1 text-[#B3B3B3]">
              {bentrok.map((s) => <li key={s.mulai}>{s.kegiatan} ({s.mulai}–{s.selesai}) · PJ {s.pj}, {s.kontak}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* TODO: kirim `f` ke API booking di sini */}
      <button onClick={() => setTerkirim(true)} disabled={!lengkap} className={`${BTN_UTAMA} mt-6 w-full sm:w-auto`}>Ajukan booking</button>
    </div>
  );
}

export default function Booking() {
  const hariIni = useHariIni();
  // Ruangan yang bisa dibooking tampil dulu, fasilitas umum di bawah
  const rooms = [...RUANGAN].sort((a, b) => Number(b.bookable) - Number(a.bookable));

  return (
    <div className="min-h-screen bg-[#2B2B2B] text-[#E0E0E0]" style={{ fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif" }}>
      <SfdStyle />
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
        <header className="rounded-3xl border border-[#565656] p-5 md:p-7">
          <Link
            href="/denah-sfd/lantai8"
            className="mb-4 inline-flex items-center gap-2 rounded-full text-sm font-bold text-[#B3B3B3] transition hover:text-[#E0E0E0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0E0E0]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Kembali ke denah lantai 8
          </Link>
          <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Booking ruangan · Gedung SFD · Lantai 8</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#B3B3B3]">
            Peminjaman Senin–Jumat, {JAM_BUKA.replace(':', '.')}–{JAM_TUTUP.replace(':', '.')}. Sebaiknya cek jadwal dan fasilitas dulu sebelum booking.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r) => (
            <Link
              key={r.kode}
              href={`/denah-sfd/lantai8/${encodeURIComponent(r.kode)}`}
              className={`group flex items-center justify-between rounded-2xl border p-4 transition hover:border-[#E0E0E0] hover:bg-[#565656]/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0E0E0] md:flex-col md:items-start md:gap-3 md:p-5 ${r.bookable ? 'border-[#565656]' : 'border-[#565656]/60 opacity-70'}`}
            >
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 shrink-0 rounded-full ${r.bookable ? 'bg-[#E0E0E0]' : 'border border-[#848484]'}`} />
                <div>
                  <h3 className="font-bold">{r.nama}</h3>
                  <p className="mt-0.5 text-xs text-[#B3B3B3]">
                    {r.bookable ? `${r.kode} · ${r.kapasitas} orang` : `${r.kode} · tidak bisa dibooking`}
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-[#565656] px-3 py-1 text-xs font-semibold text-[#B3B3B3] group-hover:border-[#B3B3B3]">
                {statusHari(r, hariIni)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export { Booking as MainBooking };
