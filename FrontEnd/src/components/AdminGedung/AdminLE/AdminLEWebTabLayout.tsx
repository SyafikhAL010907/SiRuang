'use client';

import React from 'react';
import AdminGedungWebLayoutBase from '../AdminGedungWebLayoutBase';
import { GEDUNG_CONFIGS } from '../types';

export const AdminLEWebTabLayout: React.FC = () => {
  return <AdminGedungWebLayoutBase config={GEDUNG_CONFIGS.LE} />;
};

export default AdminLEWebTabLayout;
