'use client';

/**
 * Denah Gedung SFD - Lantai 8
 * MOBILE VIEW — tema Charcoal Noir
 *
 * Isi halaman sama persis dengan Web & Tab (peta interaktif, showcase scroll,
 * alur Jadwal → Fasilitas → Lokasi → Booking). Bedanya hanya mode `compact`:
 *  - ketuk ruangan (bukan hover) untuk zoom
 *  - kartu ruangan tampil di bawah peta
 *  - kartu foto showcase pindah ke bawah layar
 *  - alur ruangan tampil fullscreen
 */

import React from 'react';
import { SfdPage } from '../Web&Tab/Web&TabLayout';

export default function MobileLayoutSfd() {
  return <SfdPage compact />;
}
