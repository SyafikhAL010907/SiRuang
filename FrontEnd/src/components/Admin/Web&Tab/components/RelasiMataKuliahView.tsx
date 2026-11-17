'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  Pencil,
  Trash2,
  Search,
  Plus,
  RotateCw,
  X,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  UserCheck,
  Calendar,
  ChevronDown,
  Check,
} from 'lucide-react';

interface RelasiMataKuliahViewProps {
  onBack: () => void;
}

export interface RelationRow {
  id: string;
  course: string;
  kelas: string;
  schedule: string;
  jadwal_hari: string;
  jadwal_jam: string;
  semester: string;
  is_active: boolean;
  dosen_id: number;
  lecturer: string;
  lecturerNidn: string;
  lecturerInitials: string;
  pj_id: number;
  pj: string;
  pjNim: string;
  pjMeta: string;
  pjInitials: string;
  created_at?: string;
}

interface DosenOption {
  id: number;
  name: string;
  identifier: string;
  departemen: string;
}

interface PJOption {
  id: number;
  name: string;
  identifier: string;
  role: string;
  prodi: string;
  kelas: string;
  angkatan: string;
}

interface RelationFormData {
  mata_kuliah: string;
  kelas: string;
  dosen_id: string;
  pj_id: string;
  jadwal_hari: string;
  jadwal_jam: string;
  semester: string;
}

const TH_CLASS = 'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500';
const CONTENT_LANE = 'w-full max-w-[1400px] mx-auto';

const HARI_OPTIONS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const MODAL_INPUT =
  'w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#183449] focus:ring-2 focus:ring-[#183449]/10 transition-colors';

/* ---------- Komponen pop up (dropdown & form) ---------- */

interface SelectOption {
  value: string;
  label: string;
  sub?: string;
}

const SelectField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder: string;
}> = ({ value, onChange, options, placeholder }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
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
        className={`w-full h-10 pl-3 pr-2.5 rounded-lg border bg-white text-sm flex items-center gap-2 text-left cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#183449]/15 ${
          open ? 'border-[#183449] ring-2 ring-[#183449]/10' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className={`flex-1 truncate ${current ? 'text-slate-800' : 'text-slate-400'}`}>
          {current ? current.label : placeholder}
        </span>
        <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-56 overflow-y-auto p-1.5 bg-white rounded-xl border border-slate-200 shadow-lg shadow-[#183449]/10"
          >
            {options.length === 0 && <li className="px-3 py-2.5 text-xs text-slate-400">Belum ada pilihan tersedia.</li>}
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
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                      selected ? 'bg-[#183449]/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className={`block text-sm truncate ${selected ? 'font-bold text-[#183449]' : 'font-medium text-slate-700'}`}>
                        {o.label}
                      </span>
                      {o.sub && <span className="block text-xs text-slate-400 truncate mt-0.5">{o.sub}</span>}
                    </span>
                    {selected && <Check size={15} className="text-[#183449] shrink-0" />}
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

const FormField: React.FC<{ label: string; required?: boolean; hint?: string; children: React.ReactNode }> = ({
  label,
  required,
  hint,
  children,
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs font-semibold text-slate-600">
      {label}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </span>
    {children}
    {hint && <span className="text-xs text-slate-400 leading-relaxed">{hint}</span>}
  </div>
);

const RelationFormModal: React.FC<{
  mode: 'add' | 'edit';
  formData: RelationFormData;
  setFormData: React.Dispatch<React.SetStateAction<RelationFormData>>;
  dosenOptions: DosenOption[];
  pjOptions: PJOption[];
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}> = ({ mode, formData, setFormData, dosenOptions, pjOptions, submitting, onSubmit, onClose }) => {
  const isAdd = mode === 'add';
  const set = (key: keyof RelationFormData, value: string) => setFormData((prev) => ({ ...prev, [key]: value }));

  const dosenSelect: SelectOption[] = dosenOptions.map((d) => ({
    value: String(d.id),
    label: d.name,
    sub: d.identifier ? `NIP ${d.identifier}` : undefined,
  }));
  const pjSelect: SelectOption[] = pjOptions.map((p) => ({
    value: String(p.id),
    label: p.name,
    sub: `${p.identifier ? `NIM ${p.identifier} · ` : ''}${p.role === 'pj_kelas' ? 'PJ Kelas' : 'Mahasiswa'}`,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#183449]/45 backdrop-blur-xs p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 my-auto"
      >
        {/* HEADER */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#183449] text-white flex items-center justify-center shrink-0">
              {isAdd ? <Plus size={18} /> : <Pencil size={17} />}
            </div>
            <div>
              <h3 className="text-base font-black text-[#183449]">
                {isAdd ? 'Tambah relasi mata kuliah' : 'Ubah relasi mata kuliah'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAdd
                  ? 'Hubungkan mata kuliah dengan dosen pengampu dan PJ kelas.'
                  : 'Perbarui dosen pengampu, PJ kelas, atau jadwal.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 pt-5 pb-6 flex flex-col gap-5">
          {/* MATA KULIAH */}
          <div className="flex flex-col gap-4">
            <FormField label="Mata kuliah" required>
              <input
                type="text"
                required
                placeholder={isAdd ? 'Contoh: Pemrograman Web' : undefined}
                value={formData.mata_kuliah}
                onChange={(e) => set('mata_kuliah', e.target.value)}
                className={MODAL_INPUT}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Kelas" required>
                <input
                  type="text"
                  required
                  placeholder={isAdd ? 'Contoh: PTIK A' : undefined}
                  value={formData.kelas}
                  onChange={(e) => set('kelas', e.target.value)}
                  className={MODAL_INPUT}
                />
              </FormField>
              <FormField label="Semester" required>
                <input
                  type="text"
                  required
                  placeholder={isAdd ? 'Ganjil 2026/2027' : undefined}
                  value={formData.semester}
                  onChange={(e) => set('semester', e.target.value)}
                  className={MODAL_INPUT}
                />
              </FormField>
            </div>
          </div>

          {/* PENGAMPU */}
          <div className="flex flex-col gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <FormField
              label="Dosen pengampu"
              required
              hint={isAdd && dosenOptions.length === 0 ? 'Belum ada akun Dosen terdaftar.' : undefined}
            >
              <SelectField
                value={formData.dosen_id}
                onChange={(v) => set('dosen_id', v)}
                options={dosenSelect}
                placeholder="Pilih dosen"
              />
            </FormField>

            <FormField
              label="PJ kelas"
              required
              hint={isAdd ? 'Mahasiswa yang dipilih otomatis dipromosikan perannya menjadi PJ Kelas.' : undefined}
            >
              <SelectField
                value={formData.pj_id}
                onChange={(v) => set('pj_id', v)}
                options={pjSelect}
                placeholder="Pilih PJ kelas atau mahasiswa"
              />
            </FormField>
          </div>

          {/* JADWAL */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Hari reguler">
              <SelectField
                value={formData.jadwal_hari}
                onChange={(v) => set('jadwal_hari', v)}
                options={HARI_OPTIONS.map((h) => ({ value: h, label: h }))}
                placeholder="Pilih hari"
              />
            </FormField>
            <FormField label="Jam reguler">
              <input
                type="text"
                placeholder={isAdd ? '08:00 - 09:40' : undefined}
                value={formData.jadwal_jam}
                onChange={(e) => set('jadwal_jam', e.target.value)}
                className={MODAL_INPUT}
              />
            </FormField>
          </div>

          {/* AKSI */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-5 rounded-lg bg-[#183449] hover:bg-[#2B5474] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : isAdd ? 'Simpan relasi' : 'Perbarui relasi'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

/* ---------- Halaman utama ---------- */

const RelasiMataKuliahView: React.FC<RelasiMataKuliahViewProps> = ({ onBack }) => {
  const [relations, setRelations] = useState<RelationRow[]>([]);
  const [dosenOptions, setDosenOptions] = useState<DosenOption[]>([]);
  const [pjOptions, setPjOptions] = useState<PJOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<RelationRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RelationRow | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<RelationFormData>({
    mata_kuliah: '',
    kelas: '',
    dosen_id: '',
    pj_id: '',
    jadwal_hari: 'Senin',
    jadwal_jam: '08:00 - 09:40',
    semester: 'Ganjil 2026/2027',
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchRelations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/relations?options=true');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memuat data relasi');
      }
      setRelations(data.data || []);
      if (data.dosenOptions) setDosenOptions(data.dosenOptions);
      if (data.pjOptions) setPjOptions(data.pjOptions);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRelations();
  }, [fetchRelations]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return relations;
    return relations.filter(
      (r) =>
        r.course.toLowerCase().includes(q) ||
        r.lecturer.toLowerCase().includes(q) ||
        r.pj.toLowerCase().includes(q) ||
        r.kelas.toLowerCase().includes(q) ||
        r.schedule.toLowerCase().includes(q)
    );
  }, [relations, query]);

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  };

  const resetForm = () => {
    setFormData({
      mata_kuliah: '',
      kelas: '',
      dosen_id: dosenOptions[0]?.id?.toString() || '',
      pj_id: pjOptions[0]?.id?.toString() || '',
      jadwal_hari: 'Senin',
      jadwal_jam: '08:00 - 09:40',
      semester: 'Ganjil 2026/2027',
    });
  };

  const openAddModal = () => {
    resetForm();
    if (dosenOptions.length > 0) {
      setFormData((prev) => ({
        ...prev,
        dosen_id: dosenOptions[0].id.toString(),
        pj_id: pjOptions[0]?.id?.toString() || '',
      }));
    }
    setIsAddOpen(true);
  };

  const openEditModal = (r: RelationRow) => {
    setEditItem(r);
    setFormData({
      mata_kuliah: r.course,
      kelas: r.kelas,
      dosen_id: r.dosen_id.toString(),
      pj_id: r.pj_id.toString(),
      jadwal_hari: r.jadwal_hari || 'Senin',
      jadwal_jam: r.jadwal_jam || '08:00 - 09:40',
      semester: r.semester || 'Ganjil 2026/2027',
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.mata_kuliah.trim() || !formData.kelas.trim() || !formData.dosen_id || !formData.pj_id) {
      showToast('error', 'Semua bidang wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/relations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan relasi');

      showToast('success', 'Relasi mata kuliah berhasil ditambahkan');
      setIsAddOpen(false);
      fetchRelations();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/relations/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui relasi');

      showToast('success', 'Relasi mata kuliah berhasil diperbarui');
      setEditItem(null);
      fetchRelations();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/relations/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus relasi');

      showToast('success', 'Relasi berhasil dihapus');
      setDeleteTarget(null);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      fetchRelations();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;

    setSubmitting(true);
    try {
      const ids = Array.from(selected);
      let failed = 0;
      for (const id of ids) {
        const res = await fetch(`/api/admin/relations/${id}`, { method: 'DELETE' });
        if (!res.ok) failed++;
      }

      if (failed > 0) {
        showToast('error', `${failed} relasi gagal dihapus`);
      } else {
        showToast('success', `${ids.length} relasi berhasil dihapus`);
      }
      setSelected(new Set());
      setIsBulkDeleteOpen(false);
      fetchRelations();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F8FAFB]"
      style={{
        backgroundImage: `url('/Batik.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
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
            onClick={fetchRelations}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Segarkan</span>
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${CONTENT_LANE} flex flex-col gap-6`}
        >
          {/* HEADER */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-1 bg-[#588CBC] rounded-full" />
                <span className="text-[10px] font-black text-[#183449] uppercase tracking-[0.3em]">
                  Relasi Mata Kuliah
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                Manajemen Relasi Mata Kuliah
              </h2>
              <p className="text-sm text-slate-400 font-medium max-w-2xl leading-relaxed">
                Kelola hubungan antar mata kuliah, dosen pengampu, dan penanggung jawab (PJ) kelas dalam sistem SiRuang.
              </p>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#588CBC] text-white rounded-full text-xs font-bold hover:bg-[#4a7aab] transition-colors shadow-sm cursor-pointer shrink-0"
            >
              <Plus size={15} />
              Tambah Relasi
            </button>
          </div>

          {/* TABLE CARD */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* TOOLBAR */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-50">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-bold text-slate-800">
                {selected.size} baris dipilih
              </span>
              <span className="text-[10px] text-slate-400">dari total {relations.length} relasi</span>

              {selected.size > 0 && (
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-md text-[11px] font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  <Trash2 size={12} />
                  Hapus Terpilih ({selected.size})
                </button>
              )}

              <div className="relative group ml-auto">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors">
                  <Search size={13} />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari dosen, PJ, matkul, atau kelas..."
                  className="h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#588CBC] focus:ring-2 focus:ring-[#588CBC]/10 transition-all w-64"
                />
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px]">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={rows.length > 0 && selected.size === rows.length}
                        onChange={toggleAll}
                        aria-label="Pilih semua relasi"
                        className="w-4 h-4 rounded border-slate-300 text-[#588CBC] focus:ring-[#588CBC]/30 cursor-pointer"
                      />
                    </th>
                    <th className={TH_CLASS}>Mata Kuliah &amp; Kelas</th>
                    <th className={TH_CLASS}>Jadwal &amp; Semester</th>
                    <th className={TH_CLASS}>Dosen Pengampu</th>
                    <th className={TH_CLASS}>PJ Kelas</th>
                    <th className={`${TH_CLASS} text-center`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-xs text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <RotateCw size={16} className="animate-spin text-[#588CBC]" />
                          <span>Memuat data relasi mata kuliah...</span>
                        </div>
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                          <BookOpen size={28} className="text-slate-300 stroke-[1.5]" />
                          <p className="text-xs font-semibold">Tidak ada data relasi ditemukan.</p>
                          <p className="text-[11px] text-slate-400">
                            {query ? 'Coba gunakan kata kunci pencarian lain.' : 'Klik "Tambah Relasi" untuk membuat relasi baru.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selected.has(r.id)}
                            onChange={() => toggleRow(r.id)}
                            aria-label={`Pilih ${r.course}`}
                            className="w-4 h-4 rounded border-slate-300 text-[#588CBC] focus:ring-[#588CBC]/30 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-xs font-bold text-slate-800">{r.course}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            {r.kelas || 'Reguler'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                            <Clock size={12} className="text-[#588CBC]" />
                            {r.schedule}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Calendar size={10} />
                            {r.semester}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-blue-100 text-[#588CBC] flex items-center justify-center text-[10px] font-black shrink-0">
                              {r.lecturerInitials}
                            </span>
                            <div className="leading-tight">
                              <p className="text-xs font-semibold text-slate-800">{r.lecturer}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{r.lecturerNidn}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">
                              {r.pjInitials}
                            </span>
                            <div className="leading-tight">
                              <p className="text-xs font-bold text-slate-800">{r.pj}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{r.pjNim}</p>
                              <p className="text-[10px] text-slate-400">{r.pjMeta}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-3 text-slate-400">
                            <button
                              type="button"
                              onClick={() => openEditModal(r)}
                              aria-label={`Ubah relasi ${r.course}`}
                              className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                              title="Edit Relasi"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(r)}
                              aria-label={`Hapus relasi ${r.course}`}
                              className="p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Hapus Relasi"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
              <span>Menampilkan {rows.length} dari {relations.length} relasi terdaftar</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* MODAL: TAMBAH RELASI */}
      <AnimatePresence>
        {isAddOpen && (
          <RelationFormModal
            mode="add"
            formData={formData}
            setFormData={setFormData}
            dosenOptions={dosenOptions}
            pjOptions={pjOptions}
            submitting={submitting}
            onSubmit={handleCreate}
            onClose={() => setIsAddOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* MODAL: UBAH RELASI */}
      <AnimatePresence>
        {editItem && (
          <RelationFormModal
            mode="edit"
            formData={formData}
            setFormData={setFormData}
            dosenOptions={dosenOptions}
            pjOptions={pjOptions}
            submitting={submitting}
            onSubmit={handleUpdate}
            onClose={() => setEditItem(null)}
          />
        )}
      </AnimatePresence>

      {/* MODAL: HAPUS RELASI SATUAN */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Hapus Relasi Mata Kuliah?</h3>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Relasi untuk <span className="font-bold text-slate-700">{deleteTarget.course}</span> ({deleteTarget.kelas})
                antara Dosen {deleteTarget.lecturer} dan PJ {deleteTarget.pj} akan dihapus secara permanen.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleDelete}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: HAPUS MASSAL */}
      <AnimatePresence>
        {isBulkDeleteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Hapus {selected.size} Relasi?</h3>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Tindakan ini akan menghapus semua {selected.size} relasi yang Anda pilih dari sistem secara permanen.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleBulkDelete}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Menghapus...' : 'Ya, Hapus Semua'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RelasiMataKuliahView;