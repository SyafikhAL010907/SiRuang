import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { isAdminDev } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !isAdminDev(user.role)) {
      return NextResponse.json({ error: 'Unauthorized: Akses khusus admin' }, { status: 403 });
    }

    const { data: users, error } = await supabaseServer
      .from('v_user_profiles')
      .select('*')
      .order('user_id', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Gagal mengambil data pengguna: ' + error.message }, { status: 500 });
    }

    const mapped = (users || []).map((u) => ({
      id: u.user_id,
      user_id: u.user_id,
      username: u.username,
      identifier: u.identifier,
      identifier_type: u.identifier_type,
      role: u.role,
      full_name: u.full_name || u.username,
      email: u.email || null,
      phone: u.phone || u.whatsapp || null,
      faculty: u.faculty || null,
      kelas: u.kelas || null,
      prodi: u.prodi || null,
      angkatan: u.angkatan || null,
      departemen: u.departemen || null,
      avatar_url: u.avatar_url || null,
      created_at: u.created_at || null,
      gmail: u.identifier, // Fallback alias kompatibilitas
    }));

    return NextResponse.json(mapped);
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}
