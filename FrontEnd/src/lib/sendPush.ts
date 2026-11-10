import { supabaseServer } from '@/lib/supabaseServer';
import { shouldPush } from '@/lib/pushRules';
import { sendOneNotification } from '@/lib/webPush';

/**
 * Bersihkan nama file dari path/URL, URL-encoding, dan prefix timestamp/random.
 */
function cleanFileName(raw: string): string {
  let name = (raw || '').trim();
  if (!name || name.startsWith('data:')) return '';

  if (name.includes('/') || name.includes('\\')) {
    try {
      const url = new URL(name, 'http://localhost');
      name = url.pathname.split('/').filter(Boolean).pop() || name;
    } catch {
      name = name.split(/[/\\]/).filter(Boolean).pop() || name;
    }
  }

  try {
    name = decodeURIComponent(name);
  } catch {
    // abaikan jika bukan URI component valid
  }

  // Buang prefix timestamp / hex random (misal: 1715000000000-file.pdf atau a1b2c3d4_file.pdf)
  name = name.replace(/^(\d{10,14}|[a-f0-9]{8,32})[-_]/i, '');
  return name.trim();
}

/**
 * Potong nama file panjang dengan "..." tapi pertahankan ekstensinya.
 */
function truncateFileName(fileName: string, maxLen = 25): string {
  if (fileName.length <= maxLen) return fileName;
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot > 0 && lastDot >= fileName.length - 8) {
    const ext = fileName.slice(lastDot);
    const base = fileName.slice(0, lastDot);
    const availBaseLen = maxLen - ext.length - 3;
    if (availBaseLen > 2) {
      return base.slice(0, availBaseLen) + '...' + ext;
    }
  }
  return fileName.slice(0, maxLen - 3) + '...';
}

/**
 * Potong string teks maksimal maxLen karakter, akhiri "..." HANYA jika terpotong.
 */
function truncateText(text: string, maxLen = 200): string {
  const trimmed = (text || '').trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.substring(0, maxLen) + '...';
}

/**
 * Format body notifikasi berdasarkan messageType.
 * Mencegah menampilkan URL, base64, atau metadata mentah.
 */
function formatMessageBody(messageBody: string, messageType: 'text' | 'image' | 'file' | 'multi_file'): string {
  switch (messageType) {
    case 'image': {
      const parts = (messageBody || '').split('|');
      const raw = parts[0]?.trim();
      const name = cleanFileName(raw);
      if (name && !name.startsWith('data:')) {
        return `📷 ${truncateFileName(name)}`;
      }
      return '📷 Gambar';
    }

    case 'file': {
      const parts = (messageBody || '').split('|');
      const raw = parts[0]?.trim();
      const name = cleanFileName(raw);
      if (name && !name.startsWith('data:')) {
        return `📎 ${truncateFileName(name)}`;
      }
      return '📎 Dokumen';
    }

    case 'multi_file': {
      const trimmed = (messageBody || '').trim();
      let fileNames: string[] = [];
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed.files)) {
            fileNames = parsed.files
              .map((f: any) => cleanFileName(f.name || ''))
              .filter(Boolean);
          }
        } catch {
          // fallback
        }
      }

      if (fileNames.length > 0) {
        const formattedList = fileNames.map((n) => truncateFileName(n, 25)).join(', ');
        const result = `📎 ${fileNames.length} file: ${formattedList}`;
        return truncateText(result, 200);
      }
      return '📎 Lampiran File';
    }

    case 'text':
    default:
      return truncateText(messageBody, 200);
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

    const recipientIdentifier = room.user_identifier;

    // 3. Ambil role penerima dan subscriptions secara paralel (Promise.all)
    const [authRes, subRes] = await Promise.all([
      supabaseServer
        .from('authentication')
        .select('role, username')
        .eq('identifier', recipientIdentifier)
        .maybeSingle(),
      supabaseServer
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_identifier', recipientIdentifier),
    ]);

    const { data: recipientAuth, error: authError } = authRes;
    const { data: subscriptions, error: subError } = subRes;

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
    const recipientRole = recipientAuth.role;

    // 6. Cek aturan push (shouldPush)
    if (!shouldPush(senderRole, recipientRole, senderIdentifier, recipientIdentifier)) {
      return;
    }

    if (subError || !subscriptions || subscriptions.length === 0) {
      return;
    }

    // 7. Susun body sesuai messageType
    const body = formatMessageBody(messageBody, messageType);

    // 8. Susun payload JSON standar Web Push
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

    // 9. Kirim ke semua subscription secara paralel (Promise.allSettled)
    await Promise.allSettled(
      subscriptions.map(async (sub) => {
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
      })
    );
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

