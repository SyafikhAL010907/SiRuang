import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = body.username?.trim();
    const identifier = body.identifier?.trim() || body.gmail?.trim();
    let identifierType = body.identifier_type?.trim() || 'nim';
    let role = body.role?.trim();
    const password = body.password;

    if (!username || !identifier || !password) {
      return NextResponse.json({ error: 'Data pendaftaran tidak lengkap' }, { status: 400 });
    }

    if (!role) {
      role = identifierType === 'nip' ? 'dosen' : 'user';
    }

    // 1. Cek apakah NIM/NIP sudah terdaftar sebelumnya
    const { data: existingUser } = await supabaseServer
      .from('authentication')
      .select('id')
      .eq('identifier', identifier)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Gagal mendaftarkan user. NIM/NIP ini sudah terdaftar di sistem.' },
        { status: 400 }
      );
    }

    // 2. Hash password bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Insert ke database Supabase
    const { error: insertError } = await supabaseServer.from('authentication').insert({
      username,
      identifier,
      identifier_type: identifierType,
      password: hashedPassword,
      role,
    });

    if (insertError) {
      return NextResponse.json(
        { error: 'Gagal mendaftarkan user: ' + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Pendaftaran berhasil! Silakan masuk.' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

