'use client';

/**
 * Denah Gedung LE - Lantai 1
 * MOBILE VIEW — tema Charcoal Noir
 *
 * Menggunakan LePage dengan mode compact:
 *  - ketuk ruangan untuk zoom
 *  - kartu ruangan tampil di bawah peta
 *  - kartu foto showcase menyesuaikan layar
 *  - alur ruangan tampil fullscreen
 */

import React from 'react';
import { LePage } from '../Web&Tab/Web&TabLayout';

export default function MobileLayout() {
  return <LePage compact />;
}
