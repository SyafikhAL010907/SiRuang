'use client';

import React from 'react';
import AdminGedungSidebarBase, { AdminGedungSidebarBaseProps } from '../AdminGedungSidebarBase';
import { GEDUNG_CONFIGS } from '../types';

export type AdminSFDSidebarProps = Omit<AdminGedungSidebarBaseProps, 'config'>;

export const AdminSFDSidebar: React.FC<AdminSFDSidebarProps> = (props) => {
  return <AdminGedungSidebarBase config={GEDUNG_CONFIGS.SFD} {...props} />;
};

export default AdminSFDSidebar;
