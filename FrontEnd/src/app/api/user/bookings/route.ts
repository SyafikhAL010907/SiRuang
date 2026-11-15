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
      .eq('pemohon_id', dbUser.id)
      .order('created_at', { ascending: false });

    if (bErr) {
      return NextResponse.json(
        { error: 'Gagal mengambil riwayat booking: ' + bErr.message },
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

