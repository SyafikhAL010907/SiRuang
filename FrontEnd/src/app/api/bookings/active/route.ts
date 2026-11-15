import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { evaluateBookingStates } from '@/lib/bookingEvaluator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await evaluateBookingStates();

    const { searchParams } = new URL(request.url);
    const roomKode = searchParams.get('room_kode')?.trim();
    let roomId = searchParams.get('room_id')?.trim();

    if (!roomId && roomKode) {
      const { data: roomByCode } = await supabaseServer
        .from('rooms')
        .select('id, kode, nama, bookable')
        .eq('kode', roomKode)
        .maybeSingle();

      if (roomByCode) {
        roomId = roomByCode.id;
      }
    }

    if (!roomId) {
      return NextResponse.json({ error: 'Ruangan tidak valid' }, { status: 400 });
    }

    const authUser = await getUserFromRequest(request);
    let dbUser: any = null;
    if (authUser) {
      const { data: userProfile } = await supabaseServer
        .from('v_user_profiles')
        .select('user_id, identifier, full_name, role')
        .eq('identifier', authUser.identifier)
        .maybeSingle();
      dbUser = userProfile;
    }

    // Ambil peminjaman aktif pada ruangan ini
    const { data: activeBookings, error: bErr } = await supabaseServer
      .from('bookings')
      .select(`
        *,
        rooms:room_id (id, kode, nama, gedung, lantai, bookable)
      `)
      .eq('room_id', roomId)
      .in('status', ['menunggu_dosen', 'disetujui_dosen', 'dijadwalkan_admin', 'menunggu_checkin', 'berlangsung'])
      .order('created_at', { ascending: false });

    if (bErr) {
      return NextResponse.json({ error: bErr.message }, { status: 500 });
    }

    if (!activeBookings || activeBookings.length === 0) {
      return NextResponse.json({
        success: true,
        hasActiveBooking: false,
        booking: null,
      });
    }

    // Cari apakah ada milik user saat ini
    let targetBooking = activeBookings[0];
    let isOwner = false;

    if (dbUser) {
      const myBooking = activeBookings.find(
        (b) => b.pemohon_id === dbUser.user_id || b.nim_pemohon === dbUser.identifier
      );
      if (myBooking) {
        targetBooking = myBooking;
        isOwner = true;
      } else {
        isOwner = targetBooking.pemohon_id === dbUser.user_id || targetBooking.nim_pemohon === dbUser.identifier;
      }
    }

    return NextResponse.json({
      success: true,
      hasActiveBooking: true,
      isOwner,
      booking: targetBooking,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}

