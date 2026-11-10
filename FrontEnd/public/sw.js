// public/sw.js
// Service Worker untuk SiRuang Web Push Notification

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Pesan baru', body: event.data.text(), data: { url: '/user?openChat=1' } };
  }

  const title = payload.title || 'Pesan baru';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'siruang-push',
    renotify: true, // dengan tag per room: ganti notif lama dan bunyikan notifikasi baru
    data: payload.data || {},
  };

  // Cek apakah ada tab aplikasi yang sedang terlihat (visible)
  // Chrome mewajibkan showNotification jika tidak ada visible client
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const hasVisible = clientList.some(
          (c) => c.visibilityState === 'visible'
        );
        if (hasVisible) {
          // Pengguna sedang aktif melihat aplikasi -> jangan munculkan notifikasi sistem
          return;
        }
        // Tab tidak terlihat / web ditutup -> tampilkan notifikasi sistem
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

