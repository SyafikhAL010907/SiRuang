/**
 * Helper terpusat untuk manajemen role di SiRuang.
 * Mendukung role lama ('admin') dan role baru ('admin_dev', 'admin_sfd', 'admin_le', 'admin_ls').
 */

export type UserRole =
  | 'admin'
  | 'admin_dev'
  | 'admin_sfd'
  | 'admin_le'
  | 'admin_ls'
  | 'dosen'
  | 'pj_kelas'
  | 'user';

export type Role = UserRole;

export const ALL_ADMIN_ROLES: readonly UserRole[] = [
  'admin',
  'admin_dev',
  'admin_sfd',
  'admin_le',
  'admin_ls',
] as const;

export const ADMIN_DEV_ROLES: readonly UserRole[] = [
  'admin',
  'admin_dev',
] as const;

export const BUILDING_ADMIN_ROLES: readonly UserRole[] = [
  'admin_sfd',
  'admin_le',
  'admin_ls',
] as const;

/**
 * Cek apakah role adalah AdminDev (termasuk role lama 'admin' untuk backward-compatibility).
 */
export function isAdminDev(role?: string | null): boolean {
  if (!role) return false;
  return role === 'admin' || role === 'admin_dev';
}

/**
 * Cek apakah role adalah Admin Gedung (admin_sfd, admin_le, admin_ls).
 */
export function isBuildingAdmin(role?: string | null): boolean {
  if (!role) return false;
  return role === 'admin_sfd' || role === 'admin_le' || role === 'admin_ls';
}

/**
 * Cek apakah role adalah admin jenis apa pun (admin, admin_dev, admin_sfd, admin_le, admin_ls).
 */
export function isAnyAdmin(role?: string | null): boolean {
  if (!role) return false;
  return isAdminDev(role) || isBuildingAdmin(role);
}

