'use client';

import React, { useEffect, useState, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Loader2,
  Ban,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { isAdminDev } from '@/lib/roles';

interface AdminReviewPageProps {
  params: Promise<{ id: string }>;
}

function AdminReviewContent({ params }: AdminReviewPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
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

  // Proteksi AdminDev: jika yang login adalah AdminDev, tolak dan redirect ke /admin (view-only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        if (isAdminDev(u.role)) {
          alert('Akses Ditolak: Admin Dev hanya memiliki hak view-only pada persetujuan booking.');
          router.replace('/admin');
        }
      }
    } catch {}
  }, [router]);

  useEffect(() => {
    async function fetchBooking() {
      if (!resolvedParams.id || !token) {
        setError('Tautan tidak valid. ID pengajuan atau token verifikasi admin gedung tidak ditemukan.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/bookings/${resolvedParams.id}/quick-action-admin?token=${encodeURIComponent(token)}&format=json`
        );
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'Gagal memuat rincian pengajuan booking.');
        } else {
          setBooking(json.data);

          // Jika link email membawa aksi tolak, langsung buka modal
          if (actionParam === 'tolak') {
            const canAct =
              (json.data.approval_admin_gedung === 'pending' || !json.data.approval_admin_gedung) &&
              ['menunggu_approval', 'menunggu_dosen'].includes(json.data.status);
            if (canAct) {
              setShowRejectModal(true);
            }
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
      const res = await fetch(`/api/bookings/${resolvedParams.id}/quick-action-admin`, {
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
          msg: json.message || 'Peminjaman ruangan telah berhasil Anda setujui sebagai Admin Gedung.',
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
      const res = await fetch(`/api/bookings/${resolvedParams.id}/quick-action-admin`, {
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
          msg: `Pengajuan peminjaman telah ditolak dengan alasan: "${rejectReason.trim()}". Notifikasi penolakan telah otomatis dikirimkan ke PJ Kelas pemohon.`,
        });
        setShowRejectModal(false);
      }
    } catch (err: any) {
      setRejectError('Terjadi kesalahan: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isRejectedOrFinal =
    booking &&
    ['ditolak', 'ditolak_dosen', 'ditolak_admin', 'dibatalkan', 'dibatalkan_prioritas', 'hangus', 'kedaluwarsa', 'selesai'].includes(
      booking.status
    );

  const canAct =
    booking &&
    !isRejectedOrFinal &&
    (booking.approval_admin_gedung === 'pending' || !booking.approval_admin_gedung) &&
    ['menunggu_approval', 'menunggu_dosen'].includes(booking.status);

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
              AG
            </div>
            <div>
              <h1 className="text-lg font-bold">SiRuang — Persetujuan Admin Gedung</h1>
              <p className="text-xs text-slate-300">Persetujuan &amp; Verifikasi Penggunaan Ruangan</p>
            </div>
          </div>
          <span className="text-xs bg-white/15 px-3 py-1 rounded-full font-medium">
            {booking?.rooms?.gedung ? `Gedung ${booking.rooms.gedung}` : 'Admin Gedung'}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8">
          {loading && (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#588CBC] mx-auto mb-3" />
              <p className="text-sm text-slate-500">Memuat rincian permohonan ruangan...</p>
            </div>
          )}

          {submitting && !actionDone && (
            <div className="py-16 text-center">
              <Loader2 className="w-9 h-9 animate-spin text-emerald-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 mb-1">Memproses Tindakan...</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Status permohonan sedang diperbarui secara atomik di sistem SiRuang.
              </p>
            </div>
          )}

          {!submitting && error && (
            <div className="py-8 text-center">
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-7 h-7" />
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
                {actionDone.type === 'setuju' ? 'Persetujuan Admin Berhasil Disimpan!' : 'Penolakan Berhasil Dikirim'}
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-5 leading-relaxed">{actionDone.msg}</p>

              <div className="inline-block bg-slate-100 text-slate-600 text-xs px-4 py-2 rounded-lg font-medium">
                Tindakan selesai. Anda dapat menutup tab ini.
              </div>
            </div>
          )}

          {!submitting && !loading && !error && !actionDone && booking && (
            <div className="space-y-6">
              {/* Alert jika sudah ditolak / selesai */}
              {isRejectedOrFinal && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-rose-800">
                      Pengajuan Sudah Tidak Aktif ({booking.status.toUpperCase()})
                    </div>
                    <div className="text-xs text-rose-700 mt-1">
                      {booking.ditolak_oleh ? (
                        <>
                          Pengajuan ini telah ditolak oleh{' '}
                          <strong>
                            {booking.ditolak_oleh === 'dosen' ? 'Dosen Pengampu' : 'Admin Gedung'}
                          </strong>
                          .
                        </>
                      ) : (
                        'Pengajuan ini sudah tidak dapat diproses lagi.'
                      )}
                      {(booking.alasan_tolak_admin_gedung ||
                        booking.alasan_tolak_dosen ||
                        booking.alasan_tolak) && (
                        <p className="mt-1 font-medium italic">
                          Alasan: &ldquo;
                          {booking.alasan_tolak_admin_gedung ||
                            booking.alasan_tolak_dosen ||
                            booking.alasan_tolak}
                          &rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Status Persetujuan Per Pihak */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Approval Dosen
                    </p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {booking.nama_dosen || 'Dosen Pengampu'}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      booking.approval_dosen === 'disetujui' ||
                      booking.status === 'disetujui_dosen' ||
                      booking.status === 'dijadwalkan'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : booking.approval_dosen === 'ditolak' || booking.status === 'ditolak_dosen'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {booking.approval_dosen === 'disetujui' ||
                    booking.status === 'disetujui_dosen' ||
                    booking.status === 'dijadwalkan'
                      ? '✓ Disetujui'
                      : booking.approval_dosen === 'ditolak' || booking.status === 'ditolak_dosen'
                      ? '✕ Ditolak'
                      : '⏳ Menunggu'}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Approval Admin Gedung
                    </p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      Gedung {booking.rooms?.gedung || '-'}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      booking.approval_admin_gedung === 'disetujui' || booking.status === 'dijadwalkan'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : booking.approval_admin_gedung === 'ditolak' ||
                          booking.status === 'ditolak_admin'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {booking.approval_admin_gedung === 'disetujui' || booking.status === 'dijadwalkan'
                      ? '✓ Disetujui'
                      : booking.approval_admin_gedung === 'ditolak' ||
                        booking.status === 'ditolak_admin'
                      ? '✕ Ditolak'
                      : '⏳ Menunggu'}
                  </span>
                </div>
              </div>

              {/* Detail Ruangan & Mata Kuliah */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between border-b border-slate-200/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#183449]/10 text-[#183449] rounded-xl flex items-center justify-center font-bold text-base">
                      {booking.rooms?.kode?.replace('R.', '') || 'R'}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        {booking.rooms?.kode} — {booking.rooms?.nama}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Gedung {booking.rooms?.gedung} &bull; Lantai {booking.rooms?.lantai || '-'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs bg-[#588CBC]/10 text-[#588CBC] font-bold px-3 py-1 rounded-full">
                    {booking.sks} SKS
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" /> Mata Kuliah
                    </span>
                    <p className="font-bold text-slate-800 text-sm">{booking.mata_kuliah}</p>
                    <p className="text-slate-500">Kelas: {booking.kelas}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Waktu Perkuliahan
                    </span>
                    <p className="font-bold text-slate-800 text-sm">{booking.tanggal}</p>
                    <p className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#588CBC]" />
                      {booking.jam_mulai?.slice(0, 5)} - {booking.jam_selesai?.slice(0, 5)} WIB
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Pemohon (PJ Kelas)
                    </span>
                    <p className="font-bold text-slate-800">{booking.nama_pemohon}</p>
                    <p className="text-slate-500">NIM: {booking.nim_pemohon}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" /> Dosen Pengampu
                    </span>
                    <p className="font-bold text-slate-800">{booking.nama_dosen}</p>
                    {booking.prodi && <p className="text-slate-500">{booking.prodi}</p>}
                  </div>
                </div>

                {booking.is_conditional && (
                  <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-lg flex items-center gap-2 text-xs text-amber-800 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Peminjaman ini Bersyarat (menumpangi jadwal perkuliahan resmi).
                  </div>
                )}
              </div>

              {/* Action Buttons (Hanya aktif jika belum direspons dan belum final) */}
              {canAct ? (
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => setShowApproveModal(true)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Setujui (ACC) Pengajuan
                  </button>

                  <button
                    onClick={() => {
                      setRejectReason('');
                      setRejectError('');
                      setShowRejectModal(true);
                    }}
                    className="flex-1 bg-white hover:bg-rose-50 text-rose-600 font-bold py-3.5 px-4 rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    <Ban className="w-4 h-4" />
                    Tolak Pengajuan
                  </button>
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-slate-400">
                  Tombol aksi dinonaktifkan karena permohonan telah selesai diproses atau dibatalkan.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Konfirmasi Persetujuan (ACC) */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Persetujuan Admin Gedung</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apakah Anda yakin menyetujui peminjaman ruangan <strong>{booking?.rooms?.kode}</strong> untuk mata
                kuliah <strong>{booking?.mata_kuliah}</strong>?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleApprove}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Menyetujui...' : 'Ya, Setujui'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tolak Pengajuan */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Ban className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Tolak Permohonan Ruangan</h3>
              <p className="text-xs text-slate-500">
                Berikan alasan penolakan yang jelas untuk diteruskan ke PJ Kelas pemohon.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">
                Alasan Penolakan Admin Gedung *
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectError) setRejectError('');
                }}
                placeholder="Contoh: Ruangan sedang dalam pemeliharaan berkala atau dialokasikan untuk ujian..."
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none font-medium text-slate-800"
              />
              <div className="flex justify-between items-center text-[10px]">
                <span className={rejectReason.trim().length < 10 ? 'text-rose-500' : 'text-slate-400'}>
                  {rejectReason.trim().length} / 10 karakter minimum
                </span>
                {rejectError && <span className="text-rose-600 font-semibold">{rejectError}</span>}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting || rejectReason.trim().length < 10}
                onClick={handleReject}
                className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Menolak...' : 'Kirim Penolakan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminReviewPage({ params }: AdminReviewPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#588CBC]" />
        </div>
      }
    >
      <AdminReviewContent params={params} />
    </Suspense>
  );
}

