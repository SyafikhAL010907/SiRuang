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

    // 2. Admin ditolak (admin tidak menerima push notification)
    if (user.role === 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin tidak memerlukan push notification' }, { status: 403 });
    }

    // 3. Validasi body
    const body = await request.json().catch(() => null);
    if (
      !body ||
      typeof body.endpoint !== 'string' ||
      !body.endpoint.trim() ||
      !body.keys ||
      typeof body.keys.p256dh !== 'string' ||
      !body.keys.p256dh.trim() ||
      typeof body.keys.auth !== 'string' ||
      !body.keys.auth.trim()
    ) {
      return NextResponse.json({ error: 'Data subscription tidak lengkap atau tidak valid' }, { status: 400 });
    }

    const { endpoint, keys } = body;

    // 4. Cek apakah endpoint sudah ada di database
    const { data: existingSub, error: findError } = await supabaseServer
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', endpoint)
      .maybeSingle();

    if (findError) {
      console.error('[API Subscribe] Error cek existing endpoint:', findError.message);
      return NextResponse.json({ error: 'Gagal memeriksa subscription: ' + findError.message }, { status: 500 });
    }

    if (existingSub) {
      // Jika endpoint sudah ada: perbarui data dan tanggal, JANGAN hapus subscription lain
      const { error: updateError } = await supabaseServer
        .from('push_subscriptions')
        .update({
          user_identifier: user.identifier,
          p256dh: keys.p256dh,
          auth: keys.auth,
          created_at: new Date().toISOString(),
        })
        .eq('id', existingSub.id);

      if (updateError) {
        console.error('[API Subscribe] Error update subscription:', updateError.message);
        return NextResponse.json({ error: 'Gagal memperbarui subscription: ' + updateError.message }, { status: 500 });
      }

      return NextResponse.json({ message: 'Subscription diperbarui' });
    }

    // 5. Jika endpoint belum ada: cek jumlah subscription milik user ini (maksimal 5)
    const { data: userSubs, error: listError } = await supabaseServer
      .from('push_subscriptions')
      .select('id, created_at')
      .eq('user_identifier', user.identifier)
      .order('created_at', { ascending: true });

    if (listError) {
      console.error('[API Subscribe] Error cek kuota subscription user:', listError.message);
      return NextResponse.json({ error: 'Gagal memeriksa kuota subscription: ' + listError.message }, { status: 500 });
    }

    // Jika sudah >= 5, hapus yang paling lama (FIFO)
    if (userSubs && userSubs.length >= 5) {
      const oldestId = userSubs[0].id;
      const { error: deleteOldError } = await supabaseServer
        .from('push_subscriptions')
        .delete()
        .eq('id', oldestId);

      if (deleteOldError) {
        console.warn('[API Subscribe] Peringatan: gagal menghapus subscription terlama:', deleteOldError.message);
      }
    }

    // 6. Insert subscription baru
    const { error: insertError } = await supabaseServer
      .from('push_subscriptions')
      .insert({
        user_identifier: user.identifier,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[API Subscribe] Error insert subscription:', insertError.message);
      return NextResponse.json({ error: 'Gagal menyimpan subscription: ' + insertError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Subscription disimpan' });
  } catch (err: any) {
    console.error('[API Subscribe] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error: ' + (err?.message || err) }, { status: 500 });
  }
}

