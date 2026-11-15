import { NextResponse } from 'next/server';
import { after } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';
import { sendEmail, escapeHtml } from '@/lib/mailer';

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

    // 1. Verifikasi role admin ATAU token valid dari link email
    const user = await getUserFromRequest(request);
    let adminRecord: any = null;

    if (user && user.role === 'admin') {
      const { data } = await supabaseServer
        .from('authentication')
        .select('id')
        .eq('identifier', user.identifier)
        .eq('role', 'admin')
        .maybeSingle();
      adminRecord = data;
    }

    // Jika bukan admin yang sedang login, periksa apakah menyertakan token verifikasi admin
    if (!adminRecord) {
      let rawToken = '';
      try {
        const body = await request.clone().json();
        rawToken = body.token || '';
      } catch {
        // Abaikan parse error
      }
      if (!rawToken) {
        const url = new URL(request.url);
        rawToken = url.searchParams.get('token') || '';
      }

      if (rawToken) {
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

          // Ambil ID admin pertama di sistem
          const { data: defaultAdmin } = await supabaseServer
            .from('authentication')
            .select('id')
            .eq('role', 'admin')
            .order('id', { ascending: true })
            .limit(1)
            .maybeSingle();
          adminRecord = defaultAdmin;
        }
      }
    }

    if (!adminRecord) {
      return NextResponse.json({ error: 'Unauthorized: Akses khusus admin atau token link email tidak valid' }, { status: 403 });
    }

    // 3. Panggil RPC approve_registration (Satu transaksi atomik PostgreSQL)
    const { data: approveResult, error: approveError } = await supabaseServer.rpc(
      'approve_registration',
      {
        p_request_id: requestId,
        p_admin_id: adminRecord.id,
      }
    );

    if (approveError) {
      return NextResponse.json(
        { error: 'Gagal menyetujui pengajuan: ' + approveError.message },
        { status: 400 }
      );
    }

    const approvedUser = Array.isArray(approveResult) ? approveResult[0] : approveResult;
    const targetUserId = approvedUser?.new_user_id || approvedUser?.id;

    // Pastikan data profil dan email tersimpan permanen di tabel profiles
    if (targetUserId) {
      try {
        await supabaseServer.from('profiles').upsert(
          {
            user_id: targetUserId,
            full_name: approvedUser.username,
            email: approvedUser.email,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      } catch (upsertErr) {
        console.warn('[approve] Gagal auto-upsert profiles setelah approve akun:', upsertErr);
      }
    }

    // 4. Pengiriman Email E7 ke Pemohon via after() jika email tersedia (Fail-soft)
    if (approvedUser?.email) {
      after(async () => {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
          const loginUrl = appUrl ? `${appUrl}/login` : '';

          await sendEmail({
            to: approvedUser.email,
            template: 'E7',
            subject: `Akun Anda Disetujui — Selamat Datang di SiRuang`,
            relatedId: approvedUser.new_user_id ? String(approvedUser.new_user_id) : undefined,
            html: `
              <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; color: #333;">
                <h2 style="color: #183449;">Selamat! Akun SiRuang Anda Telah Disetujui</h2>
                <p>Halo <strong>${escapeHtml(approvedUser.username)}</strong>,</p>
                <p>Pengajuan akun SiRuang Anda dengan identitas <strong>${escapeHtml(approvedUser.identifier)}</strong> (${escapeHtml(approvedUser.requested_role)}) telah disetujui oleh Administrator.</p>
                <p>Sekarang Anda dapat masuk ke dalam sistem menggunakan identitas dan kata sandi yang Anda daftarkan sebelumnya.</p>
                ${
                  loginUrl
                    ? `<p style="margin: 24px 0;">
                        <a href="${loginUrl}" style="background-color: #183449; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                          Masuk ke SiRuang
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
          console.error('[approve] Gagal mengirim email konfirmasi E7:', err?.message || err);
        }
      });
    }

    return NextResponse.json({
      message: 'Akun berhasil disetujui dan diaktifkan.',
      user: approvedUser,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

