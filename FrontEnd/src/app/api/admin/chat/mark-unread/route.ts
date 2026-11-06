import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const roomIdStr = searchParams.get('room_id') || searchParams.get('id') || body.room_id || body.id;
    const roomIdNum = parseInt(roomIdStr || '', 10);

    if (isNaN(roomIdNum)) {
      return NextResponse.json({ error: 'Room ID tidak valid' }, { status: 400 });
    }

    await supabaseServer
      .from('chat_rooms')
      .update({ is_marked_unread: true })
      .eq('id', roomIdNum);

    return NextResponse.json({ message: 'Berhasil ditandai belum dibaca' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

