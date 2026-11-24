'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RotateCw,
  Calendar,
  Clock,
  Building2,
  GraduationCap,
  BookOpen,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export interface AjukanUlangModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onSuccess: () => void;
}

function calculateEndTime(startTime: string, sks: number): string {
  if (!startTime) return '';
  const [hStr, mStr] = startTime.split(':');
  let h = parseInt(hStr, 10);
  let m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return '';

  const durationMin = sks * 50;
  const totalMin = h * 60 + m + durationMin;

  const endH = Math.floor(totalMin / 60);
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export const AjukanUlangModal: React.FC<AjukanUlangModalProps> = ({
  isOpen,
  onClose,
  booking,
  onSuccess,
}) => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [relations, setRelations] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);

  // Form states
  const [roomId, setRoomId] = useState<number | string>('');
  const [roomKode, setRoomKode] = useState<string>('');
  const [mataKuliah, setMataKuliah] = useState<string>('');
  const [kelas, setKelas] = useState<string>('');
  const [dosenId, setDosenId] = useState<number | null>(null);
  const [namaDosen, setNamaDosen] = useState<string>('');
  const [relationId, setRelationId] = useState<string | null>(null);
  const [tanggal, setTanggal] = useState<string>('');
  const [sks, setSks] = useState<number>(2);
  const [jamMulai, setJamMulai] = useState<string>('08:00');
  const [prodi, setProdi] = useState<string>('');
  const [fakultas, setFakultas] = useState<string>('');
  const [angkatan, setAngkatan] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset form when booking changes or modal opens
  useEffect(() => {
    if (!booking || !isOpen) return;

    setRoomId(booking.room_id || booking.rooms?.id || '');
    setRoomKode(booking.rooms?.kode || '');
    setMataKuliah(booking.mata_kuliah || '');
    setKelas(booking.kelas || '');
    setDosenId(booking.dosen_id || null);
    setNamaDosen(booking.nama_dosen || '');
    setRelationId(booking.relation_id || null);

    // Tanggal: jika tanggal lama sudah lewat dari hari ini, tetap diisi agar user sadar & bisa ganti
    setTanggal(booking.tanggal || '');
    setSks(booking.sks || 2);
    setJamMulai(booking.jam_mulai ? booking.jam_mulai.slice(0, 5) : '08:00');
    setProdi(booking.prodi || '');
    setFakultas(booking.fakultas || '');
    setAngkatan(booking.angkatan || '');
    setErrorMsg(null);
  }, [booking, isOpen]);

  // Load available bookable rooms and relations
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadOptions() {
      setLoadingInitial(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        const [roomsRes, relRes] = await Promise.all([
          fetch('/api/rooms?bookable=true'),
          fetch('/api/user/relations', { headers }),
        ]);

        if (roomsRes.ok && isMounted) {
          const json = await roomsRes.json();
          if (json.data) setRooms(json.data);
        }

        if (relRes.ok && isMounted) {
          const json = await relRes.json();
          if (json.data) setRelations(json.data);
        }
      } catch (err) {
        console.warn('Gagal memuat opsi ruangan/relasi:', err);
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    }

    loadOptions();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const jamSelesai = useMemo(() => {
    return calculateEndTime(jamMulai, sks);
  }, [jamMulai, sks]);

  const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setRoomId(selectedId);
    const found = rooms.find((r) => String(r.id) === String(selectedId));
    if (found) {
      setRoomKode(found.kode);
    }
  };

  const handleRelationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const relId = e.target.value;
    setRelationId(relId);
    const found = relations.find((r) => String(r.id) === String(relId));
    if (found) {
      setMataKuliah(found.mata_kuliah);
      setKelas(found.kelas || kelas);
      setDosenId(found.dosen_id);
      setNamaDosen(found.nama_dosen);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!tanggal) {
      setErrorMsg('Tanggal peminjaman wajib diisi.');
      return;
    }
    if (!jamMulai) {
      setErrorMsg('Jam mulai peminjaman wajib diisi.');
      return;
    }
    if (!mataKuliah.trim()) {
      setErrorMsg('Mata kuliah wajib diisi.');
      return;
    }
    if (!roomId) {
      setErrorMsg('Ruangan wajib dipilih.');
      return;
    }
    if (!dosenId) {
      setErrorMsg('Dosen pengampu wajib dipilih.');
      return;
    }

    setSubmitting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          room_id: Number(roomId),
          room_kode: roomKode,
          mata_kuliah: mataKuliah.trim(),
          kelas: kelas.trim(),
          prodi: prodi.trim(),
          fakultas: fakultas.trim(),
          angkatan: angkatan.trim(),
          dosen_id: Number(dosenId),
          nama_dosen: namaDosen.trim(),
          tanggal: tanggal.trim(),
          sks: Number(sks),
          jam_mulai: jamMulai.trim(),
          relation_id: relationId || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal mengajukan booking ulang.');
      }

      alert('Pengajuan ulang berhasil dikirim sebagai booking baru! Notifikasi telah dikirim ke Dosen dan Admin Gedung.');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat mengajukan booking.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const alasanLama = booking?.alasan_tolak_dosen || booking?.alasan_tolak_admin_gedung || booking?.alasan_tolak;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8"
        >
          {/* Header */}
          <div className="bg-linear-to-r from-[#183449] to-[#2B5474] p-5 sm:p-6 text-white relative">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="absolute top-5 right-5 p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <RotateCw size={10} className="animate-spin-reverse" />
                Pengajuan Ulang
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black tracking-tight">
              Ajukan Ulang Peminjaman Ruangan
            </h3>
            <p className="text-xs text-sky-100/80 font-medium mt-1">
              Data dari booking sebelumnya telah diisikan. Anda dapat mengubah ruangan, jadwal, atau mata kuliah jika diperlukan.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Banner Alasan Ditolak Sebelumnya */}
            {alasanLama && (
              <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
                <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Alasan Penolakan Sebelumnya:</span>
                  <span className="text-[11px] text-rose-700 leading-relaxed">{alasanLama}</span>
                </div>
              </div>
            )}

            {/* Error Message Box */}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-800">
                <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">Pengajuan Tidak Dapat Diproses:</span>
                  <span className="text-[11px] text-red-700 leading-relaxed">{errorMsg}</span>
                </div>
              </div>
            )}

            {/* Field Pilihan Relasi Mata Kuliah (jika ada) */}
            {relations.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <BookOpen size={13} className="text-[#588CBC]" />
                  Pilih dari Relasi Mata Kuliah Anda
                </label>
                <select
                  value={relationId || ''}
                  onChange={handleRelationChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588CBC]/20 focus:border-[#588CBC] transition-all"
                >
                  <option value="">-- Pilih Relasi Mata Kuliah --</option>
                  {relations.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.mata_kuliah} ({r.kelas || 'Reguler'}) — Dosen: {r.nama_dosen}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Ruangan */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 size={13} className="text-[#588CBC]" />
                Pilihan Ruangan <span className="text-rose-500">*</span>
              </label>
              {rooms.length > 0 ? (
                <select
                  value={roomId}
                  onChange={handleRoomChange}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588CBC]/20 focus:border-[#588CBC] transition-all"
                >
                  <option value="">-- Pilih Ruangan Tersedia --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.kode} - {r.nama} ({r.gedung ? `Gedung ${r.gedung}` : ''} Lantai {r.lantai})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={roomKode}
                  readOnly
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                />
              )}
            </div>

            {/* Mata Kuliah & Kelas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Mata Kuliah <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={mataKuliah}
                  onChange={(e) => setMataKuliah(e.target.value)}
                  required
                  placeholder="Nama mata kuliah..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588CBC]/20 focus:border-[#588CBC] transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Kelas
                </label>
                <input
                  type="text"
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  placeholder="Contoh: TE-3A"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588CBC]/20 focus:border-[#588CBC] transition-all"
                />
              </div>
            </div>

            {/* Dosen Pengampu */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <GraduationCap size={13} className="text-[#588CBC]" />
                Dosen Pengampu <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={namaDosen}
                onChange={(e) => setNamaDosen(e.target.value)}
                required
                placeholder="Nama dosen pengampu..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588CBC]/20 focus:border-[#588CBC] transition-all"
              />
            </div>

            {/* Tanggal, SKS, dan Waktu */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar size={12} className="text-[#588CBC]" />
                  Tanggal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588CBC]/20 focus:border-[#588CBC] transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  SKS
                </label>
                <select
                  value={sks}
                  onChange={(e) => setSks(parseInt(e.target.value, 10) || 2)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588CBC]/20 focus:border-[#588CBC] transition-all"
                >
                  <option value={1}>1 SKS (50 menit)</option>
                  <option value={2}>2 SKS (100 menit)</option>
                  <option value={3}>3 SKS (150 menit)</option>
                  <option value={4}>4 SKS (200 menit)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Clock size={12} className="text-[#588CBC]" />
                  Jam Mulai <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  value={jamMulai}
                  onChange={(e) => setJamMulai(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588CBC]/20 focus:border-[#588CBC] transition-all"
                />
              </div>
            </div>

            {/* Ringkasan Estimasi Selesai */}
            {jamMulai && jamSelesai && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Rentang Waktu Booking:</span>
                <span className="font-black text-[#183449]">
                  {jamMulai} – {jamSelesai} WIB ({sks} SKS)
                </span>
              </div>
            )}

            {/* Catatan Bisnis */}
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic">
              * Booking lama berstatus ditolak akan tetap tersimpan sebagai riwayat. Pengajuan ini dibuat sebagai booking baru dan diproses secara paralel ke Dosen dan Admin Gedung.
            </p>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-[#183449] hover:bg-[#122838] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-98 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Mengajukan Ulang...</span>
                  </>
                ) : (
                  <>
                    <RotateCw size={14} />
                    <span>Kirim Pengajuan Ulang</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AjukanUlangModal;

