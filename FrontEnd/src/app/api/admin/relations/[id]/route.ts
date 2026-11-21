import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireAdminDev } from '@/lib/authHelper';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAdminDev(request);
    if ('errorResponse' in auth) return auth.errorResponse;

    const rawParams = await Promise.resolve(context?.params);
    const targetId = rawParams?.id;

    if (!targetId) {
      return NextResponse.json({ error: 'ID relasi tidak valid' }, { status: 400 });
    }

    const body = await request.json();
    const mataKuliah = body.mata_kuliah?.trim();
    const kelas = body.kelas?.trim();
    const dosenId = body.dosen_id ? parseInt(body.dosen_id, 10) : undefined;
    const pjId = body.pj_id ? parseInt(body.pj_id, 10) : undefined;
    const jadwalHari = body.jadwal_hari !== undefined ? body.jadwal_hari?.trim() : undefined;
    const jadwalJam = body.jadwal_jam !== undefined ? body.jadwal_jam?.trim() : undefined;
    const semester = body.semester?.trim();
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : undefined;

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (mataKuliah) updatePayload.mata_kuliah = mataKuliah;
    if (kelas) updatePayload.kelas = kelas;
    if (semester) updatePayload.semester = semester;
    if (jadwalHari !== undefined) updatePayload.jadwal_hari = jadwalHari || null;
    if (jadwalJam !== undefined) updatePayload.jadwal_jam = jadwalJam || null;
    if (isActive !== undefined) updatePayload.is_active = isActive;

    if (dosenId) {
      if (isNaN(dosenId) || dosenId <= 0) {
        return NextResponse.json({ error: 'Dosen ID tidak valid' }, { status: 400 });
      }
      const { data: dUser } = await supabaseServer
        .from('authentication')
        .select('id, role')
        .eq('id', dosenId)
        .maybeSingle();

      if (!dUser || dUser.role !== 'dosen') {
        return NextResponse.json({ error: 'Dosen yang dipilih harus berstatus Dosen' }, { status: 400 });
      }
      updatePayload.dosen_id = dosenId;
    }

    if (pjId) {
      if (isNaN(pjId) || pjId <= 0) {
        return NextResponse.json({ error: 'PJ ID tidak valid' }, { status: 400 });
      }
      const { data: pUser } = await supabaseServer
        .from('authentication')
        .select('id, role')
        .eq('id', pjId)
        .maybeSingle();

      if (!pUser) {
        return NextResponse.json({ error: 'Pengguna PJ tidak ditemukan' }, { status: 400 });
      }

      // Auto promote to pj_kelas if user
      if (pUser.role === 'user') {
        await supabaseServer
          .from('authentication')
          .update({ role: 'pj_kelas' })
          .eq('id', pjId);
      }
      updatePayload.pj_id = pjId;
    }

    const { data: updated, error: updateErr } = await supabaseServer
      .from('course_relations')
      .update(updatePayload)
      .eq('id', targetId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json(
        { error: 'Gagal memperbarui relasi mata kuliah: ' + updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Relasi mata kuliah berhasil diperbarui',
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAdminDev(request);
    if ('errorResponse' in auth) return auth.errorResponse;

    const rawParams = await Promise.resolve(context?.params);
    const targetId = rawParams?.id;

    if (!targetId) {
      return NextResponse.json({ error: 'ID relasi tidak valid' }, { status: 400 });
    }

    const { error: delErr } = await supabaseServer
      .from('course_relations')
      .delete()
      .eq('id', targetId);

    if (delErr) {
      return NextResponse.json(
        { error: 'Gagal menghapus relasi mata kuliah: ' + delErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Relasi mata kuliah berhasil dihapus',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + err.message },
      { status: 500 }
    );
  }
}

