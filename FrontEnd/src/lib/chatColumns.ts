import { supabaseServer } from '@/lib/supabaseServer';

let cachedHasNewChatColumns: boolean | null = null;
let lastCheckTime = 0;

/**
 * Mendeteksi apakah kolom baru chat_rooms (room_type, participant_b_identifier, participant_b_role)
 * sudah tersedia di database (SQL-2 Blok D).
 * Hasil di-cache dalam memori selama 15 detik jika false, atau permanen jika true.
 */
export async function checkNewChatColumns(): Promise<boolean> {
  const now = Date.now();
  if (cachedHasNewChatColumns === true) return true;
  if (cachedHasNewChatColumns !== null && now - lastCheckTime < 15000) {
    return cachedHasNewChatColumns;
  }
  try {
    const { error } = await supabaseServer
      .from('chat_rooms')
      .select('participant_b_identifier')
      .limit(1);

    if (!error) {
      cachedHasNewChatColumns = true;
      return true;
    }
    cachedHasNewChatColumns = false;
    lastCheckTime = now;
    return false;
  } catch {
    cachedHasNewChatColumns = false;
    lastCheckTime = now;
    return false;
  }
}

