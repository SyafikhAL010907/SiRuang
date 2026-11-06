import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';

export async function POST(
  request: Request,
  context: { params: Promise<{ room_id: string }> | { room_id: string } }
) {
  try {
    const rawParams = await Promise.resolve(context?.params);
    const roomIdStr = rawParams?.room_id;
    const roomIdNum = parseInt(roomIdStr || '', 10);
    const user = await getUserFromRequest(request);

    if (isNaN(roomIdNum)) {
      return NextResponse.json({ error: 'Room ID tidak valid' }, { status: 400 });
    }

    if (user) {
      await supabaseServer
        .from('chat_messages')
        .update({ is_read: true })
        .eq('room_id', roomIdNum)
        .neq('sender_identifier', user.identifier);
    }

    await supabaseServer
      .from('chat_rooms')
      .update({ is_marked_unread: false })
      .eq('id', roomIdNum);

    return NextResponse.json({ message: 'Status baca berhasil diperbarui' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}
