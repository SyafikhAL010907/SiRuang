import { isAdminDev, isBuildingAdmin, isAnyAdmin } from './roles';

/**
 * Helper navigasi route dashboard berdasarkan role user yang tersimpan di localStorage / state.
 * - Admin / AdminDev / Admin Gedung -> '/admin' (Admin Gedung diarahkan ke tab 'booking-management' di dalam /admin)
 * - Dosen -> '/dosen'
 * - PJ Kelas -> '/pj'
 * - User/Mahasiswa -> '/user'
 * - Fallback (belum login) -> '/login'
 */
export function getRoleDashboardPath(role?: string): string {
  let targetRole = role;

  if (!targetRole && typeof window !== 'undefined') {
    try {
      targetRole = localStorage.getItem('role') || undefined;
      if (!targetRole) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          targetRole = parsed.role;
        }
      }
    } catch {
      // Ignored
    }
  }

  if (isAnyAdmin(targetRole)) {
    return '/admin';
  }

  switch (targetRole) {
    case 'dosen':
      return '/dosen';
    case 'pj_kelas':
      return '/pj';
    case 'user':
      return '/user';
    default:
      return '/login';
  }
}

