import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { evaluateBookingStates } from '@/lib/bookingEvaluator';

export const dynamic = 'force-dynamic';

const HARI_MAP: Record<number, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  0: 'Minggu',
};

export async function GET(request: NextRequest) {
  try {
    await evaluateBookingStates();

    const { searchParams } = new URL(request.url);
    const gedung = (searchParams.get('gedung') || 'SFD').toUpperCase();
    const lantai = parseInt(searchParams.get('lantai') || '8', 10);
    const tanggal = searchParams.get('tanggal') || new Date().toISOString().split('T')[0];
    const jam = searchParams.get('jam') || 'all';

    // Tentukan hari dalam bahasa Indonesia
    const targetDate = new Date(`${tanggal}T00:00:00`);
    const dayOfWeek = targetDate.getDay();
    const dayName = HARI_MAP[dayOfWeek] || 'Senin';

    // 1. Ambil seluruh ruangan di gedung dan lantai target
    const { data: rooms, error: rErr } = await supabaseServer
      .from('rooms')
      .select('id, kode, nama, gedung, lantai, bookable, kapasitas, fasilitas')
      .eq('gedung', gedung)
      .eq('lantai', lantai);

    if (rErr || !rooms) {
      return NextResponse.json(
        { error: 'Gagal mengambil data ruangan: ' + (rErr?.message || '') },
        { status: 500 }
      );
    }

    const roomIds = rooms.map((r) => r.id);

    // 2. Ambil jadwal resmi pada hari tersebut (kolom hari di official_schedules adalah lowercase 'senin', 'minggu', dll)
    const { data: rawSchedules, error: sErr } = await supabaseServer
      .from('official_schedules')
      .select('id, room_id, pj_id, dosen_id, mata_kuliah, hari, jam_mulai, jam_selesai, semester, is_active, is_dummy')
      .in('room_id', roomIds)
      .eq('is_active', true)
      .ilike('hari', dayName.toLowerCase());

    if (sErr) {
      console.warn('Error fetching official schedules:', sErr);
    }

    // Ambil profile dosen & pj untuk memperkaya info jadwal resmi
    const dosenIds = [...new Set((rawSchedules || []).map((s) => s.dosen_id).filter(Boolean))];
    const pjIds = [...new Set((rawSchedules || []).map((s) => s.pj_id).filter(Boolean))];
    const userIds = [...new Set([...dosenIds, ...pjIds])];

    const { data: userProfiles } = userIds.length > 0
      ? await supabaseServer
          .from('v_user_profiles')
          .select('user_id, full_name, kelas')
          .in('user_id', userIds)
      : { data: [] };

    const userMap = Object.fromEntries((userProfiles || []).map((u) => [u.user_id, u]));

    const enrichedSchedules = (rawSchedules || []).map((s) => ({
      ...s,
      nama_dosen: userMap[s.dosen_id]?.full_name || 'Dosen Pengampu',
      nama_pj: userMap[s.pj_id]?.full_name || 'PJ Kelas',
      kelas: userMap[s.pj_id]?.kelas || 'Reguler',
      jadwal_hari: s.hari ? s.hari.charAt(0).toUpperCase() + s.hari.slice(1) : dayName,
    }));

    // 3. Ambil booking aktif pada tanggal tersebut atau yang sedang berstatus pengajuan/aktif
    const { data: bookings } = await supabaseServer
      .from('bookings')
      .select(`
        id,
        room_id,
        nama_pemohon,
        nim_pemohon,
        mata_kuliah,
        kelas,
        nama_dosen,
        tanggal,
        jam_mulai,
        jam_selesai,
        sks,
        status,
        is_conditional
      `)
      .in('room_id', roomIds)
      .in('status', ['menunggu_dosen', 'disetujui_dosen', 'dijadwalkan_admin', 'menunggu_checkin', 'berlangsung']);

    // Helper cek overlap waktu jika jam filter aktif
    const overlapsTime = (itemStart: string, itemEnd: string, filterJam: string): boolean => {
      if (!filterJam || filterJam === 'all') return true;
      const sStart = itemStart.slice(0, 5);
      const sEnd = itemEnd.slice(0, 5);

      if (filterJam.includes('-')) {
        const parts = filterJam.split('-');
        const fStart = parts[0].trim().slice(0, 5);
        const fEnd = parts[1].trim().slice(0, 5);
        return sStart < fEnd && sEnd > fStart;
      } else {
        const point = filterJam.trim().slice(0, 5);
        return sStart <= point && sEnd > point;
      }
    };

    // 4. Hitung status visual dan kumpulkan slot untuk setiap ruangan
    const result: Record<string, any> = {};

    for (const room of rooms) {
      let roomBookings = (bookings || []).filter(
        (b) =>
          b.room_id === room.id &&
          (
            b.tanggal === tanggal ||
            b.status === 'menunggu_dosen' ||
            b.status === 'berlangsung' ||
            b.status === 'disetujui_dosen' ||
            b.status === 'dijadwalkan_admin' ||
            b.status === 'menunggu_checkin'
          )
      );
      let roomSchedules = (enrichedSchedules || []).filter((s) => s.room_id === room.id);

      // Terapkan filter jam jika dipilih
      if (jam && jam !== 'all') {
        roomBookings = roomBookings.filter((b) => overlapsTime(b.jam_mulai, b.jam_selesai, jam));
        roomSchedules = roomSchedules.filter((s) => overlapsTime(s.jam_mulai, s.jam_selesai, jam));
      }

      if (!room.bookable) {
        result[room.kode] = {
          kode: room.kode,
          nama: room.nama,
          bookable: false,
          status: 'fasilitas_umum',
          color: '#757575', // Abu-abu
          fillColor: 'rgba(86,86,86,0.3)',
          strokeColor: '#7A7A7A',
          textColor: '#D0D0D0',
          label: 'Fasilitas Umum',
          bookings: [],
          schedules: [],
        };
        continue;
      }

      // MERAH: HANYA jika sudah check-in dan sedang berlangsung
      const hasCheckedIn = roomBookings.some((b) => b.status === 'berlangsung');

      // KUNING: Dalam pengajuan dosen atau sudah disetujui dosen/terjadwal tapi BELUM check-in
      const hasPendingOrWaitingCheckin = roomBookings.some((b) =>
        ['menunggu_dosen', 'disetujui_dosen', 'dijadwalkan_admin', 'menunggu_checkin'].includes(b.status)
      );

      // Cek apakah ada jadwal resmi
      const hasOfficial = roomSchedules.length > 0;

      let status = 'kosong';
      let color = '#FFFFFF'; // Putih
      let fillColor = 'rgba(255, 255, 255, 0.95)';
      let strokeColor = '#FFFFFF';
      let textColor = '#183449';
      let label = 'Kelas Kosong';

      if (hasCheckedIn) {
        status = 'dipakai';
        color = '#E53935'; // Merah
        fillColor = 'rgba(229, 57, 53, 0.90)';
        strokeColor = '#E53935';
        textColor = '#FFFFFF';
        label = 'Kelas Dipakai (Check-in Aktif)';
      } else if (hasPendingOrWaitingCheckin) {
        status = 'dalam_pengajuan';
        color = '#FFEB3B'; // Kuning
        fillColor = 'rgba(255, 235, 59, 0.92)';
        strokeColor = '#FBC02D';
        textColor = '#183449';
        label = 'Kelas dalam Pengajuan / Menunggu Check-in';
      } else if (hasOfficial) {
        status = 'jadwal_resmi';
        color = '#3B82F6'; // Biru
        fillColor = 'rgba(59, 130, 246, 0.90)';
        strokeColor = '#2563EB';
        textColor = '#FFFFFF';
        label = 'Jadwal Resmi';
      }

      result[room.kode] = {
        kode: room.kode,
        nama: room.nama,
        bookable: true,
        status,
        color,
        fillColor,
        strokeColor,
        textColor,
        label,
        bookings: roomBookings,
        schedules: roomSchedules,
      };
    }

    return NextResponse.json({
      success: true,
      gedung,
      lantai,
      tanggal,
      dayName,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan server: ' + err.message },
      { status: 500 }
    );
  }
}

