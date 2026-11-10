import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/authHelper';
import { supabaseServer } from '@/lib/supabaseServer';

const MAX_AVATAR_BYTES = 1 * 1024 * 1024; // 1 MB
const MAX_FILE_NAME_LEN = 100;

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

// POST /api/profile/avatar
export async function POST(request: Request) {
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: "Field 'file' wajib diisi" }, { status: 400 });
    }

    // 1. Cek ukuran file
    if (file.size === 0) {
      return NextResponse.json({ error: 'File ini bukan gambar PNG/JPG yang valid.' }, { status: 400 });
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return NextResponse.json({ error: 'Ukuran file terlalu besar. Maksimal 1 MB.' }, { status: 413 });
    }

    // 2. Cek nama file
    const fileName = (file.name || '').trim();
    if (!fileName || fileName.length > MAX_FILE_NAME_LEN) {
      return NextResponse.json(
        { error: 'Nama file tidak valid. Gunakan file dengan satu ekstensi saja, misalnya foto.png atau foto.jpg.' },
        { status: 400 }
      );
    }

    // Tolak path separator, null byte, awalan titik
    if (/[\/\\\x00]/.test(fileName) || fileName.startsWith('.')) {
      return NextResponse.json(
        { error: 'Nama file tidak valid. Gunakan file dengan satu ekstensi saja, misalnya foto.png atau foto.jpg.' },
        { status: 400 }
      );
    }

    // Tolak double extension (harus tepat satu titik)
    const dotCount = (fileName.match(/\./g) || []).length;
    if (dotCount !== 1) {
      return NextResponse.json(
        { error: 'Nama file tidak valid. Gunakan file dengan satu ekstensi saja, misalnya foto.png atau foto.jpg.' },
        { status: 400 }
      );
    }

    const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
    const allowedExts = ['.png', '.jpg', '.jpeg'];
    if (!allowedExts.includes(ext)) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Hanya PNG, JPG, dan JPEG yang diperbolehkan.' },
        { status: 415 }
      );
    }

    // 3. Cek Magic Bytes
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const buffer = Buffer.from(arrayBuffer);

    let canonicalExt = 'jpg';
    let mimeType = 'image/jpeg';

    if (ext === '.png') {
      if (bytes.length < 8) {
        return NextResponse.json({ error: 'File ini bukan gambar PNG/JPG yang valid.' }, { status: 400 });
      }
      for (let i = 0; i < PNG_MAGIC.length; i++) {
        if (bytes[i] !== PNG_MAGIC[i]) {
          return NextResponse.json({ error: 'File ini bukan gambar PNG/JPG yang valid.' }, { status: 400 });
        }
      }
      canonicalExt = 'png';
      mimeType = 'image/png';
    } else {
      if (bytes.length < 3) {
        return NextResponse.json({ error: 'File ini bukan gambar PNG/JPG yang valid.' }, { status: 400 });
      }
      for (let i = 0; i < JPEG_MAGIC.length; i++) {
        if (bytes[i] !== JPEG_MAGIC[i]) {
          return NextResponse.json({ error: 'File ini bukan gambar PNG/JPG yang valid.' }, { status: 400 });
        }
      }
    }

    // 4. Generate path unik di Supabase Storage: {userId}/{randomHex}.{canonicalExt}
    const randomHex = crypto.randomUUID().replace(/-/g, '');
    const storagePath = `${userRecord.id}/${randomHex}.${canonicalExt}`;

    // Ambil foto lama untuk dihapus nanti jika upload berhasil
    const { data: oldProfile } = await supabaseServer
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', userRecord.id)
      .maybeSingle();

    const oldAvatarUrl = oldProfile?.avatar_url;

    // 5. Upload ke Supabase Storage bucket 'avatars'
    const { error: uploadErr } = await supabaseServer.storage
      .from('avatars')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadErr) {
      return NextResponse.json({ error: 'Gagal mengunggah foto ke storage: ' + uploadErr.message }, { status: 500 });
    }

    // Dapatkan URL publik dari storage
    const { data: publicUrlData } = supabaseServer.storage.from('avatars').getPublicUrl(storagePath);
    const publicUrl = publicUrlData.publicUrl;

    // 6. Simpan URL baru ke database
    const { error: updateErr } = await supabaseServer
      .from('profiles')
      .upsert(
        {
          user_id: userRecord.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (updateErr) {
      // Rollback: hapus file yang baru saja diupload
      await supabaseServer.storage.from('avatars').remove([storagePath]);
      return NextResponse.json({ error: 'Gagal menyimpan foto ke database' }, { status: 500 });
    }

    // 7. Hapus foto lama dari storage jika bukan foto default
    if (oldAvatarUrl && oldAvatarUrl.startsWith('https://') && oldAvatarUrl !== '/LogoSiRuangPolos.png') {
      try {
        const urlObj = new URL(oldAvatarUrl);
        const match = urlObj.pathname.match(/\/avatars\/(.+)$/);
        if (match && match[1]) {
          await supabaseServer.storage.from('avatars').remove([decodeURIComponent(match[1])]);
        }
      } catch (err) {
        console.warn('Gagal menghapus avatar lama dari storage:', err);
      }
    }

    return NextResponse.json({
      avatarUrl: publicUrl,
      message: 'Foto profil berhasil diperbarui',
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

// DELETE /api/profile/avatar
export async function DELETE(request: Request) {
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

    // Ambil avatar lama
    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', userRecord.id)
      .maybeSingle();

    const oldAvatarUrl = profile?.avatar_url;

    // Reset avatar_url = null di database
    await supabaseServer
      .from('profiles')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('user_id', userRecord.id);

    // Hapus dari storage jika ada
    if (oldAvatarUrl && oldAvatarUrl.startsWith('https://')) {
      try {
        const urlObj = new URL(oldAvatarUrl);
        const match = urlObj.pathname.match(/\/avatars\/(.+)$/);
        if (match && match[1]) {
          await supabaseServer.storage.from('avatars').remove([decodeURIComponent(match[1])]);
        }
      } catch (err) {
        console.warn('Gagal menghapus avatar lama dari storage:', err);
      }
    }

    // Ambil data profil terbaru dari view
    const { data: updatedProfile } = await supabaseServer
      .from('v_user_profiles')
      .select('user_id, username, identifier, identifier_type, role, full_name, email, phone, whatsapp, faculty, avatar_url, is_default_avatar')
      .eq('user_id', userRecord.id)
      .maybeSingle();

    return NextResponse.json({
      userId: updatedProfile?.user_id || userRecord.id,
      username: updatedProfile?.username || user.username,
      identifier: updatedProfile?.identifier || user.identifier,
      identifierType: updatedProfile?.identifier_type || user.identifier_type,
      role: updatedProfile?.role || user.role,
      fullName: updatedProfile?.full_name || '',
      email: updatedProfile?.email || '',
      phone: updatedProfile?.phone || '',
      whatsapp: updatedProfile?.whatsapp || '',
      faculty: updatedProfile?.faculty || '',
      avatarUrl: updatedProfile?.avatar_url || '/LogoSiRuangPolos.png',
      isDefaultAvatar: updatedProfile?.is_default_avatar ?? true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

