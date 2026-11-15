import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authUser = await getUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: Sesi tidak valid' }, { status: 401 });
    }

    // Ambil data user dari tabel authentication
    const { data: dbUser, error: uErr } = await supabaseServer
      .from('authentication')
      .select('id, role, identifier')
      .eq('identifier', authUser.identifier)
      .maybeSingle();

    if (uErr || !dbUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // Ambil relasi mata kuliah aktif milik PJ ini
    const { data: relations, error: relErr } = await supabaseServer
      .from('course_relations')
      .select('*')
      .eq('pj_id', dbUser.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (relErr) {
      return NextResponse.json(
        { error: 'Gagal mengambil relasi mata kuliah: ' + relErr.message },
        { status: 500 }
      );
    }

    // Ambil profil dosen
    const dosenIds = Array.from(new Set((relations || []).map((r) => r.dosen_id)));
    let dosenMap = new Map<number, any>();

    if (dosenIds.length > 0) {
      const { data: dosens } = await supabaseServer
        .from('v_user_profiles')
        .select('user_id, username, full_name, identifier, email, phone, faculty, departemen')
        .in('user_id', dosenIds);

      (dosens || []).forEach((d) => dosenMap.set(d.user_id, d));
    }

    const mapped = (relations || []).map((r) => {
      const d = dosenMap.get(r.dosen_id);
      return {
        id: r.id,
        mata_kuliah: r.mata_kuliah,
        kelas: r.kelas || '',
        dosen_id: r.dosen_id,
        nama_dosen: d?.full_name || d?.username || 'Dosen Pengampu',
        dosen_nidn: d?.identifier || '',
        dosen_email: d?.email || '',
        dosen_phone: d?.phone || '',
        jadwal_hari: r.jadwal_hari || '',
        jadwal_jam: r.jadwal_jam || '',
        semester: r.semester || 'Ganjil 2026/2027',
      };
    });

    return NextResponse.json({
      success: true,
      data: mapped,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}

