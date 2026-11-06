'use client';

import React from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import WebTabLayout from './Web&Tab/Web&TabLayout';
import MobileLayout from './Mobile/MobileLayout';

export default function MainLantai4() { // <-- INI UDAH GUA FIX JADI MainLantai4
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileLayout />;
  }

  return <WebTabLayout />;
}