'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  UserCheck,
  UserX,
  Clock,
  Mail,
  Phone,
  GraduationCap,
  Building,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

interface RegistrationDetail {
  id: string;
  username: string;
  identifier: string;
  identifier_type: string;
  requested_role: string;
  email: string | null;
  phone: string | null;
  faculty: string | null;
  kelas: string | null;
  prodi: string | null;
  angkatan: string | null;
  departemen: string | null;
  created_at: string;
  expires_at: string;
}

export default function AdminRegistrationReviewPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const actionParam = searchParams.get('action') || '';

  // Unwrap params using React.use()
  const resolvedParams = use(Promise.resolve(params));
  const requestId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RegistrationDetail | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal Tolak state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Status aksi
  const [actionSuccess, setActionSuccess] = useState<'approved' | 'rejected' | null>(null);
  const [actionMessage, setActionMessage] = useState('');

  // 1. Cek Admin Login dari LocalStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      if (storedUser && storedToken) {
        const parsed = JSON.parse(storedUser);
        if (parsed.role === 'admin') {
          setIsAdmin(true);
          setAdminToken(storedToken);
        }
      }
    } catch {
      // Ignored
    }
  }, []);

  // 2. Fetch Data Pengajuan
  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      setErrorMsg('');
      try {
        const query = token ? `?token=${encodeURIComponent(token)}` : '';
        const headers: Record<string, string> = {};
        if (adminToken) {
          headers['Authorization'] = `Bearer ${adminToken}`;
        }

        const res = await fetch(`/api/admin/registrations/${requestId}${query}`, {
          headers,
        });
        const resJson = await res.json();

        if (!res.ok) {
          setErrorMsg(resJson.error || 'Gagal memuat rincian pengajuan akun.');
          return;
        }

        setData(resJson.data);

        // Jika tautan email mengklik langsung tombol ACC (action=setuju)
        if (actionParam === 'setuju' && token) {
          setProcessing(true);
          try {
            const approveRes = await fetch(`/api/admin/registrations/${requestId}/approve`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
            });
            const approveJson = await approveRes.json();
            if (approveRes.ok) {
              setActionSuccess('approved');
              setActionMessage('Pengajuan akun berhasil disetujui (ACC)! Akun pengguna kini telah aktif dan email selamat datang telah dikirimkan ke calon pengguna.');
            } else {
              setErrorMsg(approveJson.error || 'Gagal menyetujui akun.');
            }
          } catch (apprErr: any) {
            setErrorMsg('Terjadi kendala saat memproses persetujuan: ' + apprErr.message);
          } finally {
            setProcessing(false);
          }
        } else if (actionParam === 'tolak' && token) {
          setIsRejectModalOpen(true);
        }
      } catch (err: any) {
        setErrorMsg('Terjadi kendala jaringan saat memuat data pengajuan.');
      } finally {
        setLoading(false);
      }
    }

    if (requestId) {
      fetchDetail();
    }
  }, [requestId, token, adminToken, actionParam]);

  // Handler Setujui
  const handleApprove = async () => {
    if (!adminToken && !token) {
      router.push(`/login?redirect=/admin/registration/${requestId}?token=${token}`);
      return;
    }

    setProcessing(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const res = await fetch(`/api/admin/registrations/${requestId}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ token }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        alert(resJson.error || 'Gagal menyetujui pengajuan akun.');
        return;
      }

      setActionSuccess('approved');
      setActionMessage('Pengajuan akun berhasil disetujui! Akun pengguna kini telah aktif dan email konfirmasi telah dikirimkan.');
    } catch (err) {
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setProcessing(false);
    }
  };

  // Handler Tolak
  const handleReject = async () => {
    if (!adminToken && !token) {
      router.push(`/login?redirect=/admin/registration/${requestId}?token=${token}`);
      return;
    }

    setProcessing(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const res = await fetch(`/api/admin/registrations/${requestId}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ token, reason: rejectReason.trim() }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        alert(resJson.error || 'Gagal menolak pengajuan akun.');
        return;
      }

      setIsRejectModalOpen(false);
      setActionSuccess('rejected');
      setActionMessage('Pengajuan akun telah ditolak dan data pengajuan telah dibersihkan.');
    } catch (err) {
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setProcessing(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'dosen':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 border border-purple-200">
            Dosen
          </span>
        );
      case 'pj_kelas':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200">
            PJ Kelas
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
            Mahasiswa
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <button
            onClick={() => router.push(isAdmin ? '/admin' : '/login')}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#183449] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {isAdmin ? 'Kembali ke Dashboard Admin' : 'Ke Halaman Login'}
          </button>
          <div className="text-right">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
              SiRuang Review Portal
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Loader2 className="w-8 h-8 text-[#183449] animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-sm">Memeriksa permohonan pendaftaran...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && errorMsg && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Tidak Dapat Membuka Pengajuan</h3>
            <p className="text-gray-600 text-sm max-w-md mx-auto mb-6">{errorMsg}</p>
            <button
              onClick={() => router.push(isAdmin ? '/admin' : '/login')}
              className="px-5 py-2.5 bg-[#183449] text-white rounded-xl text-sm font-medium hover:bg-[#122838] transition-colors"
            >
              {isAdmin ? 'Buka Dashboard Admin' : 'Masuk ke SiRuang'}
            </button>
          </div>
        )}

        {/* Success Action State */}
        {!loading && actionSuccess && (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-8 text-center">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Tindakan Berhasil</h3>
            <p className="text-gray-600 text-sm max-w-md mx-auto mb-6">{actionMessage}</p>
            <button
              onClick={() => router.push('/admin')}
              className="px-5 py-2.5 bg-[#183449] text-white rounded-xl text-sm font-medium hover:bg-[#122838] transition-colors"
            >
              Buka Manajemen Akun Admin
            </button>
          </div>
        )}

        {/* Detail Card */}
        {!loading && !errorMsg && !actionSuccess && data && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Not Logged In Notice (Hanya muncul jika tidak membawa token link email) */}
            {!isAdmin && !token && (
              <div className="bg-amber-50 border-b border-amber-100 p-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 flex-1">
                  <p className="font-semibold mb-1">Otentikasi Admin Diperlukan</p>
                  <p>
                    Anda dapat melihat rincian pengajuan ini, tetapi untuk
                    menyetujui atau menolak akun, Anda harus masuk sebagai <strong>Admin SiRuang</strong> atau menggunakan link verifikasi email resmi.
                  </p>
                  <button
                    onClick={() =>
                      router.push(
                        `/login?redirect=${encodeURIComponent(
                          `/admin/registration/${requestId}?token=${token}`
                        )}`
                      )
                    }
                    className="mt-2.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-xs transition-colors"
                  >
                    Masuk Sebagai Admin
                  </button>
                </div>
              </div>
            )}

            {/* Card Header */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Detail Permohonan Akun
                  </span>
                  <h1 className="text-xl font-bold text-gray-900">{data.username}</h1>
                  <p className="text-sm text-gray-500 font-mono mt-0.5">
                    {data.identifier_type.toUpperCase()}: {data.identifier}
                  </p>
                </div>
                <div>{getRoleBadge(data.requested_role)}</div>
              </div>
            </div>

            {/* Card Body Info */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {data.email && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-gray-400 block">Email</span>
                      <span className="font-medium text-gray-800 break-all">{data.email}</span>
                    </div>
                  </div>
                )}

                {data.phone && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-gray-400 block">No. HP / WhatsApp</span>
                      <span className="font-medium text-gray-800">{data.phone}</span>
                    </div>
                  </div>
                )}

                {data.faculty && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <Building className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-gray-400 block">Fakultas</span>
                      <span className="font-medium text-gray-800">{data.faculty}</span>
                    </div>
                  </div>
                )}

                {data.prodi && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <GraduationCap className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-gray-400 block">Program Studi</span>
                      <span className="font-medium text-gray-800">{data.prodi}</span>
                    </div>
                  </div>
                )}

                {data.kelas && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <Building className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-gray-400 block">Kelas</span>
                      <span className="font-medium text-gray-800">{data.kelas}</span>
                    </div>
                  </div>
                )}

                {data.angkatan && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-gray-400 block">Angkatan</span>
                      <span className="font-medium text-gray-800">{data.angkatan}</span>
                    </div>
                  </div>
                )}

                {data.departemen && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <Building className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-gray-400 block">Departemen</span>
                      <span className="font-medium text-gray-800">{data.departemen}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-gray-400 block">Diajukan Pada</span>
                    <span className="font-medium text-gray-800">
                      {new Date(data.created_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={processing || (!isAdmin && !token)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                    isAdmin || Boolean(token)
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow active:scale-[0.98]'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  {processing ? 'Memproses...' : 'Setujui Pendaftaran'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(true)}
                  disabled={processing || (!isAdmin && !token)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold border transition-all ${
                    isAdmin || Boolean(token)
                      ? 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 active:scale-[0.98]'
                      : 'border-gray-200 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <UserX className="w-4 h-4" />
                  Tolak Pendaftaran
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Alasan Tolak */}
        {isRejectModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Tolak Pengajuan Akun</h3>
              <p className="text-xs text-gray-500 mb-4">
                Berikan alasan penolakan. Alasan ini akan dikirimkan kepada calon pengguna melalui email notifikasi.
              </p>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: NIM tidak terdaftar pada pangkalan data mahasiswa aktif..."
                rows={3}
                className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none mb-4"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  disabled={processing}
                  className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={processing}
                  className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
                >
                  {processing ? 'Menolak...' : 'Konfirmasi Tolak'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

