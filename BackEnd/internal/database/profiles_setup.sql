-- =============================================================================
-- SIRUANG SUPABASE (POSTGRESQL) - SETUP PROFILE & AVATAR STORAGE (1 MB)
-- =============================================================================
-- Skrip ini menyiapkan:
-- 1. View alias 'users' (jika tabel akun masih bernama 'authentication')
-- 2. Tabel 'profiles' dengan constraint format avatar_url https://
-- 3. View 'v_user_profiles' dengan fallback otomatis ke /LogoSiRuangPolos.png
-- 4. Bucket Storage 'avatars' (Public Read, Maksimal 1 MB, MIME image/png & image/jpeg)
-- 5. Policy Storage RLS agar publik bisa membaca avatar dan upload hanya via server
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Pastikan view/tabel 'users' tersedia
-- (Jika tabel utama Anda bernama 'authentication', skrip ini membuat view alias 'users')
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        EXECUTE 'CREATE OR REPLACE VIEW public.users AS SELECT id, username, identifier, identifier_type, password, role, created_at FROM public.authentication;';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Tabel 'profiles'
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id SERIAL PRIMARY KEY,
    user_id INT4 NOT NULL UNIQUE,
    full_name VARCHAR(150),
    email VARCHAR(150),
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    faculty VARCHAR(150),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index user_id untuk performa query cepat
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Bersihkan data lama yang mungkin berupa blob: atau string kosong
UPDATE public.profiles
SET avatar_url = NULL
WHERE avatar_url IS NULL
   OR avatar_url = ''
   OR avatar_url LIKE 'blob:%';

-- Constraint avatar_url: Hanya boleh NULL atau diawali https:// (URL Storage resmi)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_avatar_url_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_url_check
  CHECK (avatar_url IS NULL OR avatar_url ~ '^https://');

-- -----------------------------------------------------------------------------
-- 3. View 'v_user_profiles'
-- -----------------------------------------------------------------------------
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
FROM public.users u
LEFT JOIN public.profiles p ON p.user_id = u.id;

-- -----------------------------------------------------------------------------
-- 4. Bucket Storage 'avatars' (Batas Maksimal 1 MB)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  1048576,                                   -- Batas 1 MB (1 * 1024 * 1024 bytes)
  ARRAY['image/png', 'image/jpeg']           -- Hanya PNG dan JPG/JPEG
)
ON CONFLICT (id) DO UPDATE
SET public             = EXCLUDED.public,
    file_size_limit    = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- 5. Storage RLS Policy (Public Read, Modifikasi hanya lewat Backend Go Service Role)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
CREATE POLICY "avatars public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- -----------------------------------------------------------------------------
-- 6. Hak Akses (Grant Permissions)
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

