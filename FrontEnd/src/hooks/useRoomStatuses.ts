'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface RoomStatusInfo {
  kode: string;
  nama: string;
  bookable: boolean;
  status: 'kosong' | 'dalam_pengajuan' | 'dipakai' | 'jadwal_resmi' | 'fasilitas_umum';
  color: string;
  fillColor: string;
  strokeColor: string;
  textColor: string;
  label: string;
  bookings: any[];
  schedules: any[];
}

interface UseRoomStatusesOptions {
  gedung?: string;
  lantai: number;
  tanggal?: string;
  jam?: string;
}

export function useRoomStatuses({ gedung = 'SFD', lantai, tanggal, jam }: UseRoomStatusesOptions) {
  const [roomStatuses, setRoomStatuses] = useState<Record<string, RoomStatusInfo>>({});
  const [loading, setLoading] = useState(true);

  const fetchStatuses = useCallback(async () => {
    try {
      const qTanggal = tanggal || new Date().toISOString().split('T')[0];
      const qJam = jam && jam !== 'all' ? `&jam=${encodeURIComponent(jam)}` : '';
      const res = await fetch(`/api/rooms/status?gedung=${gedung}&lantai=${lantai}&tanggal=${qTanggal}${qJam}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setRoomStatuses(json.data);
      }
    } catch (err) {
      console.warn('Gagal memuat status ruangan real-time:', err);
    } finally {
      setLoading(false);
    }
  }, [gedung, lantai, tanggal, jam]);

  useEffect(() => {
    fetchStatuses();

    // 1. Polling cadangan tiap 10 detik
    const timer = setInterval(() => {
      fetchStatuses();
    }, 10000);

    // 2. Real-time Subscription via Supabase Realtime channel (Gunakan ID unik per mount agar tidak bentrok)
    const channelTopic = `room_statuses_${gedung}_${lantai}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelTopic)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          // Ketika ada booking baru, berubah status, atau terhapus -> langsung refresh seketika!
          fetchStatuses();
        }
      )
      .subscribe();

    // 3. Listener event custom lokal untuk refresh instan antar-komponen
    const handleLocalUpdate = () => {
      fetchStatuses();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('siruang:booking-updated', handleLocalUpdate);
    }

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
      if (typeof window !== 'undefined') {
        window.removeEventListener('siruang:booking-updated', handleLocalUpdate);
      }
    };
  }, [fetchStatuses, gedung, lantai]);

  return { roomStatuses, loading, refresh: fetchStatuses };
}

