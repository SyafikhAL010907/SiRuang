import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { evaluateBookingStates } from '@/lib/bookingEvaluator';
import { isAnyAdmin, isBuildingAdmin } from '@/lib/roles';
import { getGedungForAdmin } from '@/lib/bookingApprovalHelper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await evaluateBookingStates();
    const user = await getUserFromRequest(request);
    if (!user || !isAnyAdmin(user.role)) {
      return NextResponse.json({ error: 'Unauthorized: Akses khusus admin' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let query = supabaseServer
      .from('bookings')
      .select(`
        *,
        rooms:room_id (id, kode, nama, gedung, lantai, bookable)
      `)
      .order('tanggal', { ascending: false })
      .order('jam_mulai', { ascending: true });

    // Admin Gedung hanya melihat booking di gedungnya (server-side filter)
    if (isBuildingAdmin(user.role)) {
      const allowedGedung = await getGedungForAdmin(user.identifier, user.role);
      if (!allowedGedung || allowedGedung.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }

      // Ambil room_id untuk gedung yang dikelola admin ini
      const { data: bRooms } = await supabaseServer
        .from('rooms')
        .select('id')
        .in('gedung', allowedGedung);

      const roomIds = bRooms?.map((r) => r.id) || [];
      if (roomIds.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }

      query = query.in('room_id', roomIds);
    }

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
