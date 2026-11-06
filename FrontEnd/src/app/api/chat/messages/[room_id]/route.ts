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
    console.error('[API Messages] Error caught:', err);
    return NextResponse.json([]);
  }
}
