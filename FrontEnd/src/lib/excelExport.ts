import * as XLSX from 'xlsx';

export interface BookingExportItem {
  id?: string;
  rooms?: {
    kode?: string;
    nama?: string;
    gedung?: string;
    lantai?: number;
  } | null;
  room_id?: string;
  mata_kuliah?: string;
  kelas?: string;
  prodi?: string | null;
  fakultas?: string | null;
  nama_pemohon?: string | null;
  nim_pemohon?: string | null;
  nama_dosen?: string | null;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  sks: number;
  is_conditional?: boolean;
  status: string;
  alasan_tolak?: string | null;
  catatan_admin?: string | null;
  check_in_at?: string | null;
}

export function exportBookingsToExcel(
  bookings: BookingExportItem[],
  filenamePrefix = 'Laporan_Peminjaman_SiRuang'
): void {
  if (!bookings || bookings.length === 0) {
    alert('Tidak ada data peminjaman untuk diekspor.');
    return;
  }

  const rows = bookings.map((b, idx) => ({
    'No': idx + 1,
    'Kode Ruangan': b.rooms?.kode || b.room_id || '-',
    'Nama Ruangan': b.rooms?.nama || '-',
    'Lantai': b.rooms?.lantai || 8,
    'Mata Kuliah': b.mata_kuliah || '-',
    'Kelas': b.kelas || '-',
    'Prodi': b.prodi || '-',
    'Fakultas': b.fakultas || '-',
    'Nama PJ Pemohon': b.nama_pemohon || '-',
    'NIM PJ Pemohon': b.nim_pemohon || '-',
    'Nama Dosen': b.nama_dosen || '-',
    'Tanggal': b.tanggal,
    'Jam Mulai': b.jam_mulai ? b.jam_mulai.slice(0, 5) : '-',
    'Jam Selesai': b.jam_selesai ? b.jam_selesai.slice(0, 5) : '-',
    'SKS': b.sks,
    'Booking Bersyarat': b.is_conditional ? 'Ya' : 'Tidak',
    'Status Peminjaman': b.status,
    'Waktu Check-in': b.check_in_at ? new Date(b.check_in_at).toLocaleString('id-ID') : '-',
    'Keterangan / Alasan': b.alasan_tolak || b.catatan_admin || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-fit kolom width
  const colWidths = Object.keys(rows[0] || {}).map((key) => {
    const maxValLength = Math.max(
      key.length,
      ...rows.map((row) => String((row as any)[key] || '').length)
    );
    return { wch: Math.min(Math.max(maxValLength + 3, 10), 40) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Booking SFD');

  const now = new Date();
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;

  XLSX.writeFile(workbook, `${filenamePrefix}_${dateSuffix}.xlsx`);
}

/**
 * Download Template Excel untuk Import Jadwal Resmi SIAKAD
 */
export function downloadScheduleTemplateExcel(): void {
  const sampleData = [
    {
      'Kode Ruangan': 'R.802',
      'Hari': 'Senin',
      'Jam Mulai': '08:00',
      'Jam Selesai': '09:40',
      'Mata Kuliah': 'Pemrograman Web',
      'NIP Dosen': '197805152005011002',
      'NIM PJ Kelas': '1313620099',
      'Semester': 'Ganjil 2026/2027',
    },
    {
      'Kode Ruangan': 'R.802',
      'Hari': 'Senin',
      'Jam Mulai': '10:00',
      'Jam Selesai': '11:40',
      'Mata Kuliah': 'Basis Data',
      'NIP Dosen': '197805152005011002',
      'NIM PJ Kelas': '1313620099',
      'Semester': 'Ganjil 2026/2027',
    },
    {
      'Kode Ruangan': 'R.805',
      'Hari': 'Selasa',
      'Jam Mulai': '08:00',
      'Jam Selesai': '09:40',
      'Mata Kuliah': 'Jaringan Komputer',
      'NIP Dosen': '197805152005011002',
      'NIM PJ Kelas': '1313620099',
      'Semester': 'Ganjil 2026/2027',
    },
    {
      'Kode Ruangan': 'R.805',
      'Hari': 'Selasa',
      'Jam Mulai': '13:00',
      'Jam Selesai': '15:30',
      'Mata Kuliah': 'Praktikum Sistem Operasi',
      'NIP Dosen': '197805152005011002',
      'NIM PJ Kelas': '1313620099',
      'Semester': 'Ganjil 2026/2027',
    },
    {
      'Kode Ruangan': 'R.302',
      'Hari': 'Rabu',
      'Jam Mulai': '08:00',
      'Jam Selesai': '09:40',
      'Mata Kuliah': 'Kecerdasan Buatan',
      'NIP Dosen': '197805152005011002',
      'NIM PJ Kelas': '1313620099',
      'Semester': 'Ganjil 2026/2027',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  ws['!cols'] = [
    { wch: 16 }, // Kode Ruangan
    { wch: 12 }, // Hari
    { wch: 12 }, // Jam Mulai
    { wch: 14 }, // Jam Selesai
    { wch: 30 }, // Mata Kuliah
    { wch: 24 }, // NIP Dosen
    { wch: 18 }, // NIM PJ Kelas
    { wch: 20 }, // Semester
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Jadwal SIAKAD');
  XLSX.writeFile(wb, 'Template_Jadwal_Resmi_SIAKAD_SFD.xlsx');
}

/**
 * Parsing file Excel/CSV jadwal resmi
 */
export async function parseScheduleExcelFile(file: File): Promise<any[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  if (!firstSheet) return [];
  const rawRows: any[] = XLSX.utils.sheet_to_json(firstSheet);
  return rawRows.map((r) => ({
    room_kode: String(r['Kode Ruangan'] || r['kode_ruangan'] || r['Ruangan'] || r['Room'] || '').trim(),
    hari: String(r['Hari'] || r['hari'] || r['Day'] || '').trim().toLowerCase(),
    jam_mulai: String(r['Jam Mulai'] || r['jam_mulai'] || r['Mulai'] || '').trim(),
    jam_selesai: String(r['Jam Selesai'] || r['jam_selesai'] || r['Selesai'] || '').trim(),
    mata_kuliah: String(r['Mata Kuliah'] || r['mata_kuliah'] || r['Matkul'] || '').trim(),
    nip_dosen: String(r['NIP Dosen'] || r['nip_dosen'] || r['NIP'] || '').trim(),
    nim_pj: String(r['NIM PJ Kelas'] || r['nim_pj'] || r['NIM'] || '').trim(),
    semester: String(r['Semester'] || r['semester'] || 'Ganjil 2026/2027').trim(),
  }));
}
