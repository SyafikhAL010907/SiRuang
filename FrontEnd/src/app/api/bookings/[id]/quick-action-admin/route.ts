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
      <title>${escapeHtml(title)} - SiRuang Admin</title>
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
          Sistem Informasi Peminjaman Ruangan &bull; SiRuang Admin Gedung
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

export async function GET(request: NextRequest, context: RouteContext) {
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
        title: 'Pengajuan Tidak Ditemukan',
        isSuccess: false,
        heading: 'Pengajuan Tidak Ditemukan',
        message: 'Data permohonan peminjaman ruangan tidak ditemukan di sistem SiRuang.',
        httpStatus: 404,
      });
    }

    // Validasi token hash admin gedung
    if (booking.admin_gedung_token_hash !== tokenHash) {
      if (searchParams.get('format') === 'json' || request.headers.get('accept')?.includes('application/json')) {
        return NextResponse.json({ error: 'Token keamanan admin gedung tidak cocok atau sudah tidak berlaku.' }, { status: 403 });
      }
      return renderHtmlCard({
        title: 'Token Tidak Valid',
        isSuccess: false,
        heading: 'Verifikasi Gagal',
        message: 'Token keamanan admin gedung tidak cocok atau sudah tidak berlaku.',
        httpStatus: 403,
      });
    }

    // Jika pemanggil meminta data detail format JSON (misal dari /admin/review/[id])
    const wantsJson = searchParams.get('format') === 'json' || request.headers.get('accept')?.includes('application/json') || action === 'detail';
    if (wantsJson && action !== 'setuju' && action !== 'tolak') {
      return NextResponse.json({
        success: true,
        data: booking,
      });
    }

    // Cek kadaluwarsa token (7 hari)
    if (booking.admin_gedung_token_expires && new Date(booking.admin_gedung_token_expires) < new Date()) {
      return renderHtmlCard({
        title: 'Tautan Kedaluwarsa',
        isSuccess: false,
        variant: 'expired',
        badgeText: 'KEDALUWARSA (LEWAT 7 HARI)',
        heading: 'Masa Berlaku Tautan Habis',
        message: 'Tautan verifikasi admin gedung ini telah melewati masa berlaku (7 hari).',
        httpStatus: 410,
      });
    }

    // Cek jika status booking sudah ditolak / final
    if (['ditolak', 'ditolak_admin', 'ditolak_dosen', 'dibatalkan', 'dibatalkan_prioritas', 'hangus', 'kedaluwarsa'].includes(booking.status)) {
      const penolak = booking.ditolak_oleh === 'dosen' ? 'Dosen Pengampu' : 'Admin Gedung';
      const alasanTolak = booking.alasan_tolak_admin_gedung || booking.alasan_tolak_dosen || booking.alasan_tolak || 'Tidak disebutkan';
      return renderHtmlCard({
        title: 'Pengajuan Telah Ditolak',
        isSuccess: false,
        variant: 'conflict',
        badgeText: `STATUS: ${booking.status.toUpperCase()}`,
        heading: 'Pengajuan Sudah Ditolak / Tidak Aktif',
        message: `Pengajuan peminjaman ruangan <strong>${escapeHtml(booking.rooms?.kode || '')}</strong> telah <strong>ditolak</strong> oleh <strong>${escapeHtml(penolak)}</strong> dengan alasan: "${escapeHtml(alasanTolak)}". Tidak ada tindakan lebih lanjut yang dapat dilakukan.`,
        httpStatus: 409,
        details: [
          { label: 'Ruangan', value: `${booking.rooms?.kode || ''} - ${booking.rooms?.nama || ''}` },
          { label: 'Mata Kuliah', value: `${booking.mata_kuliah} (${booking.sks} SKS)` },
          { label: 'Ditolak Oleh', value: penolak },
          { label: 'Alasan Penolakan', value: alasanTolak },
        ],
      });
    }

    // Cek jika admin gedung sudah pernah merespons
    if (booking.approval_admin_gedung === 'disetujui') {
      return renderHtmlCard({
        title: 'Sudah Disetujui',
        isSuccess: true,
        variant: 'success',
        badgeText: 'STATUS: TELAH DISETUJUI ADMIN GEDUNG',
        heading: 'Persetujuan Sudah Diberikan',
        message: `Anda sudah pernah menyetujui pengajuan peminjaman ruangan <strong>${escapeHtml(booking.rooms?.kode || '')}</strong>. Status saat ini: <strong>${escapeHtml(booking.status)}</strong>.`,
        httpStatus: 409,
      });
    }

    // JIKA AKSI = TOLAK: Tampilkan formulir penolakan (alasan wajib min 10 karakter)
    if (action === 'tolak') {
      const rejectForm = `
        <form method="POST" action="/api/bookings/${booking.id}/quick-action-admin" style="margin-top: 16px; text-align: left;">
          <input type="hidden" name="token" value="${escapeHtml(rawToken)}" />
          <input type="hidden" name="action" value="tolak" />
          <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">
            Alasan Penolakan Admin Gedung (Wajib minimal 10 karakter):
          </label>
          <textarea 
            name="alasan" 
            rows="3" 
            required 
            minlength="10" 
            placeholder="Tulis alasan penolakan (misal: Ruangan sedang dalam pemeliharaan berkala)..." 
            style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; font-size: 13px; outline: none; margin-bottom: 16px; resize: vertical;"
          ></textarea>
          <div style="display: flex; gap: 10px;">
            <button type="submit" style="flex: 1; background-color: #dc2626; color: #ffffff; padding: 12px; border-radius: 8px; border: none; font-weight: 700; font-size: 14px; cursor: pointer;">
              ✕ Konfirmasi Tolak Pengajuan
            </button>
            <button type="button" onclick="window.close();" style="flex: 1; background-color: #e2e8f0; color: #475569; padding: 12px; border-radius: 8px; border: none; font-weight: 600; font-size: 14px; cursor: pointer;">
              Batal
            </button>
          </div>
        </form>
      `;

      return renderHtmlCard({
        title: 'Tolak Pengajuan - Admin Gedung',
        isSuccess: false,
        heading: 'Tolak Permohonan Ruangan (Admin Gedung)',
        message: `Silakan masukkan alasan penolakan untuk permohonan ruangan <strong>${escapeHtml(booking.rooms?.kode || '')}</strong>:`,
        details: [
          { label: 'Ruangan', value: `${booking.rooms?.kode || ''} - ${booking.rooms?.nama || ''} (Gedung ${booking.rooms?.gedung || ''})` },
          { label: 'Mata Kuliah', value: `${booking.mata_kuliah} (${booking.sks} SKS)` },
          { label: 'PJ Pemohon', value: `${booking.nama_pemohon} (${booking.kelas})` },
          { label: 'Jadwal', value: `${booking.tanggal}, ${booking.jam_mulai.slice(0, 5)} - ${booking.jam_selesai.slice(0, 5)} WIB` },
        ],
        form: rejectForm,
      });
    }

    // JIKA AKSI = SETUJU: Update atomik persetujuan admin gedung
    const now = new Date().toISOString();

    const { data: updatedRows, error: uErr } = await supabaseServer
      .from('bookings')
      .update({
        approval_admin_gedung: 'disetujui',
        admin_gedung_responded_at: now,
        admin_responded_at: now,
        admin_gedung_token_expires: now,
        updated_at: now,
      })
      .eq('id', bookingId)
      .in('status', ['menunggu_approval', 'menunggu_dosen'])
      .eq('approval_admin_gedung', 'pending')
      .select('*, rooms:room_id(id, kode, nama, gedung, lantai)');

    if (uErr || !updatedRows || updatedRows.length === 0) {
      // 0 baris terupdate: baca ulang booking terbaru
      const { data: latest } = await supabaseServer
        .from('bookings')
        .select('*, rooms:room_id(id, kode, nama, gedung)')
        .eq('id', bookingId)
        .maybeSingle();

      const penolak = latest?.ditolak_oleh === 'dosen' ? 'Dosen Pengampu' : 'Admin Gedung';
      const alasan = latest?.alasan_tolak_admin_gedung || latest?.alasan_tolak_dosen || latest?.alasan_tolak || '-';

      if (['ditolak', 'ditolak_dosen', 'ditolak_admin', 'dibatalkan', 'dibatalkan_prioritas', 'hangus', 'kedaluwarsa'].includes(latest?.status || '')) {
        return renderHtmlCard({
          title: 'Pengajuan Sudah Ditolak',
          isSuccess: false,
          variant: 'conflict',
          heading: 'Pengajuan Telah Ditolak / Dibatalkan',
          message: `Pengajuan ini sudah ditolak sebelumnya oleh <strong>${escapeHtml(penolak)}</strong> (Alasan: "${escapeHtml(alasan)}").`,
          httpStatus: 409,
        });
      }

      if (latest?.approval_admin_gedung === 'disetujui') {
        return renderHtmlCard({
          title: 'Sudah Anda Setujui',
          isSuccess: true,
          variant: 'success',
          heading: 'Persetujuan Sudah Pernah Dicatat',
          message: 'Persetujuan Admin Gedung sudah berhasil disimpan sebelumnya.',
          httpStatus: 409,
        });
      }

      return renderHtmlCard({
        title: 'Konflik Tindakan',
        isSuccess: false,
        heading: 'Gagal Memproses',
        message: 'Pengajuan ini tidak lagi dalam status menunggu persetujuan.',
        httpStatus: 409,
      });
    }

    const currentBooking = updatedRows[0];
    const appUrl = getPublicAppUrl(request);

    // Baca ulang booking untuk mengecek apakah kedua pihak sudah menyetujui
    const { data: freshBooking } = await supabaseServer
      .from('bookings')
      .select('*, rooms:room_id(id, kode, nama, gedung)')
      .eq('id', bookingId)
      .single();

    let isFullyApproved = false;

    if (freshBooking?.approval_dosen === 'disetujui' && freshBooking?.approval_admin_gedung === 'disetujui') {
      // Update status ke 'dijadwalkan' dengan guard atomik
      const { data: schedRows, error: sErr } = await supabaseServer
        .from('bookings')
        .update({ status: 'dijadwalkan', updated_at: now })
        .eq('id', bookingId)
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
        isFullyApproved = true;
      }
    }

    if (isFullyApproved) {
      return renderHtmlCard({
        title: 'Persetujuan Lengkap — Dijadwalkan',
        isSuccess: true,
        variant: 'success',
        badgeText: '✓ STATUS: RESMI DIJADWALKAN',
        heading: 'Persetujuan Lengkap & Resmi Terjadwal! 🎉',
        message: `Pengajuan peminjaman ruangan <strong>${escapeHtml(currentBooking.rooms?.kode || '')}</strong> telah <strong>disetujui penuh oleh Dosen Pengampu dan Admin Gedung</strong>.<br /><br />Status peminjaman otomatis berubah menjadi <strong>Terjadwal</strong> dan link presensi / check-in telah dikirimkan ke email PJ Kelas.`,
        details: [
          { label: 'Ruangan', value: `${currentBooking.rooms?.kode || ''} - ${currentBooking.rooms?.nama || ''}` },
          { label: 'Mata Kuliah', value: `${currentBooking.mata_kuliah} (${currentBooking.sks} SKS)` },
          { label: 'Persetujuan Admin', value: '✓ Disetujui' },
          { label: 'Persetujuan Dosen', value: '✓ Disetujui' },
          { label: 'Status Akhir', value: 'Terjadwal (Menunggu Check-in)' },
        ],
      });
    }

    return renderHtmlCard({
      title: 'Disetujui Admin Gedung',
      isSuccess: true,
      variant: 'success',
      badgeText: '✓ DISETUJUI ADMIN GEDUNG',
      heading: 'Berhasil Disetujui oleh Admin Gedung!',
      message: `Pengajuan peminjaman ruangan <strong>${escapeHtml(currentBooking.rooms?.kode || '')}</strong> telah berhasil Anda setujui.<br /><br />Saat ini sistem sedang <strong>menunggu tanggapan persetujuan dari Dosen Pengampu (${escapeHtml(currentBooking.nama_dosen || 'Dosen')})</strong>. Setelah dosen menyetujui, jadwal akan otomatis resmi dan link check-in akan diteruskan ke PJ Kelas.`,
      details: [
        { label: 'Ruangan', value: `${currentBooking.rooms?.kode || ''} - ${currentBooking.rooms?.nama || ''}` },
        { label: 'Mata Kuliah', value: `${currentBooking.mata_kuliah} (${currentBooking.sks} SKS)` },
        { label: 'Persetujuan Admin', value: '✓ Disetujui' },
        { label: 'Persetujuan Dosen', value: '⏳ Menunggu Persetujuan Dosen' },
      ],
    });
  } catch (err: any) {
    return renderHtmlCard({
      title: 'Kesalahan Server',
      isSuccess: false,
      heading: 'Kesalahan Server',
      message: 'Terjadi kesalahan tidak terduga: ' + err.message,
      httpStatus: 500,
    });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rawParams = await Promise.resolve(context?.params);
    const bookingId = rawParams?.id;

    let rawToken = '';
    let action = '';
    let alasan = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await request.json();
      rawToken = json.token || '';
      action = json.action || '';
      alasan = json.alasan || '';
    } else {
      const formData = await request.formData();
      rawToken = String(formData.get('token') || '');
      action = String(formData.get('action') || '');
      alasan = String(formData.get('alasan') || '');
    }

    if (!bookingId || !rawToken) {
      return NextResponse.json({ error: 'ID booking dan token verifikasi wajib disertakan.' }, { status: 400 });
    }

    if (action !== 'tolak' && action !== 'setuju') {
      return NextResponse.json({ error: "Aksi tidak valid. Pilihan: 'setuju' atau 'tolak'." }, { status: 400 });
    }

    if (action === 'tolak' && (!alasan || alasan.trim().length < 10)) {
      return NextResponse.json({ error: 'Alasan penolakan wajib diisi minimal 10 karakter.' }, { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const { data: booking, error: bErr } = await supabaseServer
      .from('bookings')
      .select(`
        *,
        rooms:room_id (id, kode, nama, gedung, lantai)
      `)
      .eq('id', bookingId)
      .maybeSingle();

    if (bErr || !booking) {
      return NextResponse.json({ error: 'Pengajuan booking tidak ditemukan.' }, { status: 404 });
    }

    if (booking.admin_gedung_token_hash !== tokenHash) {
      return NextResponse.json({ error: 'Token verifikasi tidak valid.' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const appUrl = getPublicAppUrl(request);

    // JIKA AKSI = SETUJU
    if (action === 'setuju') {
      const { data: updatedRows, error: uErr } = await supabaseServer
        .from('bookings')
        .update({
          approval_admin_gedung: 'disetujui',
          admin_gedung_responded_at: now,
          admin_responded_at: now,
          admin_gedung_token_expires: now,
          updated_at: now,
        })
        .eq('id', bookingId)
        .in('status', ['menunggu_approval', 'menunggu_dosen'])
        .eq('approval_admin_gedung', 'pending')
        .select('*, rooms:room_id(id, kode, nama, gedung, lantai)');

      if (uErr || !updatedRows || updatedRows.length === 0) {
        const { data: latest } = await supabaseServer
          .from('bookings')
          .select('*, rooms:room_id(id, kode, nama, gedung)')
          .eq('id', bookingId)
          .maybeSingle();

        const penolak = latest?.ditolak_oleh === 'dosen' ? 'Dosen Pengampu' : 'Admin Gedung';
        const alasanExisting = latest?.alasan_tolak_admin_gedung || latest?.alasan_tolak_dosen || latest?.alasan_tolak || '';

        if (['ditolak', 'ditolak_dosen', 'ditolak_admin', 'dibatalkan', 'dibatalkan_prioritas', 'hangus', 'kedaluwarsa'].includes(latest?.status || '')) {
          return NextResponse.json(
            { error: `Pengajuan ini sudah ditolak sebelumnya oleh ${penolak} (Alasan: "${alasanExisting}").` },
            { status: 409 }
          );
        }

        if (latest?.approval_admin_gedung === 'disetujui') {
          return NextResponse.json(
            { error: 'Persetujuan Admin Gedung sudah pernah dicatat sebelumnya.' },
            { status: 409 }
          );
        }

        return NextResponse.json(
          { error: 'Pengajuan ini tidak lagi dalam status menunggu persetujuan.' },
          { status: 409 }
        );
      }

      const currentBooking = updatedRows[0];

      // Baca ulang booking untuk mengecek dual gate
      const { data: freshBooking } = await supabaseServer
        .from('bookings')
        .select('*, rooms:room_id(id, kode, nama, gedung)')
        .eq('id', bookingId)
        .single();

      let isFullyApproved = false;

      if (freshBooking?.approval_dosen === 'disetujui' && freshBooking?.approval_admin_gedung === 'disetujui') {
        const { data: schedRows, error: sErr } = await supabaseServer
          .from('bookings')
          .update({ status: 'dijadwalkan', updated_at: now })
          .eq('id', bookingId)
          .in('status', ['menunggu_approval', 'menunggu_dosen'])
          .select();

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
          isFullyApproved = true;
        }
      }

      return NextResponse.json({
        success: true,
        message: isFullyApproved
          ? 'Peminjaman ruangan resmi dijadwalkan dan siap check-in.'
          : 'Persetujuan Admin Gedung berhasil dicatat. Menunggu persetujuan Dosen Pengampu.',
        data: currentBooking,
      });
    }

    // Update penolakan admin gedung secara atomik: status IN ('menunggu_approval', 'menunggu_dosen') AND approval_admin_gedung = 'pending'
    const { data: rejectRows, error: rErr } = await supabaseServer
      .from('bookings')
      .update({
        status: 'ditolak',
        approval_admin_gedung: 'ditolak',
        alasan_tolak_admin_gedung: alasan.trim(),
        alasan_tolak: alasan.trim(),
        ditolak_oleh: 'admin_gedung',
        ditolak_at: now,
        admin_gedung_responded_at: now,
        admin_responded_at: now,
        admin_gedung_token_expires: now, // Invalidate token admin gedung saja
        updated_at: now,
      })
      .eq('id', bookingId)
      .in('status', ['menunggu_approval', 'menunggu_dosen'])
      .eq('approval_admin_gedung', 'pending')
      .select('*, rooms:room_id (id, kode, nama, gedung, lantai)');

    if (rErr || !rejectRows || rejectRows.length === 0) {
      const { data: latest } = await supabaseServer
        .from('bookings')
        .select('*, rooms:room_id (id, kode, nama, gedung)')
        .eq('id', bookingId)
        .maybeSingle();

      const penolak = latest?.ditolak_oleh === 'dosen' ? 'Dosen Pengampu' : 'Admin Gedung';
      const alasanExisting = latest?.alasan_tolak_admin_gedung || latest?.alasan_tolak_dosen || latest?.alasan_tolak || '';

      return NextResponse.json(
        {
          error: `Pengajuan ini sudah pernah diproses atau ditolak sebelumnya oleh ${penolak} (Alasan: "${alasanExisting}").`,
          ditolak_oleh: latest?.ditolak_oleh,
          alasan: alasanExisting,
        },
        { status: 409 }
      );
    }

    const updated = rejectRows[0];

    // Kirim email penolakan ke PJ
    await notifyPjRejection({
      bookingId: updated.id,
      pemohonId: updated.pemohon_id,
      nimPemohon: updated.nim_pemohon,
      roomKode: updated.rooms?.kode || 'Ruangan',
      roomNama: updated.rooms?.nama,
      mataKuliah: updated.mata_kuliah,
      tanggal: updated.tanggal,
      jamMulai: updated.jam_mulai,
      jamSelesai: updated.jam_selesai,
      rejectedBy: 'admin_gedung',
      approverName: `Admin Gedung ${updated.rooms?.gedung || ''}`,
      reason: alasan.trim(),
    });

    if (contentType.includes('application/json')) {
      return NextResponse.json({
        success: true,
        message: 'Pengajuan ruangan berhasil ditolak oleh Admin Gedung.',
        data: updated,
      });
    }

    return renderHtmlCard({
      title: 'Penolakan Berhasil',
      isSuccess: true,
      heading: 'Pengajuan Telah Ditolak',
      message: `Permohonan peminjaman telah berhasil ditolak. Alasan: <em>"${escapeHtml(alasan.trim())}"</em> telah dikirimkan ke PJ Kelas pemohon.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Terjadi kesalahan server: ' + err.message }, { status: 500 });
  }
}
