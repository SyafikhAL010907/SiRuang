// Konstanta mudah diubah
export const ROLES_NEVER_PUSHED: string[] = ['admin'];
export const BOT_SENDERS: string[] = ['admin_ai'];

/**
 * Tentukan apakah penerima harus mendapat push notification.
 * @param senderRole - role pengirim dari tabel authentication (atau 'admin' untuk admin_ai)
 * @param recipientRole - role penerima dari tabel authentication
 * @param senderIdentifier - identifier pengirim (NIM/NIP atau 'admin_ai')
 * @param recipientIdentifier - identifier penerima
 */
export function shouldPush(
  senderRole: string,
  recipientRole: string,
  senderIdentifier: string,
  recipientIdentifier: string
): boolean {
  // 1. Jangan pernah push ke pengirimnya sendiri
  if (senderIdentifier === recipientIdentifier) {
    return false;
  }

  // 2. Penerima ber-role admin TIDAK pernah dipush
  if (ROLES_NEVER_PUSHED.includes(recipientRole)) {
    return false;
  }

  // 3. Selain itu, penerima dipush
  return true;
}

