'use client';

import React from 'react';
import AdminGedungWebLayoutBase from '../AdminGedungWebLayoutBase';
import { GEDUNG_CONFIGS } from '../types';

export const AdminLSWebTabLayout: React.FC = () => {
  return <AdminGedungWebLayoutBase config={GEDUNG_CONFIGS.LS} />;
};

export default AdminLSWebTabLayout;
