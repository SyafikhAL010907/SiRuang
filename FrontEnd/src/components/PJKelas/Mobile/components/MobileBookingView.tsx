'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCw,
  Plus,
  ArrowRight,
  Calendar,
  Loader2,
  GraduationCap,
  Building2,
  ShieldAlert,
} from 'lucide-react';
import {
  getDosenApprovalInfo,
  getAdminGedungApprovalInfo,
  getCombinedStatusBadge,
  isBookingRejected,
  getRejectionDetails,
} from '@/lib/pjBookingStatus';
import AjukanUlangModal from '@/components/PJKelas/Shared/Modals/AjukanUlangModal';

export interface MobileBookingViewProps {
  onGoToDenah?: () => void;
}

export const MobileBookingView: React.FC<MobileBookingViewProps> = ({ onGoToDenah }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'menunggu' | 'terjadwal' | 'selesai' | 'ditolak'>('all');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkinLoadingId, setCheckinLoadingId] = useState<string | null>(null);
  const [selectedBookingForReapply, setSelectedBookingForReapply] = useState<any | null>(null);
  const [isAjukanUlangOpen, setIsAjukanUlangOpen] = useState(false);

  const handleCheckin = async (id: string, kodeRuang: string) => {
    if (!confirm(`Konfirmasi check-in untuk ruangan ${kodeRuang}?`)) return;

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
        alert(`Check-in berhasil untuk ${kodeRuang}!`);
        fetchBookings();
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setCheckinLoadingId(null);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/bookings');
      if (res.ok) {
        const json = await res.json();
        setBookings(json.data || []);
      }
    } catch (e) {
      console.warn('Gagal memuat booking mobile:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleOpenAjukanUlang = (booking: any) => {
    setSelectedBookingForReapply(booking);
    setIsAjukanUlangOpen(true);
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'ditolak') {
        return isBookingRejected(b);
      }
      if (activeFilter === 'menunggu') {
        return (
          b.status === 'menunggu_approval' ||
          b.status === 'menunggu_dosen' ||
          b.status === 'disetujui_dosen'
        );
      }
      if (activeFilter === 'terjadwal') {
        return (
          b.status === 'dijadwalkan' ||
          b.status === 'dijadwalkan_admin' ||
          b.status === 'menunggu_checkin'
        );
      }
      if (activeFilter === 'selesai') {
        return b.status === 'selesai';
      }
      return b.status === activeFilter;
    });
  }, [bookings, activeFilter]);

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
      <div className="bg-linear-to-br from-[#183449] to-[#2B5474] rounded-b-[36px] px-6 pt-10 pb-7 shadow-xl relative overflow-hidden shrink-0 z-20">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#588CBC]/20 rounded-full blur-3xl pointer-events-none" />
        <header className="relative z-10 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-[#588CBC]" />
              <span className="text-[9px] font-black text-sky-200 uppercase tracking-[0.25em]">
                Reservasi Ruangan
              </span>
            </div>
            <button
              onClick={fetchBookings}
              disabled={loading}
              className="text-slate-300 hover:text-white p-1"
              title="Segarkan"
            >
              <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight leading-tight">
            Riwayat &amp; Pengajuan Booking
          </h2>
          <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
            Pantau status verifikasi peminjaman ruangan perkuliahan Anda.
          </p>
        </header>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 sm:px-6 pt-4 pb-36 relative z-10">
        <div className="flex flex-col gap-4">
          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 p-1 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-100 shadow-xs overflow-x-auto scrollbar-hide">
            {[
              { id: 'all', label: `Semua (${bookings.length})` },
              { id: 'menunggu', label: 'Menunggu' },
              { id: 'terjadwal', label: 'Terjadwal' },
              { id: 'selesai', label: 'Selesai' },
              { id: 'ditolak', label: 'Ditolak' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id as any)}
                className={`flex-1 py-1.5 px-3 rounded-xl text-[11px] font-bold tracking-tight transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  activeFilter === f.id
                    ? 'bg-[#183449] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Booking List */}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-xs font-bold text-slate-400 gap-2 bg-white rounded-3xl border border-slate-100">
              <RotateCw size={16} className="animate-spin text-[#588CBC]" />
              <span>Memuat data booking...</span>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-slate-100 shadow-xs text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                <CalendarDays size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Belum Ada Booking</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Pilih ruangan di denah interaktif untuk mengajukan peminjaman baru.
                </p>
              </div>
              {onGoToDenah && (
                <button
                  type="button"
                  onClick={onGoToDenah}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#588CBC] hover:underline"
                >
                  <span>Buka Denah Gedung</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          ) : (
            filteredBookings.map((b) => {
              const st = getCombinedStatusBadge(b);
              const dosenInfo = getDosenApprovalInfo(b);
              const adminGedungInfo = getAdminGedungApprovalInfo(b);
              const isRejected = isBookingRejected(b);
              const rejection = isRejected ? getRejectionDetails(b) : null;
              const gedungLabel = b.rooms?.gedung ? `Gedung ${b.rooms.gedung}` : '';

              return (
                <div
                  key={b.id}
                  className="bg-white/95 backdrop-blur-md rounded-3xl p-4 border border-slate-100 shadow-xs flex flex-col gap-3"
                >
                  {/* Top Bar: Ruangan, Gedung, dan Status Gabungan */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-[#588CBC] font-bold text-[10px]">
                        <MapPin size={12} />
                        <span>{gedungLabel ? `${gedungLabel} · ` : ''}{b.rooms?.kode || 'Ruangan'}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mt-0.5">
                        {b.mata_kuliah} {b.kelas ? `(${b.kelas})` : ''}
                      </h4>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${st.cls}`}>
                        {st.label}
                      </span>
                      {b.is_conditional && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <AlertTriangle size={9} />
                          Bersyarat
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tanggal & Waktu Rentang */}
                  <div className="flex flex-col gap-1.5 text-[11px] text-slate-600 bg-slate-50/80 p-3 rounded-2xl border border-slate-100/80">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-slate-400 shrink-0" />
                      <span>{b.tanggal}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-slate-400 shrink-0" />
                      <span>
                        {b.jam_mulai?.slice(0, 5)} - {b.jam_selesai?.slice(0, 5)} WIB ({b.sks} SKS)
                      </span>
                    </div>
                  </div>

                  {/* Dua Baris Status Per Pihak */}
                  <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2 text-xs">
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

                  {/* Jika Ditolak: Siapa yang menolak & alasannya */}
                  {isRejected && rejection && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs text-rose-800 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-900">
                        <ShieldAlert size={14} className="text-rose-600 shrink-0" />
                        <span>Ditolak oleh: {rejection.penolak}</span>
                      </div>
                      <p className="text-[11px] text-rose-700 leading-relaxed pl-5">
                        <strong>Alasan:</strong> {rejection.alasan}
                      </p>
                    </div>
                  )}

                  {/* Tombol Ajukan Ulang: HANYA untuk status Ditolak */}
                  {isRejected && (
                    <div className="pt-2 border-t border-slate-100">
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

                  {/* Tombol Check-in jika terjadwal */}
                  {(b.status === 'dijadwalkan_admin' || b.status === 'dijadwalkan' || b.status === 'menunggu_checkin') && (
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        disabled={checkinLoadingId === b.id}
                        onClick={() => handleCheckin(b.id, b.rooms?.kode || 'Ruangan')}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        {checkinLoadingId === b.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={13} />
                        )}
                        Check-in Ruangan
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Ajukan Ulang */}
      <AjukanUlangModal
        isOpen={isAjukanUlangOpen}
        booking={selectedBookingForReapply}
        onClose={() => {
          setIsAjukanUlangOpen(false);
          setSelectedBookingForReapply(null);
        }}
        onSuccess={() => {
          fetchBookings();
        }}
      />
    </motion.div>
  );
};

export default MobileBookingView;
