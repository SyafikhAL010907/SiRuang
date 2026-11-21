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

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();

    if (!query) {
      return NextResponse.json({ success: true, admins: [] });
    }

    // Panggil RPC search_building_admins dengan service_role key
    const { data: admins, error } = await supabaseServer.rpc('search_building_admins', {
      search_query: query,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Gagal mencari admin gedung: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      admins: (admins || []).map((adm: any) => ({
        user_id: adm.user_id,
        full_name: adm.full_name,
        username: adm.username,
        identifier: adm.identifier,
        role: adm.role,
        avatar_url: adm.avatar_url,
        gedung_kode: adm.gedung_kode,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}

