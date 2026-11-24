'use client';

import React from 'react';
import AdminGedungLandingBase, { AdminGedungLandingBaseProps } from '../AdminGedungLandingBase';
import { GEDUNG_CONFIGS } from '../types';

export type AdminLSLandingViewProps = Omit<AdminGedungLandingBaseProps, 'config'>;

export const AdminLSLandingView: React.FC<AdminLSLandingViewProps> = (props) => {
  return <AdminGedungLandingBase config={GEDUNG_CONFIGS.LS} {...props} />;
};

export default AdminLSLandingView;
