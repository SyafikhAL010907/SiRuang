import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireAdminDev } from '@/lib/authHelper';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminDev(request);
    if ('errorResponse' in auth) return auth.errorResponse;

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

