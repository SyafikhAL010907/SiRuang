'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Search,
  AlertTriangle,
  X,
  Building,
  User,
  GraduationCap,
  CalendarCheck,
  Ban,
  FileSpreadsheet,
  Check,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import { exportBookingsToExcel } from '@/lib/excelExport';
import { isBuildingAdmin, isAdminDev } from '@/lib/roles';

interface BookingManagementViewProps {
  onBack: () => void;
  userRole?: string;
}

export interface BookingItem {
  id: string;
  room_id: string;
  pemohon_id: number;
  dosen_id: number;
  admin_id?: number | null;
  admin_gedung_id?: number | null;
  nama_pemohon: string;
  nim_pemohon: string;
  mata_kuliah: string;
  kelas: string;
  prodi?: string | null;
  fakultas?: string | null;
  angkatan?: string | null;
  nama_dosen?: string | null;
  tanggal: string;
  sks: number;
  jam_mulai: string;
  jam_selesai: string;
  is_conditional: boolean;
  alasan_peminjaman?: string | null;
  alasan_tolak?: string | null;
  alasan_tolak_dosen?: string | null;
  alasan_tolak_admin_gedung?: string | null;
  approval_dosen?: string | null;
  approval_admin_gedung?: string | null;
  ditolak_oleh?: string | null;
  ditolak_at?: string | null;
  status: string;
  created_at: string;
  rooms?: {
    id: string;
    kode: string;
    nama: string;
    gedung: string;
    lantai: number;
  } | null;
}

const CONTENT_LANE = 'w-full max-w-[1400px] mx-auto';
const TH_CLASS = 'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  menunggu_approval: { label: 'Menunggu Approval', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  menunggu_dosen: { label: 'Menunggu Dosen (Lama)', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  dijadwalkan: { label: 'Resmi Terjadwal (Siap Check-in)', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  disetujui_dosen: { label: 'Disetujui Dosen (Siap Check-in)', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  dijadwalkan_admin: { label: 'Dijadwalkan Admin', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ditolak: { label: 'Ditolak', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  ditolak_dosen: { label: 'Ditolak Dosen', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  ditolak_admin: { label: 'Ditolak Admin', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  menunggu_checkin: { label: 'Menunggu Presensi / Check-in', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  berlangsung: { label: 'Sedang Berlangsung (Merah)', cls: 'bg-rose-100 text-rose-800 border-rose-300' },
  selesai: { label: 'Selesai', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  dibatalkan: { label: 'Dibatalkan', cls: 'bg-rose-50 text-rose-600 border-rose-200' },
  hangus: { label: 'Hangus (Lewat Waktu)', cls: 'bg-slate-100 text-slate-500 border-slate-300' },
};

const BookingManagementView: React.FC<BookingManagementViewProps> = ({ onBack, userRole }) => {
  const [currentRole] = useState<string>(() => {
    if (userRole) return userRole;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user');
        if (stored) return JSON.parse(stored).role || '';
      } catch {}
    }
    return '';
  });

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Reject Modal
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    item: BookingItem | null;
    reason: string;
    error: string;
  }>({
    open: false,
    item: null,
    reason: '',
    error: '',
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bookings?status=${statusFilter}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat booking');
      setBookings(data.data || []);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter(
      (b) =>
        b.nama_pemohon?.toLowerCase().includes(q) ||
        b.nim_pemohon?.toLowerCase().includes(q) ||
        b.mata_kuliah?.toLowerCase().includes(q) ||
        b.kelas?.toLowerCase().includes(q) ||
        b.rooms?.kode?.toLowerCase().includes(q) ||
        b.rooms?.nama?.toLowerCase().includes(q) ||
        b.rooms?.gedung?.toLowerCase().includes(q) ||
        b.nama_dosen?.toLowerCase().includes(q)
    );
  }, [bookings, query]);

  // Aksi Setujui (Hanya untuk Admin Gedung)
  const handleSetuju = async (item: BookingItem) => {
    if (processingId) return;
    setProcessingId(item.id);
    try {
      const res = await fetch(`/api/admin/bookings/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setuju' }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          showToast('error', data.error || 'Pengajuan sudah ditinjau atau ditolak pihak lain.');
          fetchBookings();
          return;
        }
        throw new Error(data.error || 'Gagal menyetujui booking');
      }

      showToast('success', data.message || `Peminjaman ${item.rooms?.kode || ''} berhasil disetujui!`);
      fetchBookings();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Aksi Konfirmasi Tolak (Hanya untuk Admin Gedung)
  const handleRejectConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModal.item || processingId) return;

    if (rejectModal.reason.trim().length < 10) {
      setRejectModal((prev) => ({ ...prev, error: 'Alasan penolakan wajib minimal 10 karakter' }));
      return;
    }

    setProcessingId(rejectModal.item.id);
    try {
      const res = await fetch(`/api/admin/bookings/${rejectModal.item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'tolak',
          alasan: rejectModal.reason.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          showToast('error', data.error || 'Pengajuan sudah ditolak atau diproses pihak lain.');
          setRejectModal({ open: false, item: null, reason: '', error: '' });
          fetchBookings();
          return;
        }
        setRejectModal((prev) => ({ ...prev, error: data.error || 'Gagal menolak booking' }));
        return;
      }

      showToast('success', 'Peminjaman ruangan berhasil ditolak.');
      setRejectModal({ open: false, item: null, reason: '', error: '' });
      fetchBookings();
    } catch (err: any) {
      setRejectModal((prev) => ({ ...prev, error: err.message }));
    } finally {
      setProcessingId(null);
    }
  };

  const isBuilding = isBuildingAdmin(currentRole);
  const isDev = isAdminDev(currentRole);

  return (
    <div
      className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F8FAFB]"
      style={{
        backgroundImage: `url('/Batik.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${
              toast.type === 'success' ? 'bg-[#183449]' : 'bg-rose-600'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP BAR */}
      <header className="px-8 py-3 bg-white/80 backdrop-blur-md border-b border-slate-100 z-10 shrink-0">
        <div className={`${CONTENT_LANE} flex items-center justify-between gap-4`}>
          {!isBuilding ? (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-500 hover:text-[#588CBC] transition-colors cursor-pointer group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-xs font-bold">Kembali ke Dashboard</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-[#183449]">
              <Building size={16} className="text-[#588CBC]" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Panel Persetujuan Admin Gedung
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {isDev && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold border border-slate-200">
                <Eye size={12} className="text-slate-500" />
                Mode: View-Only (Admin Dev)
              </span>
            )}
            <button
              onClick={fetchBookings}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${CONTENT_LANE} flex flex-col gap-6`}
        >
          {/* HEADER */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-1 bg-[#588CBC] rounded-full" />
                <span className="text-[10px] font-black text-[#183449] uppercase tracking-[0.3em]">
                  {isBuilding ? 'Persetujuan Gedung' : 'Monitoring Ruangan'}
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                {isBuilding ? 'ACC Pengajuan Ruangan Perkuliahan' : 'Monitoring & Riwayat Peminjaman Ruangan'}
              </h2>
              <p className="text-sm text-slate-500 font-medium max-w-2xl leading-relaxed">
                {isBuilding
                  ? 'Verifikasi dan berikan persetujuan peminjaman ruangan khusus di gedung Anda secara paralel bersama Dosen Pengampu.'
                  : 'Pantau seluruh riwayat, jadwal aktif, dan status peminjaman ruangan perkuliahan secara transparan dan real-time.'}
              </p>
            </div>
          </div>

          {/* TABLE CARD */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* TOOLBAR */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-50">
              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { value: 'ALL', label: 'Semua' },
                  { value: 'menunggu_approval', label: 'Menunggu Approval' },
                  { value: 'menunggu_dosen', label: 'Menunggu Dosen' },
                  { value: 'dijadwalkan', label: 'Resmi Terjadwal' },
                  { value: 'disetujui_dosen', label: 'Siap Check-in' },
                  { value: 'berlangsung', label: 'Berlangsung' },
                  { value: 'ditolak', label: 'Ditolak' },
                  { value: 'selesai', label: 'Selesai' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatusFilter(opt.value)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      statusFilter === opt.value
                        ? 'bg-[#183449] text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <span className="text-[10px] text-slate-400 ml-1">
                {filtered.length} pengajuan ditemukan
              </span>

              <div className="flex items-center gap-2 ml-auto">
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors">
                    <Search size={13} />
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari pemohon, matkul, ruangan..."
                    className="h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#588CBC] focus:ring-2 focus:ring-[#588CBC]/10 transition-all w-56"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => exportBookingsToExcel(filtered, 'Riwayat_Peminjaman_Admin')}
                  className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Unduh laporan Excel (.xlsx)"
                >
                  <FileSpreadsheet size={13} />
                  <span>Ekspor Excel</span>
                </button>
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px]">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className={TH_CLASS}>Ruangan &amp; Waktu</th>
                    <th className={TH_CLASS}>Mata Kuliah &amp; Kelas</th>
                    <th className={TH_CLASS}>Pemohon (PJ Kelas)</th>
                    <th className={TH_CLASS}>Status Per Pihak (Dosen &amp; Admin)</th>
                    <th className={TH_CLASS}>Status Akhir</th>
                    <th className={`${TH_CLASS} text-center`}>
                      {isBuilding ? 'Aksi Persetujuan' : 'Monitoring'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-xs text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <RotateCw size={16} className="animate-spin text-[#588CBC]" />
                          <span>Memuat daftar booking...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                          <CalendarCheck size={32} className="text-slate-300 stroke-[1.5]" />
                          <p className="text-xs font-semibold">Tidak ada pengajuan booking pada status ini.</p>
                          <p className="text-[11px] text-slate-400">
                            Silakan pilih filter status lain atau ubah kata kunci pencarian.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((b) => {
                      const stMeta = STATUS_BADGE[b.status] || {
                        label: b.status,
                        cls: 'bg-slate-100 text-slate-700 border-slate-200',
                      };

                      // Status Approval Dosen
                      const isDosenAcc =
                        b.approval_dosen === 'disetujui' ||
                        ['disetujui_dosen', 'dijadwalkan_admin', 'menunggu_checkin', 'berlangsung', 'selesai'].includes(
                          b.status
                        );
                      const isDosenReject =
                        b.approval_dosen === 'ditolak' ||
                        b.status === 'ditolak_dosen' ||
                        (b.status === 'ditolak' && b.ditolak_oleh === 'dosen');

                      // Status Approval Admin Gedung
                      const isAdminAcc =
                        b.approval_admin_gedung === 'disetujui' ||
                        b.status === 'dijadwalkan';
                      const isAdminReject =
                        b.approval_admin_gedung === 'ditolak' ||
                        b.status === 'ditolak_admin' ||
                        (b.status === 'ditolak' && b.ditolak_oleh === 'admin_gedung');

                      // Hak Aksi Admin Gedung
                      const canAct =
                        isBuilding &&
                        (b.approval_admin_gedung === 'pending' || !b.approval_admin_gedung) &&
                        ['menunggu_approval', 'menunggu_dosen'].includes(b.status);

                      return (
                        <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* RUANGAN & WAKTU */}
                          <td className="px-4 py-4">
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#588CBC] flex items-center justify-center shrink-0 border border-slate-200 font-black text-xs">
                                {b.rooms?.kode?.replace('R.', '') || 'R'}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800">
                                  {b.rooms?.kode || 'Ruangan'} · {b.rooms?.nama || ''}
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium">
                                  Gedung {b.rooms?.gedung || '-'} · Lantai {b.rooms?.lantai || '-'}
                                </p>
                                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Calendar size={11} />
                                  {b.tanggal}
                                </p>
                                <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                                  <Clock size={11} className="text-[#588CBC]" />
                                  {b.jam_mulai.slice(0, 5)} - {b.jam_selesai.slice(0, 5)} ({b.sks} SKS)
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* MATKUL & KELAS */}
                          <td className="px-4 py-4">
                            <p className="text-xs font-bold text-slate-800">{b.mata_kuliah}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                              Kelas: {b.kelas}
                            </span>
                            {b.is_conditional && (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                  <AlertTriangle size={10} />
                                  BERSYARAT
                                </span>
                              </div>
                            )}
                          </td>

                          {/* PEMOHON */}
                          <td className="px-4 py-4">
                            <p className="text-xs font-bold text-slate-800">{b.nama_pemohon}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">NIM: {b.nim_pemohon}</p>
                            {b.prodi && (
                              <p className="text-[10px] text-slate-400">{b.prodi}</p>
                            )}
                          </td>

                          {/* STATUS PER PIHAK */}
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1.5">
                              {/* Badge Dosen */}
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border ${
                                    isDosenAcc
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : isDosenReject
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {isDosenAcc ? '✓ Dosen: Disetujui' : isDosenReject ? '✕ Dosen: Ditolak' : '⏳ Dosen: Pending'}
                                </span>
                                <span className="text-[10px] text-slate-600 truncate max-w-[120px]" title={b.nama_dosen || ''}>
                                  {b.nama_dosen || 'Dosen'}
                                </span>
                              </div>

                              {/* Badge Admin Gedung */}
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border ${
                                    isAdminAcc
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : isAdminReject
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {isAdminAcc
                                    ? '✓ Admin: Disetujui'
                                    : isAdminReject
                                    ? '✕ Admin: Ditolak'
                                    : '⏳ Admin: Pending'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* STATUS AKHIR & KETERANGAN */}
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${stMeta.cls}`}
                              >
                                {stMeta.label}
                              </span>
                              {(b.alasan_tolak_admin_gedung || b.alasan_tolak_dosen || b.alasan_tolak) && (
                                <div className="mt-1 p-1.5 rounded bg-rose-50/80 border border-rose-100 max-w-xs text-[10px] text-rose-700 leading-snug">
                                  <span className="font-bold">
                                    Ditolak oleh {b.ditolak_oleh === 'dosen' ? 'Dosen' : b.ditolak_oleh === 'admin_gedung' ? 'Admin Gedung' : 'Penolak'}:
                                  </span>{' '}
                                  <span className="italic">
                                    &ldquo;{b.alasan_tolak_admin_gedung || b.alasan_tolak_dosen || b.alasan_tolak}&rdquo;
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* AKSI / MONITORING */}
                          <td className="px-4 py-4 text-center">
                            {canAct ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSetuju(b)}
                                  disabled={processingId !== null}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                                  title="Setujui permohonan ruangan ini"
                                >
                                  <Check size={12} />
                                  <span>ACC</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRejectModal({
                                      open: true,
                                      item: b,
                                      reason: '',
                                      error: '',
                                    })
                                  }
                                  disabled={processingId !== null}
                                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                                  title="Tolak permohonan dengan alasan"
                                >
                                  <Ban size={12} />
                                  <span>Tolak</span>
                                </button>
                              </div>
                            ) : isBuilding ? (
                              <span className="text-[10px] text-slate-400 font-medium">
                                Sudah Direspons
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                <Eye size={12} />
                                View Only
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
              <span>Menampilkan {filtered.length} pengajuan booking</span>
              <span>Hak Akses: {isBuilding ? 'Admin Gedung (Penuh)' : 'Admin Dev (View-Only)'}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* MODAL TOLAK BOOKING (Min. 10 Karakter) */}
      <AnimatePresence>
        {rejectModal.open && rejectModal.item && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 p-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Ban size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Tolak Pengajuan Ruangan</h3>
                    <p className="text-[10px] text-slate-400">
                      {rejectModal.item.rooms?.kode} · {rejectModal.item.mata_kuliah}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRejectModal({ open: false, item: null, reason: '', error: '' })}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleRejectConfirm} className="mt-4 flex flex-col gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Alasan Penolakan Admin Gedung *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Contoh: Ruangan dialokasikan untuk kegiatan universitas yang mendesak..."
                    value={rejectModal.reason}
                    onChange={(e) => {
                      setRejectModal({ ...rejectModal, reason: e.target.value, error: '' });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-rose-500 font-medium text-slate-800 text-xs"
                  />
                  <div className="flex justify-between items-center text-[10px] mt-1">
                    <span
                      className={
                        rejectModal.reason.trim().length < 10
                          ? 'text-rose-500 font-medium'
                          : 'text-slate-400'
                      }
                    >
                      {rejectModal.reason.trim().length} / 10 karakter minimum
                    </span>
                    {rejectModal.error && (
                      <span className="text-rose-600 font-bold">{rejectModal.error}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRejectModal({ open: false, item: null, reason: '', error: '' })}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={processingId !== null || rejectModal.reason.trim().length < 10}
                    className="px-5 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                  >
                    {processingId ? 'Menolak...' : 'Konfirmasi Tolak'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingManagementView;
