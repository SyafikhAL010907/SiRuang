'use client';

import React from 'react';
import AdminGedungLandingBase, { AdminGedungLandingBaseProps } from '../AdminGedungLandingBase';
import { GEDUNG_CONFIGS } from '../types';

export type AdminSFDLandingViewProps = Omit<AdminGedungLandingBaseProps, 'config'>;

export const AdminSFDLandingView: React.FC<AdminSFDLandingViewProps> = (props) => {
  return <AdminGedungLandingBase config={GEDUNG_CONFIGS.SFD} {...props} />;
};

export default AdminSFDLandingView;
