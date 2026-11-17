-- ========================================================
-- POSTGRESQL FIX MIGRATION: get_room_unread_counts
-- File: get_room_unread_counts_fix.sql
-- Project: SiRuang (UNJ)
-- 
-- Perbaikan:
-- 1. DROP function lama terlebih dahulu (mencegah error "cannot change return type")
-- 2. Dukungan tipe data fleksibel: room_id BIGINT (kompatibel dengan INTEGER/int4 maupun BIGINT/int8)
-- 3. search_path = public untuk keamanan SECURITY DEFINER
-- 4. Hak akses ketat: REVOKE dari PUBLIC/anon/authenticated, HANYA GRANT ke service_role
-- 5. Partial Index optimal untuk query unread messages
-- ========================================================

-- 1. Hapus fungsi lama jika ada
DROP FUNCTION IF EXISTS public.get_room_unread_counts();

-- 2. Buat fungsi dengan tipe data BIGINT, search_path aman, dan logika terverifikasi
CREATE OR REPLACE FUNCTION public.get_room_unread_counts()
RETURNS TABLE (
  room_id BIGINT,
  unread_count BIGINT
) 
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    cm.room_id::BIGINT AS room_id,
    COUNT(cm.id)::BIGINT AS unread_count
  FROM public.chat_messages cm
  JOIN public.chat_rooms cr ON cm.room_id = cr.id
  WHERE cm.is_read = false
    AND cm.sender_identifier = cr.user_identifier
  GROUP BY cm.room_id;
$$;

-- 3. Batasi izin eksekusi HANYA untuk service_role (karena dipanggil via Next.js backend)
REVOKE ALL ON FUNCTION public.get_room_unread_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_unread_counts() TO service_role;

-- 4. Index Parsial untuk kecepatan query (hanya mengindeks pesan yang belum dibaca)
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread_user 
ON public.chat_messages (room_id, sender_identifier) 
WHERE is_read = false;

-- ========================================================
-- QUERY TESTING & VERIFIKASI (Jalankan setelah skrip di atas):
-- 
-- 1. Cek tipe kolom asli di tabel:
--    SELECT column_name, data_type 
--    FROM information_schema.columns 
--    WHERE table_name IN ('chat_rooms', 'chat_messages') 
--      AND column_name IN ('id', 'room_id', 'sender_identifier', 'is_read');
-- 
-- 2. Uji eksekusi fungsi:
--    SELECT * FROM public.get_room_unread_counts();
-- ========================================================

