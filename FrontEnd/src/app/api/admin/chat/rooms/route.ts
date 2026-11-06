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

    // Ambil semua user info & status active sessions
    const { data: users } = await supabaseServer.from('authentication').select('username, identifier');
    const { data: sessions } = await supabaseServer.from('active_sessions').select('identifier');

    const userMap = new Map((users || []).map((u) => [u.identifier, u.username]));
    const onlineSet = new Set((sessions || []).map((s) => s.identifier));

    const formattedRooms = await Promise.all(
      (rooms || []).map(async (room) => {
        const { count } = await supabaseServer
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', room.id)
          .eq('is_read', false)
          .eq('sender_identifier', room.user_identifier);

        return {
          id: room.id,
          user_identifier: room.user_identifier,
          user_gmail: room.user_identifier, // Fallback alias
          last_message: room.last_message || '',
          updated_at: room.updated_at,
          user_name: userMap.get(room.user_identifier) || room.user_identifier,
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

