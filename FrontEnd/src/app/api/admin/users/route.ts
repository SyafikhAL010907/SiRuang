import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const { data: users, error } = await supabaseServer
      .from('authentication')
      .select('username, identifier, role')
      .neq('role', 'admin')
      .order('username', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Gagal mengambil user: ' + error.message }, { status: 500 });
    }

    const mapped = (users || []).map((u) => ({
      username: u.username,
      identifier: u.identifier,
      gmail: u.identifier, // Fallback alias
      role: u.role,
    }));

    return NextResponse.json(mapped);
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

