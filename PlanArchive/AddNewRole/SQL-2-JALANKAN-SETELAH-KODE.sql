-- ============================================================
-- SQL-2-JALANKAN-SETELAH-KODE.sql
-- SiRuang · Tambah Role Baru: AdminDev, Admin SFD, Admin LE, Admin LS
-- ============================================================
-- KAPAN DIJALANKAN:
--   File ini dijalankan SETELAH kode (Fase 1 s.d. Fase 6 di PLAN.md)
--   sudah live dan lolos test SFD.
--   JANGAN jalankan sebelum kode siap — migrasi status tidak bisa di-rollback
--   sempurna tanpa backup.
--
-- URUTAN WAJIB:
--   Blok A  → Rename enum 'admin' → 'admin_dev'
--             (jalankan SENDIRIAN, harus sebelum blok lain)
--   Blok B  → Konversi status lama → status baru (menunggu_approval, dst)
--   Blok C  → Migrasi kolom approval untuk booking lama
--   Blok D  → Perubahan chat_rooms + backfill room PJ-dosen
--   Blok E  → Verifikasi migrasi
--   Blok F  → Script ROLLBACK (dalam komentar /* */ — jalankan hanya jika perlu)
-- ============================================================


-- ============================================================
-- BLOK A: RENAME ENUM 'admin' → 'admin_dev'
-- ============================================================
-- ⚠️ WAJIB JALANKAN SENDIRIAN (sama seperti Blok 1 di SQL-1).
-- Prasyarat: kode sudah menerima KEDUA value 'admin' dan 'admin_dev'
-- (middleware, roleNavigation, semua switch role).
-- Setelah blok ini: tidak ada lagi role string 'admin' di database.

ALTER TYPE user_role RENAME VALUE 'admin' TO 'admin_dev';

-- Verifikasi Blok A:
-- SELECT enum_range(NULL::user_role);
-- 'admin' tidak boleh muncul; 'admin_dev' harus ada.


-- ============================================================
-- BLOK B: KONVERSI STATUS LAMA → STATUS BARU
-- ============================================================
-- Jalankan SETELAH Blok A sukses.
-- Idempotent: WHERE memeriksa nilai lama, tidak akan re-update yang sudah baru.

-- B1. menunggu_dosen → menunggu_approval (booking belum ada yang merespons)
UPDATE public.bookings
SET
  status           = 'menunggu_approval',
  approval_dosen         = 'pending',
  approval_admin_gedung  = 'pending'
WHERE status = 'menunggu_dosen';

-- B2. dijadwalkan_admin → dijadwalkan (sudah disetujui kedua pihak di alur lama)
UPDATE public.bookings
SET status = 'dijadwalkan'
WHERE status = 'dijadwalkan_admin';

-- B3. ditolak_dosen → ditolak (isi kolom approval dan alasan per-approver)
UPDATE public.bookings
SET
  status                 = 'ditolak',
  approval_dosen         = 'ditolak',
  alasan_tolak_dosen     = alasan_tolak,   -- kolom lama → kolom baru
  ditolak_oleh           = 'dosen',
  ditolak_at             = dosen_responded_at,
  dosen_responded_at_v2  = dosen_responded_at
WHERE status = 'ditolak_dosen';

-- B4. ditolak_admin → ditolak (isi kolom approval admin gedung)
UPDATE public.bookings
SET
  status                       = 'ditolak',
  approval_admin_gedung        = 'ditolak',
  alasan_tolak_admin_gedung    = alasan_tolak,   -- kolom lama → kolom baru
  ditolak_oleh                 = 'admin_gedung',
  ditolak_at                   = admin_responded_at
WHERE status = 'ditolak_admin';

-- Verifikasi Blok B:
-- SELECT status, COUNT(*) FROM public.bookings GROUP BY status ORDER BY status;
-- Tidak boleh ada: menunggu_dosen, ditolak_dosen, ditolak_admin, dijadwalkan_admin.


-- ============================================================
-- BLOK C: MIGRASI KOLOM APPROVAL UNTUK BOOKING LAMA
-- ============================================================
-- Booking yang sudah selesai / berlangsung / dijadwalkan / menunggu_checkin
-- dianggap sudah disetujui kedua pihak (alur lama: dosen + admin tunggal).
-- approval_admin_gedung diisi 'disetujui' agar tidak NULL/pending di UI baru.

UPDATE public.bookings
SET
  approval_dosen             = 'disetujui',
  approval_admin_gedung      = 'disetujui',
  dosen_responded_at_v2      = COALESCE(dosen_responded_at_v2, dosen_responded_at)
WHERE status IN ('disetujui_dosen', 'dijadwalkan', 'menunggu_checkin', 'berlangsung', 'selesai')
  AND approval_dosen = 'pending';   -- hanya yang belum dimigrasi

-- Booking yang sudah ditolak (dari Blok B): approval_dosen sudah diisi di B3/B4.
-- Booking dibatalkan / kedaluwarsa: biarkan approval = 'pending' (tidak relevan).

-- Verifikasi Blok C:
-- SELECT approval_dosen, approval_admin_gedung, COUNT(*)
-- FROM public.bookings
-- WHERE status IN ('dijadwalkan','menunggu_checkin','berlangsung','selesai')
-- GROUP BY approval_dosen, approval_admin_gedung;
-- Semua baris harus: approval_dosen='disetujui', approval_admin_gedung='disetujui'.


-- ============================================================
-- BLOK D: PERUBAHAN CHAT_ROOMS + BACKFILL ROOM PJ-DOSEN
-- ============================================================
-- D1. Tambah kolom baru di chat_rooms
-- Schema existing: user_identifier TIDAK UNIQUE (hanya index biasa).
-- Model baru: 1 user bisa punya BANYAK room (uniqueness per pasangan participant).
-- Room lama (participant_b_identifier IS NULL) = room user→admin_dev (default).
--   admin_dev melihat: participant_b_identifier = identifier ATAU IS NULL.
--   admin_sfd/le/ls melihat: participant_b_identifier = identifier saja.

ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS room_type VARCHAR(30) NOT NULL DEFAULT 'user_to_admin'
    CHECK (room_type IN ('user_to_admin', 'pj_to_dosen', 'general')),
  ADD COLUMN IF NOT EXISTS participant_b_identifier VARCHAR(50),
  -- NULL = room lama (user → admin_dev, default sebelum fitur ini)
  ADD COLUMN IF NOT EXISTS participant_b_role VARCHAR(20);

-- D2. Partial UNIQUE index: satu room per pasangan participant
-- Kolom user_identifier = participant_a (inisiator).
-- Room lama (participant_b_identifier IS NULL) dikecualikan dari UNIQUE ini
-- agar tidak conflict satu sama lain.
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_rooms_participants
  ON public.chat_rooms (
    user_identifier,
    COALESCE(participant_b_identifier, '')
  )
  WHERE room_type IN ('user_to_admin', 'pj_to_dosen');

-- D3. BACKFILL: Buat room PJ-Dosen untuk semua relasi existing
-- official_schedules memiliki kolom pj_id dan dosen_id (dikonfirmasi dari kode API).
-- Idempotent: ON CONFLICT DO NOTHING (berdasarkan index uq_chat_rooms_participants).
-- Jalankan SETELAH D2 (index uq harus sudah ada).

INSERT INTO public.chat_rooms (
  user_identifier,
  room_type,
  participant_b_identifier,
  participant_b_role,
  last_message,
  updated_at,
  is_marked_unread
)
SELECT DISTINCT
  pj.identifier   AS user_identifier,
  'pj_to_dosen'   AS room_type,
  dos.identifier  AS participant_b_identifier,
  'dosen'         AS participant_b_role,
  NULL            AS last_message,
  NOW()           AS updated_at,
  FALSE           AS is_marked_unread
FROM public.official_schedules os
JOIN public.authentication pj  ON pj.id  = os.pj_id    AND pj.role  = 'pj_kelas'
JOIN public.authentication dos ON dos.id = os.dosen_id  AND dos.role = 'dosen'
WHERE os.is_active = TRUE
  AND os.pj_id IS NOT NULL
  AND os.dosen_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Verifikasi Blok D:
-- SELECT room_type, COUNT(*) FROM public.chat_rooms GROUP BY room_type;
-- SELECT COUNT(*) FROM public.chat_rooms WHERE room_type = 'pj_to_dosen';


-- ============================================================
-- BLOK E: VERIFIKASI AKHIR MIGRASI
-- ============================================================

-- E1. Enum setelah rename:
SELECT enum_range(NULL::user_role);
-- Harus: {admin_dev, user, dosen, pj_kelas, admin_sfd, admin_le, admin_ls}
-- 'admin' tidak boleh muncul.

-- E2. Status booking setelah migrasi:
SELECT status, COUNT(*)
FROM public.bookings
GROUP BY status
ORDER BY status;
-- Tidak boleh ada: menunggu_dosen, ditolak_dosen, ditolak_admin, dijadwalkan_admin.

-- E3. Approval untuk booking aktif:
SELECT
  status,
  approval_dosen,
  approval_admin_gedung,
  COUNT(*) AS jumlah
FROM public.bookings
WHERE status IN ('dijadwalkan', 'menunggu_checkin', 'berlangsung', 'selesai', 'menunggu_approval')
GROUP BY status, approval_dosen, approval_admin_gedung
ORDER BY status;

-- E4. Chat rooms:
SELECT room_type, COUNT(*) FROM public.chat_rooms GROUP BY room_type;

-- E5. Akun admin aktif:
SELECT username, identifier, role
FROM public.authentication
WHERE role IN ('admin_dev', 'admin_sfd', 'admin_le', 'admin_ls')
ORDER BY role;


-- ============================================================
-- BLOK F: ROLLBACK
-- ============================================================
-- Jalankan HANYA jika implementasi gagal dan perlu dikembalikan.
-- ⚠️ BACKUP DATABASE SEBELUM MENJALANKAN BLOK F.
-- Migrasi data (Blok B-C) TIDAK bisa di-rollback sempurna — data approval
-- yang ditimpa akan hilang. Ini alasan utama kenapa backup wajib.

/*

-- F-D: Rollback chat_rooms (D3 dulu, D2, D1)
DELETE FROM public.chat_rooms WHERE room_type = 'pj_to_dosen';
DROP INDEX IF EXISTS public.uq_chat_rooms_participants;
ALTER TABLE public.chat_rooms
  DROP COLUMN IF EXISTS participant_b_role,
  DROP COLUMN IF EXISTS participant_b_identifier,
  DROP COLUMN IF EXISTS room_type;

-- F-C: Rollback status booking (kembalikan ke lama — HANYA jika backup tersedia)
-- (Tidak bisa di-rollback sempurna — lihat peringatan di atas)

-- F-B: Tidak ada rollback otomatis — restore dari backup.

-- F-A: Rename admin_dev kembali ke admin
-- Prasyarat: tidak ada row dengan role admin_dev (ganti manual dulu ke 'admin')
ALTER TYPE user_role RENAME VALUE 'admin_dev' TO 'admin';

-- Verifikasi rollback enum:
-- SELECT enum_range(NULL::user_role);  → harus kembali ke {admin, user, dosen, pj_kelas, ...}

*/


-- ============================================================
-- CATATAN ROLLBACK SQL-1 (jika perlu revert sebelum SQL-2)
-- ============================================================
/*

-- R-5b: Hapus mapping gedung
DELETE FROM public.admin_gedung_mapping
WHERE admin_id IN (
  SELECT id FROM public.authentication
  WHERE identifier IN ('980101000101','980101000201','980101000301')
);

-- R-5: Hapus profil dan akun admin gedung
DELETE FROM public.profiles
WHERE user_id IN (
  SELECT id FROM public.authentication
  WHERE identifier IN ('980101000101','980101000201','980101000301')
);
DELETE FROM public.authentication
WHERE identifier IN ('980101000101','980101000201','980101000301');

-- R-3: Drop tabel mapping
DROP TABLE IF EXISTS public.admin_gedung_mapping;

-- R-2b: Drop constraint baru (kembalikan tanpa constraint atau pakai yang lama)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS chk_bookings_status;

-- R-2: Drop kolom baru bookings
ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS approval_dosen,
  DROP COLUMN IF EXISTS alasan_tolak_dosen,
  DROP COLUMN IF EXISTS dosen_responded_at_v2,
  DROP COLUMN IF EXISTS approval_admin_gedung,
  DROP COLUMN IF EXISTS alasan_tolak_admin_gedung,
  DROP COLUMN IF EXISTS admin_gedung_id,
  DROP COLUMN IF EXISTS admin_gedung_responded_at,
  DROP COLUMN IF EXISTS admin_gedung_token_hash,
  DROP COLUMN IF EXISTS admin_gedung_token_expires,
  DROP COLUMN IF EXISTS ditolak_oleh,
  DROP COLUMN IF EXISTS ditolak_at;

-- R-1: Drop enum value baru (PostgreSQL tidak support DROP VALUE langsung)
-- Pastikan tidak ada row dengan role admin_sfd/le/ls sebelum ini (sudah dihapus di R-5).
-- Recreate enum tanpa value baru:
-- (Lakukan hanya jika benar-benar perlu — ini destructive)
-- ALTER TYPE user_role RENAME TO user_role_old;
-- CREATE TYPE user_role AS ENUM ('admin', 'user', 'dosen', 'pj_kelas');
-- ALTER TABLE authentication ALTER COLUMN role TYPE user_role USING role::text::user_role;
-- DROP TYPE user_role_old;

*/

