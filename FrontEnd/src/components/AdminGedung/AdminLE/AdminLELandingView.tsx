'use client';

import React from 'react';
import AdminGedungLandingBase, { AdminGedungLandingBaseProps } from '../AdminGedungLandingBase';
import { GEDUNG_CONFIGS } from '../types';

export type AdminLELandingViewProps = Omit<AdminGedungLandingBaseProps, 'config'>;

export const AdminLELandingView: React.FC<AdminLELandingViewProps> = (props) => {
  return <AdminGedungLandingBase config={GEDUNG_CONFIGS.LE} {...props} />;
};

export default AdminLELandingView;
