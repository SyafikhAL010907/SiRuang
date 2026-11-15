import 'server-only';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { supabaseServer } from '@/lib/supabaseServer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  template: string; // Kode template: E1 - E10, atau 'TEST'
  relatedId?: string; // UUID booking atau registrasi terkait
}

export interface SendMailResult {
  success: boolean;
  error?: string;
}

/**
 * Utility untuk sanitasi/escape nilai dinamis pada template HTML email
 * Mencegah HTML injection pada email klien
 */
export function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Buat transporter baru setiap kali dipanggil (tidak di-cache) agar
 * perubahan env vars di Vercel langsung efektif tanpa perlu redeploy ulang.
 * Di serverless environment, modul-level singleton bisa menyebabkan
 * transporter null ter-cache selamanya jika env vars belum ada saat cold start.
 */
function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT.trim(), 10) : 465;
  const user = process.env.SMTP_USER?.trim();
  const rawPass = process.env.SMTP_PASS?.trim();
  // Bersihkan spasi dari Google App Password (misal 'abcd efgh ijkl mnop' -> 'abcdefghijklmnop')
  const pass = rawPass ? rawPass.replace(/\s+/g, '') : undefined;

  console.log(`[mailer] SMTP config check — HOST: ${host ? 'SET' : 'MISSING'}, USER: ${user ? 'SET' : 'MISSING'}, PASS: ${pass ? 'SET(len=' + pass.length + ')' : 'MISSING'}`);

  if (!host || !user || !pass) {
    return null;
  }

  const isGmail = host.toLowerCase().includes('gmail');

  if (isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }

  const isSecure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mengirim email dengan retry exponential backoff (maks 3x),
 * pencatatan status tunggal ke email_logs (insert 1 baris, lalu update),
 * dan fail-soft (tidak throw error ke pemanggil).
 */
export async function sendEmail(options: SendMailOptions): Promise<SendMailResult> {
  const { to, subject, html, template, relatedId } = options;

  // 1. Validasi fail-soft konfigurasi SMTP
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.error(`[mailer] SMTP TIDAK LENGKAP — HOST:${host||'?'} USER:${user||'?'} PASS:${pass?'OK':'?'} → email ke ${to} (${template}) TIDAK dikirim.`);
    return {
      success: false,
      error: 'Konfigurasi SMTP belum lengkap (SMTP_HOST, SMTP_USER, atau SMTP_PASS belum diset).',
    };
  }

  console.log(`[mailer] Mengirim email template=${template} to=${to} subject="${subject.substring(0, 60)}..."`);


  const transporter = getTransporter();
  if (!transporter) {
    return {
      success: false,
      error: 'Gagal menginisialisasi SMTP transporter.',
    };
  }

  const fromName = process.env.SMTP_FROM_NAME?.trim() || 'SiRuang';
  // Untuk Gmail SMTP, from email wajib sama persis dengan user SMTP agar terautentikasi penuh oleh TLS Google
  const isGmailUser = (process.env.SMTP_HOST || '').toLowerCase().includes('gmail');
  const fromEmail = isGmailUser ? user : (process.env.SMTP_FROM_EMAIL?.trim() || user);
  const fromAddress = `"${fromName}" <${fromEmail}>`;

  // Pastikan semua subjek otomatis diawali dengan [SiRuang]
  const fullSubject = subject.startsWith('[SiRuang]') ? subject : `[SiRuang] ${subject}`;

  // 2. Buat satu baris log di email_logs (status awal 'retrying', attempts 1)
  let logId: string | null = null;
  try {
    const { data: logEntry } = await supabaseServer
      .from('email_logs')
      .insert({
        template,
        to_email: to,
        subject: fullSubject,
        related_id: relatedId || null,
        status: 'retrying',
        attempts: 1,
      })
      .select('id')
      .single();

    if (logEntry?.id) {
      logId = logEntry.id;
    }
  } catch (logErr) {
    // Kegagalan inisialisasi log tidak boleh memblokir pengiriman email
    console.error('[mailer] Gagal inisialisasi baris email_logs:', logErr);
  }

  // 3. Loop pengiriman dengan retry (maks 3x)
  const maxAttempts = 3;
  let attempt = 0;
  let isSent = false;
  let lastError = '';

  // Backoff delay: attempt 2 -> 1s, attempt 3 -> 2s (exponential: 1000 * 2^(attempt-2))
  while (attempt < maxAttempts && !isSent) {
    attempt++;

    if (attempt > 1) {
      const backoffMs = 1000 * Math.pow(2, attempt - 2); // 1s, 2s
      await sleep(backoffMs);
    }

    // Try khusus untuk pemanggilan sendMail
    try {
      await transporter.sendMail({
        from: fromAddress,
        to,
        subject: fullSubject,
        html,
      });
      isSent = true;
    } catch (err: any) {
      lastError = err?.message || 'Gagal mengirim email';
      console.warn(`[mailer] Pengiriman email percobaan ke-${attempt} gagal: ${lastError}`);
    }

    // Update log dilakukan di LUAR try sendMail agar error logging tidak memicu resend
    if (logId) {
      try {
        if (isSent) {
          await supabaseServer
            .from('email_logs')
            .update({
              status: 'sent',
              attempts: attempt,
              sent_at: new Date().toISOString(),
              error_message: null,
            })
            .eq('id', logId);
        } else if (attempt < maxAttempts) {
          await supabaseServer
            .from('email_logs')
            .update({
              status: 'retrying',
              attempts: attempt,
              error_message: lastError,
            })
            .eq('id', logId);
        }
      } catch (updateErr) {
        console.error('[mailer] Gagal update email_logs:', updateErr);
      }
    }
  }

  // 4. Jika setelah 3x percobaan tetap gagal, update status akhir ke 'failed'
  if (!isSent && logId) {
    try {
      await supabaseServer
        .from('email_logs')
        .update({
          status: 'failed',
          attempts: maxAttempts,
          error_message: lastError,
        })
        .eq('id', logId);
    } catch (finalLogErr) {
      console.error('[mailer] Gagal update status final failed pada email_logs:', finalLogErr);
    }
  }

  return {
    success: isSent,
    error: isSent ? undefined : lastError,
  };
}

