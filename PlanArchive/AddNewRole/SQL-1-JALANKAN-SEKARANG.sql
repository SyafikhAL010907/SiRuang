-- ============================================================
-- SQL-1-JALANKAN-SEKARANG.sql
-- SiRuang · Tambah Role Baru: AdminDev, Admin SFD, Admin LE, Admin LS
-- ============================================================
-- TUJUAN: Perubahan database yang AMAN dijalankan sebelum kode diubah.
--         Kolom baru punya DEFAULT sehingga kode lama tidak terganggu.
--         Role lama 'admin' TIDAK diubah di file ini — lihat SQL-2.
--
-- CARA PAKAI (Supabase SQL Editor):
--   Jalankan SETIAP BLOK satu per satu menggunakan tombol "Run".
--   JANGAN paste semua sekaligus — Blok 1 wajib berdiri sendiri.
--
-- URUTAN WAJIB:
--   Blok 1  → ADD ENUM VALUE (jalankan SENDIRIAN, lalu tunggu selesai)
--   Blok 2  → Kolom baru bookings
--   Blok 2b → Constraint status bookings
--   Blok 3  → Tabel admin_gedung_mapping
--   Blok 4  → Cek bentrok NIP (harus 0 baris sebelum lanjut ke Blok 5)
--   Blok 5  → Seed akun Admin SFD / LE / LS
--   Blok 5b → Mapping gedung (hanya SFD aktif)
--   Blok 6  → Verifikasi hasil
-- ============================================================


-- ============================================================
-- BLOK 1: TAMBAH ENUM VALUE (JALANKAN SENDIRIAN — WAJIB TERPISAH)
-- ============================================================
-- ⚠️ PENTING: Paste HANYA blok ini dulu, klik Run, tunggu sukses.
--    PostgreSQL tidak memperbolehkan pemakaian enum value baru
--    dalam transaksi yang sama dengan ADD VALUE-nya.
--    Setelah blok ini sukses, baru paste blok berikutnya.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin_sfd';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin_le';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin_ls';

-- Verifikasi Blok 1:
-- SELECT enum_range(NULL::user_role);
-- Hasil: {..., admin_sfd, admin_le, admin_ls} harus muncul.


-- ============================================================
-- BLOK 2: KOLOM BARU DI TABEL BOOKINGS
-- ============================================================
-- Semua kolom punya DEFAULT. Kode lama yang belum diubah
-- tidak akan error — kolom baru hanya NULL / 'pending'.

-- 2a. Kolom approval Dosen (per-approver baru)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS approval_dosen VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (approval_dosen IN ('pending', 'disetujui', 'ditolak')),
  ADD COLUMN IF NOT EXISTS alasan_tolak_dosen TEXT,
  -- NULL jika bukan ditolak. Validasi min 10 char dilakukan di server/API.
  ADD COLUMN IF NOT EXISTS dosen_responded_at_v2 TIMESTAMPTZ;
-- Kolom dosen_responded_at LAMA tetap ada (backward-compat).

-- 2b. Kolom approval Admin Gedung (per-approver baru)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS approval_admin_gedung VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (approval_admin_gedung IN ('pending', 'disetujui', 'ditolak')),
  ADD COLUMN IF NOT EXISTS alasan_tolak_admin_gedung TEXT,
  -- NULL jika bukan ditolak. Validasi min 10 char dilakukan di server/API.
  ADD COLUMN IF NOT EXISTS admin_gedung_id INT4,
  -- FK ke authentication.id (admin gedung yang menangani)
  ADD COLUMN IF NOT EXISTS admin_gedung_responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_gedung_token_hash TEXT,
  -- Token untuk link email 1-klik ACC/tolak admin gedung
  ADD COLUMN IF NOT EXISTS admin_gedung_token_expires TIMESTAMPTZ;

-- 2c. Kolom siapa yang menolak & kapan (untuk notifikasi PJ)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS ditolak_oleh VARCHAR(30),
  -- nilai: 'dosen', 'admin_gedung', atau NULL
  ADD COLUMN IF NOT EXISTS ditolak_at TIMESTAMPTZ;

-- Index untuk performa query approval
CREATE INDEX IF NOT EXISTS idx_bookings_approval_dosen
  ON bookings(approval_dosen);
CREATE INDEX IF NOT EXISTS idx_bookings_approval_admin_gedung
  ON bookings(approval_admin_gedung);
CREATE INDEX IF NOT EXISTS idx_bookings_admin_gedung_id
  ON bookings(admin_gedung_id);

-- Verifikasi Blok 2:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'bookings'
--   AND column_name IN ('approval_dosen','approval_admin_gedung','ditolak_oleh')
-- ORDER BY column_name;


-- ============================================================
-- BLOK 2b: CONSTRAINT STATUS BOOKINGS
-- ============================================================
-- NAMA CONSTRAINT YANG BENAR: chk_bookings_status
-- (berbeda dari nama yang digunakan di SQL.sql lama — nama itu salah)
--
-- Mencakup SEMUA status yang ada + status baru paralel.
-- Idempotent: DROP IF EXISTS → ADD.

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS chk_bookings_status;

-- Juga drop nama lama jika ada (dari SQL.sql draft sebelumnya):
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_status CHECK (
    status IN (
      -- Status LAMA (tetap valid, kode lama masih pakai ini):
      'menunggu_dosen',
      'disetujui_dosen',
      'ditolak_dosen',
      'dijadwalkan_admin',
      'ditolak_admin',
      'menunggu_checkin',
      'berlangsung',
      'selesai',
      'hangus',
      -- Status pembatalan & kedaluwarsa (existing, dikonfirmasi dari kode):
      'dibatalkan',
      'dibatalkan_prioritas',
      'kedaluwarsa',
      -- Status BARU (model approval paralel):
      'menunggu_approval',
      'dijadwalkan',
      'ditolak'
    )
  );

-- Verifikasi Blok 2b:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'bookings'::regclass AND contype = 'c' AND conname = 'chk_bookings_status';


-- ============================================================
-- BLOK 3: TABEL ADMIN_GEDUNG_MAPPING
-- ============================================================
-- Memetakan akun admin gedung ke kode gedung yang dikelola.
-- Desain generik: menambah gedung baru = INSERT 1 baris, tanpa ubah schema.
-- Implementasi: gedung SFD aktif dulu; LE menyusul (Rollout LE); LS ditunda.

CREATE TABLE IF NOT EXISTS public.admin_gedung_mapping (
  id          SERIAL PRIMARY KEY,
  admin_id    INT4         NOT NULL REFERENCES public.authentication(id) ON DELETE CASCADE,
  gedung_kode VARCHAR(20)  NOT NULL,
  -- Harus sesuai nilai di tabel rooms.gedung (case-sensitive).
  -- Dikonfirmasi dari data nyata: saat ini hanya 'SFD' yang ada di rooms.
  -- Fase Rollout LE: INSERT baris 'LE'. Fase LS: INSERT baris 'LS'.
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_admin_gedung UNIQUE (admin_id, gedung_kode)
);

CREATE INDEX IF NOT EXISTS idx_admin_gedung_mapping_admin_id
  ON public.admin_gedung_mapping(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_gedung_mapping_gedung_kode
  ON public.admin_gedung_mapping(gedung_kode);

COMMENT ON TABLE public.admin_gedung_mapping IS
  'Pemetaan akun admin gedung ke kode gedung. '
  'Generik: menambah gedung baru = 1 INSERT baris, tanpa ubah schema atau kode. '
  'gedung_kode harus sesuai nilai rooms.gedung (case-sensitive). '
  'Data nyata: SELECT DISTINCT gedung FROM rooms → hanya SFD yang ada saat ini.';

GRANT ALL ON TABLE public.admin_gedung_mapping TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE public.admin_gedung_mapping_id_seq TO anon, authenticated, service_role;
ALTER TABLE public.admin_gedung_mapping DISABLE ROW LEVEL SECURITY;

-- Verifikasi Blok 3:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'admin_gedung_mapping';


-- ============================================================
-- BLOK 4: CEK BENTROK NIP (READ-ONLY — HASIL HARUS 0 BARIS)
-- ============================================================
-- Jalankan query ini. Jika ada baris yang muncul → ganti NIP di Blok 5.
-- NIP rencana: 980101000101 (SFD), 980101000201 (LE), 980101000301 (LS)
-- Semua 12 digit, acak, sudah dipilih agar tidak bentrok dengan NIP dosen (18 digit).

SELECT identifier, username, role
FROM public.authentication
WHERE identifier IN (
  '980101000101',
  '980101000201',
  '980101000301'
);
-- ✅ Lanjut ke Blok 5 HANYA jika hasil 0 baris.
-- ❌ Jika ada baris: ganti nilai NIP di Blok 5 dengan angka 12 digit lain.


-- ============================================================
-- BLOK 5: SEED AKUN ADMIN SFD / LE / LS
-- ============================================================
-- Password di-hash langsung oleh pgcrypto — tidak perlu generate manual.
--
-- ⚠️ LANGKAH SEBELUM JALANKAN:
-- 1. Pastikan pgcrypto aktif. Jalankan statement ini dulu (sekali saja):
--    CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
--    (Di Supabase, pgcrypto biasanya sudah aktif. Cek: SELECT extname FROM pg_extension WHERE extname='pgcrypto';)
--
-- 2. Ganti 3 email di bawah ini lalu jalankan seluruh blok sekaligus.

-- ======================================================
-- 👇 EDIT EMAIL DI SINI — 3 baris ini, tidak ada tempat lain
-- ======================================================
DO $$
DECLARE
  email_sfd TEXT := 'admin.sfd@emailkamu.com';   -- 🔴 GANTI: email Admin SFD (untuk testing SFD)
  email_le  TEXT := 'admin.le@emailkamu.com';    -- 🔴 GANTI: email Admin LE (isi dulu, aktif di Rollout LE)
  email_ls  TEXT := 'admin.ls@emailkamu.com';    -- 🔴 GANTI: email Admin LS (isi dulu, aktif di fase LS)
  id_sfd    INT;
  id_le     INT;
  id_ls     INT;
BEGIN
  -- Aktifkan pgcrypto jika belum (aman dijalankan berulang):
  PERFORM extensions.crypt('test', extensions.gen_salt('bf', 4));
  -- Jika baris di atas error "schema extensions does not exist",
  -- ganti extensions.crypt → crypt dan extensions.gen_salt → gen_salt

  -- Seed akun authentication
  INSERT INTO public.authentication (username, identifier, identifier_type, password, role)
  VALUES
    ('Admin SFD', '980101000101', 'nip', extensions.crypt('12345678', extensions.gen_salt('bf', 10)), 'admin_sfd'),
    ('Admin LE',  '980101000201', 'nip', extensions.crypt('12345678', extensions.gen_salt('bf', 10)), 'admin_le'),
    ('Admin LS',  '980101000301', 'nip', extensions.crypt('12345678', extensions.gen_salt('bf', 10)), 'admin_ls')
  ON CONFLICT (identifier) DO NOTHING;

  -- Ambil id masing-masing akun
  SELECT id INTO id_sfd FROM public.authentication WHERE identifier = '980101000101';
  SELECT id INTO id_le  FROM public.authentication WHERE identifier = '980101000201';
  SELECT id INTO id_ls  FROM public.authentication WHERE identifier = '980101000301';

  -- Seed profil Admin SFD
  IF id_sfd IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (id_sfd, 'Admin SFD', email_sfd)
    ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;
  END IF;

  -- Seed profil Admin LE
  IF id_le IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (id_le, 'Admin LE', email_le)
    ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;
  END IF;

  -- Seed profil Admin LS
  IF id_ls IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (id_ls, 'Admin LS', email_ls)
    ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;
  END IF;

  RAISE NOTICE 'Seed selesai. Admin SFD id=%, Admin LE id=%, Admin LS id=%', id_sfd, id_le, id_ls;
END $$;
-- ======================================================

-- Verifikasi Blok 5:
-- SELECT a.username, a.identifier, a.role, p.email
-- FROM public.authentication a
-- JOIN public.profiles p ON p.user_id = a.id
-- WHERE a.role IN ('admin_sfd', 'admin_le', 'admin_ls')
-- ORDER BY a.role;


-- ============================================================
-- BLOK 5b: MAPPING GEDUNG
-- ============================================================
-- Hanya admin_sfd → 'SFD' yang AKTIF sekarang.
-- Data nyata: SELECT DISTINCT gedung FROM rooms → hanya 'SFD'.
-- Baris LE dan LS diaktifkan saat Rollout LE / fase LS.

-- AKTIF: Admin SFD → gedung SFD
INSERT INTO public.admin_gedung_mapping (admin_id, gedung_kode)
SELECT a.id, 'SFD'
FROM public.authentication a
WHERE a.identifier = '980101000101'
ON CONFLICT (admin_id, gedung_kode) DO NOTHING;

-- BELUM AKTIF (Rollout LE): hapus komentar baris di bawah saat fase LE:
-- INSERT INTO public.admin_gedung_mapping (admin_id, gedung_kode)
-- SELECT a.id, 'LE'
-- FROM public.authentication a
-- WHERE a.identifier = '980101000201'
-- ON CONFLICT (admin_id, gedung_kode) DO NOTHING;

-- BELUM AKTIF (Fase LS — ditunda): hapus komentar saat fase LS:
-- INSERT INTO public.admin_gedung_mapping (admin_id, gedung_kode)
-- SELECT a.id, 'LS'
-- FROM public.authentication a
-- WHERE a.identifier = '980101000301'
-- ON CONFLICT (admin_id, gedung_kode) DO NOTHING;

-- Verifikasi Blok 5b:
-- SELECT a.username, a.role, m.gedung_kode
-- FROM public.admin_gedung_mapping m
-- JOIN public.authentication a ON a.id = m.admin_id
-- ORDER BY a.role;
-- Hasil yang diharapkan: hanya 1 baris (Admin SFD → SFD).


-- ============================================================
-- BLOK 6: VERIFIKASI AKHIR (JALANKAN SETELAH SEMUA BLOK)
-- ============================================================

-- 6a. Enum lengkap:
SELECT enum_range(NULL::user_role);
-- Harus muncul: admin, user, dosen, pj_kelas, admin_sfd, admin_le, admin_ls

-- 6b. Kolom baru bookings:
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
  AND column_name IN (
    'approval_dosen', 'alasan_tolak_dosen', 'dosen_responded_at_v2',
    'approval_admin_gedung', 'alasan_tolak_admin_gedung',
    'admin_gedung_id', 'admin_gedung_responded_at',
    'admin_gedung_token_hash', 'admin_gedung_token_expires',
    'ditolak_oleh', 'ditolak_at'
  )
ORDER BY column_name;
-- Harus ada 11 baris.

-- 6c. Constraint status:
SELECT conname, pg_get_constraintdef(oid) AS definisi
FROM pg_constraint
WHERE conrelid = 'bookings'::regclass
  AND contype = 'c'
  AND conname = 'chk_bookings_status';
-- Harus ada 1 baris dengan semua status (termasuk dibatalkan, menunggu_approval, dll).

-- 6d. Tabel mapping:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'admin_gedung_mapping';

-- 6e. Akun dan profil:
SELECT a.username, a.identifier, a.role, p.email
FROM public.authentication a
JOIN public.profiles p ON p.user_id = a.id
WHERE a.role IN ('admin_sfd', 'admin_le', 'admin_ls')
ORDER BY a.role;
-- Harus ada 3 baris dengan email yang sudah diisi.

-- 6f. Mapping aktif:
SELECT a.username, a.role, m.gedung_kode
FROM public.admin_gedung_mapping m
JOIN public.authentication a ON a.id = m.admin_id;
-- Harus ada 1 baris: Admin SFD → SFD.
