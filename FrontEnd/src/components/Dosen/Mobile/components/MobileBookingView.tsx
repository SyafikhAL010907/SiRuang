'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  UserX,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export interface MobileBookingViewProps {
  onGoToDenah?: () => void;
}

export const MobileBookingView: React.FC<MobileBookingViewProps> = ({ onGoToDenah }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'history'>('all');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Reject Modal State
  const [rejectItem, setRejectItem] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      let token = localStorage.getItem('token');
      if (!token) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            token = JSON.parse(storedUser).token;
          } catch {}
        }
      }
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
      console.error('Gagal memuat booking mobile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleApprove = async (item: any) => {
    if (!confirm(`Setujui peminjaman ${item.rooms?.kode || 'ruangan'} untuk mata kuliah ${item.mata_kuliah}?`)) return;

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
        alert('Permohonan telah ditolak.');
        setRejectItem(null);
        fetchBookings();
      }
    } catch (err: any) {
      setRejectError('Terjadi kesalahan: ' + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const isPending = (b: any) =>
    b.status === 'menunggu_dosen' ||
    (b.status === 'menunggu_approval' && (b.approval_dosen === 'pending' || !b.approval_dosen));

  const filteredBookings = bookings.filter((b) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return isPending(b);
    if (activeFilter === 'approved') return b.status === 'disetujui_dosen' || b.status === 'dijadwalkan' || b.status === 'dijadwalkan_admin' || b.approval_dosen === 'disetujui';
    if (activeFilter === 'history') return !isPending(b);
    return true;
  });

  const getStatusConfig = (status: string, bk?: any) => {
    if (bk?.approval_dosen === 'disetujui' && bk?.approval_admin_gedung === 'pending') {
      return { label: 'Disetujui Anda (Menunggu Admin)', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    switch (status) {
      case 'menunggu_approval':
      case 'menunggu_dosen':
        return { label: 'Menunggu Persetujuan', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'dijadwalkan':
      case 'dijadwalkan_admin':
      case 'disetujui_dosen':
        return { label: 'Resmi Terjadwal (Siap Check-in)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'ditolak':
      case 'ditolak_dosen':
        return { label: 'Ditolak Dosen', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'ditolak_admin':
        return { label: 'Ditolak Admin', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'berlangsung':
        return { label: 'Berlangsung', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'selesai':
        return { label: 'Selesai', color: 'bg-slate-100 text-slate-700 border-slate-200' };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
  };

  const countPending = bookings.filter(isPending).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full bg-[#F8FAFB] overflow-hidden select-none"
      style={{
        backgroundImage: `url('/Batik.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Curved Header */}
      <div className="bg-gradient-to-br from-[#183449] to-[#2B5474] rounded-b-[36px] px-6 pt-10 pb-7 shadow-xl relative overflow-hidden shrink-0 z-20">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#588CBC]/20 rounded-full blur-3xl pointer-events-none" />
        <header className="relative z-10 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays size={16} className="text-[#588CBC]" />
              <span className="text-[9px] font-black text-sky-200 uppercase tracking-[0.25em]">
                Persetujuan Dosen
              </span>
            </div>
            <button
              type="button"
              onClick={fetchBookings}
              className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight leading-tight">
            Pengajuan Ruangan Mahasiswa
          </h2>
          <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
            Verifikasi dan berikan persetujuan permohonan ruangan kuliah dari PJ Kelas.
          </p>
        </header>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 sm:px-6 pt-4 pb-36 relative z-10">
        <div className="flex flex-col gap-4">
          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 p-1 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-x-auto scrollbar-hide">
            {[
              { id: 'all', label: `Semua (${bookings.length})` },
              { id: 'pending', label: `Menunggu (${countPending})` },
              { id: 'approved', label: 'Disetujui' },
              { id: 'history', label: 'Riwayat' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === f.id
                    ? 'bg-[#183449] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="py-12 text-center bg-white/80 backdrop-blur-md rounded-3xl border border-slate-100">
              <Loader2 size={24} className="animate-spin text-[#183449] mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Memuat pengajuan...</p>
            </div>
          )}

          {/* Booking Cards List */}
          {!loading && filteredBookings.length > 0 ? (
            filteredBookings.map((bk) => {
              const cfg = getStatusConfig(bk.status, bk);
              return (
                <div
                  key={bk.id}
                  className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-100 p-4.5 shadow-md shadow-slate-200/30 flex flex-col gap-3"
                >
                  {/* Card Header: Room & Status */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-[#588CBC]" />
                      <span className="text-[11px] font-bold text-slate-800">
                        {bk.rooms?.kode || 'Ruangan'} • Lantai {bk.rooms?.lantai || 8}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${cfg.color}`}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="flex flex-col gap-1.5">
                    <h4 className="text-sm font-black text-slate-800 tracking-tight">
                      {bk.mata_kuliah} ({bk.sks} SKS)
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">Gedung {bk.rooms?.gedung || 'SFD'} — {bk.rooms?.nama || ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                      <Clock size={12} className="text-slate-400 shrink-0" />
                      <span>{bk.tanggal} • {bk.jam_mulai?.slice(0, 5)} - {bk.jam_selesai?.slice(0, 5)} WIB</span>
                    </div>
                  </div>

                  {/* Pemohon info */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-medium text-slate-600 flex flex-col gap-0.5">
                    <div>
                      <span className="font-bold text-slate-700">Pemohon: </span>
                      {bk.nama_pemohon} ({bk.nim_pemohon})
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Kelas: </span>
                      {bk.kelas || '-'} ({bk.prodi || '-'})
                    </div>
                  </div>

                  {/* Bersyarat warning */}
                  {bk.is_conditional && (
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-800 flex items-start gap-1.5">
                      <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                      <span><strong>Bersyarat:</strong> Menumpangi jadwal perkuliahan resmi Gedung SFD.</span>
                    </div>
                  )}

                  {/* Action Buttons for Pending */}
                  {isPending(bk) && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        disabled={submittingId === bk.id}
                        onClick={() => handleApprove(bk)}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                      >
                        {submittingId === bk.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <UserCheck size={13} />
                        )}
                        Setujui
                      </button>
                      <button
                        type="button"
                        disabled={submittingId === bk.id}
                        onClick={() => {
                          setRejectItem(bk);
                          setRejectReason('');
                          setRejectError('');
                        }}
                        className="flex-1 py-2 px-3 border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <UserX size={13} />
                        Tolak
                      </button>
                    </div>
                  )}

                  {bk.alasan_tolak && (
                    <div className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-[10px] text-rose-700">
                      <strong>Alasan:</strong> {bk.alasan_tolak}
                    </div>
                  )}
                </div>
              );
            })
          ) : !loading && (
            <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-100 p-8 text-center flex flex-col items-center justify-center shadow-sm">
              <CheckCircle2 size={32} className="text-emerald-400 mb-2" />
              <p className="text-xs font-bold text-slate-700">Tidak ada pengajuan pada filter ini</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Semua permohonan telah diproses atau belum ada pengajuan baru.</p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <UserX size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Tolak Permohonan Booking</h3>
                  <p className="text-[10px] text-slate-400">
                    {rejectItem.mata_kuliah} • {rejectItem.nama_pemohon}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                <label className="text-[10px] font-semibold text-slate-700">
                  Alasan Penolakan <span className="text-rose-500">* (min 10 karakter)</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    setRejectError('');
                  }}
                  rows={3}
                  placeholder="Tuliskan alasan penolakan..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                />
                <div className="flex justify-between items-center text-[9px]">
                  <span className={rejectReason.length < 10 ? 'text-rose-500' : 'text-slate-400'}>
                    {rejectReason.length} / 10 karakter minimum
                  </span>
                </div>
                {rejectError && (
                  <p className="text-[10px] text-rose-600 font-medium">{rejectError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={submittingId !== null}
                  onClick={() => setRejectItem(null)}
                  className="px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submittingId !== null}
                  onClick={handleConfirmReject}
                  className="px-3 py-1.5 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  {submittingId === rejectItem.id && <Loader2 size={12} className="animate-spin" />}
                  Konfirmasi Tolak
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MobileBookingView;
