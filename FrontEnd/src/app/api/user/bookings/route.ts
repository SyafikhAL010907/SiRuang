import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { evaluateBookingStates } from '@/lib/bookingEvaluator';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await evaluateBookingStates();
    const authUser = await getUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: Sesi tidak valid' }, { status: 401 });
    }

    const { data: dbUser, error: uErr } = await supabaseServer
      .from('authentication')
      .select('id, identifier')
      .eq('identifier', authUser.identifier)
      .maybeSingle();

    if (uErr || !dbUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const { data: bookings, error: bErr } = await supabaseServer
      .from('bookings')
      .select(`
        *,
        rooms:room_id (id, kode, nama, gedung, lantai, bookable)
      `)
      .or(`pemohon_id.eq.${dbUser.id},nim_pemohon.eq.${dbUser.identifier}`)
      .order('created_at', { ascending: false });

    if (bErr) {
      return NextResponse.json(
        { error: 'Gagal mengambil riwayat booking: ' + bErr.message },
        { status: 500 }
      );
    }

    const list = bookings || [];

    // Jika ada booking yang belum ada nama_dosen tapi memiliki dosen_id, lengkapi dari profil
    const missingDosenIds = Array.from(new Set(
      list.filter((b) => !b.nama_dosen && b.dosen_id).map((b) => b.dosen_id)
    ));

    if (missingDosenIds.length > 0) {
      const { data: dosenProfiles } = await supabaseServer
        .from('v_user_profiles')
        .select('user_id, full_name, username')
        .in('user_id', missingDosenIds);

      const dosenMap = new Map((dosenProfiles || []).map((d) => [d.user_id, d.full_name || d.username]));
      list.forEach((b) => {
        if (!b.nama_dosen && b.dosen_id && dosenMap.has(b.dosen_id)) {
          b.nama_dosen = dosenMap.get(b.dosen_id);
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}

