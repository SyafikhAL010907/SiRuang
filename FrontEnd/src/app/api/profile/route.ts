import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/authHelper';
import { supabaseServer } from '@/lib/supabaseServer';

const WHATSAPP_REGEX = /^62[0-9]{8,13}$/;

function normalizeWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('8')) return '62' + digits;
  return digits;
}

// GET /api/profile
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Sesi tidak valid atau telah berakhir' }, { status: 401 });
    }

    // Ambil data profil dari view v_user_profiles
    const { data: profile, error } = await supabaseServer
      .from('v_user_profiles')
      .select('user_id, username, identifier, identifier_type, role, full_name, email, phone, whatsapp, faculty, avatar_url, is_default_avatar')
      .eq('identifier', user.identifier)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json({ error: 'Data profil tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      userId: profile.user_id,
      username: profile.username,
      identifier: profile.identifier,
      identifierType: profile.identifier_type,
      role: profile.role,
      fullName: profile.full_name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      whatsapp: profile.whatsapp || '',
      faculty: profile.faculty || '',
      avatarUrl: profile.avatar_url || '/LogoSiRuangPolos.png',
      isDefaultAvatar: profile.is_default_avatar ?? true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

// PUT /api/profile
export async function PUT(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Sesi tidak valid atau telah berakhir' }, { status: 401 });
    }

    // Dapatkan user_id dari identifier
    const { data: userRecord, error: userErr } = await supabaseServer
      .from('authentication')
      .select('id')
      .eq('identifier', user.identifier)
      .maybeSingle();

    if (userErr || !userRecord) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json();
    const fullName = (body.fullName || '').trim();
    const email = (body.email || '').trim();
    const phone = (body.phone || '').trim();
    const rawWA = (body.whatsapp || '').trim();
    const faculty = (body.faculty || '').trim();

    // 1. Validasi fullName
    if (!fullName || fullName.length > 150) {
      return NextResponse.json({ error: 'Nama lengkap wajib diisi (maksimal 150 karakter).' }, { status: 400 });
    }

    // 2. Validasi email
    if (email) {
      if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Format email tidak valid.' }, { status: 400 });
      }
    }

    // 3. Validasi phone
    if (phone) {
      if (phone.length > 20 || !/^[0-9+\s-]+$/.test(phone)) {
        return NextResponse.json(
          { error: 'Format nomor telepon tidak valid. Hanya diperbolehkan digit, +, spasi, dan strip.' },
          { status: 400 }
        );
      }
    }

    // 4. Validasi faculty
    if (faculty.length > 150) {
      return NextResponse.json({ error: 'Nama fakultas terlalu panjang (maksimal 150 karakter).' }, { status: 400 });
    }

    // 5. Normalisasi WhatsApp
    let cleanWA = '';
    if (rawWA) {
      cleanWA = normalizeWhatsapp(rawWA);
      if (!WHATSAPP_REGEX.test(cleanWA)) {
        return NextResponse.json(
          { error: 'Format nomor WhatsApp tidak valid. Gunakan format yang valid, misalnya 08123456789 atau 628123456789.' },
          { status: 400 }
        );
      }
    }

    // 6. Upsert ke tabel profiles
    const { error: upsertErr } = await supabaseServer
      .from('profiles')
      .upsert(
        {
          user_id: userRecord.id,
          full_name: fullName,
          email: email || null,
          phone: phone || null,
          whatsapp: cleanWA || null,
          faculty: faculty || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (upsertErr) {
      return NextResponse.json({ error: 'Gagal memperbarui profil: ' + upsertErr.message }, { status: 500 });
    }

    // 7. Ambil data profil terbaru dari view
    const { data: updatedProfile, error: fetchErr } = await supabaseServer
      .from('v_user_profiles')
      .select('user_id, username, identifier, identifier_type, role, full_name, email, phone, whatsapp, faculty, avatar_url, is_default_avatar')
      .eq('user_id', userRecord.id)
      .maybeSingle();

    if (fetchErr || !updatedProfile) {
      return NextResponse.json({ error: 'Gagal mengambil data profil terbaru' }, { status: 500 });
    }

    return NextResponse.json({
      userId: updatedProfile.user_id,
      username: updatedProfile.username,
      identifier: updatedProfile.identifier,
      identifierType: updatedProfile.identifier_type,
      role: updatedProfile.role,
      fullName: updatedProfile.full_name || '',
      email: updatedProfile.email || '',
      phone: updatedProfile.phone || '',
      whatsapp: updatedProfile.whatsapp || '',
      faculty: updatedProfile.faculty || '',
      avatarUrl: updatedProfile.avatar_url || '/LogoSiRuangPolos.png',
      isDefaultAvatar: updatedProfile.is_default_avatar ?? true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

