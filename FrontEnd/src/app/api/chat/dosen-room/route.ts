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

      // Kelompokkan per pasangan unik (dosen_id) agar 1 dosen punya 1 room
      // dengan label mata kuliah dan kelas yang digabungkan (DISTINCT)
      const relationsByDosen = new Map<number, {
        dosen: any;
        mataKuliahList: string[];
        kelasList: string[];
      }>();

      for (const rel of relations) {
        const dosen = dosenMap.get(rel.dosen_id);
        if (!dosen) continue;

        if (!relationsByDosen.has(rel.dosen_id)) {
          relationsByDosen.set(rel.dosen_id, {
            dosen,
            mataKuliahList: [rel.mata_kuliah],
            kelasList: rel.kelas ? [rel.kelas] : [],
          });
        } else {
          const entry = relationsByDosen.get(rel.dosen_id)!;
          if (!entry.mataKuliahList.includes(rel.mata_kuliah)) {
            entry.mataKuliahList.push(rel.mata_kuliah);
          }
          if (rel.kelas && !entry.kelasList.includes(rel.kelas)) {
            entry.kelasList.push(rel.kelas);
          }
        }
      }

      const dosenRooms = [];

      for (const [dosenId, relData] of Array.from(relationsByDosen.entries())) {
        const { dosen, mataKuliahList, kelasList } = relData;
        const mataKuliahLabel = mataKuliahList.join(', ');
        const kelasLabel = kelasList.join(', ');

        const legacyRoomKey = `dosen:${dosen.identifier}:${dbUser.identifier}`;

        // Dukungan DUAL-FORMAT: Cek format baru dulu (pj_to_dosen), jika belum ada cek format legacy
        let { data: room } = await supabaseServer
          .from('chat_rooms')
          .select('id, user_identifier, last_message, updated_at, is_marked_unread')
          .eq('user_identifier', dbUser.identifier)
          .eq('participant_b_identifier', dosen.identifier)
          .eq('room_type', 'pj_to_dosen')
          .maybeSingle();

        if (!room) {
          const { data: legacyRoom } = await supabaseServer
            .from('chat_rooms')
            .select('id, user_identifier, last_message, updated_at, is_marked_unread')
            .eq('user_identifier', legacyRoomKey)
            .maybeSingle();
          room = legacyRoom;
        }

        // Jika room belum ada sama sekali, buat baru dengan model baru (jika kolom sudah ada)
        // atau fallback ke model lama jika kolom belum ada
        if (!room) {
          const { data: newRoom, error: insErr } = await supabaseServer
            .from('chat_rooms')
            .insert({
              user_identifier: dbUser.identifier,
              participant_b_identifier: dosen.identifier,
              participant_b_role: 'dosen',
              room_type: 'pj_to_dosen',
              created_by: dbUser.identifier,
              last_message: '',
              is_marked_unread: false,
            })
            .select('id, user_identifier, last_message, updated_at, is_marked_unread')
            .maybeSingle();

          if (insErr) {
            // Fallback ke format legacy jika kolom baru belum ada (misal Blok 4 belum jalan)
            const { data: fallbackRoom } = await supabaseServer
              .from('chat_rooms')
              .insert({
                user_identifier: legacyRoomKey,
                last_message: '',
                is_marked_unread: false,
              })
              .select('id, user_identifier, last_message, updated_at, is_marked_unread')
              .single();
            room = fallbackRoom;
          } else {
            room = newRoom;
          }
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
            mata_kuliah: mataKuliahLabel,
            kelas: kelasLabel,
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

      // Kelompokkan per pasangan unik (pj_id) agar 1 PJ punya 1 room di sisi Dosen
      const relationsByPj = new Map<number, {
        pj: any;
        mataKuliahList: string[];
        kelasList: string[];
      }>();

      for (const rel of relations) {
        const pj = pjMap.get(rel.pj_id);
        if (!pj) continue;

        if (!relationsByPj.has(rel.pj_id)) {
          relationsByPj.set(rel.pj_id, {
            pj,
            mataKuliahList: [rel.mata_kuliah],
            kelasList: rel.kelas ? [rel.kelas] : [],
          });
        } else {
          const entry = relationsByPj.get(rel.pj_id)!;
          if (!entry.mataKuliahList.includes(rel.mata_kuliah)) {
            entry.mataKuliahList.push(rel.mata_kuliah);
          }
          if (rel.kelas && !entry.kelasList.includes(rel.kelas)) {
            entry.kelasList.push(rel.kelas);
          }
        }
      }

      const pjRooms = [];

      for (const [pjId, relData] of Array.from(relationsByPj.entries())) {
        const { pj, mataKuliahList, kelasList } = relData;
        const mataKuliahLabel = mataKuliahList.join(', ');
        const kelasLabel = kelasList.join(', ');

        const legacyRoomKey = `dosen:${dbUser.identifier}:${pj.identifier}`;

        // Dosen membaca room yang sama dengan PJ:
        // Format baru: user_identifier = nim_pj, participant_b_identifier = nip_dosen
        let { data: room } = await supabaseServer
          .from('chat_rooms')
          .select('id, user_identifier, last_message, updated_at, is_marked_unread')
          .eq('user_identifier', pj.identifier)
          .eq('participant_b_identifier', dbUser.identifier)
          .eq('room_type', 'pj_to_dosen')
          .maybeSingle();

        if (!room) {
          const { data: legacyRoom } = await supabaseServer
            .from('chat_rooms')
            .select('id, user_identifier, last_message, updated_at, is_marked_unread')
            .eq('user_identifier', legacyRoomKey)
            .maybeSingle();
          room = legacyRoom;
        }

        if (!room) {
          // Buat room jika belum ada (model baru terlebih dahulu)
          const { data: newRoom, error: insErr } = await supabaseServer
            .from('chat_rooms')
            .insert({
              user_identifier: pj.identifier,
              participant_b_identifier: dbUser.identifier,
              participant_b_role: 'dosen',
              room_type: 'pj_to_dosen',
              created_by: pj.identifier,
              last_message: '',
              is_marked_unread: false,
            })
            .select('id, user_identifier, last_message, updated_at, is_marked_unread')
            .maybeSingle();

          if (insErr) {
            const { data: fallbackRoom } = await supabaseServer
              .from('chat_rooms')
              .insert({
                user_identifier: legacyRoomKey,
                last_message: '',
                is_marked_unread: false,
              })
              .select('id, user_identifier, last_message, updated_at, is_marked_unread')
              .single();
            room = fallbackRoom;
          } else {
            room = newRoom;
          }
        }

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
            mata_kuliah: mataKuliahLabel,
            kelas: kelasLabel,
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

