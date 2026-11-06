import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const roomIdStr = searchParams.get('room_id') || searchParams.get('id') || body.room_id || body.id;
    const roomIdNum = parseInt(roomIdStr || '', 10);
    const user = await getUserFromRequest(request);

    if (isNaN(roomIdNum)) {
      return NextResponse.json({ error: 'Room ID tidak valid' }, { status: 400 });
    }

    const { data: room } = await supabaseServer
      .from('chat_rooms')
      .select('user_identifier')
      .eq('id', roomIdNum)
      .maybeSingle();

    const currentUserId = user?.identifier || room?.user_identifier;

    // User hanya menandai pesan dari Admin / AI sebagai sudah dibaca!
    if (currentUserId) {
      await supabaseServer
        .from('chat_messages')
        .update({ is_read: true })
        .eq('room_id', roomIdNum)
        .neq('sender_identifier', currentUserId);
    }

    await supabaseServer
      .from('chat_rooms')
      .update({ is_marked_unread: false })
      .eq('id', roomIdNum);

    return NextResponse.json({ message: 'Status baca user berhasil diperbarui' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}
