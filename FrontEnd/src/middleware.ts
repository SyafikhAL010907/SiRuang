import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { isAnyAdmin, isAdminDev, isBuildingAdmin } from '@/lib/roles';

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

  // 1. Guard /admin routes
  if (pathname.startsWith('/admin')) {
    // Pengecualian: link review email /admin/registration/[id]?token=...
    // dapat diakses langsung untuk verifikasi token link
    if (pathname.startsWith('/admin/registration/')) {
      return NextResponse.next();
    }

    // Proteksi rute /admin/review/*: hanya untuk admin gedung
    if (pathname.startsWith('/admin/review/')) {
      const hasToken = request.nextUrl.searchParams.has('token');

      // Jika user sudah login sebagai AdminDev: tolak dan kembalikan ke /admin (view-only)
      if (decoded && isAdminDev(decoded.role)) {
        return NextResponse.redirect(new URL('/admin?viewOnly=true', request.url));
      }

      // Jika diakses via tautan email dengan token verifikasi: izinkan akses langsung (token divalidasi oleh halaman & API)
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

    if (!decoded || !isAnyAdmin(decoded.role)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 2. Guard /dosen routes
  if (pathname.startsWith('/dosen')) {
    if (!decoded || decoded.role !== 'dosen') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 3. Guard /pj routes
  if (pathname.startsWith('/pj')) {
    if (!decoded || decoded.role !== 'pj_kelas') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 4. Guard /user routes
  if (pathname.startsWith('/user')) {
    if (!decoded || decoded.role !== 'user') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 5. Guard /login: jika sudah punya cookie auth valid, arahkan langsung ke dashboard sesuai role
  if (pathname === '/login' && decoded) {
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    if (redirectParam && redirectParam.startsWith('/')) {
      // Cek apakah redirect cocok dengan role pengguna
      if (
        (redirectParam.startsWith('/admin') && isAnyAdmin(decoded.role)) ||
        (redirectParam.startsWith('/dosen') && decoded.role === 'dosen') ||
        (redirectParam.startsWith('/pj') && decoded.role === 'pj_kelas') ||
        (redirectParam.startsWith('/user') && decoded.role === 'user')
      ) {
        return NextResponse.redirect(new URL(redirectParam, request.url));
      }
    }

    if (isAnyAdmin(decoded.role)) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    switch (decoded.role) {
      case 'dosen':
        return NextResponse.redirect(new URL('/dosen', request.url));
      case 'pj_kelas':
        return NextResponse.redirect(new URL('/pj', request.url));
      case 'user':
        return NextResponse.redirect(new URL('/user', request.url));
      default:
        break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dosen/:path*',
    '/pj/:path*',
    '/user/:path*',
    '/login',
  ],
};


