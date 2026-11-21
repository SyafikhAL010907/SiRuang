import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';
import { getPublicAppUrl } from '@/lib/appUrl';
import { notifyPjCheckin, notifyPjRejection } from '@/lib/bookingApprovalHelper';

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
        approval_dosen,
        approval_admin_gedung,
        alasan_tolak,
        alasan_tolak_dosen,
        alasan_tolak_admin_gedung,
        ditolak_oleh,
        ditolak_at,
        dosen_token_hash,
        dosen_token_expires,
        dosen_responded_at,
        dosen_responded_at_v2,
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

    // Cek status ditolak / final
    if (['ditolak', 'ditolak_dosen', 'ditolak_admin', 'dibatalkan', 'dibatalkan_prioritas', 'hangus', 'kedaluwarsa'].includes(booking.status)) {
      const penolak = booking.ditolak_oleh === 'admin_gedung' ? 'Admin Gedung' : 'Dosen Pengampu';
      const alasan = booking.alasan_tolak_dosen || booking.alasan_tolak_admin_gedung || booking.alasan_tolak || '-';
      return NextResponse.json(
        {
          error: `Pengajuan ini telah ditolak/dibatalkan oleh ${penolak} (Alasan: "${alasan}").`,
          status: booking.status,
          ditolak_oleh: booking.ditolak_oleh,
          alasan,
        },
        { status: 409 }
      );
    }

    // Cek kadaluwarsa token
    if (booking.dosen_token_expires && new Date(booking.dosen_token_expires) < new Date()) {
      return NextResponse.json(
        {
          error: 'Link verifikasi ini sudah kedaluwarsa atau telah digunakan.',
          status: booking.status,
          responded_at: booking.dosen_responded_at_v2 || booking.dosen_responded_at,
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

    // Cek token kedaluwarsa
    if (booking.dosen_token_expires && new Date(booking.dosen_token_expires) < new Date()) {
      return NextResponse.json(
        { error: 'Link verifikasi ini sudah kedaluwarsa atau telah digunakan.' },
        { status: 410 }
      );
    }

    const now = new Date().toISOString();
    const appUrl = getPublicAppUrl(request);

    if (action === 'tolak') {
      // Update atomik tolak: status IN ('menunggu_approval', 'menunggu_dosen') AND approval_dosen = 'pending'
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
          dosen_token_expires: now, // Hanya invalidasi token dosen
          updated_at: now,
        })
        .eq('id', id)
        .in('status', ['menunggu_approval', 'menunggu_dosen'])
        .eq('approval_dosen', 'pending')
        .select();

      if (rErr || !rejectRows || rejectRows.length === 0) {
        const { data: latest } = await supabaseServer
          .from('bookings')
          .select('id, status, ditolak_oleh, alasan_tolak_dosen, alasan_tolak_admin_gedung, alasan_tolak')
          .eq('id', id)
          .maybeSingle();

        const penolak = latest?.ditolak_oleh === 'admin_gedung' ? 'Admin Gedung' : 'Dosen Pengampu';
        const alasanLama = latest?.alasan_tolak_dosen || latest?.alasan_tolak_admin_gedung || latest?.alasan_tolak || '-';

        return NextResponse.json(
          { error: `Pengajuan ini sudah ditolak/dibatalkan atau diproses sebelumnya oleh ${penolak} (Alasan: "${alasanLama}").` },
          { status: 409 }
        );
      }

      await notifyPjRejection({
        bookingId: booking.id,
        pemohonId: booking.pemohon_id,
        nimPemohon: booking.nim_pemohon,
        roomKode: booking.rooms?.kode || 'Ruangan',
        roomNama: booking.rooms?.nama || '',
        mataKuliah: booking.mata_kuliah,
        tanggal: booking.tanggal,
        jamMulai: booking.jam_mulai,
        jamSelesai: booking.jam_selesai,
        rejectedBy: 'dosen',
        approverName: booking.nama_dosen,
        reason: alasan.trim(),
      });

      return NextResponse.json({
        success: true,
        message: 'Pengajuan booking berhasil ditolak.',
        data: rejectRows[0],
      });
    }

    // AKSI = SETUJU: Update atomik kolom approval_dosen
    const { data: updatedRows, error: uErr } = await supabaseServer
      .from('bookings')
      .update({
        approval_dosen: 'disetujui',
        dosen_responded_at_v2: now,
        dosen_responded_at: now,
        dosen_token_expires: now,
        updated_at: now,
      })
      .eq('id', id)
      .in('status', ['menunggu_approval', 'menunggu_dosen'])
      .eq('approval_dosen', 'pending')
      .select('*, rooms:room_id(id, kode, nama)');

    if (uErr || !updatedRows || updatedRows.length === 0) {
      const { data: latest } = await supabaseServer
        .from('bookings')
        .select('id, status, ditolak_oleh, alasan_tolak_dosen, alasan_tolak_admin_gedung, alasan_tolak, approval_dosen')
        .eq('id', id)
        .maybeSingle();

      const penolak = latest?.ditolak_oleh === 'admin_gedung' ? 'Admin Gedung' : 'Dosen Pengampu';
      const alasanLama = latest?.alasan_tolak_dosen || latest?.alasan_tolak_admin_gedung || latest?.alasan_tolak || '-';

      if (['ditolak', 'ditolak_dosen', 'ditolak_admin', 'dibatalkan', 'dibatalkan_prioritas', 'hangus', 'kedaluwarsa'].includes(latest?.status || '')) {
        return NextResponse.json(
          { error: `Pengajuan ini sudah ditolak/dibatalkan sebelumnya oleh ${penolak} (Alasan: "${alasanLama}").` },
          { status: 409 }
        );
      }

      if (latest?.approval_dosen === 'disetujui') {
        return NextResponse.json(
          { error: 'Persetujuan Anda sudah pernah dicatat sebelumnya.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: `Pengajuan ini tidak lagi dalam status menunggu persetujuan (Status saat ini: ${latest?.status || '-'}).` },
        { status: 409 }
      );
    }

    const currentBooking = updatedRows[0];
    const isLegacy = currentBooking.status === 'menunggu_dosen';

    // Baca ulang booking terkini
    const { data: freshBooking } = await supabaseServer
      .from('bookings')
      .select('*, rooms:room_id(id, kode, nama)')
      .eq('id', id)
      .single();

    let isFullyApproved = false;

    if (freshBooking?.approval_dosen === 'disetujui' && freshBooking?.approval_admin_gedung === 'disetujui') {
      // Update status ke 'dijadwalkan' dengan guard atomik status
      const { data: schedRows, error: sErr } = await supabaseServer
        .from('bookings')
        .update({ status: 'dijadwalkan', updated_at: now })
        .eq('id', id)
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
    } else if (isLegacy) {
      // Backward compatible legacy: jika menunggu_dosen, dosen approve langsung ke disetujui_dosen
      const { data: legRows, error: lErr } = await supabaseServer
        .from('bookings')
        .update({ status: 'disetujui_dosen', updated_at: now })
        .eq('id', id)
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

    return NextResponse.json({
      success: true,
      message: isFullyApproved
        ? 'Pengajuan peminjaman ruangan berhasil disetujui dan langsung dijadwalkan.'
        : 'Persetujuan dosen berhasil disimpan. Menunggu persetujuan Admin Gedung.',
      data: currentBooking,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan server: ' + err.message },
      { status: 500 }
    );
  }
}
