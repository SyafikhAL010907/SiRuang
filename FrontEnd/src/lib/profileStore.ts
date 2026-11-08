'use client';

import { useSyncExternalStore } from 'react';
import { getProfile, UserProfileData } from '@/lib/profileClient';

/**
 * Store ringan (tanpa library baru) supaya dashboard dan halaman profil
 * memakai data profil yang SAMA. Hasilnya, saat user klik profil di dashboard,
 * foto yang tampil langsung foto terbaru, tidak lewat logo default dulu.
 */

type Status = 'idle' | 'loading' | 'ready' | 'error';

interface StoreState {
  profile: UserProfileData | null;
  status: Status;
}

let state: StoreState = { profile: null, status: 'idle' };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

const setState = (next: Partial<StoreState>) => {
  state = { ...state, ...next };
  emit();
};

/** Muat gambar ke cache browser dulu, supaya saat dipakai langsung tampil. Maks tunggu 3 detik. */
const preloadImage = (url?: string | null): Promise<void> =>
  new Promise((resolve) => {
    if (!url || typeof window === 'undefined') return resolve();
    const img = new window.Image();
    const timer = window.setTimeout(resolve, 3000);
    const done = () => {
      window.clearTimeout(timer);
      resolve();
    };
    img.onload = done;
    img.onerror = done;
    img.src = url;
  });

/** Ambil profil dari backend. Aman dipanggil berkali-kali (request digabung). */
export function loadMyProfile(force = false): Promise<void> {
  if (inflight) return inflight;
  if (state.status === 'ready' && !force) return Promise.resolve();

  if (state.status !== 'ready') setState({ status: 'loading' });

  inflight = getProfile()
    .then(async (data) => {
      if (!data) {
        setState({ status: state.profile ? 'ready' : 'error' });
        return;
      }
      await preloadImage(data.avatarUrl);
      setState({ profile: data, status: 'ready' });
    })
    .catch(() => {
      setState({ status: state.profile ? 'ready' : 'error' });
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Ganti seluruh profil di cache (mis. setelah fetch di halaman profil). */
export function setMyProfile(profile: UserProfileData) {
  setState({ profile, status: 'ready' });
}

/** Ubah sebagian field (mis. setelah upload/hapus foto atau simpan profil). */
export function patchMyProfile(partial: Partial<UserProfileData>) {
  if (!state.profile) return;
  setState({ profile: { ...state.profile, ...partial } });
}

/** WAJIB dipanggil saat logout, supaya foto user sebelumnya tidak terbawa ke akun lain. */
export function clearMyProfile() {
  inflight = null;
  setState({ profile: null, status: 'idle' });
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

const getSnapshot = () => state;

export function useMyProfile(): StoreState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}