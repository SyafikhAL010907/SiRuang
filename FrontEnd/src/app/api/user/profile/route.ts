import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/authHelper';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      message: 'Welcome to User Profile',
      identifier: user.identifier,
      identifier_type: user.identifier_type,
      role: user.role,
      username: user.username,
      gmail: user.identifier, // Fallback alias
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

