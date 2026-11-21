import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/chat/admin-info
 * Mengembalikan profil resmi Admin UNJ (avatar_url, nama lengkap, role)
 * agar sisi user dapat menampilkan foto profil asli admin yang sedang bertugas.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminIdentifier = searchParams.get('admin_identifier') || searchParams.get('identifier');

    // 1. Ambil data profil admin dari view v_user_profiles
    let query = supabaseServer
      .from('v_user_profiles')
      .select('user_id, username, identifier, role, full_name, email, avatar_url, is_default_avatar')
      .in('role', ['admin', 'admin_dev', 'admin_sfd', 'admin_le', 'admin_ls'])
      .order('user_id', { ascending: true })
      .limit(1);

    if (adminIdentifier) {
      query = query.eq('identifier', adminIdentifier);
    }

    const { data: adminProfile, error } = await query.maybeSingle();

    if (error) {
      console.warn('[GET /api/chat/admin-info] Peringatan query Supabase:', error.message);
    }

    // 2. Tentukan avatar admin (foto kustom atau logo resmi SiRuang)
    const rawAvatar = adminProfile?.avatar_url?.trim();
    const avatarUrl = rawAvatar && rawAvatar !== '' ? rawAvatar : '/LogoSiRuangPolos.png';
    const fullName = adminProfile?.full_name?.trim() || adminProfile?.username || 'Admin UNJ';

    return NextResponse.json({
      success: true,
      data: {
        avatar_url: avatarUrl,
        avatarUrl: avatarUrl,
        name: fullName,
        full_name: fullName,
        role: adminProfile?.role || 'admin',
        identifier: adminProfile?.identifier || '',
        is_default_avatar: adminProfile?.is_default_avatar ?? (avatarUrl === '/LogoSiRuangPolos.png'),
      },
      // Flat properties untuk kompatibilitas parsing di useAdminInfo
      avatar_url: avatarUrl,
      avatarUrl: avatarUrl,
      name: fullName,
      full_name: fullName,
      role: adminProfile?.role || 'admin',
      identifier: adminProfile?.identifier || '',
    });
  } catch (err: any) {
    console.error('[GET /api/chat/admin-info] Error:', err);
    // Fallback aman agar tidak 404/500
    return NextResponse.json({
      success: true,
      avatar_url: '/LogoSiRuangPolos.png',
      avatarUrl: '/LogoSiRuangPolos.png',
      name: 'Admin UNJ',
      full_name: 'Admin UNJ',
      role: 'admin',
      is_default_avatar: true,
    });
  }
}

