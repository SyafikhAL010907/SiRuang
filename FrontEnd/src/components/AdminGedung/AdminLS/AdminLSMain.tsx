'use client';

import React from 'react';
import AdminGedungMainBase from '../AdminGedungMainBase';
import { GEDUNG_CONFIGS } from '../types';

export const AdminLSMain: React.FC = () => {
  return <AdminGedungMainBase config={GEDUNG_CONFIGS.LS} />;
};

export default AdminLSMain;
