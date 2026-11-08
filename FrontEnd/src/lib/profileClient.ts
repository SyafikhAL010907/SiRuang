/**
 * profileClient.ts
 * Client service untuk memanggil endpoint Profile API:
 * - GET    /api/profile
 * - PUT    /api/profile
 * - POST   /api/profile/avatar
 * - DELETE /api/profile/avatar
 */

export interface UserProfileData {
  userId: number;
  username: string;
  identifier: string;
  identifierType: string;
  role: string;
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;
  faculty: string;
  avatarUrl: string;
  isDefaultAvatar: boolean;
}

export interface UpdateProfilePayload {
  fullName: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  faculty?: string;
}

export interface AvatarUploadResponse {
  avatarUrl: string;
  message: string;
}

const getBaseUrl = (): string => {
  const envUrl = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_API_URL : undefined;
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl.replace(/\/+$/, '');
  }
  // Di Vercel (Production) atau Next.js, gunakan relative endpoint /api
  return '/api';
};

const getAuthHeaders = (): HeadersInit => {
  let token = '';
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token') || '';
    if (!token) {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          token = parsed.token || '';
        }
      } catch {
        // Abaikan parse error
      }
    }
  }

  return {
    Authorization: token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '',
  };
};

/**
 * Mengambil profil user yang sedang login.
 */
export async function getProfile(): Promise<UserProfileData> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || `Gagal mengambil profil (${res.status})`);
  }

  return res.json();
}

/**
 * Memperbarui data profil milik user yang sedang login.
 */
export async function updateProfile(data: UpdateProfilePayload): Promise<UserProfileData> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || `Gagal memperbarui profil (${res.status})`);
  }

  return res.json();
}

/**
 * Mengunggah file avatar baru (multipart/form-data).
 */
export async function uploadAvatar(file: File): Promise<AvatarUploadResponse> {
  const baseUrl = getBaseUrl();
  const formData = new FormData();
  formData.append('file', file);

  const headers = getAuthHeaders() as Record<string, string>;

  const res = await fetch(`${baseUrl}/profile/avatar`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || `Gagal mengunggah foto (${res.status})`);
  }

  return res.json();
}

/**
 * Menghapus foto profil / mereset ke foto default (/LogoSiRuangPolos.png).
 */
export async function deleteAvatar(): Promise<UserProfileData> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/profile/avatar`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || `Gagal menghapus foto profil (${res.status})`);
  }

  return res.json();
}

