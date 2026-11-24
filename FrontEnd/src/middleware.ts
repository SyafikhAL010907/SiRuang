import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { isAnyAdmin, isAdminDev, isBuildingAdmin } from '@/lib/roles';
import { getRoleDashboardPath } from '@/lib/roleNavigation';

interface DecodedToken {
  identifier: string;
  role: string;
  username: string;
}

const JWT_SECRET = process.env.JWT_SECRET || '';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value || request.cookies.get('token')?.value;

  let decoded: DecodedToken | null = null;

  if (token && JWT_SECRET) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      decoded = payload as unknown as DecodedToken;
    } catch {
      decoded = null;
    }
  }

  // 1. Pengecualian /admin/registration/[id]?token=... (email verification link)
  if (pathname.startsWith('/admin/registration/')) {
    return NextResponse.next();
  }

  // 2. Proteksi rute /admin/review/*: khusus admin gedung (atau email token)
  if (pathname.startsWith('/admin/review/')) {
    const hasToken = request.nextUrl.searchParams.has('token');

    // Jika user sudah login sebagai AdminDev: tolak dan kembalikan ke /admin-dev (view-only)
    if (decoded && isAdminDev(decoded.role)) {
      return NextResponse.redirect(new URL('/admin-dev?viewOnly=true', request.url));
    }

    // Jika diakses via tautan email dengan token verifikasi: izinkan akses langsung
    if (hasToken) {
      return NextResponse.next();
    }

    // Jika tanpa token: wajib login sebagai admin gedung
    if (!decoded || !isBuildingAdmin(decoded.role)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // 3. Guard rute /admin-dev: khusus Admin Developer
  if (pathname.startsWith('/admin-dev')) {
    if (!decoded) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdminDev(decoded.role)) {
      return NextResponse.redirect(new URL(getRoleDashboardPath(decoded.role), request.url));
    }
    return NextResponse.next();
  }

  // 4. Guard rute /admin-sfd: khusus Admin Gedung SFD
  if (pathname.startsWith('/admin-sfd')) {
    if (!decoded) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (decoded.role !== 'admin_sfd') {
      return NextResponse.redirect(new URL(getRoleDashboardPath(decoded.role), request.url));
    }
    return NextResponse.next();
  }

  // 5. Guard rute /admin-le: khusus Admin Gedung LE
  if (pathname.startsWith('/admin-le')) {
    if (!decoded) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (decoded.role !== 'admin_le') {
      return NextResponse.redirect(new URL(getRoleDashboardPath(decoded.role), request.url));
    }
    return NextResponse.next();
  }

  // 6. Guard rute /admin-ls: khusus Admin Gedung LS
  if (pathname.startsWith('/admin-ls')) {
    if (!decoded) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (decoded.role !== 'admin_ls') {
      return NextResponse.redirect(new URL(getRoleDashboardPath(decoded.role), request.url));
    }
    return NextResponse.next();
  }

  // 7. Guard /admin (legacy / entry): redirect ke dashboard spesifik per role
  if (pathname === '/admin' || pathname === '/admin/') {
    if (!decoded) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.redirect(new URL(getRoleDashboardPath(decoded.role), request.url));
  }

  // Guard sub-path /admin/* lainnya jika ada
  if (pathname.startsWith('/admin')) {
    if (!decoded || !isAnyAdmin(decoded.role)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 8. Guard /dosen routes
  if (pathname.startsWith('/dosen')) {
    if (!decoded || decoded.role !== 'dosen') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 9. Guard /pj routes
  if (pathname.startsWith('/pj')) {
    if (!decoded || decoded.role !== 'pj_kelas') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 10. Guard /user routes
  if (pathname.startsWith('/user')) {
    if (!decoded || decoded.role !== 'user') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 11. Guard /login: jika sudah punya cookie auth valid, arahkan langsung ke dashboard sesuai role
  if (pathname === '/login' && decoded) {
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    if (redirectParam && redirectParam.startsWith('/')) {
      if (
        (redirectParam.startsWith('/admin') && isAnyAdmin(decoded.role)) ||
        (redirectParam.startsWith('/dosen') && decoded.role === 'dosen') ||
        (redirectParam.startsWith('/pj') && decoded.role === 'pj_kelas') ||
        (redirectParam.startsWith('/user') && decoded.role === 'user')
      ) {
        return NextResponse.redirect(new URL(redirectParam, request.url));
      }
    }

    return NextResponse.redirect(new URL(getRoleDashboardPath(decoded.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/admin-dev',
    '/admin-dev/:path*',
    '/admin-sfd',
    '/admin-sfd/:path*',
    '/admin-le',
    '/admin-le/:path*',
    '/admin-ls',
    '/admin-ls/:path*',
    '/dosen',
    '/dosen/:path*',
    '/pj',
    '/pj/:path*',
    '/user',
    '/user/:path*',
    '/login',
  ],
};
