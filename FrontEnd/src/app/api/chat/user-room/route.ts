import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    const userIdentifier = searchParams.get('identifier') || searchParams.get('gmail') || user?.identifier;

    if (!userIdentifier) {
      return NextResponse.json({ error: 'Identifier tidak boleh kosong' }, { status: 400 });
    }

    // Ambil identifier AdminDev secara dinamis (tanpa hardcode)
    const { data: adminDev } = await supabaseServer
      .from('authentication')
      .select('identifier, role')
      .in('role', ['admin', 'admin_dev'] as any)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    const adminDevIdentifier = adminDev?.identifier || '198501012010121001';

    // 1. Cari room yang sudah ada dulu (prioritaskan room_type user_to_admin di kedua sisi)
    let { data: room, error: findError } = await supabaseServer
      .from('chat_rooms')
      .select('id, user_identifier, participant_b_identifier, last_message, updated_at, is_marked_unread')
      .or(`and(user_identifier.eq.${userIdentifier},room_type.eq.user_to_admin),and(participant_b_identifier.eq.${userIdentifier},room_type.eq.user_to_admin)`)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    // Fallback: cari berdasarkan identifier saja jika belum ada room_type atau bertipe legacy
    if (!room) {
      const { data: fallbackRoom } = await supabaseServer
        .from('chat_rooms')
        .select('id, user_identifier, participant_b_identifier, last_message, updated_at, is_marked_unread')
        .or(`user_identifier.eq.${userIdentifier},participant_b_identifier.eq.${userIdentifier}`)
        .is('room_type', null)
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();
      room = fallbackRoom;
    }

    // 2. Jika room belum ada sama sekali, baru panggil get_or_create_room atau insert
    if (!room) {
      const { data: rpcResult, error: rpcError } = await supabaseServer.rpc('get_or_create_room', {
        p_user_identifier: userIdentifier,
        p_participant_b: adminDevIdentifier,
        p_room_type: 'user_to_admin',
        p_participant_b_role: adminDev?.role || 'admin',
        p_created_by: userIdentifier,
      });

      let roomId: number | null = null;
      if (!rpcError && rpcResult && rpcResult.length > 0) {
        roomId = rpcResult[0].room_id;
      }

      if (roomId) {
        const { data: fetchedRoom } = await supabaseServer
          .from('chat_rooms')
          .select('id, user_identifier, participant_b_identifier, last_message, updated_at, is_marked_unread')
          .eq('id', roomId)
          .maybeSingle();
        room = fetchedRoom;
      } else {
        const { data: newRoom, error: createError } = await supabaseServer
          .from('chat_rooms')
          .insert({
            user_identifier: userIdentifier,
            participant_b_identifier: adminDevIdentifier,
            participant_b_role: adminDev?.role || 'admin',
            room_type: 'user_to_admin',
            created_by: userIdentifier,
            last_message: '',
            is_marked_unread: false,
          })
          .select('id, user_identifier, participant_b_identifier, last_message, updated_at, is_marked_unread')
          .maybeSingle();

        if (createError) {
          console.error('[UserRoom CreateError]:', createError);
          return NextResponse.json({ error: 'Gagal membuat room chat: ' + createError.message }, { status: 500 });
        }
        room = newRoom;
      }
    }

    if (!room) {
      return NextResponse.json({ error: 'Room chat tidak ditemukan' }, { status: 404 });
    }

    // 3. Hitung unread count
    const { count } = await supabaseServer
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', room.id)
      .neq('sender_identifier', userIdentifier)
      .eq('is_read', false);

    return NextResponse.json({
      room: room,
      ...room,
      unread_count: count || 0,
      user_gmail: room.user_identifier, // Fallback alias
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

