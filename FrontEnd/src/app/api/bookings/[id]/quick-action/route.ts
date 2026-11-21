import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';
import { escapeHtml } from '@/lib/mailer';
import { getPublicAppUrl } from '@/lib/appUrl';
import { notifyPjCheckin, notifyPjRejection } from '@/lib/bookingApprovalHelper';

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
  httpStatus = 200,
}: {
  title: string;
  isSuccess: boolean;
  variant?: 'success' | 'error' | 'expired' | 'warning' | 'conflict';
  heading: string;
  message: string;
  details?: { label: string; value: string }[];
  badgeText?: string;
  form?: string;
  httpStatus?: number;
}) {
  const isExpired = variant === 'expired' || variant === 'conflict';
  const iconColor = isExpired ? '#e11d48' : isSuccess ? '#16a34a' : '#dc2626';
  const iconBg = isExpired ? '#ffe4e6' : isSuccess ? '#dcfce7' : '#fee2e2';
  const iconSvg = isExpired
    ? `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
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
          Sistem Informasi Peminjaman Ruangan &bull; SiRuang
        </div>
      </div>
    </body>
    </html>`,
    {
      status: httpStatus,
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
        httpStatus: 400,
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
        httpStatus: 404,
      });
    }

    // Validasi token hash dosen
    if (booking.dosen_token_hash !== tokenHash) {
      return renderHtmlCard({
        title: 'Token Tidak Valid',
        isSuccess: false,
        heading: 'Verifikasi Gagal',
        message: 'Token keamanan dari tautan email ini tidak cocok atau sudah tidak berlaku.',
        httpStatus: 403,
      });
    }

    // 1. Cek jika pengajuan sudah berstatus final / ditolak (409 Conflict)
    const isRejected = ['ditolak', 'ditolak_dosen', 'ditolak_admin', 'dibatalkan', 'dibatalkan_prioritas', 'hangus', 'kedaluwarsa'].includes(booking.status);
    if (isRejected) {
      const penolak = booking.ditolak_oleh === 'admin_gedung' ? 'Admin Gedung' : 'Dosen Pengampu';
      const alasan = booking.alasan_tolak_dosen || booking.alasan_tolak_admin_gedung || booking.alasan_tolak || 'Tidak disebutkan';
      return renderHtmlCard({
        title: 'Pengajuan Sudah Ditolak',
        isSuccess: false,
        variant: 'conflict',
        badgeText: `STATUS: ${booking.status.toUpperCase()}`,
        heading: 'Pengajuan Telah Ditolak / Tidak Aktif',
        message: `Pengajuan peminjaman ruangan <strong>${escapeHtml(booking.rooms?.kode || '')}</strong> telah dibatalkan atau ditolak sebelumnya oleh <strong>${escapeHtml(penolak)}</strong>.<br /><br /><strong>Alasan:</strong> <em>"${escapeHtml(alasan)}"</em>`,
        httpStatus: 409,
      });
    }

    // 2. Cek jika dosen sudah pernah merespons
    if (booking.approval_dosen === 'disetujui' || booking.status === 'disetujui_dosen' || booking.status === 'dijadwalkan' || booking.status === 'dijadwalkan_admin' || booking.status === 'menunggu_checkin' || booking.status === 'berlangsung' || booking.status === 'selesai') {
      const respondedTime = booking.dosen_responded_at_v2 || booking.dosen_responded_at
        ? new Date(booking.dosen_responded_at_v2 || booking.dosen_responded_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) + ' WIB'
        : 'Sebelumnya';

      return renderHtmlCard({
        title: 'Sudah Anda Setujui',
        isSuccess: true,
        variant: 'success',
        badgeText: 'TELAH DI-ACC DOSEN',
        heading: 'Tindakan Sudah Pernah Dilakukan',
        message: `Pengajuan ini telah Anda setujui sebelumnya pada <strong>${respondedTime}</strong>.<br /><br />Status saat ini: <strong>${escapeHtml(booking.status)}</strong>.`,
        details: [
          { label: 'Ruangan', value: `${booking.rooms?.kode || ''} - ${booking.rooms?.nama || ''}` },
          { label: 'Mata Kuliah', value: `${booking.mata_kuliah} (${booking.sks} SKS)` },
          { label: 'Approval Dosen', value: 'Disetujui' },
          { label: 'Approval Admin', value: booking.approval_admin_gedung || 'Pending' },
        ],
      });
    }

    // 3. Cek kedaluwarsa token (7 hari)
    if (booking.dosen_token_expires && new Date(booking.dosen_token_expires) < new Date()) {
      return renderHtmlCard({
        title: 'Tautan Kedaluwarsa',
        isSuccess: false,
        variant: 'expired',
        badgeText: 'KEDALUWARSA (LEWAT 7 HARI)',
        heading: 'Masa Berlaku Tautan Habis',
        message: 'Tautan verifikasi ini telah melewati masa berlaku (7 hari). Silakan minta PJ Kelas mengajukan permohonan baru jika ruangan masih dibutuhkan.',
        httpStatus: 410,
      });
    }

    // JIKA AKSI = TOLAK: Buka form penolakan (TIDAK menolak langsung)
    if (action === 'tolak') {
      const rejectForm = `
        <form method="POST" action="/api/bookings/${booking.id}/quick-action" style="margin-top: 16px; text-align: left;">
          <input type="hidden" name="token" value="${escapeHtml(rawToken)}" />
          <input type="hidden" name="action" value="tolak" />
          <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">
            Alasan Penolakan (Wajib diisi, min. 10 karakter):
          </label>
          <textarea 
            name="alasan" 
            rows="3" 
            required 
            minlength="10" 
            placeholder="Tulis alasan penolakan (contoh: Ruangan bentrok dengan kegiatan lain)..." 
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

    // JIKA AKSI = SETUJU: Update atomik persetujuan dosen
    const now = new Date().toISOString();

    const { data: updatedRows, error: uErr } = await supabaseServer
      .from('bookings')
      .update({
        approval_dosen: 'disetujui',
        dosen_responded_at_v2: now,
        dosen_responded_at: now,
        dosen_token_expires: now, // Invalidate hanya token dosen
        updated_at: now,
      })
      .eq('id', booking.id)
      .in('status', ['menunggu_approval', 'menunggu_dosen'])
      .eq('approval_dosen', 'pending')
      .select('*, rooms:room_id(id, kode, nama)');

    if (uErr || !updatedRows || updatedRows.length === 0) {
      // 0 baris terupdate: baca ulang status terbaru untuk pesan yang tepat
      const { data: latest } = await supabaseServer
        .from('bookings')
        .select('*, rooms:room_id(id, kode, nama)')
        .eq('id', booking.id)
        .maybeSingle();

      const penolak = latest?.ditolak_oleh === 'admin_gedung' ? 'Admin Gedung' : 'Dosen Pengampu';
      const alasan = latest?.alasan_tolak_dosen || latest?.alasan_tolak_admin_gedung || latest?.alasan_tolak || '-';

      if (['ditolak', 'ditolak_dosen', 'ditolak_admin', 'dibatalkan', 'dibatalkan_prioritas', 'hangus', 'kedaluwarsa'].includes(latest?.status || '')) {
        return renderHtmlCard({
          title: 'Pengajuan Sudah Ditolak',
          isSuccess: false,
          variant: 'conflict',
          heading: 'Pengajuan Telah Ditolak / Dibatalkan',
          message: `Pengajuan ini sudah ditolak atau dibatalkan sebelumnya oleh <strong>${escapeHtml(penolak)}</strong> (Alasan: "${escapeHtml(alasan)}").`,
          httpStatus: 409,
        });
      }

      if (latest?.approval_dosen === 'disetujui') {
        return renderHtmlCard({
          title: 'Sudah Anda Tanggapi',
          isSuccess: true,
          variant: 'success',
          heading: 'Persetujuan Sudah Pernah Dicatat',
          message: 'Persetujuan Anda sudah berhasil disimpan sebelumnya.',
          httpStatus: 409,
        });
      }

      return renderHtmlCard({
        title: 'Konflik Permohonan',
        isSuccess: false,
        heading: 'Gagal Memproses',
        message: 'Pengajuan ini tidak lagi dalam status menunggu persetujuan.',
        httpStatus: 409,
      });
    }

    const currentBooking = updatedRows[0];
    const isLegacy = currentBooking.status === 'menunggu_dosen';
    const appUrl = getPublicAppUrl(request);

    // Baca ulang booking terkini untuk mengecek status kedua pihak
    const { data: freshBooking } = await supabaseServer
      .from('bookings')
      .select('*, rooms:room_id(id, kode, nama)')
      .eq('id', booking.id)
      .single();

    let isFullyApproved = false;

    if (freshBooking?.approval_dosen === 'disetujui' && freshBooking?.approval_admin_gedung === 'disetujui') {
      // Update status ke 'dijadwalkan' dengan guard atomik status
      const { data: schedRows, error: sErr } = await supabaseServer
        .from('bookings')
        .update({ status: 'dijadwalkan', updated_at: now })
        .eq('id', booking.id)
        .in('status', ['menunggu_approval', 'menunggu_dosen'])
        .select();

      // Kirim email check-in ke PJ HANYA jika update itu mengubah tepat 1 baris
      if (!sErr && schedRows && schedRows.length === 1) {
        isFullyApproved = true;
        await notifyPjCheckin({
          bookingId: freshBooking.id,
          pemohonId: freshBooking.pemohon_id,
          nimPemohon: freshBooking.nim_pemohon,
          roomKode: freshBooking.rooms?.kode || 'Ruangan',
          roomNama: freshBooking.rooms?.nama || '',
          mataKuliah: freshBooking.mata_kuliah,
          tanggal: freshBooking.tanggal,
          jamMulai: freshBooking.jam_mulai,
          jamSelesai: freshBooking.jam_selesai,
          appUrl,
        });
      } else if (schedRows && schedRows.length === 0) {
        // Baris sudah diubah oleh pihak admin gedung yang klik bersamaan
        isFullyApproved = true;
      }
    } else if (isLegacy) {
      // Legacy booking -> update ke disetujui_dosen dengan guard atomik
      const { data: legRows, error: lErr } = await supabaseServer
        .from('bookings')
        .update({ status: 'disetujui_dosen', updated_at: now })
        .eq('id', booking.id)
        .eq('status', 'menunggu_dosen')
        .select();

      if (!lErr && legRows && legRows.length === 1) {
        isFullyApproved = true;
        await notifyPjCheckin({
          bookingId: freshBooking.id,
          pemohonId: freshBooking.pemohon_id,
          nimPemohon: freshBooking.nim_pemohon,
          roomKode: freshBooking.rooms?.kode || 'Ruangan',
          roomNama: freshBooking.rooms?.nama || '',
          mataKuliah: freshBooking.mata_kuliah,
          tanggal: freshBooking.tanggal,
          jamMulai: freshBooking.jam_mulai,
          jamSelesai: freshBooking.jam_selesai,
          appUrl,
        });
      }
    }

    return renderHtmlCard({
      title: 'Persetujuan Berhasil',
      isSuccess: true,
      badgeText: isFullyApproved ? 'STATUS: RESMI DIJADWALKAN' : 'MENUNGGU APPROVAL ADMIN GEDUNG',
      heading: isFullyApproved ? 'Permohonan Berhasil Di-ACC Penuh! 🎉' : 'ACC Dosen Berhasil Disimpan',
      message: isFullyApproved
        ? `Peminjaman ruangan <strong>${escapeHtml(currentBooking.rooms?.kode || '')}</strong> telah disetujui penuh oleh Dosen dan Admin Gedung. Notifikasi check-in telah otomatis dikirimkan ke PJ Kelas.`
        : `Persetujuan Anda untuk ruangan <strong>${escapeHtml(currentBooking.rooms?.kode || '')}</strong> berhasil dicatat. Jadwal akan resmi aktif setelah Admin Gedung menyetujui.`,
      details: [
        { label: 'Ruangan', value: `${currentBooking.rooms?.kode || ''} - ${currentBooking.rooms?.nama || ''}` },
        { label: 'Mata Kuliah', value: `${currentBooking.mata_kuliah} (${currentBooking.sks} SKS)` },
        { label: 'Persetujuan Dosen', value: '✓ Disetujui' },
        { label: 'Persetujuan Admin', value: freshBooking?.approval_admin_gedung === 'disetujui' ? '✓ Disetujui' : 'Menunggu' },
      ],
    });
  } catch (err: any) {
    return renderHtmlCard({
      title: 'Terjadi Kesalahan',
      isSuccess: false,
      heading: 'Kesalahan Sistem',
      message: 'Terjadi kesalahan pada server: ' + err.message,
      httpStatus: 500,
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
      const body = await request.json().catch(() => ({}));
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
        httpStatus: 400,
      });
    }

    if (action !== 'tolak') {
      return renderHtmlCard({
        title: 'Aksi Tidak Valid',
        isSuccess: false,
        heading: 'Aksi Tidak Dikenal',
        message: 'Aksi POST hanya mendukung penolakan pengajuan.',
        httpStatus: 400,
      });
    }

    if (!alasan || alasan.trim().length < 10) {
      return renderHtmlCard({
        title: 'Alasan Kurang Lengkap',
        isSuccess: false,
        heading: 'Alasan Wajib Minimal 10 Karakter',
        message: 'Alasan penolakan wajib diisi minimal 10 karakter agar PJ Kelas mendapatkan penjelasan yang jelas.',
        httpStatus: 400,
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
        httpStatus: 404,
      });
    }

    if (booking.dosen_token_hash !== tokenHash) {
      return renderHtmlCard({
        title: 'Token Tidak Cocok',
        isSuccess: false,
        heading: 'Akses Ditolak',
        message: 'Token verifikasi tidak valid.',
        httpStatus: 403,
      });
    }

    const now = new Date().toISOString();

    // Update tolak secara atomik: status IN ('menunggu_approval', 'menunggu_dosen') AND approval_dosen = 'pending'
    const { data: rejectRows, error: rErr } = await supabaseServer
      .from('bookings')
      .update({
        status: 'ditolak',
        approval_dosen: 'ditolak',
        alasan_tolak_dosen: alasan.trim(),
        alasan_tolak: alasan.trim(),
        ditolak_oleh: 'dosen',
        ditolak_at: now,
        dosen_responded_at_v2: now,
        dosen_responded_at: now,
        dosen_token_expires: now, // Invalidate token dosen
        updated_at: now,
      })
      .eq('id', booking.id)
      .in('status', ['menunggu_approval', 'menunggu_dosen'])
      .eq('approval_dosen', 'pending')
      .select('*, rooms:room_id(id, kode, nama)');

    if (rErr || !rejectRows || rejectRows.length === 0) {
      const { data: latest } = await supabaseServer
        .from('bookings')
        .select('*, rooms:room_id(id, kode, nama)')
        .eq('id', booking.id)
        .maybeSingle();

      const penolak = latest?.ditolak_oleh === 'admin_gedung' ? 'Admin Gedung' : 'Dosen Pengampu';
      const alasanLama = latest?.alasan_tolak_dosen || latest?.alasan_tolak_admin_gedung || latest?.alasan_tolak || '-';

      return renderHtmlCard({
        title: 'Konflik Tindakan',
        isSuccess: false,
        variant: 'conflict',
        heading: 'Sudah Diperbarui Pihak Lain',
        message: `Pengajuan ini sudah pernah ditinjau sebelumnya (Status saat ini: ${latest?.status || '-'}). Ditolak oleh: ${penolak} (Alasan: "${escapeHtml(alasanLama)}").`,
        httpStatus: 409,
      });
    }

    const updatedReject = rejectRows[0];

    // Notifikasi penolakan ke PJ
    await notifyPjRejection({
      bookingId: booking.id,
      pemohonId: booking.pemohon_id,
      nimPemohon: booking.nim_pemohon,
      roomKode: updatedReject.rooms?.kode || 'Ruangan',
      roomNama: updatedReject.rooms?.nama || '',
      mataKuliah: booking.mata_kuliah,
      tanggal: booking.tanggal,
      jamMulai: booking.jam_mulai,
      jamSelesai: booking.jam_selesai,
      rejectedBy: 'dosen',
      approverName: booking.nama_dosen,
      reason: alasan.trim(),
    });

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
      httpStatus: 500,
    });
  }
}
