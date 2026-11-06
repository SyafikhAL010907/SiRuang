import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const roomIds: number[] = body.room_ids || [];

    if (roomIds.length === 0) {
      return NextResponse.json({ error: 'Pilih minimal satu room untuk dihapus' }, { status: 400 });
    }

    // 1. Hapus chat_messages
    await supabaseServer.from('chat_messages').delete().in('room_id', roomIds);

    // 2. Hapus chat_rooms
    await supabaseServer.from('chat_rooms').delete().in('id', roomIds);

    return NextResponse.json({
      message: `Berhasil menghapus ${roomIds.length} room chat!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

