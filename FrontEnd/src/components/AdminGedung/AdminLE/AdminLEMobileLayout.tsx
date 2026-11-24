'use client';

import React from 'react';
import AdminGedungMobileLayoutBase from '../AdminGedungMobileLayoutBase';
import { GEDUNG_CONFIGS } from '../types';

export const AdminLEMobileLayout: React.FC = () => {
  return <AdminGedungMobileLayoutBase config={GEDUNG_CONFIGS.LE} />;
};

export default AdminLEMobileLayout;
