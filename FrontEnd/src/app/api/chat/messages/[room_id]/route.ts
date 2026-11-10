import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ room_id: string }> }
) {
  try {
    const resolvedParams = await params;
    const roomIdStr = resolvedParams?.room_id;
    const roomIdNum = parseInt(roomIdStr || '', 10);

    if (isNaN(roomIdNum)) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(request.url);
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
    console.error('[API Messages] Error caught:', err);
    return NextResponse.json([]);
  }
}
