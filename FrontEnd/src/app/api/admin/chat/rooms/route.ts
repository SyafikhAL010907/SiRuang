import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { data: rooms, error } = await supabaseServer
      .from('chat_rooms')
      .select(`
        id,
        user_identifier,
        last_message,
        updated_at,
        is_marked_unread
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Gagal mengambil rooms: ' + error.message }, { status: 500 });
    }

    // Ambil data profil realtime dari view v_user_profiles & status active sessions
    const { data: profiles } = await supabaseServer
      .from('v_user_profiles')
      .select('identifier, username, full_name, role, avatar_url');
    const { data: sessions } = await supabaseServer.from('active_sessions').select('identifier');

    const profileMap = new Map((profiles || []).map((p) => [p.identifier, p]));
    const onlineSet = new Set((sessions || []).map((s) => s.identifier));

    const formattedRooms = await Promise.all(
      (rooms || []).map(async (room) => {
        const { count } = await supabaseServer
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', room.id)
          .eq('is_read', false)
          .eq('sender_identifier', room.user_identifier);

        const prof = profileMap.get(room.user_identifier);
        const userName = prof?.full_name || prof?.username || room.user_identifier;
        // Perspektif Admin: Jika user belum upload foto custom (https://), kosongkan agar tampil PP botak default
        const hasCustomAvatar = prof?.avatar_url && prof.avatar_url.startsWith('https://');
        const avatarUrl = hasCustomAvatar ? prof.avatar_url : '';
        const role = prof?.role || 'user';

        return {
          id: room.id,
          user_identifier: room.user_identifier,
          user_gmail: room.user_identifier, // Fallback alias
          last_message: room.last_message || '',
          updated_at: room.updated_at,
          user_name: userName,
          avatar_url: avatarUrl,
          role: role,
          unread_count: count || 0,
          is_online: onlineSet.has(room.user_identifier),
          is_marked_unread: room.is_marked_unread,
        };
      })
    );

    return NextResponse.json(formattedRooms);
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

