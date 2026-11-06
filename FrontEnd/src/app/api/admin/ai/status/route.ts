import { NextResponse } from 'next/server';

let isAIEnabled = true;

export async function GET() {
  return NextResponse.json({
    enabled: isAIEnabled,
    message: isAIEnabled ? 'AI Auto-Response Aktif' : 'AI Auto-Response Non-Aktif',
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    isAIEnabled = Boolean(body.enabled);
    return NextResponse.json({
      enabled: isAIEnabled,
      message: `AI Auto-Response berhasil di${isAIEnabled ? 'aktifkan' : 'nonaktifkan'}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

