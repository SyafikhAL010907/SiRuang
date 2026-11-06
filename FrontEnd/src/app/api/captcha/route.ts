import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('captcha')
      .select('kode, pertanyaan, jawaban');

    if (error || !data || data.length === 0) {
      return NextResponse.json(
        { error: 'Gagal mengambil captcha: ' + (error?.message || 'Data kosong') },
        { status: 500 }
      );
    }

    // Ambil 1 soal captcha acak
    const randomCaptcha = data[Math.floor(Math.random() * data.length)];

    return NextResponse.json(randomCaptcha);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}

