import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'dosen') {
      return NextResponse.json({ error: 'Unauthorized: Akses khusus dosen' }, { status: 403 });
    }

    // Ambil data dosen dari database
    const { data: dbDosen } = await supabaseServer
      .from('authentication')
      .select('id, identifier, role')
      .eq('identifier', user.identifier)
      .maybeSingle();

    if (!dbDosen) {
      return NextResponse.json({ error: 'Akun dosen tidak ditemukan' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let query = supabaseServer
      .from('bookings')
      .select(`
        *,
        rooms:room_id (id, kode, nama, gedung, lantai, bookable)
      `)
      .eq('dosen_id', dbDosen.id)
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter);
    }

    const { data: bookings, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Gagal mengambil data pengajuan booking: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bookings || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}

