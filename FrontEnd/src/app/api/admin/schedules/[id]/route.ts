import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Harap login terlebih dahulu' }, { status: 401 });
    }

    const { data: dbUser } = await supabaseServer
      .from('authentication')
      .select('id, role')
      .eq('identifier', user.identifier)
      .maybeSingle();

    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Admin yang dapat menghapus jadwal resmi.' }, { status: 403 });
    }

    const { error: delErr } = await supabaseServer
      .from('official_schedules')
      .delete()
      .eq('id', id);

    if (delErr) {
      return NextResponse.json({ error: 'Gagal menghapus jadwal: ' + delErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Jadwal resmi berhasil dihapus.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}

