import { supabaseServer } from './supabaseServer';
import { sendEmail, escapeHtml } from './mailer';
import { notifyBookingPushByUserId } from './sendPush';

/**
 * Lazy evaluator untuk status booking:
 * 1. Booking berstatus 'berlangsung' yang telah melewati jam_selesai diubah menjadi 'selesai'.
 * 2. Booking berstatus 'dijadwalkan', 'dijadwalkan_admin', atau 'menunggu_checkin' yang melewati batas 30 menit
 *    dari jam_mulai tanpa check-in diubah menjadi 'hangus' (E10).
 * 3. Booking berstatus 'menunggu_approval' atau 'menunggu_dosen' yang telah melewati batas waktu
 *    (tanggal lampau atau hari ini lewat jam_mulai) diubah menjadi 'hangus' TANPA kirim email.
 * 4. Status terminal ('dibatalkan', 'dibatalkan_prioritas', 'kedaluwarsa', 'selesai', 'ditolak', 'hangus')
 *    tidak di-evaluate ulang.
 */
export async function evaluateBookingStates(): Promise<void> {
  try {
    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentMinutesTotal = currentHours * 60 + currentMinutes;
    const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}:00`;

    // 1. Selesai: booking 'berlangsung' yang tanggalnya lampau atau jam_selesai < currentTime (hari ini)
    await supabaseServer
      .from('bookings')
      .update({ status: 'selesai', updated_at: now.toISOString() })
      .eq('status', 'berlangsung')
      .or(`tanggal.lt.${todayDate},and(tanggal.eq.${todayDate},jam_selesai.lt.${currentTimeStr})`);

    // 2. Hangus karena telat check-in: booking berstatus 'dijadwalkan', 'dijadwalkan_admin', 'menunggu_checkin'
    const { data: pendingCheckins } = await supabaseServer
      .from('bookings')
      .select(`
        id,
        tanggal,
        jam_mulai,
        mata_kuliah,
        nama_pemohon,
        pemohon_id,
        rooms:room_id (kode, nama)
      `)
      .in('status', ['dijadwalkan_admin', 'dijadwalkan', 'menunggu_checkin'])
      .lte('tanggal', todayDate);

    if (pendingCheckins && pendingCheckins.length > 0) {
      const hangusCheckinIds: string[] = [];
      const hangusCheckinItems: typeof pendingCheckins = [];

      for (const b of pendingCheckins) {
        let isExpired = false;
        if (b.tanggal < todayDate) {
          isExpired = true;
        } else {
          // Tanggal sama dengan hari ini, cek apakah sudah lewat jam_mulai + 30 menit
          const [hStr, mStr] = b.jam_mulai.split(':');
          const startMin = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
          if (currentMinutesTotal > startMin + 30) {
            isExpired = true;
          }
        }

        if (isExpired) {
          hangusCheckinIds.push(b.id);
          hangusCheckinItems.push(b);
        }
      }

      if (hangusCheckinIds.length > 0) {
        await supabaseServer
          .from('bookings')
          .update({ status: 'hangus', updated_at: now.toISOString() })
          .in('id', hangusCheckinIds);

        // Kirim email E10 & push notification fail-soft
        for (const item of hangusCheckinItems) {
          try {
            const { data: pjProfile } = await supabaseServer
              .from('v_user_profiles')
              .select('email, identifier')
              .eq('user_id', item.pemohon_id)
              .maybeSingle();

            const roomKode = (item as any).rooms?.kode || 'Ruangan';

            if (pjProfile?.email) {
              await sendEmail({
                to: pjProfile.email,
                subject: `[SiRuang] Booking Hangus — Melewati Batas Waktu Check-in (${roomKode})`,
                template: 'E10',
                relatedId: item.id,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #991b1b; margin-bottom: 8px;">Pemberitahuan Booking Hangus</h2>
                    <p style="color: #64748b; font-size: 14px;">Halo <strong>${escapeHtml(item.nama_pemohon)}</strong>,</p>
                    <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                      Peminjaman ruangan <strong>${escapeHtml(roomKode)}</strong> untuk mata kuliah <strong>${escapeHtml(item.mata_kuliah)}</strong> pada tanggal <strong>${escapeHtml(item.tanggal)}</strong> telah dinyatakan <strong>HANGUS</strong> karena Anda tidak melakukan Presensi / Check-in Ruangan dalam batas toleransi (maksimal 30 menit setelah jam mulai).
                    </p>
                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                      <p style="margin: 4px 0; font-size: 13px; color: #991b1b;">
                        Ruangan telah otomatis dibebaskan kembali untuk digunakan oleh pihak lain.
                      </p>
                    </div>
                  </div>
                `,
              });
            }

            await notifyBookingPushByUserId(
              item.pemohon_id,
              'Booking Hangus',
              `Booking ruangan ${roomKode} hangus karena tidak check-in dalam batas toleransi 30 menit.`,
              '/user'
            );
          } catch (notifErr) {
            console.warn('Gagal kirim notifikasi booking hangus:', notifErr);
          }
        }
      }
    }

    // 3. Hangus lazy untuk pengajuan 'menunggu_approval' atau 'menunggu_dosen' yang lewat waktu (TANPA email)
    const { data: pendingApprovals } = await supabaseServer
      .from('bookings')
      .select('id, tanggal, jam_mulai')
      .in('status', ['menunggu_approval', 'menunggu_dosen'])
      .lte('tanggal', todayDate);

    if (pendingApprovals && pendingApprovals.length > 0) {
      const hangusApprovalIds: string[] = [];

      for (const b of pendingApprovals) {
        let isExpired = false;
        if (b.tanggal < todayDate) {
          isExpired = true;
        } else {
          const [hStr, mStr] = b.jam_mulai.split(':');
          const startMin = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
          if (currentMinutesTotal > startMin) {
            isExpired = true;
          }
        }

        if (isExpired) {
          hangusApprovalIds.push(b.id);
        }
      }

      if (hangusApprovalIds.length > 0) {
        await supabaseServer
          .from('bookings')
          .update({ status: 'hangus', updated_at: now.toISOString() })
          .in('id', hangusApprovalIds);
      }
    }
  } catch (err) {
    console.warn('Evaluasi status booking dilewati:', err);
  }
}
