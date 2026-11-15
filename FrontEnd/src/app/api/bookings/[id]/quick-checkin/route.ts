import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { sendEmail, escapeHtml } from '@/lib/mailer';
import { notifyBookingPush } from '@/lib/sendPush';
import { getPublicAppUrl } from '@/lib/appUrl';
import { verifyCheckinToken } from '@/lib/checkinToken';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function renderHtmlCard({
  title,
  isSuccess,
  variant,
  heading,
  message,
  details,
  badgeText,
  appUrl,
}: {
  title: string;
  isSuccess: boolean;
  variant?: 'success' | 'error' | 'expired' | 'warning';
  heading: string;
  message: string;
  details?: { label: string; value: string }[];
  badgeText?: string;
  appUrl?: string;
}) {
  const isExpired = variant === 'expired';
  const iconColor = isExpired ? '#475569' : isSuccess ? '#16a34a' : '#dc2626';
  const iconBg = isExpired ? '#f1f5f9' : isSuccess ? '#dcfce7' : '#fee2e2';
  const iconSvg = isExpired
    ? `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`
    : isSuccess
    ? `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  const detailsHtml =
    details && details.length > 0
      ? `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 20px 0; text-align: left;">
        ${details
          .map(
            (d) =>
              `<div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px;">
                <span style="color: #64748b;">${escapeHtml(d.label)}</span>
                <span style="color: #1e293b; font-weight: 600; text-align: right; max-width: 60%;">${escapeHtml(d.value)}</span>
              </div>`
          )
          .join('')}
      </div>`
      : '';

  const badgeHtml = badgeText
    ? `<div style="display: inline-block; background-color: ${isSuccess ? '#fee2e2' : '#fef08a'}; color: ${isSuccess ? '#991b1b' : '#854d0e'}; padding: 6px 14px; border-radius: 9999px; font-weight: 800; font-size: 12px; margin-bottom: 16px; letter-spacing: 0.3px;">
        ${escapeHtml(badgeText)}
      </div>`
    : '';

  const dashboardUrl = appUrl ? `${appUrl}/user?tab=checkin` : '/user';

  return new NextResponse(
    `<!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${escapeHtml(title)} - SiRuang</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        body { background-color: #f1f5f9; color: #1e293b; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .card { background: #ffffff; max-width: 520px; width: 100%; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); padding: 32px 28px; text-align: center; border: 1px solid #e2e8f0; }
        .icon-wrapper { width: 72px; height: 72px; border-radius: 50%; background: ${iconBg}; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        h1 { font-size: 20px; color: #183449; font-weight: 800; margin-bottom: 10px; line-height: 1.3; }
        p.desc { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 16px; }
        .btn-action { display: inline-block; width: 100%; max-width: 280px; background-color: #183449; background-image: linear-gradient(135deg, #183449 0%, #0f172a 100%); color: #ffffff; padding: 13px 24px; border-radius: 12px; border: none; font-weight: 700; font-size: 14px; cursor: pointer; text-decoration: none; margin-top: 10px; box-shadow: 0 4px 14px rgba(24, 52, 73, 0.25); }
        .footer { font-size: 12px; color: #94a3b8; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon-wrapper">
          ${iconSvg}
        </div>
        ${badgeHtml}
        <h1>${escapeHtml(heading)}</h1>
        <p class="desc">${message}</p>
        ${detailsHtml}
        <a href="${dashboardUrl}" class="btn-action">Lihat Status di Denah Web &rarr;</a>
        <div class="footer">
          Sistem Informasi Peminjaman Ruangan &bull; SiRuang SFD
        </div>
      </div>
    </body>
    </html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const rawParams = await Promise.resolve(context?.params);
    const bookingId = rawParams?.id;
    const { searchParams } = new URL(request.url);
    const rawToken = searchParams.get('token');
    const appUrl = getPublicAppUrl(request);

    if (!bookingId || !rawToken) {
      return renderHtmlCard({
        title: 'Tautan Tidak Lengkap',
        isSuccess: false,
        heading: 'Tautan Tidak Valid',
        message: 'ID peminjaman atau token check-in tidak ditemukan pada tautan.',
        appUrl,
      });
    }

    // Ambil booking dari database
    const { data: booking, error: bErr } = await supabaseServer
      .from('bookings')
      .select(`
        *,
        rooms:room_id (id, kode, nama, gedung, lantai)
      `)
      .eq('id', bookingId)
      .maybeSingle();

    if (bErr || !booking) {
      return renderHtmlCard({
        title: 'Booking Tidak Ditemukan',
        isSuccess: false,
        heading: 'Peminjaman Tidak Ditemukan',
        message: 'Data permohonan peminjaman ruangan ini tidak ditemukan di sistem.',
        appUrl,
      });
    }

    // Verifikasi Token Check-in
    const isValidToken = verifyCheckinToken(booking.id, booking.pemohon_id, rawToken);
    if (!isValidToken) {
      return renderHtmlCard({
        title: 'Token Tidak Valid',
        isSuccess: false,
        heading: 'Akses Ditolak',
        message: 'Token otorisasi check-in tidak valid atau sudah tidak berlaku.',
        appUrl,
      });
    }

    const roomKode = booking.rooms?.kode || 'Ruangan';
    const roomNama = booking.rooms?.nama || '';

    // Jika sudah pernah check-in sebelumnya
    if (booking.status === 'berlangsung') {
      return renderHtmlCard({
        title: 'Sudah Check-In',
        isSuccess: true,
        variant: 'expired',
        badgeText: 'STATUS DENAH: MERAH (SEDANG DIGUNAKAN)',
        heading: 'Presensi Check-in Sudah Aktif',
        message: `Peminjaman untuk <strong>Ruangan ${escapeHtml(roomKode)}</strong> (${escapeHtml(booking.mata_kuliah)}) sudah berhasil di-check-in sebelumnya dan sedang aktif digunakan.<br /><br /><span style="color: #64748b; font-size: 13px;">Tombol pada email ini sudah kedaluwarsa untuk mencegah check-in berulang.</span>`,
        details: [
          { label: 'Ruangan', value: `${roomKode} - ${roomNama}` },
          { label: 'Mata Kuliah', value: `${booking.mata_kuliah} (${booking.sks} SKS)` },
          { label: 'Dosen Pengampu', value: booking.nama_dosen },
          { label: 'Jadwal Kuliah', value: `${booking.tanggal} (${booking.jam_mulai.slice(0, 5)} - ${booking.jam_selesai.slice(0, 5)} WIB)` },
          { label: 'Waktu Check-in', value: booking.check_in_at ? new Date(booking.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : 'Sudah Aktif' },
        ],
        appUrl,
      });
    }

    if (booking.status === 'selesai') {
      return renderHtmlCard({
        title: 'Sesi Selesai',
        isSuccess: false,
        variant: 'expired',
        badgeText: 'STATUS: PERKULIAHAN SELESAI',
        heading: 'Sesi Peminjaman Telah Berakhir',
        message: `Peminjaman ruangan <strong>${escapeHtml(roomKode)}</strong> telah selesai digunakan.`,
        appUrl,
      });
    }

    // Pastikan status saat ini memenuhi syarat check-in (sudah di-ACC dosen atau admin)
    if (
      booking.status !== 'disetujui_dosen' &&
      booking.status !== 'dijadwalkan_admin' &&
      booking.status !== 'menunggu_checkin'
    ) {
      return renderHtmlCard({
        title: 'Belum Dapat Check-In',
        isSuccess: false,
        heading: 'Belum Memenuhi Syarat',
        message: `Peminjaman ini saat ini berstatus <strong>'${escapeHtml(booking.status)}'</strong>. Check-in hanya dapat dilakukan setelah permohonan disetujui (ACC) oleh dosen pengampu.`,
        appUrl,
      });
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // UPDATE STATUS BOOKING KE 'berlangsung'
    const { error: uErr } = await supabaseServer
      .from('bookings')
      .update({
        status: 'berlangsung',
        check_in_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', booking.id);

    if (uErr) {
      return renderHtmlCard({
        title: 'Gagal Check-In',
        isSuccess: false,
        heading: 'Gagal Memperbarui Status',
        message: 'Terjadi kesalahan sistem saat memperbarui status check-in: ' + uErr.message,
        appUrl,
      });
    }

    // Catat log ke checkin_logs
    try {
      await supabaseServer.from('checkin_logs').insert({
        booking_id: booking.id,
        schedule_id: booking.official_schedule_id || null,
        user_id: booking.pemohon_id,
        checked_in_at: nowIso,
        check_type: booking.is_conditional ? 'conditional' : 'booking',
        tanggal: booking.tanggal,
      });
    } catch (logErr) {
      console.warn('[quick-checkin] Gagal insert checkin_logs:', logErr);
    }

    // Kirim push notification ke PJ Kelas
    try {
      await notifyBookingPush(
        booking.nim_pemohon || String(booking.pemohon_id),
        'Check-in Berhasil!',
        `Presensi ruangan ${roomKode} berhasil dikonfirmasi via email. Warna denah kini berubah menjadi MERAH.`,
        '/user?tab=checkin'
      );
    } catch (pushErr) {
      console.warn('[quick-checkin] Push notification gagal:', pushErr);
    }

    // Kirim email notifikasi check-in (E4 ke Dosen & E5 ke PJ) secara fail-soft
    try {
      const { data: participants } = await supabaseServer
        .from('v_user_profiles')
        .select('user_id, email, full_name, role')
        .in('user_id', [booking.dosen_id, booking.pemohon_id]);

      const dosenProf = participants?.find((p) => p.user_id === booking.dosen_id);
      const pjProf = participants?.find((p) => p.user_id === booking.pemohon_id);

      const targetDosenEmail = dosenProf?.email || '';
      const targetPjEmail = pjProf?.email || '';

      const emailPromises: Promise<any>[] = [];

      // E4: Email ke Dosen pengampu
      if (targetDosenEmail) {
        emailPromises.push(
          sendEmail({
            to: targetDosenEmail,
            subject: `[SiRuang] Presensi Check-in Selesai: ${roomKode} (${booking.mata_kuliah})`,
            template: 'E4',
            relatedId: booking.id,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                <div style="text-align: center; margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid #f1f5f9;">
                  <img src="${appUrl}/icon-512.png" alt="SiRuang Logo" width="68" height="68" style="border-radius: 16px; box-shadow: 0 6px 14px rgba(24, 52, 73, 0.12); margin-bottom: 10px; display: inline-block;" />
                  <h1 style="color: #183449; font-size: 20px; font-weight: 800; margin: 0;">SiRuang &bull; Gedung SFD</h1>
                  <p style="color: #64748b; font-size: 12px; margin: 3px 0 0 0;">Laporan Presensi Kehadiran Kelas</p>
                </div>

                <div style="display: inline-block; background-color: #fee2e2; color: #991b1b; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 14px;">
                  &#10003; Telah Check-in
                </div>

                <h2 style="color: #183449; margin: 0 0 8px 0; font-size: 18px; font-weight: 800;">Presensi Check-in Selesai</h2>
                <p style="color: #64748b; font-size: 14px; margin-top: 0;">Halo Bapak/Ibu <strong>${escapeHtml(booking.nama_dosen || dosenProf?.full_name)}</strong>,</p>
                <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                  PJ Kelas <strong>${escapeHtml(booking.nama_pemohon)}</strong> telah melakukan <strong>Check-in Kehadiran</strong> melalui email untuk perkuliahan:
                </p>

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #ef4444; padding: 16px 20px; margin: 18px 0; border-radius: 12px;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr><td style="padding: 4px 0; color: #64748b; width: 140px;">Ruangan:</td><td style="padding: 4px 0; color: #1e293b; font-weight: 700;">${escapeHtml(roomKode)} - ${escapeHtml(roomNama)}</td></tr>
                    <tr><td style="padding: 4px 0; color: #64748b;">Mata Kuliah:</td><td style="padding: 4px 0; color: #1e293b; font-weight: 700;">${escapeHtml(booking.mata_kuliah)} (${booking.sks} SKS)</td></tr>
                    <tr><td style="padding: 4px 0; color: #64748b;">Jadwal:</td><td style="padding: 4px 0; color: #1e293b; font-weight: 700;">${escapeHtml(booking.tanggal)} &bull; ${booking.jam_mulai.slice(0, 5)} - ${booking.jam_selesai.slice(0, 5)} WIB</td></tr>
                    <tr><td style="padding: 4px 0; color: #991b1b;">Status Denah:</td><td style="padding: 4px 0; color: #991b1b; font-weight: 800;">MERAH (Sedang Berlangsung)</td></tr>
                  </table>
                </div>
              </div>
            `,
          })
        );
      }

      await Promise.allSettled(emailPromises);
    } catch (mailErr) {
      console.warn('[quick-checkin] Gagal kirim email notifikasi checkin:', mailErr);
    }

    // Tampilkan Kartu Berhasil
    return renderHtmlCard({
      title: 'Check-In Berhasil',
      isSuccess: true,
      badgeText: 'STATUS DENAH: MERAH (SEDANG DIGUNAKAN)',
      heading: 'Presensi Check-in Berhasil! 🎉',
      message: `Presensi kehadiran perkuliahan untuk <strong>Ruangan ${escapeHtml(roomKode)}</strong> berhasil dicatat via email. Warna ruangan pada denah gedung kini berubah menjadi <strong>MERAH</strong> (resmi sedang digunakan).`,
      details: [
        { label: 'Ruangan', value: `${roomKode} - ${roomNama}` },
        { label: 'Mata Kuliah', value: `${booking.mata_kuliah} (${booking.sks} SKS)` },
        { label: 'Dosen Pengampu', value: booking.nama_dosen },
        { label: 'Waktu Kuliah', value: `${booking.tanggal} (${booking.jam_mulai.slice(0, 5)} - ${booking.jam_selesai.slice(0, 5)} WIB)` },
        { label: 'Waktu Presensi', value: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' },
      ],
      appUrl,
    });
  } catch (err: any) {
    return renderHtmlCard({
      title: 'Kesalahan Sistem',
      isSuccess: false,
      heading: 'Terjadi Kesalahan',
      message: 'Kesalahan saat memproses check-in: ' + err.message,
    });
  }
}

