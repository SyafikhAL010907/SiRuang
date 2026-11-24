'use client';

import React from 'react';
import AdminGedungSidebarBase, { AdminGedungSidebarBaseProps } from '../AdminGedungSidebarBase';
import { GEDUNG_CONFIGS } from '../types';

export type AdminLESidebarProps = Omit<AdminGedungSidebarBaseProps, 'config'>;

export const AdminLESidebar: React.FC<AdminLESidebarProps> = (props) => {
  return <AdminGedungSidebarBase config={GEDUNG_CONFIGS.LE} {...props} />;
};

export default AdminLESidebar;
