'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Clock,
  Building2,
  Search,
  ArrowLeft,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  RotateCw,
  Calendar,
  Loader2,
  FileSpreadsheet,
  GraduationCap,
  ShieldAlert,
} from 'lucide-react';
import { exportBookingsToExcel } from '@/lib/excelExport';
import {
  getDosenApprovalInfo,
  getAdminGedungApprovalInfo,
  getCombinedStatusBadge,
  isBookingRejected,
  getRejectionDetails,
} from '@/lib/pjBookingStatus';
import AjukanUlangModal from '@/components/PJKelas/Shared/Modals/AjukanUlangModal';

export interface PJBookingHistoryViewProps {
  onBack: () => void;
  onOpenBookingModal?: () => void;
}

export const PJBookingHistoryView: React.FC<PJBookingHistoryViewProps> = ({
  onBack,
  onOpenBookingModal,
}) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookingForReapply, setSelectedBookingForReapply] = useState<any | null>(null);
  const [isAjukanUlangOpen, setIsAjukanUlangOpen] = useState(false);

  const filterOptions = [
    { id: 'all', label: 'Semua Status' },
    { id: 'menunggu', label: 'Menunggu' },
    { id: 'terjadwal', label: 'Terjadwal' },
    { id: 'berlangsung', label: 'Berlangsung' },
    { id: 'selesai', label: 'Selesai' },
    { id: 'ditolak', label: 'Ditolak' },
  ];

  const fetchUserBookings = async () => {
    setLoading(true);
    try {
      let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token && typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            token = JSON.parse(storedUser).token;
          } catch {}
        }
      }
      const res = await fetch('/api/user/bookings', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setBookings(json.data || []);
      }
    } catch (e) {
      console.warn('Gagal memuat booking PJ:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserBookings();
  }, []);

  const handleOpenAjukanUlang = (booking: any) => {
    setSelectedBookingForReapply(booking);
    setIsAjukanUlangOpen(true);
  };

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const matchesSearch =
        searchQuery === '' ||
        b.mata_kuliah?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.rooms?.kode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.rooms?.gedung?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.nama_dosen?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterStatus === 'all') return true;

      if (filterStatus === 'ditolak') {
        return isBookingRejected(b);
      }
      if (filterStatus === 'menunggu') {
        return (
          b.status === 'menunggu_approval' ||
          b.status === 'menunggu_dosen' ||
          b.status === 'disetujui_dosen'
        );
      }
      if (filterStatus === 'terjadwal') {
        return (
          b.status === 'dijadwalkan' ||
          b.status === 'dijadwalkan_admin' ||
          b.status === 'menunggu_checkin'
        );
      }
      if (filterStatus === 'berlangsung') {
        return b.status === 'berlangsung';
      }
      if (filterStatus === 'selesai') {
        return b.status === 'selesai';
      }

      return b.status === filterStatus;
    });
  }, [bookings, searchQuery, filterStatus]);

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
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-colors cursor-pointer"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-[#183449] uppercase tracking-[0.2em] bg-blue-50 px-2 py-0.5 rounded-full border border-[#588CBC]/20">
                  PJ Kelas
                </span>
                <span className="text-xs text-slate-400 font-medium">Peminjaman Ruangan</span>
              </div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">
                Riwayat Pengajuan Peminjaman
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportBookingsToExcel(filtered, 'Riwayat_Booking_PJ_Kelas')}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              title="Ekspor riwayat ke Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Ekspor Excel</span>
            </button>
            <button
              type="button"
              onClick={fetchUserBookings}
              disabled={loading}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-colors cursor-pointer"
              title="Segarkan data"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onOpenBookingModal}
              className="flex items-center gap-2 px-4 py-2 bg-[#183449] hover:bg-[#122838] text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ajukan Peminjaman</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 sm:px-8 py-6 flex flex-col gap-5">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari mata kuliah, ruangan, atau dosen..."
              className="w-full text-xs bg-white pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#588CBC]/20 focus:border-[#588CBC] transition-all"
            />
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
            {filterOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilterStatus(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  filterStatus === opt.id
                    ? 'bg-[#183449] text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Cards */}
        {loading ? (
          <div className="flex-1 min-h-[300px] flex items-center justify-center bg-white rounded-3xl border border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <RotateCw className="w-4 h-4 animate-spin text-[#588CBC]" />
              <span>Memuat riwayat peminjaman...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 min-h-[350px] bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#183449] mb-4 shadow-inner">
              <CalendarDays className="w-8 h-8 text-[#588CBC]" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Belum Ada Pengajuan Booking
            </h3>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-6">
              Seluruh data permohonan peminjaman ruangan yang diajukan oleh Anda untuk kelas ini akan tercatat dan dapat dipantau di sini.
            </p>
            <button
              type="button"
              onClick={onOpenBookingModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#588CBC] hover:bg-[#46729c] text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Mulai Ajukan Ruangan
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((b) => {
              const st = getCombinedStatusBadge(b);
              const dosenInfo = getDosenApprovalInfo(b);
              const adminGedungInfo = getAdminGedungApprovalInfo(b);
              const isRejected = isBookingRejected(b);
              const rejection = isRejected ? getRejectionDetails(b) : null;
              const gedungLabel = b.rooms?.gedung ? `Gedung ${b.rooms.gedung}` : 'Gedung';

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {/* Header Card: Kode Ruang & Status Gabungan */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
                          {b.rooms?.kode || 'Ruangan'}
                        </span>
                        {b.rooms?.gedung && (
                          <span className="text-[10px] font-bold text-slate-400">
                            {gedungLabel}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${st.cls}`}>
                          {st.label}
                        </span>
                        {b.is_conditional && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Bersyarat
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mata Kuliah & Dosen */}
                    <h4 className="text-sm font-bold text-slate-800 leading-snug">
                      {b.mata_kuliah} {b.kelas ? `(${b.kelas})` : ''}
                    </h4>

                    {/* Rentang Waktu & Tanggal */}
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-[#588CBC] shrink-0" />
                        <span>{b.tanggal}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-[#588CBC] shrink-0" />
                        <span>
                          {b.jam_mulai?.slice(0, 5)} - {b.jam_selesai?.slice(0, 5)} WIB ({b.sks} SKS)
                        </span>
                      </div>
                    </div>

                    {/* Dua Baris Status Per Pihak */}
                    <div className="mt-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2 text-xs">
                      {/* Baris 1: Dosen */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <GraduationCap size={13} className="text-slate-400 shrink-0" />
                          <span className="text-slate-600 font-medium truncate text-[11px]">
                            Dosen: <strong className="text-slate-800">{b.nama_dosen || 'Dosen Pengampu'}</strong>
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${dosenInfo.badgeCls}`}>
                          {dosenInfo.label}
                        </span>
                      </div>

                      {/* Baris 2: Admin Gedung */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Building2 size={13} className="text-slate-400 shrink-0" />
                          <span className="text-slate-600 font-medium truncate text-[11px]">
                            Admin: <strong className="text-slate-800">{b.rooms?.gedung ? `Gedung ${b.rooms.gedung}` : 'Admin Gedung'}</strong>
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${adminGedungInfo.badgeCls}`}>
                          {adminGedungInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Jika ditolak: Tampilkan siapa yang menolak dan alasannya */}
                    {isRejected && rejection && (
                      <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs text-rose-800 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-rose-900">
                          <ShieldAlert size={14} className="text-rose-600 shrink-0" />
                          <span>Ditolak oleh: {rejection.penolak}</span>
                        </div>
                        <p className="text-[11px] text-rose-700 leading-relaxed pl-5">
                          <strong>Alasan:</strong> {rejection.alasan}
                        </p>
                      </div>
                    )}

                    {/* Ruangan sedang digunakan */}
                    {b.status === 'berlangsung' && (
                      <div className="mt-3 p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        Ruangan sedang digunakan — presensi sudah dikonfirmasi.
                      </div>
                    )}
                  </div>

                  {/* Tombol Ajukan Ulang: HANYA untuk status Ditolak */}
                  {isRejected && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleOpenAjukanUlang(b)}
                        className="w-full py-2.5 px-3 bg-[#183449] hover:bg-[#122838] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
                      >
                        <RotateCw size={13} />
                        <span>Ajukan Ulang</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Ajukan Ulang */}
      <AjukanUlangModal
        isOpen={isAjukanUlangOpen}
        booking={selectedBookingForReapply}
        onClose={() => {
          setIsAjukanUlangOpen(false);
          setSelectedBookingForReapply(null);
        }}
        onSuccess={() => {
          fetchUserBookings();
        }}
      />
    </div>
  );
};

export default PJBookingHistoryView;
