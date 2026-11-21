'use client';

import React from 'react';
import AdminGedungMainBase from '../AdminGedungMainBase';
import { GEDUNG_CONFIGS } from '../types';

export const AdminSFDMain: React.FC = () => {
  return <AdminGedungMainBase config={GEDUNG_CONFIGS.SFD} />;
};

export default AdminSFDMain;
