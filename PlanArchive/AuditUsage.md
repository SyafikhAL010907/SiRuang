# 🔍 Audit Penggunaan Supabase — SiRuang

> **Tanggal Audit:** 2025-11-10  
> **Auditor:** Antigravity AI  
> **Plan:** Supabase Free (Egress 5 GB/bulan)  
> **Status Database:** ~30 MB, 1 MAU  

---

## 1. 🏁 Ringkasan Verdict

### Apakah ada infinite loop yang masih aktif?

## ✅ TIDAK — Tidak ditemukan infinite loop aktif di production build

**Alasan:**
- File backup lama (`*.backup.tsx`) yang berisi polling 1.5 detik **tidak diimport** di mana pun — tidak aktif.
- Semua `useEffect` yang melakukan fetch sudah memiliki dependency array yang tepat.
- Guard `isFetchingMessagesRef` / `isFetchingRoomsRef` mencegah overlapping request.
- Guard `payload.eventType === 'UPDATE'` mencegah loop Realtime → mark-read → trigger Realtime lagi.
- `removeChannel()` dipanggil saat unmount di semua hook Realtime.

**Namun ditemukan 5 masalah TINGGI** yang bisa menyebabkan egress membengkak secara bertahap (bukan seketika seperti infinite loop, tapi konsisten menguras kuota):

---

## 2. 📊 Tabel Temuan Lengkap

| # | File:Baris | Masalah | Risiko | Perkiraan Dampak Egress |
|---|---|---|---|---|
| **T1** | `app/api/admin/chat/rooms/route.ts:33-42` | **N+1 Query** — 1 DB query per room setiap 15 detik | 🔴 TINGGI | ~200–500 MB/hari (tergantung jumlah room) |
| **T2** | `app/api/chat/messages/route.ts:19` & `[room_id]/route.ts:19` | **`select('*')` tanpa LIMIT** di `chat_messages` — ambil seluruh history setiap 10 detik | 🔴 TINGGI | ~100–300 MB/hari (tergantung jumlah pesan) |
| **T3** | `lib/authHelper.ts:36-41` | **DB query setiap API call** — `getUserFromRequest()` query `active_sessions` di setiap request termasuk polling | 🔴 TINGGI | ~100–200 MB/hari (multiplied by polling frequency) |
| **T4** | `app/api/profile/route.ts:26,141` | **`select('*')` di view `v_user_profiles`** — view bisa punya banyak kolom/join | 🔴 TINGGI | ~20–50 MB/hari |
| **T5** | `app/api/admin/chat/rooms/route.ts:25-28` | **Query tanpa filter** — ambil ALL profiles & ALL active sessions lalu filter di client | 🟡 SEDANG | ~50–150 MB/hari |
| **T6** | `components/User/Shared/hooks/useAdminInfo.ts:7,67` | **Polling 30 detik** untuk avatar admin + window focus refetch | 🟡 SEDANG | ~10–30 MB/hari |
| **T7** | `components/Admin/Mobile/MobileLayout.tsx:142-145` & `Admin/Web&Tab/WebTabLayout.tsx:137-140` | **Polling 15 detik redundan** berjalan bersamaan dengan Realtime WebSocket | 🟡 SEDANG | ~50–100 MB/hari |
| **T8** | `hooks/useUserChat.ts:271` + kedua Admin layout | **Fallback polling 10 detik** berjalan paralel dengan Realtime | 🟡 SEDANG | ~30–80 MB/hari |
| **T9** | `app/api/admin/chat/rooms/route.ts:28` | **`active_sessions` tanpa filter `.in()`** — query semua sesi aktif | 🟡 SEDANG | ~20–50 MB/hari |
| **T10** | `app/api/chat/user-room/route.ts:21,34` | `select('*')` di `chat_rooms` | 🟢 RENDAH | ~5 MB/hari |
| **T11** | `app/api/chat/send/route.ts:30` | `.select()` tanpa kolom setelah insert | 🟢 RENDAH | ~2 MB/hari |
| **T12** | `app/api/profile/avatar/route.ts:229` | `select('*')` saat delete avatar | 🟢 RENDAH | ~1 MB/hari |
| **T13** | `components/Admin/Shared/hooks/useAdminTools.ts:249` | Latency polling 5 detik (lokal, tidak ada network call) | 🟢 RENDAH | 0 (lokal saja) |
| **T14** | `components/User/Mobile/MobileLayout.tsx:59-70` | **`markAsRead` dipanggil dua kali** — dari MobileLayout DAN dari hook useUserChat | 🟡 SEDANG | ~5–15 MB/hari (duplikat API call) |
| **T15** | `*.backup.tsx` (berbagai file) | Kode polling lama 1.5 detik masih ada di repo (tidak diimport) | ⚠️ INFO | 0 sekarang, berbahaya jika diimport ulang |

---

## 3. 🔴 Detail Temuan TINGGI — Kode SEBELUM & SESUDAH

---

### T1 — N+1 Query di Admin Chat Rooms

**File:** [`app/api/admin/chat/rooms/route.ts:33-42`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/app/api/admin/chat/rooms/route.ts#L33-L42)

**Masalah:** Untuk setiap room yang diambil, ada 1 query tambahan ke `chat_messages` untuk menghitung unread count. Kalau ada 10 room → 11 query DB setiap 15 detik dari satu admin.

```typescript
// ❌ SEBELUM — N+1 query (1 query per room)
const roomsWithDetails = await Promise.all(
  rooms.map(async (room) => {
    const { count: unreadCount } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id)
      .eq('is_read', false)
      .neq('sender_identifier', 'admin');
    return { ...room, unreadCount: unreadCount ?? 0 };
  })
);
```

```typescript
// ✅ SESUDAH — Gunakan SQL aggregation (1 query total)

// Langkah 1: Buat view di Supabase SQL Editor
/*
CREATE OR REPLACE VIEW v_room_unread_counts AS
SELECT 
  room_id,
  COUNT(*) AS unread_count
FROM chat_messages
WHERE is_read = false
  AND sender_identifier != 'admin'
GROUP BY room_id;
*/

// Langkah 2: Di route.ts, join ke view sekaligus
const { data: rooms } = await supabase
  .from('chat_rooms')
  .select(`
    id,
    user_identifier,
    created_at,
    v_room_unread_counts (unread_count)
  `)
  .order('created_at', { ascending: false });

// Atau alternatif tanpa view — gunakan RPC:
// const { data: rooms } = await supabase.rpc('get_rooms_with_unread');
```

---

### T2 — `select('*')` Tanpa LIMIT di chat_messages

**File 1:** [`app/api/chat/messages/route.ts:19`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/app/api/chat/messages/route.ts#L19)  
**File 2:** [`app/api/chat/messages/[room_id]/route.ts:19`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/app/api/chat/messages/[room_id]/route.ts#L19)

**Masalah:** Mengambil **seluruh history pesan** tiap polling. Kalau ada 1.000 pesan masing-masing 500 byte → ~500 KB per request → 180 MB/jam hanya dari polling pesan.

```typescript
// ❌ SEBELUM — ambil semua pesan tanpa batasan
const { data: messages } = await supabase
  .from('chat_messages')
  .select('*')
  .eq('room_id', roomId)
  .order('created_at', { ascending: true });
```

```typescript
// ✅ SESUDAH — ambil 50 pesan terakhir, gunakan kolom spesifik
const { data: messages } = await supabase
  .from('chat_messages')
  .select('id, room_id, sender_identifier, content, created_at, is_read')
  .eq('room_id', roomId)
  .order('created_at', { ascending: false })
  .limit(50);

// Balik urutan di client setelah diterima:
// const orderedMessages = messages?.reverse() ?? [];

// Untuk load more (pagination):
// .range(offset, offset + 49)
```

---

### T3 — DB Query Setiap API Request di authHelper

**File:** [`lib/authHelper.ts:36-41`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/lib/authHelper.ts#L36-L41)

**Masalah:** `getUserFromRequest()` dipanggil di SETIAP endpoint API. Karena polling 10–15 detik memanggil endpoint yang menggunakan fungsi ini, setiap poll = 1 extra DB query ke `active_sessions`. Dengan 3–4 endpoint polling aktif → 4–6 query extra per 10 detik → ~40.000 query/hari.

```typescript
// ❌ SEBELUM — query DB setiap kali fungsi dipanggil
export async function getUserFromRequest(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  if (!token) return null;
  
  const { data: session } = await supabase
    .from('active_sessions')        // <-- DB round-trip setiap call!
    .select('*')
    .eq('session_token', token)
    .single();
  
  return session?.user_identifier ?? null;
}
```

```typescript
// ✅ SESUDAH — Opsi A: Validasi JWT secara lokal (tidak butuh DB)
import { jwtVerify } from 'jose';

export async function getUserFromRequest(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  if (!token) return null;
  
  try {
    // Validasi JWT secara lokal — tidak ada network/DB call
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload.user_identifier as string ?? null;
  } catch {
    return null; // Token invalid/expired
  }
}

// ✅ SESUDAH — Opsi B: Cache session di memory (jika session bukan JWT)
// Gunakan Map dengan TTL sederhana
const sessionCache = new Map<string, { userId: string; expiresAt: number }>();

export async function getUserFromRequest(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  if (!token) return null;
  
  // Cek cache dulu
  const cached = sessionCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.userId;
  }
  
  // Cache miss — query DB, lalu simpan 60 detik
  const { data: session } = await supabase
    .from('active_sessions')
    .select('user_identifier, expires_at')
    .eq('session_token', token)
    .single();
  
  if (session?.user_identifier) {
    sessionCache.set(token, {
      userId: session.user_identifier,
      expiresAt: Date.now() + 60_000, // cache 60 detik
    });
  }
  
  return session?.user_identifier ?? null;
}
```

---

### T4 — `select('*')` di View `v_user_profiles`

**File:** [`app/api/profile/route.ts:26,141`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/app/api/profile/route.ts#L26)

**Masalah:** View bisa mengandung banyak kolom hasil JOIN. `select('*')` mengambil semuanya termasuk kolom yang tidak dipakai di frontend.

```typescript
// ❌ SEBELUM
const { data: profile } = await supabase
  .from('v_user_profiles')
  .select('*')
  .eq('user_identifier', userId)
  .single();
```

```typescript
// ✅ SESUDAH — sebutkan kolom yang benar-benar dipakai
const { data: profile } = await supabase
  .from('v_user_profiles')
  .select('user_identifier, full_name, email, avatar_url, phone, created_at')
  .eq('user_identifier', userId)
  .single();
```

---

### T5 — Unfiltered Query di Admin Chat Rooms

**File:** [`app/api/admin/chat/rooms/route.ts:25-28`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/app/api/admin/chat/rooms/route.ts#L25-L28)

**Masalah:** Mengambil **semua** profil user dan **semua** sesi aktif dari DB, lalu difilter di JavaScript. Seharusnya filter dilakukan di DB dengan `.in()`.

```typescript
// ❌ SEBELUM — ambil semua lalu filter di client
const { data: allProfiles } = await supabase
  .from('user_profiles')
  .select('*');

const { data: allSessions } = await supabase
  .from('active_sessions')
  .select('*');

// Filter di JavaScript...
const userProfile = allProfiles?.find(p => p.user_identifier === room.user_identifier);
const isOnline = allSessions?.some(s => s.user_identifier === room.user_identifier);
```

```typescript
// ✅ SESUDAH — filter di DB, ambil hanya yang dibutuhkan
// Kumpulkan user IDs dari rooms dulu
const userIds = rooms.map(r => r.user_identifier);

const { data: profiles } = await supabase
  .from('user_profiles')
  .select('user_identifier, full_name, avatar_url')
  .in('user_identifier', userIds);  // ← filter di DB

const { data: sessions } = await supabase
  .from('active_sessions')
  .select('user_identifier')
  .in('user_identifier', userIds)   // ← filter di DB
  .gt('expires_at', new Date().toISOString());

// Buat Map untuk lookup O(1)
const profileMap = new Map(profiles?.map(p => [p.user_identifier, p]));
const onlineSet = new Set(sessions?.map(s => s.user_identifier));
```

---

## 4. 🟡 Detail Temuan SEDANG — Kode SEBELUM & SESUDAH

---

### T6 — Polling 30 Detik di useAdminInfo

**File:** [`components/User/Shared/hooks/useAdminInfo.ts:7,67`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/components/User/Shared/hooks/useAdminInfo.ts#L67)

**Masalah:** Avatar admin di-fetch setiap 30 detik + setiap window focus. Data avatar admin sangat jarang berubah, tidak perlu polling sama sekali.

```typescript
// ❌ SEBELUM — polling 30 detik + window focus refetch
const REFRESH_MS = 30_000;

useEffect(() => {
  fetchAdminInfo();
  const interval = setInterval(fetchAdminInfo, REFRESH_MS);
  window.addEventListener('focus', fetchAdminInfo);
  return () => {
    clearInterval(interval);
    window.removeEventListener('focus', fetchAdminInfo);
  };
}, []);
```

```typescript
// ✅ SESUDAH — fetch sekali saat mount, simpan ke sessionStorage
const CACHE_KEY = 'admin_info_cache';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 menit

async function fetchAdminInfo() {
  // Cek cache dulu
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL_MS) {
      setAdminInfo(data);
      return;
    }
  }
  
  // Cache miss — fetch dari API
  const response = await fetch('/api/chat/admin-info');
  const data = await response.json();
  setAdminInfo(data);
  
  // Simpan ke cache
  sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
}

useEffect(() => {
  fetchAdminInfo(); // Hanya sekali saat mount
}, []);             // ← tidak ada interval, tidak ada focus listener
```

---

### T7 — Polling Redundan Berjalan Bersama Realtime

**File Admin Mobile:** [`components/Admin/Mobile/MobileLayout.tsx:142-145`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/components/Admin/Mobile/MobileLayout.tsx#L142-L145)  
**File Admin Web:** [`components/Admin/Web&Tab/WebTabLayout.tsx:137-140`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/components/Admin/Web&Tab/WebTabLayout.tsx#L137-L140)

**Masalah:** Polling 15 detik untuk daftar rooms berjalan **bersamaan** dengan Realtime subscription. Kalau Realtime WebSocket aktif, polling ini seharusnya tidak diperlukan.

```typescript
// ❌ SEBELUM — polling + realtime jalan bersamaan
useEffect(() => {
  fetchRooms(); // initial fetch
  
  // Realtime subscription
  const channel = supabase.channel('chat_rooms_changes')...
  
  // Polling 15 detik — REDUNDANT jika Realtime aktif!
  const interval = setInterval(fetchRooms, 15_000);
  
  return () => {
    clearInterval(interval);
    supabase.removeChannel(channel);
  };
}, []);
```

```typescript
// ✅ SESUDAH — polling hanya sebagai fallback jika Realtime disconnect
const [realtimeConnected, setRealtimeConnected] = useState(false);

useEffect(() => {
  fetchRooms(); // initial fetch
  
  const channel = supabase.channel('chat_rooms_changes')
    .on('system', {}, (status) => {
      setRealtimeConnected(status === 'SUBSCRIBED');
    })
    .on('postgres_changes', ...)
    .subscribe((status) => {
      setRealtimeConnected(status === 'SUBSCRIBED');
    });
  
  // Polling hanya jika Realtime tidak terhubung
  let fallbackInterval: NodeJS.Timeout | null = null;
  if (!realtimeConnected) {
    fallbackInterval = setInterval(fetchRooms, 60_000); // 60 detik, bukan 15
  }
  
  return () => {
    if (fallbackInterval) clearInterval(fallbackInterval);
    supabase.removeChannel(channel);
  };
}, [realtimeConnected]);
```

---

### T14 — `markAsRead` Dipanggil Dua Kali

**File:** [`components/User/Mobile/MobileLayout.tsx:59-70`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/components/User/Mobile/MobileLayout.tsx#L59-L70)

**Masalah:** `markAsRead` dipanggil dari `MobileLayout.tsx` **dan** dari dalam hook `useUserChat.ts`. Setiap kali chat dibuka → 2 API calls ke `/api/chat/mark-read` → 2 DB updates yang identik.

```typescript
// ❌ SEBELUM — MobileLayout memanggil markAsRead sendiri
// components/User/Mobile/MobileLayout.tsx:59-70
useEffect(() => {
  if (activeRoomId) {
    markAsRead(activeRoomId); // ← dipanggil di sini
  }
}, [activeRoomId]);

// Dan hook useUserChat JUGA memanggil markAsRead di tempat lain
// → double call setiap room dibuka
```

```typescript
// ✅ SESUDAH — hapus salah satu, biarkan hook yang handle
// components/User/Mobile/MobileLayout.tsx — HAPUS useEffect ini:
// useEffect(() => {
//   if (activeRoomId) {
//     markAsRead(activeRoomId);
//   }
// }, [activeRoomId]);

// Biarkan useUserChat.ts yang handle markAsRead secara terpusat
```

---

## 5. ✅ Hal yang Sudah Benar

Berikut hal-hal yang sudah diimplementasikan dengan baik dan **tidak perlu diubah**:

| # | Apa yang Benar | Lokasi |
|---|---|---|
| 1 | ✅ **Singleton Supabase client** — `createClient` dipanggil sekali di module level, bukan di dalam komponen | `lib/supabaseClient.ts`, `lib/supabaseServer.ts` |
| 2 | ✅ **Guard concurrency** — `isFetchingMessagesRef` & `isFetchingRoomsRef` mencegah overlapping fetch | `hooks/useUserChat.ts`, `hooks/useAdminChat.ts` |
| 3 | ✅ **Guard loop Realtime** — cek `payload.eventType === 'UPDATE'` mencegah loop mark-read → trigger → mark-read | `hooks/useUserChat.ts`, `hooks/useAdminChat.ts` |
| 4 | ✅ **Filter Realtime per room** — `room_id=eq.${roomId}` sehingga tidak subscribe ke seluruh tabel | `hooks/useUserChat.ts` |
| 5 | ✅ **`removeChannel()` saat unmount** — tidak ada subscription yang bocor | Semua hook Realtime |
| 6 | ✅ **sessionStorage cache** — data profil di-cache untuk load instan | `hooks/useUserChat.ts` |
| 7 | ✅ **Backup files tidak diimport** — `.backup.tsx` ada di repo tapi tidak aktif | Berbagai folder |
| 8 | ✅ **`persistSession: false`** di supabaseServer — tidak ada session storage overhead di server | `lib/supabaseServer.ts` |
| 9 | ✅ **Tidak ada `auth.onAuthStateChange`** — tidak ada risiko auth state loop | Seluruh codebase |
| 10 | ✅ **ML trigger fire-and-forget** dengan 1 detik AbortSignal timeout — tidak memblokir response | `hooks/useUserChat.ts` / `hooks/useAdminChat.ts` |
| 11 | ✅ **Kolom spesifik di admin endpoints** — `/api/admin/users` dan `/api/admin/stats` tidak pakai `select('*')` | API routes admin |
| 12 | ✅ **Tidak ada middleware.ts** — tidak ada overhead per-request di level middleware Next.js | Root project |

---

## 6. 📉 Simulasi Egress Harian

> Estimasi kasar dengan asumsi: 1 user aktif, 1 admin aktif, 10 rooms, 200 pesan/room rata-rata.

### Kondisi Saat Ini (Sebelum Perbaikan)

| Sumber | Frekuensi | Ukuran/Request | Total/Jam | Total/Hari |
|---|---|---|---|---|
| T2: Polling pesan (10 detik) | 360×/jam | ~100 KB | 36 MB | ~864 MB |
| T1: N+1 rooms query (15 detik) | 240×/jam | ~50 KB × 10 rooms | 12 MB | ~288 MB |
| T3: Auth check per polling | ~720×/jam | ~2 KB | 1.4 MB | ~34 MB |
| T7: Polling rooms (15 detik) | 240×/jam | ~20 KB | 4.8 MB | ~115 MB |
| T6: Polling admin info (30 detik) | 120×/jam | ~5 KB | 0.6 MB | ~14 MB |
| T14: Duplikat markAsRead | Setiap buka chat | ~1 KB × 2 | Variabel | ~5 MB |
| **TOTAL ESTIMASI** | | | **~55 MB/jam** | **~1,3 GB/hari** |

> ⚠️ Dengan kuota 5 GB/bulan, kondisi saat ini bisa menghabiskan kuota dalam **~4 hari** penggunaan normal.

### Proyeksi Setelah Perbaikan

| Sumber | Frekuensi | Ukuran/Request | Total/Jam | Total/Hari |
|---|---|---|---|---|
| Realtime WebSocket | Hanya saat ada event | ~1 KB/event | Variabel | ~5 MB |
| T2 fix: Pesan 50 baris + kolom spesifik | Fallback 60 detik | ~10 KB | 10 MB | ~240 MB |
| T1 fix: Rooms + unread via view/RPC | 60 detik | ~5 KB | 5 MB | ~120 MB |
| T3 fix: JWT lokal / cache | 0 extra DB call | 0 | 0 | ~0 MB |
| **TOTAL ESTIMASI SETELAH FIX** | | | **~15 MB/jam** | **~365 MB/hari** |

> ✅ Setelah perbaikan: kuota 5 GB bertahan ~**13 hari** dengan 1 MAU, atau lebih jika Realtime berfungsi stabil.

---

## 7. 🚀 Rekomendasi Prioritas (Urut Dampak Terbesar)

### 🔴 Prioritas 1 — Perbaikan Kritis (Lakukan Segera)

**1.1 — Tambahkan `.limit(50)` di query `chat_messages`** *(T2)*  
→ Dampak terbesar. Mencegah seluruh history pesan dikirim setiap 10 detik.  
→ File: `app/api/chat/messages/route.ts`, `app/api/chat/messages/[room_id]/route.ts`

**1.2 — Ganti N+1 query rooms dengan SQL view/RPC** *(T1)*  
→ Jalankan SQL di bawah di Supabase SQL Editor, lalu update `route.ts`.  

```sql
-- Jalankan di Supabase SQL Editor:
CREATE OR REPLACE VIEW v_room_unread_counts AS
SELECT 
  room_id,
  COUNT(*) AS unread_count
FROM chat_messages
WHERE is_read = false
  AND sender_identifier != 'admin'
GROUP BY room_id;
```

**1.3 — Cache atau gunakan JWT lokal di `getUserFromRequest()`** *(T3)*  
→ Eliminasi DB round-trip setiap polling call.  
→ File: `lib/authHelper.ts`

---

### 🟡 Prioritas 2 — Perbaikan Penting (Lakukan Pekan Ini)

**2.1 — Filter `.in()` di admin rooms query** *(T5, T9)*  
→ Jangan ambil semua profil/sesi, filter di DB.  
→ File: `app/api/admin/chat/rooms/route.ts`

**2.2 — Kurangi polling rooms dari 15s ke 60s atau hapus jika Realtime aktif** *(T7)*  
→ File: `components/Admin/Mobile/MobileLayout.tsx`, `components/Admin/Web&Tab/WebTabLayout.tsx`

**2.3 — Hapus duplikat `markAsRead`** *(T14)*  
→ Hapus `useEffect` di `MobileLayout.tsx` yang memanggil `markAsRead`.  
→ File: `components/User/Mobile/MobileLayout.tsx`

**2.4 — Ganti polling 30 detik di `useAdminInfo` dengan cache TTL** *(T6)*  
→ Data avatar admin tidak butuh polling, cukup cache 10 menit.  
→ File: `components/User/Shared/hooks/useAdminInfo.ts`

---

### 🟢 Prioritas 3 — Quick Wins (Mudah, Dampak Kecil)

**3.1 — Ganti `select('*')` dengan kolom spesifik** *(T4, T10, T11, T12)*  
→ File: `app/api/profile/route.ts`, `app/api/chat/user-room/route.ts`, `app/api/chat/send/route.ts`, `app/api/profile/avatar/route.ts`

**3.2 — Hapus atau archive file `.backup.tsx`** *(T15)*  
→ Risiko: seseorang bisa tidak sengaja mengimport file tersebut.  
→ Minimal tambahkan comment besar: `// DO NOT IMPORT — LEGACY BACKUP ONLY`

---

### 💡 Rekomendasi Tambahan (Jangka Menengah)

**R1 — Implementasi Infinite Scroll di chat** (bukan load semua pesan)  
→ Muat 50 pesan terbaru, tambah "Load more" button untuk pesan lama.

**R2 — Pastikan Realtime WebSocket stabil sebelum menghapus polling**  
→ Monitor tab Network browser: pastikan WebSocket connection tidak sering disconnect/reconnect.  
→ Kalau sering disconnect, pertimbangkan fallback polling 60 detik (bukan 10–15 detik).

**R3 — Compress avatar sebelum upload**  
→ Gunakan library `browser-image-compression` di client-side sebelum upload ke Supabase Storage.  
→ Target: < 200 KB per avatar.

**R4 — Tambahkan `Cache-Control` header di API profile/avatar**  
→ `Cache-Control: private, max-age=300` untuk response profil user (5 menit cache di browser).

**R5 — Monitor egress Supabase secara proaktif**  
→ Dashboard Supabase → Settings → Billing → Usage.  
→ Set alert jika egress > 3 GB (threshold sebelum melebihi 5 GB free tier).

---

## 8. 📁 Daftar File yang Perlu Dimodifikasi

| File | Temuan | Prioritas |
|---|---|---|
| [`app/api/admin/chat/rooms/route.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/app/api/admin/chat/rooms/route.ts) | T1, T5, T9 | 🔴 Tinggi |
| [`app/api/chat/messages/route.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/app/api/chat/messages/route.ts) | T2 | 🔴 Tinggi |
| [`app/api/chat/messages/[room_id]/route.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/app/api/chat/messages/[room_id]/route.ts) | T2 | 🔴 Tinggi |
| [`lib/authHelper.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/lib/authHelper.ts) | T3 | 🔴 Tinggi |
| [`app/api/profile/route.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/app/api/profile/route.ts) | T4 | 🔴 Tinggi |
| [`components/Admin/Mobile/MobileLayout.tsx`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/components/Admin/Mobile/MobileLayout.tsx) | T7 | 🟡 Sedang |
| [`components/Admin/Web&Tab/WebTabLayout.tsx`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/components/Admin/Web&Tab/WebTabLayout.tsx) | T7, T8 | 🟡 Sedang |
| [`components/User/Mobile/MobileLayout.tsx`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/components/User/Mobile/MobileLayout.tsx) | T14 | 🟡 Sedang |
| [`components/User/Shared/hooks/useAdminInfo.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/components/User/Shared/hooks/useAdminInfo.ts) | T6 | 🟡 Sedang |
| [`app/api/chat/user-room/route.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/app/api/chat/user-room/route.ts) | T10 | 🟢 Rendah |
| [`app/api/chat/send/route.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/app/api/chat/send/route.ts) | T11 | 🟢 Rendah |
| [`app/api/profile/avatar/route.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/app/api/profile/avatar/route.ts) | T12 | 🟢 Rendah |

---

## 9. ⚠️ Catatan Keamanan (Di Luar Scope Egress)

> **`BackEnd/.env`** mengandung plaintext credentials:
> - `SUPABASE_SERVICE_ROLE_KEY`
> - `JWT_SECRET`  
> 
> Pastikan file ini ada di `.gitignore` dan **tidak pernah di-commit ke Git**. Jika sudah ter-commit sebelumnya, rotate kedua key tersebut segera melalui Supabase Dashboard.

---

*Audit selesai. Tidak ada perubahan kode yang dilakukan — semua temuan di atas menunggu persetujuan sebelum implementasi.*

*Dibuat oleh Antigravity AI — 2025-11-10*

