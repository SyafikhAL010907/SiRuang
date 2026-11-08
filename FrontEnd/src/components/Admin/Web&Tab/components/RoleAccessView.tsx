'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Settings, Trash2, Check } from 'lucide-react';

interface RoleAccessViewProps {
  onBack: () => void;
}

// ── Tiny Toggle ──
const Toggle: React.FC<{ checked: boolean; onChange: () => void; label: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
      checked ? 'bg-green-700' : 'bg-slate-200'
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

// ── Data types ──
type PermKey = 'c' | 'r' | 'u' | 'd';

interface RoleRow {
  id: number;
  name: string;
  c: boolean;
  r: boolean;
  u: boolean;
  d: boolean;
  deletable: boolean;
}

const INITIAL_ROLES: RoleRow[] = [
  { id: 1, name: 'Superadmin', c: true, r: true, u: true, d: true, deletable: false },
  { id: 2, name: 'Dosen', c: true, r: true, u: true, d: false, deletable: true },
  { id: 3, name: 'Penanggung Jawab (PJ)', c: true, r: true, u: true, d: false, deletable: true },
  { id: 4, name: 'Mahasiswa', c: true, r: true, u: false, d: false, deletable: true },
];

const PERM_COLUMNS: { key: PermKey; label: string }[] = [
  { key: 'c', label: 'C' },
  { key: 'r', label: 'R' },
  { key: 'u', label: 'U' },
  { key: 'd', label: 'D' },
];

const CONTENT_LANE = 'w-full max-w-[1400px] mx-auto';

const RoleAccessView: React.FC<RoleAccessViewProps> = ({ onBack }) => {
  const [roles, setRoles] = useState<RoleRow[]>(INITIAL_ROLES);

  const togglePerm = (id: number, key: PermKey) => {
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: !r[key] } : r)));
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
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-1 bg-[#588CBC] rounded-full" />
              <span className="text-[10px] font-black text-[#183449] uppercase tracking-[0.3em]">
                Role Akses
              </span>
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">
              Konfigurasi Role Akses
            </h2>
            <p className="text-sm text-slate-400 font-medium max-w-2xl leading-relaxed">
              Atur dan kelola hak akses setiap role pengguna dalam sistem.
            </p>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-black text-white">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider w-16">No</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider">Role</th>
                    {PERM_COLUMNS.map((p) => (
                      <th key={p.key} className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-wider w-20">
                        {p.label}
                      </th>
                    ))}
                    <th className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-wider w-24">Status</th>
                    <th className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-wider w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role, index) => (
                    <tr key={role.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-6 py-5 text-xs font-semibold text-slate-700">{index + 1}</td>
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-sky-100 text-sky-500 flex items-center justify-center shrink-0">
                            <User size={14} />
                          </span>
                          <span className="text-xs font-bold text-slate-800">{role.name}</span>
                        </div>
                      </td>
                      {PERM_COLUMNS.map((p) => (
                        <td key={p.key} className="px-4 py-5">
                          <div className="flex justify-center">
                            <Toggle
                              checked={role[p.key]}
                              onChange={() => togglePerm(role.id, p.key)}
                              label={`${role.name} - ${p.label}`}
                            />
                          </div>
                        </td>
                      ))}
                      <td className="px-4 py-5">
                        <div className="flex justify-center">
                          <span className="w-5 h-5 rounded border border-slate-300 text-slate-400 flex items-center justify-center">
                            <Check size={12} />
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            aria-label={`Atur ${role.name}`}
                            className="w-7 h-7 rounded-lg bg-sky-100 text-sky-500 hover:bg-sky-200 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Settings size={14} />
                          </button>
                          {role.deletable && (
                            <button
                              type="button"
                              aria-label={`Hapus ${role.name}`}
                              className="w-7 h-7 rounded-lg bg-rose-100 text-rose-400 hover:bg-rose-200 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RoleAccessView;
