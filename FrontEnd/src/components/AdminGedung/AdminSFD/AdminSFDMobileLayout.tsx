'use client';

import React from 'react';
import AdminGedungMobileLayoutBase from '../AdminGedungMobileLayoutBase';
import { GEDUNG_CONFIGS } from '../types';

export const AdminSFDMobileLayout: React.FC = () => {
  return <AdminGedungMobileLayoutBase config={GEDUNG_CONFIGS.SFD} />;
};

export default AdminSFDMobileLayout;
