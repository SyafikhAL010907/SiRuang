-- ========================================================
-- RPC FUNCTION: get_room_unread_counts
-- Menghitung pesan unread dari user per room dalam 1 query DB (mengeliminasi N+1 query)
-- Jalankan skrip ini di Supabase SQL Editor (Dashboard Supabase -> SQL Editor -> Run)
-- ========================================================

CREATE OR REPLACE FUNCTION public.get_room_unread_counts()
RETURNS TABLE (
  room_id INTEGER,
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
    AND cm.sender_identifier = cr.user_identifier
  GROUP BY cm.room_id;
$$;

-- Berikan hak akses eksekusi RPC ke peran Supabase
GRANT EXECUTE ON FUNCTION public.get_room_unread_counts() TO anon, authenticated, service_role;

