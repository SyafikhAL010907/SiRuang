import webpush from 'web-push';

let isInitialized = false;
let isConfigured = false;

/**
 * Inisialisasi VAPID sekali saja (lazy, idempotent).
 * Jika env belum lengkap, menonaktifkan push dengan aman (console.warn, tidak throw).
 */
export function initWebPush(): void {
  if (isInitialized) return;
  isInitialized = true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    console.warn('[webPush] VAPID keys belum lengkap di environment variable. Web Push dinonaktifkan.');
    isConfigured = false;
    return;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    isConfigured = true;
  } catch (err: any) {
    console.warn('[webPush] Gagal konfigurasi VAPID keys:', err?.message || err);
    isConfigured = false;
  }
}

/**
 * Kirim satu push ke satu subscription.
 * Return:
 * - success: true jika berhasil terkirim
 * - expired: true jika endpoint sudah tidak valid (HTTP 404 / 410 Gone)
 * Tidak pernah melempar error (tidak throw).
 */
export async function sendOneNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string // JSON string
): Promise<{ success: boolean; expired: boolean }> {
  initWebPush();

  if (!isConfigured) {
    return { success: false, expired: false };
  }

  try {
    await webpush.sendNotification(subscription, payload);
    return { success: true, expired: false };
  } catch (err: any) {
    const statusCode = err?.statusCode || err?.status;
    if (statusCode === 404 || statusCode === 410) {
      return { success: false, expired: true };
    }
    console.warn('[webPush] Gagal mengirim push notification:', err?.message || err);
    return { success: false, expired: false };
  }
}

