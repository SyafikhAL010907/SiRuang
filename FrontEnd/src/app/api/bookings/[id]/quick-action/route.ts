import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';
import { sendEmail, escapeHtml } from '@/lib/mailer';
import { notifyBookingPush } from '@/lib/sendPush';
import { getPublicAppUrl } from '@/lib/appUrl';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

function renderHtmlCard({
  title,
  isSuccess,
  variant,
  heading,
  message,
  details,
  badgeText,
  form,
}: {
  title: string;
  isSuccess: boolean;
  variant?: 'success' | 'error' | 'expired' | 'warning';
  heading: string;
  message: string;
  details?: { label: string; value: string }[];
  badgeText?: string;
  form?: string;
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
    ? `<div style="display: inline-block; background-color: #fef08a; color: #854d0e; padding: 6px 14px; border-radius: 9999px; font-weight: 700; font-size: 12px; margin-bottom: 16px;">
        ${escapeHtml(badgeText)}
      </div>`
    : '';

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
        .btn-close { display: inline-block; width: 100%; max-width: 260px; background-color: #183449; color: #ffffff; padding: 12px 24px; border-radius: 10px; border: none; font-weight: 700; font-size: 14px; cursor: pointer; transition: background 0.2s; margin-top: 10px; text-decoration: none; }
        .btn-close:hover { background-color: #0f172a; }
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
        ${form ? form : '<button class="btn-close" onclick="window.close();">Tutup Jendela Ini</button>'}
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

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const rawParams = await Promise.resolve(context?.params);
    const bookingId = rawParams?.id;
    const { searchParams } = new URL(request.url);
    const rawToken = searchParams.get('token');
    const action = searchParams.get('action');

    if (!bookingId || !rawToken) {
      return renderHtmlCard({
        title: 'Tautan Tidak Lengkap',
        isSuccess: false,
        heading: 'Tautan Tidak Valid',
        message: 'ID permohonan atau token verifikasi tidak ditemukan dalam tautan.',
      });
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Ambil data booking
    const { data: booking, error: bErr } = await supabaseServer
      .from('bookings')
      .select(`
        *,
        rooms:room_id (id, kode, nama, lantai)
      `)
      .eq('id', bookingId)
      .maybeSingle();

    if (bErr || !booking) {
      return renderHtmlCard({
        title: 'Pengajuan Tidak Ditemukan',
        isSuccess: false,
        heading: 'Pengajuan Tidak Ditemukan',
        message: 'Data permohonan peminjaman ruangan tidak ditemukan di sistem SiRuang.',
      });
    }

    // Validasi token hash
    if (booking.dosen_token_hash !== tokenHash) {
      return renderHtmlCard({
        title: 'Token Tidak Valid',
        isSuccess: false,
        heading: 'Verifikasi Gagal',
        message: 'Token keamanan dari tautan email ini tidak cocok atau sudah tidak berlaku.',
      });
    }

    // Jika sudah pernah diproses sebelumnya (Tautan sudah kedaluwarsa / aksi sudah selesai)
    if (booking.status !== 'menunggu_dosen') {
      const isAcc = booking.status === 'disetujui_dosen' || booking.status === 'dijadwalkan_admin' || booking.status === 'menunggu_checkin' || booking.status === 'berlangsung';
      const statusLabel = isAcc
        ? 'TELAH DISETUJUI (ACC)'
        : booking.status === 'ditolak_dosen'
        ? 'TELAH DITOLAK'
        : booking.status.toUpperCase();

      const respondedTime = booking.dosen_responded_at
        ? new Date(booking.dosen_responded_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) + ' WIB'
        : 'Sebelumnya';

      return renderHtmlCard({
        title: 'Tautan Tidak Aktif Lagi',
        isSuccess: false,
        variant: 'expired',
        badgeText: `STATUS: ${statusLabel}`,
        heading: 'Tindakan Sudah Selesai Dilakukan',
        message: `Pengajuan peminjaman untuk ruangan <strong>${escapeHtml(booking.rooms?.kode || '')}</strong> sudah pernah Anda tanggapi pada <strong>${respondedTime}</strong>.<br /><br />
        <span style="color: #64748b; font-size: 13px;">Tombol pada email ini sudah <strong>kedaluwarsa (tidak dapat digunakan kembali)</strong> untuk mencegah tanggapan ganda. Status pada denah web SiRuang sudah diperbarui secara permanen.</span>`,
        details: [
          { label: 'Ruangan', value: `${booking.rooms?.kode || ''} - ${booking.rooms?.nama || ''}` },
          { label: 'Mata Kuliah', value: `${booking.mata_kuliah} (${booking.sks} SKS)` },
          { label: 'PJ Pemohon', value: `${booking.nama_pemohon} (${booking.kelas})` },
          { label: 'Keputusan', value: isAcc ? '✓ Disetujui Dosen (Kuning)' : '✕ Ditolak' },
          { label: 'Waktu Tanggapan', value: respondedTime },
        ],
      });
    }

    // Cek kadaluwarsa token (7 hari)
    if (booking.dosen_token_expires && new Date(booking.dosen_token_expires) < new Date()) {
      return renderHtmlCard({
        title: 'Tautan Kedaluwarsa',
        isSuccess: false,
        variant: 'expired',
        badgeText: 'KEDALUWARSA (LEWAT 7 HARI)',
        heading: 'Masa Berlaku Tautan Habis',
        message: 'Tautan verifikasi ini telah melewati masa berlaku (7 hari). Silakan minta PJ Kelas mengajukan permohonan baru jika ruangan masih dibutuhkan.',
      });
    }

    // JIKA AKSI = TOLAK: Tampilkan formulir penolakan langsung (tanpa perlu masuk web)
    if (action === 'tolak') {
      const rejectForm = `
        <form method="POST" action="/api/bookings/${booking.id}/quick-action" style="margin-top: 16px; text-align: left;">
          <input type="hidden" name="token" value="${escapeHtml(rawToken)}" />
          <input type="hidden" name="action" value="tolak" />
          <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">
            Alasan Penolakan (Wajib diisi):
          </label>
          <textarea 
            name="alasan" 
            rows="3" 
            required 
            minlength="10" 
            placeholder="Tulis alasan penolakan (contoh: Ruangan bentrok dengan jadwal praktikum lain)..." 
            style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; font-size: 13px; outline: none; margin-bottom: 16px; resize: vertical;"
          ></textarea>
          <div style="display: flex; gap: 10px;">
            <button type="submit" style="flex: 1; background-color: #dc2626; color: #ffffff; padding: 12px; border-radius: 8px; border: none; font-weight: 700; font-size: 14px; cursor: pointer;">
              ✕ Kirim Penolakan
            </button>
            <button type="button" onclick="window.close();" style="flex: 1; background-color: #e2e8f0; color: #475569; padding: 12px; border-radius: 8px; border: none; font-weight: 600; font-size: 14px; cursor: pointer;">
              Batal
            </button>
          </div>
        </form>
      `;

      return renderHtmlCard({
        title: 'Tolak Pengajuan Ruangan',
        isSuccess: false,
        heading: 'Tolak Permohonan Ruangan',
        message: `Silakan masukkan alasan penolakan untuk permohonan ruangan <strong>${escapeHtml(booking.rooms?.kode || '')}</strong>:`,
        details: [
          { label: 'Ruangan', value: `${booking.rooms?.kode || ''} - ${booking.rooms?.nama || ''}` },
          { label: 'Mata Kuliah', value: `${booking.mata_kuliah} (${booking.sks} SKS)` },
          { label: 'PJ Pemohon', value: `${booking.nama_pemohon} (${booking.kelas})` },
          { label: 'Jadwal', value: `${booking.tanggal}, ${booking.jam_mulai.slice(0, 5)} - ${booking.jam_selesai.slice(0, 5)} WIB` },
        ],
        form: rejectForm,
      });
    }

    // JIKA AKSI = SETUJU: PROSES LANGSUNG DI SERVER (1-KLIK SELESAI!)
    const now = new Date().toISOString();
    const { error: uErr } = await supabaseServer
      .from('bookings')
      .update({
        status: 'disetujui_dosen',
        dosen_responded_at: now,
        admin_responded_at: now,
        dosen_token_expires: now, // Langsung invalidasi token
        updated_at: now,
      })
      .eq('id', booking.id);

    if (uErr) {
      return renderHtmlCard({
        title: 'Gagal Memproses',
        isSuccess: false,
        heading: 'Gagal Memperbarui Database',
        message: 'Terjadi kesalahan sistem saat menyimpan persetujuan: ' + uErr.message,
      });
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

    // Kirim Email E2 ke PJ Kelas
    if (!pjEmail) {
      console.warn(`[quick-action] Email PJ Kelas tidak ditemukan untuk pemohon_id: ${booking.pemohon_id}, nim: ${booking.nim_pemohon}. Email check-in tidak dapat dikirim.`);
    } else {
      console.log(`[quick-action] Mengirim email check-in E2 ke PJ Kelas: ${pjEmail}`);
      try {
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

              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Status peminjaman Anda otomatis aktif di denah web SiRuang. Silakan buka menu <strong>Jadwal &amp; Check-in</strong> pada dashboard PJ Kelas untuk melakukan presensi kehadiran saat jam kuliah berlangsung agar warna ruangan berubah menjadi <strong>MERAH</strong> (resmi sedang digunakan).
              </p>

              <div style="margin: 24px 0; text-align: center;">
                <a href="${checkinUrl}" style="background-color: #183449; background-image: linear-gradient(135deg, #183449 0%, #0f172a 100%); color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(24, 52, 73, 0.3); letter-spacing: 0.2px;">
                  Buka Menu Jadwal &amp; Check-in &rarr;
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 26px 0 16px 0;" />
              <p style="color: #94a3b8; font-size: 11px; margin: 0; text-align: center;">
                Email ini dikirim otomatis oleh Sistem SiRuang Gedung SFD.
              </p>
            </div>
          `,
        });
        if (!mailRes.success) {
          console.error(`[quick-action] Gagal kirim email E2 ke ${pjEmail}:`, mailRes.error);
        }
      } catch (mailErr) {
        console.warn('Gagal kirim email E2 ke PJ:', mailErr);
      }
    }

    // Kirim push notification
    try {
      await notifyBookingPush(
        booking.nim_pemohon || String(booking.pemohon_id),
        'Booking Disetujui Dosen!',
        `Ruangan ${roomKode} (${booking.mata_kuliah}) telah disetujui. Silakan lakukan check-in pada jam perkuliahan.`,
        '/user?tab=checkin'
      );
    } catch {
      // Abaikan jika push gagal
    }

    // TAMPILKAN HALAMAN KONFIRMASI BERHASIL SEPERTI KARTU NOTIFIKASI
    return renderHtmlCard({
      title: 'Persetujuan Berhasil',
      isSuccess: true,
      badgeText: 'STATUS DENAH: KUNING (DISETUJUI)',
      heading: 'Permohonan Berhasil Di-ACC!',
      message: `Peminjaman ruangan <strong>${escapeHtml(roomKode)}</strong> telah berhasil Anda setujui. Sistem telah otomatis memperbarui status denah web menjadi warna <strong>Kuning</strong> dan mengirimkan email check-in kepada PJ Kelas.`,
      details: [
        { label: 'Ruangan', value: `${roomKode} - ${roomNama}` },
        { label: 'Mata Kuliah', value: `${booking.mata_kuliah} (${booking.sks} SKS)` },
        { label: 'PJ Pemohon', value: `${booking.nama_pemohon} (${booking.kelas})` },
        { label: 'Waktu Kuliah', value: `${booking.tanggal}, ${booking.jam_mulai.slice(0, 5)} - ${booking.jam_selesai.slice(0, 5)} WIB` },
      ],
    });
  } catch (err: any) {
    return renderHtmlCard({
      title: 'Terjadi Kesalahan',
      isSuccess: false,
      heading: 'Kesalahan Sistem',
      message: 'Terjadi kesalahan pada server: ' + err.message,
    });
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const rawParams = await Promise.resolve(context?.params);
    const bookingId = rawParams?.id;

    // Bisa dari FormData form HTML atau JSON
    let rawToken = '';
    let action = '';
    let alasan = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      rawToken = (formData.get('token') as string) || '';
      action = (formData.get('action') as string) || '';
      alasan = (formData.get('alasan') as string) || '';
    } else {
      const body = await request.json();
      rawToken = body.token || '';
      action = body.action || '';
      alasan = body.alasan || '';
    }

    if (!bookingId || !rawToken) {
      return renderHtmlCard({
        title: 'Data Tidak Lengkap',
        isSuccess: false,
        heading: 'Gagal Memproses',
        message: 'ID booking dan token verifikasi wajib disertakan.',
      });
    }

    if (action !== 'tolak') {
      return renderHtmlCard({
        title: 'Aksi Tidak Valid',
        isSuccess: false,
        heading: 'Aksi Tidak Dikenal',
        message: 'Aksi POST hanya mendukung penolakan pengajuan.',
      });
    }

    if (!alasan || alasan.trim().length < 10) {
      return renderHtmlCard({
        title: 'Alasan Kurang Lengkap',
        isSuccess: false,
        heading: 'Alasan Wajib Diisi',
        message: 'Alasan penolakan wajib diisi minimal 10 karakter agar PJ Kelas mendapatkan penjelasan yang jelas.',
      });
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const { data: booking, error: bErr } = await supabaseServer
      .from('bookings')
      .select('*, rooms:room_id(id, kode, nama)')
      .eq('id', bookingId)
      .maybeSingle();

    if (bErr || !booking) {
      return renderHtmlCard({
        title: 'Tidak Ditemukan',
        isSuccess: false,
        heading: 'Data Tidak Ditemukan',
        message: 'Pengajuan booking tidak ditemukan di sistem.',
      });
    }

    if (booking.dosen_token_hash !== tokenHash) {
      return renderHtmlCard({
        title: 'Token Tidak Cocok',
        isSuccess: false,
        heading: 'Akses Ditolak',
        message: 'Token verifikasi tidak valid.',
      });
    }

    if (booking.status !== 'menunggu_dosen') {
      return renderHtmlCard({
        title: 'Sudah Ditinjau',
        isSuccess: true,
        heading: 'Sudah Pernah Ditinjau',
        message: `Pengajuan ini sudah ditinjau sebelumnya (Status saat ini: ${booking.status}).`,
      });
    }

    const now = new Date().toISOString();
    await supabaseServer
      .from('bookings')
      .update({
        status: 'ditolak_dosen',
        alasan_tolak: alasan.trim(),
        dosen_responded_at: now,
        dosen_token_expires: now,
        updated_at: now,
      })
      .eq('id', booking.id);

    // Ambil email PJ untuk notifikasi penolakan (E3) dengan fallback
    let rejectEmail = '';
    if (booking.pemohon_id) {
      const { data: p1 } = await supabaseServer.from('v_user_profiles').select('email').eq('user_id', booking.pemohon_id).maybeSingle();
      if (p1?.email) rejectEmail = p1.email.trim();
    }
    if (!rejectEmail && booking.nim_pemohon) {
      const { data: p2 } = await supabaseServer.from('v_user_profiles').select('email').eq('identifier', booking.nim_pemohon).maybeSingle();
      if (p2?.email) rejectEmail = p2.email.trim();
    }
    if (!rejectEmail && booking.pemohon_id) {
      const { data: p3 } = await supabaseServer.from('profiles').select('email').eq('user_id', booking.pemohon_id).maybeSingle();
      if (p3?.email) rejectEmail = p3.email.trim();
    }

    if (rejectEmail) {
      try {
        await sendEmail({
          to: rejectEmail,
          subject: `[SiRuang] Pengajuan Ruangan ${booking.rooms?.kode || ''} Ditolak Dosen`,
          template: 'E3',
          relatedId: booking.id,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
              <h2 style="color: #dc2626; margin-bottom: 6px; font-size: 20px;">Permohonan Ruangan Ditolak</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 0;">Halo <strong>${escapeHtml(booking.nama_pemohon)}</strong>,</p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Dosen pengampu <strong>${escapeHtml(booking.nama_dosen)}</strong> belum dapat menyetujui permohonan peminjaman ruangan <strong>${escapeHtml(booking.rooms?.kode || '')}</strong> untuk mata kuliah <strong>${escapeHtml(booking.mata_kuliah)}</strong>.
              </p>
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 18px 0; border-radius: 8px;">
                <p style="margin: 0; font-size: 13px; color: #991b1b;"><strong>Alasan Penolakan:</strong></p>
                <p style="margin: 6px 0 0 0; font-size: 13px; color: #7f1d1d; font-style: italic;">"${escapeHtml(alasan.trim())}"</p>
              </div>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Silakan berkoordinasi kembali dengan dosen pengampu atau ajukan permohonan dengan jadwal/ruangan lain melalui web SiRuang.
              </p>
            </div>
          `,
        });
      } catch (err) {
        console.warn('Gagal kirim email E3:', err);
      }
    }

    return renderHtmlCard({
      title: 'Penolakan Berhasil',
      isSuccess: true,
      heading: 'Pengajuan Telah Ditolak',
      message: `Permohonan peminjaman telah berhasil ditolak. Alasan: <em>"${escapeHtml(alasan.trim())}"</em> telah dikirimkan ke PJ Kelas pemohon.`,
    });
  } catch (err: any) {
    return renderHtmlCard({
      title: 'Kesalahan Sistem',
      isSuccess: false,
      heading: 'Terjadi Kesalahan',
      message: err.message,
    });
  }
}

