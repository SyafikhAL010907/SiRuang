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
  FileText,
  CalendarCheck,
  Ban,
  FileSpreadsheet,
} from 'lucide-react';
import { exportBookingsToExcel } from '@/lib/excelExport';

interface BookingManagementViewProps {
  onBack: () => void;
}

export interface BookingItem {
  id: string;
  room_id: string;
  pemohon_id: number;
  dosen_id: number;
  admin_id?: number | null;
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
  menunggu_dosen: { label: 'Menunggu Dosen', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  disetujui_dosen: { label: 'Disetujui Dosen (Siap Digunakan)', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ditolak_dosen: { label: 'Ditolak Dosen', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  dijadwalkan_admin: { label: 'Disetujui / Terjadwal', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ditolak_admin: { label: 'Dibatalkan', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  menunggu_checkin: { label: 'Menunggu Presensi / Check-in', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  berlangsung: { label: 'Sedang Berlangsung (Merah)', cls: 'bg-rose-100 text-rose-800 border-rose-300' },
  selesai: { label: 'Selesai', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  dibatalkan: { label: 'Dibatalkan', cls: 'bg-rose-50 text-rose-600 border-rose-200' },
};

const BookingManagementView: React.FC<BookingManagementViewProps> = ({ onBack }) => {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Reject Modal
  const [rejectModal, setRejectModal] = useState<{ open: boolean; item: BookingItem | null; reason: string }>({
    open: false,
    item: null,
    reason: '',
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
        b.nama_dosen?.toLowerCase().includes(q)
    );
  }, [bookings, query]);

  const handleJadwalkan = async (item: BookingItem) => {
    if (processingId) return;
    setProcessingId(item.id);
    try {
      const res = await fetch(`/api/admin/bookings/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'jadwalkan' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menjadwalkan booking');

      showToast('success', `Peminjaman ${item.rooms?.kode || ''} (${item.mata_kuliah}) berhasil dijadwalkan!`);
      fetchBookings();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModal.item || processingId) return;

    if (!rejectModal.reason.trim() || rejectModal.reason.trim().length < 5) {
      showToast('error', 'Alasan penolakan admin wajib diisi minimal 5 karakter');
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
      if (!res.ok) throw new Error(data.error || 'Gagal menolak booking');

      showToast('success', 'Peminjaman ruangan berhasil ditolak.');
      setRejectModal({ open: false, item: null, reason: '' });
      fetchBookings();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setProcessingId(null);
    }
  };

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
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-[#588CBC] transition-colors cursor-pointer group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-bold">Kembali ke Dashboard</span>
          </button>
          <button
            onClick={fetchBookings}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Segarkan</span>
          </button>
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
                  Monitoring Ruangan
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                Monitoring &amp; Riwayat Peminjaman Ruangan
              </h2>
              <p className="text-sm text-slate-400 font-medium max-w-2xl leading-relaxed">
                Pantau seluruh riwayat, jadwal aktif, dan status peminjaman ruangan perkuliahan Gedung SFD secara transparan dan real-time.
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
                  { value: 'menunggu_dosen', label: 'Menunggu Dosen' },
                  { value: 'disetujui_dosen', label: 'Siap Check-in' },
                  { value: 'berlangsung', label: 'Berlangsung' },
                  { value: 'selesai', label: 'Selesai' },
                  { value: 'ditolak_dosen', label: 'Ditolak' },
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
                  onClick={() => exportBookingsToExcel(filtered, 'Riwayat_Peminjaman_Admin_SFD')}
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
              <table className="w-full min-w-[920px]">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className={TH_CLASS}>Ruangan &amp; Waktu</th>
                    <th className={TH_CLASS}>Mata Kuliah &amp; Kelas</th>
                    <th className={TH_CLASS}>Pemohon (PJ Kelas)</th>
                    <th className={TH_CLASS}>Dosen Pengampu</th>
                    <th className={TH_CLASS}>Status / Kondisi</th>
                    <th className={`${TH_CLASS} text-center`}>Status Monitoring</th>
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
                            {statusFilter === 'disetujui_dosen'
                              ? 'Semua pengajuan yang disetujui dosen telah diproses.'
                              : 'Silakan pilih filter status lain atau ubah kata kunci pencarian.'}
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
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* RUANGAN & WAKTU */}
                          <td className="px-4 py-4">
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#588CBC] flex items-center justify-center shrink-0 border border-slate-200 font-black text-xs">
                                {b.rooms?.kode?.replace('R.', '') || 'SFD'}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800">
                                  {b.rooms?.kode || 'Ruangan'} · {b.rooms?.nama || ''}
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
                            {b.alasan_peminjaman && (
                              <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 italic">
                                &ldquo;{b.alasan_peminjaman}&rdquo;
                              </p>
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

                          {/* DOSEN */}
                          <td className="px-4 py-4">
                            <p className="text-xs font-semibold text-slate-800">{b.nama_dosen || 'Dosen Pengampu'}</p>
                            {['disetujui_dosen', 'dijadwalkan_admin', 'menunggu_checkin', 'berlangsung', 'selesai'].includes(b.status) ? (
                              <span className="inline-block mt-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                Sudah Di-ACC Dosen
                              </span>
                            ) : b.status === 'ditolak_dosen' ? (
                              <span className="inline-block mt-0.5 text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                Ditolak Dosen
                              </span>
                            ) : (
                              <span className="inline-block mt-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                ⏳ Belum Di-ACC Dosen
                              </span>
                            )}
                          </td>

                          {/* STATUS & BERSYARAT */}
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${stMeta.cls}`}
                              >
                                {stMeta.label}
                              </span>
                              {b.is_conditional && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                  <AlertTriangle size={10} />
                                  BERSYARAT (Jadwal Resmi)
                                </span>
                              )}
                              {b.alasan_tolak && (
                                <p className="text-[10px] text-rose-600 mt-0.5">
                                  Alasan: {b.alasan_tolak}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* STATUS MONITORING (READ ONLY) */}
                          <td className="px-4 py-4 text-center">
                            {b.status === 'berlangsung' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                Sedang Digunakan (Merah)
                              </span>
                            ) : b.status === 'disetujui_dosen' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300">
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                Siap Digunakan (Kuning)
                              </span>
                            ) : b.status === 'menunggu_dosen' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                Menunggu Dosen
                              </span>
                            ) : b.status === 'selesai' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                Peminjaman Selesai
                              </span>
                            ) : b.status === 'ditolak_dosen' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-600 border border-rose-200">
                                Ditolak Dosen
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                {stMeta.label}
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
            </div>
          </div>
        </motion.div>
      </div>

      {/* MODAL TOLAK BOOKING */}
      <AnimatePresence>
        {rejectModal.open && rejectModal.item && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
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
                    <h3 className="text-sm font-bold text-slate-800">Tolak Pengajuan Booking</h3>
                    <p className="text-[10px] text-slate-400">
                      {rejectModal.item.rooms?.kode} · {rejectModal.item.mata_kuliah}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRejectModal({ open: false, item: null, reason: '' })}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleRejectConfirm} className="mt-4 flex flex-col gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Alasan Penolakan Admin *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Contoh: Ruangan dialokasikan untuk kegiatan universitas yang mendesak."
                    value={rejectModal.reason}
                    onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-rose-500 font-medium text-slate-800 text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Minimal 5 karakter. Alasan ini akan tercatat dalam riwayat booking pemohon.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRejectModal({ open: false, item: null, reason: '' })}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={processingId !== null}
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

