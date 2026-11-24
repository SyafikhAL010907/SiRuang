'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  AlertTriangle,
  ShieldCheck,
  UserMinus,
  ChevronDown,
  BadgeCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Role, isAnyAdmin } from '@/lib/roles';

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
  role: Role;
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
const TH_CLASS = 'px-5 py-3 text-left text-xs font-semibold text-slate-500';
const INPUT_CLASS =
  'w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#588CBC] focus:ring-2 focus:ring-[#588CBC]/15 transition-colors';
const ICON_BTN =
  'h-9 w-9 inline-flex items-center justify-center rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#588CBC]/40';

const ROLE_BADGE: Record<string, { label: string; cls: string; chip: string; icon: any }> = {
  admin: { label: 'Admin', cls: 'bg-[#183449]/8 text-[#183449] ring-[#183449]/20', chip: 'bg-[#183449] text-white', icon: Shield },
  dosen: { label: 'Dosen', cls: 'bg-[#588CBC]/12 text-[#2B5474] ring-[#588CBC]/30', chip: 'bg-[#588CBC] text-white', icon: Briefcase },
  pj_kelas: { label: 'PJ Kelas', cls: 'bg-teal-50 text-teal-800 ring-teal-200', chip: 'bg-teal-600 text-white', icon: BookOpen },
  user: { label: 'Mahasiswa', cls: 'bg-slate-100 text-slate-700 ring-slate-200', chip: 'bg-slate-500 text-white', icon: GraduationCap },
};

const ROLE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Semua role', adminOnly: false },
  { value: 'ADMIN', label: 'Admin', adminOnly: true },
  { value: 'DOSEN', label: 'Dosen', adminOnly: false },
  { value: 'PJ_KELAS', label: 'PJ Kelas', adminOnly: false },
  { value: 'MAHASISWA', label: 'Mahasiswa', adminOnly: false },
];

const PROTECTED_DEMO_IDS = [1, 2, 3, 4, 6];

/* ---------- Small UI helpers ---------- */

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const meta = ROLE_BADGE[role] || ROLE_BADGE['user'];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 h-8 pl-1 pr-3 rounded-full ring-1 ring-inset text-xs font-bold whitespace-nowrap',
        meta.cls
      )}
    >
      <span className={cn('w-6 h-6 rounded-full flex items-center justify-center', meta.chip)}>
        <Icon size={12} strokeWidth={2.5} />
      </span>
      {meta.label}
    </span>
  );
};

const StatusBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1.5 h-8 pl-2.5 pr-3.5 rounded-full bg-gradient-to-b from-emerald-50 to-emerald-100/70 text-emerald-800 ring-1 ring-inset ring-emerald-300/60 text-xs font-bold">
    <BadgeCheck size={16} className="text-emerald-600" />
    Aktif
  </span>
);

const Field: React.FC<{ label: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  label,
  children,
  className,
}) => (
  <label className={cn('flex flex-col gap-1.5', className)}>
    <span className="text-xs font-semibold text-slate-600">{label}</span>
    {children}
  </label>
);

const Avatar: React.FC<{ name: string; solid?: boolean }> = ({ name, solid }) => (
  <div
    className={cn(
      'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
      solid ? 'bg-[#183449] text-white' : 'bg-[#183449]/10 text-[#183449]'
    )}
  >
    {name.charAt(0).toUpperCase()}
  </div>
);

const RoleFilter: React.FC<{
  value: string;
  onChange: (v: string) => void;
  showAdmin: boolean;
}> = ({ value, onChange, showAdmin }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = ROLE_FILTER_OPTIONS.filter((o) => showAdmin || !o.adminOnly);
  const current = ROLE_FILTER_OPTIONS.find((o) => o.value === value);
  const active = value !== 'ALL';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'h-10 min-w-[170px] pl-3 pr-2.5 rounded-lg border bg-white text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#588CBC]/30',
          active || open ? 'border-[#588CBC] text-[#183449]' : 'border-slate-200 text-slate-600 hover:border-slate-300'
        )}
      >
        <SlidersHorizontal size={14} className={active ? 'text-[#588CBC]' : 'text-slate-400'} />
        <span className="flex-1 text-left">{active && current ? current.label : 'Pilih role'}</span>
        <ChevronDown size={15} className={cn('text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-[calc(100%+6px)] z-30 w-full min-w-[190px] p-1.5 bg-white rounded-xl border border-slate-200 shadow-lg shadow-[#183449]/10"
          >
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <li key={o.value} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors cursor-pointer',
                      selected
                        ? 'bg-[#183449]/5 text-[#183449] font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    {o.label}
                    {selected && <Check size={14} className="text-[#588CBC]" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

const ModalShell: React.FC<{ children: React.ReactNode; maxW: string; scroll?: boolean }> = ({
  children,
  maxW,
  scroll,
}) => (
  <div
    className={cn(
      'fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#183449]/45 backdrop-blur-xs',
      scroll && 'overflow-y-auto'
    )}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={cn('w-full bg-white rounded-2xl p-6 shadow-2xl border border-slate-200', maxW, scroll && 'my-8')}
    >
      {children}
    </motion.div>
  </div>
);

const CloseBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Tutup"
    className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
  >
    <X size={18} />
  </button>
);

/* ---------- Main component ---------- */

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
      role: Role;
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

  const closeRejectModal = () => setRejectModal({ open: false, id: null, name: null, identifier: null, reason: '' });

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

  const closeEditModal = () => setEditModal((prev) => ({ ...prev, open: false, user: null }));

  const setEditField = (key: keyof typeof editModal.form, value: string) =>
    setEditModal((prev) => ({ ...prev, form: { ...prev.form, [key]: value } }));

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
        (roleFilter === 'ADMIN' && isAnyAdmin(u.role)) ||
        (roleFilter === 'DOSEN' && u.role === 'dosen') ||
        (roleFilter === 'PJ_KELAS' && u.role === 'pj_kelas') ||
        (roleFilter === 'MAHASISWA' && u.role === 'user');

      return matchQuery && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  const visibleCount = activeTab === 'pending' ? filteredRegistrations.length : filteredUsers.length;

  const tabCls = (active: boolean) =>
    cn(
      'flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer',
      active ? 'bg-[#183449] text-white shadow-sm' : 'text-slate-500 hover:text-[#183449] hover:bg-slate-50'
    );

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
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            role="status"
            className={cn(
              'fixed top-5 right-5 z-[60] pl-3 pr-5 py-3 rounded-xl shadow-lg font-semibold text-sm flex items-center gap-2.5 text-white',
              toast.type === 'success' ? 'bg-[#183449]' : 'bg-rose-600'
            )}
          >
            <span
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center',
                toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/20 text-white'
              )}
            >
              {toast.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
            </span>
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP BAR */}
      <header className="px-8 h-14 flex items-center bg-white/85 backdrop-blur-md border-b border-slate-200/70 z-10 shrink-0">
        <div className={`${CONTENT_LANE} flex items-center justify-between gap-4`}>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-[#183449] transition-colors cursor-pointer group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-semibold">Kembali ke Dashboard</span>
          </button>

          
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-8 py-8">
        <div className={`${CONTENT_LANE} flex flex-col gap-6`}>
          {/* HEADER */}
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="w-1 self-stretch min-h-[56px] rounded-full bg-gradient-to-b from-[#588CBC] to-[#183449]" />
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-black text-[#183449] tracking-tight">Manajemen Akun</h2>
                <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
                  Verifikasi pendaftaran akun baru, kelola profil dan hak akses, atau hapus akun pengguna.
                </p>
              </div>
            </div>

            {/* TAB SELECTOR */}
            <div
              role="tablist"
              className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shrink-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'pending'}
                onClick={() => setActiveTab('pending')}
                className={tabCls(activeTab === 'pending')}
              >
                <Clock size={15} />
                <span>Pengajuan Akun</span>
                {registrations.length > 0 && (
                  <span
                    className={cn(
                      'min-w-5 h-5 px-1.5 rounded-md text-[11px] font-bold inline-flex items-center justify-center',
                      activeTab === 'pending' ? 'bg-[#588CBC] text-white' : 'bg-amber-100 text-amber-800'
                    )}
                  >
                    {registrations.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'users'}
                onClick={() => setActiveTab('users')}
                className={tabCls(activeTab === 'users')}
              >
                <Users size={15} />
                <span>Akun Terdaftar</span>
                <span
                  className={cn(
                    'min-w-5 h-5 px-1.5 rounded-md text-[11px] font-bold inline-flex items-center justify-center',
                    activeTab === 'users' ? 'bg-[#588CBC] text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {users.length}
                </span>
              </button>
            </div>
          </div>

          {/* TABLE CARD */}
          <div className="bg-white/95 rounded-2xl border border-slate-200 shadow-sm shadow-[#183449]/5">
            {/* TOOLBAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-bold text-[#183449]">
                  {activeTab === 'pending' ? 'Menunggu persetujuan admin' : 'Daftar pengguna sistem'}
                </h3>
                <span className="h-5 px-2 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold inline-flex items-center">
                  {visibleCount} data
                </span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* SEARCH */}
                <div className="relative group">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#588CBC] transition-colors"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama, NIM/NIP, prodi..."
                    className={cn(INPUT_CLASS, 'pl-9 pr-9 w-64')}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Hapus pencarian"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* ROLE FILTER */}
                <RoleFilter value={roleFilter} onChange={setRoleFilter} showAdmin={activeTab === 'users'} />
              </div>
            </div>

            {/* TAB CONTENT 1: PENGAJUAN AKUN */}
            {activeTab === 'pending' && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className={TH_CLASS}>Pemohon</th>
                      <th className={TH_CLASS}>Role diajukan</th>
                      <th className={TH_CLASS}>Informasi akademik &amp; kontak</th>
                      <th className={TH_CLASS}>Waktu pengajuan</th>
                      <th className={`${TH_CLASS} text-center`}>Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-14 text-center text-sm text-slate-400">
                          <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                          Memuat data permohonan...
                        </td>
                      </tr>
                    ) : filteredRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <div className="mx-auto mb-3 w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                            <UserCheck size={22} />
                          </div>
                          <p className="font-bold text-slate-700 text-sm">Tidak ada pengajuan akun pending</p>
                          <p className="text-slate-400 text-sm mt-1">Semua pendaftaran akun baru telah diverifikasi.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRegistrations.map((item) => {
                        const isBusy = processingId === item.id;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                            {/* PEMOHON */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar name={item.username} />
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-800 truncate">{item.username}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {item.identifier_type.toUpperCase()}{' '}
                                    <span className="font-semibold text-slate-600">{item.identifier}</span>
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* ROLE */}
                            <td className="px-5 py-4">
                              <RoleBadge role={item.requested_role} />
                            </td>

                            {/* DETAIL */}
                            <td className="px-5 py-4">
                              <div className="space-y-1">
                                {item.requested_role === 'user' ? (
                                  <p className="text-xs text-slate-400">Mahasiswa biasa (hanya baca &amp; chat)</p>
                                ) : item.requested_role === 'pj_kelas' ? (
                                  <>
                                    <p className="text-sm font-semibold text-slate-700">
                                      {item.kelas || '-'} · {item.prodi || '-'} ({item.angkatan || '-'})
                                    </p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                      <Mail size={12} className="text-slate-400" /> {item.email || '-'}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-sm font-semibold text-slate-700">
                                      {item.departemen ? `Dept. ${item.departemen}` : item.prodi || 'Dosen'}
                                    </p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                      <Mail size={12} className="text-slate-400" /> {item.email || '-'}
                                      {item.phone && ` · WA: ${item.phone}`}
                                    </p>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* WAKTU */}
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-slate-700">
                                {new Date(item.created_at).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                <Clock size={11} className="text-slate-400" />
                                Berlaku s/d{' '}
                                {new Date(item.expires_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                              </p>
                            </td>

                            {/* AKSI */}
                            <td className="px-5 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleApprove(item)}
                                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                                  title="Setujui pendaftaran akun"
                                >
                                  {isBusy ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                                  <span>Setujui</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => openRejectModal(item)}
                                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                                  title="Tolak pendaftaran akun"
                                >
                                  <X size={14} />
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
                <table className="w-full min-w-[980px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className={TH_CLASS}>Pengguna &amp; identitas</th>
                      <th className={TH_CLASS}>Role sistem</th>
                      <th className={TH_CLASS}>Kelas &amp; program studi</th>
                      <th className={TH_CLASS}>Kontak</th>
                      <th className={TH_CLASS}>Status</th>
                      <th className={`${TH_CLASS} text-center`}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-14 text-center text-sm text-slate-400">
                          <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                          Memuat data pengguna...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="mx-auto mb-3 w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                            <Users size={22} />
                          </div>
                          <p className="font-bold text-slate-700 text-sm">Pengguna tidak ditemukan</p>
                          <p className="text-slate-400 text-sm mt-1">
                            Coba sesuaikan kata kunci pencarian atau filter role.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const busy = processingId === u.user_id;

                        return (
                          <tr key={u.user_id} className="hover:bg-slate-50/60 transition-colors">
                            {/* PENGGUNA */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar name={u.username} solid />
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-800 truncate">{u.full_name || u.username}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {u.identifier_type?.toUpperCase() || 'ID'}{' '}
                                    <span className="font-semibold text-slate-600">{u.identifier}</span>
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* ROLE */}
                            <td className="px-5 py-4">
                              <RoleBadge role={u.role} />
                            </td>

                            {/* KELAS / PRODI */}
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-slate-700">
                                {u.kelas ? `${u.kelas}` : u.departemen ? `Dept. ${u.departemen}` : '-'}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {u.prodi ? `${u.prodi}${u.angkatan ? ` · ${u.angkatan}` : ''}` : u.faculty || '-'}
                              </p>
                            </td>

                            {/* KONTAK */}
                            <td className="px-5 py-4">
                              <p className="text-sm text-slate-700 flex items-center gap-1.5">
                                <Mail size={13} className="text-slate-400 shrink-0" />
                                {u.email || <span className="text-slate-400">-</span>}
                              </p>
                              {u.phone && (
                                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                                  <Phone size={12} className="text-slate-400 shrink-0" />
                                  {u.phone}
                                </p>
                              )}
                            </td>

                            {/* STATUS */}
                            <td className="px-5 py-4">
                              <StatusBadge />
                            </td>

                            {/* AKSI */}
                            <td className="px-5 py-4">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Slot tetap supaya tombol edit & hapus selalu sejajar */}
                                <div className="w-9 h-9">
                                  {u.role === 'user' && (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => quickChangeRole(u, 'pj_kelas')}
                                      className={cn(ICON_BTN, 'text-teal-700 bg-teal-50 ring-1 ring-inset ring-teal-200 hover:bg-teal-600 hover:text-white hover:ring-teal-600')}
                                      title="Promosikan ke PJ Kelas"
                                      aria-label="Promosikan ke PJ Kelas"
                                    >
                                      <ShieldCheck size={15} />
                                    </button>
                                  )}
                                  {u.role === 'pj_kelas' && (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => quickChangeRole(u, 'user')}
                                      className={cn(ICON_BTN, 'text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-200 hover:bg-amber-500 hover:text-white hover:ring-amber-500')}
                                      title="Kembalikan ke Mahasiswa (Demosi)"
                                      aria-label="Kembalikan ke Mahasiswa"
                                    >
                                      <UserMinus size={15} />
                                    </button>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(u)}
                                  className={cn(
                                    ICON_BTN,
                                    'text-[#2B5474] bg-[#588CBC]/10 ring-1 ring-inset ring-[#588CBC]/25 hover:bg-[#183449] hover:text-white hover:ring-[#183449]'
                                  )}
                                  title="Edit data pengguna"
                                  aria-label="Edit data pengguna"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDeleteModal(u)}
                                  className={cn(
                                    ICON_BTN,
                                    'text-rose-600 bg-rose-50 ring-1 ring-inset ring-rose-200 hover:bg-rose-600 hover:text-white hover:ring-rose-600'
                                  )}
                                  title="Hapus pengguna"
                                  aria-label="Hapus pengguna"
                                >
                                  <Trash2 size={15} />
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
            <div className="px-5 py-3.5 border-t border-slate-200 text-sm text-slate-500 bg-slate-50/60 rounded-b-2xl">
              Menampilkan <strong className="text-[#183449]">{visibleCount}</strong> data{' '}
              {activeTab === 'pending' ? 'permohonan' : 'pengguna aktif'}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL EDIT PENGGUNA */}
      <AnimatePresence>
        {editModal.open && editModal.user && (
          <ModalShell maxW="max-w-xl" scroll>
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <Avatar name={editModal.user.username} solid />
                <div>
                  <h3 className="text-lg font-black text-[#183449]">Edit data pengguna</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mengubah identitas &amp; profil untuk{' '}
                    <strong className="text-slate-700">{editModal.user.identifier}</strong>
                  </p>
                </div>
              </div>
              <CloseBtn onClick={closeEditModal} />
            </div>

            <form onSubmit={saveEditUser} className="space-y-4 pt-5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nama lengkap">
                  <input
                    type="text"
                    required
                    value={editModal.form.full_name}
                    onChange={(e) => setEditField('full_name', e.target.value)}
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Username">
                  <input
                    type="text"
                    required
                    value={editModal.form.username}
                    onChange={(e) => setEditField('username', e.target.value)}
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Role sistem">
                  <select
                    value={editModal.form.role}
                    onChange={(e) => setEditField('role', e.target.value)}
                    className={cn(INPUT_CLASS, 'cursor-pointer')}
                  >
                    <option value="user">Mahasiswa (user)</option>
                    <option value="pj_kelas">PJ Kelas (pj_kelas)</option>
                    <option value="dosen">Dosen (dosen)</option>
                    <option value="admin">Administrator (admin)</option>
                  </select>
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={editModal.form.email}
                    onChange={(e) => setEditField('email', e.target.value)}
                    placeholder="nama@email.com"
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="No. WhatsApp / HP">
                  <input
                    type="tel"
                    value={editModal.form.phone}
                    onChange={(e) => setEditField('phone', e.target.value)}
                    placeholder="0812xxxx"
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Fakultas">
                  <input
                    type="text"
                    value={editModal.form.faculty}
                    onChange={(e) => setEditField('faculty', e.target.value)}
                    placeholder="Fakultas Teknik"
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>

              {/* KHUSUS MAHASISWA & PJ KELAS */}
              {(editModal.form.role === 'user' || editModal.form.role === 'pj_kelas') && (
                <div className="grid grid-cols-3 gap-3 p-4 bg-[#588CBC]/5 rounded-xl border border-[#588CBC]/20">
                  <Field label="Kelas">
                    <input
                      type="text"
                      value={editModal.form.kelas}
                      onChange={(e) => setEditField('kelas', e.target.value)}
                      placeholder="Contoh: TE-3A"
                      className={INPUT_CLASS}
                    />
                  </Field>
                  <Field label="Program studi">
                    <input
                      type="text"
                      value={editModal.form.prodi}
                      onChange={(e) => setEditField('prodi', e.target.value)}
                      placeholder="PVTE"
                      className={INPUT_CLASS}
                    />
                  </Field>
                  <Field label="Angkatan">
                    <input
                      type="text"
                      maxLength={4}
                      value={editModal.form.angkatan}
                      onChange={(e) => setEditField('angkatan', e.target.value)}
                      placeholder="2024"
                      className={INPUT_CLASS}
                    />
                  </Field>
                </div>
              )}

              {/* KHUSUS DOSEN */}
              {editModal.form.role === 'dosen' && (
                <div className="grid grid-cols-2 gap-3 p-4 bg-[#588CBC]/5 rounded-xl border border-[#588CBC]/20">
                  <Field label="Departemen">
                    <input
                      type="text"
                      value={editModal.form.departemen}
                      onChange={(e) => setEditField('departemen', e.target.value)}
                      placeholder="Teknik Elektro"
                      className={INPUT_CLASS}
                    />
                  </Field>
                  <Field label="Program studi">
                    <input
                      type="text"
                      value={editModal.form.prodi}
                      onChange={(e) => setEditField('prodi', e.target.value)}
                      placeholder="Pendidikan Vokasional"
                      className={INPUT_CLASS}
                    />
                  </Field>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200">
                <Field
                  label={
                    <span className="flex items-center gap-1.5">
                      <Lock size={12} /> Reset kata sandi
                      <span className="font-normal text-slate-400">(opsional, kosongkan jika tidak diubah)</span>
                    </span>
                  }
                >
                  <input
                    type="password"
                    minLength={8}
                    maxLength={72}
                    value={editModal.form.password}
                    onChange={(e) => setEditField('password', e.target.value)}
                    placeholder="Masukkan password baru jika ingin mereset (min. 8 karakter)"
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="h-10 px-4 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!!processingId}
                  className="h-10 px-5 rounded-lg bg-[#183449] hover:bg-[#2B5474] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {processingId ? 'Menyimpan...' : 'Simpan perubahan'}
                </button>
              </div>
            </form>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* MODAL HAPUS PENGGUNA */}
      <AnimatePresence>
        {deleteModal.open && deleteModal.user && (
          <ModalShell maxW="max-w-md">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#183449]">Hapus pengguna</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Tindakan ini permanen</p>
                  </div>
                </div>
                <CloseBtn onClick={() => setDeleteModal({ open: false, user: null })} />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <p className="text-xs text-slate-500">Anda akan menghapus akun:</p>
                <p className="font-bold text-slate-800 text-sm">
                  {deleteModal.user.full_name || deleteModal.user.username}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>
                    {deleteModal.user.identifier_type?.toUpperCase() || 'ID'}: {deleteModal.user.identifier}
                  </span>
                  <RoleBadge role={deleteModal.user.role} />
                </div>
              </div>

              {PROTECTED_DEMO_IDS.includes(deleteModal.user.user_id) ? (
                <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    Akun ini merupakan akun demo inti sistem (ID {deleteModal.user.user_id}) yang dilindungi dan tidak
                    dapat dihapus.
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed">
                  Semua sesi aktif dan data profil yang terkait dengan akun ini akan dihapus dari database.
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteModal({ open: false, user: null })}
                  className="h-10 px-4 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!!processingId || PROTECTED_DEMO_IDS.includes(deleteModal.user.user_id)}
                  onClick={confirmDeleteUser}
                  className="h-10 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId ? 'Menghapus...' : 'Ya, hapus pengguna'}
                </button>
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* MODAL TOLAK PENDAFTARAN */}
      <AnimatePresence>
        {rejectModal.open && (
          <ModalShell maxW="max-w-md">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-[#183449]">Tolak pendaftaran akun</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Permohonan untuk <strong className="text-slate-700">{rejectModal.name}</strong> (
                    {rejectModal.identifier}) akan dihapus dari sistem.
                  </p>
                </div>
                <CloseBtn onClick={closeRejectModal} />
              </div>

              <Field label="Alasan penolakan (opsional, dikirim via email)">
                <textarea
                  rows={3}
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Contoh: NIM tidak terdaftar di SIAKAD, silakan gunakan NIM resmi..."
                  className="w-full p-3 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#588CBC] focus:ring-2 focus:ring-[#588CBC]/15 resize-none"
                />
              </Field>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeRejectModal}
                  className="h-10 px-4 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!!processingId}
                  onClick={confirmReject}
                  className="h-10 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {processingId ? 'Memproses...' : 'Tolak & hapus'}
                </button>
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManajemenAkunView;