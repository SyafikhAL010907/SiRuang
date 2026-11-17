'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox,
  Clock,
  Building2,
  UserCheck,
  UserX,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Search,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';

export interface DosenApprovalViewProps {
  onBack: () => void;
}

/* ───────────────────────── Helper tanggal ───────────────────────── */

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

interface TanggalInfo {
  hari: string;
  day: number;
  bulan: string;
  relatif: string | null;
}

/** Parse "YYYY-MM-DD" secara lokal (tanpa geser zona waktu). */
function parseTanggal(t?: string): TanggalInfo | null {
  if (!t) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isNaN(date.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);

  return {
    hari: HARI[date.getDay()],
    day: date.getDate(),
    bulan: BULAN[date.getMonth()],
    relatif: diff === 0 ? 'Hari ini' : diff === 1 ? 'Besok' : null,
  };
}

function formatJam(item: any) {
  return `${item.jam_mulai?.slice(0, 5) || '--:--'} - ${item.jam_selesai?.slice(0, 5) || '--:--'} WIB`;
}

/* ───────────────────────── Komponen kecil ───────────────────────── */

const DateTile: React.FC<{ tanggal?: string; soft?: boolean }> = ({ tanggal, soft }) => {
  const info = parseTanggal(tanggal);
  const base = soft
    ? 'bg-slate-100 text-slate-700 border border-slate-200/80'
    : 'bg-[#183449] text-white';
  const muted = soft ? 'text-slate-400' : 'text-white/70';

  return (
    <div
      className={`w-[68px] shrink-0 rounded-2xl flex flex-col items-center justify-center py-2.5 ${base}`}
      aria-label={tanggal ? `Tanggal ${tanggal}` : 'Tanggal belum diisi'}
    >
      {info ? (
        <>
          <span className={`text-[11px] font-semibold leading-none ${muted}`}>{info.hari}</span>
          <span className="text-2xl font-black leading-none my-1.5">{info.day}</span>
          <span className={`text-[11px] font-semibold leading-none ${muted}`}>{info.bulan}</span>
        </>
      ) : (
        <span className="text-sm font-bold">-</span>
      )}
    </div>
  );
};

const MetaItem: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
    <span className="text-slate-400 shrink-0">{icon}</span>
    <span className="truncate">{children}</span>
  </span>
);

type Toast = { type: 'success' | 'error'; message: string } | null;

/* ───────────────────────── Halaman ───────────────────────── */

export const DosenApprovalView: React.FC<DosenApprovalViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Modal Setujui State
  const [approveItem, setApproveItem] = useState<any | null>(null);
  const [approveError, setApproveError] = useState('');

  // Modal Tolak State
  const [rejectItem, setRejectItem] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Notifikasi hasil aksi
  const [toast, setToast] = useState<Toast>(null);

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

  // Toast hilang otomatis
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  // Esc menutup modal (selama tidak sedang mengirim)
  useEffect(() => {
    if (!approveItem && !rejectItem) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && submittingId === null) {
        setApproveItem(null);
        setRejectItem(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [approveItem, rejectItem, submittingId]);

  /* ───── Aksi: Setujui ───── */

  const handleApprove = (item: any) => {
    setApproveError('');
    setApproveItem(item);
  };

  const handleConfirmApprove = async () => {
    if (!approveItem) return;
    const item = approveItem;

    setSubmittingId(item.id);
    setApproveError('');
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
        setApproveError(json.error || 'Gagal menyetujui peminjaman');
      } else {
        setApproveItem(null);
        setToast({ type: 'success', message: 'Permohonan disetujui dan diteruskan ke Admin.' });
        fetchBookings();
      }
    } catch (err: any) {
      setApproveError('Terjadi kesalahan: ' + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  /* ───── Aksi: Tolak ───── */

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
        setRejectItem(null);
        setToast({ type: 'success', message: 'Permohonan ditolak. Notifikasi dikirim ke PJ Kelas.' });
        fetchBookings();
      }
    } catch (err: any) {
      setRejectError('Terjadi kesalahan: ' + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  /* ───── Data turunan ───── */

  const pendingItems = bookings.filter((b) => b.status === 'menunggu_dosen');
  const historyItems = bookings.filter((b) => b.status !== 'menunggu_dosen');

  const matchesSearch = (item: any) => {
    const q = searchQuery.toLowerCase();
    return (
      (item.mata_kuliah || '').toLowerCase().includes(q) ||
      (item.nama_pemohon || '').toLowerCase().includes(q) ||
      (item.nim_pemohon || '').toLowerCase().includes(q) ||
      (item.rooms?.kode || '').toLowerCase().includes(q)
    );
  };

  const filteredPending = pendingItems.filter(matchesSearch);
  const filteredHistory = historyItems.filter(matchesSearch);

  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'disetujui_dosen':
        return { label: 'Disetujui, siap check-in', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-4 h-4" />, iconCls: 'text-emerald-600' };
      case 'dijadwalkan_admin':
        return { label: 'Dijadwalkan Admin', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-4 h-4" />, iconCls: 'text-emerald-600' };
      case 'ditolak_dosen':
        return { label: 'Ditolak Dosen', cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: <XCircle className="w-4 h-4" />, iconCls: 'text-rose-500' };
      case 'ditolak_admin':
        return { label: 'Ditolak Admin', cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: <XCircle className="w-4 h-4" />, iconCls: 'text-rose-500' };
      case 'berlangsung':
        return { label: 'Sedang berlangsung', cls: 'bg-sky-50 text-sky-700 border-sky-200', icon: <Clock className="w-4 h-4" />, iconCls: 'text-sky-600' };
      case 'selesai':
        return { label: 'Selesai', cls: 'bg-slate-100 text-slate-700 border-slate-300', icon: <CheckCircle2 className="w-4 h-4" />, iconCls: 'text-slate-500' };
      default:
        return { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: <Clock className="w-4 h-4" />, iconCls: 'text-slate-400' };
    }
  };

  const isSearching = searchQuery.trim().length > 0;

  /* ───────────────────────── Render ───────────────────────── */

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
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 sm:px-8 py-3.5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[#588CBC]/20"
              title="Kembali ke Dashboard"
              aria-label="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#588CBC] leading-none">
                Dosen Pengampu &middot; Gedung SFD
              </p>
              <h1 className="text-xl font-black text-slate-800 tracking-tight mt-1.5 truncate">
                Pengajuan Ruangan oleh PJ Kelas
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchBookings}
            disabled={loading}
            className="p-2.5 rounded-xl text-slate-500 hover:text-[#183449] hover:bg-slate-100/80 disabled:opacity-60 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[#588CBC]/20"
            title="Muat ulang data"
            aria-label="Muat ulang data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 sm:px-8 py-6 flex flex-col gap-5">
        {/* Tab & Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div
            className="inline-flex items-center gap-1 p-1 bg-white/90 rounded-2xl border border-slate-200/80 self-start"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'pending'}
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#588CBC]/20 ${
                activeTab === 'pending'
                  ? 'bg-[#183449] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Menunggu persetujuan</span>
              {pendingItems.length > 0 && (
                <span
                  className={`min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-black ${
                    activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-rose-500 text-white'
                  }`}
                >
                  {pendingItems.length}
                </span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#588CBC]/20 ${
                activeTab === 'history'
                  ? 'bg-[#183449] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Riwayat keputusan</span>
              {historyItems.length > 0 && (
                <span
                  className={`min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-black ${
                    activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {historyItems.length}
                </span>
              )}
            </button>
          </div>

          <div className="relative sm:max-w-xs w-full group">
            <Search className="w-4 h-4 text-slate-300 group-focus-within:text-[#588CBC] transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari mata kuliah, PJ, atau ruangan..."
              className="w-full text-xs font-medium text-slate-700 placeholder:text-slate-400 bg-white/90 pl-10 pr-3 py-2.5 rounded-2xl border border-slate-200/80 focus:outline-none focus:bg-white focus:border-[#588CBC] focus:ring-4 focus:ring-[#588CBC]/10 transition-all"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white/90 rounded-2xl border border-slate-100 py-14 text-center">
            <Loader2 className="w-7 h-7 animate-spin text-[#588CBC] mx-auto mb-2.5" />
            <p className="text-xs font-medium text-slate-500">Memuat pengajuan booking...</p>
          </div>
        )}

        {/* Tab 1: Menunggu Persetujuan */}
        {!loading && activeTab === 'pending' && (
          <div className="space-y-3">
            {filteredPending.length > 0 ? (
              filteredPending.map((item) => {
                const info = parseTanggal(item.tanggal);
                return (
                  <article
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 sm:p-5">
                      <DateTile tanggal={item.tanggal} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-slate-800">{item.mata_kuliah}</h3>
                          <span className="text-[11px] font-semibold text-[#183449] bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-full">
                            {item.sks} SKS
                          </span>
                          {info?.relatif && (
                            <span className="text-[11px] font-semibold text-[#588CBC] bg-[#588CBC]/10 px-2 py-0.5 rounded-full">
                              {info.relatif}
                            </span>
                          )}
                          {item.is_conditional && (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Booking bersyarat
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 mt-1.5">
                          Diajukan oleh <strong className="font-bold text-slate-700">{item.nama_pemohon}</strong>
                          {item.nim_pemohon ? ` (${item.nim_pemohon})` : ''}, Kelas {item.kelas || '-'}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3">
                          <MetaItem icon={<Building2 className="w-4 h-4" />}>
                            {item.rooms?.kode || 'Ruangan'}
                            {item.rooms?.nama ? ` - ${item.rooms.nama}` : ''}
                          </MetaItem>
                          <MetaItem icon={<Clock className="w-4 h-4" />}>{formatJam(item)}</MetaItem>
                        </div>
                      </div>

                      {/* Aksi */}
                      <div className="flex items-center gap-2 shrink-0 lg:self-center">
                        <button
                          type="button"
                          disabled={submittingId === item.id}
                          onClick={() => handleApprove(item)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25"
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
                          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 rounded-xl text-xs font-bold transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20"
                        >
                          <UserX className="w-4 h-4" />
                          Tolak
                        </button>
                      </div>
                    </div>

                    {/* Catatan bersyarat */}
                    {item.is_conditional && (
                      <div className="px-4 sm:px-5 py-3 bg-amber-50/70 border-t border-amber-200/70 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p>
                          Permohonan ini menumpang jadwal kuliah resmi di Gedung SFD. Jika Anda setujui, PJ Kelas
                          boleh memakai ruangan ini hanya bila jadwal resminya tidak digunakan atau dibatalkan.
                        </p>
                      </div>
                    )}
                  </article>
                );
              })
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-14 px-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  {isSearching && pendingItems.length > 0 ? (
                    <Search className="w-5 h-5" />
                  ) : (
                    <Inbox className="w-5 h-5" />
                  )}
                </div>
                <h3 className="text-sm font-black text-slate-800 mb-1">
                  {isSearching && pendingItems.length > 0
                    ? 'Tidak ada hasil yang cocok'
                    : 'Tidak ada pengajuan yang menunggu'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {isSearching && pendingItems.length > 0
                    ? 'Coba kata kunci lain, misalnya nama mata kuliah, nama PJ, atau kode ruangan.'
                    : 'Semua pengajuan dari PJ Kelas sudah Anda proses. Pengajuan baru akan muncul di sini.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Riwayat Keputusan */}
        {!loading && activeTab === 'history' && (
          <div className="space-y-3">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((item) => {
                const st = getStatusMeta(item.status);
                return (
                  <article
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <DateTile tanggal={item.tanggal} soft />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-slate-800">{item.mata_kuliah}</h3>
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-full">
                            {item.sks} SKS
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-1.5">
                          Diajukan oleh <strong className="font-bold text-slate-700">{item.nama_pemohon}</strong>
                          {item.nim_pemohon ? ` (${item.nim_pemohon})` : ''}, Kelas {item.kelas || '-'}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3">
                          <MetaItem icon={<Building2 className="w-4 h-4" />}>
                            {item.rooms?.kode || '-'}
                            {item.rooms?.nama ? ` (${item.rooms.nama})` : ''}
                          </MetaItem>
                          <MetaItem icon={<Clock className="w-4 h-4" />}>{formatJam(item)}</MetaItem>
                        </div>
                      </div>

                      <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${st.cls}`}
                        >
                          <span className={st.iconCls}>{st.icon}</span>
                          {st.label}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Diputuskan{' '}
                          {item.dosen_responded_at
                            ? new Date(item.dosen_responded_at).toLocaleDateString('id-ID')
                            : '-'}
                        </span>
                      </div>
                    </div>

                    {item.alasan_tolak && (
                      <div className="mt-4 px-3.5 py-3 bg-rose-50/70 border border-rose-100 rounded-xl text-xs text-rose-800 leading-relaxed">
                        <span className="font-bold">Alasan penolakan:</span> {item.alasan_tolak}
                      </div>
                    )}
                  </article>
                );
              })
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-14 px-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  {isSearching && historyItems.length > 0 ? (
                    <Search className="w-5 h-5" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                </div>
                <h3 className="text-sm font-black text-slate-800 mb-1">
                  {isSearching && historyItems.length > 0 ? 'Tidak ada hasil yang cocok' : 'Belum ada riwayat'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {isSearching && historyItems.length > 0
                    ? 'Coba kata kunci lain, misalnya nama mata kuliah, nama PJ, atau kode ruangan.'
                    : 'Pengajuan yang sudah Anda setujui atau tolak akan tercatat di sini.'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Setujui Pengajuan */}
      <AnimatePresence>
        {approveItem && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => {
              if (submittingId === null) setApproveItem(null);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Setujui permohonan booking"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-800">Setujui permohonan booking?</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Peminjaman ruangan <strong className="text-slate-700">{approveItem.rooms?.kode || 'ruangan'}</strong>{' '}
                    untuk mata kuliah <strong className="text-slate-700">{approveItem.mata_kuliah}</strong> akan
                    diteruskan ke Admin.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-3.5 py-3 bg-slate-50 border border-slate-100 rounded-2xl mb-4">
                <MetaItem icon={<Building2 className="w-4 h-4" />}>
                  {approveItem.rooms?.kode || '-'}
                  {approveItem.rooms?.nama ? ` - ${approveItem.rooms.nama}` : ''}
                </MetaItem>
                <MetaItem icon={<Clock className="w-4 h-4" />}>
                  {approveItem.tanggal}, {formatJam(approveItem)}
                </MetaItem>
              </div>

              {approveError && (
                <p className="text-xs text-rose-600 font-medium mb-3" role="alert">
                  {approveError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={submittingId !== null}
                  onClick={() => setApproveItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submittingId !== null}
                  onClick={handleConfirmApprove}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  {submittingId === approveItem.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Setujui
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Tolak Pengajuan */}
      <AnimatePresence>
        {rejectItem && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => {
              if (submittingId === null) setRejectItem(null);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Tolak permohonan booking"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                  <UserX className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-800">Tolak permohonan booking</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {rejectItem.mata_kuliah}, diajukan oleh {rejectItem.nama_pemohon}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <label htmlFor="alasan-tolak" className="text-xs font-semibold text-slate-700">
                  Alasan penolakan <span className="text-rose-500">(minimal 10 karakter)</span>
                </label>
                <textarea
                  id="alasan-tolak"
                  autoFocus
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    setRejectError('');
                  }}
                  rows={3}
                  placeholder="Tuliskan alasan penolakan untuk PJ Kelas..."
                  className="w-full text-xs p-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 resize-none"
                />
                <div className="flex justify-between items-center text-[11px]">
                  <span className={rejectReason.trim().length < 10 ? 'text-rose-500' : 'text-slate-400'}>
                    {rejectReason.trim().length} / 10 karakter minimum
                  </span>
                </div>
                {rejectError && (
                  <p className="text-xs text-rose-600 font-medium" role="alert">
                    {rejectError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={submittingId !== null}
                  onClick={() => setRejectItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50 rounded-xl transition-all"
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
                  Tolak permohonan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast hasil aksi */}
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            className={`fixed bottom-6 right-6 z-[60] max-w-sm flex items-start gap-3 pl-4 pr-3 py-3 rounded-2xl shadow-lg border text-xs font-medium ${
              toast.type === 'success'
                ? 'bg-white border-emerald-200 text-slate-700'
                : 'bg-white border-rose-200 text-slate-700'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 -mr-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DosenApprovalView;