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

    // 1. Ambil user_identifier pemilik room
    const { data: room } = await supabaseServer
      .from('chat_rooms')
      .select('user_identifier')
      .eq('id', roomIdNum)
      .maybeSingle();

    // 2. Admin hanya membaca pesan yang dikirim oleh USER (Mahasiswa/Tamu)!
    // Pesan yang dikirim oleh Admin/AI TIDAK BOLEH diubah jadi is_read: true di sini,
    // karena hanya boleh ditandai dibaca saat USER yang membuka chatnya!
    if (room?.user_identifier) {
      await supabaseServer
        .from('chat_messages')
        .update({ is_read: true })
        .eq('room_id', roomIdNum)
        .eq('sender_identifier', room.user_identifier);
    }

    await supabaseServer
      .from('chat_rooms')
      .update({ is_marked_unread: false })
      .eq('id', roomIdNum);

    return NextResponse.json({ message: 'Status baca admin berhasil diperbarui' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}
