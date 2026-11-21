import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { isAnyAdmin, isAdminDev, isBuildingAdmin } from '@/lib/roles';
import { getPublicAppUrl } from '@/lib/appUrl';
import { getGedungForAdmin, notifyPjCheckin, notifyPjRejection } from '@/lib/bookingApprovalHelper';

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

    // AdminDev / akun 'admin' lama: view-only untuk aksi persetujuan booking
    if (isAdminDev(user.role)) {
      return NextResponse.json(
        {
          error:
            'Forbidden: Admin Dev hanya memiliki hak view-only pada persetujuan booking. Persetujuan dilakukan oleh Admin Gedung.',
        },
        { status: 403 }
      );
    }

    const rawParams = await Promise.resolve(context?.params);
    const bookingId = rawParams?.id;

    if (!bookingId) {
      return NextResponse.json({ error: 'ID booking tidak valid' }, { status: 400 });
    }

    const body = await request.json();
    const action = body.action?.trim()?.toLowerCase(); // 'setuju' | 'jadwalkan' | 'tolak'
    const alasan = body.alasan?.trim() || null;

    if (action !== 'jadwalkan' && action !== 'setuju' && action !== 'tolak') {
      return NextResponse.json(
        { error: "Aksi tidak valid. Pilihan: 'setuju' / 'jadwalkan' atau 'tolak'" },
        { status: 400 }
      );
    }

    // Tolak wajib alasan minimal 10 karakter
    if (action === 'tolak' && (!alasan || alasan.length < 10)) {
      return NextResponse.json(
        { error: 'Alasan penolakan admin gedung wajib diisi minimal 10 karakter' },
        { status: 400 }
      );
    }

    // Ambil akun admin di tabel authentication
    const { data: adminUser } = await supabaseServer
      .from('authentication')
      .select('id, identifier, role, username')
      .eq('identifier', user.identifier)
      .maybeSingle();

    const adminId = adminUser?.id || null;

    // Ambil data booking beserta informasi gedung ruangan
    const { data: booking, error: findErr } = await supabaseServer
      .from('bookings')
      .select(`
        *,
        rooms:room_id (id, kode, nama, gedung, lantai, bookable)
      `)
      .eq('id', bookingId)
      .maybeSingle();

    if (findErr || !booking) {
      return NextResponse.json({ error: 'Data booking tidak ditemukan' }, { status: 404 });
    }

    // Validasi wewenang admin gedung: hanya boleh untuk booking di gedungnya
    if (isBuildingAdmin(user.role)) {
      const allowedBuildings = await getGedungForAdmin(user.identifier, user.role);
      const roomGedung = (booking.rooms as any)?.gedung;

      if (!roomGedung || !allowedBuildings.includes(roomGedung)) {
        return NextResponse.json(
          {
            error: `Forbidden: Anda hanya berwenang memproses permohonan gedung [${allowedBuildings.join(
              ', '
            )}]. Ruangan ini berada di gedung "${roomGedung || '-'}".`,
          },
          { status: 403 }
        );
      }
    }

    const now = new Date().toISOString();
    const appUrl = getPublicAppUrl(request);
    const approverName = adminUser?.username || user.username || 'Admin Gedung';

    // JIKA AKSI = TOLAK
    if (action === 'tolak') {
      // Update penolakan secara atomik: status IN ('menunggu_approval', 'menunggu_dosen') AND approval_admin_gedung = 'pending'
      const { data: rejectRows, error: rErr } = await supabaseServer
        .from('bookings')
        .update({
          status: 'ditolak',
          approval_admin_gedung: 'ditolak',
          alasan_tolak_admin_gedung: alasan,
          alasan_tolak: alasan,
          ditolak_oleh: 'admin_gedung',
          ditolak_at: now,
          admin_id: adminId,
          admin_gedung_id: adminId,
          admin_gedung_responded_at: now,
          admin_responded_at: now,
          admin_gedung_token_expires: now,
          updated_at: now,
        })
        .eq('id', bookingId)
        .in('status', ['menunggu_approval', 'menunggu_dosen'])
        .eq('approval_admin_gedung', 'pending')
        .select();

      if (rErr || !rejectRows || rejectRows.length === 0) {
        // 0 baris: baca ulang booking terkini
        const { data: latest } = await supabaseServer
          .from('bookings')
          .select('id, status, ditolak_oleh, alasan_tolak_dosen, alasan_tolak_admin_gedung, alasan_tolak')
          .eq('id', bookingId)
          .maybeSingle();

        const penolak = latest?.ditolak_oleh === 'dosen' ? 'Dosen Pengampu' : 'Admin Gedung';
        const alasanLama = latest?.alasan_tolak_admin_gedung || latest?.alasan_tolak_dosen || latest?.alasan_tolak || '-';

        return NextResponse.json(
          {
            error: `Pengajuan ini sudah ditolak/dibatalkan atau diproses sebelumnya oleh ${penolak} (Alasan: "${alasanLama}").`,
          },
          { status: 409 }
        );
      }

      await notifyPjRejection({
        bookingId: booking.id,
        pemohonId: booking.pemohon_id,
        nimPemohon: booking.nim_pemohon,
        roomKode: (booking.rooms as any)?.kode || 'Ruangan',
        roomNama: (booking.rooms as any)?.nama || '',
        mataKuliah: booking.mata_kuliah,
        tanggal: booking.tanggal,
        jamMulai: booking.jam_mulai,
        jamSelesai: booking.jam_selesai,
        rejectedBy: 'admin_gedung',
        approverName,
        reason: alasan!,
      });

      return NextResponse.json({
        success: true,
        message: 'Pengajuan booking berhasil ditolak oleh Admin Gedung.',
        data: rejectRows[0],
      });
    }

    // JIKA AKSI = SETUJU / JADWALKAN
    // Update atomik kolom approval_admin_gedung
    const { data: updatedRows, error: uErr } = await supabaseServer
      .from('bookings')
      .update({
        approval_admin_gedung: 'disetujui',
        admin_id: adminId,
        admin_gedung_id: adminId,
        admin_gedung_responded_at: now,
        admin_responded_at: now,
        admin_gedung_token_expires: now,
        updated_at: now,
      })
      .eq('id', bookingId)
      .in('status', ['menunggu_approval', 'menunggu_dosen'])
      .eq('approval_admin_gedung', 'pending')
      .select('*, rooms:room_id(id, kode, nama, gedung)');

    if (uErr || !updatedRows || updatedRows.length === 0) {
      // 0 baris terupdate: baca ulang status booking
      const { data: latest } = await supabaseServer
        .from('bookings')
        .select('id, status, ditolak_oleh, alasan_tolak_dosen, alasan_tolak_admin_gedung, alasan_tolak, approval_admin_gedung')
        .eq('id', bookingId)
        .maybeSingle();

      const penolak = latest?.ditolak_oleh === 'dosen' ? 'Dosen Pengampu' : 'Admin Gedung';
      const alasanLama = latest?.alasan_tolak_admin_gedung || latest?.alasan_tolak_dosen || latest?.alasan_tolak || '-';

      if (['ditolak', 'ditolak_dosen', 'ditolak_admin', 'dibatalkan', 'dibatalkan_prioritas', 'hangus', 'kedaluwarsa'].includes(latest?.status || '')) {
        return NextResponse.json(
          {
            error: `Pengajuan ini sudah ditolak/dibatalkan sebelumnya oleh ${penolak} (Alasan: "${alasanLama}").`,
          },
          { status: 409 }
        );
      }

      if (latest?.approval_admin_gedung === 'disetujui') {
        return NextResponse.json(
          {
            error: 'Persetujuan Admin Gedung sudah pernah dicatat sebelumnya.',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: `Pengajuan ini tidak lagi dalam status menunggu persetujuan (Status saat ini: ${latest?.status || '-'}).`,
        },
        { status: 409 }
      );
    }

    // Baca ulang booking terkini
    const { data: freshBooking } = await supabaseServer
      .from('bookings')
      .select('*, rooms:room_id(id, kode, nama, gedung)')
      .eq('id', bookingId)
      .single();

    let isFullyApproved = false;

    if (freshBooking?.approval_dosen === 'disetujui' && freshBooking?.approval_admin_gedung === 'disetujui') {
      // Update status ke 'dijadwalkan' dengan guard atomik status
      const { data: schedRows, error: sErr } = await supabaseServer
        .from('bookings')
        .update({
          status: 'dijadwalkan',
          updated_at: now,
        })
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

    return NextResponse.json({
      success: true,
      message: isFullyApproved
        ? 'Peminjaman ruangan berhasil disetujui penuh dan resmi dijadwalkan.'
        : 'Persetujuan Admin Gedung berhasil dicatat. Menunggu persetujuan Dosen Pengampu.',
      data: updatedRows[0],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}
