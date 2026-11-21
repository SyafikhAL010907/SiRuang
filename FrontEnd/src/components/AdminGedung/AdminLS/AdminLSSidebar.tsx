'use client';

import React from 'react';
import AdminGedungSidebarBase, { AdminGedungSidebarBaseProps } from '../AdminGedungSidebarBase';
import { GEDUNG_CONFIGS } from '../types';

export type AdminLSSidebarProps = Omit<AdminGedungSidebarBaseProps, 'config'>;

export const AdminLSSidebar: React.FC<AdminLSSidebarProps> = (props) => {
  return <AdminGedungSidebarBase config={GEDUNG_CONFIGS.LS} {...props} />;
};

export default AdminLSSidebar;
