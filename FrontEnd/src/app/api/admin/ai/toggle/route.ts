import { NextResponse } from 'next/server';
import { requireAdminDev } from '@/lib/authHelper';

export async function POST(request: Request) {
  try {
    const auth = await requireAdminDev(request);
    if ('errorResponse' in auth) return auth.errorResponse;

    const body = await request.json();
    const enabled = Boolean(body.enabled);
    return NextResponse.json({
      enabled,
      message: `AI Auto-Response berhasil di${enabled ? 'aktifkan' : 'nonaktifkan'}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

