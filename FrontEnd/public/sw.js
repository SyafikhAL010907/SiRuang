// public/sw.js
// Service Worker untuk SiRuang Web Push Notification

const GROUP_WINDOW_MS = 60 * 1000; // 60 detik jendela grouping notifikasi per room

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

  // Cek apakah ada tab aplikasi yang sedang terlihat (visible)
  // Chrome mewajibkan showNotification jika tidak ada visible client
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clientList) => {
        const hasVisible = clientList.some(
          (c) => c.visibilityState === 'visible'
        );
        if (hasVisible) {
          // Pengguna sedang aktif melihat aplikasi -> jangan munculkan notifikasi sistem
          return;
        }

        // Ambil notifikasi yang ada untuk tag ini
        const existingNotifications = await self.registration.getNotifications({ tag });
        const existingNotif = existingNotifications.length > 0 ? existingNotifications[0] : null;

        const now = Date.now();
        let count = 1;
        let renotify = true;
        let title = defaultTitle;

        if (existingNotif && existingNotif.data && typeof existingNotif.data.ts === 'number') {
          const elapsed = now - existingNotif.data.ts;
          if (elapsed <= GROUP_WINDOW_MS) {
            count = (existingNotif.data.count || 1) + 1;
            renotify = false;
            title = `Admin · ${count} pesan baru`;
          }
        }

        const options = {
          body: payload.body || '',
          icon: payload.icon || '/icon-192.png',
          badge: payload.badge || '/icon-192.png',
          tag: tag,
          renotify: renotify,
          data: {
            ...(payload.data || {}),
            ts: now,
            count: count,
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
  const fullUrl = new URL(targetUrl, origin).href;
  if (!fullUrl.startsWith(origin)) return;

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

