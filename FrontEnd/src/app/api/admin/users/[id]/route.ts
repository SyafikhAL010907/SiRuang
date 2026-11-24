import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireAdminDev } from '@/lib/authHelper';

export const dynamic = 'force-dynamic';

const PROTECTED_DEMO_IDS = [1, 2, 3, 4, 6];

// 1. UPDATE USER (PUT)
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAdminDev(request);
    if ('errorResponse' in auth) return auth.errorResponse;
    const { user } = auth;

    const rawParams = await Promise.resolve(context?.params);
    const targetIdStr = rawParams?.id;
    const targetId = parseInt(targetIdStr || '', 10);

    if (isNaN(targetId) || targetId <= 0) {
      return NextResponse.json({ error: 'User ID tidak valid' }, { status: 400 });
    }

    const body = await request.json();
    const username = body.username?.trim();
    const fullName = body.full_name?.trim() || username;
    const role = body.role?.trim()?.toLowerCase();
    const email = body.email?.trim()?.toLowerCase() || null;
    const phone = body.phone?.trim() || null;
    const faculty = body.faculty?.trim() || body.fakultas?.trim() || null;
    const prodi = body.prodi?.trim() || null;
    const kelas = body.kelas?.trim() || null;
    const angkatan = body.angkatan?.trim() || null;
    const departemen = body.departemen?.trim() || null;
    const password = body.password?.trim();

    if (!username) {
      return NextResponse.json({ error: 'Nama pengguna (username) wajib diisi' }, { status: 400 });
    }

    // Whitelist role
    const validRoles = ['admin', 'dosen', 'pj_kelas', 'user'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Role tidak valid. Harus admin, dosen, pj_kelas, atau user' }, { status: 400 });
    }

    // Validasi email jika ada
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
    }

    // Validasi panjang password jika diubah
    if (password && (password.length < 8 || password.length > 72)) {
      return NextResponse.json({ error: 'Password baru harus antara 8 hingga 72 karakter' }, { status: 400 });
    }

    // 1. Update tabel authentication
    const authUpdatePayload: any = { username };
    if (role) authUpdatePayload.role = role;
    if (password) {
      authUpdatePayload.password = await bcrypt.hash(password, 10);
    }

    const { error: authErr } = await supabaseServer
      .from('authentication')
      .update(authUpdatePayload)
      .eq('id', targetId);

    if (authErr) {
      return NextResponse.json({ error: 'Gagal memperbarui authentication: ' + authErr.message }, { status: 500 });
    }

    // 2. Update atau Insert tabel profiles
    const { data: existingProf } = await supabaseServer
      .from('profiles')
      .select('id')
      .eq('user_id', targetId)
      .maybeSingle();

    const profileData = {
      full_name: fullName,
      email,
      phone,
      whatsapp: phone,
      faculty,
      kelas,
      prodi,
      angkatan,
      departemen,
      updated_at: new Date().toISOString(),
    };

    if (existingProf) {
      const { error: profErr } = await supabaseServer
        .from('profiles')
        .update(profileData)
        .eq('user_id', targetId);

      if (profErr) {
        return NextResponse.json({ error: 'Gagal memperbarui profile: ' + profErr.message }, { status: 500 });
      }
    } else {
      const { error: insertErr } = await supabaseServer
        .from('profiles')
        .insert({
          user_id: targetId,
          ...profileData,
        });

      if (insertErr) {
        return NextResponse.json({ error: 'Gagal membuat profile: ' + insertErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      message: 'Data pengguna berhasil diperbarui.',
      user_id: targetId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

// 2. DELETE USER (DELETE)
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAdminDev(request);
    if ('errorResponse' in auth) return auth.errorResponse;
    const { user } = auth;

    const rawParams = await Promise.resolve(context?.params);
    const targetIdStr = rawParams?.id;
    const targetId = parseInt(targetIdStr || '', 10);

    if (isNaN(targetId) || targetId <= 0) {
      return NextResponse.json({ error: 'User ID tidak valid' }, { status: 400 });
    }

    // Proteksi akun demo bawaan sistem
    if (PROTECTED_DEMO_IDS.includes(targetId)) {
      return NextResponse.json(
        { error: `Akun demo bawaan sistem (ID ${targetId}) dilindungi dan tidak dapat dihapus.` },
        { status: 400 }
      );
    }

    // Proteksi admin yang sedang aktif agar tidak menghapus akun sendiri
    const { data: adminRecord } = await supabaseServer
      .from('authentication')
      .select('id')
      .eq('identifier', user.identifier)
      .maybeSingle();

    if (adminRecord && adminRecord.id === targetId) {
      return NextResponse.json(
        { error: 'Anda tidak dapat menghapus akun admin Anda sendiri yang sedang aktif digunakan.' },
        { status: 400 }
      );
    }

    // Ambil identifier target untuk membersihkan active_sessions
    const { data: targetUser } = await supabaseServer
      .from('authentication')
      .select('id, identifier')
      .eq('id', targetId)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // 1. Bersihkan sesi aktif
    await supabaseServer
      .from('active_sessions')
      .delete()
      .or(`user_id.eq.${targetId},identifier.eq.${targetUser.identifier}`);

    // 2. Bersihkan relasi mata kuliah jika ada
    await supabaseServer
      .from('course_relations')
      .delete()
      .or(`dosen_id.eq.${targetId},pj_id.eq.${targetId}`);

    // 3. Hapus data profiles
    await supabaseServer
      .from('profiles')
      .delete()
      .eq('user_id', targetId);

    // 4. Hapus data authentication
    const { error: authDelErr } = await supabaseServer
      .from('authentication')
      .delete()
      .eq('id', targetId);

    if (authDelErr) {
      return NextResponse.json(
        { error: 'Gagal menghapus akun pengguna (kemungkinan ada data booking aktif yang berelasi): ' + authDelErr.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: `Akun pengguna ${targetUser.identifier} berhasil dihapus.`,
      user_id: targetId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

