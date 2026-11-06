export interface JadwalEvent {
  id: string;
  title: string;
  dateRange: string;
  category: string;
  isPassed?: boolean;
}

export const jadwalPenmaba: JadwalEvent[] = [
  {
    id: 'gel1-daftar',
    title: 'Pendaftaran Gelombang 1',
    dateRange: '1 Mei - 30 Mei 2026',
    category: 'PENDAFTARAN'
  },
  {
    id: 'gel1-ujian',
    title: 'Ujian Mandiri Gelombang 1',
    dateRange: '5 Juni 2026',
    category: 'UJIAN'
  },
  {
    id: 'gel1-pengumuman',
    title: 'Pengumuman Hasil Gelombang 1',
    dateRange: '15 Juni 2026',
    category: 'PENGUMUMAN'
  },
  {
    id: 'gel2-daftar',
    title: 'Pendaftaran Gelombang 2',
    dateRange: '1 Juli - 31 Juli 2026',
    category: 'PENDAFTARAN'
  },
  {
    id: 'gel2-ujian',
    title: 'Ujian Mandiri Gelombang 2',
    dateRange: '5 Agustus 2026',
    category: 'UJIAN'
  },
  {
    id: 'gel2-pengumuman',
    title: 'Pengumuman Hasil Gelombang 2',
    dateRange: '15 Agustus 2026',
    category: 'PENGUMUMAN'
  }
];
