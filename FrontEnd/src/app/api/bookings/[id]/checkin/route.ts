import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { sendEmail, escapeHtml } from '@/lib/mailer';
import { notifyBookingPush } from '@/lib/sendPush';

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
      .select('id, identifier, role')
      .eq('identifier', user.identifier)
      .maybeSingle();

    if (!dbUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    // Ambil booking target
    const { data: booking, error: bErr } = await supabaseServer
      .from('bookings')
      .select(`
        *,
        rooms:room_id (id, kode, nama, gedung, lantai)
      `)
      .eq('id', id)
      .maybeSingle();

    if (bErr || !booking) {
      return NextResponse.json({ error: 'Data booking tidak ditemukan' }, { status: 404 });
    }

    // Cek apakah user adalah pemohon atau admin
    const isPemohon = booking.pemohon_id === dbUser.id;
    const isAdmin = dbUser.role === 'admin';

    if (!isPemohon && !isAdmin) {
      return NextResponse.json(
        { error: 'Hanya pemohon (PJ Kelas) atau Admin yang dapat melakukan check-in ruangan.' },
        { status: 403 }
      );
    }

    if (
      booking.status !== 'disetujui_dosen' &&
      booking.status !== 'dijadwalkan_admin' &&
      booking.status !== 'menunggu_checkin' &&
      booking.status !== 'menunggu_dosen'
    ) {
      return NextResponse.json(
        { error: `Check-in tidak dapat dilakukan pada booking dengan status '${booking.status}'. Pastikan pengajuan telah disetujui dosen.` },
        { status: 400 }
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // Update status booking ke 'berlangsung'
    const { data: updatedBooking, error: uErr } = await supabaseServer
      .from('bookings')
      .update({
        status: 'berlangsung',
        check_in_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', id)
      .select()
      .single();

    if (uErr) {
      return NextResponse.json(
        { error: 'Gagal melakukan check-in: ' + uErr.message },
        { status: 500 }
      );
    }

    // Insert log ke tabel checkin_logs
    try {
      await supabaseServer.from('checkin_logs').insert({
        booking_id: booking.id,
        schedule_id: booking.official_schedule_id || null,
        user_id: dbUser.id,
        checked_in_at: nowIso,
        check_type: booking.is_conditional ? 'conditional' : 'booking',
        tanggal: booking.tanggal,
      });
    } catch (logErr) {
      console.warn('Gagal mencatat checkin_logs:', logErr);
    }

    // Push notification check-in berhasil
    try {
      await notifyBookingPush(
        dbUser.identifier,
        'Check-in Berhasil',
        `Check-in ruangan ${booking.rooms?.kode || ''} berhasil dikonfirmasi. Selamat berkegiatan!`,
        '/user'
      );
    } catch (pushErr) {
      console.warn('Gagal push notifikasi checkin:', pushErr);
    }

    // Kirim email notifikasi check-in (E4 ke Dosen, E5 ke PJ) secara fail-soft
    const roomKode = booking.rooms?.kode || 'Ruangan';
    const roomNama = booking.rooms?.nama || '';

    try {
      const { data: participants } = await supabaseServer
        .from('v_user_profiles')
        .select('user_id, email, full_name, role')
        .in('user_id', [booking.dosen_id, booking.pemohon_id]);

      const dosenProf = participants?.find((p) => p.user_id === booking.dosen_id);
      const pjProf = participants?.find((p) => p.user_id === booking.pemohon_id);

      const emailPromises: Promise<any>[] = [];

      // E4: Email ke Dosen pengampu
      if (dosenProf?.email) {
        emailPromises.push(
          sendEmail({
            to: dosenProf.email,
            subject: `Presensi Check-in Selesai: ${roomKode} (${booking.mata_kuliah})`,
            template: 'E4',
            relatedId: booking.id,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #183449; margin-bottom: 8px;">Presensi Check-in Kehadiran Kelas</h2>
                <p style="color: #64748b; font-size: 14px;">Halo Bapak/Ibu <strong>${escapeHtml(booking.nama_dosen || dosenProf.full_name)}</strong>,</p>
                <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                  PJ Kelas <strong>${escapeHtml(booking.nama_pemohon)}</strong> telah berhasil melakukan <strong>Check-in Kehadiran</strong> untuk perkuliahan:
                </p>
                <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Ruangan:</strong> ${escapeHtml(roomKode)} - ${escapeHtml(roomNama)}</p>
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Mata Kuliah:</strong> ${escapeHtml(booking.mata_kuliah)} (${booking.sks} SKS)</p>
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Waktu Perkuliahan:</strong> ${escapeHtml(booking.tanggal)} pukul ${booking.jam_mulai.slice(0, 5)} - ${booking.jam_selesai.slice(0, 5)} WIB</p>
                  <p style="margin: 4px 0; font-size: 13px; color: #15803d;"><strong>Status Denah:</strong> Ditandai MERAH (Sedang Berlangsung)</p>
                </div>
                <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
                  Email ini dikirim secara otomatis oleh Sistem SiRuang Gedung SFD saat PJ Kelas mengonfirmasi kehadiran.
                </p>
              </div>
            `,
          })
        );
      }

      // E5: Email Konfirmasi ke PJ Kelas
      if (pjProf?.email) {
        emailPromises.push(
          sendEmail({
            to: pjProf.email,
            subject: `Check-in Berhasil: Ruangan ${roomKode} Resmi Aktif`,
            template: 'E5',
            relatedId: booking.id,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #166534; margin-bottom: 8px;">Check-in Berhasil Terkonfirmasi!</h2>
                <p style="color: #64748b; font-size: 14px;">Halo <strong>${escapeHtml(booking.nama_pemohon || pjProf.full_name)}</strong>,</p>
                <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                  Presensi kehadiran perkuliahan Anda di <strong>Ruangan ${escapeHtml(roomKode)}</strong> telah terkonfirmasi. Warna ruangan pada denah gedung kini berubah menjadi <strong>MERAH</strong> (Sedang Berlangsung).
                </p>
                <div style="background-color: #f8fafc; border-left: 4px solid #588CBC; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Mata Kuliah:</strong> ${escapeHtml(booking.mata_kuliah)}</p>
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Dosen Pengampu:</strong> ${escapeHtml(booking.nama_dosen)}</p>
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Jadwal:</strong> ${escapeHtml(booking.tanggal)} pukul ${booking.jam_mulai.slice(0, 5)} - ${booking.jam_selesai.slice(0, 5)} WIB</p>
                </div>
                <p style="color: #334155; font-size: 13px; line-height: 1.5;">
                  Harap menjaga kebersihan serta fasilitas di dalam ruangan selama proses perkuliahan berlangsung. Selamat belajar!
                </p>
              </div>
            `,
          })
        );
      }

      await Promise.allSettled(emailPromises);
    } catch (mailErr) {
      console.warn('Gagal mengirim email notifikasi checkin:', mailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Check-in berhasil untuk ruangan ${booking.rooms?.kode || ''}. Ruangan sekarang berstatus sedang digunakan.`,
      data: updatedBooking,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan server: ' + err.message },
      { status: 500 }
    );
  }
}

