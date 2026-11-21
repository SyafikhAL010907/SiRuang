-- ============================================================
-- SQL.sql — Tambah Role Baru: AdminDev, Admin SFD, Admin LE, Admin LS
-- SiRuang Project · Supabase (PostgreSQL)
-- STATUS: DRAFT PERENCANAAN · JANGAN JALANKAN SEBELUM DISETUJUI
-- Terakhir diperbarui: 2026-11-21 (revisi: NIP 12 digit, email profil, chat schema, atomik)
-- ============================================================
-- URUTAN EKSEKUSI WAJIB DIIKUTI:
--   STEP 0  → Cek nilai gedung di tabel rooms (READ ONLY, wajib sebelum lanjut)
--   STEP 1  → Rename enum lama
--   STEP 2  → Tambah nilai enum baru (harus TERPISAH dari STEP 3+)
--   STEP 3  → Perubahan tabel bookings (approval paralel)
--   STEP 4  → Tabel relasi admin gedung
--   STEP 5  → Update data lama
--   STEP 6  → Cek bentrok NIP sebelum seeding
--   STEP 7  → Seed akun admin gedung (SFD, LE, LS)
--   STEP 8  → Perubahan chat rooms + backfill room PJ-dosen
--   STEP 9  → Update view & grants
-- ============================================================

-- ============================================================
-- STEP 0: CEK NILAI GEDUNG DI TABEL ROOMS (READ-ONLY, WAJIB PERTAMA)
-- ============================================================
-- Jalankan query ini dulu. Baca hasilnya.
-- Mapping di STEP 7 (admin_gedung_mapping) HARUS disesuaikan dengan hasil query ini
-- sebelum SQL dijalankan lebih lanjut.
--
-- Berdasarkan analisis kode (FrontEnd/src/app/api/rooms/status/route.ts):
-- nilai gedung disimpan sebagai UPPERCASE: 'SFD', 'LE', 'LS'
-- Namun WAJIB diverifikasi dengan query ini sebelum lanjut:

SELECT DISTINCT gedung FROM rooms ORDER BY gedung;

-- Hasil yang diharapkan: SFD, LE, LS
-- Jika hasilnya berbeda, update gedung_kode di INSERT admin_gedung_mapping (STEP 7) sesuai hasil.

-- ============================================================
-- STEP 1: RENAME ENUM VALUE 'admin' → 'admin_dev'
-- PostgreSQL 14+ (Supabase) mendukung ALTER TYPE RENAME VALUE secara langsung.
-- ============================================================

-- Cek versi PostgreSQL dulu (opsional):
-- SELECT version();

-- Jalankan satu statement ini saja di STEP 1:
ALTER TYPE user_role RENAME VALUE 'admin' TO 'admin_dev';

-- Verifikasi:
-- SELECT enum_range(NULL::user_role);
-- Hasil: {admin_dev, user, dosen, pj_kelas}

-- ============================================================
-- STEP 2: TAMBAH ENUM VALUE BARU
-- WAJIB dijalankan TERPISAH dari statement yang memakai value barunya.
-- Jalankan ketiga statement berikut satu per satu (tidak dalam satu blok DO $$).
-- ============================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin_sfd';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin_le';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin_ls';

-- Verifikasi hasil enum:
-- SELECT enum_range(NULL::user_role);
-- Hasil yang diharapkan: {admin_dev, user, dosen, pj_kelas, admin_sfd, admin_le, admin_ls}

-- Catatan: Untuk menambah role admin gedung baru di masa depan, cukup:
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin_namagedung';
-- Tidak ada perubahan logic utama yang diperlukan.

-- ============================================================
-- STEP 3: PERUBAHAN TABEL BOOKINGS — APPROVAL PARALEL
-- Menambah kolom untuk model dua approver (admin gedung + dosen)
-- ============================================================

-- 3a. Kolom approval per-approver untuk Dosen
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS approval_dosen VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (approval_dosen IN ('pending', 'disetujui', 'ditolak')),
  ADD COLUMN IF NOT EXISTS alasan_tolak_dosen TEXT,
  -- alasan_tolak_dosen: wajib min 10 char (divalidasi di server), NULL jika bukan ditolak
  ADD COLUMN IF NOT EXISTS dosen_responded_at_v2 TIMESTAMP WITH TIME ZONE;
-- Catatan: kolom dosen_responded_at LAMA tetap ada untuk backward-compat.
-- dosen_responded_at_v2 digunakan untuk model paralel baru.

-- 3b. Kolom approval per-approver untuk Admin Gedung
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS approval_admin_gedung VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (approval_admin_gedung IN ('pending', 'disetujui', 'ditolak')),
  ADD COLUMN IF NOT EXISTS alasan_tolak_admin_gedung TEXT,
  -- alasan_tolak_admin_gedung: wajib min 10 char (divalidasi di server), NULL jika bukan ditolak
  ADD COLUMN IF NOT EXISTS admin_gedung_id INT4,         -- FK ke authentication.id
  ADD COLUMN IF NOT EXISTS admin_gedung_responded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS admin_gedung_token_hash TEXT, -- Token untuk link email admin gedung
  ADD COLUMN IF NOT EXISTS admin_gedung_token_expires TIMESTAMP WITH TIME ZONE;

-- 3c. Kolom siapa yang menolak & kapan (untuk notifikasi PJ)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS ditolak_oleh VARCHAR(30),
  -- nilai: 'dosen', 'admin_gedung', atau NULL jika belum ditolak
  ADD COLUMN IF NOT EXISTS ditolak_at TIMESTAMP WITH TIME ZONE;

-- 3d. Update constraint bookings.status untuk model paralel
-- KONFIRMASI: kolom status adalah VARCHAR/TEXT (bukan PostgreSQL ENUM).
-- Dikonfirmasi dari kode: .in('status', [...]) di FrontEnd/src/app/api/bookings/route.ts.
-- Tidak perlu ALTER TYPE — cukup update/tambah CHECK constraint.
--
-- Status baru yang ditambah:
-- 'menunggu_approval' → menggantikan 'menunggu_dosen' (menunggu kedua approver)
-- 'dijadwalkan'       → menggantikan 'dijadwalkan_admin' (keduanya sudah ACC)
-- 'ditolak'           → gabungan ditolak_dosen + ditolak_admin_gedung
-- Status lama ('menunggu_checkin', 'berlangsung', 'selesai', 'hangus') tetap tidak berubah.
-- Status 'hangus' berlaku jika booking tidak di-ACC sampai jam booking sudah lewat
-- (logic hangus dijalankan oleh bookingEvaluator.ts saat booking di-fetch, bukan cron job).

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check CHECK (
    status IN (
      -- Status lama (backward-compat untuk data yang belum dimigrasikan):
      'menunggu_dosen', 'disetujui_dosen', 'dijadwalkan_admin',
      'ditolak_dosen', 'ditolak_admin',
      -- Status baru:
      'menunggu_approval', 'dijadwalkan', 'ditolak',
      -- Status universal (tidak berubah):
      'menunggu_checkin', 'berlangsung', 'selesai', 'hangus'
    )
  );

-- 3e. Migrasi data lama ke model paralel
-- Booking dengan status 'disetujui_dosen', 'dijadwalkan_admin', 'menunggu_checkin', 'berlangsung', 'selesai':
-- → approval_dosen = 'disetujui' (dosen sudah setuju di alur lama)
-- → approval_admin_gedung = 'disetujui' (admin lama sudah setuju, dikonversi ke model baru)
UPDATE bookings
SET
  approval_dosen = 'disetujui',
  approval_admin_gedung = 'disetujui',
  dosen_responded_at_v2 = dosen_responded_at
WHERE status IN ('disetujui_dosen', 'dijadwalkan_admin', 'menunggu_checkin', 'berlangsung', 'selesai');

-- Booking dengan status 'ditolak_dosen':
UPDATE bookings
SET
  approval_dosen = 'ditolak',
  alasan_tolak_dosen = alasan_tolak,
  ditolak_oleh = 'dosen',
  ditolak_at = dosen_responded_at,
  dosen_responded_at_v2 = dosen_responded_at
WHERE status = 'ditolak_dosen';

-- Booking dengan status 'ditolak_admin':
UPDATE bookings
SET
  approval_admin_gedung = 'ditolak',
  alasan_tolak_admin_gedung = alasan_tolak,
  ditolak_oleh = 'admin_gedung',
  ditolak_at = admin_responded_at
WHERE status = 'ditolak_admin';

-- Booking 'menunggu_dosen' → status baru 'menunggu_approval':
UPDATE bookings
SET status = 'menunggu_approval'
WHERE status = 'menunggu_dosen';

-- Booking 'dijadwalkan_admin' → 'dijadwalkan':
UPDATE bookings
SET status = 'dijadwalkan'
WHERE status = 'dijadwalkan_admin';

-- Index untuk kolom baru
CREATE INDEX IF NOT EXISTS idx_bookings_approval_dosen ON bookings(approval_dosen);
CREATE INDEX IF NOT EXISTS idx_bookings_approval_admin_gedung ON bookings(approval_admin_gedung);
CREATE INDEX IF NOT EXISTS idx_bookings_admin_gedung_id ON bookings(admin_gedung_id);

-- ============================================================
-- STEP 4: TABEL RELASI ADMIN GEDUNG → GEDUNG RUANGAN
-- Memetakan admin_sfd/admin_le/admin_ls ke gedung yang mereka kelola.
-- Desain ini memudahkan penambahan role admin gedung baru:
-- cukup INSERT baris baru tanpa perubahan schema.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_gedung_mapping (
  id SERIAL PRIMARY KEY,
  admin_id INT4 NOT NULL,              -- FK ke authentication.id
  gedung_kode VARCHAR(20) NOT NULL,    -- Nilai rooms.gedung (UPPERCASE: 'SFD', 'LE', 'LS')
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_admin_gedung UNIQUE (admin_id, gedung_kode)
);

CREATE INDEX IF NOT EXISTS idx_admin_gedung_mapping_admin_id
  ON public.admin_gedung_mapping(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_gedung_mapping_gedung_kode
  ON public.admin_gedung_mapping(gedung_kode);

COMMENT ON TABLE public.admin_gedung_mapping IS
  'Pemetaan akun admin gedung (admin_sfd/admin_le/admin_ls) ke kode gedung yang dikelola. '
  'Untuk menambah admin gedung baru: cukup INSERT baris baru. '
  'Kolom gedung_kode harus sesuai nilai DISTINCT dari rooms.gedung (jalankan STEP 0 dulu).';

COMMENT ON COLUMN public.admin_gedung_mapping.gedung_kode IS
  'Nilai rooms.gedung yang dikelola admin ini. '
  'Berdasarkan analisis kode: SFD, LE, LS. '
  'Verifikasi dengan: SELECT DISTINCT gedung FROM rooms;';

-- ============================================================
-- STEP 5: UPDATE DATA LAMA
-- ============================================================

-- Semua akun dengan role 'admin' sudah otomatis jadi 'admin_dev'
-- via ALTER TYPE RENAME VALUE di STEP 1. Tidak perlu UPDATE manual.
-- (Jika STEP 1 gagal dan menggunakan cara manual, jalankan:)
-- UPDATE authentication SET role = 'admin_dev' WHERE role = 'admin';

-- ============================================================
-- STEP 6: CEK BENTROK NIP SEBELUM SEEDING (READ-ONLY, WAJIB SEBELUM STEP 7)
-- ============================================================
-- Jalankan query ini dulu, pastikan hasilnya KOSONG (0 baris).
-- Jika ada baris yang muncul, NIP tersebut sudah dipakai — ubah nilai NIP di STEP 7.

SELECT identifier, username, role
FROM authentication
WHERE identifier IN (
  '980101000101',  -- NIP rencana Admin SFD (12 digit)
  '980101000201',  -- NIP rencana Admin LE  (12 digit)
  '980101000301'   -- NIP rencana Admin LS  (12 digit)
);
-- Hasil yang diharapkan: 0 baris (kosong).
-- Jika ada baris, ganti nilai NIP di STEP 7 dengan angka lain yang tidak bentrok.

-- Cek NIM/NIP existing untuk referensi:
-- SELECT identifier, username, role FROM authentication WHERE role IN ('admin_dev', 'admin', 'dosen') ORDER BY role;

-- ============================================================
-- STEP 7: SEED AKUN ADMIN GEDUNG
-- ============================================================
-- Password: 12345678
-- Hash bcrypt dengan cost factor 10 ($2b$10$...)
--
-- CARA GENERATE HASH ASLI (wajib lakukan sebelum jalankan SQL ini):
--
-- Opsi 1 — Go (via BackEnd project):
--   cd BackEnd && go run gen_hash.go
--   (edit gen_hash.go untuk hash string "12345678" jika belum ada)
--
-- Opsi 2 — Node.js:
--   node -e "const b=require('bcryptjs'); b.hash('12345678',10).then(h=>console.log(h))"
--
-- Opsi 3 — Python:
--   python -c "import bcrypt; print(bcrypt.hashpw(b'12345678', bcrypt.gensalt(10)).decode())"
--
-- PENTING: Generate hash BARU untuk setiap akun (salt berbeda-beda).
-- JANGAN pakai hash yang sama untuk 2 akun.
-- JANGAN commit hash ke git.
-- Setelah selesai: rekomendasikan ganti password manual via database sebelum diserahkan ke pemilik akun.
-- (Fitur force-change-password belum ada — lihat PLAN.md Fase 5)

-- NIP: 12 digit acak, unik. Sudah dicek tidak bentrok (STEP 6 wajib dijalankan dulu).
-- Format: 12 digit numerik, tidak boleh sama dengan NIP/NIM yang sudah ada.

-- Akun Admin SFD
INSERT INTO authentication (username, identifier, identifier_type, password, role)
VALUES (
  'Admin SFD',
  '980101000101',                                            -- NIP 12 digit (cek STEP 6 dulu)
  'nip',
  '$2b$10$GANTI_DENGAN_HASH_ASLI_DARI_12345678_UNTUK_SFD',  -- WAJIB DIGANTI sebelum jalankan!
  'admin_sfd'
)
ON CONFLICT (identifier) DO NOTHING;

-- Akun Admin LE
INSERT INTO authentication (username, identifier, identifier_type, password, role)
VALUES (
  'Admin LE',
  '980101000201',                                            -- NIP 12 digit (cek STEP 6 dulu)
  'nip',
  '$2b$10$GANTI_DENGAN_HASH_ASLI_DARI_12345678_UNTUK_LE__',  -- WAJIB DIGANTI sebelum jalankan!
  'admin_le'
)
ON CONFLICT (identifier) DO NOTHING;

-- Akun Admin LS
INSERT INTO authentication (username, identifier, identifier_type, password, role)
VALUES (
  'Admin LS',
  '980101000301',                                            -- NIP 12 digit (cek STEP 6 dulu)
  'nip',
  '$2b$10$GANTI_DENGAN_HASH_ASLI_DARI_12345678_UNTUK_LS__',  -- WAJIB DIGANTI sebelum jalankan!
  'admin_ls'
)
ON CONFLICT (identifier) DO NOTHING;

-- Profil dasar Admin SFD
-- CATATAN: email WAJIB diisi sebelum go-live.
-- Tanpa email di tabel profiles, notifikasi booking ke Admin SFD tidak akan terkirim
-- (mailer.ts mengambil email dari profiles.email via v_user_profiles).
INSERT INTO profiles (user_id, full_name, email)
SELECT a.id, 'Admin SFD', 'admin.sfd@unj.ac.id'   -- GANTI dengan email asli sebelum go-live!
FROM authentication a
WHERE a.identifier = '980101000101'
ON CONFLICT (user_id) DO NOTHING;

-- Profil dasar Admin LE
-- CATATAN: email WAJIB diisi sebelum go-live.
INSERT INTO profiles (user_id, full_name, email)
SELECT a.id, 'Admin LE', 'admin.le@unj.ac.id'     -- GANTI dengan email asli sebelum go-live!
FROM authentication a
WHERE a.identifier = '980101000201'
ON CONFLICT (user_id) DO NOTHING;

-- Profil dasar Admin LS
-- CATATAN: email WAJIB diisi sebelum go-live.
INSERT INTO profiles (user_id, full_name, email)
SELECT a.id, 'Admin LS', 'admin.ls@unj.ac.id'     -- GANTI dengan email asli sebelum go-live!
FROM authentication a
WHERE a.identifier = '980101000301'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- STEP 7b: SEED MAPPING GEDUNG
-- Jalankan SETELAH INSERT akun di atas sudah commit.
-- gedung_kode HARUS sesuai hasil STEP 0 (SELECT DISTINCT gedung FROM rooms).
-- Nilai diasumsikan: 'SFD', 'LE', 'LS' — verifikasi dulu!
-- ============================================================

-- Mapping Admin SFD → gedung SFD
INSERT INTO admin_gedung_mapping (admin_id, gedung_kode)
SELECT a.id, 'SFD'   -- <-- Sesuaikan jika hasil STEP 0 berbeda
FROM authentication a
WHERE a.identifier = '980101000101'
ON CONFLICT (admin_id, gedung_kode) DO NOTHING;

-- Mapping Admin LE → gedung LE
INSERT INTO admin_gedung_mapping (admin_id, gedung_kode)
SELECT a.id, 'LE'    -- <-- Sesuaikan jika hasil STEP 0 berbeda
FROM authentication a
WHERE a.identifier = '980101000201'
ON CONFLICT (admin_id, gedung_kode) DO NOTHING;

-- Mapping Admin LS → gedung LS
INSERT INTO admin_gedung_mapping (admin_id, gedung_kode)
SELECT a.id, 'LS'    -- <-- Sesuaikan jika hasil STEP 0 berbeda
FROM authentication a
WHERE a.identifier = '980101000301'
ON CONFLICT (admin_id, gedung_kode) DO NOTHING;

-- Verifikasi mapping:
-- SELECT a.username, a.role, m.gedung_kode
-- FROM admin_gedung_mapping m
-- JOIN authentication a ON a.id = m.admin_id;

-- ============================================================
-- STEP 8: PERUBAHAN TABEL CHAT ROOMS
-- Menambah dukungan room tipe baru + backfill room PJ-dosen existing
-- ============================================================

-- 8a. Tambah kolom di chat_rooms untuk mendukung multi-pihak
-- CATATAN SCHEMA EXISTING:
-- • user_identifier TIDAK UNIQUE (hanya INDEX biasa — dikonfirmasi dari supabase_schema.sql).
--   Model lama: 1 user = 1 room dengan admin tunggal (GetOrCreateRoom query WHERE user_identifier=$1).
-- • Setelah fitur ini: 1 user bisa punya BANYAK room (dengan berbagai admin/dosen).
--   Uniqueness dijaga oleh partial UNIQUE INDEX baru di STEP 8c (per pasangan participant).
-- • Room lama (participant_b_identifier IS NULL) = room user→admin_dev (default lama).
--   Visibilitas untuk admin_dev: GetRooms query saat ini ambil semua chat_rooms tanpa filter admin_id;
--   setelah fitur ini, GetRooms untuk admin_dev harus difilter:
--   WHERE participant_b_identifier = admin_dev.identifier OR participant_b_identifier IS NULL
--   (IS NULL = room lama yang belum di-backfill, tetap terlihat oleh admin_dev).
--   Admin gedung (sfd/le/ls) hanya melihat room WHERE participant_b_identifier = identifier mereka.
ALTER TABLE chat_rooms
  ADD COLUMN IF NOT EXISTS room_type VARCHAR(30) NOT NULL DEFAULT 'user_to_admin'
    CHECK (room_type IN ('user_to_admin', 'pj_to_dosen', 'general')),
  ADD COLUMN IF NOT EXISTS participant_b_identifier VARCHAR(50),
  -- participant_b: pihak kedua room
  -- • 'user_to_admin': identifier admin yang diajak chat
  -- • 'pj_to_dosen': identifier dosen yang berelasi dengan PJ
  -- • 'general': NULL atau identifier pihak lain
  -- • NULL (room lama): room user→admin_dev, terlihat oleh admin_dev saja
  ADD COLUMN IF NOT EXISTS participant_b_role VARCHAR(20);
  -- role participant_b untuk mempermudah filter di UI

-- Kolom user_identifier yang ada = participant_a (inisiator room)

-- 8b. Room lama (sebelum fitur ini) = user_to_admin, DEFAULT sudah benar.
-- Room lama yang menunjuk ke admin lama (admin_dev) tetap valid karena
-- akun admin lama hanya di-rename role-nya (bukan dihapus).
-- Tidak perlu migrasi room lama.

-- 8c. Constraint unik: satu room per pasangan participant
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_rooms_participants
  ON chat_rooms(user_identifier, COALESCE(participant_b_identifier, ''))
  WHERE room_type IN ('user_to_admin', 'pj_to_dosen');

-- 8d. BACKFILL: Buat room PJ-Dosen untuk semua relasi existing
-- Relasi PJ-dosen ada di tabel official_schedules (pj_id + dosen_id).
-- Mapping ke identifier (NIM/NIP) via tabel authentication.
-- Jalankan query ini untuk membuat room yang belum ada:

INSERT INTO chat_rooms (user_identifier, room_type, participant_b_identifier, participant_b_role, last_message, updated_at, is_marked_unread)
SELECT DISTINCT
  pj.identifier   AS user_identifier,            -- PJ sebagai participant_a
  'pj_to_dosen'   AS room_type,
  dos.identifier  AS participant_b_identifier,   -- Dosen sebagai participant_b
  'dosen'         AS participant_b_role,
  NULL            AS last_message,
  NOW()           AS updated_at,
  FALSE           AS is_marked_unread
FROM official_schedules os
JOIN authentication pj  ON pj.id  = os.pj_id    AND pj.role  = 'pj_kelas'
JOIN authentication dos ON dos.id = os.dosen_id  AND dos.role = 'dosen'
WHERE os.is_active = TRUE
  AND os.pj_id IS NOT NULL
  AND os.dosen_id IS NOT NULL
ON CONFLICT DO NOTHING;
-- ON CONFLICT DO NOTHING bekerja berdasarkan index uq_chat_rooms_participants (STEP 8c).
-- Jika index belum aktif karena backfill sebelum commit, jalankan STEP 8c lebih dulu.

-- Verifikasi backfill:
-- SELECT COUNT(*) FROM chat_rooms WHERE room_type = 'pj_to_dosen';

-- ============================================================
-- STEP 9: UPDATE VIEW & PERMISSIONS
-- ============================================================

-- View v_user_profiles tidak perlu diubah karena sudah select kolom role
-- secara dinamis dari tabel authentication. Role baru otomatis muncul.

-- Re-create view hanya jika ada perubahan kolom (dari profiles_setup.sql):
CREATE OR REPLACE VIEW public.v_user_profiles AS
SELECT
  u.id                                                        AS user_id,
  u.username,
  u.identifier,
  u.identifier_type,
  u.role,
  p.full_name,
  p.email,
  p.phone,
  p.whatsapp,
  p.faculty,
  COALESCE(NULLIF(p.avatar_url, ''), '/LogoSiRuangPolos.png') AS avatar_url,
  (p.avatar_url IS NULL OR p.avatar_url = '')                 AS is_default_avatar
FROM public.authentication u
LEFT JOIN public.profiles p ON p.user_id = u.id;

-- Permissions:
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.admin_gedung_mapping TO anon, authenticated, service_role;

-- RLS tetap DISABLED sesuai konfigurasi existing (project tidak memakai RLS):
ALTER TABLE authentication DISABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE captcha DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_gedung_mapping DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- VERIFIKASI AKHIR
-- ============================================================

-- Cek enum:
-- SELECT enum_range(NULL::user_role);
-- Hasil: {admin_dev, user, dosen, pj_kelas, admin_sfd, admin_le, admin_ls}

-- Cek akun baru:
-- SELECT id, username, identifier, role FROM authentication
-- WHERE role IN ('admin_dev', 'admin_sfd', 'admin_le', 'admin_ls');

-- Cek kolom baru di bookings:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'bookings' AND column_name LIKE '%approval%';

-- Cek mapping gedung:
-- SELECT a.username, a.role, m.gedung_kode
-- FROM admin_gedung_mapping m
-- JOIN authentication a ON a.id = m.admin_id;

-- Cek backfill chat rooms:
-- SELECT COUNT(*) FROM chat_rooms WHERE room_type = 'pj_to_dosen';

-- ============================================================
-- ROLLBACK SCRIPT
-- ============================================================
-- PERINGATAN: Jalankan HANYA jika implementasi gagal dan perlu dikembalikan.
-- Urutan rollback adalah kebalikan dari urutan implementasi.

/*
-- R9: Cabut permission tabel baru
REVOKE ALL ON TABLE public.admin_gedung_mapping FROM anon, authenticated, service_role;

-- R8: Rollback chat_rooms
DROP INDEX IF EXISTS uq_chat_rooms_participants;
DELETE FROM chat_rooms WHERE room_type = 'pj_to_dosen'; -- hapus backfill
ALTER TABLE chat_rooms
  DROP COLUMN IF EXISTS participant_b_role,
  DROP COLUMN IF EXISTS participant_b_identifier,
  DROP COLUMN IF EXISTS room_type;

-- R7: Hapus seed akun admin gedung
DELETE FROM admin_gedung_mapping
WHERE admin_id IN (
  SELECT id FROM authentication WHERE identifier IN ('980101000101', '980101000201', '980101000301')
);
DELETE FROM profiles
WHERE user_id IN (
  SELECT id FROM authentication WHERE identifier IN ('980101000101', '980101000201', '980101000301')
);
DELETE FROM authentication
WHERE identifier IN ('980101000101', '980101000201', '980101000301');

-- R5: Drop tabel mapping gedung
DROP TABLE IF EXISTS public.admin_gedung_mapping;

-- R4: Rollback status bookings (kembalikan sebelum drop kolom!)
UPDATE bookings SET status = 'menunggu_dosen' WHERE status = 'menunggu_approval';
UPDATE bookings SET status = 'dijadwalkan_admin' WHERE status = 'dijadwalkan';

-- R3: Rollback migrasi data kolom approval:
-- (kolom approval_dosen, approval_admin_gedung, dll sudah diisi data baru)
-- Ini TIDAK bisa di-rollback sempurna setelah data ditimpa. Backup dulu sebelum migrasi!

-- R3b: Drop kolom baru di bookings (HATI-HATI: ini menghapus data approval!)
ALTER TABLE bookings
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

-- R2: Drop enum value baru
-- PostgreSQL tidak mendukung DROP VALUE langsung. Perlu recreate enum.
-- Pastikan tidak ada row dengan role admin_sfd/admin_le/admin_ls sebelum ini.
-- (Sudah ditangani di R7)

-- R1: Rename admin_dev kembali ke admin:
ALTER TYPE user_role RENAME VALUE 'admin_dev' TO 'admin';

-- Verifikasi rollback:
-- SELECT enum_range(NULL::user_role);  → harus kembali ke {admin, user, dosen, pj_kelas}
-- SELECT COUNT(*) FROM authentication WHERE role LIKE 'admin_%';  → harus 0
*/

-- ============================================================
-- CATATAN HASH BCRYPT
-- ============================================================
-- Password: 12345678
-- Format yang digunakan project: $2b$10$... (bcrypt, cost 10)
-- (Dilihat dari gen_hash.go dan pattern di supabase_schema.sql: $2a$10$...)
--
-- Langkah generate hash asli:
-- 1. cd ke folder BackEnd/
-- 2. Jalankan: go run gen_hash.go  (edit untuk hash "12345678" jika belum)
-- 3. Jalankan 3x (satu per akun) agar salt berbeda
-- 4. Copy masing-masing hash ke INSERT statement di STEP 7
-- 5. JANGAN commit hash ke git
--
-- Setelah seeding:
-- Rekomendasikan ganti password manual via database sebelum akun diserahkan.
-- Fitur force-change-password belum ada di project — lihat PLAN.md Fase 5.
