/**
 * Shared types for room/floor data across all buildings (LE, LS, SFD).
 * Centralized here to avoid duplicating types across every floor.
 */

export type Hari = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';

export const URUTAN_HARI: Hari[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
export const HARI_DARI_INDEX: Hari[] = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export type Jadwal = {
  hari: Hari;
  mulai: string;
  selesai: string;
  kegiatan: string;
  kelas: string;
  prodi: string;
  dosen: string;
  pj: string;
  kontak: string;
};

export type RoomInfo = {
  kode: string;
  nama: string;
  bookable: boolean;
  kapasitas?: number;
  keterangan?: string;
  fasilitas: string[];
  jadwal: Jadwal[];
};
