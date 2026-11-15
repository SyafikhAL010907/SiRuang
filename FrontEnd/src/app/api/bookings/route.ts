import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { sendEmail, escapeHtml } from '@/lib/mailer';
import { getPublicAppUrl } from '@/lib/appUrl';
import { notifyBookingPush } from '@/lib/sendPush';
import { evaluateBookingStates } from '@/lib/bookingEvaluator';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await evaluateBookingStates();

    const authUser = await getUserFromRequest(request);
    let dbUser: any = null;
    if (authUser) {
      const { data } = await supabaseServer
        .from('v_user_profiles')
        .select('*')
        .eq('identifier', authUser.identifier)
        .maybeSingle();
      dbUser = data;
    }

    let query = supabaseServer
      .from('bookings')
      .select(`
        *,
        rooms:room_id (id, kode, nama, gedung, lantai, bookable)
      `)
      .order('created_at', { ascending: false });

    if (dbUser && dbUser.role === 'pj_kelas') {
      const { data: myBookings } = await supabaseServer
        .from('bookings')
        .select(`
          *,
          rooms:room_id (id, kode, nama, gedung, lantai, bookable)
        `)
        .or(`pemohon_id.eq.${dbUser.user_id},nim_pemohon.eq.${dbUser.identifier}`)
        .in('status', ['menunggu_dosen', 'disetujui_dosen', 'dijadwalkan_admin', 'menunggu_checkin', 'berlangsung'])
        .order('created_at', { ascending: false });

      if (myBookings && myBookings.length > 0) {
        return NextResponse.json({
          success: true,
          data: myBookings,
        });
      }
    }

    const { data: allBookings, error: bErr } = await supabaseServer
      .from('bookings')
      .select(`
        *,
        rooms:room_id (id, kode, nama, gedung, lantai, bookable)
      `)
      .in('status', ['menunggu_dosen', 'disetujui_dosen', 'dijadwalkan_admin', 'menunggu_checkin', 'berlangsung'])
      .order('created_at', { ascending: false });
    if (bErr) {
      return NextResponse.json({ error: bErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: allBookings || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}

const HARI_MAP: Record<number, string> = {
  0: 'minggu',
  1: 'senin',
  2: 'selasa',
  3: 'rabu',
  4: 'kamis',
  5: 'jumat',
  6: 'sabtu',
};

// Hitung jam selesai berdasarkan jam mulai + SKS * 50 menit
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

export async function POST(request: Request) {
  try {
    const authUser = await getUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: Sesi tidak valid atau telah berakhir' }, { status: 401 });
    }

    // Ambil akun pemohon
    const { data: dbUser, error: uErr } = await supabaseServer
      .from('v_user_profiles')
      .select('*')
      .eq('identifier', authUser.identifier)
      .maybeSingle();

    if (uErr || !dbUser) {
      return NextResponse.json({ error: 'Data pemohon tidak ditemukan' }, { status: 404 });
    }

    if (dbUser.role !== 'pj_kelas' && dbUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya akun PJ Kelas yang berhak mengajukan peminjaman ruangan.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const roomKode = body.room_kode?.trim();
    let roomId = body.room_id?.trim();
    const relationId = body.relation_id?.trim() || null;
    const mataKuliah = body.mata_kuliah?.trim();
    const kelas = body.kelas?.trim() || dbUser.kelas || 'Reguler';
    const prodi = body.prodi?.trim() || dbUser.prodi || '';
    const fakultas = body.fakultas?.trim() || dbUser.faculty || '';
    const angkatan = body.angkatan?.trim() || dbUser.angkatan || '';
    const dosenId = parseInt(body.dosen_id, 10);
    const namaDosen = body.nama_dosen?.trim();
    const tanggal = body.tanggal?.trim();
    const sks = parseInt(body.sks, 10) || 2;
    let jamMulai = body.jam_mulai?.trim();

    if (!tanggal) {
      return NextResponse.json({ error: 'Tanggal peminjaman wajib diisi' }, { status: 400 });
    }
    if (!jamMulai) {
      return NextResponse.json({ error: 'Jam mulai peminjaman wajib diisi' }, { status: 400 });
    }
    if (isNaN(sks) || sks < 1 || sks > 4) {
      return NextResponse.json({ error: 'Jumlah SKS harus antara 1 sampai 4 SKS' }, { status: 400 });
    }
    if (!mataKuliah) {
      return NextResponse.json({ error: 'Mata kuliah wajib diisi' }, { status: 400 });
    }
    if (isNaN(dosenId) || dosenId <= 0) {
      return NextResponse.json({ error: 'Dosen pengampu wajib dipilih' }, { status: 400 });
    }

    // Normalisasi jamMulai (HH:mm:00)
    if (jamMulai.length === 5) {
      jamMulai = `${jamMulai}:00`;
    }

    // Hitung jam selesai di server (jamMulai + sks * 50 min)
    const jamSelesai = calculateEndTime(jamMulai, sks);

    if (jamSelesai > '17:00:00') {
      return NextResponse.json(
        { error: 'Kombinasi jam mulai dan durasi SKS melewati jam operasional kampus (maksimal 17:00).' },
        { status: 400 }
      );
    }

    // Validasi hari (Senin - Jumat)
    const targetDate = new Date(`${tanggal}T00:00:00`);
    const dayOfWeek = targetDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json(
        { error: 'Peminjaman ruangan hanya diizinkan pada hari kerja (Senin - Jumat).' },
        { status: 400 }
      );
    }
    const dayName = HARI_MAP[dayOfWeek] || 'senin';

    // Cari room jika cuma dikirim kode
    if (!roomId && roomKode) {
      const { data: roomByCode } = await supabaseServer
        .from('rooms')
        .select('id, kode, bookable')
        .eq('kode', roomKode)
        .maybeSingle();

      if (roomByCode) {
        roomId = roomByCode.id;
        if (!roomByCode.bookable) {
          return NextResponse.json({ error: `Ruangan ${roomKode} tidak tersedia untuk peminjaman` }, { status: 400 });
        }
      }
    }

    if (!roomId) {
      return NextResponse.json({ error: 'Ruangan tidak valid atau belum dipilih' }, { status: 400 });
    }

    // Cek apakah ruangan bookable
    const { data: roomTarget, error: rErr } = await supabaseServer
      .from('rooms')
      .select('id, kode, nama, bookable, lantai')
      .eq('id', roomId)
      .maybeSingle();

    if (rErr || !roomTarget || !roomTarget.bookable) {
      return NextResponse.json(
        { error: `Ruangan ${roomTarget?.kode || ''} tidak dapat dibooking.` },
        { status: 400 }
      );
    }

    // Cek dosen pengampu
    const { data: dosenUser, error: dErr } = await supabaseServer
      .from('v_user_profiles')
      .select('user_id, username, full_name, email, identifier, role')
      .eq('user_id', dosenId)
      .maybeSingle();

    if (dErr || !dosenUser || dosenUser.role !== 'dosen') {
      return NextResponse.json(
        { error: 'Dosen yang dipilih tidak valid atau belum terdaftar.' },
        { status: 400 }
      );
    }

    // 1. CEK DOUBLE BOOKING RUANGAN (Mencegah peminjaman tumpang tindih pada ruangan yang sama)
    const { data: roomConflicts } = await supabaseServer
      .from('bookings')
      .select('id, mata_kuliah, kelas, nama_pemohon, jam_mulai, jam_selesai, status')
      .eq('room_id', roomId)
      .eq('tanggal', tanggal)
      .in('status', ['menunggu_dosen', 'disetujui_dosen', 'dijadwalkan_admin', 'menunggu_checkin', 'berlangsung'])
      .lt('jam_mulai', jamSelesai)
      .gt('jam_selesai', jamMulai);

    if (roomConflicts && roomConflicts.length > 0) {
      const c = roomConflicts[0];
      const statusLabel =
        c.status === 'menunggu_dosen'
          ? 'sedang dalam antrean pengajuan verifikasi dosen'
          : c.status === 'berlangsung'
          ? 'sedang digunakan secara aktif'
          : 'telah disetujui / dibooking';

      return NextResponse.json(
        {
          error: `Ruangan ${roomTarget.kode} tidak dapat dibooking karena ${statusLabel} untuk mata kuliah "${c.mata_kuliah}" (${c.kelas}) pada jam ${c.jam_mulai.slice(0, 5)}–${c.jam_selesai.slice(0, 5)} WIB. Untuk mencegah double booking, silakan pilih slot waktu atau ruangan lain.`,
        },
        { status: 409 }
      );
    }

    // 2. CEK BENTROK JADWAL PJ KELAS (PJ Kelas tidak boleh booking lebih dari satu ruangan di waktu yang bersamaan)
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
      return NextResponse.json(
        {
          error: `Anda sudah memiliki peminjaman aktif di Ruangan ${conflictRoom} untuk "${c.mata_kuliah}" pada jam ${c.jam_mulai.slice(0, 5)}–${c.jam_selesai.slice(0, 5)} WIB. Seorang PJ Kelas tidak dapat mengajukan peminjaman lebih dari satu ruangan di waktu yang bersamaan.`,
        },
        { status: 409 }
      );
    }

    // Cek apakah ada jadwal resmi yang tumpang tindih di hari & jam ini (booking bersyarat)
    const { data: overlapSchedules } = await supabaseServer
      .from('official_schedules')
      .select('id, mata_kuliah, jam_mulai, jam_selesai, pj_id')
      .eq('room_id', roomId)
      .eq('hari', dayName)
      .eq('is_active', true)
      .lt('jam_mulai', jamSelesai)
      .gt('jam_selesai', jamMulai);

    let isConditional = false;
    let officialScheduleId: string | null = null;

    if (overlapSchedules && overlapSchedules.length > 0) {
      isConditional = true;
      officialScheduleId = overlapSchedules[0].id;
    }

    // Buat token persetujuan dosen
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 hari

    // Insert ke tabel bookings
    const { data: newBooking, error: insErr } = await supabaseServer
      .from('bookings')
      .insert({
        room_id: roomId,
        pemohon_id: dbUser.user_id,
        dosen_id: dosenId,
        relation_id: relationId,
        nama_pemohon: dbUser.full_name || dbUser.username,
        nim_pemohon: dbUser.identifier,
        mata_kuliah: mataKuliah,
        kelas,
        prodi,
        fakultas,
        angkatan,
        nama_dosen: dosenUser.full_name || dosenUser.username || namaDosen,
        tanggal,
        sks,
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
        is_conditional: isConditional,
        official_schedule_id: officialScheduleId,
        status: 'menunggu_dosen',
        dosen_token_hash: tokenHash,
        dosen_token_expires: tokenExpires,
      })
      .select(`
        *,
        rooms:room_id (id, kode, nama, gedung, lantai)
      `)
      .single();

    if (insErr) {
      return NextResponse.json(
        { error: 'Gagal mengajukan booking: ' + insErr.message },
        { status: 500 }
      );
    }

    // Tentukan target email dosen strictly dari data profil dosen (tanpa fallback admin)
    let targetDosenEmail = dosenUser.email?.trim() || '';

    // 1. Coba cari langsung ke tabel profiles jika v_user_profiles email bernilai null
    if (!targetDosenEmail && dosenUser.user_id) {
      try {
        const { data: pData } = await supabaseServer
          .from('profiles')
          .select('email')
          .eq('user_id', dosenUser.user_id)
          .maybeSingle();
        if (pData?.email) targetDosenEmail = pData.email.trim();
      } catch (err) {
        console.warn('[bookings/POST] Gagal lookup profiles email dosen:', err);
      }
    }

    // 2. Coba cari di registration_requests berdasarkan identifier NIDN/NIP
    if (!targetDosenEmail && dosenUser.identifier) {
      try {
        const { data: rData } = await supabaseServer
          .from('registration_requests')
          .select('email')
          .eq('identifier', dosenUser.identifier)
          .not('email', 'is', null)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (rData?.email) targetDosenEmail = rData.email.trim();
      } catch (err) {
        console.warn('[bookings/POST] Gagal lookup registration_requests email dosen:', err);
      }
    }

    // Kirim notifikasi email ke Dosen jika target email dosen tersedia di profilnya
    console.log(`[bookings/POST] Dosen email check: id=${dosenUser.user_id} email="${targetDosenEmail}" SMTP_HOST="${process.env.SMTP_HOST ? 'SET' : 'MISSING'}"`);
    if (targetDosenEmail) {
      const appUrl = getPublicAppUrl(request);
      const accUrl = `${appUrl}/api/bookings/${newBooking.id}/quick-action?token=${rawToken}&action=setuju`;
      const tolakUrl = `${appUrl}/api/bookings/${newBooking.id}/quick-action?token=${rawToken}&action=tolak`;
      const reviewUrl = `${appUrl}/dosen/review/${newBooking.id}?token=${rawToken}`;

      try {
        const mailResult = await sendEmail({
          to: targetDosenEmail,
          subject: `[SiRuang] Pengajuan Peminjaman Ruangan: ${roomTarget.kode} (${mataKuliah})`,
          template: 'E1',
          relatedId: newBooking.id,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
              
              <!-- Header Brand & Logo -->
              <div style="text-align: center; margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid #f1f5f9;">
                <img src="${appUrl}/icon-512.png" alt="SiRuang Logo" width="68" height="68" style="border-radius: 16px; box-shadow: 0 6px 14px rgba(24, 52, 73, 0.12); margin-bottom: 10px; display: inline-block;" />
                <h1 style="color: #183449; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.3px;">SiRuang &bull; Gedung SFD</h1>
                <p style="color: #64748b; font-size: 12px; margin: 3px 0 0 0; font-weight: 500;">Sistem Verifikasi &amp; Peminjaman Ruangan Perkuliahan</p>
              </div>

              <div style="display: inline-block; background-color: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                Permohonan Masuk
              </div>

              <h2 style="color: #183449; margin: 0 0 8px 0; font-size: 18px; font-weight: 800;">Verifikasi Pengajuan Ruangan Kelas</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 0;">Halo Bapak/Ibu <strong>${escapeHtml(dosenUser.full_name || dosenUser.username)}</strong>,</p>
              
              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
                PJ Kelas <strong>${escapeHtml(dbUser.full_name || dbUser.username)}</strong> (NIM: ${escapeHtml(dbUser.identifier)}, Kelas: ${escapeHtml(kelas)}) mengajukan permohonan ruangan untuk perkuliahan dengan rincian berikut:
              </p>

              <!-- Card Detail Pengajuan -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #588CBC; padding: 16px 20px; margin: 18px 0; border-radius: 12px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="padding: 5px 0; color: #64748b; width: 140px;">Ruangan:</td>
                    <td style="padding: 5px 0; color: #1e293b; font-weight: 700;">${escapeHtml(roomTarget.kode)} - ${escapeHtml(roomTarget.nama)} (Lantai ${roomTarget.lantai || 8})</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #64748b;">Mata Kuliah:</td>
                    <td style="padding: 5px 0; color: #1e293b; font-weight: 700;">${escapeHtml(mataKuliah)} (${sks} SKS)</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #64748b;">Waktu Kuliah:</td>
                    <td style="padding: 5px 0; color: #1e293b; font-weight: 700;">${dayName.toUpperCase()}, ${tanggal} &bull; ${jamMulai.slice(0, 5)} - ${jamSelesai.slice(0, 5)} WIB</td>
                  </tr>
                  ${isConditional ? `
                  <tr>
                    <td style="padding: 5px 0; color: #b45309;">Keterangan:</td>
                    <td style="padding: 5px 0; color: #b45309; font-weight: 700;">Bersyarat (Menumpangi jadwal perkuliahan)</td>
                  </tr>` : ''}
                </table>
              </div>

              <p style="color: #334155; font-size: 14px; font-weight: 600; margin: 20px 0 14px 0; text-align: center;">
                Tanggapi langsung dengan memilih aksi cepat di bawah ini:
              </p>

              <!-- Tombol Aksi Desain Modern & Simetris: ACC & Tolak -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="table-layout: fixed; width: 100%; max-width: 440px; margin: 22px auto; border-collapse: separate; border-spacing: 12px 0;">
                <tr>
                  <td align="center" valign="middle" style="width: 50%; padding: 0;">
                    <a href="${accUrl}" style="display: block; box-sizing: border-box; width: 100%; background: #16a34a; background-image: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff; padding: 13px 14px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 13px; line-height: 1.3; text-align: center; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.32); white-space: nowrap;">
                      <span style="font-size: 14px; vertical-align: middle; margin-right: 6px;">&#10004;&#65039;</span><span style="vertical-align: middle;">Setujui (ACC)</span>
                    </a>
                  </td>
                  <td align="center" valign="middle" style="width: 50%; padding: 0;">
                    <a href="${tolakUrl}" style="display: block; box-sizing: border-box; width: 100%; background: #dc2626; background-image: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; padding: 13px 14px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 13px; line-height: 1.3; text-align: center; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.28); white-space: nowrap;">
                      <span style="font-size: 14px; vertical-align: middle; margin-right: 6px;">&#10006;&#65039;</span><span style="vertical-align: middle;">Tolak Pengajuan</span>
                    </a>
                  </td>
                </tr>
              </table>

              <p style="text-align: center; margin: 12px 0 0 0;">
                <a href="${reviewUrl}" style="color: #588CBC; font-size: 12px; text-decoration: underline; font-weight: 600;">
                  atau buka tinjauan lengkap di dashboard web SiRuang
                </a>
              </p>

              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 26px 0 16px 0;" />
              <div style="background-color: #f8fafc; border-radius: 10px; padding: 12px 16px; border: 1px dashed #cbd5e1;">
                <p style="color: #64748b; font-size: 11px; margin: 0; line-height: 1.5;">
                  &bull; <strong>1-Klik Langsung Selesai:</strong> Menekan tombol Setujui (ACC) langsung mengubah status ruangan menjadi <strong>KUNING (Disetujui Dosen)</strong> tanpa perlu login ke web.<br />
                  &bull; <strong>Notifikasi Otomatis:</strong> Begitu di-ACC, email presensi &amp; check-in akan otomatis terkirim ke PJ Kelas pemohon.
                </p>
              </div>
            </div>
          `,
        });
        console.log(`[bookings/POST] Email E1 result: success=${mailResult.success} error="${mailResult.error || '-'}"`);
      } catch (mailErr) {
        console.warn('Gagal mengirim email ke dosen:', mailErr);
      }
    } else {
      console.warn(`[bookings/POST] Email dosen TIDAK dikirim — dosenUser.email kosong/null. dosenId=${dosenUser.user_id}`);
    }

    // Kirim push notification ke PJ Pemohon dan Dosen Pengampu (fail-soft)
    try {
      await Promise.allSettled([
        notifyBookingPush(
          dbUser.identifier,
          'Pengajuan Terkirim',
          `Peminjaman ruangan ${roomTarget.kode} (${mataKuliah}) telah diajukan, menunggu persetujuan dosen.`,
          '/user'
        ),
        notifyBookingPush(
          dosenUser.identifier,
          'Pengajuan Ruangan Baru',
          `PJ Kelas ${dbUser.full_name || dbUser.username} mengajukan ruangan ${roomTarget.kode} (${mataKuliah}).`,
          '/user'
        ),
      ]);
    } catch (pushErr) {
      console.warn('Gagal mengirim push notification:', pushErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Pengajuan peminjaman ruangan berhasil diajukan dan sedang menunggu persetujuan dosen.',
      data: newBooking,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}
