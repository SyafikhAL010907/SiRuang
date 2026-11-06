'use client';

import { useParams } from 'next/navigation';
import { ROOMS } from '@/components/DenahVisual/DenahGedungLE/Lantai3/Web&Tab/Web&TabLayout';
import RoomDetailPage from '@/components/DenahVisual/shared/RoomDetailPage';
import Link from 'next/link';

export default function RoomPage() {
  const params = useParams();
  const ruangCode = decodeURIComponent(params.ruang as string);
  const ruangan = ROOMS[ruangCode as keyof typeof ROOMS] || null;

  if (!ruangan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <span className="mb-4 block text-5xl">🔍</span>
          <h2 className="text-xl font-black text-slate-800">Ruangan Tidak Ditemukan</h2>
          <p className="mt-2 text-sm text-slate-500">Kode ruangan &quot;{ruangCode}&quot; tidak ada di Lantai 3.</p>
          <Link href="/denah-le/lantai3" className="mt-4 inline-block rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-sky-700">
            Kembali ke Denah
          </Link>
        </div>
      </div>
    );
  }

  return (
    <RoomDetailPage
      ruangan={ruangan}
      gedung="Gedung LE"
      lantai="Lantai 3"
      backHref="/denah-le/lantai3"
    />
  );
}
