import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const authUser = await getUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: Sesi login tidak valid' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const identifier = searchParams.get('identifier') || authUser.identifier;

    // Ambil semua room yang melibatkan user ini
    // Bisa sebagai sisi A (user_identifier) atau sisi B (participant_b_identifier)
    const { data: rawRooms, error } = await supabaseServer
      .from('chat_rooms')
      .select('id, user_identifier, participant_b_identifier, participant_b_role, room_type, created_by, last_message, updated_at, is_marked_unread')
      .or(`user_identifier.eq.${identifier},participant_b_identifier.eq.${identifier}`)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Gagal memuat rooms: ' + error.message }, { status: 500 });
    }

    const rooms = rawRooms || [];

    // Ambil info lawan bicara untuk setiap room
    const partnerIdentifiers = Array.from(
      new Set(
        rooms.map((r) =>
          r.user_identifier === identifier ? r.participant_b_identifier : r.user_identifier
        ).filter(Boolean)
      )
    );

    let partnerProfiles: any[] = [];
    if (partnerIdentifiers.length > 0) {
      const { data: profs } = await supabaseServer
        .from('v_user_profiles')
        .select('identifier, username, full_name, role, avatar_url')
        .in('identifier', partnerIdentifiers);
      partnerProfiles = profs || [];
    }

    const profileMap = new Map(partnerProfiles.map((p) => [p.identifier, p]));

    // Format room list dengan unread count per room
    const formattedRooms = await Promise.all(
      rooms.map(async (room) => {
        const partnerId = room.user_identifier === identifier ? room.participant_b_identifier : room.user_identifier;
        const prof = profileMap.get(partnerId);

        const { count } = await supabaseServer
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', room.id)
          .neq('sender_identifier', identifier)
          .eq('is_read', false);

        return {
          room_id: room.id,
          user_identifier: room.user_identifier,
          participant_b_identifier: room.participant_b_identifier,
          partner_identifier: partnerId,
          partner_name: prof?.full_name || prof?.username || partnerId,
          partner_role: prof?.role || room.participant_b_role || 'admin',
          partner_avatar: prof?.avatar_url || '',
          room_type: room.room_type,
          last_message: room.last_message || '',
          updated_at: room.updated_at,
          unread_count: count || 0,
        };
      })
    );

    return NextResponse.json({ success: true, rooms: formattedRooms });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

