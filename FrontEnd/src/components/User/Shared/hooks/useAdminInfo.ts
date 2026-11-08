'use client';

import { useState, useEffect } from 'react';
import { getAvatarSrc } from '@/lib/avatarValidation';

const DEFAULT_ADMIN_AVATAR = '/LogoSiRuangPolos.png';
const REFRESH_MS = 30000; // cek ulang foto admin tiap 30 detik

/**
 * Ambil foto profil Admin UNJ dari backend (GET /api/chat/admin-info) supaya sisi user
 * ikut berubah saat admin ganti foto profil.
 *
 * - Nama field di response dibaca fleksibel: avatar_url / avatarUrl / avatar / photo_url,
 *   boleh juga dibungkus di `data`.
 */
export const useAdminInfo = (): string => {
  const [avatarSrc, setAvatarSrc] = useState<string>(DEFAULT_ADMIN_AVATAR);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      if (stopped) return;
      try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        let token = '';
        if (stored) {
          try {
            token = JSON.parse(stored).token || '';
          } catch {
            /* abaikan */
          }
        }

        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
        const res = await fetch(`${apiUrl}/chat/admin-info?_t=${Date.now()}`, {
          headers,
          cache: 'no-store',
        });

        if (!res.ok) {
          if (res.status === 404) {
            stopped = true;
            if (timer) clearInterval(timer);
          }
          return;
        }

        const json = await res.json().catch(() => null);
        const d = json?.data ?? json;
        const raw: string = d?.avatar_url ?? d?.avatarUrl ?? d?.avatar ?? d?.photo_url ?? '';
        if (raw) {
          setAvatarSrc(getAvatarSrc(raw));
        }
      } catch (err) {
        console.warn('[useAdminInfo] Gagal mengambil info profil admin:', err);
      }
    };

    load();
    timer = setInterval(load, REFRESH_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return avatarSrc;
};

export default useAdminInfo;
