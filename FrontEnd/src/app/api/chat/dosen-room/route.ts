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

    // Ambil user dari database authentication
    const { data: dbUser, error: uErr } = await supabaseServer
      .from('authentication')
      .select('id, identifier, role, username')
      .eq('identifier', authUser.identifier)
      .maybeSingle();

    if (uErr || !dbUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // JIKA USER ADALAH PJ KELAS / MAHASISWA:
    if (dbUser.role === 'pj_kelas' || dbUser.role === 'user') {
      // Ambil relasi mata kuliah aktif milik PJ ini
      const { data: relations, error: relErr } = await supabaseServer
        .from('course_relations')
        .select('id, dosen_id, pj_id, mata_kuliah, kelas, jadwal_hari, jadwal_jam')
        .eq('pj_id', dbUser.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (relErr) {
        return NextResponse.json({ error: 'Gagal mengambil relasi dosen: ' + relErr.message }, { status: 500 });
      }

      if (!relations || relations.length === 0) {
        return NextResponse.json({ success: true, rooms: [] });
      }

      // Ambil profil dosen-dosen terkait
      const dosenIds = Array.from(new Set(relations.map((r) => r.dosen_id)));
      const { data: dosens } = await supabaseServer
        .from('v_user_profiles')
        .select('user_id, username, full_name, identifier, avatar_url')
        .in('user_id', dosenIds);

      const dosenMap = new Map<number, any>();
      (dosens || []).forEach((d) => dosenMap.set(d.user_id, d));

      const dosenRooms = [];

      for (const rel of relations) {
        const dosen = dosenMap.get(rel.dosen_id);
        if (!dosen) continue;

        const roomKey = `dosen:${dosen.identifier}:${dbUser.identifier}`;

        // Cari atau buat chat_room untuk pasangan Dosen-PJ ini
        let { data: room } = await supabaseServer
          .from('chat_rooms')
          .select('id, user_identifier, last_message, updated_at, is_marked_unread')
          .eq('user_identifier', roomKey)
          .maybeSingle();

        if (!room) {
          const { data: newRoom } = await supabaseServer
            .from('chat_rooms')
            .insert({
              user_identifier: roomKey,
              last_message: '',
              is_marked_unread: false,
            })
            .select('id, user_identifier, last_message, updated_at, is_marked_unread')
            .single();
          room = newRoom;
        }

        if (room) {
          // Hitung unread count (pesan yang dikirim oleh dosen dan belum dibaca oleh PJ)
          const { count } = await supabaseServer
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .neq('sender_identifier', dbUser.identifier)
            .eq('is_read', false);

          dosenRooms.push({
            room_id: room.id,
            dosen_id: dosen.user_id,
            dosen_name: dosen.full_name || dosen.username,
            dosen_nidn: dosen.identifier,
            dosen_avatar: dosen.avatar_url,
            mata_kuliah: rel.mata_kuliah,
            kelas: rel.kelas || '',
            last_message: room.last_message || 'Belum ada pesan. Klik untuk mulai chat.',
            updated_at: room.updated_at,
            unread_count: count || 0,
          });
        }
      }

      return NextResponse.json({ success: true, rooms: dosenRooms });
    }

    // JIKA USER ADALAH DOSEN: Ambil chat dari PJ Kelas yang berelasi
    if (dbUser.role === 'dosen') {
      const { data: relations } = await supabaseServer
        .from('course_relations')
        .select('id, dosen_id, pj_id, mata_kuliah, kelas')
        .eq('dosen_id', dbUser.id)
        .eq('is_active', true);

      if (!relations || relations.length === 0) {
        return NextResponse.json({ success: true, rooms: [] });
      }

      const pjIds = Array.from(new Set(relations.map((r) => r.pj_id)));
      const { data: pjs } = await supabaseServer
        .from('v_user_profiles')
        .select('user_id, username, full_name, identifier, avatar_url')
        .in('user_id', pjIds);

      const pjMap = new Map<number, any>();
      (pjs || []).forEach((p) => pjMap.set(p.user_id, p));

      const pjRooms = [];

      for (const rel of relations) {
        const pj = pjMap.get(rel.pj_id);
        if (!pj) continue;

        const roomKey = `dosen:${dbUser.identifier}:${pj.identifier}`;

        let { data: room } = await supabaseServer
          .from('chat_rooms')
          .select('id, user_identifier, last_message, updated_at, is_marked_unread')
          .eq('user_identifier', roomKey)
          .maybeSingle();

        if (room) {
          const { count } = await supabaseServer
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .neq('sender_identifier', dbUser.identifier)
            .eq('is_read', false);

          pjRooms.push({
            room_id: room.id,
            pj_id: pj.user_id,
            pj_name: pj.full_name || pj.username,
            pj_nim: pj.identifier,
            pj_avatar: pj.avatar_url,
            mata_kuliah: rel.mata_kuliah,
            kelas: rel.kelas || '',
            last_message: room.last_message || 'Belum ada pesan.',
            updated_at: room.updated_at,
            unread_count: count || 0,
          });
        }
      }

      return NextResponse.json({ success: true, rooms: pjRooms });
    }

    return NextResponse.json({ success: true, rooms: [] });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}
