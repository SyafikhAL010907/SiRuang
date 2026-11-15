import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';
import { sendEmail, escapeHtml } from '@/lib/mailer';
import { notifyBookingPush } from '@/lib/sendPush';
import { getPublicAppUrl } from '@/lib/appUrl';
import { generateCheckinToken } from '@/lib/checkinToken';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const rawToken = searchParams.get('token');

    if (!id || !rawToken) {
      return NextResponse.json(
        { error: 'ID booking dan token verifikasi wajib disertakan.' },
        { status: 400 }
      );
    }

    // Hash token untuk pencarian di database
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Cari booking
    const { data: booking, error } = await supabaseServer
      .from('bookings')
      .select(`
        id,
        room_id,
        pemohon_id,
        dosen_id,
        nama_pemohon,
        nim_pemohon,
        mata_kuliah,
        kelas,
        prodi,
        fakultas,
        angkatan,
        nama_dosen,
        tanggal,
        sks,
        jam_mulai,
        jam_selesai,
        is_conditional,
        official_schedule_id,
        status,
        alasan_tolak,
        dosen_token_hash,
        dosen_token_expires,
        dosen_responded_at,
        created_at,
        rooms:room_id (id, kode, nama, gedung, lantai)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !booking) {
      return NextResponse.json({ error: 'Pengajuan booking tidak ditemukan.' }, { status: 404 });
    }

    // Validasi token hash
    if (booking.dosen_token_hash !== tokenHash) {
      return NextResponse.json({ error: 'Token verifikasi tidak valid.' }, { status: 403 });
    }

    // Cek kadaluwarsa token
    if (booking.dosen_token_expires && new Date(booking.dosen_token_expires) < new Date()) {
      return NextResponse.json(
        {
          error: 'Link verifikasi ini sudah kedaluwarsa atau telah digunakan.',
          status: booking.status,
          responded_at: booking.dosen_responded_at,
        },
        { status: 410 }
      );
    }

    // Info jadwal resmi jika bersyarat
    let officialSchedule = null;
    if (booking.is_conditional && booking.official_schedule_id) {
      const { data: sched } = await supabaseServer
        .from('official_schedules')
        .select('id, mata_kuliah, kelas, nama_dosen, nama_pj, jadwal_hari, jam_mulai, jam_selesai')
        .eq('id', booking.official_schedule_id)
        .maybeSingle();
      officialSchedule = sched;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...booking,
        officialSchedule,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan server: ' + err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { token: rawToken, action, alasan } = body;

    if (!id || !rawToken) {
      return NextResponse.json(
        { error: 'ID booking dan token verifikasi wajib disertakan.' },
        { status: 400 }
      );
    }

    if (action !== 'setuju' && action !== 'tolak') {
      return NextResponse.json(
        { error: "Aksi tidak valid. Pilihan aksi: 'setuju' atau 'tolak'." },
        { status: 400 }
      );
    }

    // Validasi alasan jika tolak (min 10 karakter)
    if (action === 'tolak') {
      if (!alasan || alasan.trim().length < 10) {
        return NextResponse.json(
          { error: 'Alasan penolakan wajib diisi minimal 10 karakter.' },
          { status: 400 }
        );
      }
    }

    // Hash token
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Ambil booking
    const { data: booking, error: bErr } = await supabaseServer
      .from('bookings')
      .select(`
        *,
        rooms:room_id (id, kode, nama, gedung, lantai)
      `)
      .eq('id', id)
      .maybeSingle();

    if (bErr || !booking) {
      return NextResponse.json({ error: 'Pengajuan booking tidak ditemukan.' }, { status: 404 });
    }

    if (booking.dosen_token_hash !== tokenHash) {
      return NextResponse.json({ error: 'Token verifikasi tidak valid.' }, { status: 403 });
    }

    if (booking.dosen_token_expires && new Date(booking.dosen_token_expires) < new Date()) {
      return NextResponse.json(
        { error: 'Link verifikasi ini sudah kedaluwarsa atau telah digunakan.' },
        { status: 410 }
      );
    }

    if (booking.status !== 'menunggu_dosen') {
      return NextResponse.json(
        { error: `Pengajuan ini sudah ditinjau sebelumnya (Status saat ini: ${booking.status}).` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    // Jika dosen menyetujui, langsung disetujui (cukup dosen saja, tanpa perlu acc admin)
    const newStatus = action === 'setuju' ? 'disetujui_dosen' : 'ditolak_dosen';

    // Update status booking dan invalidasi token
    const { data: updatedBooking, error: uErr } = await supabaseServer
      .from('bookings')
      .update({
        status: newStatus,
        alasan_tolak: action === 'tolak' ? alasan.trim() : null,
        dosen_responded_at: now,
        admin_responded_at: action === 'setuju' ? now : null,
        dosen_token_expires: now, // Invalidasi token langsung
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (uErr) {
      return NextResponse.json(
        { error: 'Gagal memperbarui status booking: ' + uErr.message },
        { status: 500 }
      );
    }

    // Ambil email pemohon (PJ Kelas) dengan multiple fallback
    let pjEmail = '';
    let pjFullName = booking.nama_pemohon;

    // 1. Coba dari v_user_profiles via pemohon_id
    if (booking.pemohon_id) {
      const { data: p1 } = await supabaseServer
        .from('v_user_profiles')
        .select('email, full_name')
        .eq('user_id', booking.pemohon_id)
        .maybeSingle();
      if (p1?.email) {
        pjEmail = p1.email.trim();
        if (p1.full_name) pjFullName = p1.full_name;
      }
    }

    // 2. Coba dari v_user_profiles via nim_pemohon (identifier)
    if (!pjEmail && booking.nim_pemohon) {
      const { data: p2 } = await supabaseServer
        .from('v_user_profiles')
        .select('email, full_name')
        .eq('identifier', booking.nim_pemohon)
        .maybeSingle();
      if (p2?.email) {
        pjEmail = p2.email.trim();
        if (p2.full_name) pjFullName = p2.full_name;
      }
    }

    // 3. Coba dari tabel profiles langsung
    if (!pjEmail && booking.pemohon_id) {
      const { data: p3 } = await supabaseServer
        .from('profiles')
        .select('email, full_name')
        .eq('user_id', booking.pemohon_id)
        .maybeSingle();
      if (p3?.email) {
        pjEmail = p3.email.trim();
        if (p3.full_name) pjFullName = p3.full_name;
      }
    }

    // 4. Coba dari registration_requests
    if (!pjEmail && booking.nim_pemohon) {
      const { data: p4 } = await supabaseServer
        .from('registration_requests')
        .select('email')
        .eq('identifier', booking.nim_pemohon)
        .maybeSingle();
      if (p4?.email) {
        pjEmail = p4.email.trim();
      }
    }

    const roomKode = booking.rooms?.kode || 'Ruangan';
    const roomNama = booking.rooms?.nama || '';
    const appUrl = getPublicAppUrl(request);
    const checkinUrl = `${appUrl}/user?tab=checkin`;
    const checkinToken = generateCheckinToken(booking.id, booking.pemohon_id);
    const quickCheckinUrl = `${appUrl}/api/bookings/${booking.id}/quick-checkin?token=${checkinToken}`;

    // Fallback ke ADMIN_EMAIL jika email PJ belum terdaftar di profiles agar notifikasi check-in tidak hilang
    if (!pjEmail) {
      pjEmail = process.env.ADMIN_EMAIL?.trim() || process.env.SMTP_USER?.trim() || '';
      console.warn(`[review] Email PJ Kelas tidak ditemukan untuk pemohon_id: ${booking.pemohon_id}, nim: ${booking.nim_pemohon}. Menggunakan fallback: ${pjEmail}`);
    }

    // Kirim email notifikasi ke PJ Kelas (E2 atau E3)
    if (!pjEmail) {
      console.warn(`[review] Tidak ada email tujuan untuk PJ Kelas maupun Admin. Email notifikasi tidak dapat dikirim.`);
    } else {
      console.log(`[review] Mengirim email notifikasi E2/E3 ke PJ Kelas: ${pjEmail}`);
      if (action === 'setuju') {
        const mailRes = await sendEmail({
          to: pjEmail,
          subject: `[SiRuang] Pengajuan Ruangan ${roomKode} Disetujui Dosen — Silakan Cek Denah & Check-in`,
          template: 'E2',
          relatedId: booking.id,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
              
              <!-- Header Brand & Logo -->
              <div style="text-align: center; margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid #f1f5f9;">
                <img src="${appUrl}/icon-512.png" alt="SiRuang Logo" width="68" height="68" style="border-radius: 16px; box-shadow: 0 6px 14px rgba(24, 52, 73, 0.12); margin-bottom: 10px; display: inline-block;" />
                <h1 style="color: #183449; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.3px;">SiRuang &bull; Gedung SFD</h1>
                <p style="color: #64748b; font-size: 12px; margin: 3px 0 0 0; font-weight: 500;">Pemberitahuan Persetujuan &amp; Presensi Ruangan</p>
              </div>

              <div style="display: inline-block; background-color: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                &#10003; Telah Di-ACC Dosen
              </div>

              <h2 style="color: #166534; margin: 0 0 8px 0; font-size: 18px; font-weight: 800;">Booking Ruangan Berhasil Disetujui! 🎉</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 0;">Halo <strong>${escapeHtml(pjFullName)}</strong>,</p>
              
              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
                Kabar baik! Dosen pengampu <strong>${escapeHtml(booking.nama_dosen)}</strong> telah <strong>menyetujui (ACC)</strong> permohonan ruangan perkuliahan Anda:
              </p>

              <!-- Card Detail Pengajuan -->
              <div style="background-color: #fefce8; border: 1px solid #fef08a; border-left: 4px solid #eab308; padding: 16px 20px; margin: 18px 0; border-radius: 12px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="padding: 5px 0; color: #713f12; width: 140px;">Ruangan:</td>
                    <td style="padding: 5px 0; color: #1e293b; font-weight: 700;">${escapeHtml(roomKode)} - ${escapeHtml(roomNama)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #713f12;">Mata Kuliah:</td>
                    <td style="padding: 5px 0; color: #1e293b; font-weight: 700;">${escapeHtml(booking.mata_kuliah)} (${booking.sks} SKS)</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #713f12;">Waktu Kuliah:</td>
                    <td style="padding: 5px 0; color: #1e293b; font-weight: 700;">${escapeHtml(booking.tanggal)} &bull; ${booking.jam_mulai.slice(0, 5)} - ${booking.jam_selesai.slice(0, 5)} WIB</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #854d0e;">Status Denah:</td>
                    <td style="padding: 5px 0; color: #854d0e; font-weight: 800;">Ditandai KUNING (Disetujui Dosen &bull; Siap Check-in)</td>
                  </tr>
                </table>
              </div>

              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 8px; text-align: center;">
                Anda dapat langsung melakukan presensi kehadiran melalui tombol di bawah saat jam perkuliahan dimulai:
              </p>

              <!-- Tombol 1-Klik Check-In Langsung dari Email -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 20px auto; width: 100%; max-width: 440px;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${quickCheckinUrl}" style="background-color: #16a34a; background-image: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff; padding: 15px 28px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 14px; display: block; text-align: center; box-shadow: 0 4px 16px rgba(22, 163, 74, 0.35); letter-spacing: 0.2px;">
                      <span style="font-size: 16px; vertical-align: middle; margin-right: 6px;">&#10004;&#65039;</span><span style="vertical-align: middle;">Konfirmasi Check-in Sekarang</span>
                    </a>
                  </td>
                </tr>
              </table>

              <p style="text-align: center; margin: 12px 0 0 0;">
                <a href="${checkinUrl}" style="color: #588CBC; font-size: 12px; text-decoration: underline; font-weight: 600;">
                  atau buka menu Jadwal &amp; Check-in di dashboard web SiRuang
                </a>
              </p>

              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 26px 0 16px 0;" />
              <div style="background-color: #f8fafc; border-radius: 10px; padding: 12px 16px; border: 1px dashed #cbd5e1;">
                <p style="color: #64748b; font-size: 11px; margin: 0; line-height: 1.5;">
                  &bull; <strong>1-Klik Otomatis Aktif:</strong> Menekan tombol konfirmasi check-in langsung mengubah warna denah menjadi <strong>MERAH (Sedang Berlangsung)</strong> tanpa perlu login.<br />
                  &bull; Dosen pengampu akan otomatis menerima email konfirmasi bahwa kelas telah dimulai.
                </p>
              </div>
            </div>
          `,
        });
      } else {
        await sendEmail({
          to: pjEmail,
          subject: `[SiRuang] Pengajuan Ruangan ${roomKode} Ditolak Dosen`,
          template: 'E3',
          relatedId: booking.id,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #991b1b; margin-bottom: 8px;">Pengajuan Ditolak Dosen</h2>
              <p style="color: #64748b; font-size: 14px;">Halo <strong>${escapeHtml(booking.nama_pemohon)}</strong>,</p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Dosen pengampu <strong>${escapeHtml(booking.nama_dosen)}</strong> telah <strong>menolak</strong> permohonan peminjaman ruangan Anda untuk mata kuliah <strong>${escapeHtml(booking.mata_kuliah)}</strong>.
              </p>
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                <p style="margin: 4px 0; font-size: 13px;"><strong>Ruangan:</strong> ${escapeHtml(roomKode)}</p>
                <p style="margin: 4px 0; font-size: 13px;"><strong>Alasan Penolakan:</strong></p>
                <p style="margin: 4px 0; font-size: 14px; color: #7f1d1d; font-style: italic;">"${escapeHtml(alasan.trim())}"</p>
              </div>
              <p style="color: #64748b; font-size: 13px;">
                Silakan koordinasikan kembali dengan dosen terkait sebelum mengajukan peminjaman ulang.
              </p>
            </div>
          `,
        });
      }
    }

    // Kirim push notification ke PJ Kelas
    const pjIdentifier = booking.nim_pemohon || String(booking.pemohon_id);
    if (pjIdentifier) {
      try {
        if (action === 'setuju') {
          await notifyBookingPush(
            pjIdentifier,
            'Booking Disetujui Dosen!',
            `Ruangan ${roomKode} (${booking.mata_kuliah}) disetujui dosen (Kuning di denah). Silakan klik Check-in untuk mengubah warna menjadi Merah.`,
            `/denah-sfd/lantai${booking.rooms?.lantai || 8}`
          );
        } else {
          await notifyBookingPush(
            pjIdentifier,
            'Booking Ditolak Dosen',
            `Peminjaman ruangan ${roomKode} ditolak dosen: "${alasan.trim()}".`,
            '/user'
          );
        }
      } catch (pushErr) {
        console.warn('Gagal kirim push notification:', pushErr);
      }
    }

    return NextResponse.json({
      success: true,
      message:
        action === 'setuju'
          ? 'Pengajuan peminjaman ruangan berhasil disetujui dan langsung dijadwalkan.'
          : 'Pengajuan peminjaman ruangan berhasil ditolak.',
      data: updatedBooking,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan server: ' + err.message },
      { status: 500 }
    );
  }
}

