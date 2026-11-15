import { NextResponse } from 'next/server';
import { after } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';
import { sendEmail, escapeHtml } from '@/lib/mailer';

// In-memory rate limiting: max 5 requests per IP / identifier per 10 minutes
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(key: string, limit = 5, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);
  if (validTimestamps.length >= limit) {
    rateLimitMap.set(key, validTimestamps);
    return false;
  }
  validTimestamps.push(now);
  rateLimitMap.set(key, validTimestamps);
  return true;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Ambil IP untuk rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown-ip';

    const username = body.username?.trim();
    const identifier = body.identifier?.trim() || body.gmail?.trim();
    const rawRole = body.role_type?.trim()?.toLowerCase() || body.role?.trim()?.toLowerCase();
    const rawType = body.identifier_type?.trim()?.toLowerCase();
    const password = body.password;
    const rawEmail = body.email?.trim()?.toLowerCase();
    const email = rawEmail || null;
    const phone = body.phone?.trim() || null;
    const faculty = body.fakultas?.trim() || body.faculty?.trim() || null;
    const prodi = body.prodi?.trim() || null;
    const kelas = body.kelas?.trim() || null;
    const angkatan = body.angkatan?.trim() || null;
    const departemen = body.departemen?.trim() || null;

    // 2. Proteksi Rate Limiting
    const rateLimitKey = `${ip}_${identifier || 'no-id'}`;
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan pendaftaran. Silakan coba lagi dalam 10 menit.' },
        { status: 429 }
      );
    }

    // 3. Tentukan Role Pengajuan & Identifier Type
    let requestedRole: 'user' | 'pj_kelas' | 'dosen' = 'user';
    let identifierType: 'nim' | 'nip' = 'nim';

    if (rawRole === 'pj_kelas') {
      requestedRole = 'pj_kelas';
      identifierType = 'nim';
    } else if (rawRole === 'dosen' || rawType === 'nip') {
      requestedRole = 'dosen';
      identifierType = 'nip';
    } else {
      requestedRole = 'user';
      identifierType = 'nim';
    }

    // 4. Validasi Kehadiran Field Wajib Umum
    if (!username || !identifier || !password) {
      return NextResponse.json(
        { error: 'Data pendaftaran tidak lengkap. Nama, NIM/NIP, dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    // 5. Validasi Panjang Maksimum Kolom
    if (username.length > 150) {
      return NextResponse.json({ error: 'Nama lengkap maksimal 150 karakter.' }, { status: 400 });
    }
    if (identifier.length > 50) {
      return NextResponse.json({ error: 'NIM/NIP maksimal 50 karakter.' }, { status: 400 });
    }
    if (email && email.length > 150) {
      return NextResponse.json({ error: 'Email maksimal 150 karakter.' }, { status: 400 });
    }
    if (phone && phone.length > 20) {
      return NextResponse.json({ error: 'Nomor telepon maksimal 20 karakter.' }, { status: 400 });
    }
    if (faculty && faculty.length > 150) {
      return NextResponse.json({ error: 'Fakultas maksimal 150 karakter.' }, { status: 400 });
    }
    if (prodi && prodi.length > 100) {
      return NextResponse.json({ error: 'Program studi maksimal 100 karakter.' }, { status: 400 });
    }
    if (kelas && kelas.length > 20) {
      return NextResponse.json({ error: 'Kode kelas maksimal 20 karakter.' }, { status: 400 });
    }
    if (angkatan && angkatan.length > 4) {
      return NextResponse.json({ error: 'Tahun angkatan maksimal 4 karakter.' }, { status: 400 });
    }
    if (departemen && departemen.length > 100) {
      return NextResponse.json({ error: 'Departemen maksimal 100 karakter.' }, { status: 400 });
    }

    // 6. Validasi Panjang Password (8-72 karakter, batas bcrypt)
    if (password.length < 8 || password.length > 72) {
      return NextResponse.json(
        { error: 'Kata sandi harus berukuran antara 8 hingga 72 karakter.' },
        { status: 400 }
      );
    }

    // 7. Validasi Format Email (Jika ada)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Format email tidak valid.' }, { status: 400 });
    }

    // 8. Validasi Berdasarkan Role
    if (requestedRole === 'pj_kelas') {
      // PJ Kelas: Form Lengkap (NIM angka, email wajib, kelas, prodi, fakultas, angkatan)
      if (!/^\d+$/.test(identifier)) {
        return NextResponse.json({ error: 'NIM harus berupa angka saja.' }, { status: 400 });
      }
      if (!email) {
        return NextResponse.json({ error: 'Email wajib diisi untuk PJ Kelas.' }, { status: 400 });
      }
      if (!kelas || !prodi || !faculty || !angkatan) {
        return NextResponse.json(
          { error: 'Untuk PJ Kelas: kelas, program studi, fakultas, dan angkatan wajib diisi.' },
          { status: 400 }
        );
      }
      if (!/^\d{4}$/.test(angkatan)) {
        return NextResponse.json(
          { error: 'Tahun angkatan harus berupa 4 digit angka (contoh: 2024).' },
          { status: 400 }
        );
      }
    } else if (requestedRole === 'dosen') {
      // Dosen: NIP, email wajib
      if (!email) {
        return NextResponse.json({ error: 'Email wajib diisi untuk Dosen.' }, { status: 400 });
      }
    } else {
      // Mahasiswa (user): NIM harus angka saja
      if (!/^\d+$/.test(identifier)) {
        return NextResponse.json({ error: 'NIM harus berupa angka saja.' }, { status: 400 });
      }
    }

    // 9. Hapus Pengajuan yang Sudah Kedaluwarsa (expires_at < now()) untuk Identifier/Email Sama
    const nowIso = new Date().toISOString();
    await supabaseServer
      .from('registration_requests')
      .delete()
      .eq('identifier', identifier)
      .lt('expires_at', nowIso);

    if (email) {
      await supabaseServer
        .from('registration_requests')
        .delete()
        .eq('email', email)
        .lt('expires_at', nowIso);
    }

    // 10. Cek Duplikat di Tabel authentication (Akun Aktif)
    const { data: existingUser } = await supabaseServer
      .from('authentication')
      .select('id')
      .eq('identifier', identifier)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Gagal mendaftar. NIM/NIP ini sudah terdaftar sebagai akun aktif.' },
        { status: 400 }
      );
    }

    // 11. Cek Duplikat di Tabel registration_requests (Pengajuan Pending)
    const { data: pendingReq } = await supabaseServer
      .from('registration_requests')
      .select('id')
      .eq('identifier', identifier)
      .maybeSingle();

    if (pendingReq) {
      return NextResponse.json(
        { error: 'Pengajuan akun dengan NIM/NIP ini sedang menunggu persetujuan admin.' },
        { status: 400 }
      );
    }

    if (email) {
      const { data: pendingEmail } = await supabaseServer
        .from('registration_requests')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (pendingEmail) {
        return NextResponse.json(
          { error: 'Email ini sedang digunakan pada pengajuan akun lain yang belum diproses.' },
          { status: 400 }
        );
      }
    }

    // 12. Hash Password Bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // 13. Buat Token Admin Sekali Pakai (Hash SHA-256)
    const rawAdminToken = crypto.randomBytes(32).toString('hex');
    const adminTokenHash = crypto.createHash('sha256').update(rawAdminToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 hari

    // 14. Insert ke Tabel registration_requests
    const { data: newRequest, error: insertError } = await supabaseServer
      .from('registration_requests')
      .insert({
        identifier,
        identifier_type: identifierType,
        username,
        password_hash: hashedPassword,
        email,
        phone,
        faculty,
        prodi,
        kelas,
        angkatan,
        departemen,
        requested_role: requestedRole,
        admin_token_hash: adminTokenHash,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'NIM/NIP atau email ini sudah memiliki pengajuan akun yang sedang diproses.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Gagal mengajukan pendaftaran: ' + insertError.message },
        { status: 500 }
      );
    }

    // 15. Pengiriman Email E6 ke Admin via after() (Non-blocking, Fail-soft)
    after(async () => {
      try {
        const adminEmail = process.env.ADMIN_EMAIL || 'syafikhal09@gmail.com';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        const accUrl = `${appUrl}/admin/registration/${newRequest.id}?token=${rawAdminToken}&action=setuju`;
        const tolakUrl = `${appUrl}/admin/registration/${newRequest.id}?token=${rawAdminToken}&action=tolak`;
        const reviewLink = `${appUrl}/admin/registration/${newRequest.id}?token=${rawAdminToken}`;
        const roleLabel =
          requestedRole === 'dosen'
            ? 'Dosen'
            : requestedRole === 'pj_kelas'
            ? 'PJ Kelas'
            : 'Mahasiswa';

        await sendEmail({
          to: adminEmail,
          template: 'E6',
          subject: `[SiRuang] Pengajuan Akun Baru — ${username} (${roleLabel})`,
          relatedId: newRequest.id,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
              <h2 style="color: #183449; margin-bottom: 6px; font-size: 20px;">Permohonan Akun Baru</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 0;">Halo Administrator SiRuang,</p>
              
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Terdapat pengajuan pendaftaran akun baru yang membutuhkan persetujuan Admin:
              </p>

              <div style="background-color: #f8fafc; border-left: 4px solid #588CBC; padding: 14px 18px; margin: 18px 0; border-radius: 8px;">
                <p style="margin: 4px 0; font-size: 13px; color: #1e293b;"><strong>Nama Lengkap:</strong> ${escapeHtml(username)}</p>
                <p style="margin: 4px 0; font-size: 13px; color: #1e293b;"><strong>${escapeHtml(identifierType.toUpperCase())}:</strong> ${escapeHtml(identifier)}</p>
                <p style="margin: 4px 0; font-size: 13px; color: #1e293b;"><strong>Role yang Diajukan:</strong> <span style="background-color: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 6px; font-weight: bold;">${roleLabel}</span></p>
                ${email ? `<p style="margin: 4px 0; font-size: 13px; color: #1e293b;"><strong>Email Kontak:</strong> ${escapeHtml(email)}</p>` : ''}
                ${kelas ? `<p style="margin: 4px 0; font-size: 13px; color: #1e293b;"><strong>Kelas:</strong> ${escapeHtml(kelas)}</p>` : ''}
                ${prodi ? `<p style="margin: 4px 0; font-size: 13px; color: #1e293b;"><strong>Program Studi:</strong> ${escapeHtml(prodi)}</p>` : ''}
                ${faculty ? `<p style="margin: 4px 0; font-size: 13px; color: #1e293b;"><strong>Fakultas:</strong> ${escapeHtml(faculty)}</p>` : ''}
                ${angkatan ? `<p style="margin: 4px 0; font-size: 13px; color: #1e293b;"><strong>Angkatan:</strong> ${escapeHtml(angkatan)}</p>` : ''}
                ${departemen ? `<p style="margin: 4px 0; font-size: 13px; color: #1e293b;"><strong>Departemen:</strong> ${escapeHtml(departemen)}</p>` : ''}
                ${phone ? `<p style="margin: 4px 0; font-size: 13px; color: #1e293b;"><strong>No. HP/WA:</strong> ${escapeHtml(phone)}</p>` : ''}
              </div>

              <p style="color: #334155; font-size: 14px; margin-bottom: 14px;">
                Silakan berikan keputusan langsung melalui tombol di bawah:
              </p>

              <!-- Tombol Aksi: ACC & Tolak -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0; width: 100%;">
                <tr>
                  <td align="center" style="padding: 6px;">
                    <a href="${accUrl}" style="background-color: #16a34a; color: #ffffff; padding: 13px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(22, 163, 74, 0.2);">
                      ✓ Setujui (ACC) Akun
                    </a>
                  </td>
                  <td align="center" style="padding: 6px;">
                    <a href="${tolakUrl}" style="background-color: #dc2626; color: #ffffff; padding: 13px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);">
                      ✕ Tolak Pendaftaran
                    </a>
                  </td>
                </tr>
              </table>

              <p style="text-align: center; margin-top: 8px;">
                <a href="${reviewLink}" style="color: #588CBC; font-size: 12px; text-decoration: underline;">
                  atau buka halaman review lengkap di dashboard admin
                </a>
              </p>

              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
              <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.5;">
                Link verifikasi berlaku selama 7 hari. Begitu disetujui, akun langsung aktif dan email konfirmasi otomatis dikirimkan ke calon pengguna.
              </p>
            </div>
          `,
        });
      } catch (err: any) {
        console.error('[signup] Gagal mengirim email notifikasi E6:', err?.message || err);
      }
    });

    return NextResponse.json({
      message: 'Pendaftaran berhasil diajukan! Akun Anda sedang menunggu persetujuan admin.',
      pending: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}
