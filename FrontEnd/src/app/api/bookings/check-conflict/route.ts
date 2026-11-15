import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { evaluateBookingStates } from '@/lib/bookingEvaluator';

export const dynamic = 'force-dynamic';

const HARI_MAP: Record<number, string> = {
  0: 'minggu',
  1: 'senin',
  2: 'selasa',
  3: 'rabu',
  4: 'kamis',
  5: 'jumat',
  6: 'sabtu',
};

function calculateEndTime(startTime: string, sks: number): string {
  const [hStr, mStr] = startTime.split(':');
  let h = parseInt(hStr, 10);
  let m = parseInt(mStr, 10);
  const durationMin = sks * 50;
  const totalMin = h * 60 + m + durationMin;
  const endH = Math.floor(totalMin / 60);
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;
}

export async function GET(request: NextRequest) {
  try {
    await evaluateBookingStates();

    const { searchParams } = new URL(request.url);
    const roomKode = searchParams.get('room_kode')?.trim();
    let roomId = searchParams.get('room_id')?.trim();
    const tanggal = searchParams.get('tanggal')?.trim();
    const jamMulaiRaw = searchParams.get('jam_mulai')?.trim();
    const sks = parseInt(searchParams.get('sks') || '2', 10);

    if (!tanggal || !jamMulaiRaw) {
      return NextResponse.json({
        success: true,
        roomConflict: null,
        pjConflict: null,
        officialConflict: null,
        canBook: true,
      });
    }

    const jamMulai = jamMulaiRaw.length === 5 ? `${jamMulaiRaw}:00` : jamMulaiRaw;
    const jamSelesai = calculateEndTime(jamMulai, sks);

    // Cari room jika cuma dikirim kode
    if (!roomId && roomKode) {
      const { data: roomByCode } = await supabaseServer
        .from('rooms')
        .select('id, kode, nama, bookable')
        .eq('kode', roomKode)
        .maybeSingle();

      if (roomByCode) {
        roomId = roomByCode.id;
      }
    }

    if (!roomId) {
      return NextResponse.json({ error: 'Ruangan tidak valid' }, { status: 400 });
    }

    // Ambil auth user (opsional untuk cek konflik PJ)
    const authUser = await getUserFromRequest(request);
    let dbUser: any = null;
    if (authUser) {
      const { data: userProfile } = await supabaseServer
        .from('v_user_profiles')
        .select('user_id, identifier, full_name, role')
        .eq('identifier', authUser.identifier)
        .maybeSingle();
      dbUser = userProfile;
    }

    // 1. Cek bentrok ruangan (Double Booking Prevention)
    const { data: roomConflicts } = await supabaseServer
      .from('bookings')
      .select('id, mata_kuliah, kelas, nama_pemohon, jam_mulai, jam_selesai, status')
      .eq('room_id', roomId)
      .eq('tanggal', tanggal)
      .in('status', ['menunggu_dosen', 'disetujui_dosen', 'dijadwalkan_admin', 'menunggu_checkin', 'berlangsung'])
      .lt('jam_mulai', jamSelesai)
      .gt('jam_selesai', jamMulai);

    let roomConflictInfo: any = null;
    if (roomConflicts && roomConflicts.length > 0) {
      const c = roomConflicts[0];
      const statusLabel =
        c.status === 'menunggu_dosen'
          ? 'sedang dalam antrean pengajuan verifikasi dosen'
          : c.status === 'berlangsung'
          ? 'sedang digunakan secara aktif'
          : 'telah disetujui / dibooking';

      roomConflictInfo = {
        hasConflict: true,
        reason: `Ruangan ini ${statusLabel} untuk "${c.mata_kuliah}" (${c.kelas}) pada jam ${c.jam_mulai.slice(0, 5)}–${c.jam_selesai.slice(0, 5)} WIB.`,
        booking: c,
      };
    }

    // 2. Cek bentrok PJ (PJ tidak boleh booking > 1 ruangan di jam bersamaan)
    let pjConflictInfo: any = null;
    if (dbUser) {
      const { data: pjConflicts } = await supabaseServer
        .from('bookings')
        .select(`
          id,
          mata_kuliah,
          kelas,
          jam_mulai,
          jam_selesai,
          status,
          rooms:room_id (kode, nama)
        `)
        .or(`pemohon_id.eq.${dbUser.user_id},nim_pemohon.eq.${dbUser.identifier}`)
        .eq('tanggal', tanggal)
        .in('status', ['menunggu_dosen', 'disetujui_dosen', 'dijadwalkan_admin', 'menunggu_checkin', 'berlangsung'])
        .lt('jam_mulai', jamSelesai)
        .gt('jam_selesai', jamMulai);

      if (pjConflicts && pjConflicts.length > 0) {
        const c = pjConflicts[0];
        const conflictRoom = (c.rooms as any)?.kode || 'ruangan lain';
        pjConflictInfo = {
          hasConflict: true,
          reason: `Anda sudah memiliki peminjaman aktif di Ruangan ${conflictRoom} ("${c.mata_kuliah}") pada jam ${c.jam_mulai.slice(0, 5)}–${c.jam_selesai.slice(0, 5)} WIB. Seorang PJ tidak dapat meminjam lebih dari satu ruangan di waktu yang bersamaan.`,
          booking: c,
        };
      }
    }

    // 3. Cek jadwal resmi (Kuliah Bersyarat)
    const targetDate = new Date(`${tanggal}T00:00:00`);
    const dayOfWeek = targetDate.getDay();
    const dayName = HARI_MAP[dayOfWeek] || 'senin';

    const { data: overlapSchedules } = await supabaseServer
      .from('official_schedules')
      .select('id, mata_kuliah, jam_mulai, jam_selesai')
      .eq('room_id', roomId)
      .eq('hari', dayName)
      .eq('is_active', true)
      .lt('jam_mulai', jamSelesai)
      .gt('jam_selesai', jamMulai);

    let officialConflictInfo: any = null;
    if (overlapSchedules && overlapSchedules.length > 0) {
      const s = overlapSchedules[0];
      officialConflictInfo = {
        hasConflict: true,
        isConditional: true,
        reason: `Slot waktu ini menumpangi jadwal kuliah resmi: ${s.mata_kuliah} (${s.jam_mulai.slice(0, 5)}–${s.jam_selesai.slice(0, 5)} WIB). Pengajuan akan berstatus Bersyarat.`,
        schedule: s,
      };
    }

    const canBook = !roomConflictInfo && !pjConflictInfo;

    return NextResponse.json({
      success: true,
      canBook,
      roomConflict: roomConflictInfo,
      pjConflict: pjConflictInfo,
      officialConflict: officialConflictInfo,
      calculated: {
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}

