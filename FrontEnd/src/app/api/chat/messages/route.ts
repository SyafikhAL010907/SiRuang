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

    const { data: messages, error } = await supabaseServer
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomIdNum)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[API Messages] Error:', error.message);
      return NextResponse.json([]);
    }

    const mapped = (messages || []).map((m: any) => ({
      ...m,
      sender_gmail: m.sender_identifier,
    }));

    return NextResponse.json(mapped);
  } catch (err: any) {
    return NextResponse.json([]);
  }
}

