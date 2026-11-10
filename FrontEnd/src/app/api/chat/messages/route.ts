import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomIdStr = searchParams.get('room_id') || searchParams.get('id');
    const roomIdNum = parseInt(roomIdStr || '', 10);

    if (isNaN(roomIdNum)) {
      return NextResponse.json([]);
    }

    const before = searchParams.get('before');

    let query = supabaseServer
      .from('chat_messages')
      .select('id, room_id, sender_identifier, message, message_type, created_at, is_read')
      .eq('room_id', roomIdNum);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[API Messages] Error:', error.message);
      return NextResponse.json([]);
    }

    // Balik urutan agar ascending (kronologis lama -> baru) untuk frontend
    const reversed = [...(messages || [])].reverse();

    const mapped = reversed.map((m: any) => ({
      ...m,
      sender_gmail: m.sender_identifier,
    }));

    return NextResponse.json(mapped);
  } catch (err: any) {
    return NextResponse.json([]);
  }
}

