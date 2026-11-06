'use client';

import React from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import WebTabLayout from './Web&Tab/WebTabLayout';
import MobileLayout from './Mobile/MobileLayout';

export default function MainLanding() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileLayout />;
  }

  return <WebTabLayout />;
}
