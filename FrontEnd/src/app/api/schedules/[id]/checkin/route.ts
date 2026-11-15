import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { sendEmail, escapeHtml } from '@/lib/mailer';
import { notifyBookingPushByUserId } from '@/lib/sendPush';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Harap login terlebih dahulu' }, { status: 401 });
    }

    const { data: dbUser } = await supabaseServer
      .from('authentication')
      .select('id, identifier, role, username')
      .eq('identifier', user.identifier)
      .maybeSingle();

    if (!dbUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    // Ambil jadwal resmi
    const { data: schedule, error: sErr } = await supabaseServer
      .from('official_schedules')
      .select(`
        *,
        rooms:room_id (id, kode, nama, gedung, lantai)
      `)
      .eq('id', id)
      .maybeSingle();

    if (sErr || !schedule) {
      return NextResponse.json({ error: 'Jadwal resmi tidak ditemukan' }, { status: 404 });
    }

    // Validasi apakah user adalah dosen/pj dari jadwal resmi atau admin
    const isOwner = schedule.dosen_id === dbUser.id || schedule.pj_id === dbUser.id;
    const isAdmin = dbUser.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Hanya Dosen/PJ pemilik jadwal resmi atau Admin yang dapat melakukan check-in jadwal resmi.' },
        { status: 403 }
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const todayDate = now.toISOString().split('T')[0];

    // Catat log check-in ke checkin_logs
    await supabaseServer.from('checkin_logs').insert({
      schedule_id: schedule.id,
      user_id: dbUser.id,
      checked_in_at: nowIso,
      check_type: 'official',
      tanggal: todayDate,
    });

    // Cari booking bersyarat aktif yang menumpangi jadwal resmi ini
    const { data: conflictingBookings } = await supabaseServer
      .from('bookings')
      .select(`
        id,
        nama_pemohon,
        pemohon_id,
        mata_kuliah,
        tanggal,
        jam_mulai,
        jam_selesai,
        status,
        rooms:room_id (kode, nama)
      `)
      .eq('room_id', schedule.room_id)
      .eq('is_conditional', true)
      .in('status', ['menunggu_dosen', 'disetujui_dosen', 'dijadwalkan_admin', 'menunggu_checkin', 'berlangsung']);

    let cancelledCount = 0;

    if (conflictingBookings && conflictingBookings.length > 0) {
      for (const cb of conflictingBookings) {
        // Update status booking ke 'dibatalkan_prioritas'
        await supabaseServer
          .from('bookings')
          .update({
            status: 'dibatalkan_prioritas',
            updated_at: nowIso,
          })
          .eq('id', cb.id);

        cancelledCount++;

        // Ambil profil pemohon untuk kirim email E9
        const { data: pemohonProfile } = await supabaseServer
          .from('v_user_profiles')
          .select('email, full_name')
          .eq('user_id', cb.pemohon_id)
          .maybeSingle();

        if (pemohonProfile?.email) {
          const roomKode = (cb as any).rooms?.kode || 'Ruangan';
          await sendEmail({
            to: pemohonProfile.email,
            subject: `[SiRuang] Pembatalan Prioritas Booking Ruangan ${roomKode}`,
            template: 'E9',
            relatedId: cb.id,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #991b1b; margin-bottom: 8px;">Pemberitahuan Pembatalan Prioritas</h2>
                <p style="color: #64748b; font-size: 14px;">Halo <strong>${escapeHtml(cb.nama_pemohon)}</strong>,</p>
                <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                  Pemilik jadwal resmi untuk mata kuliah <strong>${escapeHtml(schedule.mata_kuliah)}</strong> telah melakukan presensi / check-in kehadiran di ruangan <strong>${escapeHtml(roomKode)}</strong>.
                </p>
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                  <p style="margin: 4px 0; font-size: 13px; color: #991b1b;">
                    <strong>Status:</strong> Booking bersyarat Anda untuk mata kuliah <strong>${escapeHtml(cb.mata_kuliah)}</strong> dibatalkan demi prioritas jadwal perkuliahan resmi universitas.
                  </p>
                </div>
                <p style="color: #334155; font-size: 13px; line-height: 1.6;">
                  💡 <em>Saran:</em> Silakan mencari alternatif ruangan teori kosong di gedung lain (seperti Gedung L Elektro atau Gedung L Sipil) melalui layanan Help Desk atau koordinasi dengan staf pengelola ruangan.
                </p>
              </div>
            `,
          });
        }

        // Kirim push notification ke PJ Kelas terkait pembatalan prioritas (E9)
        try {
          const roomKode = (cb as any).rooms?.kode || 'Ruangan';
          await notifyBookingPushByUserId(
            cb.pemohon_id,
            'Booking Dibatalkan Prioritas',
            `Pemilik jadwal resmi telah check-in di ${roomKode}. Silakan cari alternatif ruangan di Gedung L.`,
            '/user'
          );
        } catch (pushErr) {
          console.warn('Gagal kirim push notification pembatalan:', pushErr);
        }
      }
    }

    // Catat sesi aktif jadwal resmi ke bookings agar status ruangan langsung berubah menjadi MERAH (berlangsung)
    await supabaseServer.from('bookings').insert({
      room_id: schedule.room_id,
      pemohon_id: dbUser.id,
      nama_pemohon: schedule.nama_pj || dbUser.username || 'PJ Jadwal Resmi',
      nim_pemohon: schedule.nim_pj || 'RESMI',
      prodi_pemohon: 'Resmi SIAKAD',
      angkatan_pemohon: '2025',
      mata_kuliah: schedule.mata_kuliah,
      kelas: schedule.kelas || 'Reguler',
      nama_dosen: schedule.nama_dosen || 'Dosen Pengampu',
      tanggal: todayDate,
      jam_mulai: schedule.jam_mulai,
      jam_selesai: schedule.jam_selesai,
      sks: 2,
      keperluan: 'Perkuliahan Resmi SIAKAD (Checked In)',
      status: 'berlangsung',
      is_conditional: false,
      created_at: nowIso,
      updated_at: nowIso,
    });

    return NextResponse.json({
      success: true,
      message: `Presensi check-in jadwal resmi ${schedule.mata_kuliah} berhasil dicatat.${
        cancelledCount > 0 ? ` Sebanyak ${cancelledCount} booking bersyarat telah dibatalkan prioritas.` : ''
      }`,
      data: {
        schedule_id: schedule.id,
        checked_in_at: nowIso,
        cancelled_conditional_bookings: cancelledCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan server: ' + err.message },
      { status: 500 }
    );
  }
}

