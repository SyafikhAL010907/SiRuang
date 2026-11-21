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

    const userRole = (authUser.role || '').toLowerCase();
    // AdminDev dan Admin Gedung boleh search
    const isBuildingAdmin = ['admin_sfd', 'admin_le', 'admin_ls'].includes(userRole);
    const isAdminDev = ['admin', 'admin_dev'].includes(userRole);

    if (!isAdminDev && !isBuildingAdmin) {
      return NextResponse.json({ error: 'Forbidden: Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();

    if (!query) {
      return NextResponse.json({ success: true, users: [] });
    }

    // Panggil RPC search_all_users dengan service_role key
    const { data: users, error } = await supabaseServer.rpc('search_all_users', {
      search_query: query,
      exclude_identifier: authUser.identifier,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Gagal mencari pengguna: ' + error.message },
        { status: 500 }
      );
    }

    let results = users || [];

    return NextResponse.json({
      success: true,
      users: results.map((u: any) => ({
        user_id: u.user_id,
        full_name: u.full_name,
        username: u.username,
        identifier: u.identifier,
        role: u.role,
        avatar_url: u.avatar_url,
        gedung_kode: u.gedung_kode,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}

