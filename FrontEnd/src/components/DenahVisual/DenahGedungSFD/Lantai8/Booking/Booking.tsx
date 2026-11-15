'use client';

/**
 * Booking - Gedung SFD Lantai 8
 * Isi: form & langkah "Booking" di popup ruangan (BookingStep) dan halaman daftar booking
 * Terintegrasi dengan Akun PJ Kelas, Course Relations, dan API Bookings SiRuang.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  RUANGAN,
  SfdStyle,
  BTN_TEPI,
  BTN_UTAMA,
  INPUT,
  LABEL,
  HARI_DARI_INDEX,
  HARI_KERJA,
  JAM_BUKA,
  JAM_TUTUP,
  statusHari,
  useHariIni,
} from '../Jadwal/Jadwal';
import type { Ruangan } from '../Jadwal/Jadwal';
import { useMyProfile, loadMyProfile } from '@/lib/profileStore';
import { AlertTriangle, CheckCircle2, Clock, Lock, Sparkles, RefreshCw, MapPin, XCircle } from 'lucide-react';

export type TemaBooking = 'gelap' | 'terang';

interface UserRelation {
  id: string;
  mata_kuliah: string;
  kelas: string;
  dosen_id: number;
  nama_dosen: string;
  dosen_nidn: string;
  dosen_email: string;
  jadwal_hari: string;
  jadwal_jam: string;
  semester: string;
}

type FormBooking = {
  nama: string;
  nim: string;
  kelas: string;
  angkatan: string;
  prodi: string;
  matkul: string;
  dosen: string;
  dosen_id: number | null;
  relation_id: string | null;
  fakultas: string;
  tanggal: string;
  sks: number;
  mulai: string;
  selesai: string;
};

const FORM_KOSONG: FormBooking = {
  nama: '',
  nim: '',
  kelas: '',
  angkatan: '',
  prodi: '',
  matkul: '',
  dosen: '',
  dosen_id: null,
  relation_id: null,
  fakultas: '',
  tanggal: '',
  sks: 2,
  mulai: '08:00',
  selesai: '09:40',
};

function addMinutesToTime(timeStr: string, minutes: number): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return '';
  const total = h * 60 + m + minutes;
  const endH = Math.floor(total / 60);
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

const TEMA_BOOKING = {
  gelap: {
    judul: '',
    sub: 'text-sm text-[#B3B3B3]',
    label: LABEL,
    input: INPUT,
    inputDisabled: 'w-full rounded-2xl border border-[#444] bg-[#222]/80 px-4 py-3 text-xs text-[#999] cursor-not-allowed select-none opacity-85',
    btnUtama: BTN_UTAMA,
    btnTepi: BTN_TEPI,
    pesan: 'font-semibold text-[#E0E0E0]',
    kotakBentrok: 'rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-200',
    listBentrok: 'mt-2 space-y-1 text-amber-300/80 text-xs',
    kartuTutup: 'rounded-3xl border border-[#565656] p-8',
    kartuOk: 'rounded-3xl border border-[#E0E0E0] p-8',
    dt: 'text-[#B3B3B3]',
  },
  terang: {
    judul: 'text-[#0D0D0D]',
    sub: 'text-xs text-[#3A3A3A]',
    label: 'mb-1 block text-[10px] font-bold text-[#0D0D0D]',
    input: 'w-full rounded-xl border border-[#0D0D0D] bg-white px-4 py-2.5 text-xs text-[#0D0D0D] outline-none transition placeholder:text-[#9A9A9A] focus:ring-4 focus:ring-black/10 [color-scheme:light]',
    inputDisabled: 'w-full rounded-xl border border-slate-300 bg-slate-100/80 px-4 py-2.5 text-xs text-slate-500 cursor-not-allowed select-none [color-scheme:light]',
    btnUtama: 'inline-flex items-center justify-center gap-2 rounded-full bg-[#0D0D0D] px-6 py-3 text-sm font-bold text-white transition hover:bg-black disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D0D0D]',
    btnTepi: 'inline-flex items-center justify-center gap-2 rounded-full border border-[#0D0D0D] bg-white px-6 py-3 text-sm font-semibold text-[#0D0D0D] transition hover:bg-[#F0F0F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D0D0D]',
    pesan: 'text-xs font-bold text-[#0D0D0D]',
    kotakBentrok: 'rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900',
    listBentrok: 'mt-2 space-y-1 text-amber-800 text-xs',
    kartuTutup: 'rounded-3xl border border-[#0D0D0D] bg-white p-8',
    kartuOk: 'rounded-3xl border border-[#0D0D0D] bg-white p-8',
    dt: 'text-[#3A3A3A]',
  },
} as const;

export function BookingStep({
  ruangan,
  initialBooking,
  tema = 'gelap',
  onClose,
}: {
  ruangan: Ruangan;
  initialBooking?: any;
  tema?: TemaBooking;
  onClose?: () => void;
}) {
  const T = TEMA_BOOKING[tema];
  const terang = tema === 'terang';

  const { profile } = useMyProfile();
  const [relations, setRelations] = useState<UserRelation[]>([]);
  const [f, setF] = useState<FormBooking>(() => {
    if (initialBooking) {
      return {
        relation_id: initialBooking.relation_id || '',
        nama: initialBooking.nama_pemohon || '',
        nim: initialBooking.nim_pemohon || '',
        kelas: initialBooking.kelas || '',
        prodi: initialBooking.prodi || '',
        fakultas: initialBooking.fakultas || '',
        angkatan: initialBooking.angkatan || '',
        matkul: initialBooking.mata_kuliah || '',
        dosen: initialBooking.nama_dosen || '',
        dosen_id: initialBooking.dosen_id || 0,
        tanggal: initialBooking.tanggal || '',
        sks: initialBooking.sks || 2,
        mulai: initialBooking.jam_mulai ? initialBooking.jam_mulai.slice(0, 5) : '08:00',
        selesai: initialBooking.jam_selesai ? initialBooking.jam_selesai.slice(0, 5) : '09:40',
      };
    }
    return FORM_KOSONG;
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [terkirim, setTerkirim] = useState<boolean>(!!initialBooking);
  const [submittedData, setSubmittedData] = useState<any>(initialBooking || null);
  const [liveBooking, setLiveBooking] = useState<any>(initialBooking || null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingActiveBooking, setLoadingActiveBooking] = useState<boolean>(false);
  const [conflictCheck, setConflictCheck] = useState<{
    roomConflict: any;
    pjConflict: any;
    officialConflict: any;
    canBook: boolean;
  } | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);

  const bookingId = liveBooking?.id || submittedData?.id;
  const currentStatus = liveBooking?.status || submittedData?.status || 'menunggu_dosen';

  // 0. Cek apakah ruangan ini sudah memiliki peminjaman aktif yang diajukan
  useEffect(() => {
    let isMounted = true;
    async function loadActiveBooking() {
      try {
        setLoadingActiveBooking(true);
        const res = await fetch(`/api/bookings/active?room_kode=${encodeURIComponent(ruangan.kode)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.hasActiveBooking && json.booking && isMounted) {
            setSubmittedData(json.booking);
            setLiveBooking(json.booking);
            setTerkirim(true);
            setF({
              relation_id: json.booking.relation_id || '',
              nama: json.booking.nama_pemohon || '',
              nim: json.booking.nim_pemohon || '',
              kelas: json.booking.kelas || '',
              prodi: json.booking.prodi || '',
              fakultas: json.booking.fakultas || '',
              angkatan: json.booking.angkatan || '',
              matkul: json.booking.mata_kuliah || '',
              dosen: json.booking.nama_dosen || '',
              dosen_id: json.booking.dosen_id || 0,
              tanggal: json.booking.tanggal || '',
              sks: json.booking.sks || 2,
              mulai: json.booking.jam_mulai ? json.booking.jam_mulai.slice(0, 5) : '08:00',
              selesai: json.booking.jam_selesai ? json.booking.jam_selesai.slice(0, 5) : '09:40',
            });
          }
        }
      } catch (err) {
        console.warn('Gagal memuat booking aktif ruangan:', err);
      } finally {
        if (isMounted) setLoadingActiveBooking(false);
      }
    }

    loadActiveBooking();
    return () => {
      isMounted = false;
    };
  }, [ruangan.kode]);

  const fetchLiveStatus = useCallback(async (id: string, isManual = false) => {
    if (!id) return;
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/bookings/${id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setLiveBooking(json.data);
        }
      }
    } catch (e) {
      console.warn('Gagal memuat status live booking:', e);
    } finally {
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!terkirim || !bookingId) return;

    fetchLiveStatus(bookingId);

    const interval = setInterval(() => {
      fetchLiveStatus(bookingId);
    }, 3000);

    return () => clearInterval(interval);
  }, [terkirim, bookingId, fetchLiveStatus]);

  const handleCheckin = async () => {
    if (!bookingId) return;
    setCheckingIn(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/checkin`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal melakukan check-in');
      }
      await fetchLiveStatus(bookingId);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('siruang:booking-updated'));
      }
    } catch (err: any) {
      alert(err.message || 'Gagal melakukan check-in ruangan');
    } finally {
      setCheckingIn(false);
    }
  };

  // 1. Muat profil akun saat mount
  useEffect(() => {
    loadMyProfile();
  }, []);

  // 2. Muat relasi mata kuliah milik PJ Kelas
  useEffect(() => {
    async function fetchRelations() {
      try {
        const res = await fetch('/api/user/relations');
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            setRelations(json.data);
          }
        }
      } catch (e) {
        console.warn('Gagal memuat relasi pengguna:', e);
      }
    }
    fetchRelations();
  }, []);

  // 3. Sinkronkan profil & relasi ke form secara otomatis
  useEffect(() => {
    if (profile) {
      setF((prev) => ({
        ...prev,
        nama: profile.fullName || profile.username || prev.nama,
        nim: profile.identifier || prev.nim,
        kelas: profile.kelas || prev.kelas || 'STI-3A',
        prodi: profile.prodi || prev.prodi || 'STI',
        fakultas: profile.faculty || prev.fakultas || 'Fakultas Teknik',
        angkatan: profile.angkatan || prev.angkatan || '2024',
      }));
    }
  }, [profile]);

  // Sinkronkan relasi mata kuliah pertama (default)
  useEffect(() => {
    if (relations.length > 0 && !f.relation_id) {
      const first = relations[0];
      setF((prev) => ({
        ...prev,
        relation_id: first.id,
        matkul: first.mata_kuliah,
        dosen: first.nama_dosen,
        dosen_id: first.dosen_id,
        kelas: first.kelas || prev.kelas,
      }));
    }
  }, [relations, f.relation_id]);

  // 4. Hitung jam selesai otomatis saat mulai atau SKS berubah
  const handleMulaiChange = (newMulai: string) => {
    const end = addMinutesToTime(newMulai, f.sks * 50);
    setF((prev) => ({ ...prev, mulai: newMulai, selesai: end }));
  };

  const handleSksChange = (newSks: number) => {
    const end = addMinutesToTime(f.mulai, newSks * 50);
    setF((prev) => ({ ...prev, sks: newSks, selesai: end }));
  };

  const handleRelationChange = (relId: string) => {
    const rel = relations.find((r) => r.id === relId);
    if (rel) {
      setF((prev) => ({
        ...prev,
        relation_id: rel.id,
        matkul: rel.mata_kuliah,
        dosen: rel.nama_dosen,
        dosen_id: rel.dosen_id,
        kelas: rel.kelas || prev.kelas,
      }));
    }
  };

  const hari = f.tanggal ? HARI_DARI_INDEX[new Date(`${f.tanggal}T00:00:00`).getDay()] : null;
  const hariOk = !hari || HARI_KERJA.includes(hari);
  const urut = f.mulai !== '' && f.selesai !== '' && f.mulai < f.selesai;
  const jamOk = urut && f.mulai >= JAM_BUKA && f.selesai <= JAM_TUTUP;

  const bentrok = useMemo(
    () => (hari && urut ? ruangan.jadwal.filter((s) => s.hari === hari && f.mulai < s.selesai && f.selesai > s.mulai) : []),
    [hari, urut, f.mulai, f.selesai, ruangan.jadwal]
  );

  // Cek ketersediaan ruangan & bentrok jadwal PJ ke server realtime
  useEffect(() => {
    if (!f.tanggal || !f.mulai || !urut || !jamOk) {
      setConflictCheck(null);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setCheckingConflict(true);
      try {
        const res = await fetch(
          `/api/bookings/check-conflict?room_kode=${encodeURIComponent(
            ruangan.kode
          )}&tanggal=${f.tanggal}&jam_mulai=${f.mulai}&sks=${f.sks}`
        );
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            setConflictCheck(json);
          }
        }
      } catch (err) {
        console.warn('Gagal cek konflik:', err);
      } finally {
        if (isMounted) setCheckingConflict(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [f.tanggal, f.mulai, f.sks, urut, jamOk, ruangan.kode]);

  const hasHardConflict = Boolean(
    conflictCheck?.roomConflict?.hasConflict || conflictCheck?.pjConflict?.hasConflict
  );

  const nimOk = /^\d+$/.test(f.nim.trim());
  const formValid =
    f.nama.trim() !== '' &&
    nimOk &&
    f.matkul.trim() !== '' &&
    f.tanggal !== '' &&
    hariOk &&
    jamOk &&
    !hasHardConflict &&
    !checkingConflict &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        room_kode: ruangan.kode,
        relation_id: f.relation_id,
        mata_kuliah: f.matkul,
        kelas: f.kelas,
        prodi: f.prodi,
        fakultas: f.fakultas,
        angkatan: f.angkatan,
        dosen_id: f.dosen_id || 3, // Fallback demo dosen
        nama_dosen: f.dosen || 'Dosen Demo',
        tanggal: f.tanggal,
        sks: f.sks,
        jam_mulai: f.mulai,
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengajukan booking');
      }

      setSubmittedData(data.data);
      setLiveBooking(data.data);
      setTerkirim(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('siruang:booking-updated'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  if (!ruangan.bookable) {
    return (
      <div className={`mx-auto max-w-md text-center ${T.kartuTutup}`}>
        <h3 className={`text-xl font-extrabold ${T.judul}`}>Ruangan ini tidak bisa dibooking</h3>
        <p className={`mt-2 text-sm leading-relaxed ${T.dt}`}>{ruangan.keterangan || 'Ruangan non-bookable'}</p>
      </div>
    );
  }

  if (terkirim) {
    const isCond = liveBooking?.is_conditional ?? submittedData?.is_conditional;
    const isApproved =
      currentStatus === 'disetujui_dosen' ||
      currentStatus === 'dijadwalkan_admin' ||
      currentStatus === 'menunggu_checkin';
    const isOngoing = currentStatus === 'berlangsung';
    const isRejected = currentStatus === 'ditolak_dosen';

    return (
      <div className={`sfd-in mx-auto max-w-lg ${T.kartuOk} shadow-xl border`}>
        {/* Header Kartu Status */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3.5">
            {isOngoing ? (
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200 shadow-xs">
                <Clock size={22} />
              </div>
            ) : isApproved ? (
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200 shadow-xs">
                <CheckCircle2 size={22} />
              </div>
            ) : isRejected ? (
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200 shadow-xs">
                <XCircle size={22} />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-[#183449]/10 text-[#183449] flex items-center justify-center shrink-0 border border-[#183449]/20 shadow-xs">
                <Clock size={22} />
              </div>
            )}

            <div>
              <h3 className={`text-xl font-black tracking-tight ${T.judul}`}>
                {isOngoing
                  ? 'Ruangan Sedang Digunakan'
                  : isApproved
                  ? 'Booking Disetujui Dosen'
                  : isRejected
                  ? 'Booking Ditolak Dosen'
                  : '⏳ Menunggu Persetujuan Dosen'}
              </h3>
              <p className={`mt-0.5 text-xs ${T.dt}`}>
                {isOngoing
                  ? 'Check-in berhasil dicatat. Status ruangan pada Denah SFD sekarang berstatus sedang digunakan (Merah).'
                  : isApproved
                  ? `Dosen pengampu (${liveBooking?.nama_dosen || f.dosen}) telah menyetujui peminjaman ini. Ruangan siap digunakan.`
                  : isRejected
                  ? `Pengajuan peminjaman tidak disetujui dosen: ${liveBooking?.catatan_dosen || 'Slot tidak disetujui'}.`
                  : `Permohonan telah terkirim ke email Dosen Pengampu (${liveBooking?.nama_dosen || f.dosen}). Menunggu Dosen mengklik ACC.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchLiveStatus(bookingId, true)}
            title="Segarkan status pengajuan"
            disabled={refreshing}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition shrink-0 cursor-pointer"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-amber-500' : ''} />
          </button>
        </div>

        {/* Banner Peringatan Bersyarat */}
        {isCond && (
          <div className="mt-4 p-3.5 rounded-2xl border border-amber-200 bg-amber-50/80 text-amber-900 text-xs flex items-start gap-2.5 shadow-xs">
            <AlertTriangle size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold">Peminjaman Bersyarat</p>
              <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                Slot waktu yang Anda pilih menumpangi jadwal resmi perkuliahan. Peminjaman ini berstatus bersyarat dan berlaku penuh setelah check-in dilakukan.
              </p>
            </div>
          </div>
        )}

        {/* AREA AKSI UTAMA BERDASARKAN STATUS */}
        {isApproved && (
          <div className="mt-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-1.5 shadow-xs">
            <div className="flex items-center justify-center gap-2 text-emerald-800 font-extrabold text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>STATUS: RESMI DISETUJUI DOSEN (SIAP CHECK-IN)</span>
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed max-w-md mx-auto">
              Ruangan saat ini resmi berstatus <strong className="text-emerald-800">Kuning Aktif</strong> di denah. Konfirmasi presensi &amp; check-in dilakukan melalui menu <strong>Jadwal &amp; Check-in</strong> di dashboard PJ Kelas saat perkuliahan berlangsung.
            </p>
          </div>
        )}

        {isOngoing && (
          <div className="mt-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-1.5 shadow-xs">
            <p className="text-xs font-bold text-rose-700 flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              Ruangan Aktif Digunakan · Denah Berwarna Merah
            </p>
            <p className="text-[11px] text-slate-600">
              Check-in dicatat pada {liveBooking?.checked_in_at ? new Date(liveBooking.checked_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'hari ini'}. Harap menjaga ketertiban fasilitas ruangan.
            </p>
          </div>
        )}

        {currentStatus === 'menunggu_dosen' && (
          <div className="mt-4 p-4 rounded-2xl border border-amber-300 bg-amber-50/90 text-amber-950 text-xs shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-extrabold text-amber-900 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                <span>STATUS: DALAM PENGAJUAN (BELUM DI-ACC)</span>
              </div>
              <button
                type="button"
                onClick={() => fetchLiveStatus(bookingId, true)}
                disabled={refreshing}
                className="text-[11px] font-bold text-[#183449] bg-white border border-amber-300 px-3 py-1.5 rounded-xl hover:bg-amber-100/50 flex items-center gap-1.5 shrink-0 cursor-pointer transition shadow-2xs"
              >
                <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
                <span>Cek Status</span>
              </button>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              📧 <strong>Terkirim ke Email Dosen:</strong> Notifikasi dan tautan persetujuan 1-klik telah otomatis dikirimkan ke email Dosen Pengampu (<strong>{liveBooking?.nama_dosen || f.dosen}</strong>). Setelah Dosen mengklik <strong>Setujui (ACC)</strong>, status ruangan otomatis berubah menjadi <strong>Disetujui Dosen</strong> dan email check-in akan masuk ke PJ Kelas.
            </p>
          </div>
        )}

        {/* Ringkasan Informasi Peminjaman */}
        <div className="mt-5 space-y-3">
          {/* Card 1: Waktu & Status Denah */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-white/80 dark:bg-white/5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-white/10">
              <span className="text-slate-500 font-medium">Ruangan &amp; Lokasi</span>
              <span className="font-extrabold text-slate-800 dark:text-white">
                {ruangan.kode} · {ruangan.nama}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-white/10">
              <span className="text-slate-500 font-medium">Waktu Pelaksanaan</span>
              <span className="font-bold text-slate-800 dark:text-white">
                {hari}, {f.tanggal} · {f.mulai}–{f.selesai} WIB ({f.sks} SKS)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-white/10">
              <span className="text-slate-500 font-medium">Status Persetujuan</span>
              <span className="font-bold">
                {isOngoing ? (
                  <span className="text-rose-600 font-bold">Sedang Berlangsung</span>
                ) : isApproved ? (
                  <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    &#10003; Telah Di-ACC Dosen (Siap Check-in)
                  </span>
                ) : isRejected ? (
                  <span className="text-rose-600 font-bold">&#10005; Ditolak Dosen</span>
                ) : (
                  <span className="text-amber-700 font-extrabold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    &bull; Menunggu Verifikasi Dosen (Belum ACC)
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Status Warna Denah</span>
              <span className="font-bold flex items-center gap-1.5">
                {isOngoing ? (
                  <span className="text-rose-600 flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    MERAH (Aktif Digunakan)
                  </span>
                ) : isApproved ? (
                  <span className="text-amber-700 flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    KUNING (Resmi Disetujui Dosen)
                  </span>
                ) : isRejected ? (
                  <span className="text-slate-400">Putih (Pengajuan Ditolak)</span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                    KUNING (Dalam Pengajuan)
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Card 2: Pemohon & Akademik */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-white/80 dark:bg-white/5 space-y-2.5 text-xs shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
              <span className="text-slate-500 font-medium">Pemohon (PJ Kelas)</span>
              <span className="font-bold text-slate-800 dark:text-white">
                {f.nama} (NIM: {f.nim})
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
              <span className="text-slate-500 font-medium">Kelas / Prodi</span>
              <span className="font-bold text-slate-800 dark:text-white">
                {f.kelas} · {f.prodi} ({f.angkatan})
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
              <span className="text-slate-500 font-medium">Mata Kuliah</span>
              <span className="font-bold text-slate-800 dark:text-white">{f.matkul}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Dosen Pengampu</span>
              <span className="font-bold text-slate-800 dark:text-white">{f.dosen}</span>
            </div>
          </div>
        </div>

        {/* Tombol Aksi Bawah */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-700 text-center hover:bg-slate-50 transition flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
            >
              <MapPin size={14} className="text-[#588CBC]" />
              <span>Lihat di Denah Lantai</span>
            </button>
          ) : (
            <Link
              href="/denah-sfd/lantai8"
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-700 text-center hover:bg-slate-50 transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <MapPin size={14} className="text-[#588CBC]" />
              <span>Lihat di Denah Lantai</span>
            </Link>
          )}

          {isRejected || currentStatus === 'selesai' || currentStatus === 'hangus' ? (
            <button
              type="button"
              onClick={() => {
                setF(FORM_KOSONG);
                setTerkirim(false);
                setLiveBooking(null);
                setSubmittedData(null);
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#183449] hover:bg-[#122838] text-white font-bold text-xs text-center transition flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] cursor-pointer"
            >
              Ajukan Peminjaman Baru
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fetchLiveStatus(bookingId, true)}
              disabled={refreshing}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#183449] hover:bg-[#122838] text-white font-bold text-xs text-center transition flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-60"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span>Segarkan Status</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`mx-auto ${terang ? 'max-w-[640px]' : 'max-w-3xl'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className={`text-2xl font-extrabold tracking-tight ${T.judul}`}>Booking {ruangan.nama}</h3>
          <p className={`mt-1 text-xs ${T.sub}`}>
            Data identitas dan mata kuliah terisi otomatis dari profil akun PJ Kelas &amp; relasi terdaftar Anda.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200 shrink-0">
          <Sparkles size={12} />
          Auto-Fill PJ Kelas
        </span>
      </div>

      {errorMsg && (
        <div className="mt-4 p-3 rounded-xl border border-rose-300 bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6">
        <div className={`grid sm:grid-cols-2 ${terang ? 'gap-x-5 gap-y-3.5' : 'gap-4'}`}>
          {/* NAMA LENGKAP (AUTO-FILLED & DISABLED) */}
          <div>
            <label className={T.label}>
              Nama Lengkap
              <span className="ml-1 text-[10px] text-slate-400 font-normal">(Dari Akun)</span>
            </label>
            <div className="relative">
              <input disabled value={f.nama} className={T.inputDisabled} title="Terisi otomatis dari profil akun" />
              <Lock size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 opacity-60" />
            </div>
          </div>

          {/* NIM (AUTO-FILLED & DISABLED) */}
          <div>
            <label className={T.label}>
              NIM
              <span className="ml-1 text-[10px] text-slate-400 font-normal">(Dari Akun)</span>
            </label>
            <div className="relative">
              <input disabled value={f.nim} className={T.inputDisabled} title="Terisi otomatis dari profil akun" />
              <Lock size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 opacity-60" />
            </div>
          </div>

          {/* KELAS (AUTO-FILLED & DISABLED) */}
          <div>
            <label className={T.label}>
              Kelas
              <span className="ml-1 text-[10px] text-slate-400 font-normal">(Dari Relasi/Profil)</span>
            </label>
            <div className="relative">
              <input disabled value={f.kelas} className={T.inputDisabled} title="Terisi otomatis" />
              <Lock size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 opacity-60" />
            </div>
          </div>

          {/* PRODI (AUTO-FILLED & DISABLED) */}
          <div>
            <label className={T.label}>
              Program Studi
              <span className="ml-1 text-[10px] text-slate-400 font-normal">(Dari Profil)</span>
            </label>
            <div className="relative">
              <input disabled value={f.prodi} className={T.inputDisabled} title="Terisi otomatis" />
              <Lock size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 opacity-60" />
            </div>
          </div>

          {/* FAKULTAS (AUTO-FILLED & DISABLED) */}
          <div>
            <label className={T.label}>
              Fakultas
              <span className="ml-1 text-[10px] text-slate-400 font-normal">(Dari Profil)</span>
            </label>
            <div className="relative">
              <input disabled value={f.fakultas} className={T.inputDisabled} title="Terisi otomatis" />
              <Lock size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 opacity-60" />
            </div>
          </div>

          {/* ANGKATAN (AUTO-FILLED & DISABLED) */}
          <div>
            <label className={T.label}>
              Angkatan
              <span className="ml-1 text-[10px] text-slate-400 font-normal">(Dari Profil)</span>
            </label>
            <div className="relative">
              <input disabled value={f.angkatan} className={T.inputDisabled} title="Terisi otomatis" />
              <Lock size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 opacity-60" />
            </div>
          </div>

          {/* MATA KULIAH (TERHUBUNG KE RELASI AKUN) */}
          <div>
            <label className={T.label}>Mata Kuliah</label>
            {relations.length > 1 ? (
              <select
                value={f.relation_id || ''}
                onChange={(e) => handleRelationChange(e.target.value)}
                className={`${T.input} font-semibold`}
              >
                {relations.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.mata_kuliah} ({r.kelas})
                  </option>
                ))}
              </select>
            ) : (
              <div className="relative">
                <input
                  disabled
                  value={f.matkul || 'Memuat relasi...'}
                  className={T.inputDisabled}
                  title="Terisi otomatis dari relasi akun mata kuliah Anda"
                />
                <Lock size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 opacity-60" />
              </div>
            )}
          </div>

          {/* DOSEN PENGAMPU (TERHUBUNG & TERISI OTOMATIS) */}
          <div>
            <label className={T.label}>
              Dosen Pengampu
              <span className="ml-1 text-[10px] text-slate-400 font-normal">(Otomatis Sesuai Matkul)</span>
            </label>
            <div className="relative">
              <input
                disabled
                value={f.dosen || 'Memuat dosen...'}
                className={T.inputDisabled}
                title="Dosen pengampu ditentukan otomatis dari relasi mata kuliah"
              />
              <Lock size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 opacity-60" />
            </div>
          </div>

          {/* ── BAGIAN YANG PERLU DIISI USER (WAKTU & DURASI) ── */}

          {/* TANGGAL PEMINJAMAN */}
          <div>
            <label htmlFor="bk-tanggal" className={T.label}>
              Tanggal Peminjaman *
            </label>
            <input
              id="bk-tanggal"
              type="date"
              required
              className={T.input}
              value={f.tanggal}
              onChange={(e) => setF({ ...f, tanggal: e.target.value })}
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>

          {/* JUMLAH SKS */}
          <div>
            <label htmlFor="bk-sks" className={T.label}>
              Jumlah SKS * (1 SKS = 50 Menit)
            </label>
            <select
              id="bk-sks"
              className={T.input}
              value={f.sks}
              onChange={(e) => handleSksChange(parseInt(e.target.value, 10))}
            >
              <option value={1}>1 SKS (50 Menit)</option>
              <option value={2}>2 SKS (100 Menit / 1 Jam 40 Menit)</option>
              <option value={3}>3 SKS (150 Menit / 2 Jam 30 Menit)</option>
              <option value={4}>4 SKS (200 Menit / 3 Jam 20 Menit)</option>
            </select>
          </div>

          {/* JAM MULAI & SELESAI */}
          <div className={`grid grid-cols-2 sm:col-span-2 ${terang ? 'gap-x-5' : 'gap-4'}`}>
            <div>
              <label htmlFor="bk-mulai" className={T.label}>
                Jam Mulai * (08:00 - 17:00)
              </label>
              <input
                id="bk-mulai"
                type="time"
                required
                className={T.input}
                value={f.mulai}
                onChange={(e) => handleMulaiChange(e.target.value)}
                min={JAM_BUKA}
                max={JAM_TUTUP}
              />
            </div>
            <div>
              <label htmlFor="bk-selesai" className={T.label}>
                Jam Selesai (Auto-Hitung SKS)
              </label>
              <div className="relative">
                <input
                  id="bk-selesai"
                  disabled
                  type="time"
                  className={T.inputDisabled}
                  value={f.selesai}
                  title="Dihitung otomatis: Jam Mulai + (SKS × 50 menit)"
                />
                <Clock size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 opacity-60" />
              </div>
            </div>
          </div>
        </div>

        {/* PESAN & VALIDASI */}
        <div className="mt-4 space-y-2 text-xs" role="status">
          {f.tanggal && !hariOk && (
            <p className={T.pesan}>
              Tanggal jatuh pada hari {hari}. Peminjaman hanya diizinkan pada hari kerja (Senin - Jumat).
            </p>
          )}
          {f.mulai && f.selesai && !urut && (
            <p className={T.pesan}>Jam selesai harus lebih besar dari jam mulai.</p>
          )}
          {urut && !jamOk && (
            <p className={T.pesan}>
              Waktu operasional gedung adalah antara {JAM_BUKA} sampai {JAM_TUTUP}. Sesuaikan jam mulai atau SKS.
            </p>
          )}

          {/* Indikator Validasi Realtime */}
          {checkingConflict && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400 py-1">
              <RefreshCw size={12} className="animate-spin text-amber-500" />
              <span>Memeriksa ketersediaan ruangan &amp; jadwal peminjaman Anda...</span>
            </div>
          )}

          {/* 1. PERINGATAN DOUBLE BOOKING RUANGAN (LOCKED) */}
          {conflictCheck?.roomConflict?.hasConflict && (
            <div className="p-3.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 text-xs flex items-start gap-2.5 shadow-sm">
              <AlertTriangle size={18} className="shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold text-rose-800">⛔ Ruangan Tidak Dapat Dibooking (Double Booking Dicegah)</p>
                <p className="text-[11px] text-rose-700 leading-relaxed mt-0.5">
                  {conflictCheck.roomConflict.reason}
                </p>
                <p className="text-[10px] text-rose-600 font-semibold mt-1">
                  Sistem mengunci slot ini untuk mencegah peminjaman ganda. Silakan ganti jam atau pilih ruangan lain.
                </p>
              </div>
            </div>
          )}

          {/* 2. PERINGATAN BENTROK JADWAL PJ KELAS (LOCKED) */}
          {conflictCheck?.pjConflict?.hasConflict && (
            <div className="p-3.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 text-xs flex items-start gap-2.5 shadow-sm">
              <AlertTriangle size={18} className="shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold text-rose-800">⚠️ Bentrok Jadwal PJ Kelas (Batas 1 Ruangan per Waktu)</p>
                <p className="text-[11px] text-rose-700 leading-relaxed mt-0.5">
                  {conflictCheck.pjConflict.reason}
                </p>
                <p className="text-[10px] text-rose-600 font-semibold mt-1">
                  Anda tidak diperbolehkan mengajukan lebih dari satu peminjaman ruangan di waktu yang bersamaan.
                </p>
              </div>
            </div>
          )}

          {/* 3. JADWAL KULIAH RESMI (BOOKING BERSYARAT) */}
          {!hasHardConflict && (conflictCheck?.officialConflict?.hasConflict || bentrok.length > 0) && (
            <div className={T.kotakBentrok}>
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertTriangle size={15} />
                <span>Peringatan: Terdapat Jadwal Kuliah di Slot Ini</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {conflictCheck?.officialConflict?.reason || 'Slot waktu ini memiliki jadwal perkuliahan resmi.'} Pengajuan Anda tetap dapat diajukan sebagai <strong>Booking Bersyarat</strong> yang akan divalidasi langsung oleh dosen pengampu.
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!formValid}
          className={`${T.btnUtama} mt-6 w-full sm:w-auto cursor-pointer ${
            hasHardConflict ? 'opacity-60 !cursor-not-allowed bg-rose-700 hover:bg-rose-700 text-white' : ''
          }`}
        >
          {hasHardConflict
            ? 'Tidak Dapat Diajukan (Jadwal Bentrok / Sudah Dibooking)'
            : checkingConflict
            ? 'Memeriksa Ketersediaan...'
            : loading
            ? 'Mengajukan Booking...'
            : 'Ajukan Peminjaman Ruangan'}
        </button>
      </form>
    </div>
  );
}

export default function Booking() {
  const hariIni = useHariIni();
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

        <section className="space-y-4">
          <h3 className="text-lg font-bold">Pilih Ruangan untuk Booking</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r) => (
              <div key={r.kode} className="rounded-2xl border border-[#565656] p-5 bg-[#333]/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-black/40 text-[#E0E0E0]">{r.kode}</span>
                    <span className={`text-[10px] font-bold ${r.bookable ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {r.bookable ? 'Tersedia' : 'Non-bookable'}
                    </span>
                  </div>
                  <h4 className="mt-2 text-base font-bold text-white">{r.nama}</h4>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">{r.deskripsi}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#444] flex items-center justify-between text-xs text-slate-400">
                  <span>{statusHari(r, hariIni)}</span>
                  {r.bookable && (
                    <span className="font-bold text-[#E0E0E0] hover:underline cursor-pointer">Pilih &rarr;</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
