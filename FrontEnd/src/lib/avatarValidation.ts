/**
 * avatarValidation.ts
 * Validasi sisi client untuk upload foto avatar.
 * Sumber kebenaran mutlak tetap ada pada validasi server Go (fileguard).
 */

export const MAX_AVATAR_BYTES = 1 * 1024 * 1024; // 1 MB
export const MAX_FILE_NAME_LEN = 100;

export const AVATAR_ERROR_MESSAGES = {
  INVALID_NAME: 'Nama file tidak valid. Gunakan file dengan satu ekstensi saja, misalnya foto.png atau foto.jpg.',
  UNSUPPORTED_FORMAT: 'Format file tidak didukung. Hanya PNG, JPG, dan JPEG yang diperbolehkan.',
  TOO_LARGE: 'Ukuran file terlalu besar. Maksimal 1 MB.',
  INVALID_CONTENT: 'File ini bukan gambar PNG/JPG yang valid.',
};

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

/**
 * Validasi kelayakan file avatar di browser sebelum dikirim ke API Go.
 */
export async function validateAvatarFile(file: File): Promise<{ valid: boolean; error?: string }> {
  // 1. Cek ukuran file (0 byte atau > 1 MB)
  if (!file || file.size === 0) {
    return { valid: false, error: AVATAR_ERROR_MESSAGES.INVALID_CONTENT };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { valid: false, error: AVATAR_ERROR_MESSAGES.TOO_LARGE };
  }

  // 2. Cek nama file
  const fileName = (file.name || '').trim();
  if (!fileName || fileName.length > MAX_FILE_NAME_LEN) {
    return { valid: false, error: AVATAR_ERROR_MESSAGES.INVALID_NAME };
  }

  // Tolak path separator, null byte
  if (/[\/\\\x00]/.test(fileName)) {
    return { valid: false, error: AVATAR_ERROR_MESSAGES.INVALID_NAME };
  }

  // Tolak jika diawali titik
  if (fileName.startsWith('.')) {
    return { valid: false, error: AVATAR_ERROR_MESSAGES.INVALID_NAME };
  }

  // Tolak double extension: harus tepat satu titik
  const dotCount = (fileName.match(/\./g) || []).length;
  if (dotCount !== 1) {
    return { valid: false, error: AVATAR_ERROR_MESSAGES.INVALID_NAME };
  }

  // Cek ekstensi
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  const allowedExts = ['.png', '.jpg', '.jpeg'];
  if (!allowedExts.includes(ext)) {
    return { valid: false, error: AVATAR_ERROR_MESSAGES.UNSUPPORTED_FORMAT };
  }

  // Cek Content-Type header part
  if (ext === '.png' && file.type !== 'image/png') {
    return { valid: false, error: AVATAR_ERROR_MESSAGES.UNSUPPORTED_FORMAT };
  }
  if ((ext === '.jpg' || ext === '.jpeg') && file.type !== 'image/jpeg') {
    return { valid: false, error: AVATAR_ERROR_MESSAGES.UNSUPPORTED_FORMAT };
  }

  // 3. Cek Magic Bytes lewat ArrayBuffer slice
  try {
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (ext === '.png') {
      if (bytes.length < 8) {
        return { valid: false, error: AVATAR_ERROR_MESSAGES.INVALID_CONTENT };
      }
      for (let i = 0; i < PNG_MAGIC.length; i++) {
        if (bytes[i] !== PNG_MAGIC[i]) {
          return { valid: false, error: AVATAR_ERROR_MESSAGES.INVALID_CONTENT };
        }
      }
    } else {
      // .jpg / .jpeg
      if (bytes.length < 3) {
        return { valid: false, error: AVATAR_ERROR_MESSAGES.INVALID_CONTENT };
      }
      for (let i = 0; i < JPEG_MAGIC.length; i++) {
        if (bytes[i] !== JPEG_MAGIC[i]) {
          return { valid: false, error: AVATAR_ERROR_MESSAGES.INVALID_CONTENT };
        }
      }
    }
  } catch (err) {
    return { valid: false, error: AVATAR_ERROR_MESSAGES.INVALID_CONTENT };
  }

  return { valid: true };
}

/**
 * Helper untuk menentukan src avatar.
 * Mengembalikan fallback /LogoSiRuangPolos.png jika null/kosong.
 */
export function getAvatarSrc(url?: string | null): string {
  if (!url || !url.trim() || url === '/LogoSiRuangPolos.png') {
    return '/LogoSiRuangPolos.png';
  }
  return url.trim();
}

