import { isAdminDev, isBuildingAdmin, isAnyAdmin } from './roles';

/**
 * Helper navigasi route dashboard berdasarkan role user yang tersimpan di localStorage / state.
 * - Admin / AdminDev -> '/admin-dev'
 * - Admin SFD -> '/admin-sfd'
 * - Admin LE -> '/admin-le'
 * - Admin LS -> '/admin-ls'
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

  switch (targetRole) {
    case 'admin':
    case 'admin_dev':
      return '/admin-dev';
    case 'admin_sfd':
      return '/admin-sfd';
    case 'admin_le':
      return '/admin-le';
    case 'admin_ls':
      return '/admin-ls';
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

