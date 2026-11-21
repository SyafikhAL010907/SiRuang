import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { ALL_ADMIN_ROLES } from '@/lib/roles';

export async function GET() {
  try {
    const { count, error } = await supabaseServer
      .from('authentication')
      .select('id', { count: 'exact', head: true })
      .in('role', ['user', 'pj_kelas', 'dosen']);

    if (error) {
      return NextResponse.json({ error: 'Gagal mengambil data statistik: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({
      total_users: count || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

