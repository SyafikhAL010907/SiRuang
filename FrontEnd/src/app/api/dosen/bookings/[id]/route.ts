import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { getPublicAppUrl } from '@/lib/appUrl';
import { notifyPjCheckin, notifyPjRejection, notifyPjDosenApproved } from '@/lib/bookingApprovalHelper';

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

    const { data: dbDosenProfile } = await supabaseServer
      .from('v_user_profiles')
      .select('user_id, identifier, full_name, username')
      .eq('identifier', user.identifier)
      .maybeSingle();

    const isOwner =
      booking.dosen_id === dbDosen.id ||
      (dbDosenProfile?.full_name && booking.nama_dosen?.toLowerCase().includes(dbDosenProfile.full_name.toLowerCase())) ||
      (dbDosenProfile?.username && booking.nama_dosen?.toLowerCase().includes(dbDosenProfile.username.toLowerCase()));

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki hak untuk merespon pengajuan booking ini.' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const appUrl = getPublicAppUrl(request);

    // JIKA AKSI = TOLAK
    if (action === 'tolak') {
      // Update tolak secara atomik
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
          dosen_token_expires: now,
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
        message: 'Pengajuan peminjaman ruangan berhasil ditolak.',
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
    } else if (freshBooking?.approval_dosen === 'disetujui' && freshBooking?.approval_admin_gedung !== 'disetujui') {
      // Dosen baru ACC, admin gedung belum ACC: kirim email & notifikasi info ke PJ
      try {
        await notifyPjDosenApproved({
          bookingId: freshBooking.id,
          pemohonId: freshBooking.pemohon_id,
          nimPemohon: freshBooking.nim_pemohon,
          roomKode: freshBooking.rooms?.kode || 'Ruangan',
          roomNama: freshBooking.rooms?.nama || '',
          mataKuliah: freshBooking.mata_kuliah,
          tanggal: freshBooking.tanggal,
          jamMulai: freshBooking.jam_mulai,
          jamSelesai: freshBooking.jam_selesai,
          dosenName: booking.nama_dosen,
        });
      } catch (dosenNotifErr) {
        console.warn('[DosenApproval] Gagal kirim notifikasi partial dosen ke PJ:', dosenNotifErr);
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
