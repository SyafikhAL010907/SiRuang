'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Pencil, Trash2, SlidersHorizontal, Search, Plus } from 'lucide-react';

interface ManajemenAkunViewProps {
  onBack: () => void;
}

type AccountRole = 'ADMIN' | 'MAHASISWA' | 'DOSEN';
type AvatarTone = 'blue' | 'purple' | 'amber' | 'cyan' | 'indigo' | 'emerald';

interface AccountRow {
  id: number;
  name: string;
  identity: string;
  initials: string;
  tone: AvatarTone;
  role: AccountRole;
  classLabel: string;
  prodi: string;
}

// ── DATA DUMMY ──
const ACCOUNTS: AccountRow[] = [
  { id: 1, name: 'Admin Prodi', identity: '-', initials: 'VD', tone: 'blue', role: 'ADMIN', classLabel: 'Kelas A', prodi: 'Sistem & Keamanan' },
  { id: 2, name: 'Raihan Saputra', identity: 'NIM: 1512625002', initials: 'RS', tone: 'purple', role: 'MAHASISWA', classLabel: 'Kelas C', prodi: 'PTIK · 2024' },
  { id: 3, name: 'Abdullah Zikri', identity: 'NIM: 1512625003', initials: 'AZ', tone: 'amber', role: 'MAHASISWA', classLabel: 'Kelas C', prodi: 'PTIK · 2024' },
  { id: 4, name: 'Maulana Syafikh Alkhudri', identity: 'NIM: 1512625004', initials: 'MS', tone: 'cyan', role: 'MAHASISWA', classLabel: 'Kelas B', prodi: 'PTIK · 2024' },
  { id: 5, name: 'Dr. Rahmawati, M.T.', identity: 'NIDN: 0412098201', initials: 'DR', tone: 'indigo', role: 'DOSEN', classLabel: 'Dosen Pengampu', prodi: 'Teknik Informatika' },
  { id: 6, name: 'Nadia Putri Lestari', identity: 'NIM: 1512625005', initials: 'NP', tone: 'emerald', role: 'MAHASISWA', classLabel: 'Kelas A', prodi: 'PTIK · 2024' },
];

const TOTAL_DATA = 48;

const ROLE_BADGE: Record<AccountRole, string> = {
  ADMIN: 'bg-rose-100 text-rose-600',
  MAHASISWA: 'bg-sky-100 text-sky-600',
  DOSEN: 'bg-violet-100 text-violet-600',
};

const TONE_BG: Record<AvatarTone, string> = {
  blue: 'bg-blue-100 text-blue-600',
  purple: 'bg-purple-100 text-purple-600',
  amber: 'bg-amber-100 text-amber-600',
  cyan: 'bg-cyan-100 text-cyan-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  emerald: 'bg-emerald-100 text-emerald-600',
};

const TH_CLASS = 'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500';
const CONTENT_LANE = 'w-full max-w-[1400px] mx-auto';

const ManajemenAkunView: React.FC<ManajemenAkunViewProps> = ({ onBack }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set([1]));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ACCOUNTS;
    return ACCOUNTS.filter(
      (a) => a.name.toLowerCase().includes(q) || a.identity.toLowerCase().includes(q)
    );
  }, [query]);

  const toggleRow = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      {/* TOP BAR */}
      <header className="px-8 py-3 bg-white/80 backdrop-blur-md border-b border-slate-100 z-10 shrink-0">
        <div className={`${CONTENT_LANE} flex items-center gap-4`}>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-[#588CBC] transition-colors cursor-pointer group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-bold">Kembali ke Dashboard</span>
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
                  Manajemen Akun
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                Manajemen Akun
              </h2>
              <p className="text-sm text-slate-400 font-medium max-w-2xl leading-relaxed">
                Kelola data dan hak akses akun pengguna dalam sistem.
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-[#588CBC] text-white rounded-full text-xs font-bold hover:bg-[#4a7aab] transition-colors shrink-0">
              <Plus size={14} />
              Tambah Akun
            </button>
          </div>

          {/* TABLE CARD */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* TOOLBAR */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-50">
              <span className="inline-flex items-center px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-bold text-slate-800">
                {selected.size} dipilih
              </span>
              <span className="text-[10px] text-slate-400 mr-1">/ {TOTAL_DATA} data</span>

              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors">
                  <Search size={13} />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari pengguna..."
                  className="h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#588CBC] focus:ring-2 focus:ring-[#588CBC]/10 transition-all w-48"
                />
              </div>

              <button
                type="button"
                className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <SlidersHorizontal size={13} />
                Filter
              </button>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="w-12 px-4 py-3" />
                    <th className={TH_CLASS}>Pengguna &amp; Identitas</th>
                    <th className={TH_CLASS}>Role</th>
                    <th className={TH_CLASS}>Kelas / Prodi</th>
                    <th className={`${TH_CLASS} text-center`}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={selected.has(a.id)}
                          onChange={() => toggleRow(a.id)}
                          aria-label={`Pilih ${a.name}`}
                          className="w-4 h-4 rounded border-slate-300 text-[#588CBC] focus:ring-[#588CBC]/30 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full ${TONE_BG[a.tone]} flex items-center justify-center text-[10px] font-black shrink-0`}>
                            {a.initials}
                          </span>
                          <div className="leading-tight">
                            <p className="text-xs font-bold text-slate-800">{a.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{a.identity}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide ${ROLE_BADGE[a.role]}`}
                        >
                          {a.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-[11px] font-semibold text-slate-700">{a.classLabel}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{a.prodi}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-3 text-slate-400">
                          <button type="button" aria-label={`Ubah ${a.name}`} className="hover:text-slate-700 transition-colors cursor-pointer">
                            <Pencil size={14} />
                          </button>
                          <button type="button" aria-label={`Hapus ${a.name}`} className="hover:text-rose-500 transition-colors cursor-pointer">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-xs text-slate-400">
                        Pengguna tidak ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
              <span>Menampilkan {rows.length} dari {TOTAL_DATA} data</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ManajemenAkunView;
