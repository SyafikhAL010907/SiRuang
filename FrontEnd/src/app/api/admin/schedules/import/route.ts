import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserFromRequest } from '@/lib/authHelper';

export const dynamic = 'force-dynamic';

const VALID_DAYS = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Harap login terlebih dahulu' }, { status: 401 });
    }

    const { data: dbUser } = await supabaseServer
      .from('authentication')
      .select('id, role')
      .eq('identifier', user.identifier)
      .maybeSingle();

    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Admin yang dapat mengimpor jadwal resmi.' }, { status: 403 });
    }

    const body = await request.json();
    const { schedules, clear_dummy } = body;

    if (!Array.isArray(schedules) || schedules.length === 0) {
      return NextResponse.json({ error: 'Data jadwal tidak ditemukan atau format tidak valid.' }, { status: 400 });
    }

    // Opsi pembersihan data dummy sebelum import
    if (clear_dummy) {
      await supabaseServer.from('official_schedules').delete().eq('is_dummy', true);
    }

    // Ambil daftar seluruh ruangan untuk resolusi kode ruang ke room_id
    const { data: allRooms } = await supabaseServer
      .from('rooms')
      .select('id, kode, nama, gedung, lantai');

    const roomMap = new Map<string, string>();
    (allRooms || []).forEach((r) => {
      roomMap.set(r.kode.toUpperCase().trim(), r.id);
      // Dukung penulisan tanpa 'R.' (misal '805' atau '302')
      const cleanCode = r.kode.replace(/^R\./i, '').toUpperCase().trim();
      roomMap.set(cleanCode, r.id);
    });

    // Ambil daftar akun dosen & pj untuk resolusi NIP / NIM
    const { data: allUsers } = await supabaseServer
      .from('v_user_profiles')
      .select('user_id, identifier, role');

    const userMap = new Map<string, { id: number; role: string }>();
    (allUsers || []).forEach((u) => {
      if (u.identifier) {
        userMap.set(u.identifier.trim(), { id: u.user_id, role: u.role });
      }
    });

    const recordsToInsert = [];
    const errors: string[] = [];

    for (let i = 0; i < schedules.length; i++) {
      const item = schedules[i];
      const rowNum = i + 1;

      const rawKode = String(item.room_kode || item.kode_ruangan || '').trim().toUpperCase();
      const roomId = roomMap.get(rawKode) || roomMap.get(rawKode.replace(/^R\./i, ''));

      if (!roomId) {
        errors.push(`Baris ${rowNum}: Ruangan "${rawKode}" tidak ditemukan di database Gedung SFD.`);
        continue;
      }

      const rawHari = String(item.hari || '').toLowerCase().trim();
      if (!VALID_DAYS.includes(rawHari)) {
        errors.push(`Baris ${rowNum}: Hari "${item.hari}" tidak valid. Harus Senin-Jumat.`);
        continue;
      }

      let jamMulai = String(item.jam_mulai || '').trim();
      let jamSelesai = String(item.jam_selesai || '').trim();

      if (!jamMulai || !jamSelesai) {
        errors.push(`Baris ${rowNum}: Jam mulai dan jam selesai wajib diisi.`);
        continue;
      }

      if (jamMulai.length === 5) jamMulai += ':00';
      if (jamSelesai.length === 5) jamSelesai += ':00';

      const matkul = String(item.mata_kuliah || '').trim();
      if (!matkul) {
        errors.push(`Baris ${rowNum}: Nama mata kuliah tidak boleh kosong.`);
        continue;
      }

      // Resolusi Dosen
      const nipDosen = String(item.nip_dosen || item.dosen_id || '').trim();
      let dosenId: number | null = null;
      if (nipDosen && userMap.has(nipDosen)) {
        dosenId = userMap.get(nipDosen)!.id;
      } else {
        // Fallback default Dosen Demo jika ada
        const demoDosen = allUsers?.find((u) => u.role === 'dosen');
        dosenId = demoDosen ? demoDosen.user_id : null;
      }

      // Resolusi PJ Kelas
      const nimPj = String(item.nim_pj || item.pj_id || '').trim();
      let pjId: number | null = null;
      if (nimPj && userMap.has(nimPj)) {
        pjId = userMap.get(nimPj)!.id;
      } else {
        const demoPj = allUsers?.find((u) => u.role === 'pj_kelas');
        pjId = demoPj ? demoPj.user_id : null;
      }

      const semester = String(item.semester || 'Ganjil 2026/2027').trim();

      recordsToInsert.push({
        room_id: roomId,
        dosen_id: dosenId,
        pj_id: pjId,
        mata_kuliah: matkul,
        hari: rawHari,
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
        semester,
        is_active: true,
        is_dummy: false,
      });
    }

    if (recordsToInsert.length === 0) {
      return NextResponse.json(
        {
          error: 'Tidak ada data valid yang dapat diimpor.',
          details: errors,
        },
        { status: 400 }
      );
    }

    // Insert ke tabel official_schedules
    const { data: inserted, error: insErr } = await supabaseServer
      .from('official_schedules')
      .insert(recordsToInsert)
      .select();

    if (insErr) {
      return NextResponse.json(
        { error: 'Gagal menyimpan jadwal ke database: ' + insErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: inserted?.length || recordsToInsert.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Berhasil mengimpor ${inserted?.length || recordsToInsert.length} jadwal resmi perkuliahan SIAKAD.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}

