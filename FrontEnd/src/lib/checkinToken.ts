import crypto from 'crypto';

/**
 * Generate HMAC token aman untuk 1-klik check-in dari email PJ Kelas
 * tanpa memerlukan perubahan skema tabel database.
 */
export function generateCheckinToken(bookingId: string | number, pemohonId: string | number): string {
  const secret = process.env.JWT_SECRET || 'siruang-quick-checkin-hmac-secret-default-key-2026';
  return crypto
    .createHmac('sha256', secret)
    .update(`checkin:${bookingId}:${pemohonId}`)
    .digest('hex');
}

/**
 * Verifikasi token check-in dari link email
 */
export function verifyCheckinToken(bookingId: string | number, pemohonId: string | number, token: string): boolean {
  if (!token) return false;
  const expected = generateCheckinToken(bookingId, pemohonId);
  try {
    const tokenBuf = Buffer.from(token, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (tokenBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(tokenBuf, expectedBuf);
  } catch {
    return false;
  }
}
