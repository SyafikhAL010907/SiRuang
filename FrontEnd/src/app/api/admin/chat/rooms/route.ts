import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { isBuildingAdmin } from '@/lib/roles';
import { checkNewChatColumns } from '@/lib/chatColumns';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const hasCols = await checkNewChatColumns();

    if (user && isBuildingAdmin(user.role)) {
      // POV Admin Gedung:
      // Hanya ada chat PJ (semua akun pj_kelas) dan chat Admin Dev (admin/admin_dev)
      // TIDAK ADA chat room dengan admin gedung lain

      if (hasCols) {
        // 1. Ambil akun Admin Dev dan semua akun ber-role pj_kelas
        const [{ data: adminDevData }, { data: pjUsersData }] = await Promise.all([
          supabaseServer
            .from('v_user_profiles')
            .select('user_id, username, identifier, role, full_name, avatar_url')
            .in('role', ['admin', 'admin_dev'])
            .limit(1)
            .maybeSingle(),
          supabaseServer
            .from('v_user_profiles')
            .select('user_id, username, identifier, role, full_name, avatar_url')
            .eq('role', 'pj_kelas')
            .order('user_id', { ascending: true }),
        ]);

        // 2. Pastikan room dengan Admin Dev ada di DB
        // Arah baku: target/admin gedung di sisi A (user_identifier), AdminDev di sisi B (participant_b)
        if (adminDevData?.identifier) {
          const { data: existDevRoom } = await supabaseServer
            .from('chat_rooms')
            .select('id')
            .eq('user_identifier', user.identifier)
            .eq('participant_b_identifier', adminDevData.identifier)
            .maybeSingle();

          if (!existDevRoom) {
            await supabaseServer
              .from('chat_rooms')
              .insert({
                user_identifier: user.identifier,
                room_type: 'user_to_building_admin',
                participant_b_identifier: adminDevData.identifier,
                participant_b_role: adminDevData.role || 'admin',
                created_by: user.identifier,
                last_message: '',
                is_marked_unread: false,
              });
          }
        }

        // 3. Pastikan room dengan semua akun PJ Kelas ada di DB (PJ sisi A, Admin Gedung sisi B)
        if (pjUsersData && pjUsersData.length > 0) {
          for (const pj of pjUsersData) {
            if (!pj.identifier) continue;
            const { data: existPjRoom } = await supabaseServer
              .from('chat_rooms')
              .select('id')
              .eq('user_identifier', pj.identifier)
              .eq('participant_b_identifier', user.identifier)
              .maybeSingle();

            if (!existPjRoom) {
              await supabaseServer
                .from('chat_rooms')
                .insert({
                  user_identifier: pj.identifier,
                  room_type: 'user_to_building_admin',
                  participant_b_identifier: user.identifier,
                  participant_b_role: user.role,
                  created_by: pj.identifier,
                  last_message: '',
                  is_marked_unread: false,
                });
            }
          }
        }

        // 4. Query semua room yang melibatkan Admin Gedung ini:
        // Baik Admin Gedung berada di sisi A (user_identifier) maupun sisi B (participant_b_identifier)
        const { data: rawRooms, error } = await supabaseServer
          .from('chat_rooms')
          .select(`
            id,
            user_identifier,
            room_type,
            participant_b_identifier,
            participant_b_role,
            last_message,
            updated_at,
            is_marked_unread
          `)
          .or(`participant_b_identifier.eq.${user.identifier},user_identifier.eq.${user.identifier}`)
          .order('updated_at', { ascending: false });

        if (error) {
          return NextResponse.json({ error: 'Gagal mengambil rooms: ' + error.message }, { status: 500 });
        }

        const rooms = (rawRooms as any[]) || [];

        // Kumpulkan identifier partner dari setiap room
        const partnerIds = Array.from(new Set(
          rooms.map((r: any) => (r.user_identifier === user.identifier ? r.participant_b_identifier : r.user_identifier)).filter(Boolean)
        ));

        let profiles: any[] = [];
        let sessions: any[] = [];

        if (partnerIds.length > 0) {
          const [{ data: profData }, { data: authData }, { data: sessData }] = await Promise.all([
            supabaseServer
              .from('v_user_profiles')
              .select('identifier, username, full_name, role, avatar_url')
              .in('identifier', partnerIds),
            supabaseServer
              .from('authentication')
              .select('identifier, username, role')
              .in('identifier', partnerIds),
            supabaseServer
              .from('active_sessions')
              .select('identifier')
              .in('identifier', partnerIds),
          ]);
          profiles = profData || [];
          sessions = sessData || [];
          if (authData) {
            for (const a of authData) {
              if (!profiles.some(p => p.identifier === a.identifier)) {
                profiles.push({
                  identifier: a.identifier,
                  username: a.username,
                  full_name: a.username,
                  role: a.role,
                  avatar_url: '',
                });
              }
            }
          }
        }

        const profileMap = new Map(profiles.map((p) => [p.identifier, p]));
        const onlineSet = new Set(sessions.map((s) => s.identifier));

        const formattedRooms = await Promise.all(
          rooms.map(async (room: any) => {
            const partnerId = room.user_identifier === user.identifier ? room.participant_b_identifier : room.user_identifier;
            const { count } = await supabaseServer
              .from('chat_messages')
              .select('id', { count: 'exact', head: true })
              .eq('room_id', room.id)
              .neq('sender_identifier', user.identifier)
              .eq('is_read', false);

            const prof = profileMap.get(partnerId);
            const userName = prof?.full_name || prof?.username || partnerId;
            const hasCustomAvatar = prof?.avatar_url && prof.avatar_url.startsWith('https://');
            const avatarUrl = hasCustomAvatar ? prof.avatar_url : (prof?.role === 'admin' || prof?.role === 'admin_dev' ? '/LogoSiRuangPolos.png' : '');
            const role = prof?.role || room.participant_b_role || 'user';

            return {
              id: room.id,
              user_identifier: partnerId,
              user_gmail: partnerId,
              room_type: room.room_type,
              participant_b_identifier: room.participant_b_identifier,
              participant_b_role: room.participant_b_role,
              last_message: room.last_message || '',
              updated_at: room.updated_at,
              user_name: userName,
              avatar_url: avatarUrl,
              role: role,
              unread_count: count || 0,
              is_online: onlineSet.has(partnerId),
              is_marked_unread: room.is_marked_unread,
            };
          })
        );

        // Izinkan semua partner yang valid (PJ, Mahasiswa, Dosen, Admin Dev, dan Admin Gedung lain)
        const allowedRoles = ['pj_kelas', 'user', 'dosen', 'admin', 'admin_dev', 'admin_sfd', 'admin_le', 'admin_ls'];
        const filtered = formattedRooms.filter((r) => allowedRoles.includes((r.role || '').toLowerCase()));

        // Pastikan 1 partner = 1 room paling baru (tidak ada duplicate card)
        const seenBg = new Set<string>();
        const uniqueBgRooms = filtered.filter((r) => {
          if (seenBg.has(r.user_identifier)) return false;
          seenBg.add(r.user_identifier);
          return true;
        });

        return NextResponse.json(uniqueBgRooms);
      } else {
        // Fallback sebelum SQL-2 berjalan (model lama 1 user = 1 room)
        let roomQuery = supabaseServer
          .from('chat_rooms')
          .select('id, user_identifier, last_message, updated_at, is_marked_unread');

        // Dual-format filter: kecualikan room dosen (baik format legacy 'dosen:%' maupun pj_to_dosen)
        if (hasCols) {
          roomQuery = (roomQuery as any).neq('room_type', 'pj_to_dosen');
        }
        roomQuery = roomQuery.not('user_identifier', 'like', 'dosen:%');

        const { data: rawRooms, error } = await roomQuery.order('updated_at', { ascending: false });

        if (error) {
          return NextResponse.json({ error: 'Gagal mengambil rooms: ' + error.message }, { status: 500 });
        }

        const rooms = (rawRooms as any[]) || [];
        const userIds = Array.from(new Set(rooms.map((r) => r.user_identifier).filter(Boolean)));

        let profiles: any[] = [];
        let sessions: any[] = [];

        if (userIds.length > 0) {
          const [{ data: profData }, { data: sessData }] = await Promise.all([
            supabaseServer
              .from('v_user_profiles')
              .select('identifier, username, full_name, role, avatar_url')
              .in('identifier', userIds),
            supabaseServer
              .from('active_sessions')
              .select('identifier')
              .in('identifier', userIds),
          ]);
          profiles = profData || [];
          sessions = sessData || [];
        }

        const profileMap = new Map(profiles.map((p) => [p.identifier, p]));
        const onlineSet = new Set(sessions.map((s) => s.identifier));

        // Format dan filter HANYA pj_kelas dan admin dev (tidak ada admin gedung lain)
        const formattedRooms = await Promise.all(
          rooms
            .filter((room) => {
              const prof = profileMap.get(room.user_identifier);
              const rRole = prof?.role;
              return rRole === 'pj_kelas' || rRole === 'admin' || rRole === 'admin_dev';
            })
            .map(async (room) => {
              const { count } = await supabaseServer
                .from('chat_messages')
                .select('id', { count: 'exact', head: true })
                .eq('room_id', room.id)
                .eq('is_read', false)
                .neq('sender_identifier', user.identifier);

              const prof = profileMap.get(room.user_identifier);
              const userName = prof?.full_name || prof?.username || room.user_identifier;
              const hasCustomAvatar = prof?.avatar_url && prof.avatar_url.startsWith('https://');
              const avatarUrl = hasCustomAvatar ? prof.avatar_url : (prof?.role === 'admin' || prof?.role === 'admin_dev' ? '/LogoSiRuangPolos.png' : '');

              return {
                id: room.id,
                user_identifier: room.user_identifier,
                user_gmail: room.user_identifier,
                last_message: room.last_message || '',
                updated_at: room.updated_at,
                user_name: userName,
                avatar_url: avatarUrl,
                role: prof?.role || 'user',
                unread_count: count || 0,
                is_online: onlineSet.has(room.user_identifier),
                is_marked_unread: room.is_marked_unread,
              };
            })
        );

        return NextResponse.json(formattedRooms);
      }
    }

    // AdminDev / Admin: melihat room yang melibatkan dirinya (atau room bantuan user legacy)
    const selectFields = hasCols
      ? 'id, user_identifier, room_type, participant_b_identifier, participant_b_role, last_message, updated_at, is_marked_unread'
      : 'id, user_identifier, last_message, updated_at, is_marked_unread';

    let devRoomQuery = supabaseServer
      .from('chat_rooms')
      .select(selectFields as any);

    if (hasCols) {
      devRoomQuery = (devRoomQuery as any).neq('room_type', 'pj_to_dosen');
      // Admin Dev melihat semua room bantuan user_to_admin (termasuk legacy null) dan room yang melibatkan dirinya
      if (user?.identifier) {
        devRoomQuery = (devRoomQuery as any).or(
          `room_type.eq.user_to_admin,participant_b_identifier.is.null,participant_b_identifier.eq.${user.identifier},user_identifier.eq.${user.identifier}`
        );
      } else {
        devRoomQuery = (devRoomQuery as any).or(`room_type.eq.user_to_admin,participant_b_identifier.is.null`);
      }
    }
    devRoomQuery = devRoomQuery.not('user_identifier', 'like', 'dosen:%');

    const { data: rawRooms, error } = await devRoomQuery.order('updated_at', { ascending: false });

    const rooms = (rawRooms as any[]) || [];

    if (error) {
      return NextResponse.json({ error: 'Gagal mengambil rooms: ' + error.message }, { status: 500 });
    }

    // Kumpulkan identifier partner dari seluruh rooms yang ditemukan (sisi non-admin)
    const partnerIds = Array.from(new Set(
      rooms.map((r) => (user && r.user_identifier === user.identifier ? r.participant_b_identifier : r.user_identifier)).filter(Boolean)
    ));

    let profiles: any[] = [];
    let sessions: any[] = [];

    if (partnerIds.length > 0) {
      const [{ data: profData }, { data: authData }, { data: sessData }] = await Promise.all([
        supabaseServer
          .from('v_user_profiles')
          .select('identifier, username, full_name, role, avatar_url')
          .in('identifier', partnerIds),
        supabaseServer
          .from('authentication')
          .select('identifier, username, role')
          .in('identifier', partnerIds),
        supabaseServer
          .from('active_sessions')
          .select('identifier')
          .in('identifier', partnerIds),
      ]);
      profiles = profData || [];
      sessions = sessData || [];
      if (authData) {
        for (const a of authData) {
          if (!profiles.some(p => p.identifier === a.identifier)) {
            profiles.push({
              identifier: a.identifier,
              username: a.username,
              full_name: a.username,
              role: a.role,
              avatar_url: '',
            });
          }
        }
      }
    }

    const profileMap = new Map(profiles.map((p) => [p.identifier, p]));
    const onlineSet = new Set(sessions.map((s) => s.identifier));

    let unreadMap = new Map<number, number>();
    let usedRpc = false;

    try {
      const { data: unreadData, error: rpcError } = await supabaseServer.rpc('get_room_unread_counts');
      if (rpcError) {
        console.error('[API Admin Rooms] RPC get_room_unread_counts error, falling back to individual queries:', rpcError.message);
      } else if (Array.isArray(unreadData)) {
        unreadMap = new Map(unreadData.map((u: any) => [Number(u.room_id), Number(u.unread_count || 0)]));
        usedRpc = true;
      }
    } catch (err: any) {
      console.error('[API Admin Rooms] Exception calling RPC get_room_unread_counts, falling back:', err);
      usedRpc = false;
    }

    if (usedRpc) {
      const formattedRooms = rooms.map((room) => {
        const partnerId = (user && room.user_identifier === user.identifier) ? room.participant_b_identifier : room.user_identifier;
        const prof = profileMap.get(partnerId);
        const userName = prof?.full_name || prof?.username || partnerId;
        const hasCustomAvatar = prof?.avatar_url && prof.avatar_url.startsWith('https://');
        const avatarUrl = hasCustomAvatar ? prof.avatar_url : (prof?.role === 'admin' || prof?.role === 'admin_dev' ? '/LogoSiRuangPolos.png' : '');
        const role = prof?.role || room.participant_b_role || 'user';

        return {
          id: room.id,
          user_identifier: partnerId,
          user_gmail: partnerId,
          last_message: room.last_message || '',
          updated_at: room.updated_at,
          user_name: userName,
          avatar_url: avatarUrl,
          role: role,
          unread_count: unreadMap.get(room.id) || 0,
          is_online: onlineSet.has(partnerId),
          is_marked_unread: room.is_marked_unread,
        };
      });

      // Pastikan 1 partner = 1 room paling baru (tidak ada duplicate card)
      const seenDevRpc = new Set<string>();
      const uniqueDevRoomsRpc = formattedRooms.filter((r) => {
        if (seenDevRpc.has(r.user_identifier)) return false;
        seenDevRpc.add(r.user_identifier);
        return true;
      });

      return NextResponse.json(uniqueDevRoomsRpc);
    }

    const formattedRooms = await Promise.all(
      rooms.map(async (room) => {
        const partnerId = (user && room.user_identifier === user.identifier) ? room.participant_b_identifier : room.user_identifier;
        const { count } = await supabaseServer
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', room.id)
          .eq('is_read', false)
          .neq('sender_identifier', user?.identifier || '');

        const prof = profileMap.get(partnerId);
        const userName = prof?.full_name || prof?.username || partnerId;
        const hasCustomAvatar = prof?.avatar_url && prof.avatar_url.startsWith('https://');
        const avatarUrl = hasCustomAvatar ? prof.avatar_url : (prof?.role === 'admin' || prof?.role === 'admin_dev' ? '/LogoSiRuangPolos.png' : '');
        const role = prof?.role || room.participant_b_role || 'user';

        return {
          id: room.id,
          user_identifier: partnerId,
          user_gmail: partnerId,
          last_message: room.last_message || '',
          updated_at: room.updated_at,
          user_name: userName,
          avatar_url: avatarUrl,
          role: role,
          unread_count: count || 0,
          is_online: onlineSet.has(partnerId),
          is_marked_unread: room.is_marked_unread,
        };
      })
    );

    // Pastikan 1 partner = 1 room paling baru (tidak ada duplicate card)
    const seenDev = new Set<string>();
    const uniqueDevRooms = formattedRooms.filter((r) => {
      if (seenDev.has(r.user_identifier)) return false;
      seenDev.add(r.user_identifier);
      return true;
    });

    return NextResponse.json(uniqueDevRooms);
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}
