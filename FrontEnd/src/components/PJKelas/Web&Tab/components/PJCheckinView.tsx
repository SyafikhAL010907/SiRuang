'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  Building2,
  ArrowLeft,
  AlertCircle,
  CalendarCheck2,
  ShieldCheck,
  RotateCw,
  Loader2,
  Calendar,
  Sparkles,
} from 'lucide-react';

export interface PJCheckinViewProps {
  onBack: () => void;
}

interface BookingItem {
  id: string;
  room_id: string;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  sks: number;
  mata_kuliah: string;
  kelas: string;
  nama_dosen?: string;
  status: string;
  is_conditional?: boolean;
  check_in_at?: string | null;
  rooms?: {
    id: string;
    kode: string;
    nama: string;
    gedung: string;
    lantai: number;
  } | null;
}

export const PJCheckinView: React.FC<PJCheckinViewProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [todayBookings, setTodayBookings] = useState<BookingItem[]>([]);
  const [checkinLoadingId, setCheckinLoadingId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchTodayBookings = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Ambil dari /api/bookings
      let list: BookingItem[] = [];
      try {
        const res = await fetch('/api/bookings', { headers });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            list = json.data;
          }
        }
      } catch (e) {
        console.warn('Gagal fetch /api/bookings:', e);
      }

      // 2. Fallback /api/user/bookings jika list masih kosong
      if (list.length === 0) {
        try {
          const resUser = await fetch('/api/user/bookings', { headers });
          if (resUser.ok) {
            const jsonUser = await resUser.json();
            if (jsonUser.data && Array.isArray(jsonUser.data)) {
              list = jsonUser.data;
            }
          }
        } catch (e) {
          console.warn('Gagal fetch /api/user/bookings:', e);
        }
      }

      // 3. Fallback ekstra: ekstrak langsung dari status ruangan Gedung SFD (Lantai 8 & 3)
      if (list.length === 0) {
        try {
          const [res8, res3] = await Promise.all([
            fetch('/api/rooms/status?gedung=SFD&lantai=8'),
            fetch('/api/rooms/status?gedung=SFD&lantai=3'),
          ]);
          const [json8, json3] = await Promise.all([
            res8.ok ? res8.json() : null,
            res3.ok ? res3.json() : null,
          ]);

          const extracted: BookingItem[] = [];
          const extractFromRooms = (dataObj: any) => {
            if (!dataObj) return;
            Object.values(dataObj).forEach((room: any) => {
              if (room.bookings && Array.isArray(room.bookings)) {
                room.bookings.forEach((b: any) => {
                  extracted.push({
                    id: b.id,
                    room_id: b.room_id || room.id,
                    tanggal: b.tanggal,
                    jam_mulai: b.jam_mulai,
                    jam_selesai: b.jam_selesai,
                    sks: b.sks || 2,
                    mata_kuliah: b.mata_kuliah,
                    kelas: b.kelas || '-',
                    nama_dosen: b.nama_dosen,
                    status: b.status,
                    is_conditional: b.is_conditional,
                    rooms: {
                      id: b.room_id || room.id,
                      kode: room.kode || b.rooms?.kode || 'Ruangan',
                      nama: room.nama || b.rooms?.nama || '',
                      gedung: room.gedung || 'SFD',
                      lantai: room.lantai || 8,
                    },
                  });
                });
              }
            });
          };

          extractFromRooms(json8?.data);
          extractFromRooms(json3?.data);

          if (extracted.length > 0) {
            list = extracted;
          }
        } catch (e) {
          console.warn('Gagal fallback ekstrak status ruangan:', e);
        }
      }

      // Filter peminjaman yang aktif (termasuk menunggu_dosen, disetujui dosen, siap checkin, berlangsung)
      const filtered = list.filter(
        (b: BookingItem) =>
          ['menunggu_dosen', 'disetujui_dosen', 'dijadwalkan_admin', 'menunggu_checkin', 'berlangsung'].includes(b.status)
      );

      // Urutkan berdasarkan tanggal lalu jam mulai
      filtered.sort((a: BookingItem, b: BookingItem) => {
        const dateCmp = (a.tanggal || '').localeCompare(b.tanggal || '');
        if (dateCmp !== 0) return dateCmp;
        return (a.jam_mulai || '').localeCompare(b.jam_mulai || '');
      });

      setTodayBookings(filtered);
    } catch (err) {
      console.warn('Gagal memuat jadwal check-in:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayBookings();
    const interval = setInterval(fetchTodayBookings, 15000);
    return () => clearInterval(interval);
  }, [fetchTodayBookings]);

  const handleCheckin = async (id: string, kodeRuang: string) => {
    if (!confirm(`Konfirmasi kehadiran presensi dan check-in ruangan ${kodeRuang}?`)) return;

    setCheckinLoadingId(id);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`/api/bookings/${id}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Gagal melakukan check-in.');
      } else {
        alert(`Check-in berhasil! Ruangan ${kodeRuang} kini berstatus sedang digunakan (Warna denah menjadi Merah).`);
        fetchTodayBookings();
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setCheckinLoadingId(null);
    }
  };

  // Helper evaluasi window waktu check-in
  const getWindowInfo = (b: BookingItem) => {
    if (b.status === 'berlangsung') {
      return {
        isOpen: false,
        isCompleted: true,
        text: `Sudah Check-in (${b.check_in_at ? new Date(b.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Aktif'})`,
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }

    // Peminjaman yang telah di-ACC dosen / siap checkin: SELALU DIBUKA
    // (Bisa dilakukan sejak disetujui termasuk H-1/hari sebelumnya hingga toleransi 30 menit setelah kuliah dimulai)
    if (b.status === 'disetujui_dosen' || b.status === 'dijadwalkan_admin' || b.status === 'menunggu_checkin') {
      return {
        isOpen: true,
        isCompleted: false,
        text: 'Presensi Dibuka (Siap Check-in · Ubah Denah Jadi Merah)',
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse',
      };
    }

    if (b.status === 'menunggu_dosen') {
      return {
        isOpen: true,
        isCompleted: false,
        text: 'Menunggu ACC Dosen (Siap Check-in Langsung)',
        cls: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse',
      };
    }

    return {
      isOpen: false,
      isCompleted: false,
      text: 'Menunggu Persetujuan Dosen',
      cls: 'bg-slate-50 text-slate-600 border-slate-200',
    };
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
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-[#588CBC] hover:bg-blue-50 transition-colors cursor-pointer"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-[#183449] uppercase tracking-[0.2em] bg-blue-50 px-2 py-0.5 rounded-full border border-[#588CBC]/20">
                  Presensi Kehadiran
                </span>
                <span className="text-xs text-slate-400 font-medium">Gedung SFD</span>
              </div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">
                Jadwal & Check-in Aktif
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchTodayBookings}
            disabled={loading}
            className="p-2 rounded-xl text-slate-500 hover:text-[#588CBC] hover:bg-blue-50 transition-colors cursor-pointer"
            title="Segarkan data"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 sm:px-8 py-6 flex flex-col gap-6">
        {/* Aturan Check-in Banner */}
        <div className="bg-white/80 backdrop-blur-sm border border-[#588CBC]/20 rounded-3xl p-5 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-[#183449] text-white flex items-center justify-center shrink-0 shadow-md">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs">
            <h4 className="font-black text-[#183449] text-sm mb-1">
              Ketentuan Check-in Kehadiran PJ Kelas
            </h4>
            <p className="text-slate-600 leading-relaxed mb-2">
              Sebagai PJ Kelas, Anda dapat melakukan check-in kehadiran ruangan di Gedung SFD:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Check-in dapat dilakukan <strong>sejak permohonan disetujui Dosen</strong> (termasuk H-1 / hari sebelumnya).</li>
              <li>Batas toleransi maksimal check-in adalah <strong>30 menit setelah jam mulai perkuliahan</strong>.</li>
              <li>Konfirmasi check-in Anda langsung mengaktifkan ruangan dan mengubah warna denah menjadi <strong>Merah (Sedang Digunakan)</strong>.</li>
            </ul>
          </div>
        </div>

        {/* Content Section */}
        {loading && todayBookings.length === 0 ? (
          <div className="flex-1 min-h-[300px] flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-[#588CBC]" />
              <span>Memeriksa jadwal check-in aktif...</span>
            </div>
          </div>
        ) : todayBookings.length === 0 ? (
          /* Empty State */
          <div className="flex-1 min-h-[350px] bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
              <CalendarCheck2 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Tidak Ada Jadwal Aktif
            </h3>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
              Anda belum memiliki peminjaman ruangan yang sudah disetujui untuk hari ini maupun mendatang.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/80">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Jendela presensi: Terbuka sejak disetujui Dosen s/d 30 menit setelah jam mulai kuliah</span>
            </div>
          </div>
        ) : (
          /* Active Bookings Grid */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {todayBookings.map((b) => {
              const windowInfo = getWindowInfo(b);
              const roomKode = b.rooms?.kode || 'Ruangan';
              const roomNama = b.rooms?.nama || '';
              const lantai = b.rooms?.lantai || 8;
              const isToday = b.tanggal === todayStr;
              const tglDisplay = new Date(b.tanggal + 'T00:00:00').toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              });

              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Room & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 text-[#183449] flex items-center justify-center font-black text-sm border border-slate-200">
                          {roomKode.replace('R.', '')}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800">{roomKode}</h4>
                          <p className="text-[11px] text-slate-400 font-medium">
                            Gedung SFD · Lantai {lantai}
                          </p>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                            📅 {tglDisplay}
                          </p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${windowInfo.cls}`}>
                        {b.status === 'berlangsung'
                          ? 'Sedang Digunakan'
                          : b.status === 'disetujui_dosen'
                          ? 'Disetujui Dosen ✓'
                          : b.status === 'menunggu_dosen'
                          ? 'Menunggu ACC Dosen'
                          : 'Terjadwal'}
                      </span>
                    </div>

                    {/* Matkul & Dosen */}
                    <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100 space-y-1">
                      <p className="text-xs font-bold text-slate-800">{b.mata_kuliah}</p>
                      <p className="text-[11px] text-slate-500">
                        Kelas: <strong className="text-slate-700">{b.kelas}</strong> · {b.sks} SKS
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Dosen: {b.nama_dosen || 'Dosen Pengampu'}
                      </p>
                    </div>

                    {/* Waktu & Jendela Status */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#588CBC]" />
                        <span className="font-semibold text-slate-700">
                          {b.jam_mulai.slice(0, 5)} - {b.jam_selesai.slice(0, 5)} WIB
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{windowInfo.text}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {b.status === 'berlangsung' ? (
                      <div className="w-full py-2.5 px-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Presensi Sudah Dikonfirmasi (Ruangan Merah)</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={checkinLoadingId === b.id}
                        onClick={() => handleCheckin(b.id, roomKode)}
                        className="w-full py-2.5 px-4 bg-[#183449] hover:bg-[#122838] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm hover:shadow active:scale-[0.98] cursor-pointer"
                      >
                        {checkinLoadingId === b.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span>Check-in Sekarang ({roomKode})</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default PJCheckinView;
