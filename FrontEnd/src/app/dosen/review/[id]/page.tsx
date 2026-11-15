'use client';

import React, { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Building2,
  BookOpen,
  User,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldAlert,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default function DosenReviewPage({ params }: ReviewPageProps) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const actionParam = searchParams.get('action');

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal Actions
  const [submitting, setSubmitting] = useState(false);
  const [actionDone, setActionDone] = useState<{ type: 'setuju' | 'tolak'; msg: string } | null>(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const [showApproveModal, setShowApproveModal] = useState(false);

  useEffect(() => {
    async function fetchBooking() {
      if (!resolvedParams.id || !token) {
        setError('Tautan tidak valid. ID pengajuan atau token verifikasi tidak ditemukan.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/bookings/${resolvedParams.id}/review?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'Gagal memuat rincian pengajuan booking.');
        } else {
          setBooking(json.data);

          // Jika Dosen mengklik tombol ACC langsung dari email (tanpa perlu repot buka web)
          if (actionParam === 'setuju' && json.data.status === 'menunggu_dosen') {
            setSubmitting(true);
            try {
              const approveRes = await fetch(`/api/bookings/${resolvedParams.id}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token,
                  action: 'setuju',
                }),
              });
              const approveJson = await approveRes.json();
              if (approveRes.ok) {
                setActionDone({
                  type: 'setuju',
                  msg: 'Peminjaman ruangan telah berhasil Anda setujui (ACC)! Status ruangan pada web SiRuang otomatis berubah menjadi KUNING (Disetujui Dosen) dan email instruksi check-in telah terkirim ke PJ Kelas.',
                });
              } else {
                setError(approveJson.error || 'Gagal memproses persetujuan.');
              }
            } catch (apprErr: any) {
              setError('Terjadi kesalahan koneksi: ' + apprErr.message);
            } finally {
              setSubmitting(false);
            }
          } else if (actionParam === 'tolak' && json.data.status === 'menunggu_dosen') {
            setShowRejectModal(true);
          }
        }
      } catch (err: any) {
        setError('Gagal menghubungi server: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [resolvedParams.id, token, actionParam]);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${resolvedParams.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'setuju',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Gagal menyetujui pengajuan.');
      } else {
        setActionDone({
          type: 'setuju',
          msg: 'Peminjaman ruangan telah berhasil Anda setujui (ACC)! Status ruangan pada denah web SiRuang otomatis berubah menjadi KUNING (Disetujui Dosen) dan email instruksi check-in telah terkirim ke PJ Kelas.',
        });
        setShowApproveModal(false);
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (rejectReason.trim().length < 10) {
      setRejectError('Alasan penolakan wajib diisi minimal 10 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${resolvedParams.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'tolak',
          alasan: rejectReason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setRejectError(json.error || 'Gagal menolak pengajuan.');
      } else {
        setActionDone({
          type: 'tolak',
          msg: `Pengajuan peminjaman telah ditolak dengan alasan: "${rejectReason.trim()}". Notifikasi telah dikirimkan ke PJ Kelas pemohon.`,
        });
        setShowRejectModal(false);
      }
    } catch (err: any) {
      setRejectError('Terjadi kesalahan: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFB] flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Background Batik Accent */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: `url('/Batik.png')`, backgroundRepeat: 'repeat' }}
      />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Header */}
        <div className="bg-[#183449] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg">
              SR
            </div>
            <div>
              <h1 className="text-lg font-bold">SiRuang — Konfirmasi Dosen</h1>
              <p className="text-xs text-slate-300">Persetujuan Peminjaman Ruangan Kuliah</p>
            </div>
          </div>
          <span className="text-xs bg-white/15 px-3 py-1 rounded-full font-medium">Gedung SFD</span>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8">
          {loading && (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#588CBC] mx-auto mb-3" />
              <p className="text-sm text-slate-500">Memuat data pengajuan booking...</p>
            </div>
          )}

          {submitting && !actionDone && (
            <div className="py-16 text-center">
              <Loader2 className="w-9 h-9 animate-spin text-emerald-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 mb-1">Memproses Persetujuan (ACC)...</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Status ruangan pada web SiRuang sedang diperbarui secara realtime dan notifikasi check-in dikirimkan ke PJ Kelas.
              </p>
            </div>
          )}

          {!submitting && error && (
            <div className="py-8 text-center">
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-2">Tautan Tidak Dapat Diproses</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">{error}</p>
            </div>
          )}

          {!submitting && !loading && !error && actionDone && (
            <div className="py-8 text-center">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  actionDone.type === 'setuju' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}
              >
                {actionDone.type === 'setuju' ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <XCircle className="w-8 h-8" />
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {actionDone.type === 'setuju' ? 'Persetujuan (ACC) Berhasil!' : 'Penolakan Terkirim'}
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-5 leading-relaxed">{actionDone.msg}</p>

              {actionDone.type === 'setuju' && (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 max-w-md mx-auto mb-6 text-left space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-800 font-semibold">Status Denah di Web:</span>
                    <span className="bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-black uppercase text-[10px]">Kuning (Siap Check-in)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-800 font-semibold">Email Check-in PJ:</span>
                    <span className="text-emerald-700 font-bold">Otomatis Terkirim ✓</span>
                  </div>
                </div>
              )}

              <div className="inline-block bg-slate-100 text-slate-600 text-xs px-4 py-2 rounded-lg font-medium">
                Persetujuan selesai. Anda dapat menutup tab ini.
              </div>
            </div>
          )}

          {!submitting && !loading && !error && !actionDone && booking && (
            <div className="space-y-6">
              {/* Status Alert if not pending */}
              {booking.status !== 'menunggu_dosen' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-amber-800">
                      Pengajuan Sudah Tidak Berstatus Menunggu
                    </div>
                    <p className="text-xs text-amber-700 mt-1">
                      Status saat ini:{' '}
                      <span className="font-bold uppercase tracking-wider">{booking.status}</span>.
                      Tindakan telah tercatat sebelumnya pada{' '}
                      {booking.dosen_responded_at
                        ? new Date(booking.dosen_responded_at).toLocaleString('id-ID')
                        : '-'}
                      .
                    </p>
                  </div>
                </div>
              )}

              {/* Conditional Info Badge */}
              {booking.is_conditional && (
                <div className="p-4 bg-amber-500/10 border border-amber-300 rounded-xl flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <span className="font-bold">Perhatian: Peminjaman Bersyarat!</span>
                    <p className="mt-1">
                      Ruangan ini memiliki jadwal perkuliahan resmi pada hari dan jam tersebut. Pengajuan
                      hanya berlaku jika pemilik jadwal resmi berhalangan hadir.
                    </p>
                  </div>
                </div>
              )}

              {/* Main Info Grid */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <Building2 className="w-5 h-5 text-[#588CBC]" />
                    <span>
                      {booking.rooms?.kode || 'Ruangan'} — {booking.rooms?.nama || ''}
                    </span>
                  </div>
                  <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md font-medium">
                    Lantai {booking.rooms?.lantai || 8}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-1">Mata Kuliah:</span>
                    <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-[#588CBC]" />
                      {booking.mata_kuliah} ({booking.sks} SKS)
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1">Dosen Pengampu:</span>
                    <div className="font-semibold text-slate-800">{booking.nama_dosen}</div>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1">Hari & Tanggal:</span>
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {booking.tanggal}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1">Waktu Peminjaman:</span>
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {booking.jam_mulai?.slice(0, 5)} - {booking.jam_selesai?.slice(0, 5)} WIB
                    </div>
                  </div>
                </div>
              </div>

              {/* PJ Kelas Info */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Informasi Pemohon (PJ Kelas)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>
                      <strong>{booking.nama_pemohon}</strong> (NIM: {booking.nim_pemohon})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-slate-400" />
                    <span>
                      Kelas: <strong>{booking.kelas || '-'}</strong> (Angkatan{' '}
                      {booking.angkatan || '-'})
                    </span>
                  </div>
                  <div className="sm:col-span-2 text-slate-500">
                    Prodi: {booking.prodi || '-'} • Fakultas: {booking.fakultas || '-'}
                  </div>
                </div>
              </div>

              {/* Action Buttons (Only enabled if status is 'menunggu_dosen') */}
              {booking.status === 'menunggu_dosen' && (
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setShowApproveModal(true)}
                    className="flex-1 py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Setujui Permohonan
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="flex-1 py-3 px-5 bg-white hover:bg-red-50 text-red-600 border border-red-200 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition"
                  >
                    <XCircle className="w-4 h-4" />
                    Tolak Permohonan
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      <AnimatePresence>
        {showApproveModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 text-center mb-2">
                Konfirmasi Persetujuan
              </h3>
              <p className="text-xs text-slate-600 text-center leading-relaxed mb-6">
                Apakah Bapak/Ibu yakin menyetujui peminjaman ruangan{' '}
                <strong>{booking?.rooms?.kode}</strong> untuk mata kuliah{' '}
                <strong>{booking?.mata_kuliah}</strong>? Permohonan ini akan diteruskan ke Admin untuk
                penjadwalan final.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleApprove}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Ya, Setujui
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 text-center mb-2">
                Tolak Pengajuan Booking
              </h3>
              <p className="text-xs text-slate-500 text-center mb-4">
                Berikan alasan penolakan agar PJ Kelas dapat memahami dan menyesuaikan jadwal:
              </p>

              <div className="space-y-2 mb-4">
                <textarea
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    setRejectError('');
                  }}
                  rows={3}
                  placeholder="Contoh: Jadwal bertabrakan dengan agenda rapat dosen / materi sudah tercakup..."
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:outline-none resize-none"
                />
                <div className="flex justify-between items-center text-[11px]">
                  <span className={rejectReason.length < 10 ? 'text-red-500' : 'text-slate-400'}>
                    {rejectReason.length} / minimal 10 karakter
                  </span>
                </div>
                {rejectError && <p className="text-xs text-red-600 font-medium">{rejectError}</p>}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleReject}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Kirim Penolakan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

