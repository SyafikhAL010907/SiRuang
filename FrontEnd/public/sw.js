// public/sw.js
// Service Worker untuk SiRuang Web Push Notification

// Pemisah garis lurus menyambung tipis/hairline antar pesan beruntun
const MESSAGE_SEPARATOR = '\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n';

// Auto-update Service Worker seketika saat ada perubahan script
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Pesan baru dari Admin', body: event.data.text(), data: { url: '/user?openChat=1' } };
  }

  const defaultTitle = payload.title || 'Pesan baru dari Admin';
  const tag = payload.tag || 'siruang-push';

  // Cek apakah tab USER sedang aktif dan sedang difokuskan oleh pengguna.
  // Jangan gunakan clientList.some(c => c.visibilityState === 'visible') mentah-mentah,
  // karena jika Admin sedang membuka tab /admin di localhost yang sama, notifikasi User akan tertahan/terblokir.
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clientList) => {
        const isUserFocused = clientList.some(
          (c) => c.visibilityState === 'visible' && c.focused && !c.url.includes('/admin')
        );
        if (isUserFocused) {
          // Pengguna sedang aktif fokus melihat chat user di aplikasi -> jangan munculkan notifikasi sistem
          return;
        }

        let count = 1;
        let messages = [payload.body || ''];
        let title = defaultTitle;

        try {
          // Ambil semua notifikasi aktif dan cari yang tag-nya sama (paling aman di semua browser)
          const allNotifications = await self.registration.getNotifications();
          const existingNotif = allNotifications && Array.isArray(allNotifications)
            ? allNotifications.find((n) => n && n.tag === tag)
            : null;

          if (existingNotif) {
            const prevData = (existingNotif.data && typeof existingNotif.data === 'object')
              ? existingNotif.data
              : {};
            count = (typeof prevData.count === 'number' ? prevData.count : 1) + 1;

            let prevMessages = [];
            if (Array.isArray(prevData.messages) && prevData.messages.length > 0) {
              prevMessages = prevData.messages;
            } else if (typeof existingNotif.body === 'string' && existingNotif.body) {
              prevMessages = existingNotif.body.split(MESSAGE_SEPARATOR);
            }

            // Gabungkan pesan beruntun, simpan maksimal 5 pesan terakhir (WhatsApp style)
            messages = [...prevMessages, payload.body || ''].slice(-5);
            title = `Admin · ${count} pesan baru`;
          }
        } catch (err) {
          console.warn('[sw.js] Gagal mengelompokkan notifikasi:', err);
          count = 1;
          messages = [payload.body || ''];
          title = defaultTitle;
        }

        // Pemisah garis tipis horizontal antar pesan beruntun
        const combinedBody = messages.join(MESSAGE_SEPARATOR);

        const options = {
          body: combinedBody,
          icon: payload.icon || '/icon-192.png',
          badge: payload.badge || '/icon-192.png',
          tag: tag,
          renotify: true, // Realtime: selalu bunyikan/getarkan notifikasi seketika setiap ada pesan baru
          data: {
            ...(payload.data || {}),
            count: count,
            messages: messages,
            ts: Date.now(),
          },
        };

        return self.registration.showNotification(title, options);
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = data.url || '/user?openChat=1';

  // Validasi same-origin
  const origin = self.location.origin;
  if (new URL(targetUrl, origin).origin !== origin) return;
  const fullUrl = new URL(targetUrl, origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Cari tab aplikasi yang sudah terbuka
        for (const client of clientList) {
          if (client.url.startsWith(origin) && 'focus' in client) {
            // Fokuskan tab tersebut, lalu kirim perintah OPEN_ROOM
            return client.focus().then((focusedClient) => {
              if (focusedClient) {
                focusedClient.postMessage({
                  type: 'OPEN_ROOM',
                  roomId: data.roomId,
                });
              }
            });
          }
        }
        // Tidak ada tab terbuka -> buka window baru ke deep link
        if (self.clients.openWindow) {
          return self.clients.openWindow(fullUrl);
        }
      })
  );
});

// Listener untuk mereset/menghapus notifikasi room jika dipanggil dari aplikasi
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_ROOM_NOTIFICATIONS') {
    const roomId = event.data.roomId;
    const tag = roomId ? `room-${roomId}` : null;
    self.registration.getNotifications(tag ? { tag } : {}).then((notifications) => {
      notifications.forEach((n) => n.close());
    });
  }
});

