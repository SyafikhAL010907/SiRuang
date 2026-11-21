'use client';

import React from 'react';
import AdminGedungMainBase from '../AdminGedungMainBase';
import { GEDUNG_CONFIGS } from '../types';

export const AdminLEMain: React.FC = () => {
  return <AdminGedungMainBase config={GEDUNG_CONFIGS.LE} />;
};

export default AdminLEMain;
