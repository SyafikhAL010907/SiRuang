import { supabaseServer } from '@/lib/supabaseServer';
import { shouldPush } from '@/lib/pushRules';
import { sendOneNotification } from '@/lib/webPush';

/**
 * Format body notifikasi berdasarkan messageType.
 * Mencegah menampilkan URL, nama file mentah, atau base64.
 */
function formatMessageBody(messageBody: string, messageType: 'text' | 'image' | 'file' | 'multi_file'): string {
  switch (messageType) {
    case 'image':
      return '📷 Gambar';
    case 'file':
      return '📎 File';
    case 'multi_file':
      return '📎 Lampiran File';
    case 'text':
    default:
      return messageBody.trim().substring(0, 80);
  }
}

/**
 * Fungsi pusat untuk mengirim push notification ke penerima pesan dalam suatu room.
 * Dipanggil fire-and-forget dari handler pengiriman pesan.
 * Tidak pernah throw — semua error ditangkap di dalam.
 *
 * @param roomId           - ID room chat
 * @param senderIdentifier - identifier pengirim (NIM/NIP atau 'admin_ai')
 * @param messageBody      - isi pesan (akan dipotong ≤80 karakter)
 * @param messageType      - tipe pesan ('text' | 'image' | 'file' | 'multi_file')
 */
export async function notifyRecipient(
  roomId: number,
  senderIdentifier: string,
  messageBody: string,
  messageType: 'text' | 'image' | 'file' | 'multi_file' = 'text'
): Promise<void> {
  try {
    // 1. Ambil room
    const { data: room, error: roomError } = await supabaseServer
      .from('chat_rooms')
      .select('user_identifier')
      .eq('id', roomId)
      .maybeSingle();

    if (roomError || !room) {
      return;
    }

    // 2. Jika pengirim adalah pemilik room, penerimanya adalah admin -> return (admin tidak di-push)
    if (senderIdentifier === room.user_identifier) {
      return;
    }

    // 3. Ambil role dan username penerima dari tabel authentication
    const { data: recipientAuth, error: authError } = await supabaseServer
      .from('authentication')
      .select('role, username')
      .eq('identifier', room.user_identifier)
      .maybeSingle();

    if (authError || !recipientAuth) {
      return;
    }

    // 4. Jika role penerima adalah 'admin', return (admin tidak pernah di-push)
    if (recipientAuth.role === 'admin') {
      return;
    }

    // 5. Pengirim yang bukan pemilik room pasti admin atau bot admin_ai
    const senderRole = 'admin';
    const displayName = 'Admin';
    const recipientIdentifier = room.user_identifier;
    const recipientRole = recipientAuth.role;

    // 6. Cek aturan push (shouldPush)
    if (!shouldPush(senderRole, recipientRole, senderIdentifier, recipientIdentifier)) {
      return;
    }

    // 7. Ambil subscriptions milik penerima
    const { data: subscriptions, error: subError } = await supabaseServer
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_identifier', recipientIdentifier);

    if (subError || !subscriptions || subscriptions.length === 0) {
      return;
    }

    // 8. Susun body sesuai messageType
    const body = formatMessageBody(messageBody, messageType);

    // 9. Susun payload JSON standar Web Push
    const payload = JSON.stringify({
      title: `Pesan baru dari ${displayName}`,
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `room-${roomId}`,
      data: {
        url: '/user?openChat=1',
        roomId,
      },
    });

    // 10. Kirim ke semua subscription milik penerima
    for (const sub of subscriptions) {
      const res = await sendOneNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );

      // Jika endpoint sudah 404 / 410 Gone, hapus dari database
      if (res.expired) {
        await supabaseServer
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint);
      }
    }
  } catch (err: any) {
    console.warn('[sendPush] Error di notifyRecipient:', err?.message || err);
  }
}

/**
 * Kirim push notification ke banyak penerima sekaligus (untuk fitur broadcast admin).
 * Menggunakan 1 batch query untuk mengambil subscription, dikirim paralel per batch 10.
 * Tidak pernah throw.
 *
 * @param adminIdentifier   - identifier admin pengirim
 * @param finalMsg          - isi pesan broadcast
 * @param messageType       - tipe pesan
 * @param roomMap           - mapping user_identifier -> roomId
 * @param targetIdentifiers - daftar user_identifier penerima
 */
export async function notifyBroadcast(
  adminIdentifier: string,
  finalMsg: string,
  messageType: 'text' | 'image' | 'file' | 'multi_file' = 'text',
  roomMap: Map<string, number>,
  targetIdentifiers: string[]
): Promise<void> {
  try {
    if (!targetIdentifiers || targetIdentifiers.length === 0) {
      return;
    }

    // 1. Ambil SEMUA subscription untuk semua target identifiers sekaligus (1 query batch)
    const { data: subs, error: subsError } = await supabaseServer
      .from('push_subscriptions')
      .select('user_identifier, endpoint, p256dh, auth')
      .in('user_identifier', targetIdentifiers);

    if (subsError || !subs || subs.length === 0) {
      return;
    }

    // 2. Susun body notifikasi generik
    const body = formatMessageBody(finalMsg, messageType);
    const BATCH_SIZE = 10;
    const expiredEndpoints: string[] = [];

    // 3. Kirim paralel per batch 10 menggunakan Promise.allSettled
    for (let i = 0; i < subs.length; i += BATCH_SIZE) {
      const batch = subs.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (sub) => {
          const roomId = roomMap.get(sub.user_identifier);
          if (!roomId) return;

          const payload = JSON.stringify({
            title: 'Pesan baru dari Admin',
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: `room-${roomId}`,
            data: {
              url: '/user?openChat=1',
              roomId,
            },
          });

          const res = await sendOneNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );

          if (res.expired) {
            expiredEndpoints.push(sub.endpoint);
          }
        })
      );
    }

    // 4. Hapus endpoint yang expired secara bulk jika ada
    if (expiredEndpoints.length > 0) {
      await supabaseServer
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
    }
  } catch (err: any) {
    console.warn('[sendPush] Error di notifyBroadcast:', err?.message || err);
  }
}

