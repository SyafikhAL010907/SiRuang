import { supabaseServer } from './supabaseServer';
import { sendEmail, escapeHtml } from './mailer';
import { notifyBookingPushByUserId } from './sendPush';
import { generateCheckinToken } from './checkinToken';

export interface AdminGedungInfo {
  adminId: number;
  email: string;
  fullName: string;
  username: string;
  identifier: string;
  gedungKode: string;
}

/**
 * Mencari akun admin gedung berdasarkan kode gedung (rooms.gedung).
 * Lookup: admin_gedung_mapping -> authentication -> profiles (v_user_profiles).
 * Desain generik tanpa hardcode 'SFD'.
 */
export async function getAdminGedungForBuilding(gedungKode: string): Promise<AdminGedungInfo | null> {
  if (!gedungKode) return null;

  try {
    // 1. Cari mapping gedung ke admin_id murni dari tabel admin_gedung_mapping
    const { data: mapping, error: mapErr } = await supabaseServer
      .from('admin_gedung_mapping')
      .select('admin_id, gedung_kode')
      .eq('gedung_kode', gedungKode.trim())
      .limit(1)
      .maybeSingle();

    const adminId: number | null = mapping?.admin_id || null;

    if (!adminId) {
      console.warn(`[getAdminGedungForBuilding] Tidak ditemukan pemetaan admin_gedung_mapping untuk gedung '${gedungKode}'.`);
      return null;
    }

    // 2. Ambil profil admin gedung dari v_user_profiles
    const { data: adminProfile } = await supabaseServer
      .from('v_user_profiles')
      .select('user_id, username, full_name, email, identifier, role')
      .eq('user_id', adminId)
      .maybeSingle();

    let email = adminProfile?.email?.trim() || '';
    const fullName = adminProfile?.full_name?.trim() || adminProfile?.username || `Admin Gedung ${gedungKode}`;
    const username = adminProfile?.username || `admin_${gedungKode.toLowerCase()}`;
    const identifier = adminProfile?.identifier || '';

    // 3. Fallback profil langsung dari tabel profiles jika email di view kosong
    if (!email) {
      try {
        const { data: pDirect } = await supabaseServer
          .from('profiles')
          .select('email, full_name')
          .eq('user_id', adminId)
          .maybeSingle();
        if (pDirect?.email) email = pDirect.email.trim();
      } catch (err) {
        console.warn('[getAdminGedungForBuilding] Gagal query profiles:', err);
      }
    }

    // 4. Fallback dari registration_requests jika ada
    if (!email && identifier) {
      try {
        const { data: rDirect } = await supabaseServer
          .from('registration_requests')
          .select('email')
          .eq('identifier', identifier)
          .not('email', 'is', null)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (rDirect?.email) email = rDirect.email.trim();
      } catch (err) {
        console.warn('[getAdminGedungForBuilding] Gagal query registration_requests:', err);
      }
    }

    return {
      adminId,
      email,
      fullName,
      username,
      identifier,
      gedungKode,
    };
  } catch (err) {
    console.error(`[getAdminGedungForBuilding] Error mencari admin untuk gedung ${gedungKode}:`, err);
    return null;
  }
}

/**
 * Mencari gedung yang ditugaskan ke akun admin tertentu.
 */
export async function getGedungForAdmin(adminIdentifier: string, adminRole?: string): Promise<string[]> {
  try {
    const { data: userAuth } = await supabaseServer
      .from('authentication')
      .select('id, role')
      .eq('identifier', adminIdentifier)
      .maybeSingle();

    if (userAuth) {
      const { data: mappings } = await supabaseServer
        .from('admin_gedung_mapping')
        .select('gedung_kode')
        .eq('admin_id', userAuth.id);

      if (mappings && mappings.length > 0) {
        return mappings.map((m) => m.gedung_kode);
      }
    }

    return [];
  } catch (err) {
    console.error('[getGedungForAdmin] Error mencari gedung admin:', err);
    return [];
  }
}

/**
 * Mengambil email dan nama lengkap PJ pemohon dengan multi-fallback.
 */
export async function getPjContact(pemohonId: number | null | undefined, nimPemohon?: string | null): Promise<{ email: string; fullName: string }> {
  let pjEmail = '';
  let pjFullName = '';

  if (pemohonId) {
    const { data: p1 } = await supabaseServer
      .from('v_user_profiles')
      .select('email, full_name, username')
      .eq('user_id', pemohonId)
      .maybeSingle();
    if (p1?.email) pjEmail = p1.email.trim();
    if (p1?.full_name) pjFullName = p1.full_name;
    else if (p1?.username) pjFullName = p1.username;
  }

  if (!pjEmail && pemohonId) {
    const { data: pDirect } = await supabaseServer
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', pemohonId)
      .maybeSingle();
    if (pDirect?.email) pjEmail = pDirect.email.trim();
    if (pDirect?.full_name && !pjFullName) pjFullName = pDirect.full_name;
  }

  if (!pjEmail && nimPemohon) {
    const { data: pNim } = await supabaseServer
      .from('v_user_profiles')
      .select('email, full_name, username')
      .eq('identifier', nimPemohon)
      .maybeSingle();
    if (pNim?.email) pjEmail = pNim.email.trim();
    if (pNim?.full_name && !pjFullName) pjFullName = pNim.full_name;
    else if (pNim?.username && !pjFullName) pjFullName = pNim.username;
  }

  return { email: pjEmail, fullName: pjFullName || nimPemohon || 'PJ Kelas' };
}

/**
 * Mengirimkan email penolakan pengajuan ke PJ Kelas.
 */
export async function notifyPjRejection({
  bookingId,
  pemohonId,
  nimPemohon,
  roomKode,
  roomNama,
  mataKuliah,
  tanggal,
  jamMulai,
  jamSelesai,
  rejectedBy,
  approverName,
  reason,
}: {
  bookingId: string;
  pemohonId?: number | null;
  nimPemohon?: string | null;
  roomKode: string;
  roomNama?: string;
  mataKuliah: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  rejectedBy: 'dosen' | 'admin_gedung';
  approverName: string;
  reason: string;
}) {
  const { email, fullName } = await getPjContact(pemohonId, nimPemohon);
  const pihakLabel = rejectedBy === 'dosen' ? 'Dosen Pengampu' : 'Admin Gedung';

  if (email) {
    await sendEmail({
      to: email,
      subject: `[SiRuang] Pengajuan Ruangan Ditolak oleh ${pihakLabel}: ${roomKode} (${mataKuliah})`,
      template: 'E3',
      relatedId: bookingId,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #fee2e2; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          
          <div style="text-align: center; margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid #f1f5f9;">
            <h1 style="color: #991b1b; font-size: 20px; font-weight: 800; margin: 0;">SiRuang &bull; Pemberitahuan Penolakan</h1>
            <p style="color: #64748b; font-size: 12px; margin: 3px 0 0 0;">Status Pengajuan Peminjaman Ruangan</p>
          </div>

          <div style="display: inline-block; background-color: #fee2e2; color: #991b1b; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 14px;">
            ✕ Pengajuan Ditolak
          </div>

          <h2 style="color: #991b1b; margin: 0 0 8px 0; font-size: 18px; font-weight: 800;">Pengajuan Ruangan Tidak Disetujui</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">Halo <strong>${escapeHtml(fullName)}</strong>,</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Mohon maaf, permohonan peminjaman ruangan Anda untuk mata kuliah <strong>${escapeHtml(mataKuliah)}</strong> di ruangan <strong>${escapeHtml(roomKode)}${roomNama ? ' - ' + escapeHtml(roomNama) : ''}</strong> pada <strong>${escapeHtml(tanggal)} (${escapeHtml(jamMulai.slice(0, 5))}–${escapeHtml(jamSelesai.slice(0, 5))} WIB)</strong> telah <strong>DITOLAK</strong> oleh <strong>${escapeHtml(pihakLabel)} (${escapeHtml(approverName)})</strong>.
          </p>

          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 16px 20px; margin: 18px 0; border-radius: 12px;">
            <p style="font-size: 12px; font-weight: 700; color: #991b1b; margin: 0 0 6px 0; text-transform: uppercase;">
              Alasan Penolakan dari ${escapeHtml(pihakLabel)}:
            </p>
            <p style="font-size: 14px; color: #1e293b; margin: 0; line-height: 1.5; font-style: italic;">
              "${escapeHtml(reason)}"
            </p>
          </div>

          <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
            Ruangan telah dibebaskan kembali. Anda dipersilakan untuk memilih ruangan lain atau slot waktu berbeda sesuai ketersediaan di aplikasi SiRuang.
          </p>
        </div>
      `,
    });
  }

  if (pemohonId) {
    try {
      await notifyBookingPushByUserId(
        pemohonId,
        'Pengajuan Ruangan Ditolak',
        `Peminjaman ${roomKode} ditolak oleh ${pihakLabel} (${approverName}): "${reason.slice(0, 60)}"`,
        '/user'
      );
    } catch (pushErr) {
      console.warn('[notifyPjRejection] Gagal kirim push notification:', pushErr);
    }
  }
}

/**
 * Mengirimkan email konfirmasi resmi dijadwalkan & link check-in ke PJ Kelas.
 */
export async function notifyPjCheckin({
  bookingId,
  pemohonId,
  nimPemohon,
  roomKode,
  roomNama,
  mataKuliah,
  tanggal,
  jamMulai,
  jamSelesai,
  appUrl,
}: {
  bookingId: string;
  pemohonId?: number | null;
  nimPemohon?: string | null;
  roomKode: string;
  roomNama?: string;
  mataKuliah: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  appUrl: string;
}) {
  const { email, fullName } = await getPjContact(pemohonId, nimPemohon);
  const targetPemohonId = pemohonId || 0;
  const checkinToken = generateCheckinToken(bookingId, targetPemohonId);
  const quickCheckinUrl = `${appUrl}/api/bookings/${bookingId}/quick-checkin?token=${checkinToken}`;

  if (email) {
    await sendEmail({
      to: email,
      subject: `[SiRuang] Peminjaman Ruangan ${roomKode} Resmi Dijadwalkan — Siap Check-in`,
      template: 'E4',
      relatedId: bookingId,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          
          <div style="text-align: center; margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid #f1f5f9;">
            <h1 style="color: #183449; font-size: 20px; font-weight: 800; margin: 0;">SiRuang &bull; Peminjaman Terjadwal</h1>
            <p style="color: #64748b; font-size: 12px; margin: 3px 0 0 0;">Persetujuan Lengkap (Dosen &amp; Admin Gedung)</p>
          </div>

          <div style="display: inline-block; background-color: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 14px;">
            ✓ Resmi Dijadwalkan
          </div>

          <h2 style="color: #166534; margin: 0 0 8px 0; font-size: 18px; font-weight: 800;">Peminjaman Ruangan Telah Disetujui Penuh! 🎉</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">Halo <strong>${escapeHtml(fullName)}</strong>,</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Pengajuan ruangan untuk mata kuliah <strong>${escapeHtml(mataKuliah)}</strong> di <strong>${escapeHtml(roomKode)}${roomNama ? ' - ' + escapeHtml(roomNama) : ''}</strong> telah disetujui oleh Dosen Pengampu dan Admin Gedung, serta resmi dijadwalkan.
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #16a34a; padding: 16px 20px; margin: 18px 0; border-radius: 12px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 4px 0; color: #64748b; width: 130px;">Ruangan:</td>
                <td style="padding: 4px 0; color: #1e293b; font-weight: 700;">${escapeHtml(roomKode)}${roomNama ? ' - ' + escapeHtml(roomNama) : ''}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Mata Kuliah:</td>
                <td style="padding: 4px 0; color: #1e293b; font-weight: 700;">${escapeHtml(mataKuliah)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Jadwal:</td>
                <td style="padding: 4px 0; color: #1e293b; font-weight: 700;">${escapeHtml(tanggal)} &bull; ${escapeHtml(jamMulai.slice(0, 5))}–${escapeHtml(jamSelesai.slice(0, 5))} WIB</td>
              </tr>
            </table>
          </div>

          <p style="color: #334155; font-size: 14px; font-weight: 600; text-align: center; margin: 20px 0 12px 0;">
            Lakukan presensi / check-in kehadiran ruangan saat waktu perkuliahan dimulai:
          </p>

          <div style="text-align: center; margin: 20px 0;">
            <a href="${quickCheckinUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; text-decoration: none; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.35);">
              ✓ Lakukan Presensi / Check-in Sekarang
            </a>
          </div>

          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 14px;">
            Batas check-in maksimal adalah 30 menit setelah jam mulai perkuliahan.
          </p>
        </div>
      `,
    });
  }

  if (pemohonId) {
    try {
      await notifyBookingPushByUserId(
        pemohonId,
        'Booking Resmi Dijadwalkan',
        `Peminjaman ruangan ${roomKode} untuk ${mataKuliah} telah disetujui penuh & siap check-in.`,
        '/user'
      );
    } catch (pushErr) {
      console.warn('[notifyPjCheckin] Gagal kirim push notification:', pushErr);
    }
  }
}

