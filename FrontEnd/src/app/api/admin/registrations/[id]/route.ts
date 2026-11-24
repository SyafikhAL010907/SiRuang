import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { isAdminDev } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const rawParams = await Promise.resolve(context?.params);
    const requestId = rawParams?.id;

    if (!requestId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
      return NextResponse.json({ error: 'ID pengajuan tidak valid' }, { status: 400 });
    }

    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    // 1. Cek otentikasi: Apakah admin login ATAU membawa token valid dari link email
    const user = await getUserFromRequest(request);
    const isAdmin = Boolean(user && isAdminDev(user.role));

    // 2. Ambil data pengajuan dari registration_requests
    const { data: reqData, error } = await supabaseServer
      .from('registration_requests')
      .select('id, username, identifier, identifier_type, requested_role, email, phone, faculty, kelas, prodi, angkatan, departemen, admin_token_hash, expires_at, created_at')
      .eq('id', requestId)
      .maybeSingle();

    if (error || !reqData) {
      return NextResponse.json(
        { error: 'Pengajuan akun tidak ditemukan atau sudah pernah diproses.' },
        { status: 404 }
      );
    }

    // 3. Validasi token jika bukan admin yang sedang login
    if (!isAdmin) {
      if (!token) {
        return NextResponse.json(
          { error: 'Akses ditolak: Anda harus login sebagai admin atau menggunakan token link email yang valid.' },
          { status: 403 }
        );
      }

      const inputHash = crypto.createHash('sha256').update(token).digest('hex');
      if (inputHash !== reqData.admin_token_hash) {
        return NextResponse.json(
          { error: 'Token pengajuan tidak valid atau sudah kedaluwarsa.' },
          { status: 403 }
        );
      }
    }

    // 4. Periksa masa berlaku pengajuan (expires_at)
    const isExpired = new Date(reqData.expires_at) < new Date();
    if (isExpired) {
      return NextResponse.json(
        { error: 'Masa berlaku pengajuan akun ini telah kedaluwarsa (lebih dari 7 hari).' },
        { status: 410 }
      );
    }

    // 5. Kembalikan data tanpa hash sensitif
    const { admin_token_hash, ...safeData } = reqData;
    return NextResponse.json({
      success: true,
      data: safeData,
      isAdminLoggedIn: Boolean(isAdmin),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

