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

    // 1. Cari room yang sudah ada
    let { data: room } = await supabaseServer
      .from('chat_rooms')
      .select('id, user_identifier, last_message, updated_at, is_marked_unread')
      .eq('user_identifier', userIdentifier)
      .maybeSingle();

    // 2. Jika belum ada, buatkan room baru
    if (!room) {
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
    }

    // 3. Hitung unread count
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

