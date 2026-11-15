import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';
import { sendEmail, escapeHtml } from '@/lib/mailer';
import { notifyBookingPush } from '@/lib/sendPush';

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

    // Ambil email pemohon (PJ) dari profiles / v_user_profiles
    const { data: pjProfile } = await supabaseServer
      .from('v_user_profiles')
      .select('user_id, full_name, email, identifier')
      .eq('user_id', booking.pemohon_id)
      .maybeSingle();

    const pjEmail = pjProfile?.email;
    const roomKode = booking.rooms?.kode || 'Ruangan';
    const roomNama = booking.rooms?.nama || '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
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
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
              <h2 style="color: #166534; margin-bottom: 6px; font-size: 20px;">Booking Disetujui Dosen! 🎉</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 0;">Halo <strong>${escapeHtml(booking.nama_pemohon)}</strong>,</p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Kabar baik! Dosen pengampu <strong>${escapeHtml(booking.nama_dosen)}</strong> telah <strong>menyetujui (ACC)</strong> permohonan peminjaman ruangan Anda:
              </p>
              <div style="background-color: #fefce8; border-left: 4px solid #eab308; padding: 14px 18px; margin: 18px 0; border-radius: 8px;">
                <p style="margin: 4px 0; font-size: 13px; color: #1e293b;"><strong>Ruangan:</strong> ${escapeHtml(roomKode)} - ${escapeHtml(roomNama)}</p>
                <p style="margin: 4px 0; font-size: 13px; color: #1e293b;"><strong>Mata Kuliah:</strong> ${escapeHtml(booking.mata_kuliah)} (${booking.sks} SKS)</p>
                <p style="margin: 4px 0; font-size: 13px; color: #1e293b;"><strong>Waktu Perkuliahan:</strong> ${escapeHtml(booking.tanggal)} pukul ${booking.jam_mulai.slice(0, 5)} - ${booking.jam_selesai.slice(0, 5)} WIB</p>
                <p style="margin: 4px 0; font-size: 13px; color: #854d0e;"><strong>Status Denah:</strong> Ditandai KUNING (Disetujui Dosen · Siap Check-in)</p>
              </div>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Peminjaman Anda telah aktif di sistem tanpa perlu persetujuan admin lagi. Silakan buka menu <strong>Jadwal & Check-in</strong> pada dashboard PJ Kelas untuk melakukan presensi kehadiran saat jam kuliah berlangsung agar warna denah berubah menjadi <strong>MERAH</strong> (resmi sedang digunakan).
              </p>
              <div style="margin: 24px 0; text-align: center;">
                <a href="${checkinUrl}" style="background-color: #183449; color: #ffffff; padding: 13px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(24, 52, 73, 0.2);">
                  Buka Menu Jadwal & Check-in
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                Email ini dikirim otomatis oleh Sistem SiRuang Gedung SFD.
              </p>
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

