'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox,
  Clock,
  Building2,
  CalendarDays,
  UserCheck,
  UserX,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertCircle,
  Search,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export interface DosenApprovalViewProps {
  onBack: () => void;
}

export const DosenApprovalView: React.FC<DosenApprovalViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Modal Tolak State
  const [rejectItem, setRejectItem] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/dosen/bookings', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setBookings(json.data);
      }
    } catch (err) {
      console.error('Gagal memuat bookings dosen:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleApprove = async (item: any) => {
    if (!confirm(`Setujui peminjaman ruangan ${item.rooms?.kode || 'ruangan'} untuk mata kuliah ${item.mata_kuliah}?`)) {
      return;
    }

    setSubmittingId(item.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/dosen/bookings/${item.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'setuju' }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Gagal menyetujui peminjaman');
      } else {
        alert('Permohonan berhasil disetujui dan diteruskan ke Admin!');
        fetchBookings();
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleOpenRejectModal = (item: any) => {
    setRejectItem(item);
    setRejectReason('');
    setRejectError('');
  };

  const handleConfirmReject = async () => {
    if (rejectReason.trim().length < 10) {
      setRejectError('Alasan penolakan wajib diisi minimal 10 karakter.');
      return;
    }

    if (!rejectItem) return;

    setSubmittingId(rejectItem.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/dosen/bookings/${rejectItem.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'tolak',
          alasan: rejectReason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setRejectError(json.error || 'Gagal menolak peminjaman');
      } else {
        alert('Permohonan telah ditolak. Notifikasi dikirim ke PJ Kelas.');
        setRejectItem(null);
        fetchBookings();
      }
    } catch (err: any) {
      setRejectError('Terjadi kesalahan: ' + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const pendingItems = bookings.filter((b) => b.status === 'menunggu_dosen');
  const historyItems = bookings.filter((b) => b.status !== 'menunggu_dosen');

  const filteredPending = pendingItems.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      (item.mata_kuliah || '').toLowerCase().includes(q) ||
      (item.nama_pemohon || '').toLowerCase().includes(q) ||
      (item.nim_pemohon || '').toLowerCase().includes(q) ||
      (item.rooms?.kode || '').toLowerCase().includes(q)
    );
  });

  const filteredHistory = historyItems.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      (item.mata_kuliah || '').toLowerCase().includes(q) ||
      (item.nama_pemohon || '').toLowerCase().includes(q) ||
      (item.nim_pemohon || '').toLowerCase().includes(q) ||
      (item.rooms?.kode || '').toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'disetujui_dosen':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Disetujui Dosen (Siap Check-in)</span>;
      case 'dijadwalkan_admin':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Dijadwalkan Admin</span>;
      case 'ditolak_dosen':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Ditolak Dosen</span>;
      case 'ditolak_admin':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Ditolak Admin</span>;
      case 'berlangsung':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Sedang Berlangsung</span>;
      case 'selesai':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">Selesai</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-y-auto"
      style={{
        backgroundImage: `url('/Batik.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#F8FAFB',
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 sm:px-8 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-colors"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-[#183449] uppercase tracking-[0.2em] bg-blue-50 px-2 py-0.5 rounded-full border border-[#588CBC]/20">
                  Dosen Pengampu
                </span>
                <span className="text-xs text-slate-400 font-medium">Gedung SFD</span>
              </div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">
                Pengajuan Ruangan oleh Mahasiswa / PJ Kelas
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchBookings}
            className="p-2 rounded-xl text-slate-500 hover:text-purple-900 hover:bg-purple-50 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 sm:px-8 py-6 flex flex-col gap-6">
        {/* Tab & Search Navigation */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'bg-[#183449] text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Menunggu Persetujuan</span>
              {pendingItems.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-purple-700 text-white text-[10px] rounded-full">
                  {pendingItems.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-[#183449] text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Riwayat Keputusan</span>
              {historyItems.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded-full">
                  {historyItems.length}
                </span>
              )}
            </button>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari mata kuliah atau PJ..."
              className="w-full text-xs bg-white pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="py-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-900 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Memuat pengajuan booking...</p>
          </div>
        )}

        {/* Tab 1: Menunggu Persetujuan */}
        {!loading && activeTab === 'pending' && (
          <div className="space-y-4">
            {filteredPending.length > 0 ? (
              filteredPending.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-bold text-slate-800">
                          {item.mata_kuliah}
                        </span>
                        <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                          {item.sks} SKS
                        </span>
                        {/* Penanda Pengajuan Bersyarat */}
                        {item.is_conditional && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Booking Bersyarat
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Diajukan oleh: <strong className="text-slate-700">{item.nama_pemohon}</strong> ({item.nim_pemohon}) • Kelas {item.kelas || '-'}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={submittingId === item.id}
                        onClick={() => handleApprove(item)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
                      >
                        {submittingId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                        Setujui
                      </button>
                      <button
                        type="button"
                        disabled={submittingId === item.id}
                        onClick={() => handleOpenRejectModal(item)}
                        className="flex items-center gap-2 px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                      >
                        <UserX className="w-4 h-4" />
                        Tolak
                      </button>
                    </div>
                  </div>

                  {/* Booking Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs">
                    <div className="flex items-center gap-2.5 text-slate-600">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{item.rooms?.kode || 'Ruangan'} - {item.rooms?.nama || ''}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-600">
                      <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{item.tanggal}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{item.jam_mulai?.slice(0, 5)} - {item.jam_selesai?.slice(0, 5)} WIB</span>
                    </div>
                  </div>

                  {/* Catatan Bersyarat Banner */}
                  {item.is_conditional && (
                    <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Catatan Booking Bersyarat:</strong> Permohonan ini menumpangi jadwal perkuliahan resmi di Gedung SFD.
                        Persetujuan Anda akan mengizinkan PJ Kelas memakai ruangan ini apabila jadwal resmi tidak digunakan/dibatalkan.
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  Tidak Ada Pengajuan Menunggu
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Semua pengajuan peminjaman ruangan dari PJ Kelas telah Anda proses.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Riwayat Keputusan */}
        {!loading && activeTab === 'history' && (
          <div className="space-y-4">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-bold text-slate-800">
                          {item.mata_kuliah} ({item.sks} SKS)
                        </span>
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-xs text-slate-500">
                        Diajukan oleh: {item.nama_pemohon} ({item.nim_pemohon}) • Kelas {item.kelas || '-'}
                      </p>
                    </div>

                    <div className="text-right text-[11px] text-slate-400">
                      Diputuskan: {item.dosen_responded_at ? new Date(item.dosen_responded_at).toLocaleDateString('id-ID') : '-'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs text-slate-600">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Ruangan: {item.rooms?.kode || '-'} ({item.rooms?.nama || ''})</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Tanggal: {item.tanggal}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Waktu: {item.jam_mulai?.slice(0, 5)} - {item.jam_selesai?.slice(0, 5)} WIB</span>
                    </div>
                  </div>

                  {item.alasan_tolak && (
                    <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700">
                      <strong>Alasan Penolakan:</strong> {item.alasan_tolak}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  Belum Ada Riwayat
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Riwayat persetujuan atau penolakan booking akan muncul di sini.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Tolak Pengajuan */}
      <AnimatePresence>
        {rejectItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Tolak Permohonan Booking</h3>
                  <p className="text-xs text-slate-400">
                    {rejectItem.mata_kuliah} • {rejectItem.nama_pemohon}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <label className="text-xs font-semibold text-slate-700">
                  Alasan Penolakan <span className="text-rose-500">* (minimal 10 karakter)</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    setRejectError('');
                  }}
                  rows={3}
                  placeholder="Tuliskan alasan penolakan untuk PJ Kelas..."
                  className="w-full text-xs p-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                />
                <div className="flex justify-between items-center text-[10px]">
                  <span className={rejectReason.length < 10 ? 'text-rose-500' : 'text-slate-400'}>
                    {rejectReason.length} / 10 karakter minimum
                  </span>
                </div>
                {rejectError && (
                  <p className="text-xs text-rose-600 font-medium">{rejectError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={submittingId !== null}
                  onClick={() => setRejectItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submittingId !== null}
                  onClick={handleConfirmReject}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  {submittingId === rejectItem.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Konfirmasi Tolak
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DosenApprovalView;
