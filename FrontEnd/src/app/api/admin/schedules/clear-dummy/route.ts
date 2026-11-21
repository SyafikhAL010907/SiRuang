import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { isAdminDev } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Harap login terlebih dahulu' }, { status: 401 });
    }

    const { data: dbUser } = await supabaseServer
      .from('authentication')
      .select('id, role')
      .eq('identifier', user.identifier)
      .maybeSingle();

    if (!dbUser || !isAdminDev(dbUser.role)) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Admin yang berwenang.' }, { status: 403 });
    }

    const { error: delErr } = await supabaseServer
      .from('official_schedules')
      .delete()
      .eq('is_dummy', true);

    if (delErr) {
      return NextResponse.json({ error: 'Gagal membersihkan data dummy: ' + delErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Semua data jadwal resmi dummy berhasil dihapus.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}

