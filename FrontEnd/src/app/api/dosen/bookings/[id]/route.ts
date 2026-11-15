import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { sendEmail, escapeHtml } from '@/lib/mailer';
import { notifyBookingPush } from '@/lib/sendPush';
import { generateCheckinToken } from '@/lib/checkinToken';
import { getPublicAppUrl } from '@/lib/appUrl';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'dosen') {
      return NextResponse.json({ error: 'Unauthorized: Akses khusus dosen' }, { status: 403 });
    }

    const { data: dbDosen } = await supabaseServer
      .from('authentication')
      .select('id, identifier, role')
      .eq('identifier', user.identifier)
      .maybeSingle();

    if (!dbDosen) {
      return NextResponse.json({ error: 'Akun dosen tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json();
    const { action, alasan } = body;

    if (action !== 'setuju' && action !== 'tolak') {
      return NextResponse.json(
        { error: "Aksi tidak valid. Pilihan: 'setuju' atau 'tolak'." },
        { status: 400 }
      );
    }

    if (action === 'tolak') {
      if (!alasan || alasan.trim().length < 10) {
        return NextResponse.json(
          { error: 'Alasan penolakan wajib diisi minimal 10 karakter.' },
          { status: 400 }
        );
      }
    }

    // Ambil booking & pastikan milik dosen yang login
    const { data: booking, error: bErr } = await supabaseServer
      .from('bookings')
      .select(`
        *,
        rooms:room_id (id, kode, nama, gedung, lantai)
      `)
      .eq('id', id)
      .maybeSingle();

    if (bErr || !booking) {
      return NextResponse.json({ error: 'Pengajuan booking tidak ditemukan' }, { status: 404 });
    }

    if (booking.dosen_id !== dbDosen.id) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki hak untuk merespon pengajuan booking ini.' },
        { status: 403 }
      );
    }

    if (booking.status !== 'menunggu_dosen') {
      return NextResponse.json(
        { error: `Pengajuan ini sudah ditinjau sebelumnya (Status: ${booking.status}).` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    // Jika dosen menyetujui, langsung disetujui (cukup dosen saja, tanpa perlu acc admin)
    const newStatus = action === 'setuju' ? 'disetujui_dosen' : 'ditolak_dosen';

    const { data: updatedBooking, error: uErr } = await supabaseServer
      .from('bookings')
      .update({
        status: newStatus,
        alasan_tolak: action === 'tolak' ? alasan.trim() : null,
        dosen_responded_at: now,
        admin_responded_at: action === 'setuju' ? now : null,
        dosen_token_expires: now, // Invalidate token
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

    // Ambil email pemohon (PJ) dengan fallback komprehensif
    let pjEmail = '';
    let pjFullName = booking.nama_pemohon;

    const { data: pjProfile } = await supabaseServer
      .from('v_user_profiles')
      .select('user_id, full_name, email, identifier')
      .eq('user_id', booking.pemohon_id)
      .maybeSingle();

    if (pjProfile?.email) {
      pjEmail = pjProfile.email.trim();
      if (pjProfile.full_name) pjFullName = pjProfile.full_name;
    }

    if (!pjEmail && booking.pemohon_id) {
      const { data: pDirect } = await supabaseServer
        .from('profiles')
        .select('email, full_name')
        .eq('user_id', booking.pemohon_id)
        .maybeSingle();
      if (pDirect?.email) {
        pjEmail = pDirect.email.trim();
        if (pDirect.full_name) pjFullName = pDirect.full_name;
      }
    }

    if (!pjEmail && booking.nim_pemohon) {
      const { data: pReg } = await supabaseServer
        .from('registration_requests')
        .select('email')
        .eq('identifier', booking.nim_pemohon)
        .maybeSingle();
      if (pReg?.email) {
        pjEmail = pReg.email.trim();
      }
    }

    const roomKode = booking.rooms?.kode || 'Ruangan';
    const roomNama = booking.rooms?.nama || '';
    const appUrl = getPublicAppUrl(request);
    const checkinToken = generateCheckinToken(booking.id, booking.pemohon_id);
    const quickCheckinUrl = `${appUrl}/api/bookings/${booking.id}/quick-checkin?token=${checkinToken}`;
    const checkinUrl = `${appUrl}/user?tab=checkin`;

    // Kirim email notifikasi ke PJ Kelas (E2 atau E3)
    if (pjEmail) {
      if (action === 'setuju') {
        await sendEmail({
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
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
              <div style="text-align: center; margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid #f1f5f9;">
                <img src="${appUrl}/icon-512.png" alt="SiRuang Logo" width="68" height="68" style="border-radius: 16px; box-shadow: 0 6px 14px rgba(24, 52, 73, 0.12); margin-bottom: 10px; display: inline-block;" />
                <h1 style="color: #183449; font-size: 20px; font-weight: 800; margin: 0;">SiRuang &bull; Gedung SFD</h1>
                <p style="color: #64748b; font-size: 12px; margin: 3px 0 0 0;">Pemberitahuan Penolakan Pengajuan Ruangan</p>
              </div>

              <div style="display: inline-block; background-color: #fee2e2; color: #991b1b; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                &#10005; Pengajuan Ditolak Dosen
              </div>

              <h2 style="color: #991b1b; margin: 0 0 8px 0; font-size: 18px; font-weight: 800;">Pengajuan Ruangan Tidak Disetujui</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 0;">Halo <strong>${escapeHtml(pjFullName)}</strong>,</p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Dosen pengampu <strong>${escapeHtml(booking.nama_dosen)}</strong> telah menolak permohonan ruangan untuk mata kuliah <strong>${escapeHtml(booking.mata_kuliah)}</strong> di ruangan <strong>${escapeHtml(roomKode)}</strong>.
              </p>
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 18px 0; border-radius: 10px;">
                <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #991b1b;">Alasan Penolakan:</p>
                <p style="margin: 0; font-size: 14px; color: #7f1d1d; font-style: italic;">"${escapeHtml(alasan.trim())}"</p>
              </div>
              <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
                Silakan berkoordinasi langsung dengan dosen pengampu atau ajukan peminjaman dengan jadwal/ruangan alternatif melalui web SiRuang.
              </p>
            </div>
          `,
        });
      }
    }

    // Kirim push notification ke PJ Kelas
    if (pjProfile?.identifier) {
      try {
        if (action === 'setuju') {
          await notifyBookingPush(
            pjProfile.identifier,
            'Booking Disetujui Dosen!',
            `Ruangan ${roomKode} (${booking.mata_kuliah}) disetujui dosen (Kuning di denah). Silakan klik Check-in untuk mengubah warna menjadi Merah.`,
            `/denah-sfd/lantai${booking.rooms?.lantai || 8}`
          );
        } else {
          await notifyBookingPush(
            pjProfile.identifier,
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

