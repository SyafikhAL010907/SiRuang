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

    // Ambil email pemohon (PJ)
    const { data: pjProfile } = await supabaseServer
      .from('v_user_profiles')
      .select('user_id, full_name, email, identifier')
      .eq('user_id', booking.pemohon_id)
      .maybeSingle();

    const pjEmail = pjProfile?.email;
    const roomKode = booking.rooms?.kode || 'Ruangan';
    const roomNama = booking.rooms?.nama || '';

    // Kirim email notifikasi ke PJ Kelas (E2 atau E3)
    if (pjEmail) {
      if (action === 'setuju') {
        await sendEmail({
          to: pjEmail,
          subject: `[SiRuang] Pengajuan Ruangan ${roomKode} Disetujui Dosen — Silakan Cek Denah & Check-in`,
          template: 'E2',
          relatedId: booking.id,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #166534; margin-bottom: 8px;">Pengajuan Disetujui Dosen</h2>
              <p style="color: #64748b; font-size: 14px;">Halo <strong>${escapeHtml(booking.nama_pemohon)}</strong>,</p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Dosen pengampu <strong>${escapeHtml(booking.nama_dosen)}</strong> telah <strong>menyetujui</strong> permohonan peminjaman ruangan Anda:
              </p>
              <div style="background-color: #fefce8; border-left: 4px solid #eab308; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                <p style="margin: 4px 0; font-size: 13px;"><strong>Ruangan:</strong> ${escapeHtml(roomKode)} - ${escapeHtml(roomNama)}</p>
                <p style="margin: 4px 0; font-size: 13px;"><strong>Mata Kuliah:</strong> ${escapeHtml(booking.mata_kuliah)} (${booking.sks} SKS)</p>
                <p style="margin: 4px 0; font-size: 13px;"><strong>Waktu:</strong> ${escapeHtml(booking.tanggal)} pukul ${booking.jam_mulai.slice(0, 5)} - ${booking.jam_selesai.slice(0, 5)} WIB</p>
                <p style="margin: 4px 0; font-size: 13px; color: #854d0e;"><strong>Status Denah:</strong> Ditandai Kuning (Menunggu Check-in)</p>
              </div>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Peminjaman ruangan telah disetujui tanpa perlu persetujuan admin lagi. Silakan buka <strong>Denah Visual</strong> atau menu <strong>Check-in Ruangan</strong>, lalu klik tombol <strong>Check-in</strong> saat perkuliahan dimulai agar warna denah berubah menjadi <strong>Merah</strong> (ruangan resmi sedang digunakan).
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

