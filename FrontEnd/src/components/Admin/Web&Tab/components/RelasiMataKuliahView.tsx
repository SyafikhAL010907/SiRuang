'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, MessageCircle, Pencil, SlidersHorizontal, Search, Plus } from 'lucide-react';

interface RelasiMataKuliahViewProps {
  onBack: () => void;
}

interface RelationRow {
  id: number;
  course: string;
  schedule: string;
  lecturer: string;
  lecturerNidn: string;
  lecturerInitials: string;
  pj: string;
  pjNim: string;
  pjMeta: string;
  pjInitials: string;
}

// ── DATA DUMMY ──
const RELATIONS: RelationRow[] = [
  { id: 1, course: 'Pemrograman Web', schedule: 'Sen 08.00 · L-306', lecturer: 'Dr. Rahmawati, M.T.', lecturerNidn: 'NIDN: 0412098201', lecturerInitials: 'DR', pj: 'Anita Patel', pjNim: 'NIM: 24050974012', pjMeta: 'PTIK · 2024 · Kelas A', pjInitials: 'AP' },
  { id: 2, course: 'Pemrograman Web', schedule: 'Sen 08.00 · L-306', lecturer: 'Dr. Rahmawati, M.T.', lecturerNidn: 'NIDN: 0412098201', lecturerInitials: 'DR', pj: 'Anita Patel', pjNim: 'NIM: 24050974012', pjMeta: 'PTIK · 2024 · Kelas A', pjInitials: 'AP' },
  { id: 3, course: 'Pemrograman Web', schedule: 'Sen 08.00 · L-306', lecturer: 'Dr. Rahmawati, M.T.', lecturerNidn: 'NIDN: 0412098201', lecturerInitials: 'DR', pj: 'Anita Patel', pjNim: 'NIM: 24050974012', pjMeta: 'PTIK · 2024 · Kelas A', pjInitials: 'AP' },
  { id: 4, course: 'Pemrograman Web', schedule: 'Sen 08.00 · L-306', lecturer: 'Dr. Rahmawati, M.T.', lecturerNidn: 'NIDN: 0412098201', lecturerInitials: 'DR', pj: 'Anita Patel', pjNim: 'NIM: 24050974012', pjMeta: 'PTIK · 2024 · Kelas A', pjInitials: 'AP' },
  { id: 5, course: 'Pemrograman Web', schedule: 'Sen 08.00 · L-306', lecturer: 'Dr. Rahmawati, M.T.', lecturerNidn: 'NIDN: 0412098201', lecturerInitials: 'DR', pj: 'Anita Patel', pjNim: 'NIM: 24050974012', pjMeta: 'PTIK · 2024 · Kelas A', pjInitials: 'AP' },
];

const TOTAL_DATA = 28;

const TH_CLASS = 'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500';
const CONTENT_LANE = 'w-full max-w-[1400px] mx-auto';

const RelasiMataKuliahView: React.FC<RelasiMataKuliahViewProps> = ({ onBack }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set([1]));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RELATIONS;
    return RELATIONS.filter(
      (r) =>
        r.course.toLowerCase().includes(q) ||
        r.lecturer.toLowerCase().includes(q) ||
        r.pj.toLowerCase().includes(q)
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
                  Relasi Mata Kuliah
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                Manajemen Relasi Mata Kuliah
              </h2>
              <p className="text-sm text-slate-400 font-medium max-w-2xl leading-relaxed">
                Kelola hubungan antar mata kuliah, dosen pengampu, dan PJ kelas dalam sistem.
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-[#588CBC] text-white rounded-full text-xs font-bold hover:bg-[#4a7aab] transition-colors shrink-0">
              <Plus size={14} />
              Tambah Relasi
            </button>
          </div>

          {/* TABLE CARD */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* TOOLBAR */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-50">
              <span className="inline-flex items-center px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-bold text-slate-800">
                {selected.size} baris dipilih
              </span>
              <span className="text-[10px] text-slate-400 mr-1">dari total {TOTAL_DATA} relasi</span>

              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors">
                  <Search size={13} />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari dosen, PJ, atau matkul..."
                  className="h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#588CBC] focus:ring-2 focus:ring-[#588CBC]/10 transition-all w-56"
                />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal size={13} />
                  Filter
                </button>
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="w-12 px-4 py-3" />
                    <th className={TH_CLASS}>Mata Kuliah &amp; Jadwal</th>
                    <th className={TH_CLASS}>Dosen Pengampu</th>
                    <th className={TH_CLASS}>PJ Kelas</th>
                    <th className={`${TH_CLASS} text-center`}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
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
                        <p className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                          <Clock size={11} />
                          {r.schedule}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black shrink-0">
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
                          <button type="button" aria-label={`Chat PJ ${r.pj}`} className="hover:text-slate-700 transition-colors cursor-pointer">
                            <MessageCircle size={14} />
                          </button>
                          <button type="button" aria-label={`Ubah ${r.course}`} className="hover:text-slate-700 transition-colors cursor-pointer">
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-xs text-slate-400">
                        Data tidak ditemukan.
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

export default RelasiMataKuliahView;
