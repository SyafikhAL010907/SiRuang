/**
 * Helper untuk menurunkan dan menampilkan status booking PJ Kelas
 * Kompatibel dengan status baru (menunggu_approval, dijadwalkan, ditolak)
 * dan status lama (menunggu_dosen, disetujui_dosen, dijadwalkan_admin, ditolak_dosen, ditolak_admin).
 */

export interface ApprovalPartyInfo {
  status: 'menunggu' | 'disetujui' | 'ditolak';
  label: string;
  badgeCls: string;
  alasan?: string;
}

export function getDosenApprovalInfo(booking: any): ApprovalPartyInfo {
  const approval = booking.approval_dosen;
  const status = booking.status;

  // 1. Cek kolom approval baru jika sudah terisi selain pending
  if (approval === 'disetujui') {
    return {
      status: 'disetujui',
      label: 'Disetujui',
      badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }

  if (approval === 'ditolak') {
    return {
      status: 'ditolak',
      label: 'Ditolak',
      badgeCls: 'bg-rose-50 text-rose-700 border-rose-200',
      alasan: booking.alasan_tolak_dosen || booking.alasan_tolak || undefined,
    };
  }

  // 2. Turunkan dari status lama jika approval_dosen masih pending
  if (
    status === 'disetujui_dosen' ||
    status === 'dijadwalkan_admin' ||
    status === 'dijadwalkan' ||
    status === 'menunggu_checkin' ||
    status === 'berlangsung' ||
    status === 'selesai' ||
    status === 'ditolak_admin' // Pada alur lama, ditolak_admin berarti dosen sudah ACC sebelumnya
  ) {
    return {
      status: 'disetujui',
      label: 'Disetujui',
      badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }

  if (status === 'ditolak_dosen') {
    return {
      status: 'ditolak',
      label: 'Ditolak',
      badgeCls: 'bg-rose-50 text-rose-700 border-rose-200',
      alasan: booking.alasan_tolak_dosen || booking.alasan_tolak || undefined,
    };
  }

  return {
    status: 'menunggu',
    label: 'Menunggu',
    badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',
  };
}

export function getAdminGedungApprovalInfo(booking: any): ApprovalPartyInfo {
  const approval = booking.approval_admin_gedung;
  const status = booking.status;

  // 1. Cek kolom approval baru jika sudah terisi selain pending
  if (approval === 'disetujui') {
    return {
      status: 'disetujui',
      label: 'Disetujui',
      badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }

  if (approval === 'ditolak') {
    return {
      status: 'ditolak',
      label: 'Ditolak',
      badgeCls: 'bg-rose-50 text-rose-700 border-rose-200',
      alasan: booking.alasan_tolak_admin_gedung || booking.alasan_tolak || undefined,
    };
  }

  // 2. Turunkan dari status lama jika approval_admin_gedung masih pending
  if (
    status === 'dijadwalkan_admin' ||
    status === 'dijadwalkan' ||
    status === 'menunggu_checkin' ||
    status === 'berlangsung' ||
    status === 'selesai'
  ) {
    return {
      status: 'disetujui',
      label: 'Disetujui',
      badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }

  if (status === 'ditolak_admin') {
    return {
      status: 'ditolak',
      label: 'Ditolak',
      badgeCls: 'bg-rose-50 text-rose-700 border-rose-200',
      alasan: booking.alasan_tolak_admin_gedung || booking.alasan_tolak || undefined,
    };
  }

  return {
    status: 'menunggu',
    label: 'Menunggu',
    badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',
  };
}

export function getCombinedStatusBadge(booking: any): { label: string; cls: string } {
  const status = booking.status;

  if (status === 'dijadwalkan' || status === 'dijadwalkan_admin') {
    return { label: 'Terjadwal', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  if (status === 'menunggu_checkin') {
    return { label: 'Menunggu Presensi', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
  }
  if (status === 'berlangsung') {
    return { label: 'Sedang Berlangsung', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  }
  if (status === 'selesai') {
    return { label: 'Selesai', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
  if (status === 'ditolak' || status === 'ditolak_dosen' || status === 'ditolak_admin') {
    return { label: 'Ditolak', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
  }
  if (status === 'dibatalkan' || status === 'dibatalkan_prioritas') {
    return { label: 'Dibatalkan', cls: 'bg-rose-50 text-rose-600 border-rose-200' };
  }
  if (status === 'hangus' || status === 'kedaluwarsa') {
    return { label: 'Hangus', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
  }

  // Menunggu approval (menunggu_approval / menunggu_dosen / disetujui_dosen)
  const dosen = getDosenApprovalInfo(booking);
  const admin = getAdminGedungApprovalInfo(booking);

  if (dosen.status === 'disetujui' && admin.status === 'menunggu') {
    return { label: 'Menunggu Admin Gedung', cls: 'bg-blue-50 text-[#183449] border-[#588CBC]/30' };
  }
  if (admin.status === 'disetujui' && dosen.status === 'menunggu') {
    return { label: 'Menunggu Dosen', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  }

  return { label: 'Menunggu Approval', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
}

export function isBookingRejected(booking: any): boolean {
  if (!booking) return false;
  const status = booking.status;
  if (status === 'ditolak' || status === 'ditolak_dosen' || status === 'ditolak_admin') {
    return true;
  }
  if (booking.approval_dosen === 'ditolak' || booking.approval_admin_gedung === 'ditolak') {
    return true;
  }
  return false;
}

export function getRejectionDetails(booking: any): { penolak: string; alasan: string } {
  let penolak = 'Dosen / Admin';
  let alasan = booking.alasan_tolak || '';

  const gedungName = booking.rooms?.gedung ? `Gedung ${booking.rooms.gedung}` : 'Admin Gedung';

  if (booking.approval_dosen === 'ditolak' || booking.status === 'ditolak_dosen') {
    penolak = `Dosen (${booking.nama_dosen || 'Pengampu'})`;
    alasan = booking.alasan_tolak_dosen || booking.alasan_tolak || 'Alasan tidak dicantumkan';
  } else if (booking.approval_admin_gedung === 'ditolak' || booking.status === 'ditolak_admin') {
    penolak = gedungName.startsWith('Admin') ? gedungName : `Admin ${gedungName}`;
    alasan = booking.alasan_tolak_admin_gedung || booking.alasan_tolak || 'Alasan tidak dicantumkan';
  } else if (booking.ditolak_oleh) {
    if (booking.ditolak_oleh === 'dosen') {
      penolak = `Dosen (${booking.nama_dosen || 'Pengampu'})`;
      alasan = booking.alasan_tolak_dosen || booking.alasan_tolak || 'Alasan tidak dicantumkan';
    } else {
      penolak = gedungName.startsWith('Admin') ? gedungName : `Admin ${gedungName}`;
      alasan = booking.alasan_tolak_admin_gedung || booking.alasan_tolak || 'Alasan tidak dicantumkan';
    }
  }

  return {
    penolak,
    alasan: alasan || 'Tidak ada keterangan penolakan',
  };
}

