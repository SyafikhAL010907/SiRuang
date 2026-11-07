/**
 * Helper navigasi route dashboard berdasarkan role user yang tersimpan di localStorage.
 * - Admin -> '/admin'
 * - User/Mahasiswa/Dosen -> '/user'
 * - Fallback (belum login) -> '/'
 */
export function getRoleDashboardPath(): string {
  if (typeof window === 'undefined') return '/';
  try {
    const directRole = localStorage.getItem('role');
    if (directRole === 'admin') return '/admin';
    if (directRole === 'user') return '/user';

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      if (parsed.role === 'admin') return '/admin';
      if (parsed.role === 'user' || parsed.role) return '/user';
    }
  } catch {}
  return '/';
}

