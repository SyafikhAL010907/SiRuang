'use client';

import { useState, useEffect, useCallback } from 'react';

export type PushStatus = 'unsupported' | 'denied' | 'granted' | 'default' | 'loading';

export interface UsePushNotificationsReturn {
  status: PushStatus;
  isLoading: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Hook untuk mengelola Web Push subscription.
 * Izin notifikasi HANYA diminta saat pengguna menekan tombol subscribe(),
 * BUKAN secara otomatis saat halaman dibuka.
 *
 * @param explicitToken - Optional JWT token user. Jika tidak disediakan, otomatis ambil dari localStorage['user'].token
 */
export function usePushNotifications(explicitToken?: string | null): UsePushNotificationsReturn {
  const [status, setStatus] = useState<PushStatus>('loading');
  const [isLoading, setIsLoading] = useState(false);

  // Helper untuk membaca JWT token dari localStorage bila tidak disediakan eksplisit
  const getToken = useCallback((): string | null => {
    if (explicitToken) return explicitToken;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.token || null;
        }
      } catch {}
    }
    return null;
  }, [explicitToken]);

  // Cek dukungan dan izin yang sudah ada saat mount TANPA meminta izin
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setStatus('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    // Periksa apakah sudah ada subscription aktif di browser
    navigator.serviceWorker
      .getRegistration('/sw.js')
      .then((reg) => {
        if (!reg) {
          setStatus(Notification.permission === 'granted' ? 'default' : (Notification.permission as PushStatus));
          return;
        }
        return reg.pushManager.getSubscription().then((sub) => {
          if (sub && Notification.permission === 'granted') {
            setStatus('granted');
          } else {
            setStatus(Notification.permission === 'denied' ? 'denied' : 'default');
          }
        });
      })
      .catch(() => {
        setStatus(Notification.permission === 'denied' ? 'denied' : 'default');
      });
  }, []);

  // Fungsi Subscribe (HANYA dijalankan saat pengguna menekan tombol)
  const subscribe = useCallback(async () => {
    if (typeof window === 'undefined') return;

    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setStatus('unsupported');
      return;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.warn('[usePushNotifications] NEXT_PUBLIC_VAPID_PUBLIC_KEY belum dikonfigurasi.');
      return;
    }

    const token = getToken();
    if (!token) {
      console.warn('[usePushNotifications] Token pengguna tidak ditemukan.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Minta izin notifikasi ke browser
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'default');
        setIsLoading(false);
        return;
      }

      // 2. Daftarkan Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // 3. Dapatkan atau buat subscription baru
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as BufferSource,
        });
      }

      // 4. Simpan subscription ke server
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!res.ok) {
        console.error('[usePushNotifications] Gagal simpan subscription ke server:', res.status);
        return;
      }

      setStatus('granted');
    } catch (err) {
      console.error('[usePushNotifications] Error saat subscribe:', err);
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        setStatus('denied');
      }
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  // Fungsi Unsubscribe
  const unsubscribe = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const token = getToken();
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          if (token) {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/push/unsubscribe`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ endpoint: subscription.endpoint }),
            });
          }
          await subscription.unsubscribe();
        }
      }
      setStatus('default');
    } catch (err) {
      console.error('[usePushNotifications] Error saat unsubscribe:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  return {
    status,
    isLoading,
    subscribe,
    unsubscribe,
  };
}
