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

    const { data: dbDosenProfile } = await supabaseServer
      .from('v_user_profiles')
      .select('user_id, identifier, full_name, username')
      .eq('identifier', user.identifier)
      .maybeSingle();

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let query = supabaseServer
      .from('bookings')
      .select(`
        *,
        rooms:room_id (id, kode, nama, gedung, lantai, bookable)
      `)
      .order('created_at', { ascending: false });

    // Filter milik dosen yang login: bisa via dosen_id atau nama_dosen
    let dosenFilter = `dosen_id.eq.${dbDosen.id}`;
    if (dbDosenProfile?.full_name) {
      dosenFilter += `,nama_dosen.ilike.%${dbDosenProfile.full_name}%`;
    }
    if (dbDosenProfile?.username) {
      dosenFilter += `,nama_dosen.ilike.%${dbDosenProfile.username}%`;
    }
    query = query.or(dosenFilter);

    if (statusFilter && statusFilter !== 'ALL') {
      if (statusFilter === 'pending') {
        query = query.or('status.eq.menunggu_dosen,and(status.eq.menunggu_approval,approval_dosen.eq.pending)');
      } else {
        query = query.eq('status', statusFilter);
      }
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

