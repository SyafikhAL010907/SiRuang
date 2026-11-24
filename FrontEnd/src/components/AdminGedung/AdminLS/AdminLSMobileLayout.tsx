'use client';

import React from 'react';
import AdminGedungMobileLayoutBase from '../AdminGedungMobileLayoutBase';
import { GEDUNG_CONFIGS } from '../types';

export const AdminLSMobileLayout: React.FC = () => {
  return <AdminGedungMobileLayoutBase config={GEDUNG_CONFIGS.LS} />;
};

export default AdminLSMobileLayout;
