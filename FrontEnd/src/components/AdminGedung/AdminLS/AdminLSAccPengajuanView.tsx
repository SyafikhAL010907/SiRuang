'use client';

import React from 'react';
import BookingManagementView from '../../Admin/Web&Tab/components/BookingManagementView';

export interface AdminLSAccPengajuanViewProps {
  onBack?: () => void;
}

export const AdminLSAccPengajuanView: React.FC<AdminLSAccPengajuanViewProps> = ({ onBack = () => {} }) => {
  return <BookingManagementView userRole="admin_ls" onBack={onBack} />;
};

export default AdminLSAccPengajuanView;
