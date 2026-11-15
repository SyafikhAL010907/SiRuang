import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('room_id');
    const roomKode = searchParams.get('room_kode');
    const hari = searchParams.get('hari');

    let query = supabaseServer
      .from('official_schedules')
      .select(`
        *,
        rooms:room_id (id, kode, nama, gedung, lantai, bookable),
        dosen:dosen_id (id, username),
        pj:pj_id (id, username)
      `)
      .eq('is_active', true)
      .order('jam_mulai', { ascending: true });

    if (roomId) {
      query = query.eq('room_id', roomId);
    }

    if (hari) {
      query = query.ilike('hari', hari);
    }

    const { data: schedules, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Gagal mengambil jadwal resmi: ' + error.message },
        { status: 500 }
      );
    }

    // Filter by roomKode if requested
    let result = schedules || [];
    if (roomKode) {
      result = result.filter((s: any) => s.rooms?.kode === roomKode);
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}
