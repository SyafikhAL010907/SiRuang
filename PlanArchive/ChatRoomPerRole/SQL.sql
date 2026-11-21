-- ============================================================
-- SiRuang — SQL Chat Room Per Role  (Revisi 3)
-- File: PlanArchive/ChatRoomPerRole/SQL.sql
-- Dibuat: 2026-11-22  |  Diperbarui: 2026-11-22
-- ============================================================
-- ⚠️  WAJIB: Backup tabel SEBELUM menjalankan blok yang mengubah/menghapus data.
--     Nama backup BERTANGGAL agar tidak bentrok:
--       CREATE TABLE chat_rooms_backup_20261122  AS SELECT * FROM chat_rooms;
--       CREATE TABLE chat_messages_backup_20261122 AS SELECT * FROM chat_messages;
-- ============================================================
-- LEGEND:
--   [SEKARANG]           → aman dijalankan sebelum SQL-2 (enum belum berubah)
--   [SETELAH SQL-2+KODE] → jalankan BERSAMAAN atau SETELAH deploy kode baru
--   [DIAGNOSA]           → SELECT saja, tidak mengubah data
--   [TIDAK BISA ROLLBACK] → operasi destructive, pastikan backup ada
-- ============================================================


-- ============================================================
-- BLOK 0 — DIAGNOSA AWAL [SEKARANG, DIAGNOSA]
-- ============================================================

-- 0a. Cek kondisi enum user_role saat ini
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumsortorder;
-- Diharapkan sekarang: admin, user, dosen, pj_kelas, admin_sfd, admin_le, admin_ls
-- (admin_dev BELUM ada sampai SQL-2 dijalankan)

-- 0b. Cek kolom chat_rooms saat ini
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'chat_rooms' AND table_schema = 'public'
ORDER BY ordinal_position;
-- Kolom baru (room_type, participant_b_identifier, participant_b_role, created_by) BELUM ada

-- 0c. Cek akun AdminDev (tanpa hardcode NIP — lookup dinamis)
SELECT id, identifier, username, role::text
FROM authentication
WHERE role::text IN ('admin', 'admin_dev')
ORDER BY id ASC
LIMIT 3;
-- Catat identifier baris pertama → ini NIP AdminDev yang digunakan di backfill

-- 0d. Cek duplikasi room (user_identifier yang muncul lebih dari 1x)
-- Bukti nyata: user_identifier '1512625039' punya 3 room (id 34 ada pesan, id 37 dan 42 kosong)
SELECT
  user_identifier,
  COUNT(*) AS jumlah_room,
  ARRAY_AGG(id ORDER BY id) AS room_ids,
  ARRAY_AGG(last_message ORDER BY id) AS last_messages
FROM chat_rooms
WHERE user_identifier NOT LIKE 'dosen:%'
GROUP BY user_identifier
HAVING COUNT(*) > 1
ORDER BY jumlah_room DESC;

-- 0e. Cek room dengan format lama 'dosen:NIP:NIM'
-- Bukti nyata: id 35, user_identifier = 'dosen:197805152005011002:1512625039'
SELECT id, user_identifier, last_message, updated_at
FROM chat_rooms
WHERE user_identifier LIKE 'dosen:%'
ORDER BY id;

-- 0f. Cek last_message tidak sesuai pesan terbaru aktual
SELECT
  cr.id AS room_id,
  cr.user_identifier,
  cr.last_message AS last_message_di_rooms,
  cm_last.message AS pesan_terbaru_aktual,
  cm_last.message_type,
  cm_last.created_at
FROM chat_rooms cr
LEFT JOIN LATERAL (
  SELECT message, message_type, created_at
  FROM chat_messages
  WHERE room_id = cr.id
  ORDER BY created_at DESC, id DESC
  LIMIT 1
) cm_last ON TRUE
WHERE cr.last_message IS DISTINCT FROM cm_last.message
  AND cm_last.message IS NOT NULL
ORDER BY cr.id;

-- 0g. Cek jumlah pesan per room (untuk menentukan room yang dipertahankan saat dedup)
SELECT
  cr.user_identifier,
  cr.id AS room_id,
  cr.last_message,
  cr.updated_at,
  COUNT(cm.id) AS jumlah_pesan
FROM chat_rooms cr
LEFT JOIN chat_messages cm ON cm.room_id = cr.id
WHERE cr.user_identifier NOT LIKE 'dosen:%'
GROUP BY cr.user_identifier, cr.id, cr.last_message, cr.updated_at
ORDER BY cr.user_identifier, jumlah_pesan DESC, cr.id ASC;

-- 0h. Cek skema nyata chat_rooms (kolom, tipe, default)
-- Konfirmasi bahwa kolom aktual adalah:
--   id (bigint PK), user_identifier (text), room_name (text),
--   last_message (text), is_marked_unread (bool),
--   created_at (timestamptz), updated_at (timestamptz)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'chat_rooms'
ORDER BY ordinal_position;

-- 0i. Cek skema nyata chat_messages
-- Konfirmasi bahwa kolom aktual adalah:
--   id (bigint PK), room_id (bigint FK), sender_identifier (text),
--   message (text), message_type (text), is_read (bool/int),
--   created_at (timestamptz)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'chat_messages'
ORDER BY ordinal_position;

-- 0j. Cek admin_gedung_mapping (dari SQL-1, sudah ada)
SELECT
  agm.admin_id, agm.gedung_kode,
  a.identifier, a.username, a.role::text
FROM admin_gedung_mapping agm
JOIN authentication a ON a.id = agm.admin_id
ORDER BY agm.gedung_kode;

-- 0k. Cek index course_relations (penting untuk performa backfill)
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'course_relations';


-- ============================================================
-- BLOK 1 — BACKUP BERTANGGAL [SEKARANG, wajib sebelum blok berikutnya]
-- ============================================================
-- Jalankan ini sebelum blok 2, 3, 4, 5.
-- Gunakan tanggal hari ini (ganti YYYYMMDD sesuai tanggal eksekusi).
-- Idempotent: IF NOT EXISTS mencegah error jika diulang.

CREATE TABLE IF NOT EXISTS chat_rooms_backup_20261122 AS SELECT * FROM chat_rooms;
CREATE TABLE IF NOT EXISTS chat_messages_backup_20261122 AS SELECT * FROM chat_messages;

-- Verifikasi:
SELECT 'chat_rooms' AS tabel, COUNT(*) FROM chat_rooms
UNION ALL
SELECT 'chat_rooms_backup_20261122', COUNT(*) FROM chat_rooms_backup_20261122
UNION ALL
SELECT 'chat_messages', COUNT(*) FROM chat_messages
UNION ALL
SELECT 'chat_messages_backup_20261122', COUNT(*) FROM chat_messages_backup_20261122;


-- ============================================================
-- BLOK 1b — INDEX course_relations [SEKARANG, aman]
-- ============================================================
-- Konfirmasi: index yang ada hanya uq_course_relations UNIQUE (dosen_id, pj_id, mata_kuliah, semester)
-- dan course_relations_pkey. Sisi dosen (dosen_id leading) sudah efisien.
-- Sisi PJ (pj_id leading) BELUM ada index → tambahkan untuk performa query dan backfill.

CREATE INDEX IF NOT EXISTS idx_course_relations_pj
  ON public.course_relations (pj_id);

-- Verifikasi:
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'course_relations';


-- ============================================================
-- BLOK 2 — DEDUP ROOM [SEKARANG, TIDAK BISA ROLLBACK tanpa backup]
-- ============================================================
-- Strategi: pertahankan room dengan pesan terbanyak; jika sama, ambil id terkecil.
-- Bukti duplikat: '1512625039' punya room id 34 (ada pesan), 37, 42 (kosong).

-- 2a. Preview: room mana yang akan DIPERTAHANKAN per user_identifier
-- (jalankan dulu, verifikasi hasilnya sebelum lanjut ke 2b)
WITH ranked AS (
  SELECT
    cr.id,
    cr.user_identifier,
    cr.last_message,
    COUNT(cm.id) AS jumlah_pesan,
    ROW_NUMBER() OVER (
      PARTITION BY cr.user_identifier
      ORDER BY COUNT(cm.id) DESC, cr.id ASC
    ) AS rn
  FROM chat_rooms cr
  LEFT JOIN chat_messages cm ON cm.room_id = cr.id
  WHERE cr.user_identifier NOT LIKE 'dosen:%'
  GROUP BY cr.id, cr.user_identifier, cr.last_message
)
SELECT id, user_identifier, jumlah_pesan, last_message,
  CASE WHEN rn = 1 THEN 'PERTAHANKAN' ELSE 'HAPUS' END AS aksi
FROM ranked
WHERE user_identifier IN (
  SELECT user_identifier FROM chat_rooms
  WHERE user_identifier NOT LIKE 'dosen:%'
  GROUP BY user_identifier
  HAVING COUNT(*) > 1
)
ORDER BY user_identifier, rn;

-- 2b. Pindahkan chat_messages dari room yang akan dihapus ke room yang dipertahankan
-- Jalankan HANYA setelah memverifikasi 2a hasilnya benar.
WITH keep_rooms AS (
  SELECT DISTINCT ON (cr.user_identifier)
    cr.id AS keep_id,
    cr.user_identifier
  FROM chat_rooms cr
  LEFT JOIN chat_messages cm ON cm.room_id = cr.id
  WHERE cr.user_identifier NOT LIKE 'dosen:%'
  GROUP BY cr.id, cr.user_identifier
  ORDER BY cr.user_identifier, COUNT(cm.id) DESC, cr.id ASC
)
UPDATE chat_messages msg
SET room_id = k.keep_id
FROM keep_rooms k
JOIN chat_rooms dup ON dup.user_identifier = k.user_identifier AND dup.id != k.keep_id
WHERE msg.room_id = dup.id;

-- Verifikasi: tidak ada pesan yang masih di room duplikat
SELECT cr.id, cr.user_identifier, COUNT(cm.id) AS sisa_pesan
FROM chat_rooms cr
LEFT JOIN chat_messages cm ON cm.room_id = cr.id
WHERE cr.user_identifier NOT LIKE 'dosen:%'
  AND cr.id NOT IN (
    SELECT DISTINCT ON (user_identifier) id
    FROM (
      SELECT cr2.id, cr2.user_identifier, COUNT(cm2.id) AS cnt
      FROM chat_rooms cr2
      LEFT JOIN chat_messages cm2 ON cm2.room_id = cr2.id
      WHERE cr2.user_identifier NOT LIKE 'dosen:%'
      GROUP BY cr2.id, cr2.user_identifier
    ) sub
    ORDER BY user_identifier, cnt DESC, id ASC
  )
GROUP BY cr.id, cr.user_identifier
HAVING COUNT(cm.id) > 0;
-- Harus: 0 baris. Jika ada, jangan lanjutkan ke 2c.

-- 2c. Hapus room duplikat (TIDAK BISA ROLLBACK tanpa backup dari Blok 1)
DELETE FROM chat_rooms
WHERE user_identifier NOT LIKE 'dosen:%'
  AND id NOT IN (
    SELECT DISTINCT ON (user_identifier) id
    FROM (
      SELECT cr.id, cr.user_identifier, COUNT(cm.id) AS cnt
      FROM chat_rooms cr
      LEFT JOIN chat_messages cm ON cm.room_id = cr.id
      WHERE cr.user_identifier NOT LIKE 'dosen:%'
      GROUP BY cr.id, cr.user_identifier
    ) sub
    ORDER BY user_identifier, cnt DESC, id ASC
  );

-- Verifikasi tidak ada duplikat lagi:
SELECT user_identifier, COUNT(*) AS jumlah
FROM chat_rooms
WHERE user_identifier NOT LIKE 'dosen:%'
GROUP BY user_identifier
HAVING COUNT(*) > 1;
-- Harus: 0 baris.


-- ============================================================
-- BLOK 3 — PERBAIKAN last_message [SEKARANG]
-- ============================================================
-- Format preview disesuaikan dengan yang ditulis aplikasi di /api/chat/send/route.ts:
--   baris 40-46: image → '🖼️ Gambar', file → '📄 Dokumen', multi_file → '📎 Lampiran File', text → isi pesan
-- dan Go BroadcastMessage di chat.go:
--   baris 362-364: image → '🖼️ Gambar', file → '📄 Dokumen'

-- 3a. Cek sebelum update (mana yang perlu dikoreksi)
SELECT
  cr.id AS room_id,
  cr.user_identifier,
  cr.last_message AS saat_ini,
  CASE cm.message_type
    WHEN 'image'      THEN '🖼️ Gambar'
    WHEN 'file'       THEN '📄 Dokumen'
    WHEN 'multi_file' THEN '📎 Lampiran File'
    ELSE cm.message
  END AS seharusnya
FROM chat_rooms cr
LEFT JOIN LATERAL (
  SELECT message, message_type, created_at
  FROM chat_messages
  WHERE room_id = cr.id
  ORDER BY created_at DESC, id DESC
  LIMIT 1
) cm ON TRUE
WHERE cm.message IS NOT NULL
ORDER BY cr.id;

-- 3b. Update last_message sesuai pesan terbaru aktual
UPDATE chat_rooms cr
SET
  last_message = CASE sub.message_type
    WHEN 'image'      THEN '🖼️ Gambar'
    WHEN 'file'       THEN '📄 Dokumen'
    WHEN 'multi_file' THEN '📎 Lampiran File'
    ELSE sub.message
  END,
  updated_at = sub.last_at
FROM (
  SELECT DISTINCT ON (cm.room_id)
    cm.room_id,
    cm.message,
    cm.message_type,
    cm.created_at AS last_at
  FROM chat_messages cm
  ORDER BY cm.room_id, cm.created_at DESC, cm.id DESC
) sub
WHERE cr.id = sub.room_id
  AND (
    cr.last_message IS DISTINCT FROM CASE sub.message_type
      WHEN 'image'      THEN '🖼️ Gambar'
      WHEN 'file'       THEN '📄 Dokumen'
      WHEN 'multi_file' THEN '📎 Lampiran File'
      ELSE sub.message
    END
    OR cr.updated_at < sub.last_at
  );

-- Verifikasi:
SELECT cr.id, cr.user_identifier, cr.last_message, cr.updated_at
FROM chat_rooms cr
ORDER BY cr.updated_at DESC
LIMIT 20;


-- ============================================================
-- BLOK 4 — TAMBAH KOLOM BARU KE chat_rooms [SETELAH SQL-2+KODE]
-- ============================================================
-- PRASYARAT: enum user_role sudah mengandung admin_dev (SQL-2 sudah jalan).
-- Kolom ditambahkan satu per satu agar idempotent (IF NOT EXISTS per ALTER).
-- room_type DEFAULT 'user_to_admin' — room lama otomatis bertipe ini.

-- 4a. Tambah kolom room_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='chat_rooms' AND column_name='room_type'
  ) THEN
    ALTER TABLE chat_rooms ADD COLUMN room_type TEXT NOT NULL DEFAULT 'user_to_admin';
  END IF;
END $$;

-- 4b. Tambah CHECK constraint pada room_type (idempotent)
-- Drop constraint lama (dari SQL-2 AddNewRole yang bernama chat_rooms_room_type_check) jika ada
ALTER TABLE chat_rooms DROP CONSTRAINT IF EXISTS chat_rooms_room_type_check;
ALTER TABLE chat_rooms DROP CONSTRAINT IF EXISTS chk_room_type;

ALTER TABLE chat_rooms ADD CONSTRAINT chk_room_type
  CHECK (room_type IN ('user_to_admin', 'pj_to_dosen', 'user_to_building_admin', 'general'));

-- 4c. Tambah kolom participant_b_identifier
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS participant_b_identifier VARCHAR(50);

-- 4d. Tambah kolom participant_b_role
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS participant_b_role TEXT;

-- 4e. Tambah kolom created_by — identifier pembuat room
-- NULL untuk room lama: perlakuan = izinkan akses tanpa pembatasan inisiator.
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);

-- 4f. Index untuk kolom baru
CREATE INDEX IF NOT EXISTS idx_rooms_participant_b   ON chat_rooms(participant_b_identifier);
CREATE INDEX IF NOT EXISTS idx_rooms_room_type       ON chat_rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_rooms_created_by      ON chat_rooms(created_by);

-- Index composite untuk lookup pasangan — query daftar room per user O(log n)
CREATE INDEX IF NOT EXISTS idx_rooms_pair
  ON chat_rooms(user_identifier, participant_b_identifier);

-- Verifikasi kolom ada:
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'chat_rooms' AND table_schema = 'public'
ORDER BY ordinal_position;


-- ============================================================
-- BLOK 5 — BACKFILL participant_b UNTUK ROOM LAMA [SETELAH SQL-2+KODE]
-- ============================================================
-- PRASYARAT: Blok 4 selesai.
-- NIP AdminDev diambil via lookup, bukan hardcode.

-- 5a. Backfill participant_b_identifier untuk room polos (bukan 'dosen:')
-- Semua room polos lama = user → AdminDev.
UPDATE chat_rooms cr
SET
  participant_b_identifier = (
    SELECT a.identifier
    FROM authentication a
    WHERE a.role::text IN ('admin', 'admin_dev')
    ORDER BY a.id ASC
    LIMIT 1
  ),
  participant_b_role = (
    SELECT a.role::text
    FROM authentication a
    WHERE a.role::text IN ('admin', 'admin_dev')
    ORDER BY a.id ASC
    LIMIT 1
  ),
  room_type = 'user_to_admin',
  created_by = cr.user_identifier  -- asumsi: user yang membuat room lama
WHERE cr.participant_b_identifier IS NULL
  AND cr.user_identifier NOT LIKE 'dosen:%';

-- Verifikasi:
SELECT COUNT(*) AS total_backfilled_polos
FROM chat_rooms
WHERE room_type = 'user_to_admin' AND participant_b_identifier IS NOT NULL;


-- ============================================================
-- BLOK 6 — MIGRASI ROOM 'dosen:NIP:NIM' KE MODEL BARU [SETELAH SQL-2+KODE]
-- ============================================================
-- Konversi generik: semua room user_identifier LIKE 'dosen:%'
-- Format: 'dosen:<NIP_DOSEN>:<NIM_PJ>'
-- Hasil: user_identifier = NIM_PJ, participant_b_identifier = NIP_Dosen, room_type = 'pj_to_dosen'
--
-- ⚠️  MASA TRANSISI — Urutan deploy WAJIB:
--   1. Deploy kode baru yang membaca KEDUA format (dual-format support) → verifikasi
--   2. BARU jalankan Blok 6
--   3. Setelah Blok 6 sukses → hapus kode format lama
--
-- Lokasi kode yang membaca format 'dosen:' dan harus diupdate SEBELUM Blok 6:
--   1. FrontEnd/src/app/api/chat/dosen-room/route.ts (baris 60-80, 148-168): roomKey
--   2. FrontEnd/src/app/api/admin/chat/rooms/route.ts (baris 182,261): .not('user_identifier','like','dosen:%')
--   3. FrontEnd/src/lib/sendPush.ts (baris 146-158): room.user_identifier.startsWith('dosen:')
--   4. BackEnd/internal/handlers/chat.go (baris 299,342): SELECT user_identifier FROM chat_rooms (broadcast)

-- 6a. Preview (jalankan dan verifikasi dulu)
SELECT
  id,
  user_identifier AS key_lama,
  SPLIT_PART(user_identifier, ':', 2) AS nip_dosen_akan_jadi_participant_b,
  SPLIT_PART(user_identifier, ':', 3) AS nim_pj_akan_jadi_user_identifier
FROM chat_rooms
WHERE user_identifier LIKE 'dosen:%'
  AND SPLIT_PART(user_identifier, ':', 3) != '';

-- 6b. Cek apakah pasangan (NIM_PJ, NIP_Dosen) sudah ada di model baru (cegah duplikat)
SELECT
  old.id AS id_lama,
  SPLIT_PART(old.user_identifier, ':', 3) AS nim_pj,
  SPLIT_PART(old.user_identifier, ':', 2) AS nip_dosen,
  new_r.id AS id_baru_sudah_ada
FROM chat_rooms old
LEFT JOIN chat_rooms new_r
  ON new_r.user_identifier = SPLIT_PART(old.user_identifier, ':', 3)
  AND new_r.participant_b_identifier = SPLIT_PART(old.user_identifier, ':', 2)
WHERE old.user_identifier LIKE 'dosen:%'
  AND SPLIT_PART(old.user_identifier, ':', 3) != '';
-- Harus: id_baru_sudah_ada = NULL untuk semua baris. Jika tidak NULL = konflik, resolve manual.

-- 6c. Migrasi
-- Jalankan dalam satu statement (autocommit).
-- Jika perlu rollback, restore dari chat_rooms_backup_YYYYMMDD.
UPDATE chat_rooms
SET
  participant_b_identifier = SPLIT_PART(user_identifier, ':', 2),
  participant_b_role       = 'dosen',
  room_type                = 'pj_to_dosen',
  created_by               = SPLIT_PART(user_identifier, ':', 3), -- NIM PJ sebagai pembuat
  user_identifier          = SPLIT_PART(user_identifier, ':', 3)  -- NIM PJ
WHERE user_identifier LIKE 'dosen:%'
  AND SPLIT_PART(user_identifier, ':', 3) != '';

-- Verifikasi setelah migrasi:
SELECT id, user_identifier AS nim_pj, participant_b_identifier AS nip_dosen,
       room_type, created_by
FROM chat_rooms
WHERE room_type = 'pj_to_dosen';
-- Harus ada baris dengan user_identifier = NIM, participant_b = NIP dosen.


-- ============================================================
-- BLOK 7 — UNIQUE INDEX NON-PARTIAL + FUNGSI ATOMIK [SETELAH BLOK 5 DAN 6]
-- ============================================================
-- PRASYARAT: tidak ada duplikat pasangan (user_identifier, participant_b_identifier).
--
-- Index NON-PARTIAL (tanpa WHERE) agar ON CONFLICT bisa memanfaatkannya di upsert.
-- Room lama yang participant_b_identifier NULL → akan error UNIQUE jika ada > 1 NULL.
-- Karena itu, Blok 5 (backfill) WAJIB selesai dulu (semua room punya participant_b).

-- 7a. Cek duplikat pasangan berarah sebelum tambah unique index
SELECT
  user_identifier,
  participant_b_identifier,
  COUNT(*) AS jumlah
FROM chat_rooms
WHERE participant_b_identifier IS NOT NULL
GROUP BY user_identifier, participant_b_identifier
HAVING COUNT(*) > 1;
-- Harus: 0 baris. Jika ada, resolve manual sebelum lanjut.

-- 7b. Cek duplikat pasangan tak berarah (LEAST/GREATEST)
-- Memastikan tidak ada room A→B dan B→A secara bersamaan
SELECT
  LEAST(user_identifier, participant_b_identifier) AS pihak_a,
  GREATEST(user_identifier, participant_b_identifier) AS pihak_b,
  COUNT(*) AS jumlah
FROM chat_rooms
WHERE participant_b_identifier IS NOT NULL
GROUP BY pihak_a, pihak_b
HAVING COUNT(*) > 1;
-- Harus: 0 baris. Jika ada = ada room arah ganda, resolve manual.

-- 7c. Cek apakah ada room dengan participant_b_identifier = NULL
-- (semua harus sudah terisi setelah Blok 5 dan 6)
SELECT id, user_identifier, room_type, participant_b_identifier
FROM chat_rooms
WHERE participant_b_identifier IS NULL;
-- Harus: 0 baris. Jika ada = Blok 5/6 belum sempurna, perbaiki dulu.

-- 7d. Tambah unique index NON-PARTIAL (tanpa WHERE clause)
-- Ini memungkinkan ON CONFLICT (user_identifier, participant_b_identifier) di upsert.
CREATE UNIQUE INDEX IF NOT EXISTS uq_rooms_pair
  ON chat_rooms(user_identifier, participant_b_identifier);

-- Catatan: unique index BERARAH cukup karena arah baku sudah ditetapkan:
--   PJ-Dosen: user_identifier = NIM_PJ (selalu)
--   User-Admin: user_identifier = NIM/NIP user (selalu)
--   AdminDev memulai: target di sisi A, AdminDev di sisi B
-- Room arah sebaliknya TIDAK akan dibuat (divalidasi di backend + fungsi atomik).

-- 7e. Fungsi SQL atomik get_or_create_room
-- Menggantikan SELECT+INSERT yang rawan race condition.
-- Dipakai oleh Go GetOrCreateRoom dan Next.js API routes.
CREATE OR REPLACE FUNCTION public.get_or_create_room(
  p_user_identifier     TEXT,
  p_participant_b       TEXT,
  p_room_type           TEXT DEFAULT 'user_to_admin',
  p_participant_b_role  TEXT DEFAULT NULL,
  p_created_by          TEXT DEFAULT NULL,
  p_room_name           TEXT DEFAULT NULL
)
RETURNS TABLE (
  room_id       BIGINT,
  is_new        BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_id BIGINT;
BEGIN
  -- Coba insert dulu (optimistik — mayoritas kasus room belum ada)
  INSERT INTO chat_rooms (
    user_identifier, participant_b_identifier, room_type,
    participant_b_role, created_by, room_name,
    last_message, is_marked_unread
  )
  VALUES (
    p_user_identifier, p_participant_b, p_room_type,
    p_participant_b_role, p_created_by, p_room_name,
    '', FALSE
  )
  ON CONFLICT (user_identifier, participant_b_identifier) DO NOTHING
  RETURNING id INTO v_room_id;

  IF v_room_id IS NOT NULL THEN
    RETURN QUERY SELECT v_room_id, TRUE;
    RETURN;
  END IF;

  -- Room sudah ada — ambil yang existing
  SELECT id INTO v_room_id
  FROM chat_rooms
  WHERE user_identifier = p_user_identifier
    AND participant_b_identifier = p_participant_b;

  RETURN QUERY SELECT v_room_id, FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_room(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT)
  TO anon, authenticated, service_role;

-- Verifikasi index dan fungsi:
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'chat_rooms';
SELECT proname FROM pg_proc WHERE proname = 'get_or_create_room';


-- ============================================================
-- BLOK 8 — BACKFILL ROOM AdminDev UNTUK user/pj_kelas/dosen [SETELAH SQL-2+KODE]
-- ============================================================
-- PRASYARAT: Blok 4, 5, 6, 7 selesai.
-- Mengisi room AdminDev untuk SEMUA user aktif yang belum punya.
-- Pakai fungsi atomik untuk mencegah duplikat.

-- 8a. Backfill untuk role user, pj_kelas, dosen sekaligus
-- Memanfaatkan ON CONFLICT dari unique index (bukan fungsi, karena bulk insert).
INSERT INTO chat_rooms (
  user_identifier,
  participant_b_identifier,
  participant_b_role,
  room_type,
  created_by,
  last_message,
  is_marked_unread
)
SELECT
  a.identifier                                              AS user_identifier,
  (SELECT identifier FROM authentication
   WHERE role::text IN ('admin','admin_dev')
   ORDER BY id LIMIT 1)                                    AS participant_b_identifier,
  (SELECT role::text FROM authentication
   WHERE role::text IN ('admin','admin_dev')
   ORDER BY id LIMIT 1)                                    AS participant_b_role,
  'user_to_admin'                                          AS room_type,
  a.identifier                                             AS created_by,
  ''                                                       AS last_message,
  FALSE                                                    AS is_marked_unread
FROM authentication a
WHERE a.role::text IN ('user', 'pj_kelas', 'dosen')
  AND NOT EXISTS (
    SELECT 1 FROM chat_rooms cr
    WHERE cr.user_identifier = a.identifier
      AND cr.participant_b_identifier = (
        SELECT identifier FROM authentication
        WHERE role::text IN ('admin','admin_dev')
        ORDER BY id LIMIT 1
      )
  )
ON CONFLICT (user_identifier, participant_b_identifier) DO NOTHING;

-- Verifikasi per role:
SELECT
  a.role::text AS role,
  COUNT(*) AS total_akun,
  SUM(CASE WHEN cr.id IS NOT NULL THEN 1 ELSE 0 END) AS punya_room_admindev
FROM authentication a
LEFT JOIN chat_rooms cr
  ON cr.user_identifier = a.identifier
  AND cr.room_type = 'user_to_admin'
WHERE a.role::text IN ('user', 'pj_kelas', 'dosen')
GROUP BY a.role::text;


-- ============================================================
-- BLOK 9 — BACKFILL ROOM PJ-DOSEN DARI course_relations [SETELAH SQL-2+KODE]
-- ============================================================
-- PRASYARAT: Blok 6, 7 selesai; tabel course_relations ada.
-- Tabel relasi: 'course_relations' (konfirmasi dari dosen-room/route.ts baris 30-32, 125-127).
-- Kolom: pj_id (FK ke authentication.id), dosen_id (FK ke authentication.id).
-- Arah baku: user_identifier = NIM_PJ, participant_b_identifier = NIP_Dosen.
--
-- PENTING: Satu dosen bisa mengampu >1 matkul dengan PJ yang sama.
-- Room PJ-Dosen = satu per pasangan DISTINCT (PJ, Dosen), BUKAN per matkul.
-- Label di UI menampilkan daftar matkul gabungan secara dinamis.

-- 9a. Preview pasangan DISTINCT yang belum punya room
SELECT
  pj.identifier  AS nim_pj,
  dosen.identifier AS nip_dosen,
  STRING_AGG(DISTINCT cr_rel.mata_kuliah, ', ' ORDER BY cr_rel.mata_kuliah) AS matkul_gabungan
FROM course_relations cr_rel
JOIN authentication pj    ON pj.id = cr_rel.pj_id    AND pj.role::text = 'pj_kelas'
JOIN authentication dosen ON dosen.id = cr_rel.dosen_id AND dosen.role::text = 'dosen'
WHERE cr_rel.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM chat_rooms r
    WHERE r.user_identifier = pj.identifier
      AND r.participant_b_identifier = dosen.identifier
      AND r.room_type = 'pj_to_dosen'
  )
GROUP BY pj.identifier, dosen.identifier
LIMIT 20;

-- 9b. Insert room yang belum ada (DISTINCT pasangan, bukan per matkul)
INSERT INTO chat_rooms (
  user_identifier,
  participant_b_identifier,
  participant_b_role,
  room_type,
  created_by,
  last_message,
  is_marked_unread
)
SELECT DISTINCT ON (pj.identifier, dosen.identifier)
  pj.identifier     AS user_identifier,
  dosen.identifier  AS participant_b_identifier,
  'dosen'           AS participant_b_role,
  'pj_to_dosen'     AS room_type,
  pj.identifier     AS created_by,
  ''                AS last_message,
  FALSE             AS is_marked_unread
FROM course_relations cr_rel
JOIN authentication pj    ON pj.id = cr_rel.pj_id    AND pj.role::text = 'pj_kelas'
JOIN authentication dosen ON dosen.id = cr_rel.dosen_id AND dosen.role::text = 'dosen'
WHERE cr_rel.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM chat_rooms r
    WHERE r.user_identifier = pj.identifier
      AND r.participant_b_identifier = dosen.identifier
  )
ON CONFLICT (user_identifier, participant_b_identifier) DO NOTHING;

-- 9c. Verifikasi skala: jumlah room PJ-dosen vs jumlah relasi unik aktif
SELECT
  (SELECT COUNT(DISTINCT (pj_id, dosen_id)) FROM course_relations WHERE is_active = TRUE) AS pasangan_unik_aktif,
  (SELECT COUNT(*) FROM chat_rooms WHERE room_type = 'pj_to_dosen') AS total_room_pj_dosen;


-- ============================================================
-- BLOK 10 — RPC UNREAD + SEARCH [SETELAH SQL-2+KODE]
-- ============================================================

-- 10a. RPC unread count untuk viewer tertentu (mendukung model P2P)
CREATE OR REPLACE FUNCTION public.get_room_unread_counts_for_viewer(
  viewer_identifier TEXT
)
RETURNS TABLE (
  room_id      INTEGER,
  unread_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    cm.room_id,
    COUNT(cm.id) AS unread_count
  FROM public.chat_messages cm
  JOIN public.chat_rooms cr ON cm.room_id = cr.id
  WHERE cm.is_read = false
    AND cm.sender_identifier != viewer_identifier
    AND (
      cr.user_identifier       = viewer_identifier
      OR cr.participant_b_identifier = viewer_identifier
    )
  GROUP BY cm.room_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_room_unread_counts_for_viewer(TEXT)
  TO anon, authenticated, service_role;

-- Pertahankan RPC lama (get_room_unread_counts tanpa parameter) untuk backward compatibility.

-- 10b. RPC search akun admin gedung
-- Pakai authentication + profiles (via v_user_profiles view) + admin_gedung_mapping.
-- Kolom admin_gedung_mapping: admin_id (FK ke authentication.id), gedung_kode.
-- participant_b_identifier admin gedung = identifier (dari authentication), BUKAN username.
-- Tidak tampilkan password/email.
-- Filter role pakai role::text whitelist (aman sebelum SQL-2).
CREATE OR REPLACE FUNCTION public.search_building_admins(
  search_query TEXT
)
RETURNS TABLE (
  user_id      INTEGER,
  full_name    TEXT,
  username     TEXT,
  identifier   TEXT,
  role         TEXT,
  avatar_url   TEXT,
  gedung_kode  TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    v.user_id,
    COALESCE(v.full_name, v.username) AS full_name,
    v.username,
    v.identifier,
    v.role::text AS role,
    COALESCE(v.avatar_url, '') AS avatar_url,
    COALESCE(agm.gedung_kode, '') AS gedung_kode
  FROM v_user_profiles v
  LEFT JOIN admin_gedung_mapping agm ON agm.admin_id = v.user_id
  WHERE v.role::text IN ('admin_sfd', 'admin_le', 'admin_ls')
    AND (
      v.full_name ILIKE '%' || search_query || '%'
      OR v.username ILIKE '%' || search_query || '%'
      OR v.role::text ILIKE '%' || search_query || '%'
      OR agm.gedung_kode ILIKE '%' || search_query || '%'
      -- "admin gedung" juga cocok via role::text ILIKE '%admin%'
    );
$$;

GRANT EXECUTE ON FUNCTION public.search_building_admins(TEXT)
  TO anon, authenticated, service_role;

-- 10c. RPC search semua akun (untuk AdminDev)
-- AdminDev bisa search SIAPA PUN (user, PJ, dosen, admin gedung).
-- Tidak tampilkan password/email. Filter: semua role kecuali admin/admin_dev itu sendiri.
CREATE OR REPLACE FUNCTION public.search_all_users(
  search_query TEXT,
  exclude_identifier TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id      INTEGER,
  full_name    TEXT,
  username     TEXT,
  identifier   TEXT,
  role         TEXT,
  avatar_url   TEXT,
  gedung_kode  TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    v.user_id,
    COALESCE(v.full_name, v.username) AS full_name,
    v.username,
    v.identifier,
    v.role::text AS role,
    COALESCE(v.avatar_url, '') AS avatar_url,
    COALESCE(agm.gedung_kode, '') AS gedung_kode
  FROM v_user_profiles v
  LEFT JOIN admin_gedung_mapping agm ON agm.admin_id = v.user_id
  WHERE (
      v.full_name ILIKE '%' || search_query || '%'
      OR v.username ILIKE '%' || search_query || '%'
      OR v.identifier ILIKE '%' || search_query || '%'
      OR v.role::text ILIKE '%' || search_query || '%'
      OR agm.gedung_kode ILIKE '%' || search_query || '%'
    )
    AND (exclude_identifier IS NULL OR v.identifier != exclude_identifier)
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.search_all_users(TEXT, TEXT)
  TO anon, authenticated, service_role;


-- ============================================================
-- BLOK 11 — ROLLBACK (hanya jika terjadi masalah)
-- ============================================================

-- 11a. Rollback kolom baru (Blok 4)
-- ALTER TABLE chat_rooms DROP COLUMN IF EXISTS room_type;
-- ALTER TABLE chat_rooms DROP COLUMN IF EXISTS participant_b_identifier;
-- ALTER TABLE chat_rooms DROP COLUMN IF EXISTS participant_b_role;
-- ALTER TABLE chat_rooms DROP COLUMN IF EXISTS created_by;
-- ALTER TABLE chat_rooms DROP CONSTRAINT IF EXISTS chk_room_type;

-- 11b. Rollback index (Blok 7)
-- DROP INDEX IF EXISTS uq_rooms_pair;
-- DROP INDEX IF EXISTS idx_rooms_participant_b;
-- DROP INDEX IF EXISTS idx_rooms_room_type;
-- DROP INDEX IF EXISTS idx_rooms_pair;
-- DROP INDEX IF EXISTS idx_rooms_created_by;

-- 11c. Rollback fungsi (Blok 7, 10)
-- DROP FUNCTION IF EXISTS public.get_or_create_room(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);
-- DROP FUNCTION IF EXISTS public.get_room_unread_counts_for_viewer(TEXT);
-- DROP FUNCTION IF EXISTS public.search_building_admins(TEXT);
-- DROP FUNCTION IF EXISTS public.search_all_users(TEXT, TEXT);

-- 11d. Rollback Blok 2 (dedup) dan Blok 6 (migrasi dosen:)
-- TIDAK BISA ROLLBACK otomatis — restore dari backup:
-- DROP TABLE IF EXISTS chat_rooms;
-- ALTER TABLE chat_rooms_backup_20261122 RENAME TO chat_rooms;
-- DROP TABLE IF EXISTS chat_messages;
-- ALTER TABLE chat_messages_backup_20261122 RENAME TO chat_messages;
-- (lalu tambahkan ulang constraints & indexes dari schema asli)

-- 11e. Rollback Blok 3 (last_message)
-- UPDATE chat_rooms cr SET last_message = bk.last_message, updated_at = bk.updated_at
-- FROM chat_rooms_backup_20261122 bk WHERE cr.id = bk.id;
