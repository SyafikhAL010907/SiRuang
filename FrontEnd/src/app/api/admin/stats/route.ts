import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const { count, error } = await supabaseServer
      .from('authentication')
      .select('id', { count: 'exact', head: true })
      .neq('role', 'admin');

    if (error) {
      return NextResponse.json({ error: 'Gagal mengambil data statistik' }, { status: 500 });
    }

    return NextResponse.json({
      total_users: count || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

