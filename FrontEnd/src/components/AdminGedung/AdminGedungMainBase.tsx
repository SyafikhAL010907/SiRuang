'use client';

import React, { useState, useEffect } from 'react';
import AdminGedungWebLayoutBase from './AdminGedungWebLayoutBase';
import AdminGedungMobileLayoutBase from './AdminGedungMobileLayoutBase';
import { AdminGedungConfig } from './types';

export interface AdminGedungMainBaseProps {
  config: AdminGedungConfig;
}

export const AdminGedungMainBase: React.FC<AdminGedungMainBaseProps> = ({ config }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-slate-200 border-t-[#588CBC]" />
      </div>
    );
  }

  if (isMobile) {
    return <AdminGedungMobileLayoutBase config={config} />;
  }

  return <AdminGedungWebLayoutBase config={config} />;
};

export default AdminGedungMainBase;

