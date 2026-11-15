'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  Check,
  X,
  Shield,
  GraduationCap,
  Briefcase,
  BookOpen,
  Clock,
  AlertCircle,
  RefreshCw,
  Users,
  UserCheck,
  Mail,
  Phone,
  Pencil,
  Trash2,
  Lock,
  Building2,
  Calendar,
  School,
  AlertTriangle,
  ShieldCheck,
  UserMinus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManajemenAkunViewProps {
  onBack: () => void;
}

type TabMode = 'pending' | 'users';

interface RegistrationItem {
  id: string;
  identifier: string;
  identifier_type: 'nim' | 'nip';
  username: string;
  email: string | null;
  phone: string | null;
  faculty: string | null;
  prodi: string | null;
  kelas: string | null;
  angkatan: string | null;
  departemen: string | null;
  requested_role: 'user' | 'pj_kelas' | 'dosen';
  created_at: string;
  expires_at: string;
}

interface UserProfileItem {
  id: number;
  user_id: number;
  username: string;
  identifier: string;
  identifier_type: 'nim' | 'nip';
  role: 'admin' | 'dosen' | 'pj_kelas' | 'user';
  full_name: string;
  email: string | null;
  phone: string | null;
  faculty: string | null;
  kelas: string | null;
  prodi: string | null;
  angkatan: string | null;
  departemen: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

const CONTENT_LANE = 'w-full max-w-[1400px] mx-auto';
const TH_CLASS = 'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500';

const ROLE_BADGE: Record<string, { label: string; cls: string; icon: any }> = {
  admin: { label: 'ADMIN', cls: 'bg-[#183449] text-white border-[#183449]', icon: Shield },
  dosen: { label: 'DOSEN', cls: 'bg-blue-50 text-[#183449] border-[#588CBC]/30', icon: Briefcase },
  pj_kelas: { label: 'PJ KELAS', cls: 'bg-sky-50 text-sky-800 border-sky-200', icon: BookOpen },
  user: { label: 'MAHASISWA', cls: 'bg-slate-100 text-slate-700 border-slate-200', icon: GraduationCap },
};

const PROTECTED_DEMO_IDS = [1, 2, 3, 4, 6];

const ManajemenAkunView: React.FC<ManajemenAkunViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabMode>('pending');
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [users, setUsers] = useState<UserProfileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [processingId, setProcessingId] = useState<string | number | null>(null);

  // Modal Alasan Tolak Pengajuan
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    id: string | null;
    name: string | null;
    identifier: string | null;
    reason: string;
  }>({
    open: false,
    id: null,
    name: null,
    identifier: null,
    reason: '',
  });

  // Modal Edit Pengguna
  const [editModal, setEditModal] = useState<{
    open: boolean;
    user: UserProfileItem | null;
    form: {
      username: string;
      full_name: string;
      role: 'admin' | 'dosen' | 'pj_kelas' | 'user';
      email: string;
      phone: string;
      faculty: string;
      kelas: string;
      prodi: string;
      angkatan: string;
      departemen: string;
      password: string;
    };
  }>({
    open: false,
    user: null,
    form: {
      username: '',
      full_name: '',
      role: 'user',
      email: '',
      phone: '',
      faculty: '',
      kelas: '',
      prodi: '',
      angkatan: '',
      departemen: '',
      password: '',
    },
  });

  // Modal Hapus Pengguna
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    user: UserProfileItem | null;
  }>({
    open: false,
    user: null,
  });

  // Notifikasi Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const getAuthToken = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || '';
  };

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const token = getAuthToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [resReg, resUsers] = await Promise.all([
        fetch('/api/admin/registrations', { headers }),
        fetch('/api/admin/users', { headers }),
      ]);

      if (resReg.ok) {
        const regData = await resReg.json();
        if (Array.isArray(regData)) {
          setRegistrations(regData);
          if (!isRefresh && regData.length > 0) {
            setActiveTab('pending');
          } else if (!isRefresh && regData.length === 0) {
            setActiveTab('users');
          }
        }
      }

      if (resUsers.ok) {
        const userData = await resUsers.json();
        if (Array.isArray(userData)) {
          setUsers(userData);
        }
      }
    } catch (err) {
      console.error('Gagal memuat data manajemen akun:', err);
      showToast('Gagal memuat data dari server', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler Approve Pengajuan
  const handleApprove = async (item: RegistrationItem) => {
    if (processingId) return;
    setProcessingId(item.id);

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/registrations/${item.id}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Akun ${item.username} berhasil disetujui!`, 'success');
        loadData(true);
      } else {
        showToast(data.error || 'Gagal menyetujui akun', 'error');
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan saat menyetujui akun', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Handler Reject Pengajuan
  const openRejectModal = (item: RegistrationItem) => {
    setRejectModal({
      open: true,
      id: item.id,
      name: item.username,
      identifier: item.identifier,
      reason: '',
    });
  };

  const confirmReject = async () => {
    if (!rejectModal.id || processingId) return;
    setProcessingId(rejectModal.id);

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/registrations/${rejectModal.id}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectModal.reason }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Pengajuan ${rejectModal.name} berhasil ditolak & dihapus.`, 'success');
        setRejectModal({ open: false, id: null, name: null, identifier: null, reason: '' });
        loadData(true);
      } else {
        showToast(data.error || 'Gagal menolak akun', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat menolak akun', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Handler Edit Modal
  const openEditModal = (u: UserProfileItem) => {
    setEditModal({
      open: true,
      user: u,
      form: {
        username: u.username || '',
        full_name: u.full_name || u.username || '',
        role: u.role || 'user',
        email: u.email || '',
        phone: u.phone || '',
        faculty: u.faculty || '',
        kelas: u.kelas || '',
        prodi: u.prodi || '',
        angkatan: u.angkatan || '',
        departemen: u.departemen || '',
        password: '',
      },
    });
  };

  const saveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.user || processingId) return;
    setProcessingId(editModal.user.user_id);

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/users/${editModal.user.user_id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: editModal.form.username.trim(),
          full_name: editModal.form.full_name.trim(),
          role: editModal.form.role,
          email: editModal.form.email.trim() || null,
          phone: editModal.form.phone.trim() || null,
          faculty: editModal.form.faculty.trim() || null,
          kelas: editModal.form.kelas.trim() || null,
          prodi: editModal.form.prodi.trim() || null,
          angkatan: editModal.form.angkatan.trim() || null,
          departemen: editModal.form.departemen.trim() || null,
          password: editModal.form.password.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Data pengguna berhasil diperbarui!', 'success');
        setEditModal((prev) => ({ ...prev, open: false, user: null }));
        loadData(true);
      } else {
        showToast(data.error || 'Gagal memperbarui pengguna', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat menyimpan perubahan', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Quick Promote / Demote PJ Kelas
  const quickChangeRole = async (userItem: UserProfileItem, newRole: 'pj_kelas' | 'user') => {
    if (processingId) return;
    setProcessingId(userItem.user_id);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/users/${userItem.user_id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: userItem.username,
          full_name: userItem.full_name,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          newRole === 'pj_kelas'
            ? `${userItem.full_name || userItem.username} berhasil dipromosikan menjadi PJ Kelas!`
            : `${userItem.full_name || userItem.username} berhasil dikembalikan menjadi Mahasiswa.`,
          'success'
        );
        loadData(true);
      } else {
        showToast(data.error || 'Gagal mengubah peran pengguna', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan saat mengubah peran pengguna', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Handler Delete Modal
  const openDeleteModal = (u: UserProfileItem) => {
    setDeleteModal({
      open: true,
      user: u,
    });
  };

  const confirmDeleteUser = async () => {
    if (!deleteModal.user || processingId) return;
    setProcessingId(deleteModal.user.user_id);

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/users/${deleteModal.user.user_id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Pengguna ${deleteModal.user.username} berhasil dihapus.`, 'success');
        setDeleteModal({ open: false, user: null });
        loadData(true);
      } else {
        showToast(data.error || 'Gagal menghapus pengguna', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat menghapus pengguna', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Filter Pengajuan Pending
  const filteredRegistrations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return registrations.filter((item) => {
      const matchQuery =
        !q ||
        item.username.toLowerCase().includes(q) ||
        item.identifier.toLowerCase().includes(q) ||
        (item.email && item.email.toLowerCase().includes(q)) ||
        (item.kelas && item.kelas.toLowerCase().includes(q)) ||
        (item.prodi && item.prodi.toLowerCase().includes(q));

      const matchRole =
        roleFilter === 'ALL' ||
        (roleFilter === 'MAHASISWA' && item.requested_role === 'user') ||
        (roleFilter === 'PJ_KELAS' && item.requested_role === 'pj_kelas') ||
        (roleFilter === 'DOSEN' && item.requested_role === 'dosen');

      return matchQuery && matchRole;
    });
  }, [registrations, searchQuery, roleFilter]);

  // Filter Pengguna Aktif
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const matchQuery =
        !q ||
        u.username.toLowerCase().includes(q) ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        u.identifier.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.kelas && u.kelas.toLowerCase().includes(q)) ||
        (u.prodi && u.prodi.toLowerCase().includes(q));

      const matchRole =
        roleFilter === 'ALL' ||
        (roleFilter === 'ADMIN' && u.role === 'admin') ||
        (roleFilter === 'DOSEN' && u.role === 'dosen') ||
        (roleFilter === 'PJ_KELAS' && u.role === 'pj_kelas') ||
        (roleFilter === 'MAHASISWA' && u.role === 'user');

      return matchQuery && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  return (
    <div
      className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F8FAFB] relative"
      style={{
        backgroundImage: `url('/Batik.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* TOAST NOTIFIKASI */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              'fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 border text-white',
              toast.type === 'success' ? 'bg-[#183449] border-[#588CBC]/40' : 'bg-rose-600 border-rose-400'
            )}
          >
            {toast.type === 'success' ? <Check size={16} className="text-emerald-400" /> : <AlertCircle size={16} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP BAR */}
      <header className="px-8 py-3 bg-white/80 backdrop-blur-md border-b border-slate-100 z-10 shrink-0">
        <div className={`${CONTENT_LANE} flex items-center justify-between gap-4`}>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-[#588CBC] transition-colors cursor-pointer group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-bold">Kembali ke Dashboard</span>
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={cn(refreshing && 'animate-spin text-[#588CBC]')} />
            <span>{refreshing ? 'Memperbarui...' : 'Segarkan Data'}</span>
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${CONTENT_LANE} flex flex-col gap-6`}>
          {/* HEADER */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-1 bg-[#588CBC] rounded-full" />
                <span className="text-[10px] font-black text-[#183449] uppercase tracking-[0.3em]">
                  Manajemen Akun SiRuang
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Manajemen Akun</h2>
              <p className="text-sm text-slate-400 font-medium max-w-2xl leading-relaxed">
                Verifikasi pendaftaran akun baru, kelola profil, hak akses pengguna, dan hapus akun pengguna.
              </p>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded-2xl shadow-xs shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer',
                  activeTab === 'pending'
                    ? 'bg-[#183449] text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <Clock size={14} />
                <span>Pengajuan Akun</span>
                {registrations.length > 0 && (
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-black',
                      activeTab === 'pending' ? 'bg-[#588CBC] text-white' : 'bg-amber-100 text-amber-800'
                    )}
                  >
                    {registrations.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer',
                  activeTab === 'users'
                    ? 'bg-[#183449] text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <Users size={14} />
                <span>Akun Terdaftar</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-black',
                    activeTab === 'users' ? 'bg-[#588CBC] text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {users.length}
                </span>
              </button>
            </div>
          </div>

          {/* TABLE CARD */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {/* TOOLBAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700">
                  {activeTab === 'pending' ? 'Menunggu Persetujuan Admin' : 'Daftar Pengguna Sistem'}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  ({activeTab === 'pending' ? filteredRegistrations.length : filteredUsers.length} data)
                </span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* SEARCH */}
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#588CBC] transition-colors">
                    <Search size={14} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama, NIM/NIP, prodi..."
                    className="h-9 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#588CBC] focus:ring-2 focus:ring-[#588CBC]/10 transition-all w-60"
                  />
                </div>

                {/* ROLE FILTER */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#588CBC] cursor-pointer"
                >
                  <option value="ALL">Semua Peran</option>
                  {activeTab === 'users' && <option value="ADMIN">Admin</option>}
                  <option value="DOSEN">Dosen</option>
                  <option value="PJ_KELAS">PJ Kelas</option>
                  <option value="MAHASISWA">Mahasiswa</option>
                </select>
              </div>
            </div>

            {/* TAB CONTENT 1: PENGAJUAN AKUN */}
            {activeTab === 'pending' && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className={TH_CLASS}>Pemohon</th>
                      <th className={TH_CLASS}>Peran Diajukan</th>
                      <th className={TH_CLASS}>Informasi Akademik &amp; Kontak</th>
                      <th className={TH_CLASS}>Waktu Pengajuan</th>
                      <th className={`${TH_CLASS} text-center`}>Aksi Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                          <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                          Memuat data permohonan...
                        </td>
                      </tr>
                    ) : filteredRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-xs text-slate-400">
                          <UserCheck className="mx-auto mb-2 text-slate-300" size={32} />
                          <p className="font-bold text-slate-600 text-sm">Tidak ada pengajuan akun pending</p>
                          <p className="text-slate-400 mt-1">Semua pendaftaran akun baru telah diverifikasi.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRegistrations.map((item) => {
                        const roleMeta = ROLE_BADGE[item.requested_role] || ROLE_BADGE['user'];
                        const RoleIcon = roleMeta.icon;
                        const isBusy = processingId === item.id;

                        return (
                          <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                            {/* PEMOHON */}
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-2xl bg-[#183449]/10 text-[#183449] flex items-center justify-center text-xs font-black shrink-0">
                                  {item.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-xs font-black text-slate-800">{item.username}</p>
                                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                                    {item.identifier_type.toUpperCase()}: {item.identifier}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* PERAN */}
                            <td className="px-4 py-4">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border',
                                  roleMeta.cls
                                )}
                              >
                                <RoleIcon size={12} />
                                <span>{roleMeta.label}</span>
                              </span>
                            </td>

                            {/* DETAIL */}
                            <td className="px-4 py-4">
                              <div className="space-y-1 text-xs">
                                {item.requested_role === 'user' ? (
                                  <p className="text-slate-400 text-[11px] italic">Mahasiswa Biasa (Read-only &amp; Chat)</p>
                                ) : item.requested_role === 'pj_kelas' ? (
                                  <>
                                    <p className="font-bold text-slate-700">
                                      {item.kelas || '-'} · {item.prodi || '-'} ({item.angkatan || '-'})
                                    </p>
                                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                      <Mail size={12} /> {item.email || '-'}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="font-bold text-slate-700">
                                      {item.departemen ? `Dept. ${item.departemen}` : item.prodi || 'Dosen'}
                                    </p>
                                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                      <Mail size={12} /> {item.email || '-'}
                                      {item.phone && ` · WA: ${item.phone}`}
                                    </p>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* WAKTU */}
                            <td className="px-4 py-4">
                              <p className="text-xs font-semibold text-slate-700">
                                {new Date(item.created_at).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <Clock size={11} />
                                Berlaku s/d {new Date(item.expires_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                              </p>
                            </td>

                            {/* AKSI */}
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleApprove(item)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                                  title="Setujui pendaftaran akun"
                                >
                                  {isBusy ? (
                                    <RefreshCw className="animate-spin" size={13} />
                                  ) : (
                                    <Check size={13} />
                                  )}
                                  <span>Setujui</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => openRejectModal(item)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                                  title="Tolak pendaftaran akun"
                                >
                                  <X size={13} />
                                  <span>Tolak</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT 2: AKUN TERDAFTAR */}
            {activeTab === 'users' && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px]">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className={TH_CLASS}>Pengguna &amp; Identitas</th>
                      <th className={TH_CLASS}>Peran Sistem</th>
                      <th className={TH_CLASS}>Kelas &amp; Program Studi</th>
                      <th className={TH_CLASS}>Kontak (Email / No. HP)</th>
                      <th className={TH_CLASS}>Status</th>
                      <th className={`${TH_CLASS} text-center`}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                          <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                          Memuat data pengguna...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-xs text-slate-400">
                          <Users className="mx-auto mb-2 text-slate-300" size={32} />
                          <p className="font-bold text-slate-600 text-sm">Pengguna tidak ditemukan</p>
                          <p className="text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter peran.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const roleMeta = ROLE_BADGE[u.role] || ROLE_BADGE['user'];
                        const RoleIcon = roleMeta.icon;

                        return (
                          <tr key={u.user_id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                            {/* PENGGUNA */}
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-2xl bg-linear-to-br from-[#183449] to-[#2B5474] text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                                  {u.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-xs font-black text-slate-800">{u.full_name || u.username}</p>
                                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                                    {u.identifier_type?.toUpperCase() || 'ID'}: {u.identifier}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* PERAN */}
                            <td className="px-4 py-4">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border',
                                  roleMeta.cls
                                )}
                              >
                                <RoleIcon size={12} />
                                <span>{roleMeta.label}</span>
                              </span>
                            </td>

                            {/* KELAS / PRODI */}
                            <td className="px-4 py-4">
                              <p className="text-xs font-bold text-slate-700">
                                {u.kelas ? `${u.kelas}` : u.departemen ? `Dept. ${u.departemen}` : '-'}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {u.prodi ? `${u.prodi}${u.angkatan ? ` · ${u.angkatan}` : ''}` : u.faculty || '-'}
                              </p>
                            </td>

                            {/* KONTAK */}
                            <td className="px-4 py-4">
                              <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                <Mail size={12} className="text-slate-400" />
                                {u.email || '-'}
                              </p>
                              {u.phone && (
                                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                  <Phone size={12} className="text-slate-400" />
                                  {u.phone}
                                </p>
                              )}
                            </td>

                            {/* STATUS */}
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Aktif
                              </span>
                            </td>

                            {/* AKSI EDIT & DELETE */}
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center gap-1.5">
                                {u.role === 'user' && (
                                  <button
                                    type="button"
                                    disabled={processingId === u.user_id}
                                    onClick={() => quickChangeRole(u, 'pj_kelas')}
                                    className="p-1.5 rounded-xl border border-sky-200 text-sky-700 bg-sky-50/50 hover:bg-sky-100 transition-all cursor-pointer disabled:opacity-50"
                                    title="Promosikan ke PJ Kelas"
                                  >
                                    <ShieldCheck size={14} />
                                  </button>
                                )}
                                {u.role === 'pj_kelas' && (
                                  <button
                                    type="button"
                                    disabled={processingId === u.user_id}
                                    onClick={() => quickChangeRole(u, 'user')}
                                    className="p-1.5 rounded-xl border border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100 transition-all cursor-pointer disabled:opacity-50"
                                    title="Kembalikan ke Mahasiswa (Demosi)"
                                  >
                                    <UserMinus size={14} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openEditModal(u)}
                                  className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-[#183449] hover:border-[#183449] transition-all cursor-pointer shadow-2xs"
                                  title="Edit Data Pengguna"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDeleteModal(u)}
                                  className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-all cursor-pointer shadow-2xs"
                                  title="Hapus Pengguna"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* FOOTER */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 text-xs text-slate-400 font-medium bg-slate-50/30">
              <span>
                Menampilkan{' '}
                <strong className="text-slate-700">
                  {activeTab === 'pending' ? filteredRegistrations.length : filteredUsers.length}
                </strong>{' '}
                data {activeTab === 'pending' ? 'permohonan' : 'pengguna aktif'}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* MODAL EDIT PENGGUNA */}
      <AnimatePresence>
        {editModal.open && editModal.user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 my-8"
            >
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-slate-800">Edit Data Pengguna</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mengubah data identitas &amp; profil untuk <strong className="text-slate-700">{editModal.user.identifier}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setEditModal((prev) => ({ ...prev, open: false, user: null }))}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={saveEditUser} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={editModal.form.full_name}
                      onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, full_name: e.target.value } }))}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#588CBC]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Username</label>
                    <input
                      type="text"
                      required
                      value={editModal.form.username}
                      onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, username: e.target.value } }))}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#588CBC]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Peran Sistem (Role)</label>
                    <select
                      value={editModal.form.role}
                      onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, role: e.target.value as any } }))}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#588CBC] cursor-pointer"
                    >
                      <option value="user">Mahasiswa (user)</option>
                      <option value="pj_kelas">PJ Kelas (pj_kelas)</option>
                      <option value="dosen">Dosen (dosen)</option>
                      <option value="admin">Administrator (admin)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Email</label>
                    <input
                      type="email"
                      value={editModal.form.email}
                      onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, email: e.target.value } }))}
                      placeholder="nama@email.com"
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#588CBC]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">No. WhatsApp / HP</label>
                    <input
                      type="tel"
                      value={editModal.form.phone}
                      onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, phone: e.target.value } }))}
                      placeholder="0812xxxx"
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#588CBC]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fakultas</label>
                    <input
                      type="text"
                      value={editModal.form.faculty}
                      onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, faculty: e.target.value } }))}
                      placeholder="Fakultas Teknik"
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#588CBC]"
                    />
                  </div>
                </div>

                {/* KHUSUS MAHASISWA & PJ KELAS */}
                {(editModal.form.role === 'user' || editModal.form.role === 'pj_kelas') && (
                  <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Kelas</label>
                      <input
                        type="text"
                        value={editModal.form.kelas}
                        onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, kelas: e.target.value } }))}
                        placeholder="Contoh: TE-3A"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#588CBC]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Program Studi</label>
                      <input
                        type="text"
                        value={editModal.form.prodi}
                        onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, prodi: e.target.value } }))}
                        placeholder="PVTE"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#588CBC]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Angkatan</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={editModal.form.angkatan}
                        onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, angkatan: e.target.value } }))}
                        placeholder="2024"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#588CBC]"
                      />
                    </div>
                  </div>
                )}

                {/* KHUSUS DOSEN */}
                {editModal.form.role === 'dosen' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Departemen</label>
                      <input
                        type="text"
                        value={editModal.form.departemen}
                        onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, departemen: e.target.value } }))}
                        placeholder="Teknik Elektro"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#588CBC]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Program Studi</label>
                      <input
                        type="text"
                        value={editModal.form.prodi}
                        onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, prodi: e.target.value } }))}
                        placeholder="Pendidikan Vokasional"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#588CBC]"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Lock size={12} /> Reset Kata Sandi (Opsional - Kosongkan jika tidak diubah)
                  </label>
                  <input
                    type="password"
                    minLength={8}
                    maxLength={72}
                    value={editModal.form.password}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, form: { ...prev.form, password: e.target.value } }))}
                    placeholder="Masukkan password baru jika ingin mereset (min. 8 karakter)"
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#588CBC]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditModal((prev) => ({ ...prev, open: false, user: null }))}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!!processingId}
                    className="px-5 py-2 rounded-xl bg-[#183449] hover:bg-[#2B5474] text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {processingId ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL HAPUS PENGGUNA */}
      <AnimatePresence>
        {deleteModal.open && deleteModal.user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">Hapus Pengguna</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Tindakan ini permanen</p>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteModal({ open: false, user: null })}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                <p className="text-slate-500">Anda akan menghapus akun:</p>
                <p className="font-bold text-slate-800 text-sm">
                  {deleteModal.user.full_name || deleteModal.user.username}
                </p>
                <p className="text-slate-400">
                  {deleteModal.user.identifier_type?.toUpperCase() || 'ID'}: {deleteModal.user.identifier} · Role: {deleteModal.user.role}
                </p>
              </div>

              {PROTECTED_DEMO_IDS.includes(deleteModal.user.user_id) ? (
                <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold">
                  ⚠️ Akun ini merupakan akun demo inti sistem (ID {deleteModal.user.user_id}) yang dilindungi dan tidak dapat dihapus.
                </div>
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed">
                  Semua sesi aktif dan data profil yang terkait dengan akun ini akan dihapus dari database.
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModal({ open: false, user: null })}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!!processingId || PROTECTED_DEMO_IDS.includes(deleteModal.user.user_id)}
                  onClick={confirmDeleteUser}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId ? 'Menghapus...' : 'Ya, Hapus Pengguna'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL TOLAK PENDAFTARAN */}
      <AnimatePresence>
        {rejectModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-800">Tolak Pendaftaran Akun</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Permohonan untuk <strong className="text-slate-700">{rejectModal.name}</strong> ({rejectModal.identifier}) akan dihapus dari sistem.
                  </p>
                </div>
                <button
                  onClick={() => setRejectModal({ open: false, id: null, name: null, identifier: null, reason: '' })}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Alasan Penolakan (Opsional - Dikirim via Email)
                </label>
                <textarea
                  rows={3}
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Contoh: NIM tidak terdaftar di SIAKAD, silakan gunakan NIM resmi..."
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#588CBC] focus:ring-2 focus:ring-[#588CBC]/10"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModal({ open: false, id: null, name: null, identifier: null, reason: '' })}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!!processingId}
                  onClick={confirmReject}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {processingId ? 'Memproses...' : 'Tolak & Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManajemenAkunView;
