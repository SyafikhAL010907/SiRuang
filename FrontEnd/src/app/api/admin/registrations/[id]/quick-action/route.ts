import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';
import { sendEmail, escapeHtml } from '@/lib/mailer';
import { getPublicAppUrl } from '@/lib/appUrl';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

function renderHtmlCard({
  title,
  isSuccess,
  variant,
  heading,
  message,
  details,
  badgeText,
  form,
}: {
  title: string;
  isSuccess: boolean;
  variant?: 'success' | 'error' | 'expired' | 'warning';
  heading: string;
  message: string;
  details?: { label: string; value: string }[];
  badgeText?: string;
  form?: string;
}) {
  const isExpired = variant === 'expired';
  const iconColor = isExpired ? '#475569' : isSuccess ? '#16a34a' : '#dc2626';
  const iconBg = isExpired ? '#f1f5f9' : isSuccess ? '#dcfce7' : '#fee2e2';
  const iconSvg = isExpired
    ? `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`
    : isSuccess
    ? `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  const detailsHtml =
    details && details.length > 0
      ? `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 20px 0; text-align: left;">
        ${details
          .map(
            (d) =>
              `<div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px;">
                <span style="color: #64748b;">${escapeHtml(d.label)}</span>
                <span style="color: #1e293b; font-weight: 600; text-align: right; max-width: 60%;">${escapeHtml(d.value)}</span>
              </div>`
          )
          .join('')}
      </div>`
      : '';

  const badgeHtml = badgeText
    ? `<div style="display: inline-block; background-color: #dcfce7; color: #166534; padding: 6px 14px; border-radius: 9999px; font-weight: 700; font-size: 12px; margin-bottom: 16px;">
        ${escapeHtml(badgeText)}
      </div>`
    : '';

  return new NextResponse(
    `<!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${escapeHtml(title)} - SiRuang</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        body { background-color: #f1f5f9; color: #1e293b; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .card { background: #ffffff; max-width: 520px; width: 100%; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); padding: 32px 28px; text-align: center; border: 1px solid #e2e8f0; }
        .icon-wrapper { width: 72px; height: 72px; border-radius: 50%; background: ${iconBg}; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        h1 { font-size: 20px; color: #183449; font-weight: 800; margin-bottom: 10px; line-height: 1.3; }
        p.desc { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 16px; }
        .btn-close { display: inline-block; width: 100%; max-width: 260px; background-color: #183449; color: #ffffff; padding: 12px 24px; border-radius: 10px; border: none; font-weight: 700; font-size: 14px; cursor: pointer; transition: background 0.2s; margin-top: 10px; text-decoration: none; }
        .btn-close:hover { background-color: #0f172a; }
        .footer { font-size: 12px; color: #94a3b8; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon-wrapper">
          ${iconSvg}
        </div>
        ${badgeHtml}
        <h1>${escapeHtml(heading)}</h1>
        <p class="desc">${message}</p>
        ${detailsHtml}
        ${form ? form : '<button class="btn-close" onclick="window.close();">Tutup Jendela Ini</button>'}
        <div class="footer">
          Manajemen Akun Pengguna &bull; SiRuang SFD
        </div>
      </div>
    </body>
    </html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const rawParams = await Promise.resolve(context?.params);
    const requestId = rawParams?.id;
    const { searchParams } = new URL(request.url);
    const rawToken = searchParams.get('token');
    const action = searchParams.get('action');

    if (!requestId || !rawToken) {
      return renderHtmlCard({
        title: 'Tautan Tidak Lengkap',
        isSuccess: false,
        heading: 'Tautan Tidak Valid',
        message: 'ID pendaftaran atau token verifikasi tidak ditemukan.',
      });
    }

    const inputHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Cek pendaftaran di registration_requests
    const { data: regReq, error: rErr } = await supabaseServer
      .from('registration_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (rErr || !regReq) {
      return renderHtmlCard({
        title: 'Tautan Tidak Aktif Lagi',
        isSuccess: false,
        variant: 'expired',
        badgeText: 'STATUS: SUDAH DIPROSES',
        heading: 'Pendaftaran Akun Sudah Ditanggapi',
        message: 'Pengajuan pendaftaran akun ini sudah pernah Anda proses sebelumnya dan sudah tidak ada dalam antrean.<br /><br /><span style="color: #64748b; font-size: 13px;">Tombol pada email ini sudah <strong>kedaluwarsa (dinonaktifkan)</strong> untuk mencegah tanggapan ganda. Akun yang disetujui sudah aktif di sistem SiRuang.</span>',
      });
    }

    if (regReq.admin_token_hash !== inputHash) {
      return renderHtmlCard({
        title: 'Token Tidak Valid',
        isSuccess: false,
        heading: 'Akses Ditolak',
        message: 'Token otorisasi admin tidak sesuai atau sudah kedaluwarsa.',
      });
    }

    if (regReq.expires_at && new Date(regReq.expires_at) < new Date()) {
      return renderHtmlCard({
        title: 'Tautan Kedaluwarsa',
        isSuccess: false,
        variant: 'expired',
        badgeText: 'KEDALUWARSA (LEWAT 7 HARI)',
        heading: 'Masa Berlaku Tautan Habis',
        message: 'Tautan pendaftaran ini telah melewati batas waktu 7 hari. Silakan minta calon pengguna untuk mendaftar kembali.',
      });
    }

    const roleLabel =
      regReq.requested_role === 'dosen'
        ? 'Dosen'
        : regReq.requested_role === 'pj_kelas'
        ? 'PJ Kelas'
        : 'Mahasiswa';

    // JIKA AKSI = TOLAK: Form penolakan langsung (tanpa perlu web)
    if (action === 'tolak') {
      const rejectForm = `
        <form method="POST" action="/api/admin/registrations/${regReq.id}/quick-action" style="margin-top: 16px; text-align: left;">
          <input type="hidden" name="token" value="${escapeHtml(rawToken)}" />
          <input type="hidden" name="action" value="tolak" />
          <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">
            Alasan Penolakan Akun (Opsional):
          </label>
          <textarea 
            name="alasan" 
            rows="3" 
            placeholder="Contoh: NIM tidak terdaftar di pangkalan data mahasiswa..." 
            style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; font-size: 13px; outline: none; margin-bottom: 16px; resize: vertical;"
          ></textarea>
          <div style="display: flex; gap: 10px;">
            <button type="submit" style="flex: 1; background-color: #dc2626; color: #ffffff; padding: 12px; border-radius: 8px; border: none; font-weight: 700; font-size: 14px; cursor: pointer;">
              ✕ Tolak Pendaftaran
            </button>
            <button type="button" onclick="window.close();" style="flex: 1; background-color: #e2e8f0; color: #475569; padding: 12px; border-radius: 8px; border: none; font-weight: 600; font-size: 14px; cursor: pointer;">
              Batal
            </button>
          </div>
        </form>
      `;

      return renderHtmlCard({
        title: 'Tolak Pendaftaran Akun',
        isSuccess: false,
        heading: 'Tolak Permohonan Akun',
        message: `Silakan konfirmasi penolakan pendaftaran akun untuk <strong>${escapeHtml(regReq.username)}</strong>:`,
        details: [
          { label: 'Nama', value: regReq.username },
          { label: 'Identitas (NIM/NIP)', value: regReq.identifier },
          { label: 'Role Diajukan', value: roleLabel },
          { label: 'Email', value: regReq.email || '-' },
        ],
        form: rejectForm,
      });
    }

    // JIKA AKSI = SETUJU: PROSES ATOMIK LANGSUNG DI SERVER!
    // Ambil default admin ID
    const { data: defaultAdmin } = await supabaseServer
      .from('authentication')
      .select('id')
      .eq('role', 'admin')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!defaultAdmin) {
      return renderHtmlCard({
        title: 'Gagal Memproses',
        isSuccess: false,
        heading: 'Admin Tidak Ditemukan',
        message: 'Tidak ada entri akun admin aktif di database untuk menyetujui.',
      });
    }

    // Panggil RPC approve_registration
    const { data: approveResult, error: approveError } = await supabaseServer.rpc(
      'approve_registration',
      {
        p_request_id: regReq.id,
        p_admin_id: defaultAdmin.id,
      }
    );

    if (approveError) {
      return renderHtmlCard({
        title: 'Gagal Menyetujui',
        isSuccess: false,
        heading: 'Gagal Menyetujui Akun',
        message: approveError.message,
      });
    }

    const approvedUser = Array.isArray(approveResult) ? approveResult[0] : approveResult;
    const targetUserId = approvedUser?.new_user_id || approvedUser?.id;

    // Pastikan data email dan profil pengguna tersimpan permanen di tabel profiles
    if (targetUserId) {
      try {
        await supabaseServer.from('profiles').upsert(
          {
            user_id: targetUserId,
            full_name: regReq.username || approvedUser.username,
            email: regReq.email || approvedUser.email,
            phone: regReq.phone || null,
            faculty: regReq.faculty || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      } catch (upsertErr) {
        console.warn('[quick-action] Gagal auto-upsert profiles setelah approve akun:', upsertErr);
      }
    }

    // Kirim email E7 ke pengguna
    if (approvedUser?.email) {
      try {
        const appUrl = getPublicAppUrl(request);
        const loginUrl = `${appUrl}/login`;

        await sendEmail({
          to: approvedUser.email,
          template: 'E7',
          subject: `[SiRuang] Akun Anda Telah Disetujui — Selamat Datang! 🎉`,
          relatedId: approvedUser.new_user_id ? String(approvedUser.new_user_id) : undefined,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
              <div style="text-align: center; margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid #f1f5f9;">
                <img src="${appUrl}/icon-512.png" alt="SiRuang Logo" width="68" height="68" style="border-radius: 16px; box-shadow: 0 6px 14px rgba(24, 52, 73, 0.12); margin-bottom: 10px; display: inline-block;" />
                <h1 style="color: #183449; font-size: 20px; font-weight: 800; margin: 0;">SiRuang &bull; Gedung SFD</h1>
                <p style="color: #64748b; font-size: 12px; margin: 3px 0 0 0;">Aktivasi Akun Pengguna</p>
              </div>

              <div style="display: inline-block; background-color: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                &#10003; Akun Telah Aktif
              </div>

              <h2 style="color: #183449; margin: 0 0 8px 0; font-size: 18px; font-weight: 800;">Selamat Datang di SiRuang! 🎉</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 0;">Halo <strong>${escapeHtml(approvedUser.username)}</strong>,</p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Pengajuan pendaftaran akun Anda dengan identitas <strong>${escapeHtml(approvedUser.identifier)}</strong> (${escapeHtml(roleLabel)}) telah <strong>disetujui (ACC)</strong> oleh Administrator.
              </p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Sekarang Anda dapat masuk ke dalam sistem SiRuang menggunakan identitas (NIM/NIP) dan kata sandi yang Anda daftarkan.
              </p>
              <div style="margin: 24px 0; text-align: center;">
                <a href="${loginUrl}" style="background-color: #183449; background-image: linear-gradient(135deg, #183449 0%, #0f172a 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(24, 52, 73, 0.3);">
                  Masuk ke SiRuang &rarr;
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 26px 0 16px 0;" />
              <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Sistem Informasi Pemesanan Ruangan &bull; Gedung SFD</p>
            </div>
          `,
        });
      } catch (mErr) {
        console.warn('Gagal kirim email E7:', mErr);
      }
    }

    return renderHtmlCard({
      title: 'Akun Berhasil Disetujui',
      isSuccess: true,
      badgeText: 'AKUN BERHASIL DIAKTIFKAN',
      heading: 'Pendaftaran Akun Berhasil Di-ACC!',
      message: `Akun untuk <strong>${escapeHtml(regReq.username)}</strong> telah aktif di sistem SiRuang dengan hak akses <strong>${roleLabel}</strong>. Email notifikasi telah otomatis dikirimkan ke pengguna.`,
      details: [
        { label: 'Nama Lengkap', value: regReq.username },
        { label: 'Identitas (NIM/NIP)', value: regReq.identifier },
        { label: 'Role Akun', value: roleLabel },
        { label: 'Email', value: regReq.email || '-' },
      ],
    });
  } catch (err: any) {
    return renderHtmlCard({
      title: 'Kesalahan Sistem',
      isSuccess: false,
      heading: 'Terjadi Kesalahan',
      message: err.message,
    });
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const rawParams = await Promise.resolve(context?.params);
    const requestId = rawParams?.id;

    let rawToken = '';
    let action = '';
    let alasan = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      rawToken = (formData.get('token') as string) || '';
      action = (formData.get('action') as string) || '';
      alasan = (formData.get('alasan') as string) || '';
    } else {
      const body = await request.json();
      rawToken = body.token || '';
      action = body.action || '';
      alasan = body.alasan || '';
    }

    if (!requestId || !rawToken) {
      return renderHtmlCard({
        title: 'Data Tidak Lengkap',
        isSuccess: false,
        heading: 'Gagal Memproses',
        message: 'ID pendaftaran dan token wajib disertakan.',
      });
    }

    const inputHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const { data: regReq } = await supabaseServer
      .from('registration_requests')
      .select('id, admin_token_hash, expires_at')
      .eq('id', requestId)
      .maybeSingle();

    if (!regReq || regReq.admin_token_hash !== inputHash) {
      return renderHtmlCard({
        title: 'Akses Ditolak',
        isSuccess: false,
        heading: 'Token Tidak Valid',
        message: 'Token verifikasi tidak valid atau pengajuan sudah tidak ada.',
      });
    }

    // Panggil RPC reject_registration
    const { data: rejectResult, error: rejectError } = await supabaseServer.rpc(
      'reject_registration',
      {
        p_request_id: requestId,
      }
    );

    if (rejectError) {
      return renderHtmlCard({
        title: 'Gagal Menolak',
        isSuccess: false,
        heading: 'Gagal Memproses Penolakan',
        message: rejectError.message,
      });
    }

    const rejectedData = Array.isArray(rejectResult) ? rejectResult[0] : rejectResult;

    if (rejectedData?.deleted_email) {
      try {
        await sendEmail({
          to: rejectedData.deleted_email,
          template: 'E8',
          subject: `[SiRuang] Status Pengajuan Pendaftaran Akun`,
          html: `
            <div style="font-family: sans-serif; padding: 24px; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
              <h2 style="color: #b91c1c;">Pengajuan Akun Belum Disetujui</h2>
              <p>Halo,</p>
              <p>Mohon maaf, pengajuan pendaftaran akun SiRuang untuk identitas <strong>${escapeHtml(
                rejectedData.deleted_identifier || ''
              )}</strong> belum dapat disetujui oleh Administrator.</p>
              ${
                alasan
                  ? `<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                      <strong>Catatan Admin:</strong> ${escapeHtml(alasan)}
                    </div>`
                  : ''
              }
              <p>Silakan hubungi administrator kampus jika Anda merasa terdapat kesalahan.</p>
            </div>
          `,
        });
      } catch (err) {
        console.warn('Gagal kirim email E8:', err);
      }
    }

    return renderHtmlCard({
      title: 'Penolakan Berhasil',
      isSuccess: true,
      heading: 'Pengajuan Akun Ditolak',
      message: 'Pendaftaran akun telah ditolak dan data pengajuan telah dibersihkan dari sistem.',
    });
  } catch (err: any) {
    return renderHtmlCard({
      title: 'Kesalahan Sistem',
      isSuccess: false,
      heading: 'Terjadi Kesalahan',
      message: err.message,
    });
  }
}

