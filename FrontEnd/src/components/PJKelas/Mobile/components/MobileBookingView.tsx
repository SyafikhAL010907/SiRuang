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
} from 'lucide-react';

export interface MobileBookingViewProps {
  onGoToDenah?: () => void;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  menunggu_dosen: { label: 'Menunggu Dosen', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  disetujui_dosen: { label: 'Menunggu Admin', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  ditolak_dosen: { label: 'Ditolak Dosen', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  dijadwalkan_admin: { label: 'Terjadwal', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ditolak_admin: { label: 'Ditolak Admin', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  menunggu_checkin: { label: 'Menunggu Presensi', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  berlangsung: { label: 'Sedang Berlangsung', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  selesai: { label: 'Selesai', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  dibatalkan: { label: 'Dibatalkan', cls: 'bg-rose-50 text-rose-600 border-rose-200' },
};

export const MobileBookingView: React.FC<MobileBookingViewProps> = ({ onGoToDenah }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'menunggu_dosen' | 'dijadwalkan_admin' | 'selesai'>('all');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkinLoadingId, setCheckinLoadingId] = useState<string | null>(null);

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

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (activeFilter === 'all') return true;
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
            Pantau status verifikasi peminjaman ruangan Gedung SFD Anda.
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
              { id: 'menunggu_dosen', label: 'Menunggu' },
              { id: 'dijadwalkan_admin', label: 'Terjadwal' },
              { id: 'selesai', label: 'Selesai' },
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
                  <span>Buka Denah Gedung SFD</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          ) : (
            filteredBookings.map((b) => {
              const st = STATUS_BADGE[b.status] || {
                label: b.status,
                cls: 'bg-slate-100 text-slate-600 border-slate-200',
              };
              return (
                <div
                  key={b.id}
                  className="bg-white/95 backdrop-blur-md rounded-3xl p-4 border border-slate-100 shadow-xs flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-[#588CBC] font-bold text-[10px]">
                        <MapPin size={12} />
                        <span>Gedung SFD · {b.rooms?.kode || 'Ruangan'}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mt-0.5">
                        {b.mata_kuliah}
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

                  <div className="flex flex-col gap-1.5 text-[11px] text-slate-600 bg-slate-50/80 p-3 rounded-2xl border border-slate-100/80">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{b.tanggal}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-slate-400" />
                      <span>
                        {b.jam_mulai?.slice(0, 5)} - {b.jam_selesai?.slice(0, 5)} WIB ({b.sks} SKS)
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Dosen Pengampu: <strong>{b.nama_dosen}</strong>
                    </div>
                  </div>

                  {b.alasan_tolak && (
                    <div className="text-[11px] text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                      <strong>Alasan Tolak:</strong> {b.alasan_tolak}
                    </div>
                  )}

                  {(b.status === 'dijadwalkan_admin' || b.status === 'menunggu_checkin') && (
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
    </motion.div>
  );
};

export default MobileBookingView;
