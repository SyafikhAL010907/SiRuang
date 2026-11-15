/**
 * Utility untuk mendapatkan URL publik aplikasi SiRuang.
 * Digunakan dalam tautan email (tombol ACC, tolak, check-in, dsb.)
 * Menjamin tautan email SELALU dapat dibuka dari HP maupun laptop
 * dan tidak akan pernah error 'localhost menolak untuk terhubung'.
 */
export function getPublicAppUrl(request?: Request): string {
  // 1. Jika request berasal dari browser dengan host publik (Vercel preview / custom domain)
  if (request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  }

  // 2. Jika NEXT_PUBLIC_APP_URL telah diset dan bukan localhost
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/$/, '');
  }

  // 3. Jika berjalan di Vercel (system VERCEL_URL)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
  }

  // 4. Default resmi produksi
  return 'https://si-ruang.vercel.app';
}

