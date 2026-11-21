import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { sendEmail, escapeHtml } from '@/lib/mailer';
import { notifyBookingPushByUserId } from '@/lib/sendPush';
import { generateCheckinToken } from '@/lib/checkinToken';
import { getPublicAppUrl } from '@/lib/appUrl';
import { isAnyAdmin } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !isAnyAdmin(user.role)) {
      return NextResponse.json({ error: 'Unauthorized: Akses khusus admin' }, { status: 403 });
    }

    const rawParams = await Promise.resolve(context?.params);
    const bookingId = rawParams?.id;

    if (!bookingId) {
      return NextResponse.json({ error: 'ID booking tidak valid' }, { status: 400 });
    }

    const body = await request.json();
    const action = body.action?.trim()?.toLowerCase();
    const alasan = body.alasan?.trim() || null;

    if (action !== 'jadwalkan' && action !== 'tolak') {
      return NextResponse.json(
        { error: 'Aksi tidak valid. Pilihan: jadwalkan atau tolak' },
        { status: 400 }
      );
    }

    if (action === 'tolak' && (!alasan || alasan.length < 5)) {
      return NextResponse.json(
        { error: 'Alasan penolakan admin wajib diisi minimal 5 karakter' },
        { status: 400 }
      );
    }

    // Ambil data admin user id dari database authentication berdasarkan identifier
    const { data: adminUser } = await supabaseServer
      .from('authentication')
      .select('id')
      .eq('identifier', user.identifier)
      .maybeSingle();

    const adminId = adminUser?.id || null;

    // Cek booking eksisting
    const { data: existing, error: findErr } = await supabaseServer
      .from('bookings')
      .select('id, status, is_conditional')
      .eq('id', bookingId)
      .maybeSingle();

    if (findErr || !existing) {
      return NextResponse.json({ error: 'Data booking tidak ditemukan' }, { status: 404 });
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
      admin_id: adminId,
    };

    if (action === 'jadwalkan') {
      updatePayload.status = 'dijadwalkan_admin';
      updatePayload.admin_responded_at = new Date().toISOString();
    } else if (action === 'tolak') {
      updatePayload.status = 'ditolak_admin';
      updatePayload.alasan_tolak = alasan;
      updatePayload.admin_responded_at = new Date().toISOString();
    }

    const { data: updated, error: updateErr } = await supabaseServer
      .from('bookings')
      .update(updatePayload)
      .eq('id', bookingId)
      .select(`
        *,
        rooms:room_id (id, kode, nama, gedung, lantai, bookable)
      `)
      .single();

    if (updateErr) {
      return NextResponse.json(
        { error: 'Gagal memproses booking: ' + updateErr.message },
        { status: 500 }
      );
    }

    // Ambil profile pemohon untuk notifikasi
    try {
      let pjEmail = '';
      let pjFullName = updated.nama_pemohon;

      const { data: pjProfile } = await supabaseServer
        .from('v_user_profiles')
        .select('user_id, email, full_name, identifier')
        .eq('user_id', updated.pemohon_id)
        .maybeSingle();

      if (pjProfile?.email) {
        pjEmail = pjProfile.email.trim();
        if (pjProfile.full_name) pjFullName = pjProfile.full_name;
      }

      if (!pjEmail && updated.pemohon_id) {
        const { data: pDirect } = await supabaseServer
          .from('profiles')
          .select('email, full_name')
          .eq('user_id', updated.pemohon_id)
          .maybeSingle();
        if (pDirect?.email) {
          pjEmail = pDirect.email.trim();
          if (pDirect.full_name) pjFullName = pDirect.full_name;
        }
      }

      const roomKode = updated.rooms?.kode || 'Ruangan';
      const roomNama = updated.rooms?.nama || '';
      const appUrl = getPublicAppUrl(request);
      const checkinToken = generateCheckinToken(updated.id, updated.pemohon_id);
      const quickCheckinUrl = `${appUrl}/api/bookings/${updated.id}/quick-checkin?token=${checkinToken}`;
      const checkinUrl = `${appUrl}/user?tab=checkin`;

      if (action === 'jadwalkan') {
        if (pjEmail) {
          await sendEmail({
            to: pjEmail,
            subject: `[SiRuang] Peminjaman Ruangan ${roomKode} Resmi Dijadwalkan Admin — Siap Check-in`,
            template: 'E4',
            relatedId: updated.id,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                
                <div style="text-align: center; margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid #f1f5f9;">
                  <img src="${appUrl}/icon-512.png" alt="SiRuang Logo" width="68" height="68" style="border-radius: 16px; box-shadow: 0 6px 14px rgba(24, 52, 73, 0.12); margin-bottom: 10px; display: inline-block;" />
                  <h1 style="color: #183449; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.3px;">SiRuang &bull; Gedung SFD</h1>
                  <p style="color: #64748b; font-size: 12px; margin: 3px 0 0 0; font-weight: 500;">Peminjaman Resmi Dijadwalkan Admin</p>
                </div>

                <div style="display: inline-block; background-color: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                  &#10003; Dijadwalkan Admin
                </div>

                <h2 style="color: #166534; margin: 0 0 8px 0; font-size: 18px; font-weight: 800;">Peminjaman Ruangan Telah Dikonfirmasi! 🎉</h2>
                <p style="color: #64748b; font-size: 14px; margin-top: 0;">Halo <strong>${escapeHtml(pjFullName)}</strong>,</p>
                <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                  Peminjaman ruangan Anda untuk mata kuliah <strong>${escapeHtml(updated.mata_kuliah)}</strong> di <strong>${escapeHtml(roomKode)} - ${escapeHtml(roomNama)}</strong> telah resmi dikonfirmasi dan dijadwalkan oleh Administrator Ruangan.
                </p>

                <div style="background-color: #fefce8; border: 1px solid #fef08a; border-left: 4px solid #eab308; padding: 16px 20px; margin: 18px 0; border-radius: 12px;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                      <td style="padding: 5px 0; color: #713f12; width: 140px;">Ruangan:</td>
                      <td style="padding: 5px 0; color: #1e293b; font-weight: 700;">${escapeHtml(roomKode)} - ${escapeHtml(roomNama)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #713f12;">Waktu:</td>
                      <td style="padding: 5px 0; color: #1e293b; font-weight: 700;">${escapeHtml(updated.tanggal)} &bull; ${updated.jam_mulai.slice(0, 5)} - ${updated.jam_selesai.slice(0, 5)} WIB</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #854d0e;">Status:</td>
                      <td style="padding: 5px 0; color: #854d0e; font-weight: 800;">Terjadwal (Menunggu Check-in)</td>
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
              </div>
            `,
          });
        }
        await notifyBookingPushByUserId(
          updated.pemohon_id,
          'Booking Dijadwalkan Admin',
          `Peminjaman ruangan ${roomKode} (${updated.mata_kuliah}) resmi dijadwalkan oleh Admin.`,
          '/user'
        );
      } else if (action === 'tolak') {
        if (pjEmail) {
          await sendEmail({
            to: pjEmail,
            subject: `[SiRuang] Peminjaman Ruangan ${roomKode} Ditolak Admin`,
            template: 'E5',
            relatedId: updated.id,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                <div style="text-align: center; margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid #f1f5f9;">
                  <img src="${appUrl}/icon-512.png" alt="SiRuang Logo" width="68" height="68" style="border-radius: 16px; box-shadow: 0 6px 14px rgba(24, 52, 73, 0.12); margin-bottom: 10px; display: inline-block;" />
                  <h1 style="color: #183449; font-size: 20px; font-weight: 800; margin: 0;">SiRuang &bull; Gedung SFD</h1>
                  <p style="color: #64748b; font-size: 12px; margin: 3px 0 0 0;">Peminjaman Ditolak Admin</p>
                </div>
                <div style="display: inline-block; background-color: #fee2e2; color: #991b1b; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                  &#10005; Ditolak Admin
                </div>
                <h2 style="color: #991b1b; margin: 0 0 8px 0; font-size: 18px; font-weight: 800;">Peminjaman Ruangan Ditolak Admin</h2>
                <p style="color: #64748b; font-size: 14px; margin-top: 0;">Halo <strong>${escapeHtml(pjFullName)}</strong>,</p>
                <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                  Peminjaman ruangan Anda untuk mata kuliah <strong>${escapeHtml(updated.mata_kuliah)}</strong> di <strong>${escapeHtml(roomKode)}</strong> ditolak oleh Administrator Ruangan.
                </p>
                ${
                  alasan
                    ? `<div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 18px 0; border-radius: 10px;">
                        <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #991b1b;">Alasan Penolakan:</p>
                        <p style="margin: 0; font-size: 14px; color: #7f1d1d; font-style: italic;">"${escapeHtml(alasan)}"</p>
                      </div>`
                    : ''
                }
              </div>
            `,
          });
        }
      }
    } catch (notifErr) {
      console.warn('Gagal memproses notifikasi admin action:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: action === 'jadwalkan' ? 'Peminjaman ruangan berhasil dijadwalkan!' : 'Peminjaman ruangan telah ditolak.',
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  return PUT(request, context);
}


