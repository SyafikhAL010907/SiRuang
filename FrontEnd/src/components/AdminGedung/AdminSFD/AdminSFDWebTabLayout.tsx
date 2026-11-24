'use client';

import React from 'react';
import AdminGedungWebLayoutBase from '../AdminGedungWebLayoutBase';
import { GEDUNG_CONFIGS } from '../types';

export const AdminSFDWebTabLayout: React.FC = () => {
  return <AdminGedungWebLayoutBase config={GEDUNG_CONFIGS.SFD} />;
};

export default AdminSFDWebTabLayout;
