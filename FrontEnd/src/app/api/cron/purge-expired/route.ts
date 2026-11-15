import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { sendEmail, escapeHtml } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;

    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized: Invalid cron secret' }, { status: 401 });
    }

    // Panggil RPC purge_expired_registrations
    const { data: purgedRecords, error: purgeErr } = await supabaseServer.rpc('purge_expired_registrations');

    if (purgeErr) {
      console.warn('Gagal menjalankan RPC purge_expired_registrations:', purgeErr);
      return NextResponse.json({ error: purgeErr.message }, { status: 500 });
    }

    let notifiedCount = 0;

    // Jika RPC mengembalikan data baris yang terhapus
    if (Array.isArray(purgedRecords) && purgedRecords.length > 0) {
      for (const rec of purgedRecords) {
        if (rec.email) {
          try {
            await sendEmail({
              to: rec.email,
              subject: '[SiRuang] Pengajuan Akun Tidak Disetujui (Kedaluwarsa)',
              template: 'E8',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                  <h2 style="color: #991b1b; margin-bottom: 8px;">Pemberitahuan Pengajuan Akun</h2>
                  <p style="color: #64748b; font-size: 14px;">Halo <strong>${escapeHtml(rec.username || 'Pendaftar')}</strong>,</p>
                  <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                    Pengajuan pendaftaran akun Anda di sistem SiRuang telah melewati batas masa aktif peninjauan (7 hari) tanpa ditinjau oleh Administrator. Sesuai kebijakan perlindungan data, data pengajuan Anda telah otomatis dihapus secara permanen.
                  </p>
                  <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                    Silakan melakukan pendaftaran ulang di portal SiRuang atau hubungi Help Desk jika Anda membutuhkan akses segera.
                  </p>
                </div>
              `,
            });
            notifiedCount++;
          } catch (mErr) {
            console.warn('Gagal kirim email E8 ke:', rec.email, mErr);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Pembersihan pengajuan kedaluwarsa selesai. Dihapus: ${purgedRecords?.length || 0}, Notifikasi terkirim: ${notifiedCount}`,
      purged_count: purgedRecords?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal cron error: ' + err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

