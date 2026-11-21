import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Sesi tidak valid' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    // Query admin accounts using safe whitelist of roles (semua admin: admin, admin_sfd, admin_le, admin_ls)
    let query = supabaseServer
      .from('v_user_profiles')
      .select('user_id, username, identifier, role, full_name, avatar_url')
      .in('role', ['admin', 'admin_dev', 'admin_sfd', 'admin_le', 'admin_ls'])
      .order('user_id', { ascending: true })
      .limit(20);

    if (q) {
      query = query.or(`username.ilike.%${q}%,full_name.ilike.%${q}%,identifier.ilike.%${q}%`);
    }

    const { data: admins, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Gagal mencari admin: ' + error.message }, { status: 500 });
    }

    const mapped = (admins || []).map((a: any) => ({
      id: a.user_id,
      identifier: a.identifier,
      username: a.username,
      full_name: a.full_name || a.username,
      role: a.role,
      avatar_url: a.avatar_url && a.avatar_url.trim() !== '' ? a.avatar_url : '/LogoSiRuangPolos.png',
    }));

    // Fallback jika ada admin gedung yang belum ada di DB agar tetap ada 4 admin (Dev, SFD, LE, LS)
    const knownRoles = new Set(mapped.map((m: any) => m.role));
    const fallbacks = [
      { id: 991, identifier: 'admin', username: 'Admin UNJ', full_name: 'Admin UNJ', role: 'admin', avatar_url: '/LogoSiRuangPolos.png' },
      { id: 992, identifier: '980101000101', username: 'Admin SFD', full_name: 'Admin Gedung SFD', role: 'admin_sfd', avatar_url: '/LogoSiRuangPolos.png' },
      { id: 993, identifier: '980101000201', username: 'Admin LE', full_name: 'Admin Gedung LE', role: 'admin_le', avatar_url: '/LogoSiRuangPolos.png' },
      { id: 994, identifier: '980101000301', username: 'Admin LS', full_name: 'Admin Gedung LS', role: 'admin_ls', avatar_url: '/LogoSiRuangPolos.png' },
    ];

    if (!q) {
      for (const fb of fallbacks) {
        if (!knownRoles.has(fb.role) && !(fb.role === 'admin' && knownRoles.has('admin_dev'))) {
          mapped.push(fb);
        }
      }
    }

    return NextResponse.json(mapped);
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

