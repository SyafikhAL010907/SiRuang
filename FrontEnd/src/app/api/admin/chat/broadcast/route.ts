import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  try {
    const req = await request.json();
    const adminIdentifier = req.admin_identifier || req.admin_gmail || 'admin';
    const message = req.message?.trim() || '';
    const messageType = req.message_type || 'text';
    const fileData = req.file_data || '';
    const fileType = req.file_type || 'file';
    const targetType = req.target_type || 'waiting_room';
    let targetIdentifiers: string[] = req.target_identifiers || req.target_gmails || [];

    if (targetType === 'waiting_room') {
      const { data: rooms } = await supabaseServer.from('chat_rooms').select('user_identifier');
      targetIdentifiers = (rooms || []).map((r) => r.user_identifier);
    } else if (targetType === 'all_users') {
      const { data: users } = await supabaseServer
        .from('authentication')
        .select('identifier')
        .neq('role', 'admin');
      targetIdentifiers = (users || []).map((u) => u.identifier);
    }

    // Filter unique target identifiers
    targetIdentifiers = Array.from(new Set(targetIdentifiers.filter(Boolean)));

    if (targetIdentifiers.length === 0) {
      return NextResponse.json({ message: 'Tidak ada target user untuk dikirimi pesan' });
    }

    // Format pesan final
    let finalMsg = message;
    let finalType = messageType;
    if (fileData && message) {
      finalMsg = `${fileData}|${message}`;
      finalType = fileType;
    } else if (fileData) {
      finalMsg = fileData;
      finalType = fileType;
    }

    // 1. Ambil semua room yang sudah ada sekaligus (1 query batch)
    const { data: existingRooms } = await supabaseServer
      .from('chat_rooms')
      .select('id, user_identifier')
      .in('user_identifier', targetIdentifiers);

    const roomMap = new Map((existingRooms || []).map((r) => [r.user_identifier, r.id]));
    const missingUsers = targetIdentifiers.filter((uid) => !roomMap.has(uid));

    // 2. Buat room baru secara bulk untuk user yang belum punya room (1 query batch)
    if (missingUsers.length > 0) {
      const { data: createdRooms } = await supabaseServer
        .from('chat_rooms')
        .insert(missingUsers.map((uid) => ({ user_identifier: uid, last_message: '' })))
        .select('id, user_identifier');

      (createdRooms || []).forEach((r) => roomMap.set(r.user_identifier, r.id));
    }

    // 3. Siapkan semua pesan untuk di-insert sekaligus (1 query batch)
    const messagesToInsert = [];
    const roomIdsToUpdate: number[] = [];

    for (const userId of targetIdentifiers) {
      const roomId = roomMap.get(userId);
      if (!roomId) continue;
      messagesToInsert.push({
        room_id: roomId,
        sender_identifier: adminIdentifier,
        message: finalMsg,
        message_type: finalType,
        is_read: false,
      });
      roomIdsToUpdate.push(roomId);
    }

    if (messagesToInsert.length > 0) {
      await supabaseServer.from('chat_messages').insert(messagesToInsert);

      // 4. Update last_message semua room sekaligus (1 query batch)
      await supabaseServer
        .from('chat_rooms')
        .update({
          last_message: finalMsg.substring(0, 100),
          updated_at: new Date().toISOString(),
        })
        .in('id', roomIdsToUpdate);
    }

    return NextResponse.json({
      message: `Berhasil mengirim pesan ke ${targetIdentifiers.length} user!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}
