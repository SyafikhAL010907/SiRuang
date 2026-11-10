'use client';

import { useState, useEffect } from 'react';
import { getAvatarSrc } from '@/lib/avatarValidation';

const DEFAULT_ADMIN_AVATAR = '/LogoSiRuangPolos.png';
const CACHE_KEY = 'admin_info_avatar_cache';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 menit

/**
 * Ambil foto profil Admin UNJ dari backend (GET /api/chat/admin-info).
 * Menggunakan cache sessionStorage dengan TTL 10 menit untuk menghemat egress Supabase.
 */
export const useAdminInfo = (): string => {
  const [avatarSrc, setAvatarSrc] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { avatar, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL_MS && avatar) {
            return avatar;
          }
        }
      } catch {}
    }
    return DEFAULT_ADMIN_AVATAR;
  });

  useEffect(() => {
    let stopped = false;

    const load = async () => {
      // 1. Cek cache sessionStorage terlebih dahulu
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { avatar, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL_MS && avatar) {
            setAvatarSrc(avatar);
            return;
          }
        }
      } catch {}

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
        const res = await fetch(`${apiUrl}/chat/admin-info`, {
          headers,
          cache: 'no-store',
        });

        if (!res.ok) {
          return;
        }

        const json = await res.json().catch(() => null);
        const d = json?.data ?? json;
        const raw: string = d?.avatar_url ?? d?.avatarUrl ?? d?.avatar ?? d?.photo_url ?? '';
        if (raw) {
          const formatted = getAvatarSrc(raw);
          setAvatarSrc(formatted);
          try {
            sessionStorage.setItem(
              CACHE_KEY,
              JSON.stringify({ avatar: formatted, timestamp: Date.now() })
            );
          } catch {}
        }
      } catch (err) {
        console.warn('[useAdminInfo] Gagal mengambil info profil admin:', err);
      }
    };

    load();

    return () => {
      stopped = true;
    };
  }, []);

  return avatarSrc;
};

export default useAdminInfo;
