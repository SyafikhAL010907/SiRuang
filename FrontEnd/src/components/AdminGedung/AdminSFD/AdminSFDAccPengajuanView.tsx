'use client';

import React from 'react';
import BookingManagementView from '../../Admin/Web&Tab/components/BookingManagementView';

export interface AdminSFDAccPengajuanViewProps {
  onBack?: () => void;
}

export const AdminSFDAccPengajuanView: React.FC<AdminSFDAccPengajuanViewProps> = ({ onBack = () => {} }) => {
  return <BookingManagementView userRole="admin_sfd" onBack={onBack} />;
};

export default AdminSFDAccPengajuanView;
