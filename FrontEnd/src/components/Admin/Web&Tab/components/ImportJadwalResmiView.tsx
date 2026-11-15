'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ArrowLeft,
  Calendar,
  Clock,
  Search,
  Filter,
} from 'lucide-react';
import { downloadScheduleTemplateExcel, parseScheduleExcelFile } from '@/lib/excelExport';

interface ImportJadwalResmiViewProps {
  onBack: () => void;
}

export interface OfficialScheduleItem {
  id: string;
  room_id: string;
  mata_kuliah: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  semester: string;
  is_active: boolean;
  is_dummy: boolean;
  dosen_id?: number | null;
  pj_id?: number | null;
  rooms?: {
    kode: string;
    nama: string;
    gedung: string;
    lantai: number;
  } | null;
  dosen?: {
    username: string;
    full_name?: string;
  } | null;
  pj?: {
    username: string;
    full_name?: string;
  } | null;
}

const CONTENT_LANE = 'w-full max-w-[1400px] mx-auto';
const TH_CLASS = 'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500';

export default function ImportJadwalResmiView({ onBack }: ImportJadwalResmiViewProps) {
  const [schedules, setSchedules] = useState<OfficialScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterHari, setFilterHari] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload & preview state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [clearDummy, setClearDummy] = useState(true);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterHari !== 'ALL' ? `/api/schedules?hari=${filterHari}` : `/api/schedules`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat jadwal');
      setSchedules(json.data || []);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  }, [filterHari]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Handle file select & parsing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    try {
      const rows = await parseScheduleExcelFile(file);
      setParsedRows(rows);
      showToast('success', `Berhasil membaca ${rows.length} baris jadwal dari file.`);
    } catch (err: any) {
      showToast('error', 'Gagal memproses file Excel: ' + err.message);
      setParsedRows([]);
    }
  };

  // Submit import ke server
  const handleImportSubmit = async () => {
    if (parsedRows.length === 0) {
      alert('Tidak ada data jadwal untuk diimpor.');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/admin/schedules/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedules: parsedRows,
          clear_dummy: clearDummy,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengimpor jadwal.');
      }

      showToast('success', data.message || `Berhasil mengimpor ${data.count} jadwal resmi!`);
      setSelectedFile(null);
      setParsedRows([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchSchedules();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setImporting(false);
    }
  };

  // Hapus single schedule
  const handleDeleteSchedule = async (id: string, matkul: string) => {
    if (!confirm(`Hapus jadwal resmi perkuliahan "${matkul}"?`)) return;

    try {
      const res = await fetch(`/api/admin/schedules/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus jadwal.');
      showToast('success', 'Jadwal resmi berhasil dihapus.');
      fetchSchedules();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // Hapus semua data dummy
  const handleClearAllDummy = async () => {
    if (!confirm('Hapus seluruh jadwal resmi berstatus DUMMY dari database?')) return;

    try {
      const res = await fetch('/api/admin/schedules/clear-dummy', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus data dummy.');
      showToast('success', data.message || 'Data dummy berhasil dibersihkan.');
      fetchSchedules();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const filteredSchedules = schedules.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchQ =
      s.mata_kuliah?.toLowerCase().includes(q) ||
      s.rooms?.kode?.toLowerCase().includes(q) ||
      s.hari?.toLowerCase().includes(q);
    return matchQ;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFB] overflow-hidden">
      {/* TOAST */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold text-white animate-in fade-in slide-in-from-top-2 duration-200 ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="px-8 py-3 bg-white/80 backdrop-blur-md border-b border-slate-100 z-10 shrink-0">
        <div className={`${CONTENT_LANE} flex items-center justify-between gap-4`}>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadScheduleTemplateExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
            >
              <Download size={13} className="text-[#588CBC]" />
              <span>Unduh Template Excel</span>
            </button>
            <button
              type="button"
              onClick={fetchSchedules}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw size={13} className={loading ? 'animate-spin text-[#588CBC]' : ''} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${CONTENT_LANE} flex flex-col gap-6`}
        >
          {/* TITLE BANNER */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-1 bg-[#588CBC] rounded-full" />
              <span className="text-[10px] font-black text-[#183449] uppercase tracking-[0.3em]">
                Fase 10 · Jadwal Resmi SIAKAD
              </span>
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">
              Import &amp; Manajemen Jadwal Resmi Perkuliahan
            </h2>
            <p className="text-xs text-slate-400 font-medium max-w-3xl leading-relaxed">
              Jadwal resmi SIAKAD ditampilkan berwarna <strong className="text-blue-600">BIRU</strong> di Denah Gedung SFD dan memiliki hak prioritas presensi check-in. Ruangan tetap dapat dibooking secara bersyarat jika perkuliahan sedang kosong.
            </p>
          </div>

          {/* CARD 1: UPLOAD & PREVIEW */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Unggah File Jadwal SIAKAD (.xlsx / .csv)</h3>
                  <p className="text-[11px] text-slate-400">Gunakan format kolom sesuai template resmi SiRuang</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-2 text-slate-600 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearDummy}
                    onChange={(e) => setClearDummy(e.target.checked)}
                    className="rounded border-slate-300 text-[#588CBC] focus:ring-[#588CBC]"
                  />
                  <span>Hapus data dummy lama sebelum import</span>
                </label>
              </div>
            </div>

            {/* DROPZONE */}
            <div className="grid md:grid-cols-[1fr_auto] gap-4 items-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-[#588CBC] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50 flex flex-col items-center justify-center gap-2"
              >
                <Upload size={24} className="text-slate-400" />
                <p className="text-xs font-bold text-slate-700">
                  {selectedFile ? selectedFile.name : 'Pilih atau Tarik File Spreadsheet (.xlsx / .csv) ke Sini'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {selectedFile
                    ? `Ukuran file: ${(selectedFile.size / 1024).toFixed(1)} KB`
                    : 'Mendukung file ekspor jadwal resmi dari SIAKAD universitas'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={parsedRows.length === 0 || importing}
                  onClick={handleImportSubmit}
                  className="py-3 px-6 rounded-xl font-black text-xs bg-[#588CBC] hover:bg-[#4878a8] text-white shadow-md shadow-[#588CBC]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <RotateCw size={14} className="animate-spin" />
                      <span>Mengimpor Data...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Simpan &amp; Terapkan Jadwal ({parsedRows.length})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleClearAllDummy}
                  className="py-2.5 px-4 rounded-xl font-bold text-[11px] text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Bersihkan Semua Data Dummy</span>
                </button>
              </div>
            </div>

            {/* PREVIEW TABLE JIKA FILE TERPILIH */}
            {parsedRows.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">
                    Preview Data ({parsedRows.length} baris terdeteksi):
                  </span>
                  <span className="text-[10px] text-slate-400">Menampilkan hingga 5 baris pertama</span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] font-bold text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Ruangan</th>
                        <th className="px-3 py-2">Hari</th>
                        <th className="px-3 py-2">Jam Mulai</th>
                        <th className="px-3 py-2">Jam Selesai</th>
                        <th className="px-3 py-2">Mata Kuliah</th>
                        <th className="px-3 py-2">NIP Dosen</th>
                        <th className="px-3 py-2">NIM PJ</th>
                        <th className="px-3 py-2">Semester</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {parsedRows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-bold text-blue-600">{r.room_kode}</td>
                          <td className="px-3 py-1.5 capitalize">{r.hari}</td>
                          <td className="px-3 py-1.5">{r.jam_mulai}</td>
                          <td className="px-3 py-1.5">{r.jam_selesai}</td>
                          <td className="px-3 py-1.5 font-semibold text-slate-800">{r.mata_kuliah}</td>
                          <td className="px-3 py-1.5 text-slate-500">{r.nip_dosen || '-'}</td>
                          <td className="px-3 py-1.5 text-slate-500">{r.nim_pj || '-'}</td>
                          <td className="px-3 py-1.5 text-slate-400">{r.semester}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* CARD 2: DAFTAR JADWAL RESMI YANG SEDANG AKTIF */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* TOOLBAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800">Daftar Jadwal Resmi di Gedung SFD</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
                  {filteredSchedules.length} Jadwal
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* FILTER HARI */}
                <select
                  value={filterHari}
                  onChange={(e) => setFilterHari(e.target.value)}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-[#588CBC]"
                >
                  <option value="ALL">Semua Hari (Senin-Jumat)</option>
                  <option value="senin">Senin</option>
                  <option value="selasa">Selasa</option>
                  <option value="rabu">Rabu</option>
                  <option value="kamis">Kamis</option>
                  <option value="jumat">Jumat</option>
                </select>

                {/* SEARCH */}
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari matkul / ruangan..."
                    className="h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#588CBC]"
                  />
                </div>
              </div>
            </div>

            {/* SCHEDULE TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className={TH_CLASS}>Ruangan &amp; Lantai</th>
                    <th className={TH_CLASS}>Hari &amp; Waktu</th>
                    <th className={TH_CLASS}>Mata Kuliah &amp; Semester</th>
                    <th className={TH_CLASS}>Dosen &amp; PJ Resmi</th>
                    <th className={TH_CLASS}>Tipe Data</th>
                    <th className={`${TH_CLASS} text-center`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-xs text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <RotateCw size={16} className="animate-spin text-[#588CBC]" />
                          <span>Memuat jadwal resmi...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-xs text-slate-400">
                        Tidak ada jadwal resmi pada kriteria pencarian ini.
                      </td>
                    </tr>
                  ) : (
                    filteredSchedules.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                              {s.rooms?.kode?.replace('R.', '') || 'SFD'}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{s.rooms?.kode}</p>
                              <p className="text-[10px] text-slate-400">{s.rooms?.nama || 'Gedung SFD'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="text-xs font-bold text-slate-800 capitalize">{s.hari}</p>
                          <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                            <Clock size={11} className="text-[#588CBC]" />
                            {s.jam_mulai.slice(0, 5)} - {s.jam_selesai.slice(0, 5)} WIB
                          </p>
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="text-xs font-bold text-slate-800">{s.mata_kuliah}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{s.semester}</p>
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="text-xs font-semibold text-slate-800">
                            Dosen: {s.dosen?.full_name || s.dosen?.username || 'Dosen Pengampu'}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            PJ: {s.pj?.full_name || s.pj?.username || 'PJ Kelas'}
                          </p>
                        </td>

                        <td className="px-4 py-3.5">
                          {s.is_dummy ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Data Simulasi (Dummy)
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Resmi SIAKAD
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteSchedule(s.id, s.mata_kuliah)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus jadwal resmi"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

