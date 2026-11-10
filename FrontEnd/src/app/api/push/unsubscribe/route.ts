import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Auth check via header Authorization: Bearer <JWT>
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Sesi tidak valid' }, { status: 401 });
    }

    // 2. Validasi body
    const body = await request.json().catch(() => null);
    if (!body || typeof body.endpoint !== 'string' || !body.endpoint.trim()) {
      return NextResponse.json({ error: 'Endpoint tidak valid' }, { status: 400 });
    }

    const { endpoint } = body;

    // 3. Hapus subscription milik user ini
    const { error: deleteError } = await supabaseServer
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_identifier', user.identifier);

    if (deleteError) {
      console.error('[API Unsubscribe] Error hapus subscription:', deleteError.message);
      return NextResponse.json({ error: 'Gagal menghapus subscription: ' + deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Subscription berhasil dihapus' });
  } catch (err: any) {
    console.error('[API Unsubscribe] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error: ' + (err?.message || err) }, { status: 500 });
  }
}

