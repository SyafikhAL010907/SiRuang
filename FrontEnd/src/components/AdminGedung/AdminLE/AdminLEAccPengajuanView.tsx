'use client';

import React from 'react';
import BookingManagementView from '../../Admin/Web&Tab/components/BookingManagementView';

export interface AdminLEAccPengajuanViewProps {
  onBack?: () => void;
}

export const AdminLEAccPengajuanView: React.FC<AdminLEAccPengajuanViewProps> = ({ onBack = () => {} }) => {
  return <BookingManagementView userRole="admin_le" onBack={onBack} />;
};

export default AdminLEAccPengajuanView;
