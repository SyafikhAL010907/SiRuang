import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { checkNewChatColumns } from '@/lib/chatColumns';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    const userIdentifier = searchParams.get('identifier') || searchParams.get('gmail') || user?.identifier;
    const adminIdentifier = searchParams.get('admin_identifier') || searchParams.get('participant_b_identifier');

    if (!userIdentifier) {
      return NextResponse.json({ error: 'Identifier tidak boleh kosong' }, { status: 400 });
    }

    const hasCols = await checkNewChatColumns();

    let room: any = null;

    if (hasCols && adminIdentifier) {
      // Model baru: cari room per pasangan user_identifier + participant_b_identifier
      const { data: existingRoom } = await supabaseServer
        .from('chat_rooms')
        .select('id, user_identifier, room_type, participant_b_identifier, participant_b_role, last_message, updated_at, is_marked_unread')
        .eq('user_identifier', userIdentifier)
        .eq('participant_b_identifier', adminIdentifier)
        .maybeSingle();

      if (existingRoom) {
        room = existingRoom;
      } else {
        // Ambil role admin
        const { data: adm } = await supabaseServer
          .from('authentication')
          .select('role')
          .eq('identifier', adminIdentifier)
          .maybeSingle();

        const { data: newRoom, error: createError } = await supabaseServer
          .from('chat_rooms')
          .insert({
            user_identifier: userIdentifier,
            room_type: 'user_to_admin',
            participant_b_identifier: adminIdentifier,
            participant_b_role: adm?.role || 'admin',
            last_message: '',
            is_marked_unread: false,
          })
          .select('id, user_identifier, room_type, participant_b_identifier, participant_b_role, last_message, updated_at, is_marked_unread')
          .single();

        if (createError) {
          return NextResponse.json({ error: 'Gagal membuat room chat: ' + createError.message }, { status: 500 });
        }
        room = newRoom;
      }
    } else {
      // Fallback model lama: 1 user = 1 room
      let { data: existingRoom } = await supabaseServer
        .from('chat_rooms')
        .select('id, user_identifier, last_message, updated_at, is_marked_unread')
        .eq('user_identifier', userIdentifier)
        .maybeSingle();

      if (!existingRoom) {
        const { data: newRoom, error: createError } = await supabaseServer
          .from('chat_rooms')
          .insert({
            user_identifier: userIdentifier,
            last_message: '',
            is_marked_unread: false,
          })
          .select('id, user_identifier, last_message, updated_at, is_marked_unread')
          .single();

        if (createError) {
          return NextResponse.json({ error: 'Gagal membuat room chat: ' + createError.message }, { status: 500 });
        }
        room = newRoom;
      } else {
        room = existingRoom;
      }
    }

    // Hitung unread count
    const { count } = await supabaseServer
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', room.id)
      .neq('sender_identifier', userIdentifier)
      .eq('is_read', false);

    return NextResponse.json({
      ...room,
      unread_count: count || 0,
      user_gmail: room.user_identifier, // Fallback alias
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

