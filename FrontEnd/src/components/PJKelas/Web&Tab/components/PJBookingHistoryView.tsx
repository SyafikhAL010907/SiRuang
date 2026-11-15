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
} from 'lucide-react';
import { exportBookingsToExcel } from '@/lib/excelExport';

export interface PJBookingHistoryViewProps {
  onBack: () => void;
  onOpenBookingModal?: () => void;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  menunggu_dosen: { label: 'Menunggu Dosen', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  disetujui_dosen: { label: 'Disetujui Dosen ✓', cls: 'bg-blue-50 text-[#183449] border-[#588CBC]/30' },
  ditolak_dosen: { label: 'Ditolak Dosen', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  dijadwalkan_admin: { label: 'Terjadwal', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ditolak_admin: { label: 'Ditolak Admin', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  menunggu_checkin: { label: 'Menunggu Presensi', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  berlangsung: { label: 'Sedang Berlangsung', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  selesai: { label: 'Selesai', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  dibatalkan: { label: 'Dibatalkan', cls: 'bg-rose-50 text-rose-600 border-rose-200' },
};

export const PJBookingHistoryView: React.FC<PJBookingHistoryViewProps> = ({
  onBack,
  onOpenBookingModal,
}) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkinLoadingId, setCheckinLoadingId] = useState<string | null>(null);

  const handleCheckin = async (id: string, kodeRuang: string) => {
    if (!confirm(`Konfirmasi kehadiran dan check-in peminjaman untuk ruangan ${kodeRuang}?`)) return;

    setCheckinLoadingId(id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/bookings/${id}/checkin`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Gagal melakukan check-in.');
      } else {
        alert(`Check-in berhasil! Ruangan ${kodeRuang} kini berstatus sedang digunakan.`);
        fetchUserBookings();
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setCheckinLoadingId(null);
    }
  };

  const filterOptions = [
    { id: 'all', label: 'Semua Status' },
    { id: 'menunggu_dosen', label: 'Menunggu Dosen' },
    { id: 'disetujui_dosen', label: 'Menunggu Admin' },
    { id: 'dijadwalkan_admin', label: 'Terjadwal' },
    { id: 'berlangsung', label: 'Berlangsung' },
    { id: 'selesai', label: 'Selesai' },
    { id: 'ditolak', label: 'Ditolak' },
  ];

  const fetchUserBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/bookings');
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

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const matchesSearch =
        searchQuery === '' ||
        b.mata_kuliah?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.rooms?.kode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.nama_dosen?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterStatus === 'all') return true;
      if (filterStatus === 'ditolak') {
        return b.status === 'ditolak_dosen' || b.status === 'ditolak_admin';
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
                <span className="text-xs text-slate-400 font-medium">Gedung SFD</span>
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

        {/* Content Table / Cards */}
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
              const st = STATUS_BADGE[b.status] || {
                label: b.status,
                cls: 'bg-slate-100 text-slate-600 border-slate-200',
              };
              return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                        {b.rooms?.kode || 'Ruangan'}
                      </span>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>
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

                    <h4 className="text-sm font-bold text-slate-800 leading-snug">{b.mata_kuliah}</h4>
                    <p className="text-xs text-slate-500 mt-1">Dosen: {b.nama_dosen}</p>

                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-[#588CBC]" />
                        <span>{b.tanggal}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-[#588CBC]" />
                        <span>
                          {b.jam_mulai?.slice(0, 5)} - {b.jam_selesai?.slice(0, 5)} WIB ({b.sks} SKS)
                        </span>
                      </div>
                    </div>

                    {b.alasan_tolak && (
                      <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-[11px] text-rose-700 leading-relaxed">
                        <strong>Alasan Penolakan:</strong> {b.alasan_tolak}
                      </div>
                    )}

                    {/* Check-in dipusatkan di halaman PJCheckinView, bukan di sini */}
                    {b.status === 'berlangsung' && (
                      <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        Ruangan sedang digunakan — presensi sudah dikonfirmasi.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default PJBookingHistoryView;
