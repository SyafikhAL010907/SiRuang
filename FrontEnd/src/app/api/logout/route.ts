import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (user) {
      if (user.role === 'user' || user.role === 'pj_kelas') {
        // Hapus semua sesi atas nama user ini
        await supabaseServer.from('active_sessions').delete().eq('identifier', user.identifier);
      } else {
        // Hapus token yang spesifik untuk admin / dosen
        await supabaseServer
          .from('active_sessions')
          .delete()
          .eq('identifier', user.identifier)
          .eq('session_id', token);
      }
    }

    return NextResponse.json({ message: 'Berhasil logout, status kini Offline' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

