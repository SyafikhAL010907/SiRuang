import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireAdminDev } from '@/lib/authHelper';
import { checkNewChatColumns } from '@/lib/chatColumns';

export const dynamic = 'force-dynamic';

function getInitials(name?: string | null): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdminDev(request);
    if ('errorResponse' in auth) return auth.errorResponse;

    const { searchParams } = new URL(request.url);
    const includeOptions = searchParams.get('options') === 'true';

    // 1. Ambil relasi mata kuliah
    const { data: relations, error: relErr } = await supabaseServer
      .from('course_relations')
      .select('*')
      .order('created_at', { ascending: false });

    if (relErr) {
      return NextResponse.json(
        { error: 'Gagal mengambil relasi mata kuliah: ' + relErr.message },
        { status: 500 }
      );
    }

    // 2. Ambil user profiles untuk map dosen & pj
    const { data: profiles, error: profErr } = await supabaseServer
      .from('v_user_profiles')
      .select('*');

    if (profErr) {
      return NextResponse.json(
        { error: 'Gagal mengambil profil pengguna: ' + profErr.message },
        { status: 500 }
      );
    }

    const profileMap = new Map<number, any>();
    (profiles || []).forEach((p) => {
      profileMap.set(p.user_id, p);
    });

    const mapped = (relations || []).map((r: any) => {
      const dosen = profileMap.get(r.dosen_id);
      const pj = profileMap.get(r.pj_id);

      const lecturerName = dosen?.full_name || dosen?.username || `Dosen #${r.dosen_id}`;
      const pjName = pj?.full_name || pj?.username || `PJ #${r.pj_id}`;

      const scheduleStr =
        r.jadwal_hari && r.jadwal_jam
          ? `${r.jadwal_hari} ${r.jadwal_jam}`
          : r.jadwal_hari || r.jadwal_jam || 'Jadwal Fleksibel';

      const pjMetaParts = [
        pj?.prodi || 'Program Studi',
        pj?.angkatan || '',
        r.kelas ? `Kelas ${r.kelas}` : (pj?.kelas ? `Kelas ${pj.kelas}` : ''),
      ].filter(Boolean);

      return {
        id: r.id,
        course: r.mata_kuliah,
        kelas: r.kelas || '',
        schedule: scheduleStr,
        jadwal_hari: r.jadwal_hari || '',
        jadwal_jam: r.jadwal_jam || '',
        semester: r.semester || 'Ganjil 2026/2027',
        is_active: r.is_active ?? true,
        dosen_id: r.dosen_id,
        lecturer: lecturerName,
        lecturerNidn: dosen?.identifier ? `NIDN/NIP: ${dosen.identifier}` : 'NIDN: -',
        lecturerInitials: getInitials(lecturerName),
        pj_id: r.pj_id,
        pj: pjName,
        pjNim: pj?.identifier ? `NIM: ${pj.identifier}` : 'NIM: -',
        pjMeta: pjMetaParts.join(' · '),
        pjInitials: getInitials(pjName),
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    // 3. Opsi Dosen & PJ Kelas untuk Dropdown
    let dosenOptions: any[] = [];
    let pjOptions: any[] = [];

    if (includeOptions) {
      dosenOptions = (profiles || [])
        .filter((p) => p.role === 'dosen')
        .map((p) => ({
          id: p.user_id,
          name: p.full_name || p.username,
          identifier: p.identifier,
          departemen: p.departemen || p.faculty || '',
        }));

      pjOptions = (profiles || [])
        .filter((p) => p.role === 'pj_kelas' || p.role === 'user')
        .map((p) => ({
          id: p.user_id,
          name: p.full_name || p.username,
          identifier: p.identifier,
          role: p.role,
          prodi: p.prodi || '',
          kelas: p.kelas || '',
          angkatan: p.angkatan || '',
        }));
    }

    return NextResponse.json({
      success: true,
      data: mapped,
      ...(includeOptions ? { dosenOptions, pjOptions } : {}),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminDev(request);
    if ('errorResponse' in auth) return auth.errorResponse;

    const body = await request.json();
    const mataKuliah = body.mata_kuliah?.trim();
    const kelas = body.kelas?.trim();
    const dosenId = parseInt(body.dosen_id, 10);
    const pjId = parseInt(body.pj_id, 10);
    const jadwalHari = body.jadwal_hari?.trim() || null;
    const jadwalJam = body.jadwal_jam?.trim() || null;
    const semester = body.semester?.trim() || 'Ganjil 2026/2027';

    if (!mataKuliah) {
      return NextResponse.json({ error: 'Nama mata kuliah wajib diisi' }, { status: 400 });
    }
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas wajib diisi (misal: PTIK A)' }, { status: 400 });
    }
    if (isNaN(dosenId) || dosenId <= 0) {
      return NextResponse.json({ error: 'Dosen pengampu wajib dipilih' }, { status: 400 });
    }
    if (isNaN(pjId) || pjId <= 0) {
      return NextResponse.json({ error: 'PJ Kelas wajib dipilih' }, { status: 400 });
    }

    // Validasi dosen role
    const { data: dosenUser, error: dosenErr } = await supabaseServer
      .from('authentication')
      .select('id, role, username, identifier')
      .eq('id', dosenId)
      .maybeSingle();

    if (dosenErr || !dosenUser || dosenUser.role !== 'dosen') {
      return NextResponse.json(
        { error: 'Dosen yang dipilih tidak valid atau belum terdaftar sebagai Dosen' },
        { status: 400 }
      );
    }

    // Validasi PJ role
    const { data: pjUser, error: pjErr } = await supabaseServer
      .from('authentication')
      .select('id, role, username, identifier')
      .eq('id', pjId)
      .maybeSingle();

    if (pjErr || !pjUser) {
      return NextResponse.json(
        { error: 'Pengguna yang dipilih sebagai PJ tidak ditemukan' },
        { status: 400 }
      );
    }

    // Jika pengguna masih berstatus 'user', otomatis promosikan menjadi 'pj_kelas'
    if (pjUser.role === 'user') {
      await supabaseServer
        .from('authentication')
        .update({ role: 'pj_kelas' })
        .eq('id', pjId);
    }

    // Cek duplikasi relasi aktif
    const { data: existing } = await supabaseServer
      .from('course_relations')
      .select('id')
      .eq('dosen_id', dosenId)
      .eq('pj_id', pjId)
      .ilike('mata_kuliah', mataKuliah)
      .eq('kelas', kelas)
      .eq('semester', semester)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Relasi mata kuliah untuk dosen, PJ, kelas, dan semester ini sudah ada' },
        { status: 409 }
      );
    }

    // Insert relasi baru
    const { data: created, error: insertErr } = await supabaseServer
      .from('course_relations')
      .insert({
        dosen_id: dosenId,
        pj_id: pjId,
        mata_kuliah: mataKuliah,
        kelas,
        jadwal_hari: jadwalHari,
        jadwal_jam: jadwalJam,
        semester,
        is_active: true,
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json(
        { error: 'Gagal menambahkan relasi mata kuliah: ' + insertErr.message },
        { status: 500 }
      );
    }

    // Auto-create room PJ-dosen jika kolom baru chat_rooms tersedia di database (idempotent)
    try {
      const hasCols = await checkNewChatColumns();
      if (hasCols && pjUser.identifier && dosenUser.identifier) {
        const { data: existingRoom } = await supabaseServer
          .from('chat_rooms')
          .select('id')
          .eq('user_identifier', pjUser.identifier)
          .eq('participant_b_identifier', dosenUser.identifier)
          .eq('room_type', 'pj_to_dosen')
          .maybeSingle();

        if (!existingRoom) {
          await supabaseServer
            .from('chat_rooms')
            .insert({
              user_identifier: pjUser.identifier,
              room_type: 'pj_to_dosen',
              participant_b_identifier: dosenUser.identifier,
              participant_b_role: 'dosen',
              last_message: '',
              is_marked_unread: false,
            });
          console.log(`[Relations POST] Berhasil auto-create room pj_to_dosen: ${pjUser.identifier} -> ${dosenUser.identifier}`);
        }
      } else {
        console.log('[Relations POST] Kolom baru chat_rooms belum tersedia (SQL-2 belum dijalankan), melewati auto-create room');
      }
    } catch (err: any) {
      console.warn('[Relations POST] Error saat auto-create room pj_to_dosen (diabaikan agar relasi tetap sukses):', err.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Relasi mata kuliah berhasil ditambahkan',
      data: created,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}

