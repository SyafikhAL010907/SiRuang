import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const building = searchParams.get('building');
    const floor = searchParams.get('floor');
    const bookable = searchParams.get('bookable');

    let query = supabaseServer
      .from('rooms')
      .select('*')
      .order('lantai', { ascending: true })
      .order('kode', { ascending: true });

    if (building) {
      query = query.ilike('gedung', building);
    }

    if (floor) {
      const floorNum = parseInt(floor, 10);
      if (!isNaN(floorNum)) {
        query = query.eq('lantai', floorNum);
      }
    }

    if (bookable !== null && bookable !== undefined && bookable !== '') {
      if (bookable === 'true') {
        query = query.eq('bookable', true);
      } else if (bookable === 'false') {
        query = query.eq('bookable', false);
      }
    }

    const { data: rooms, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Gagal mengambil data ruangan: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rooms || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}

