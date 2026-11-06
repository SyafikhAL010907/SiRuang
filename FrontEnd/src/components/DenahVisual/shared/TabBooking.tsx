'use client';

/**
 * Shared Booking Tab Component
 * Used in room detail pages across all buildings.
 */

import React, { useMemo, useState } from 'react';
import { HARI_DARI_INDEX, type RoomInfo } from './types';

const INPUT =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10';
const LABEL = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500';

export default function TabBooking({ ruangan }: { ruangan: RoomInfo }) {
  const [form, setForm] = useState({
    nama: '',
    kontak: '',
    tanggal: '',
    mulai: '',
    selesai: '',
    keperluan: '',
  });
  const [terkirim, setTerkirim] = useState(false);
  const set = (k: keyof typeof form) => (e: any) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const waktuValid = form.mulai !== '' && form.selesai !== '' && form.mulai < form.selesai;

  const bentrok = useMemo(() => {
    if (!form.tanggal || !waktuValid) return [];
    const hari = HARI_DARI_INDEX[new Date(`${form.tanggal}T00:00:00`).getDay()];
    return ruangan.jadwal.filter(
      (s) => s.hari === hari && form.mulai < s.selesai && form.selesai > s.mulai
    );
  }, [form, waktuValid, ruangan.jadwal]);

  const lengkap =
    form.nama.trim() !== '' &&
    form.kontak.trim() !== '' &&
    form.tanggal !== '' &&
    waktuValid;

  if (!ruangan.bookable) {
    return (
      <div className="rounded-xl bg-slate-50 p-6 text-center">
        <span className="mb-2 block text-3xl">🔒</span>
        <h4 className="font-bold text-slate-800">Ruangan Terkunci</h4>
        <p className="text-sm text-slate-500">{ruangan.keterangan || 'Ruangan ini tidak bisa dibooking.'}</p>
      </div>
    );
  }

  if (terkirim) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center">
        <span className="mb-3 block text-4xl">✅</span>
        <h4 className="text-lg font-bold text-emerald-800">Booking Berhasil Diajukan!</h4>
        <p className="mt-2 text-sm text-emerald-700">
          <strong>{ruangan.nama}</strong>
          <br />
          {form.tanggal} | {form.mulai} – {form.selesai}
        </p>
        <button
          onClick={() => setTerkirim(false)}
          className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          Booking Jadwal Lain
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={LABEL}>Nama Peminjam</label>
        <input className={INPUT} value={form.nama} onChange={set('nama')} placeholder="Masukkan nama lengkap..." />
      </div>
      <div>
        <label className={LABEL}>Kontak (WA / Akun)</label>
        <input className={INPUT} value={form.kontak} onChange={set('kontak')} placeholder="0812xxxx / @username" />
      </div>
      <div>
        <label className={LABEL}>Tanggal Booking</label>
        <input
          type="date"
          className={INPUT}
          value={form.tanggal}
          onChange={set('tanggal')}
          min={new Date().toISOString().slice(0, 10)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Jam Mulai</label>
          <input type="time" className={INPUT} value={form.mulai} onChange={set('mulai')} />
        </div>
        <div>
          <label className={LABEL}>Jam Selesai</label>
          <input type="time" className={INPUT} value={form.selesai} onChange={set('selesai')} />
        </div>
      </div>
      {form.mulai && form.selesai && !waktuValid && (
        <p className="text-xs font-medium text-rose-500">⚠️ Jam selesai harus setelah jam mulai.</p>
      )}
      <div>
        <label className={LABEL}>Keperluan</label>
        <textarea
          className={INPUT}
          rows={2}
          value={form.keperluan}
          onChange={set('keperluan')}
          placeholder="Contoh: Praktikum pengganti..."
        />
      </div>

      {bentrok.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">⚠️ Jadwal Bentrok!</p>
          <ul className="mt-3 space-y-3">
            {bentrok.map((s) => (
              <li
                key={`${s.hari}-${s.mulai}`}
                className="rounded-lg bg-white p-3 text-sm border border-amber-100 shadow-sm"
              >
                <span className="font-bold text-slate-800">{s.kegiatan}</span>{' '}
                <span className="text-sky-600">
                  ({s.mulai}–{s.selesai})
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  PJ: {s.pj}{' '}
                  <span className="font-bold text-amber-700">({s.kontak})</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        onClick={() => setTerkirim(true)}
        disabled={!lengkap}
        className="mt-2 w-full rounded-xl bg-linear-to-r from-sky-600 to-blue-600 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.01] hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none"
      >
        {bentrok.length > 0 ? 'Ajukan Paksa' : 'Ajukan Booking Sekarang'}
      </button>
    </div>
  );
}
