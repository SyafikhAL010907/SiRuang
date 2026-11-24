import { NextResponse } from 'next/server';
import { after } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { sendEmail, escapeHtml } from '@/lib/mailer';
import { isAdminDev } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const rawParams = await Promise.resolve(context?.params);
    const requestId = rawParams?.id;

    if (!requestId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
      return NextResponse.json({ error: 'ID pengajuan tidak valid' }, { status: 400 });
    }

    let reason = '';
    let rawToken = '';
    try {
      const body = await request.clone().json();
      reason = body.reason?.trim() || '';
      rawToken = body.token || '';
    } catch {
      // Body opsional
    }

    if (!rawToken) {
      const url = new URL(request.url);
      rawToken = url.searchParams.get('token') || '';
    }

    // 1. Verifikasi role admin ATAU token valid dari link email
    const user = await getUserFromRequest(request);
    let isAuthorized = Boolean(user && isAdminDev(user.role));

    if (!isAuthorized && rawToken) {
      const inputHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const { data: regReq } = await supabaseServer
        .from('registration_requests')
        .select('id, admin_token_hash, expires_at')
        .eq('id', requestId)
        .maybeSingle();

      if (regReq && regReq.admin_token_hash === inputHash) {
        const isExpired = new Date(regReq.expires_at) < new Date();
        if (isExpired) {
          return NextResponse.json({ error: 'Link verifikasi pengajuan ini telah kedaluwarsa.' }, { status: 410 });
        }
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized: Akses khusus admin atau token link email tidak valid' }, { status: 403 });
    }

    // 2. Panggil RPC reject_registration (Baris dihapus dari DB demi privasi hash password)
    const { data: rejectResult, error: rejectError } = await supabaseServer.rpc(
      'reject_registration',
      {
        p_request_id: requestId,
      }
    );

    if (rejectError) {
      return NextResponse.json(
        { error: 'Gagal menolak pengajuan: ' + rejectError.message },
        { status: 400 }
      );
    }

    const rejectedData = Array.isArray(rejectResult) ? rejectResult[0] : rejectResult;

    // 3. Pengiriman Email E8 ke Pemohon via after() jika email tersedia (Fail-soft)
    if (rejectedData?.deleted_email) {
      after(async () => {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
          const registerUrl = appUrl ? `${appUrl}/login` : '';

          await sendEmail({
            to: rejectedData.deleted_email,
            template: 'E8',
            subject: `Pengajuan Akun Tidak Disetujui — SiRuang`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; color: #333;">
                <h2 style="color: #b91c1c;">Pemberitahuan Status Pengajuan Akun SiRuang</h2>
                <p>Halo,</p>
                <p>Mohon maaf, pengajuan pendaftaran akun SiRuang untuk identitas <strong>${escapeHtml(
                  rejectedData.deleted_identifier || ''
                )}</strong> belum dapat disetujui oleh Administrator.</p>
                ${
                  reason
                    ? `<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                        <strong>Catatan Admin:</strong> ${escapeHtml(reason)}
                      </div>`
                    : ''
                }
                <p>Seluruh data permohonan sebelumnya telah dihapus dari sistem kami. Apabila Anda merasa terdapat kesalahan pengisian data, Anda dipersilakan untuk mengajukan pendaftaran ulang.</p>
                ${
                  registerUrl
                    ? `<p style="margin: 24px 0;">
                        <a href="${registerUrl}" style="background-color: #183449; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                          Daftar Ulang di SiRuang
                        </a>
                      </p>`
                    : ''
                }
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                <p style="font-size: 12px; color: #777;">Email ini dikirim secara otomatis oleh Sistem Pemesanan Ruangan SiRuang Gedung SFD.</p>
              </div>
            `,
          });
        } catch (err: any) {
          console.error('[reject] Gagal mengirim email penolakan E8:', err?.message || err);
        }
      });
    }

    return NextResponse.json({
      message: 'Pengajuan akun berhasil ditolak dan dihapus.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

