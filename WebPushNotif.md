# WebPushNotif — Rencana Implementasi Web Push Notification SiRuang

> **STATUS:** Rencana lengkap — siap dieksekusi fase per fase.
> **Dibuat:** 2026-11-10 | **Terakhir diperbarui:** 2026-11-10 (Revisi 4).

---

## CHECKLIST PROGRES

| Fase | Deskripsi | Status |
|------|-----------|--------|
| Riset | Baca kode & skema | [x] |
| F1 | SQL + Env + pushRules.ts + webPush.ts | [x] |
| F2 | API /api/push/subscribe & /unsubscribe | [x] |
| F3 | lib/sendPush.ts (notifyRecipient) + integrasi jalur pesan | [x] |
| F4 | public/sw.js (service worker) | [x] |
| F5 | Deep link support | [x] |
| F6 | Hook usePushNotifications + tombol per role + iOS + integrasi logout | [x] |
| F7 | Verifikasi akhir (tsc, eslint, tes manual) | [ ] |
| F8 | Redirect-after-login (opsional) | [ ] |

---

## 1. TUJUAN & KETENTUAN FINAL

### Ringkasan Fitur
Web Push Notification agar pesan chat masuk sebagai notifikasi ke perangkat pengguna (HP dan desktop), bahkan saat web ditutup, menggunakan standar Web Push API + library `web-push`.

### Tabel Siapa yang Di-push

| Pengirim → Penerima | Push? |
|---|---|
| Admin / `admin_ai` → `user` / `dosen` / `pj_kelas` | **YA** |
| Siapapun → `admin` | **TIDAK** |
| Pengirim → dirinya sendiri | **TIDAK** |

> *Catatan: Room dosen <-> user belum ada, jadi tidak dikerjakan sekarang.*

### Kapan Notifikasi Tampil
- **TAMPIL:** web ditutup, browser ditutup, PWA di background, tab tersembunyi, layar HP terkunci.
- **TIDAK TAMPIL:** ada tab/window app yang `visibilityState === 'visible'`.
- Cek di service worker via `clients.matchAll({ includeUncontrolled: true })` → cari client dengan `visibilityState === 'visible'`.
- **WAJIB** tampilkan notifikasi jika tidak ada visible client (Chrome menampilkan notifikasi generik jika SW tidak memanggil `showNotification`).

### Klik Notifikasi
- Langsung buka room chat yang bersangkutan.
- Jika tab sudah terbuka: fokuskan tab, kirim `postMessage` tipe `OPEN_ROOM` dengan `roomId`.
- Jika belum ada tab: `clients.openWindow(deepLinkUrl)`.
- Jika belum login/sesi habis: arahkan ke `/login`. Dengan Fase 8 (opsional), URL tujuan disimpan ke sessionStorage sebelum redirect agar bisa dipulihkan setelah login.
- Validasi: URL harus same-origin.

### Konstrain Utama
- Tidak ada polling baru, tidak ada Realtime subscription baru.
- Tambahan DB: hanya tabel `push_subscriptions` + 1 query kecil per pesan.
- Push tidak memblokir response chat (fire-and-forget dengan `try/catch`).
- Subscription 404/410 dihapus otomatis.
- Maksimal 5 subscription per user (sliding window FIFO).
- Isi notifikasi generik: title = `Pesan baru dari <nama>`, body ≤ 80 karakter, `tag` = `room-<roomId>`.
- Bot `admin_ai` tampil sebagai `"Admin"` di notifikasi.
- Izin hanya diminta saat user klik tombol "Aktifkan notifikasi".
- Admin tidak mendapat tombol "Aktifkan notifikasi".
- iOS: hanya jalan jika dipasang sebagai PWA (iOS 16.4+).

---

## 2. TEMUAN RISET

### 2.1 Nama Role (PERSIS dari DB)
Dari `supabase_schema.sql` baris 19:
```sql
CREATE TYPE user_role AS ENUM ('admin', 'user', 'dosen', 'pj_kelas');
```
- `'admin'` — administrator
- `'user'` — mahasiswa
- `'dosen'` — dosen
- `'pj_kelas'` — penanggung jawab kelas

`admin_ai` adalah nilai `sender_identifier` di tabel `chat_messages`, **bukan** nilai role di enum.

### 2.1b Verifikasi Tambahan (Revisi 4)

**a. Return `getUserFromRequest`:** Return `Promise<TokenPayload | null>` (`FrontEnd/src/lib/authHelper.ts` baris 6–11 & 41). Objek `TokenPayload` berisi field `{ identifier: string, identifier_type: string, role: string, username: string }`. `user.role` dan `user.identifier` langsung tersedia sebagai properti objek tanpa perlu query database tambahan.

**b. Nilai `NEXT_PUBLIC_API_URL`:** Sudah berakhiran `/api` (`FrontEnd/.env.example` baris 2: `http://localhost:8080/api`). Semua route backend/Next.js dipanggil dengan format `${process.env.NEXT_PUBLIC_API_URL}/<endpoint>` (contoh: `${process.env.NEXT_PUBLIC_API_URL}/logout`, `${process.env.NEXT_PUBLIC_API_URL}/push/subscribe`).

**c. Pola fetch logout & format token:** Di `MobileLayout.tsx` baris 78–81:
```typescript
await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});
```
Token di `localStorage.getItem('user')` bertipe raw JWT string **tanpa** kata "Bearer". Kata `"Bearer "` selalu ditambahkan secara eksplisit saat fetch (`Authorization: \`Bearer ${token}\``).

**d. Alur login redirect:** Di `FrontEnd/src/app/login/page.tsx` baris 40–46 (`handleLoginSuccess`) memanggil `router.push('/user')` (atau `/admin`), dipassing ke `MainAuth.tsx` baris 74–82 dan dieksekusi tepat sesudah `localStorage.setItem('user', JSON.stringify(data))`.

**e. Redirect saat unauthenticated di `app/user/page.tsx`:** Baris 15–19:
```typescript
const storedUser = localStorage.getItem('user');
if (!storedUser) {
  router.replace('/login');
  return;
}
```
Ketika unauthenticated, komponen langsung return `<UserDashboardSkeleton />` (baris 32) dan **tidak merender** `MainUser`, `MobileLayout`, atau `WebTabLayout`. Oleh karena itu, penyimpanan URL tujuan `?openChat=1` **wajib** dilakukan di `app/user/page.tsx` sebelum `router.replace('/login')`.

**f. `authentication.identifier` UNIQUE:** Ya — `supabase_schema.sql` baris 26: `identifier VARCHAR(50) NOT NULL UNIQUE`. FK di `push_subscriptions` aman.

**g. Room user di-fetch via `/api/chat/user-room`:** Ya — `useUserChat.ts` baris 182–196 (`initChat`) selalu fetch room saat mount terlepas dari sessionStorage. Deep link `?openChat=1` aman.

**h. Hosting:** Tidak ada `vercel.json`. `after()` aman untuk Next.js 16. Blok ML tetap fire-and-forget dengan fallback `after()`.

### 2.2 Struktur Chat

**`chat_rooms`** (skema baris 55–63):
```
id SERIAL PK
user_identifier VARCHAR(50) NOT NULL   -- NIM/NIP pemilik room (satu user = satu room)
last_message TEXT
updated_at TIMESTAMPTZ
is_marked_unread BOOLEAN
```
> **KRITIS:** `chat_rooms.user_identifier` adalah pemilik satu-satunya per room. Setiap user/dosen/pj_kelas memiliki tepat **satu** room yang di-share dengan admin.

**`chat_messages`** (skema baris 66–77):
```
id SERIAL PK
room_id INTEGER REFERENCES chat_rooms(id)
sender_identifier VARCHAR(50)   -- NIM/NIP pengirim, atau 'admin_ai'
message TEXT
message_type ENUM('text','file','image','multi_file')
created_at TIMESTAMPTZ
is_read BOOLEAN
```

**Model chat:** 1-on-1 antara satu user dan admin. Chat dosen ↔ user **tidak ada** — semua dosen juga memiliki room 1-on-1 dengan admin. Tidak ada room grup.

**Siapa penerima sebuah pesan?**
- Jika `sender_identifier` adalah NIP/NIM yang ada di tabel `authentication` dengan role `admin`, atau `sender_identifier === 'admin_ai'` → pengirimnya admin, **penerima adalah `chat_rooms.user_identifier`** (dengan role-nya di tabel `authentication`).
- Jika `sender_identifier` adalah NIM/NIP non-admin → pengirimnya user/dosen/pj_kelas, **penerima adalah admin**.

**Implikasi untuk push:**
- Admin → user/dosen/pj_kelas: push ke pemilik room (non-admin) → **YA**.
- admin_ai → user/dosen/pj_kelas: sama → **YA**.
- user/dosen/pj_kelas → admin: penerima adalah admin → **TIDAK push**.
- Chat dosen ↔ user **tidak ada**, jadi baris tabel "dosen ↔ user" dari ketentuan hanya relevan jika fitur tersebut ditambahkan di masa depan. Saat ini semua chat menuju ke admin.

> **KEPUTUSAN:** Rencanakan push hanya untuk jalur yang ada: admin/bot→user dan user→admin (admin tidak pernah di-push). Baris "dosen ↔ user" di tabel ketentuan diabaikan karena tidak ada infrastruktur room-nya saat ini. Catat di Pertanyaan Terbuka.

### 2.3 Semua Jalur Penyimpan Pesan

| # | File | Fungsi/Handler | Keterangan |
|---|------|---------------|-----------|
| 1 | `src/app/api/chat/send/route.ts` | `POST` (baris 4) | Kirim pesan utama (admin & user). Juga memicu ML auto-reply. |
| 2 | `src/app/api/chat/send/route.ts` | Blok ML fire-and-forget (baris 62–96) | Insert `sender_identifier: 'admin_ai'` (baris 77–82) secara async setelah respons dikirim. |
| 3 | `src/app/api/admin/chat/broadcast/route.ts` | `POST` (baris 4) | Broadcast batch insert ke banyak room sekaligus (baris 81). |

**Tidak ada jalur lain** — tidak ada Go backend handler yang diekspos ke FE untuk chat (Go backend ada tapi untuk fitur lain seperti file/avatar).

> **CATATAN PENTING:** Jalur ML (jalur #2) adalah **fire-and-forget async di dalam route.ts** — ia berjalan **setelah** `return NextResponse.json(...)` dipanggil. Ini artinya push untuk bot harus dipasang di dalam blok `.then()` yang sama, atau dieksekusi setelah insert bot berhasil.

### 2.4 Navigasi Room & Deep Link

**Navigasi berbasis STATE (bukan URL/route param):**
- Semua chat di `app/user/page.tsx` → `MainUser` → `MobileLayout` / `WebTabLayout`.
- Mobile: `activeTab` state (`'home'|'denah'|'chats'|'booking'|'profile'`) + `chatView` state (`'LIST'|'ROOM'`). Tidak ada URL per room.
- Web/Tab: `isChatOpen` boolean state. Juga tidak ada URL per room.
- Admin: `selectedChat` state (object dari daftar rooms).
- **Room ID disimpan di:** `sessionStorage['user_chat_room_id']` (user) dan `sessionStorage['adminActiveChat']` (admin).

**Deep link yang tersedia saat ini:** TIDAK ADA — semua navigasi adalah state internal halaman tunggal.

**Deep link yang perlu dibuat (minimal, tanpa merombak navigasi):**
- URL: `/user?openChat=1` untuk user/dosen/pj_kelas.
- URL: `/admin?openRoom=<roomId>` untuk admin (admin tidak di-push, tapi konsistensi).
- Implementasi: baca URL param di `useEffect` di `WebTabLayout`/`MobileLayout` → set state yang sesuai.
- Listener `postMessage` tipe `OPEN_ROOM`: SW mengirim ke existing tab, tab buka room langsung.

**URL deep link per role dan skenario:**

| Skenario | URL deep link | Aksi di app |
|---|---|---|
| Tab belum ada (user/dosen/pj_kelas) | `/user?openChat=1` | `MainUser` load → baca param → set `isChatOpen=true` / `activeTab='chats'` + `chatView='ROOM'` |
| Tab sudah ada (user/dosen/pj_kelas) | postMessage `{type:'OPEN_ROOM'}` | Handler di `WebTabLayout`/`MobileLayout` → set state |
| Tab belum ada (admin) | `/admin?openRoom=<roomId>` | `MainAdmin` load → baca param → set `selectedChat` dari rooms |
| Belum login | `/user?openChat=1` atau `/admin` | `page.tsx` redirect ke `/login` (sesi habis) |

### 2.5 Auth & authHelper.ts

- File: `src/lib/authHelper.ts`
- Token: JWT 24h, disimpan di `localStorage['user'].token`.
- `getUserFromRequest(request)` — verifikasi JWT + cek `active_sessions` di Supabase (dengan cache 15 detik in-memory).
- `invalidateSessionCache(identifier, token?)` — hapus cache sesi.
- **Login flow:** `POST /api/login` → simpan `{token, username, identifier, role, ...}` ke `localStorage['user']`.
- **Sesi habis:** `active_sessions` row terhapus → `getUserFromRequest` return `null` → API return 401 → FE mendeteksi 401 dan redirect ke `/login` (melalui `router.replace('/login')` di `page.tsx`).
- **Redirect setelah login:** Tidak ada redirect-after-login built-in. `page.tsx` cek localStorage → jika ada user → render dashboard. Deep link `/user?openChat=1` tetap bisa dibaca setelah login karena URL-nya tidak berubah.

### 2.6 Versi Next.js & Runtime

Dari `package.json` baris 21: `"next": "^16.4.5"` — **Next.js 16** (versi sangat baru/canary).

> **`after()` dari `next/server`:** Tersedia sejak Next.js 15. Karena versi ini 16, `after()` **TERSEDIA**. Gunakan `after()` untuk menjalankan push setelah response dikirim.

- Runtime: Next.js App Router default (Node.js runtime di server).
- Deploy: Belum terdeteksi dari konfigurasi (tidak ada `vercel.json`, tidak ada `runtime: 'edge'`). Asumsikan **Vercel serverless** atau Node.js biasa. `after()` aman untuk keduanya.
- Tidak ada `middleware.ts`.

### 2.7 middleware.ts, Manifest, /public, Icon

- `middleware.ts`: **TIDAK ADA**.
- `app/manifest.ts`: **ADA** — sudah ada manifest Next.js dengan `display: 'standalone'` dan ikon `LogoSiRuangPolos.png`.
- Folder `/public`: **ADA**, berisi:
  - `icon-192.png` — ikon 192×192 ✅
  - `icon-512.png` — ikon 512×512 ✅
  - `LogoSiRuangPolos.png` — ikon alternatif
  - `favicon.ico`, `apple-touch-icon.png`
- Service worker harus ditempatkan di `public/sw.js` agar tersedia di `/sw.js`.
- Manifest sudah cukup untuk PWA. Perlu tambah `gcm_sender_id` jika ingin Chrome legacy, tapi tidak wajib untuk VAPID.

### 2.8 Alur Logout & Tombol per Layout

**Alur logout:**

| File | Fungsi | Langkah |
|------|--------|---------|
| `components/User/Mobile/MobileLayout.tsx` | `handleLogout` (baris 73) | `POST /api/logout` → `localStorage.removeItem('user')` → hapus sessionStorage → `window.location.href='/login'` |
| `components/User/Web&Tab/WebTabLayout.tsx` | `handleLogout` (baris 60) | Sama persis |
| `components/Admin/Mobile/MobileLayout.tsx` | (baris ~100+, pola sama) | Sama persis |
| `components/Admin/Web&Tab/WebTabLayout.tsx` | (pola sama) | Sama persis |

**Tempat yang cocok untuk tombol "Aktifkan notifikasi":**

| Role | Layout | Komponen / Lokasi yang Tepat |
|---|---|---|
| user/dosen/pj_kelas | Mobile | `MobileProfileView.tsx` (tab Profile) |
| user/dosen/pj_kelas | Web/Tab | `UserSidebar.tsx` (di bawah info user, dekat tombol logout) |
| admin | Mobile | Tidak perlu |
| admin | Web/Tab | Tidak perlu |

---

## 3. ARSITEKTUR RINGKAS

```
Pesan disimpan ke chat_messages
         │
         ▼
  [api/chat/send route.ts]
  [api/admin/chat/broadcast route.ts]
         │
         ▼
  after() / fire-and-forget
         │
         ▼
  lib/sendPush.ts → notifyRecipient(roomId, senderIdentifier, messageBody)
         │
         ├─ Tentukan penerima & role-nya
         │   └─ Query: chat_rooms.user_identifier → auth.role
         │
         ├─ shouldPush(senderRole, recipientRole, senderIdentifier)
         │   └─ false jika penerima=admin ATAU pengirim=penerima
         │
         ├─ Ambil subscriptions penerima dari push_subscriptions
         │   └─ SELECT endpoint, p256dh, auth WHERE user_identifier=penerima
         │
         └─ webpush.sendNotification() per subscription (loop)
                 │
                 ├─ 404/410 → DELETE subscription dari DB
                 └─ Success → Payload diterima browser
                             │
                             ▼
                    Service Worker (public/sw.js)
                             │
                    ┌────────┴────────┐
                    │ push event      │
                    ▼                 ▼
              clients.matchAll()  Tidak ada visible client
              Ada visible → skip   → self.registration.showNotification()
                                           │
                                           ▼
                                  notificationclick event
                                           │
                               ┌───────────┴──────────────┐
                               │ Ada tab app terbuka?      │
                               ▼                           ▼
                       client.focus()             clients.openWindow()
                       + postMessage              /user?openChat=1
                       {type:'OPEN_ROOM'}
                               │
                               ▼
                    WebTabLayout / MobileLayout
                    baca URL param / postMessage
                    → set state → buka room
```

---

## 4. RENCANA DALAM FASE KECIL

---

### Fase 1 — SQL + Env + pushRules.ts + webPush.ts

#### (a) File yang dibuat/diubah

| File | Status |
|------|--------|
| `push_subscriptions.sql` (di root project, bukan di src) | BARU |
| `FrontEnd/src/lib/pushRules.ts` | BARU |
| `FrontEnd/src/lib/webPush.ts` | BARU |
| (dokumentasi env, tidak ada file .env yang disentuh) | — |

#### (b) Fungsi/tipe yang ditambah

**`push_subscriptions.sql`** — DDL saja, tidak ada fungsi TypeScript.

**`FrontEnd/src/lib/pushRules.ts`:**
```typescript
// Konstanta mudah diubah
export const ROLES_NEVER_PUSHED: string[] = ['admin'];
export const BOT_SENDERS: string[] = ['admin_ai'];

/**
 * Tentukan apakah penerima harus mendapat push notification.
 * @param senderRole   - role pengirim dari tabel authentication (atau 'bot' untuk admin_ai)
 * @param recipientRole - role penerima dari tabel authentication
 * @param senderIdentifier - identifier pengirim (NIM/NIP atau 'admin_ai')
 * @param recipientIdentifier - identifier penerima
 */
export function shouldPush(
  senderRole: string,
  recipientRole: string,
  senderIdentifier: string,
  recipientIdentifier: string
): boolean
```

**`FrontEnd/src/lib/webPush.ts`:**
```typescript
import webpush from 'web-push';

/** Inisialisasi VAPID sekali saja (lazy, idempotent) */
export function initWebPush(): void

/** Kirim satu push ke satu subscription. Return true=sukses, false=gagal (tidak throw). */
export async function sendOneNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string  // JSON string
): Promise<{ success: boolean; expired: boolean }>
```

#### (c) Payload push dan data notification

```jsonc
// Payload yang dikirim ke browser (string JSON):
{
  "title": "Pesan baru dari Admin",          // atau nama pengirim
  "body": "Halo, ada yang bisa dibantu?",   // ≤80 karakter
  "icon": "/icon-192.png",
  "badge": "/icon-192.png",
  "tag": "room-42",                          // roomId → pesan beruntun menumpuk
  "data": {
    "url": "/user?openChat=1",               // deep link
    "roomId": 42
  }
}
// Body untuk message_type selain 'text' (JANGAN tampilkan URL/nama file):
// image → "📷 Gambar"
// file  → "📎 File"
// multi_file → "📎 Lampiran File"
// text  → substring(0, 80) dari message
```

#### (d) Kode kunci — SQL `push_subscriptions`

```sql
-- push_subscriptions.sql
-- Jalankan di Supabase SQL Editor setelah schema utama sudah ada.

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id            SERIAL PRIMARY KEY,
    user_identifier VARCHAR(50) NOT NULL,     -- NIM/NIP pemilik subscription
    endpoint      TEXT NOT NULL UNIQUE,       -- URL endpoint browser
    p256dh        TEXT NOT NULL,              -- public key DH
    auth          TEXT NOT NULL,              -- auth secret
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user FOREIGN KEY (user_identifier)
        REFERENCES authentication(identifier) ON DELETE CASCADE
        -- Aman: authentication.identifier adalah UNIQUE (baris 26 schema)
);

CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions(user_identifier);

-- RLS: AKTIFKAN tanpa policy (tidak ada akses anon/authenticated langsung).
-- Next.js API Route menggunakan supabaseServer dengan service_role key
-- yang bypass RLS, jadi table tetap terlindungi dari akses publik.
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Cabut akses anon dan authenticated langsung ke tabel ini:
REVOKE ALL ON push_subscriptions FROM anon;
REVOKE ALL ON push_subscriptions FROM authenticated;
GRANT ALL ON push_subscriptions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE push_subscriptions_id_seq TO service_role;
```

#### (e) Kriteria selesai Fase 1
- [ ] File `push_subscriptions.sql` dapat dijalankan tanpa error di Supabase SQL Editor.
- [ ] `pushRules.ts` lolos `tsc --noEmit`.
- [ ] `webPush.ts` lolos `tsc --noEmit` (web-push + @types/web-push sudah di-install).
- [ ] `shouldPush('admin','user','198501012010121001','1313620001')` → `true`.
- [ ] `shouldPush('user','admin','1313620001','198501012010121001')` → `false`.
- [ ] `shouldPush('admin_ai','user','admin_ai','1313620001')` → `true` (bot sender tetap push ke user).

#### (f) JANGAN di Fase 1
- Jangan menyentuh file API route manapun.
- Jangan menyentuh file komponen React manapun.
- Jangan menjalankan SQL di produksi (hanya buat file SQL-nya).
- Jangan cetak atau commit VAPID key.

---

### Fase 2 — API /api/push/subscribe & /api/push/unsubscribe

#### (a) File yang dibuat/diubah

| File | Status |
|------|--------|
| `FrontEnd/src/app/api/push/subscribe/route.ts` | BARU |
| `FrontEnd/src/app/api/push/unsubscribe/route.ts` | BARU |

#### (b) Fungsi/tipe

**`/api/push/subscribe/route.ts`:**
```typescript
// POST — body: { endpoint: string, keys: { p256dh: string, auth: string } }
// Header: Authorization: Bearer <JWT>  (sama dengan semua route lain)
// Respons: 200 { message: 'Subscription disimpan' } | 400 | 401 | 403 | 500
export async function POST(request: Request): Promise<NextResponse>
```
Logika:
1. `const user = await getUserFromRequest(request);` → 401 jika null. `user` adalah objek `TokenPayload` berisi field `{ identifier, role, username }`, sehingga `user.role` dan `user.identifier` langsung tersedia tanpa query DB tambahan.
2. Admin (`user.role === 'admin'`) → 403 (admin tidak perlu push).
3. Validasi body: `endpoint`, `keys.p256dh`, `keys.auth` wajib ada dan bertipe string.
4. Cek apakah endpoint sudah ada di tabel. Jika sudah ada: cukup update p256dh, auth, user_identifier, created_at, lalu return 200 (JANGAN hapus subscription lain).
5. Jika endpoint belum ada: hitung jumlah subscription user_identifier ini. Jika sudah >= 5, hapus yang paling lama (ORDER BY created_at ASC, 1 baris).
6. Insert subscription baru, return 200.

**`/api/push/unsubscribe/route.ts`:**
```typescript
// POST — body: { endpoint: string }
// Header: Authorization: Bearer <JWT>  (sama dengan semua route lain)
export async function POST(request: Request): Promise<NextResponse>
```
Logika:
1. `const user = await getUserFromRequest(request);` → 401 jika null.
2. `DELETE FROM push_subscriptions WHERE endpoint=$1 AND user_identifier=user.identifier`.
3. Return 200.

> **Auth pattern:** Fetch dari client memanggil `${process.env.NEXT_PUBLIC_API_URL}/push/subscribe` dan `/push/unsubscribe` dengan `headers: { 'Content-Type': 'application/json', Authorization: \`Bearer ${token}\` }`. `token` adalah string raw JWT dari `JSON.parse(localStorage.getItem('user')).token` (tanpa prefix "Bearer", kata `"Bearer "` ditambahkan saat fetch, persis seperti alur logout).

#### (c) Payload: lihat Fase 1 (c).

#### (d) Kode kunci — Upsert subscription

```typescript
// Upsert: ON CONFLICT (endpoint) → update keys dan reset created_at
await supabaseServer
  .from('push_subscriptions')
  .upsert(
    {
      user_identifier: user.identifier,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );
```

#### (e) Kriteria selesai Fase 2
- [ ] `POST /api/push/subscribe` dengan token valid → 200, row masuk ke `push_subscriptions`.
- [ ] `POST /api/push/subscribe` token admin → 403.
- [ ] `POST /api/push/subscribe` tanpa token → 401.
- [ ] Subscribe lebih dari 5 kali dari akun yang sama → subscription terlama dihapus, hanya 5 tersisa.
- [ ] `POST /api/push/unsubscribe` → row terhapus dari DB.

#### (f) JANGAN di Fase 2
- Jangan menyentuh route chat send/broadcast.
- Jangan membuat service worker dulu.

---

### Fase 3 — lib/sendPush.ts (notifyRecipient) + Integrasi Jalur Pesan

#### (a) File yang dibuat/diubah

| File | Status |
|------|--------|
| `FrontEnd/src/lib/sendPush.ts` | BARU |
| `FrontEnd/src/app/api/chat/send/route.ts` | DIUBAH (tambah integrasi) |
| `FrontEnd/src/app/api/admin/chat/broadcast/route.ts` | DIUBAH (tambah integrasi) |

#### (b) Fungsi/tipe

**`FrontEnd/src/lib/sendPush.ts`:**
```typescript
/**
 * Fungsi pusat untuk mengirim push notification ke penerima pesan.
 * Dipanggil fire-and-forget dari semua jalur penyimpan pesan.
 * Tidak pernah throw — semua error ditangkap di dalam.
 *
 * @param roomId           - ID room chat
 * @param senderIdentifier - identifier pengirim (NIM/NIP atau 'admin_ai')
 * @param messageBody      - isi pesan (akan dipotong ≤80 karakter)
 * @param messageType      - tipe pesan ('text' | 'image' | 'file' | 'multi_file')
 */
export async function notifyRecipient(
  roomId: number,
  senderIdentifier: string,
  messageBody: string,
  messageType: 'text' | 'image' | 'file' | 'multi_file'
): Promise<void>
```

Logika internal `notifyRecipient`:
1. Ambil room: `SELECT user_identifier FROM chat_rooms WHERE id = roomId`. Jika tidak ada, return.
2. Jika `senderIdentifier === room.user_identifier`, return (pengirim adalah pemilik room; berarti penerimanya admin).
3. Ambil role dan username penerima: `SELECT role, username FROM authentication WHERE identifier = room.user_identifier`.
4. Jika role penerima adalah `'admin'`, return.
5. Pengirim yang bukan pemilik room pasti admin atau bot `admin_ai`, jadi `senderRole = 'admin'` dan `displayName = 'Admin'` (tidak perlu query role pengirim).
6. `shouldPush(senderRole, recipientRole, senderIdentifier, recipientIdentifier)`. Jika false, return.
7. Ambil subscription: `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_identifier = recipientIdentifier`. Jika kosong, return.
8. Susun body sesuai `messageType` (`text`: substring 0-80; `image`: "📷 Gambar"; `file`: "📎 File"; `multi_file`: "📎 Lampiran File").
9. Kirim ke semua subscription dengan `sendOneNotification`; jika expired (404/410) hapus subscription itu.

#### (c) Payload push

```jsonc
// senderIdentifier bukan 'admin_ai' dan role admin:
{
  "title": "Pesan baru dari Admin",
  "body": "<messageBody dipotong 80 char>",   // text: substring(0,80); image:"📷 Gambar"; file:"📎 File"; multi_file:"📎 Lampiran File"
  "icon": "/icon-192.png",
  "badge": "/icon-192.png",
  "tag": "room-<roomId>",
  "data": { "url": "/user?openChat=1", "roomId": <roomId> }
}

// senderIdentifier adalah 'admin_ai': title selalu "Pesan baru dari Admin", body sesuai tipe pesan.
// Pengirim user/dosen/pj_kelas → shouldPush() = false → tidak ada push.
```

#### (d) Kode kunci — Integrasi ke send/route.ts

```typescript
// Di api/chat/send/route.ts, SETELAH insertedMsg berhasil dan SEBELUM return:
// Gunakan after() dari next/server untuk tidak memblokir response:

import { after } from 'next/server';
import { notifyRecipient } from '@/lib/sendPush';

// ... (kode yang sudah ada) ...

// Langsung return — push jalan di background setelah response terkirim:
const responsePayload = { ...insertedMsg, sender_gmail: insertedMsg.sender_identifier };

after(async () => {
  try {
    await notifyRecipient(roomId, senderIdentifier, message, messageType);
  } catch {
    // Gagal push: abaikan senyap
  }
});

return NextResponse.json(responsePayload);
```

**Untuk jalur ML bot** di blok fire-and-forget yang sudah ada di `send/route.ts` (baris 62–96):
> **KEPUTUSAN (Revisi 2):** Blok ML sudah berada di dalam `.then()` yang berjalan async setelah `return NextResponse.json(...)`. Karena sudah di luar request context, **`after()` tidak bisa dipakai di sini** (after() hanya valid selama request lifecycle). Gunakan `await notifyRecipient()` biasa di dalam blok `.then()` — aman karena blok itu memang sudah fire-and-forget. Jika hosting serverless dengan batas waktu fungsi ketat, pertimbangkan queue di masa depan, tapi untuk sekarang ini sudah cukup.

```typescript
// Setelah dua await insert + update bot di blok .then():
try {
  await notifyRecipient(roomId, 'admin_ai', replyText.substring(0, 200), 'text');
} catch {}
```

**Untuk broadcast/route.ts:**
```typescript
export async function notifyBroadcast(
  adminIdentifier: string,
  finalMsg: string,
  messageType: 'text' | 'image' | 'file' | 'multi_file',
  roomMap: Map<string, number>,
  targetIdentifiers: string[]
): Promise<void>
```
Logika: 1 query subscription pakai `.in('user_identifier', targetIdentifiers)`, kirim paralel per batch 10 dengan `Promise.allSettled`, tag per room, hapus subscription yang expired. Route broadcast memanggilnya di dalam `after()`.

#### (e) Kriteria selesai Fase 3
- [x] Kirim pesan teks dari admin ke user (web ditutup) → push terkirim, body = teks terpotong.
- [x] Kirim pesan gambar dari admin ke user → body = "📷 Gambar" (bukan URL/nama file).
- [x] Kirim pesan dari user ke admin → tidak ada push dikirim.
- [x] Bot reply (`admin_ai`) → push terkirim berlabel "Admin", body sesuai tipe.
- [x] Broadcast → semua penerima mendapat push (cek log server), 1 query subscription batch.
- [x] Gagal webpush (endpoint fiktif/kadaluwarsa) → endpoint dihapus dari DB, chat tetap normal.
- [x] `tsc --noEmit` tanpa error.

> **Catatan Penyesuaian Realisasi (Fase 3):** Di `chat/send/route.ts`, `roomId` dikonversi via `Number(roomId)` untuk keamanan tipe data TypeScript, dan `messageType` diteruskan ke `notifyRecipient`. Di `broadcast/route.ts`, pemanggilan `notifyBroadcast` dilakukan di dalam `after()` setelah batch insert/update room berhasil. Sesuai instruksi, pada reply bot ML `admin_ai`, pemanggilan `notifyRecipient` menggunakan `await` langsung di dalam blok `.then()` async fire-and-forget (tanpa `after()`).

#### (f) JANGAN di Fase 3
- Jangan sentuh service worker.
- Jangan sentuh komponen UI.
- Jangan tambah subscription Realtime atau polling baru.

---

### Fase 4 — public/sw.js (Service Worker)

#### (a) File yang dibuat/diubah

| File | Status |
|------|--------|
| `FrontEnd/public/sw.js` | BARU |
| `FrontEnd/next.config.ts` | DIUBAH (tambah header Cache-Control untuk `/sw.js`) |

#### (b) Komponen/tipe
Tidak ada TypeScript di sw.js (service worker adalah plain JS).

#### (c) Payload: sudah didefinisikan di Fase 1 (c).

#### (d) Kode kunci — public/sw.js

```javascript
// public/sw.js
// PENTING: file ini diletakkan di /public agar tersedia di URL /sw.js

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Pesan baru', body: event.data.text(), data: { url: '/user' } };
  }

  const title = payload.title || 'Pesan baru';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'siruang-push',
    renotify: true,           // dengan tag per room: ganti notif lama DAN bunyi lagi untuk pesan baru
    data: payload.data || {},
  };

  // Cek apakah ada window/tab app yang sedang visible.
  // Chrome WAJIB showNotification jika tidak ada visible client.
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const hasVisible = clientList.some(
          (c) => c.visibilityState === 'visible'
        );
        if (hasVisible) {
          // Pengguna sedang aktif di app → jangan tampilkan notifikasi
          return;
        }
        // Tidak ada visible tab → tampilkan notifikasi
        return self.registration.showNotification(title, options);
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = data.url || '/user?openChat=1';

  // Validasi same-origin
  const origin = self.location.origin;
  const fullUrl = new URL(targetUrl, origin).href;
  if (!fullUrl.startsWith(origin)) return;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Cari tab app yang sudah terbuka
        for (const client of clientList) {
          if (client.url.startsWith(origin) && 'focus' in client) {
            // Fokuskan tab yang ada, lalu kirim perintah buka room
            return client.focus().then((focusedClient) => {
              if (focusedClient && data.roomId) {
                focusedClient.postMessage({
                  type: 'OPEN_ROOM',
                  roomId: data.roomId,
                });
              }
            });
          }
        }
        // Tidak ada tab terbuka → buka window baru ke deep link
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
  );
});
```

**Tambahan di `next.config.ts` untuk Cache-Control sw.js:**
```typescript
const nextConfig: NextConfig = {
  // ...config yang sudah ada...
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
};
```

#### (e) Kriteria selesai Fase 4
- [ ] `GET /sw.js` mengembalikan file JS yang valid dengan header `Cache-Control: no-cache`.
- [ ] DevTools → Application → Service Workers → SW terdaftar tanpa error.
- [ ] Push test dari DevTools (Application → Push) → notifikasi muncul saat tab tidak visible.
- [ ] Push test → tidak ada notifikasi saat tab visible.
- [ ] Klik notifikasi → tab difokuskan / window baru terbuka.

#### (f) JANGAN di Fase 4
- Jangan daftarkan SW di dalam komponen React dulu (Fase 6 tugasnya).
- Jangan sentuh file API route.

---

### Fase 5 — Deep Link Support

#### (a) File yang dibuat/diubah

| File | Status |
|------|--------|
| `FrontEnd/src/components/User/Web&Tab/WebTabLayout.tsx` | DIUBAH |
| `FrontEnd/src/components/User/Mobile/MobileLayout.tsx` | DIUBAH |
| `FrontEnd/src/components/Admin/Web&Tab/WebTabLayout.tsx` | DIUBAH (opsional, admin tidak di-push) |

#### (b) Fungsi/komponen yang ditambah

Tambahkan `useEffect` di **`WebTabLayout` (User):**
```typescript
// Baca URL param openChat=1 → buka chat
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('openChat') === '1') {
    setIsChatOpen(true);
    // Bersihkan query param dari URL bar tanpa reload
    history.replaceState(null, '', window.location.pathname);
  }
}, []);

// Listener postMessage dari service worker
// WAJIB menggunakan navigator.serviceWorker, BUKAN window.addEventListener
useEffect(() => {
  if (!('serviceWorker' in navigator)) return;
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'OPEN_ROOM') {
      setIsChatOpen(true);
      // roomId tersedia di event.data.roomId jika perlu navigasi spesifik
    }
  };
  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}, []);
```

> **Catatan sessionStorage:** `useUserChat` selalu memanggil `initChat` saat mount (baris 213–234 `useUserChat.ts`), yang fetch `/api/chat/user-room` terlepas dari sessionStorage. sessionStorage hanya mempercepat render awal. Jadi buka via deep link `?openChat=1` aman — room akan tersedia setelah `initChat` selesai.

Tambahkan `useEffect` di **`MobileLayout` (User):**
```typescript
// Baca URL param openChat=1 → buka chat
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('openChat') === '1') {
    setActiveTab('chats');
    setChatView('ROOM');
    history.replaceState(null, '', window.location.pathname);
  }
}, []);

// Listener postMessage dari service worker
useEffect(() => {
  if (!('serviceWorker' in navigator)) return;
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'OPEN_ROOM') {
      setActiveTab('chats');
      setChatView('ROOM');
    }
  };
  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}, []);
```

#### (c) Tidak ada payload baru di fase ini.

#### (d) Tidak ada kode tricky tambahan — semua sudah di (b).

#### (e) Kriteria selesai Fase 5
- [x] Buka `/user?openChat=1` di tab baru → langsung masuk ke chat room.
- [x] Klik notifikasi (Fase 4 sudah jalan) → tab difokuskan dan chat terbuka.
- [x] postMessage `{type:'OPEN_ROOM'}` dari DevTools console → chat terbuka.
- [x] Parameter `openChat` tanpa nilai atau nilai lain → tidak berpengaruh.

> **Catatan Penyesuaian Realisasi (Fase 5):** Di `WebTabLayout`, state yang digunakan adalah `isChatOpen` / `setIsChatOpen`. Di `MobileLayout`, state navigasi adalah `setActiveTab('chats')` dan `setChatView('ROOM')`. Keduanya membersihkan parameter URL via `history.replaceState(null, '', window.location.pathname)` dan mendengarkan pesan SW via `navigator.serviceWorker.addEventListener('message', ...)`. Di `next.config.ts`, header `/sw.js` digabungkan ke dalam method `headers()` tanpa menimpa konfigurasi yang sudah ada.

#### (f) JANGAN di Fase 5
- Jangan ubah routing/URL app secara fundamental.
- Jangan sentuh AdminWebTabLayout (admin tidak di-push, skip dulu).

---

### Fase 6 — Hook usePushNotifications + Tombol per Role + iOS + Logout

#### (a) File yang dibuat/diubah

| File | Status |
|------|--------|
| `FrontEnd/src/hooks/usePushNotifications.ts` | BARU |
| `FrontEnd/src/components/User/Mobile/components/MobileProfileView.tsx` | DIUBAH |
| `FrontEnd/src/components/User/Web&Tab/components/UserSidebar.tsx` | DIUBAH |
| `FrontEnd/src/components/User/Mobile/MobileLayout.tsx` | DIUBAH (tambah logout unsubscribe) |
| `FrontEnd/src/components/User/Web&Tab/WebTabLayout.tsx` | DIUBAH (tambah logout unsubscribe) |

#### (b) Fungsi/komponen yang ditambah

**`FrontEnd/src/hooks/usePushNotifications.ts`:**
```typescript
export type PushStatus = 'unsupported' | 'denied' | 'granted' | 'default' | 'loading';

export interface UsePushNotificationsReturn {
  status: PushStatus;
  isLoading: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

/**
 * Hook untuk mengelola Web Push subscription.
 * @param token - JWT token user (dari localStorage['user'].token)
 */
export function usePushNotifications(token: string | null): UsePushNotificationsReturn
```

Logika internal hook:
1. Cek `'serviceWorker' in navigator && 'PushManager' in window` → jika tidak ada → `status = 'unsupported'`.
2. Cek `Notification.permission` → set `status` awal.
3. `subscribe()`:
   a. `Notification.requestPermission()` → jika bukan `'granted'` → set `status = 'denied'`, return.
   b. Register SW jika belum: `navigator.serviceWorker.register('/sw.js', { scope: '/' })`.
   c. `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) })`.
   d. `POST ${process.env.NEXT_PUBLIC_API_URL}/push/subscribe` dengan header `headers: { 'Content-Type': 'application/json', Authorization: \`Bearer ${token}\` }` dan body subscription JSON.
   e. Set `status = 'granted'`.
4. `unsubscribe()`:
   a. Ambil existing subscription: `registration.pushManager.getSubscription()`.
   b. `POST ${process.env.NEXT_PUBLIC_API_URL}/push/unsubscribe` dengan header `headers: { 'Content-Type': 'application/json', Authorization: \`Bearer ${token}\` }` dan body `{ endpoint: sub.endpoint }`.
   c. `subscription.unsubscribe()`.
   d. Set `status = 'default'`.

**Tombol di `MobileProfileView.tsx` (User/Mobile):**
```tsx
// Tambahkan di bawah info profil, di atas tombol logout
const { status, isLoading, subscribe, unsubscribe } = usePushNotifications(token);

{status !== 'unsupported' && (
  <button
    onClick={status === 'granted' ? unsubscribe : subscribe}
    disabled={isLoading}
    className="..."
  >
    {status === 'granted' ? '🔔 Notifikasi Aktif (Nonaktifkan)' :
     status === 'denied'  ? '🔕 Izin Ditolak (Ubah di Pengaturan Browser)' :
     status === 'loading' ? 'Memuat...' :
                           '🔔 Aktifkan Notifikasi'}
  </button>
)}

{/* Petunjuk iOS */}
{status === 'unsupported' && /iPhone|iPad|iPod/.test(navigator.userAgent) && (
  <p className="text-xs text-slate-500 text-center">
    Di iPhone/iPad: tap ikon Share → "Add to Home Screen", lalu buka SiRuang dari layar utama.
  </p>
)}
```

**Integrasi logout** di `MobileLayout.tsx` dan `WebTabLayout.tsx`:
Tambahkan di dalam `handleLogout`, **SEBELUM** fetch `/api/logout` dan **SEBELUM** `localStorage.removeItem('user')`:
```typescript
// LANGKAH 1 (PERTAMA): Cabut subscription push sebelum logout
// Urutan ini penting: token masih valid saat unsubscribe dipanggil
try {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        // Gunakan NEXT_PUBLIC_API_URL dan format Authorization sama dengan fetch logout yang ada
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/push/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
    }
  }
} catch (err) {
  console.warn('[Push] Gagal cabut subscription saat logout:', err);
  // Tidak boleh memblokir logout
}

// LANGKAH 2: Baru panggil /api/logout
await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },  // sesuai pola yang sudah ada
});
```
> `token` sudah diambil di awal `handleLogout` dari `JSON.parse(localStorage.getItem('user')).token` — tidak perlu mengubah struktur `handleLogout` yang ada, cukup insert blok push unsubscribe sebelum baris fetch logout.

#### (c) Env variable NEXT_PUBLIC_VAPID_PUBLIC_KEY
Dibaca di hook dengan:
```typescript
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
// Konversi ke Uint8Array:
function urlBase64ToUint8Array(base64String: string): Uint8Array { ... }
```

#### (d) Kode kunci — konversi VAPID key

```typescript
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
```

#### (e) Kriteria selesai Fase 6
- [x] Tombol "Aktifkan notifikasi" muncul di MobileProfileView (user, mobile).
- [x] Tombol muncul di UserSidebar (user, web/tab).
- [x] Admin tidak memiliki tombol ini di manapun.
- [x] Klik tombol → browser meminta izin → subscription tersimpan di DB.
- [x] Status tombol berubah menjadi "Nonaktifkan" setelah berhasil.
- [x] Izin ditolak → tombol menampilkan status "Izin Ditolak".
- [x] Logout → subscription terhapus dari DB dan browser.
- [x] Di iPhone tanpa PWA → muncul petunjuk "Add to Home Screen".

#### (f) JANGAN di Fase 6
- Jangan meminta izin otomatis saat halaman pertama kali dibuka.
- Jangan sentuh file admin.

---

### Fase 7 — Verifikasi Akhir

#### (a) File yang dicek
Semua file yang diubah di Fase 1–6.

#### (b) Perintah verifikasi
```bash
# Dari direktori FrontEnd:
npx tsc --noEmit
npx eslint src/lib/pushRules.ts src/lib/webPush.ts src/lib/sendPush.ts src/hooks/usePushNotifications.ts src/app/api/push/subscribe/route.ts src/app/api/push/unsubscribe/route.ts src/app/api/chat/send/route.ts src/app/api/admin/chat/broadcast/route.ts
```

#### (c) Kriteria selesai Fase 7
- [ ] `tsc --noEmit` tanpa error.
- [ ] eslint pada file yang diubah tanpa error.
- [ ] Semua item di checklist tes manual (§7) lulus.

---

## 5. YANG HARUS DILAKUKAN MANUAL

### A. Generate VAPID Keys
```bash
# Jalankan sekali di terminal lokal:
npx web-push generate-vapid-keys
```
Output contoh:
```
Public Key: BPxxxxxx...
Private Key: xxxxxx...
```

### B. Isi Environment Variables

**`.env.local` (lokal, JANGAN di-commit):**
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public_key_hasil_generate>
VAPID_PRIVATE_KEY=<private_key_hasil_generate>
VAPID_SUBJECT=mailto:<email_anda>
```

**Di Vercel / hosting:**
Tambahkan ketiga env var yang sama di Settings → Environment Variables.

### C. Jalankan SQL di Supabase SQL Editor

**Urutan eksekusi:**
1. Pastikan tabel `authentication` sudah ada (dari `supabase_schema.sql` yang sudah dijalankan sebelumnya).
2. Buka **Supabase Dashboard → SQL Editor**.
3. Paste dan jalankan seluruh isi `push_subscriptions.sql`.
4. Verifikasi dengan query berikut:

```sql
-- Verifikasi tabel terbuat:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'push_subscriptions'
ORDER BY ordinal_position;

-- Verifikasi index ada:
SELECT indexname FROM pg_indexes WHERE tablename = 'push_subscriptions';

-- Verifikasi RLS on (ENABLE, bukan off):
SELECT relname, relrowsecurity
FROM pg_class WHERE relname = 'push_subscriptions';
-- relrowsecurity harus TRUE
```

### D. Install npm packages
```bash
# Dari direktori FrontEnd:
npm install web-push
npm install --save-dev @types/web-push
```

---

## 6. CHECKLIST TES MANUAL

> Lakukan pengujian setelah semua Fase 1–6 selesai.

- [ ] **a.** Aktifkan notifikasi di akun user, dosen, pj_kelas — Chrome desktop dan Android Chrome.
- [ ] **b.** Web ditutup total → admin kirim pesan → notif muncul → klik → web terbuka langsung di chat room.
- [ ] **c.** Web terbuka tapi di background (tab lain di depan) → notif muncul → klik → tab yang sama difokuskan dan chat terbuka, **tanpa tab ganda**.
- [ ] **d.** Penerima sedang di dalam website (tab visible) → **TIDAK ada notif** → pesan muncul lewat Realtime.
- [ ] **e.** Balasan bot AI (`admin_ai`) saat web ditutup → satu notif berlabel "Admin", **tidak dobel**.
- [ ] **f.** Chat antara dosen dan admin dua arah: admin → dosen → notif; dosen → admin → **admin TIDAK notif**.
- [ ] **g.** user/dosen/pj_kelas → admin: admin **TIDAK** dapat notif.
- [ ] **h.** Beberapa pesan beruntun di room yang sama → notif **menumpuk jadi satu** (satu `tag`), dan setiap pesan baru **membunyikan notifikasi lagi** (`renotify: true`).
- [ ] **i.** Klik notif saat sesi habis → diarahkan ke `/login`. Jika Fase 8 selesai: setelah login berhasil, otomatis membuka chat.
- [ ] **i2.** *(Fase 8)* Klik notif saat sesi habis → login → otomatis masuk ke chat room (URL `/user?openChat=1` dipulihkan).
- [ ] **j.** Logout → perangkat itu **tidak lagi menerima notif**; login akun lain di perangkat yang sama tidak menerima notif akun lama.
- [ ] **k.** Izin ditolak → UI menampilkan status "Izin Ditolak" dan tombol tidak aktif; chat tetap normal.
- [ ] **l.** Tab Network (F12) → **tidak ada request polling baru**, pengiriman chat tidak melambat.
- [ ] **m.** iPhone (PWA): Add to Home Screen → ulangi tes b, c, d.

---

## 7. RISIKO & PERTANYAAN TERBUKA

### Risiko

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| **iOS wajib PWA (iOS 16.4+)** | Pengguna iOS tanpa Add to Home Screen tidak menerima notif | Petunjuk UI di profil (Fase 6) |
| **Izin ditolak** | Tidak bisa subscribe | Tampilkan status "Ditolak" + instruksi buka pengaturan browser |
| **Subscription kadaluwarsa (404/410)** | Push gagal | Auto-hapus di `sendPush.ts` (Fase 3) |
| **Serverless function timeout** | Push ke banyak user (broadcast) lambat | `after()` menghindari timeout user, tapi fungsi serverless tetap ada batas ~25–30 detik. Untuk broadcast ke ratusan user, perlu queue/background job di masa depan. |
| **after() di Next.js 16 edge/serverless** | `after()` tidak dijamin di semua runtime | Gunakan try/catch; jika `after` tidak tersedia, fallback ke fire-and-forget Promise biasa. |
| **Bot reply async** | Push bot tidak bisa pakai `after()` (sudah di luar request context) | ✅ **Diputuskan:** `await notifyRecipient()` biasa di blok `.then()` — aman, sudah async background. |
| **Redirect setelah login** | Klik notif saat sesi habis → user harus login manual lalu buka chat lagi | ✅ **Dikerjakan di Fase 8:** simpan URL tujuan di sessionStorage sebelum redirect `/login`. |
| **Enkripsi payload** | Payload push berisi potongan pesan | Payload dienkripsi oleh standar Web Push (VAPID + P256DH). Aman secara default. |
| **Sesi habis tanpa logout** | Subscription lama masih terdaftar | Jika sesi habis tanpa klik logout, subscription lama tetap ada di perangkat sampai akun lain subscribe di perangkat itu atau endpoint kedaluwarsa. |
| **Bot reply di serverless** | Push bot terputus jika container freeze | Jika hosting serverless dan tes bot (e) gagal, bungkus seluruh blok ML di send/route.ts dengan after() (after() boleh dipanggil dari dalam handler selama request masih berjalan). |

### Keputusan & Status Pertanyaan Terbuka

1. **Chat dosen ↔ user:** **TIDAK dikerjakan sekarang** (infrastruktur room belum ada). Fokus HANYA pada jalur yang ada: `admin`/`admin_ai` → `user`/`dosen`/`pj_kelas`. Penerima dengan role `admin` **TIDAK PERNAH** dipush.

2. **Dosen sebagai penerima:** Dosen memiliki room 1-on-1 dengan admin (sama seperti mahasiswa). Push ke dosen saat menerima pesan dari admin/bot sudah tercover.

3. **Broadcast ke banyak user:** Menggunakan batching 1 query subscription dan `Promise.allSettled` per 10 paralel di `notifyBroadcast`.

4. **VAPID_SUBJECT:** **Diisi mandiri oleh developer** di `.env.local` dan dashboard hosting dengan format `mailto:<email>`. Dokumen dan kode hanya mendokumentasikan nama variabel environment saja tanpa mencantumkan alamat email spesifik apa pun.

5. **Redirect setelah login:** **YA**, disepakati untuk dikerjakan sebagai **Fase 8 (opsional)** setelah Fase 1–7 selesai dan teruji.

---

### Fase 8 — Redirect-After-Login (Opsional, setelah Fase 7)

#### (a) File yang dibuat/diubah

| File | Status |
|------|--------|
| `FrontEnd/src/app/user/page.tsx` | DIUBAH (simpan URL tujuan sebelum redirect `/login`) |
| `FrontEnd/src/app/login/page.tsx` | DIUBAH (baca, validasi, redirect, dan hapus URL di `handleLoginSuccess`) |
| `FrontEnd/src/components/Authentication/MainAuth.tsx` | DIUBAH (fallback redirect yang sama jika `onLoginSuccess` tidak disertakan) |

> **PENTING:** `WebTabLayout` dan `MobileLayout` **TIDAK** menyimpan URL tujuan ke `sessionStorage` karena saat unauthenticated (`!storedUser`), `app/user/page.tsx` langsung me-replace router ke `/login` dan tidak pernah me-render kedua layout tersebut.

#### (b) Kode yang ditambahkan/diubah

**1. Di `FrontEnd/src/app/user/page.tsx`** — tepat sebelum baris `router.replace('/login')` (baris 16–17):
```typescript
const storedUser = localStorage.getItem('user');
if (!storedUser) {
  // Simpan URL tujuan ke sessionStorage sebelum redirect ke login
  const params = new URLSearchParams(window.location.search);
  if (params.get('openChat') === '1') {
    sessionStorage.setItem('push_redirect_after_login', '/user?openChat=1');
  }
  router.replace('/login');
  return;
}
```

**2. Di `FrontEnd/src/app/login/page.tsx`** — di dalam fungsi `handleLoginSuccess` (baris 40–46):
```typescript
const handleLoginSuccess = (userData: any) => {
  if (userData.role === 'admin') {
    router.push('/admin');
  } else {
    // Pulihkan URL tujuan tersimpan
    const rawTarget = sessionStorage.getItem('push_redirect_after_login');
    sessionStorage.removeItem('push_redirect_after_login');

    // Validasi keamanan: wajib diawali "/" dan BUKAN "//" (cegah open redirect ke URL eksternal)
    const validTarget = rawTarget && rawTarget.startsWith('/') && !rawTarget.startsWith('//')
      ? rawTarget
      : '/user';

    router.push(validTarget);
  }
};
```

**3. Di `FrontEnd/src/components/Authentication/MainAuth.tsx`** — di dalam `handleLogin` (baris 76–82, fallback redirect jika `onLoginSuccess` tidak ada):
```typescript
} else {
  if (data.role === 'admin') {
    router.push('/admin');
  } else {
    const rawTarget = sessionStorage.getItem('push_redirect_after_login');
    sessionStorage.removeItem('push_redirect_after_login');
    const validTarget = rawTarget && rawTarget.startsWith('/') && !rawTarget.startsWith('//')
      ? rawTarget
      : '/user';
    router.push(validTarget);
  }
}
```

#### (c) Kriteria selesai Fase 8
- [ ] Klik notif saat sesi habis → URL `/user?openChat=1` disimpan ke `sessionStorage['push_redirect_after_login']` oleh `app/user/page.tsx`.
- [ ] Pengguna diarahkan ke `/login`.
- [ ] Setelah login berhasil via `handleLoginSuccess`, router diarahkan ke `/user?openChat=1` dan room chat otomatis terbuka.
- [ ] URL target eksternal/malicious (misal `//evil.com`) diabaikan dan fallback ke `/user`.
- [ ] `sessionStorage.getItem('push_redirect_after_login')` bernilai `null` setelah redirect dilakukan.
- [ ] Login biasa (tanpa notif) tetap redirect ke `/user` atau `/admin` seperti semula.

#### (d) JANGAN di Fase 8
- Jangan menyimpan `push_redirect_after_login` di dalam `WebTabLayout` atau `MobileLayout`.
- Jangan ubah alur logout atau auth token verification.
- Jangan sentuh file API route.

---

## 9. LANGKAH BERIKUTNYA

Status: **Fase 1, Fase 2, Fase 3, Fase 4, Fase 5, dan Fase 6 telah selesai.**
Langkah berikutnya: **Fase 7 — Verifikasi Akhir (Testing Manual & Lint/Build)**
1. Jalankan migrasi `push_subscriptions.sql` di Supabase SQL Editor.
2. Tambahkan env VAPID (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) di `.env.local` dan hosting.
3. Lakukan pengujian manual skenario push notifikasi (desktop & mobile).
4. (Opsional) Kerjakan Fase 8 (Redirect-after-login) bila diperlukan.
