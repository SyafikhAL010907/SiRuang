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

    // Kumpulkan user_identifier unik dari seluruh rooms yang ditemukan
    const userIds = Array.from(new Set((rooms || []).map((r) => r.user_identifier).filter(Boolean)));

    // Ambil data profil & status active sessions HANYA untuk user terkait (bukan SELECT ALL)
    let profiles: any[] = [];
    let sessions: any[] = [];

    if (userIds.length > 0) {
      const [{ data: profData }, { data: sessData }] = await Promise.all([
        supabaseServer
          .from('v_user_profiles')
          .select('identifier, username, full_name, role, avatar_url')
          .in('identifier', userIds),
        supabaseServer
          .from('active_sessions')
          .select('identifier')
          .in('identifier', userIds),
      ]);
      profiles = profData || [];
      sessions = sessData || [];
    }

    const profileMap = new Map(profiles.map((p) => [p.identifier, p]));
    const onlineSet = new Set(sessions.map((s) => s.identifier));

    // Coba ambil unread counts secara agregat via Postgres RPC function (0 N+1 query)
    let unreadMap = new Map<number, number>();
    let usedRpc = false;

    try {
      const { data: unreadData, error: rpcError } = await supabaseServer.rpc('get_room_unread_counts');
      if (rpcError) {
        console.error('[API Admin Rooms] RPC get_room_unread_counts error, falling back to individual queries:', rpcError.message);
      } else if (Array.isArray(unreadData)) {
        unreadMap = new Map(unreadData.map((u: any) => [Number(u.room_id), Number(u.unread_count || 0)]));
        usedRpc = true;
      }
    } catch (err: any) {
      console.error('[API Admin Rooms] Exception calling RPC get_room_unread_counts, falling back:', err);
      usedRpc = false;
    }

    // Jika RPC berhasil, petakan langsung dalam memory O(1)
    if (usedRpc) {
      const formattedRooms = (rooms || []).map((room) => {
        const prof = profileMap.get(room.user_identifier);
        const userName = prof?.full_name || prof?.username || room.user_identifier;
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
          unread_count: unreadMap.get(room.id) || 0,
          is_online: onlineSet.has(room.user_identifier),
          is_marked_unread: room.is_marked_unread,
        };
      });

      return NextResponse.json(formattedRooms);
    }

    // Fallback sementara jika RPC function belum dijalankan di Supabase SQL Editor
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

