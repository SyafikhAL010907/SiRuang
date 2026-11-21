import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const authUser = await getUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: Sesi login tidak valid' }, { status: 401 });
    }

    const body = await request.json();
    const targetIdentifier = body.target_identifier;
    let roomType = body.room_type || 'user_to_building_admin';

    if (!targetIdentifier) {
      return NextResponse.json({ error: 'target_identifier wajib diisi' }, { status: 400 });
    }

    // Ambil data aktor dan target
    const [{ data: actorAuth }, { data: targetAuth }] = await Promise.all([
      supabaseServer
        .from('authentication')
        .select('identifier, role')
        .eq('identifier', authUser.identifier)
        .maybeSingle(),
      supabaseServer
        .from('authentication')
        .select('identifier, role')
        .eq('identifier', targetIdentifier)
        .maybeSingle(),
    ]);

    if (!targetAuth) {
      return NextResponse.json({ error: 'Pengguna target tidak ditemukan' }, { status: 404 });
    }

    const actorRole = (actorAuth?.role || authUser.role || '').toLowerCase();
    const targetRole = (targetAuth.role || '').toLowerCase();
    const isBuildingAdmin = (r: string) => ['admin_sfd', 'admin_le', 'admin_ls'].includes(r);

    // Tentukan arah baku dan room_type:
    // Sisi B selalu AdminDev jika ada AdminDev yang terlibat
    // Sisi B selalu Admin Gedung jika lawan bicaranya user biasa, PJ, atau Dosen
    let sideA = authUser.identifier;
    let sideB = targetIdentifier;
    let sideBRole = targetRole;

    const isAdminDev = (r: string) => ['admin', 'admin_dev'].includes(r);

    if (isAdminDev(actorRole)) {
      // AdminDev yang memulai chat ke siapa pun: target di sisi A, AdminDev di sisi B
      sideA = targetIdentifier;
      sideB = authUser.identifier;
      sideBRole = actorRole;
      roomType = isBuildingAdmin(targetRole) ? 'user_to_building_admin' : 'user_to_admin';
    } else if (isAdminDev(targetRole)) {
      // User/PJ/Dosen/AdminGedung chat ke AdminDev
      sideA = authUser.identifier;
      sideB = targetIdentifier;
      sideBRole = targetRole;
      roomType = isBuildingAdmin(actorRole) ? 'user_to_building_admin' : 'user_to_admin';
    } else if (isBuildingAdmin(targetRole)) {
      // User/PJ/Dosen chat ke Admin Gedung
      sideA = authUser.identifier;
      sideB = targetIdentifier;
      sideBRole = targetRole;
      roomType = 'user_to_building_admin';
    } else if (isBuildingAdmin(actorRole)) {
      // Admin Gedung chat ke PJ/User
      sideA = targetIdentifier;
      sideB = authUser.identifier;
      sideBRole = actorRole;
      roomType = 'user_to_building_admin';
    }

    // Cek apakah room sudah ada di DB (dua arah cek)
    const { data: existingRoom } = await supabaseServer
      .from('chat_rooms')
      .select('id')
      .or(`and(user_identifier.eq.${sideA},participant_b_identifier.eq.${sideB}),and(user_identifier.eq.${sideB},participant_b_identifier.eq.${sideA})`)
      .maybeSingle();

    if (existingRoom?.id) {
      return NextResponse.json({
        success: true,
        room_id: existingRoom.id,
        is_new: false,
      });
    }

    // Coba via RPC get_or_create_room atomik dulu
    const { data: rpcResult, error: rpcErr } = await supabaseServer.rpc('get_or_create_room', {
      p_user_identifier: sideA,
      p_participant_b: sideB,
      p_room_type: roomType,
      p_participant_b_role: sideBRole,
      p_created_by: authUser.identifier,
    });

    if (!rpcErr && rpcResult && rpcResult.length > 0 && rpcResult[0].room_id) {
      return NextResponse.json({
        success: true,
        room_id: rpcResult[0].room_id,
        is_new: rpcResult[0].is_new,
      });
    }

    // Fallback direct insert jika RPC error
    const { data: insertedRoom, error: insErr } = await supabaseServer
      .from('chat_rooms')
      .insert({
        user_identifier: sideA,
        participant_b_identifier: sideB,
        participant_b_role: sideBRole,
        room_type: roomType,
        created_by: authUser.identifier,
        last_message: '',
        is_marked_unread: false,
      })
      .select('id')
      .maybeSingle();

    if (insErr) {
      console.error('[OpenRoom Error]:', insErr);
      return NextResponse.json({ error: 'Gagal membuka room: ' + insErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      room_id: insertedRoom?.id,
      is_new: true,
    });
  } catch (err: any) {
    console.error('[OpenRoom Catch]:', err);
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

