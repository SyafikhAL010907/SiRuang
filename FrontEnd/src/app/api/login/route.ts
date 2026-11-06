import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseServer } from '@/lib/supabaseServer';
import { generateToken } from '@/lib/authHelper';

const MAX_ADMIN_DEVICES = 4;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = body.identifier?.trim() || body.gmail?.trim();
    const password = body.password;

    if (!identifier || !password) {
      return NextResponse.json({ error: 'NIM/NIP dan Password wajib diisi' }, { status: 400 });
    }

    // 1. Cari user di tabel authentication Supabase
    const { data: user, error } = await supabaseServer
      .from('authentication')
      .select('id, username, identifier, identifier_type, password, role')
      .eq('identifier', identifier)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ error: 'NIM/NIP atau Password salah' }, { status: 401 });
    }

    // 2. Cocokkan password bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'NIM/NIP atau Password salah' }, { status: 401 });
    }

    // 3. Batasan Device (Concurrent Session Check)
    const { count } = await supabaseServer
      .from('active_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('identifier', user.identifier);

    const activeCount = count || 0;

    if (user.role === 'admin') {
      // Hapus sesi admin yang lebih tua dari 24 jam
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabaseServer.from('active_sessions').delete().lt('last_activity', yesterday);

      if (activeCount >= MAX_ADMIN_DEVICES) {
        // Hapus sesi tertua admin agar sesi baru bisa masuk
        const { data: oldest } = await supabaseServer
          .from('active_sessions')
          .select('id')
          .eq('identifier', user.identifier)
          .order('last_activity', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (oldest) {
          await supabaseServer.from('active_sessions').delete().eq('id', oldest.id);
        }
      }
    } else {
      // Untuk Mahasiswa, Dosen, PJ Kelas: timpa sesi lama (auto kick sesi sebelumnya)
      // agar tidak pernah macet atau terkunci saat login ulang
      await supabaseServer.from('active_sessions').delete().eq('identifier', user.identifier);
    }

    // 4. Generate JWT Token
    const token = generateToken({
      identifier: user.identifier,
      identifier_type: user.identifier_type || 'nim',
      role: user.role,
      username: user.username,
    });

    // 5. Catat session baru ke Supabase
    await supabaseServer.from('active_sessions').insert({
      identifier: user.identifier,
      session_id: token,
      last_activity: new Date().toISOString(),
    });

    return NextResponse.json({
      token,
      username: user.username,
      identifier: user.identifier,
      identifier_type: user.identifier_type,
      role: user.role,
      gmail: user.identifier, // Fallback alias
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}
