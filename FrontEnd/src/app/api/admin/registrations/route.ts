import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Akses khusus admin' }, { status: 403 });
    }

    // 1. Lazy purge: bersihkan otomatis pengajuan yang sudah expired
    try {
      await supabaseServer.rpc('purge_expired_registrations');
    } catch (purgeErr) {
      console.warn('[registrations] Gagal menjalankan purge_expired_registrations:', purgeErr);
    }

    // 2. Ambil seluruh permohonan pending yang masih aktif
    const { data: requests, error } = await supabaseServer
      .from('registration_requests')
      .select('id, identifier, identifier_type, username, email, phone, faculty, prodi, kelas, angkatan, departemen, requested_role, created_at, expires_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Gagal mengambil permohonan registrasi: ' + error.message }, { status: 500 });
    }

    return NextResponse.json(requests || []);
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

