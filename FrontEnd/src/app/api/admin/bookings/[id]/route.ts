import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { sendEmail, escapeHtml } from '@/lib/mailer';
import { notifyBookingPushByUserId } from '@/lib/sendPush';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
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
      const { data: pjProfile } = await supabaseServer
        .from('v_user_profiles')
        .select('user_id, email, full_name, identifier')
        .eq('user_id', updated.pemohon_id)
        .maybeSingle();

      const roomKode = updated.rooms?.kode || 'Ruangan';

      if (action === 'jadwalkan') {
        if (pjProfile?.email) {
          await sendEmail({
            to: pjProfile.email,
            subject: `[SiRuang] Peminjaman Ruangan ${roomKode} Resmi Dijadwalkan Admin`,
            template: 'E4',
            relatedId: updated.id,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #166534; margin-bottom: 8px;">Peminjaman Ruangan Dijadwalkan</h2>
                <p style="color: #64748b; font-size: 14px;">Halo <strong>${escapeHtml(updated.nama_pemohon)}</strong>,</p>
                <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                  Peminjaman ruangan Anda untuk mata kuliah <strong>${escapeHtml(updated.mata_kuliah)}</strong> di <strong>${escapeHtml(roomKode)}</strong> telah dikonfirmasi dan resmi dijadwalkan oleh Administrator Ruangan.
                </p>
                <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Waktu:</strong> ${escapeHtml(updated.tanggal)} (${updated.jam_mulai.slice(0, 5)} - ${updated.jam_selesai.slice(0, 5)} WIB)</p>
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Status:</strong> Terjadwal (Menunggu Check-in)</p>
                </div>
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
        if (pjProfile?.email) {
          await sendEmail({
            to: pjProfile.email,
            subject: `[SiRuang] Peminjaman Ruangan ${roomKode} Ditolak Admin`,
            template: 'E5',
            relatedId: updated.id,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #991b1b; margin-bottom: 8px;">Peminjaman Ruangan Ditolak Admin</h2>
                <p style="color: #64748b; font-size: 14px;">Halo <strong>${escapeHtml(updated.nama_pemohon)}</strong>,</p>
                <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                  Peminjaman ruangan Anda untuk mata kuliah <strong>${escapeHtml(updated.mata_kuliah)}</strong> di <strong>${escapeHtml(roomKode)}</strong> ditolak oleh Administrator Ruangan.
                </p>
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Alasan Penolakan Admin:</strong></p>
                  <p style="margin: 4px 0; font-size: 14px; color: #7f1d1d; font-style: italic;">"${escapeHtml(alasan)}"</p>
                </div>
              </div>
            `,
          });
        }
        await notifyBookingPushByUserId(
          updated.pemohon_id,
          'Booking Ditolak Admin',
          `Peminjaman ruangan ${roomKode} ditolak admin: "${alasan}".`,
          '/user'
        );
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


