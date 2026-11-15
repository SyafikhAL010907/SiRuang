import { NextResponse } from 'next/server';
import { after } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';
import { sendEmail, escapeHtml } from '@/lib/mailer';
import { getPublicAppUrl } from '@/lib/appUrl';

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
        const appUrl = getPublicAppUrl(request);

        const accUrl = `${appUrl}/api/admin/registrations/${newRequest.id}/quick-action?token=${rawAdminToken}&action=setuju`;
        const tolakUrl = `${appUrl}/api/admin/registrations/${newRequest.id}/quick-action?token=${rawAdminToken}&action=tolak`;
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
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
              
              <!-- Header Brand & Logo -->
              <div style="text-align: center; margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid #f1f5f9;">
                <img src="${appUrl}/icon-512.png" alt="SiRuang Logo" width="68" height="68" style="border-radius: 16px; box-shadow: 0 6px 14px rgba(24, 52, 73, 0.12); margin-bottom: 10px; display: inline-block;" />
                <h1 style="color: #183449; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.3px;">SiRuang &bull; Gedung SFD</h1>
                <p style="color: #64748b; font-size: 12px; margin: 3px 0 0 0; font-weight: 500;">Pusat Administrasi &amp; Verifikasi Akun Pengguna</p>
              </div>

              <div style="display: inline-block; background-color: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                Pendaftaran Akun Baru
              </div>

              <h2 style="color: #183449; margin: 0 0 8px 0; font-size: 18px; font-weight: 800;">Permohonan Akun Baru Membutuhkan Persetujuan</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 0;">Halo Administrator SiRuang,</p>
              
              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
                Terdapat pengajuan registrasi akun baru yang membutuhkan persetujuan Anda:
              </p>

              <!-- Card Detail Calon Pengguna -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #588CBC; padding: 16px 20px; margin: 18px 0; border-radius: 12px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="padding: 5px 0; color: #64748b; width: 140px;">Nama Lengkap:</td>
                    <td style="padding: 5px 0; color: #1e293b; font-weight: 700;">${escapeHtml(username)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #64748b;">${escapeHtml(identifierType.toUpperCase())}:</td>
                    <td style="padding: 5px 0; color: #1e293b; font-weight: 700;">${escapeHtml(identifier)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #64748b;">Role Diajukan:</td>
                    <td style="padding: 5px 0;">
                      <span style="background-color: #e0f2fe; color: #0369a1; padding: 3px 10px; border-radius: 6px; font-weight: 800; font-size: 12px;">${roleLabel}</span>
                    </td>
                  </tr>
                  ${email ? `<tr><td style="padding: 5px 0; color: #64748b;">Email Kontak:</td><td style="padding: 5px 0; color: #1e293b; font-weight: 600;">${escapeHtml(email)}</td></tr>` : ''}
                  ${kelas ? `<tr><td style="padding: 5px 0; color: #64748b;">Kelas:</td><td style="padding: 5px 0; color: #1e293b; font-weight: 600;">${escapeHtml(kelas)}</td></tr>` : ''}
                  ${prodi ? `<tr><td style="padding: 5px 0; color: #64748b;">Program Studi:</td><td style="padding: 5px 0; color: #1e293b; font-weight: 600;">${escapeHtml(prodi)}</td></tr>` : ''}
                  ${faculty ? `<tr><td style="padding: 5px 0; color: #64748b;">Fakultas:</td><td style="padding: 5px 0; color: #1e293b; font-weight: 600;">${escapeHtml(faculty)}</td></tr>` : ''}
                  ${phone ? `<tr><td style="padding: 5px 0; color: #64748b;">No. HP/WA:</td><td style="padding: 5px 0; color: #1e293b; font-weight: 600;">${escapeHtml(phone)}</td></tr>` : ''}
                </table>
              </div>

              <p style="color: #334155; font-size: 14px; font-weight: 600; margin: 20px 0 14px 0; text-align: center;">
                Berikan keputusan langsung melalui tombol aksi di bawah:
              </p>

              <!-- Tombol Aksi: ACC & Tolak -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 22px auto; width: 100%; max-width: 460px;">
                <tr>
                  <td align="center" style="padding: 6px; width: 50%;">
                    <a href="${accUrl}" style="background-color: #16a34a; background-image: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff; padding: 14px 24px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 14px; display: block; text-align: center; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.35); letter-spacing: 0.2px;">
                      &#10003; Setujui (ACC) Akun
                    </a>
                  </td>
                  <td align="center" style="padding: 6px; width: 50%;">
                    <a href="${tolakUrl}" style="background-color: #dc2626; background-image: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; padding: 14px 24px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 14px; display: block; text-align: center; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.3); letter-spacing: 0.2px;">
                      &#10005; Tolak Pendaftaran
                    </a>
                  </td>
                </tr>
              </table>

              <p style="text-align: center; margin: 12px 0 0 0;">
                <a href="${reviewLink}" style="color: #588CBC; font-size: 12px; text-decoration: underline; font-weight: 600;">
                  atau buka halaman review lengkap di dashboard admin
                </a>
              </p>

              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 26px 0 16px 0;" />
              <div style="background-color: #f8fafc; border-radius: 10px; padding: 12px 16px; border: 1px dashed #cbd5e1;">
                <p style="color: #64748b; font-size: 11px; margin: 0; line-height: 1.5;">
                  &bull; <strong>1-Klik Langsung Selesai:</strong> Menekan tombol Setujui (ACC) langsung mengaktifkan akun dan mengizinkan pengguna untuk login.<br />
                  &bull; <strong>Notifikasi Otomatis:</strong> Calon pengguna akan langsung otomatis menerima email konfirmasi aktivasi akun.
                </p>
              </div>
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
