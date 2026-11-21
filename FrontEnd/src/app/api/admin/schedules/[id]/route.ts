import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireAdminDev } from '@/lib/authHelper';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireAdminDev(request);
    if ('errorResponse' in auth) return auth.errorResponse;

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

