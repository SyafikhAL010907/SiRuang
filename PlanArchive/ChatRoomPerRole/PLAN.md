# PLAN — Chat Room Per Role (Revisi 3)
**File:** `PlanArchive/ChatRoomPerRole/PLAN.md`
**Dibuat:** 2026-11-22 | **Diperbarui:** 2026-11-22
**Status:** Dokumentasi perencanaan — JANGAN ubah kode / jalankan SQL sebelum konfirmasi final

---

## Daftar Isi
1. [Kondisi Nyata Saat Ini](#1-kondisi-nyata-saat-ini)
2. [Bukti Duplikasi Room (Data Produksi)](#2-bukti-duplikasi-room-data-produksi)
3. [Akar Masalah B — Bug Preview Pesan Terakhir](#3-akar-masalah-b--bug-preview-pesan-terakhir)
4. [Desain Solusi A — Room Per Role](#4-desain-solusi-a--room-per-role)
5. [Desain Solusi B — Perbaikan Preview](#5-desain-solusi-b--perbaikan-preview)
6. [Masa Transisi Format `dosen:NIP:NIM`](#6-masa-transisi-format-dosenipnim)
7. [Analisis Skala](#7-analisis-skala)
8. [Fase Implementasi](#8-fase-implementasi)
9. [Daftar File yang Diubah](#9-daftar-file-yang-diubah)
10. [Risiko dan Rollback](#10-risiko-dan-rollback)
11. [Asumsi / Perlu Konfirmasi](#11-asumsi--perlu-konfirmasi)
12. [Ringkasan](#12-ringkasan)

---

## 1. Kondisi Nyata Saat Ini

### 1.1 State Database
- **SQL-1**: Sudah dijalankan. Enum `user_role` punya: `admin, user, dosen, pj_kelas, admin_sfd, admin_le, admin_ls`.
- **SQL-2**: **BELUM** dijalankan. Nilai `admin_dev` belum ada di enum.
- **Kolom baru** (`room_type`, `participant_b_identifier`, `participant_b_role`, `created_by`): **BELUM ada** di tabel `chat_rooms`.
- **Tabel `admin_gedung_mapping`**: Sudah ada dari SQL-1, kolom `admin_id` (FK → `authentication.id`) dan `gedung_kode` (VARCHAR(20)). Hanya SFD yang di-seed aktif.
- Semua kode filter role **wajib** menggunakan `role::text` atau whitelist string untuk mencegah error Postgres sebelum SQL-2 dijalankan.

### 1.2 Struktur Tabel Saat Ini (Skema Nyata)

```sql
-- chat_rooms (kondisi sekarang — dikonfirmasi dari kode Go dan Next.js)
id                BIGINT    PRIMARY KEY
user_identifier   TEXT      -- NIM user, NIP dosen, atau format 'dosen:NIP:NIM'
room_name         TEXT      -- nullable, jarang dipakai
last_message      TEXT      -- preview pesan terakhir
is_marked_unread  BOOLEAN   -- ditandai belum dibaca oleh admin
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ

-- chat_messages (skema nyata — dikonfirmasi dari chat.go baris 99, send/route.ts baris 24-31)
id                BIGINT    PRIMARY KEY
room_id           BIGINT    REFERENCES chat_rooms(id)
sender_identifier TEXT      -- (BUKAN sender_id — dikonfirmasi dari models/chat.go baris 21)
message           TEXT
message_type      TEXT      -- 'text', 'image', 'file', 'multi_file'
is_read           BOOLEAN   -- Supabase: true/false. Go memakai 0/1 (integer cast)
                            -- (chat.go baris 25: is_read = 0, baris 212: is_read = 1)
created_at        TIMESTAMPTZ

-- admin_gedung_mapping (dari SQL-1, sudah ada)
id          SERIAL    PRIMARY KEY
admin_id    INT4      NOT NULL REFERENCES authentication(id) ON DELETE CASCADE
gedung_kode VARCHAR(20) NOT NULL
created_at  TIMESTAMPTZ DEFAULT NOW()
CONSTRAINT uq_admin_gedung UNIQUE (admin_id, gedung_kode)
-- Index: idx_admin_gedung_mapping_admin_id, idx_admin_gedung_mapping_gedung_kode

-- v_user_profiles (VIEW — join authentication + profiles)
-- Kolom: user_id, username, full_name, email, identifier, role, avatar_url
-- Dipakai luas: admin/chat/rooms/route.ts, dosen-room/route.ts, bookingApprovalHelper.ts, dsb.
```

### 1.3 Data Produksi
| Room ID | user_identifier | last_message | Catatan |
|---------|----------------|-------------|---------|
| 34 | 1512625039 | (ada pesan) | Room utama PJ ini, ada chat_messages |
| 35 | dosen:197805152005011002:1512625039 | 'ajn' | Format lama PJ-Dosen |
| 37 | 1512625039 | null | **DUPLIKAT** — kosong |
| 42 | 1512625039 | null | **DUPLIKAT** — kosong |
| (1 lain) | — | — | Room polos lainnya |

> Total: 5 room (1 format `dosen:`, 4 polos). User `1512625039` punya 3 room polos (1 aktif + 2 duplikat).

### 1.4 Tabel Relasi PJ-Dosen

**Tabel yang digunakan:** `course_relations`

**Bukti dari kode:**
- [`dosen-room/route.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/FrontEnd/src/app/api/chat/dosen-room/route.ts#L29-L33) baris 29–33 (sisi PJ):
  ```typescript
  .from('course_relations')
  .select('id, dosen_id, pj_id, mata_kuliah, kelas, jadwal_hari, jadwal_jam')
  .eq('pj_id', dbUser.id)
  .eq('is_active', true)
  ```
- [`dosen-room/route.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/FrontEnd/src/app/api/chat/dosen-room/route.ts#L124-L128) baris 124–128 (sisi Dosen):
  ```typescript
  .from('course_relations')
  .select('id, dosen_id, pj_id, mata_kuliah, kelas')
  .eq('dosen_id', dbUser.id)
  .eq('is_active', true)
  ```
- [`relations/route.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/FrontEnd/src/app/api/admin/relations/route.ts#L24) baris 24

**Index yang dikonfirmasi** (`pg_indexes`):
- `uq_course_relations` UNIQUE `(dosen_id, pj_id, mata_kuliah, semester)` — satu pasangan bisa punya **banyak baris** (beda matkul/semester).
- `course_relations_pkey` — PK.
- **Sisi dosen (dosen_id leading)**: sudah efisien via `uq_course_relations`.
- **Sisi PJ (pj_id leading)**: **BELUM ada** → ditambahkan di SQL.sql Blok 1b:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_course_relations_pj ON public.course_relations (pj_id);
  ```

**Konsekuensi untuk desain:**
- Backfill dan auto-create room PJ-Dosen **WAJIB** memakai `DISTINCT (pj_id, dosen_id)`, bukan iterasi per baris `course_relations`.
- Satu dosen dengan 2 matkul ke PJ yang sama → tetap satu room.
- Label di UI menampilkan daftar matkul gabungan secara dinamis (query agregasi `STRING_AGG`).

### 1.5 Visibilitas AdminDev

**Dikonfirmasi dari kode** ([`admin/chat/rooms/route.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/FrontEnd/src/app/api/admin/chat/rooms/route.ts#L254-L263)):
- AdminDev (role 'admin' / 'admin_dev') melihat **SEMUA room** kecuali room dengan format `dosen:` di `user_identifier` (baris 262: `.not('user_identifier', 'like', 'dosen:%')`).
- Room PJ-Dosen privat **TIDAK terlihat** oleh AdminDev.
- **Keputusan:** Perilaku ini dipertahankan. Setelah migrasi ke model baru, filter diganti menjadi `room_type != 'pj_to_dosen'`.

### 1.6 Alur Pembuatan Room Saat Ini

**Go Backend** ([`chat.go`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/BackEnd/internal/handlers/chat.go#L54-L93)):
- Fungsi `GetOrCreateRoom` (baris 66–90): SELECT dulu, jika tidak ada baru INSERT — **tanpa atomic upsert**.
- `BroadcastMessage` (baris 340–344): pola yang sama, SELECT room → INSERT jika tidak ada → INSERT pesan.

**Next.js API Routes:**
- [`user-room/route.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/FrontEnd/src/app/api/chat/user-room/route.ts#L19-L40) baris 19–40: `.maybeSingle()` lalu `.insert()` — tanpa ON CONFLICT.
- [`dosen-room/route.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/FrontEnd/src/app/api/chat/dosen-room/route.ts#L63-L93) baris 63–93: **BUG copy-paste** — dua blok `.insert()` identik berurutan (baris 69–79 lalu 82–93).

**Bug tambahan di `dosen-room/route.ts`:** Room dibuat PER BARIS `course_relations` (baris 56: `for (const rel of relations)`), bukan per pasangan DISTINCT. Jika satu dosen mengampu 2 matkul dengan PJ yang sama, loop berjalan 2× tapi `roomKey` identik → `.maybeSingle()` menemukan room yang sama pada iterasi kedua → tidak membuat duplikat di DB, tapi **menduplikasi entry di response `dosenRooms`** (baris 104–116) dengan `mata_kuliah` berbeda. Fix: gunakan DISTINCT pasangan dan gabungkan matkul.

### 1.7 Branch Git Aktif
Branch: `feat/add-role-refac-admin-gedung`

---

## 2. Bukti Duplikasi Room (Data Produksi)

### 2.1 Fakta
User `1512625039` memiliki 3 room dengan `user_identifier` yang sama:
- **id=34**: ada `chat_messages` → room yang valid
- **id=37**: kosong (`last_message = null`, tidak ada pesan) → duplikat
- **id=42**: kosong (`last_message = null`, tidak ada pesan) → duplikat

### 2.2 Akar Penyebab: Race Condition + Tidak Ada UNIQUE Constraint

**Jalur 1 — Go `GetOrCreateRoom`** ([`chat.go`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/BackEnd/internal/handlers/chat.go#L66-L90) baris 66–90):
```
SELECT room WHERE user_identifier = X
  ↓ (tidak ada hasil)
INSERT room WHERE user_identifier = X
```
Dua goroutine/request paralel yang sama-sama SELECT pada waktu yang hampir bersamaan, keduanya mendapat "tidak ada", lalu keduanya INSERT → 2 room tercipta.

**Jalur 2 — `user-room/route.ts`** ([baris 19–40](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/FrontEnd/src/app/api/chat/user-room/route.ts#L19-L40)):
```
.maybeSingle()  → null
.insert({user_identifier: X})
```
Pola identik. Tanpa `ON CONFLICT`, dua request paralel → 2 insert berhasil.

**Jalur 3 — `dosen-room/route.ts`** ([baris 63–93](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/FrontEnd/src/app/api/chat/dosen-room/route.ts#L63-L93)):
Copy-paste bug: dua blok `.insert()` identik dijalankan berurutan dalam satu request (baris 69–79 lalu 82–93 persis sama). Jika insert pertama berhasil dan belum commit saat insert kedua jalan, ada potensi duplikat.

**Jalur 4 — PJKelas WebTabLayout** (`FrontEnd/src/components/PJKelas/Web&Tab/WebTabLayout.tsx`):
`loadDosenRooms()` dipanggil saat mount tanpa debounce. React Strict Mode (development) atau re-render ganda saat mount → dua API call ke `dosen-room` → dua room tercipta.

### 2.3 Pencegahan (Design Fix)

**Database: Fungsi SQL atomik** (SQL.sql Blok 7e `get_or_create_room`):
```sql
INSERT INTO chat_rooms (...) VALUES (...)
ON CONFLICT (user_identifier, participant_b_identifier) DO NOTHING
RETURNING id;
-- Jika RETURNING kosong → SELECT existing room.
```
Unique index NON-partial `uq_rooms_pair ON (user_identifier, participant_b_identifier)` mendukung `ON CONFLICT`.

**Go Backend:** Panggil `SELECT get_or_create_room(...)` alih-alih SELECT+INSERT manual.

**Next.js API Routes:** Gunakan Supabase `.rpc('get_or_create_room', {...})` atau `.upsert()` dengan `onConflict`.

**Hook Frontend:** Guard `hasCreatedRoom.current = useRef(false)` agar tidak memanggil create lebih dari sekali per sesi.

**Deduplication SQL** (Blok 2 di SQL.sql): lihat bagian SQL.sql untuk detail.

---

## 3. Akar Masalah B — Bug Preview Pesan Terakhir

### 3.1 Gejala
Di daftar room (sidebar web PJ Kelas), dua room berbeda menampilkan preview pesan yang sama (misal "gg"), padahal isi percakapan berbeda. Saat pesan dikirim di satu room, preview di room lain ikut berubah. Data produksi: room id=35 `last_message = 'ajn'` di DB, tapi UI menampilkan "gg" di dua room.

### 3.2 Akar Masalah Utama — TERBUKTI dari Kode

**File:** [`WebTabLayout.tsx`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/FrontEnd/src/components/PJKelas/Web%26Tab/WebTabLayout.tsx)

**Baris 233:**
```typescript
const lastMessage = chat.messages.length > 0
  ? chat.messages[chat.messages.length - 1]
  : null;
```

**Baris ~249:**
```typescript
<UserSidebar
  ...
  lastMessage={lastMessage}
  ...
/>
```

**Masalah:**
- `chat.messages` adalah state **satu array** dari hook `useUserChat` — hanya berisi pesan dari **room yang sedang aktif terbuka**.
- `lastMessage` ini dikirim ke `UserSidebar` sebagai **prop tunggal**.
- `UserSidebar` menampilkan `lastMessage` ini sebagai preview di **semua room** di sidebar — padahal seharusnya tiap room memiliki preview sendiri dari `room.last_message` yang dikembalikan API.

**Dampak:** Ketika user membuka Room A, preview di sidebar untuk Room A = benar. Tapi preview Room B di sidebar juga menampilkan pesan terakhir Room A (dari `chat.messages`). Ketika user berpindah ke Room B, `chat.setMessages([])` dipanggil (baris 119, 128) → preview sesaat kosong → terisi pesan Room B.

### 3.3 Perilaku Mobile — TIDAK Ada Bug

**File:** [`PJKelas MobileChatListView.tsx`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/FrontEnd/src/components/PJKelas/Mobile/components/MobileChatListView.tsx) baris 181:
```typescript
{room.last_message}
```

**File:** [`Dosen MobileChatListView.tsx`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/FrontEnd/src/components/Dosen/Mobile/components/MobileChatListView.tsx) baris 141–145:
```typescript
{room.last_message}
```

Keduanya membaca `last_message` **per room dari respons API** — tidak ada bug di mobile.

### 3.4 Masalah Sekunder: `last_message` di DB Tidak Akurat

Data produksi: room id=35 `last_message = 'ajn'` di DB, tapi pesan terakhir sebenarnya mungkin berbeda. Penyebab:
- Kode [`send/route.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/FrontEnd/src/app/api/chat/send/route.ts#L48-L57) baris 48–57 memperbarui `last_message` dengan `.eq('id', roomId)` — ini benar, terarah ke room spesifik.
- Tapi jika ada duplikat room (user punya room id=34, 37, 42), pesan mungkin masuk ke room yang berbeda dari yang ditampilkan → preview salah.

### 3.5 Pemisahan Perbaikan

| Masalah | Diselesaikan Oleh | Otomatis / Perlu Kode |
|---------|-----------------|----------------------|
| DB `last_message` tidak akurat | SQL Blok 3 (recalculate) | Otomatis setelah SQL |
| DB `last_message` salah room (dari duplikat) | SQL Blok 2 (dedup) + Blok 3 | Otomatis setelah SQL |
| **Web sidebar preview salah** (bug utama) | **Perbaikan kode WebTabLayout.tsx** | **Perlu kode** |
| Duplikat entry di response `dosen-room` | Perbaikan kode dosen-room/route.ts (DISTINCT) | **Perlu kode** |
| Mobile preview | Sudah benar, tidak perlu perbaikan | — |

### 3.6 Rencana Verifikasi Bug Fix

Setelah perbaikan kode WebTabLayout.tsx:
1. Buka sidebar web PJ Kelas dengan ≥ 2 room (misal room AdminDev + room Dosen).
2. Kirim pesan di room AdminDev → verifikasi preview di room AdminDev berubah, preview room Dosen **TIDAK berubah**.
3. Pindah ke room Dosen → verifikasi preview room AdminDev tetap menampilkan pesan terakhir yang benar.
4. Mobile: sudah benar, cukup verifikasi regresi.

---

## 4. Desain Solusi A — Room Per Role

### 4.1 Kolom Baru di `chat_rooms`

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `room_type` | TEXT NOT NULL DEFAULT 'user_to_admin' | Jenis pasangan room, CHECK constraint |
| `participant_b_identifier` | VARCHAR(50) NOT NULL | Identifier (NIM/NIP) lawan bicara sisi B — dari `authentication.identifier`. **NOT NULL** setelah Blok 7c-2 (semua INSERT wajib mengisi). |
| `participant_b_role` | TEXT | Role sisi B: 'admin', 'admin_dev', 'dosen', 'admin_sfd', 'admin_le', 'admin_ls' |
| `created_by` | VARCHAR(50) | Identifier pembuat room — NULL untuk room lama |

> **Penting:** `participant_b_identifier` untuk admin gedung adalah `authentication.identifier` (NIP/identifier), **BUKAN** `username`.

### 4.2 Nilai `room_type`

| Nilai | Siapa Membuat | Siapa Terlibat | Arah Baku |
|-------|-------------|--------------|-----------|
| `'user_to_admin'` | user/pj/dosen/AdminDev | user ↔ AdminDev | user = sisi A, AdminDev = sisi B |
| `'pj_to_dosen'` | Sistem (auto-create dari course_relations) | PJ ↔ Dosen | NIM_PJ = sisi A, NIP_Dosen = sisi B |
| `'user_to_building_admin'` | user/pj/dosen/AdminDev via search | user ↔ Admin Gedung | user = sisi A, admin gedung = sisi B |

CHECK constraint di DB:
```sql
CHECK (room_type IN ('user_to_admin','pj_to_dosen','user_to_building_admin'))
```

### 4.3 Aturan Room Per Role

> **Pencegahan self-room:** Blok 5 dan Blok 8 di SQL.sql menyaring `user_identifier != identifier_AdminDev` agar tidak membuat room di mana AdminDev bicara dengan dirinya sendiri. Fungsi `get_or_create_room` juga menolak `p_user_identifier = p_participant_b` (RAISE EXCEPTION).

#### PJ Kelas
- **Room AdminDev** (`user_to_admin`): otomatis ada satu, `participant_b_identifier = identifier_AdminDev`.
- **Room Dosen** (`pj_to_dosen`): satu per pasangan DISTINCT (PJ, Dosen) di `course_relations`. Auto-create dari backfill + saat relasi baru dibuat. `user_identifier = NIM_PJ`, `participant_b_identifier = NIP_Dosen`. Satu dosen yang mengampu ≥2 matkul dengan PJ yang sama → tetap satu room.
- **Room Admin Gedung** (`user_to_building_admin`): muncul di daftar **hanya setelah PJ memulai chat via search**.

#### Dosen
- **Room AdminDev** (`user_to_admin`): satu, otomatis ada.
- **Room PJ** (`pj_to_dosen`): dosen mengakses room yang SAMA dengan PJ (bukan membuat room baru). Query: `participant_b_identifier = NIP_Dosen AND room_type = 'pj_to_dosen'`. Dosen dengan N PJ berelasi → N room.
- **Room Admin Gedung** (`user_to_building_admin`): via search, dosen yang memulai. `created_by = NIP_Dosen`.

#### User Biasa
- **Room AdminDev** (`user_to_admin`): satu, otomatis ada.
- **Room Admin Gedung** (`user_to_building_admin`): via search.
- **TIDAK boleh** membuat room ke dosen. Validasi di backend.

#### AdminDev (role 'admin' / 'admin_dev')
- **Daftar room**: melihat semua room **kecuali** `room_type = 'pj_to_dosen'` (perilaku saat ini dipertahankan).
- **Search & inisiasi**: AdminDev bisa **memulai chat dengan SIAPA PUN** (user, PJ, dosen, admin gedung) via search semua akun. Jika room sudah ada → langsung buka. Jika belum → buat room baru.
- **Arah baku saat AdminDev memulai**: target non-AdminDev di sisi A (`user_identifier`), AdminDev di sisi B (`participant_b_identifier`). Contoh: AdminDev chat dengan dosen → `user_identifier = NIP_Dosen`, `participant_b_identifier = NIP_AdminDev`, `room_type = 'user_to_admin'`, `created_by = NIP_AdminDev`. AdminDev chat admin gedung → `user_identifier = identifier_AG`, `participant_b_identifier = NIP_AdminDev`, `room_type = 'user_to_building_admin'`.
- **Tidak membuat room arah terbalik/duplikat**: fungsi `get_or_create_room` selalu menempatkan non-AdminDev di sisi A, AdminDev di sisi B → ON CONFLICT mencegah duplikat.

#### Admin Gedung (admin_sfd / admin_le / admin_ls)
- Melihat room yang ditujukan kepadanya (`participant_b_identifier = identifier_admin_gedung`).
- Boleh membalas: user, PJ, dosen (hanya jika `created_by` = identifier dosen), AdminDev.
- **TIDAK boleh** membuat room ke dosen. Backend menolak jika `actor_role = admin_gedung` dan `target_role = dosen`.
- Room lama dengan `created_by = NULL`: admin gedung boleh mengakses tanpa pembatasan inisiator.

### 4.4 Arah Baku Room PJ-Dosen (Satu Pasangan = Satu Room)

```
user_identifier          = NIM PJ    (selalu sisi A)
participant_b_identifier = NIP Dosen (selalu sisi B)
room_type                = 'pj_to_dosen'
created_by               = NIM PJ    (via backfill/auto-create)
```

Satu dosen mengampu ≥2 matkul dengan PJ yang sama → **tetap satu room**. Label di UI menampilkan daftar matkul gabungan secara dinamis:
```sql
-- Query label matkul per pasangan (PJ melihat daftar room dosen):
SELECT
  cr.id AS room_id,
  cr.participant_b_identifier AS nip_dosen,
  v.full_name AS dosen_name,
  v.avatar_url,
  STRING_AGG(DISTINCT crel.mata_kuliah, ', ' ORDER BY crel.mata_kuliah) AS matkul_gabungan,
  STRING_AGG(DISTINCT crel.kelas, ', ' ORDER BY crel.kelas) AS kelas_gabungan,
  cr.last_message,
  cr.updated_at
FROM chat_rooms cr
JOIN v_user_profiles v ON v.identifier = cr.participant_b_identifier
LEFT JOIN course_relations crel
  ON crel.pj_id = (SELECT id FROM authentication WHERE identifier = cr.user_identifier)
  AND crel.dosen_id = v.user_id
  AND crel.is_active = TRUE
WHERE cr.user_identifier = $NIM_PJ
  AND cr.room_type = 'pj_to_dosen'
GROUP BY cr.id, cr.participant_b_identifier, v.full_name, v.avatar_url,
         cr.last_message, cr.updated_at
ORDER BY cr.updated_at DESC;
```

> **Dampak jika relasi dihapus/dinonaktifkan:** Room PJ-Dosen **tetap ada** (riwayat chat aman). `LEFT JOIN course_relations` mengembalikan `matkul_gabungan = NULL` → UI menampilkan room tanpa label matkul. User tetap bisa baca riwayat lama.

**Unique constraint** (mencegah duplikat per pasangan):
```sql
-- NON-PARTIAL (tanpa WHERE) agar ON CONFLICT bisa memanfaatkannya
CREATE UNIQUE INDEX uq_rooms_pair
  ON chat_rooms (user_identifier, participant_b_identifier);
```

### 4.5 Validasi Backend — Tabel Kombinasi dan Fungsi SQL

Semua validasi akses dijalankan di dalam fungsi SQL `get_or_create_room` (SECURITY DEFINER). Go backend dan Next.js API routes memanggil fungsi ini via `SELECT * FROM get_or_create_room(...)` — aturan **tidak bisa dilewati** dari sisi client.

**Tabel kombinasi yang diizinkan:**

| # | Sisi A (`user_identifier`) | Sisi B (`participant_b`) | `room_type` | Siapa Boleh Memulai | Validasi di Fungsi |
|---|---------------------------|--------------------------|-------------|---------------------|--------------------|
| 1 | user biasa | AdminDev | `user_to_admin` | user, AdminDev | ✅ Izinkan |
| 2 | PJ Kelas | AdminDev | `user_to_admin` | PJ, AdminDev | ✅ Izinkan |
| 3 | Dosen | AdminDev | `user_to_admin` | Dosen, AdminDev | ✅ Izinkan |
| 4 | Admin Gedung | AdminDev | `user_to_building_admin` | Admin Gedung, AdminDev | ✅ Izinkan |
| 5 | PJ Kelas | Dosen | `pj_to_dosen` | Sistem (auto-create) | ✅ role_a=pj_kelas, role_b=dosen |
| 6 | user biasa | Admin Gedung | `user_to_building_admin` | user via search | ✅ Izinkan |
| 7 | PJ Kelas | Admin Gedung | `user_to_building_admin` | PJ via search | ✅ Izinkan |
| 8 | Dosen | Admin Gedung | `user_to_building_admin` | Dosen via search | ✅ created_by=NIP_Dosen |

**Kombinasi yang DITOLAK (RAISE EXCEPTION):**

| # | Sisi A | Sisi B | Alasan | Exception |
|---|--------|--------|--------|-----------|
| ❌1 | user biasa | Dosen | User tidak boleh chat dosen langsung | `User biasa tidak boleh membuat room dengan dosen` |
| ❌2 | Admin Gedung | Dosen (inisiasi) | Admin gedung tidak boleh memulai ke dosen | `Admin gedung tidak boleh memulai room ke dosen` |
| ❌3 | AdminDev | siapa pun (di sisi A) | AdminDev harus selalu di sisi B | `AdminDev harus di sisi B` |
| ❌4 | siapa pun | siapa pun (sama) | Self-room | `Self-room tidak diizinkan` |
| ❌5 | non-PJ | Dosen (`pj_to_dosen`) | room_type pj_to_dosen hanya PJ→Dosen | `room_type pj_to_dosen hanya untuk PJ ke Dosen` |

> **Catatan keamanan:** Fungsi `get_or_create_room` bersifat `SECURITY DEFINER` dan hanya di-GRANT ke `service_role`. Artinya hanya bisa dipanggil dari server-side (Go backend / Next.js API menggunakan Supabase service_role key). Client browser (anon/authenticated) **tidak bisa** memanggil fungsi ini langsung.

### 4.6 Search

**Keamanan RPC:** Semua fungsi search (`search_building_admins`, `search_all_users`) dan fungsi lainnya (`get_or_create_room`, `get_room_unread_counts_for_viewer`) adalah `SECURITY DEFINER` — berjalan dengan hak pemilik (superuser). Untuk mencegah penyalahgunaan dari client browser:
- **REVOKE** dari `PUBLIC`, `anon`, `authenticated`
- **GRANT** hanya ke `service_role`

Alasan: jika `anon`/`authenticated` bisa memanggil `search_all_users`, siapa pun bisa mengambil daftar akun. Dengan pembatasan ke `service_role`, hanya kode server (Go/Next.js yang menggunakan Supabase service_role key) yang bisa memanggil.

**Search Admin Gedung** (untuk user, PJ, dosen) — RPC `search_building_admins(query)`:
```
Sumber: v_user_profiles LEFT JOIN admin_gedung_mapping(admin_id, gedung_kode)
Filter role: role::text IN ('admin_sfd', 'admin_le', 'admin_ls') — whitelist, aman sebelum SQL-2.
Cocokkan: full_name, username, role::text, gedung_kode.
Keyword: "LS", "LE", "SFD", "admin gedung", nama, username.
Output: user_id, full_name, username, identifier, role, avatar_url, gedung_kode.
Tidak tampilkan: password, email.
participant_b_identifier = identifier (dari authentication), BUKAN username.
```

**Search Semua Akun** (untuk AdminDev saja) — RPC `search_all_users(query, exclude_identifier)`:
```
Sumber: v_user_profiles LEFT JOIN admin_gedung_mapping.
Cocokkan: full_name, username, identifier, role::text, gedung_kode.
Exclude: identifier AdminDev sendiri.
Output: sama dengan di atas.
```

---

## 5. Desain Solusi B — Perbaikan Preview

### 5.1 Perbaikan Kode (WebTabLayout.tsx)

**Sebelum (buggy):**
```typescript
// Baris 233 — WebTabLayout.tsx
const lastMessage = chat.messages.length > 0
  ? chat.messages[chat.messages.length - 1] : null;

// Baris ~249
<UserSidebar lastMessage={lastMessage} ... />
```

**Sesudah (fix):**
- Hapus komputasi `lastMessage` tunggal dari `chat.messages`.
- Teruskan `rooms` (array dari `dosenRooms` + `adminRoom`) ke `UserSidebar`.
- `UserSidebar` membaca `room.last_message` per room dari array tersebut.
- Saat pesan baru masuk via realtime, panggil `fetchRooms()` untuk refresh `last_message` dari DB, ATAU update state `rooms` secara optimistik.
- Mobile tidak terpengaruh (sudah benar).

### 5.2 Perbaikan DB `last_message` (SQL Blok 3)

Hitung ulang `last_message` dari `chat_messages` terbaru per room.

Format preview sesuai [`send/route.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/FrontEnd/src/app/api/chat/send/route.ts#L38-L46) baris 38–46:
- `message_type = 'text'`: simpan teks apa adanya
- `message_type = 'image'`: simpan `'🖼️ Gambar'`
- `message_type = 'file'`: simpan `'📄 Dokumen'`
- `message_type = 'multi_file'`: simpan `'📎 Lampiran File'`

Dan [`chat.go`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/BackEnd/internal/handlers/chat.go#L362-L364) baris 362–364 (BroadcastMessage): `'🖼️ Gambar'`, `'📄 Dokumen'`.

---

## 6. Masa Transisi Format `dosen:NIP:NIM`

### 6.1 Code Locations yang Membaca Format `dosen:`

| File | Baris | Fungsi |
|------|-------|--------|
| [`dosen-room/route.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/FrontEnd/src/app/api/chat/dosen-room/route.ts#L60-L80) | 60–80, 148–168 | Membuat roomKey `dosen:NIP:NIM`, query `.eq('user_identifier', roomKey)` |
| [`admin/chat/rooms/route.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/FrontEnd/src/app/api/admin/chat/rooms/route.ts#L182-L263) | 182, 262 | Filter `.not('user_identifier', 'like', 'dosen:%')` |
| [`sendPush.ts`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/FrontEnd/src/lib/sendPush.ts) | 146–158 | `room.user_identifier.startsWith('dosen:')` |
| [`chat.go`](file:///c:/Project%20Coding%20Syafikh/Project%20Production/SiRuang/BackEnd/internal/handlers/chat.go#L299-L342) | 299, 342 | Query `SELECT user_identifier FROM chat_rooms` (broadcast) |

### 6.2 Urutan Deploy (Wajib Diikuti)

```
1. SEKARANG: Jalankan SQL Blok 0–3, 1b (diagnosa, backup, dedup, fix last_message, index pj_id)
              ↓
2. KODE: Update semua 4 lokasi agar membaca KEDUA format:
         - Format lama: user_identifier LIKE 'dosen:NIP:NIM'
         - Format baru: room_type = 'pj_to_dosen', participant_b_identifier = NIP
              ↓
3. DEPLOY kode dual-format ke produksi dan verifikasi room lama masih bisa dibaca
              ↓
4. JALANKAN SQL-2, lalu SQL Blok 4–10 (kolom baru, migrasi, unique index, fungsi atomik, backfill, RPC)
              ↓
5. KODE: Hapus dukungan format lama (hanya baca room_type = 'pj_to_dosen')
```

### 6.3 Realtime Selama Transisi

Realtime subscribe ke `room_id` spesifik — tidak terpengaruh format `user_identifier`. Room lama (id=35) tetap aktif via `room_id=35`. Tidak ada perubahan realtime yang diperlukan selama masa transisi.

---

## 7. Analisis Skala

### 7.1 Jumlah Room Per User

| Role | Jumlah Room |
|------|------------|
| User biasa | 1 (AdminDev) + M admin gedung yang pernah dichat |
| PJ Kelas | 1 (AdminDev) + K (dosen berelasi, DISTINCT) + M (admin gedung) |
| Dosen | 1 (AdminDev) + P (PJ berelasi, DISTINCT) + M (admin gedung) |
| AdminDev | Semua room non-pj_to_dosen (puluhan–ratusan) |
| Admin Gedung | Semua room yang ditujukan kepadanya |

### 7.2 Jumlah Realtime Channel Per User

| Skenario | Channel |
|----------|---------|
| User biasa | 1–4 |
| PJ dengan 5 dosen | 6–9 |
| Dosen dengan 10 PJ | 11–14 |
| Dosen dengan 30+ PJ | 31+ ⚠️ |

**Rekomendasi untuk N > 10:** Ganti per-room channel dengan **satu channel unfiltered** + filter client-side.

### 7.3 Query Performance

Setelah migrasi, semua query daftar room menggunakan **index**:
- `WHERE participant_b_identifier = $NIP` → `idx_rooms_participant_b`
- `WHERE room_type = 'pj_to_dosen'` → `idx_rooms_room_type`
- `WHERE (user_identifier, participant_b_identifier) = ...` → `uq_rooms_pair` atau `idx_rooms_pair`
- `course_relations` sisi PJ → **`idx_course_relations_pj`** (Blok 1b, SEKARANG)
- `course_relations` sisi dosen → `uq_course_relations` (leading column = dosen_id)

Label matkul gabungan: query `STRING_AGG` di `course_relations` per pasangan, dioptimalkan oleh index `pj_id` dan `uq_course_relations`.

### 7.4 Uji Skala

| Skenario | Dosen | PJ per dosen (DISTINCT) | Room `pj_to_dosen` | Channel realtime |
|----------|-------|------------------------|--------------------|-----------------|
| Kecil | 10 | 5 | 50 | ≤ 10/dosen |
| Sedang | 50 | 10 | 500 | 11/dosen, single-channel disarankan |
| Besar | 200 | 15 | 3.000 | wajib single-channel |

---

## 8. Fase Implementasi

| Fase | Pekerjaan | Prasyarat | Paralel? |
|------|-----------|-----------|---------|
| **F0** | Backup produksi (manual Supabase) | — | — |
| **F1** | SQL Blok 0: Diagnosa (SELECT only) | F0 | ✅ |
| **F2** | SQL Blok 1: Backup bertanggal ke `_backup_YYYYMMDD` | F0 | — |
| **F2b** | SQL Blok 1b: `CREATE INDEX idx_course_relations_pj` | — | ✅ bisa kapan saja |
| **F3** | SQL Blok 2: Dedup room (TIDAK BISA ROLLBACK) | F2 | — |
| **F4** | SQL Blok 3: Fix `last_message` DB | F3 | — |
| **F5** | Kode: Dual-format support untuk 4 lokasi `dosen:` | F4 | ✅ paralel dengan F4 |
| **F6** | Kode: Fix bug preview (WebTabLayout.tsx — per-room state) | — | ✅ bisa paralel |
| **F6b** | Kode: Fix `dosen-room/route.ts` DISTINCT + hapus double-insert | — | ✅ bisa paralel |
| **F7** | Deploy kode F5+F6+F6b, verifikasi produksi, tes 2 room | F5, F6, F6b | — |
| **F8** | SQL-2: Tambah enum `admin_dev` | F7 | — |
| **F9** | SQL Blok 4: Tambah kolom baru ke `chat_rooms` + CHECK | F8 | — |
| **F10** | SQL Blok 5: Backfill participant_b room polos | F9 | — |
| **F11** | SQL Blok 6: Migrasi `dosen:` → model baru | F9 | ✅ paralel F10 |
| **F12** | SQL Blok 7: Unique index NON-partial + fungsi `get_or_create_room` | F10, F11 | — |
| **F13** | SQL Blok 8: Backfill room AdminDev semua role | F12 | ✅ paralel F14 |
| **F14** | SQL Blok 9: Backfill room PJ-Dosen (DISTINCT) dari `course_relations` | F12 | ✅ paralel F13 |
| **F15** | SQL Blok 10: RPC unread + search building admins + search all users | F12 | ✅ |
| **F16** | Kode: Endpoint search admin gedung (panggil `search_building_admins`) | F9 | ✅ |
| **F16b** | Kode: Endpoint search all (AdminDev, panggil `search_all_users`) | F9 | ✅ |
| **F17** | Kode: Hapus dukungan format lama `dosen:` | F11 selesai | — |
| **F18** | Kode: Validasi backend room per role + `get_or_create_room` | F12 | — |
| **F18b** | Kode: Daftar room AdminDev (search + inisiasi siapa pun) | F12 | ✅ |
| **F19** | Kode: Label matkul gabungan `STRING_AGG` di dosen-room | F14 | ✅ |
| **F20** | Kode: Realtime single-channel jika N > 10 | F14 | ✅ opsional |

---

## 9. Daftar File yang Diubah

### Backend Go
| File | Perubahan |
|------|-----------|
| `BackEnd/internal/handlers/chat.go` | Ganti SELECT+INSERT → panggil `get_or_create_room`; dual-format; validasi akses per role; fix `is_read` integer ↔ boolean |
| `BackEnd/internal/models/chat.go` | Tambah field `RoomType`, `ParticipantB`, `CreatedBy` di struct `ChatRoom` |

### Next.js API Routes
| File | Perubahan |
|------|-----------|
| `api/chat/user-room/route.ts` | Panggil RPC `get_or_create_room`; tambah kolom baru |
| `api/chat/dosen-room/route.ts` | Fix double-insert; DISTINCT pasangan; dual-format; label `STRING_AGG` |
| `api/admin/chat/rooms/route.ts` | Filter `room_type != 'pj_to_dosen'`; AdminDev search + inisiasi |
| `api/chat/send/route.ts` | Pastikan `last_message` update tepat; sudah benar (`.eq('id', roomId)`) |
| `api/chat/search-admin-gedung/route.ts` | **BARU**: panggil RPC `search_building_admins` |
| `api/admin/chat/search/route.ts` | **BARU**: panggil RPC `search_all_users` (AdminDev only) |

### Next.js Components & Hooks
| File | Perubahan |
|------|-----------|
| `PJKelas/Web&Tab/WebTabLayout.tsx` | Fix bug preview: per-room `last_message`, bukan `chat.messages` state |
| `PJKelas/Mobile/components/MobileChatListView.tsx` | Tambahkan room AdminDev dan admin gedung; label matkul gabungan |
| `Dosen/Mobile/components/MobileChatListView.tsx` | Tambahkan room AdminDev dan admin gedung; label matkul gabungan |
| `hooks/useAdminChat.ts` | Multi-room subscription; single-channel option |
| `lib/sendPush.ts` | Dual-format support: `startsWith('dosen:')` + `room_type` |
| `lib/chatColumns.ts` | Sudah ada, deteksi `participant_b_identifier` |

---

## 10. Risiko dan Rollback

| Risiko | Dampak | Mitigasi | Rollback |
|--------|--------|---------|---------|
| Blok 2 DELETE room duplikat salah pilih | Pesan hilang permanen | Cek query Blok 0 dulu; backup Blok 1 wajib | Restore dari `chat_rooms_backup_YYYYMMDD` |
| Unique index bentrok saat dibuat | Error, index tidak jadi | Blok 7a–7c cek duplikat sebelum CREATE INDEX | DROP INDEX `uq_rooms_pair` |
| Migrasi `dosen:` Blok 6 sebelum kode dual-format | Room lama hilang dari UI | **Wajib**: deploy kode F5 dulu | Restore dari backup |
| Backfill Blok 8–9 membuat room duplikat | Percakapan terpecah | Blok 7 (unique index + fungsi) harus ada dulu | DELETE berlebih via backup |
| Realtime channel > 20 per user | UI lag / disconnected | Monitor N per user; deploy single-channel | Revert ke per-room channel |
| SQL-2 enum error | Filter role crash | Semua query pakai `role::text` | Query aman tanpa rollback |
| AdminDev inisiasi room duplikat arah terbalik | 2 room untuk 1 pasangan | `get_or_create_room` selalu tempatkan non-AdminDev di sisi A | Dedup manual + fix `created_by` |

---

## 11. Keputusan Terkonfirmasi

Semua item konfirmasi telah terjawab. Tidak ada item tersisa.

- ~~**Index `course_relations`**~~ — **TERKONFIRMASI**: Hanya `uq_course_relations (dosen_id, pj_id, mata_kuliah, semester)` dan `course_relations_pkey`. Index `pj_id` leading ditambahkan di SQL Blok 1b.
- ~~**`admin_gedung_mapping`**~~ — **TERKONFIRMASI**: Tabel sudah ada dari SQL-1. Kolom: `admin_id` (FK → `authentication.id`), `gedung_kode`.
- ~~**Visibilitas AdminDev**~~ — **TERKONFIRMASI (keputusan user)**: AdminDev melihat **semua room kecuali `pj_to_dosen`**, termasuk room user ↔ admin gedung (`user_to_building_admin`).
- ~~**Jumlah relasi dosen-PJ maksimum**~~ — **TERKONFIRMASI**: Strategi realtime single-channel **otomatis** diterapkan jika jumlah room user > 10. Tidak perlu batasan manual.
- ~~**Self-room prevention**~~ — **TERKONFIRMASI**: Blok 5/8 filter `user_identifier != AdminDev`, fungsi `get_or_create_room` RAISE EXCEPTION jika `p_user_identifier = p_participant_b`.
- ~~**GRANT security**~~ — **TERKONFIRMASI**: Semua 4 fungsi RPC (get_or_create_room, get_room_unread_counts_for_viewer, search_building_admins, search_all_users) di-REVOKE dari anon/authenticated, di-GRANT hanya ke service_role.

---

## 12. Ringkasan

Bug preview (Masalah B) akarnya di `WebTabLayout.tsx` baris 233: satu state `chat.messages` dipakai preview semua room — mobile tidak terpengaruh. Duplikasi room dicegah `get_or_create_room` SQL function (SECURITY DEFINER, SET search_path, validasi role + self-room + arah baku) + unique index NON-partial; hanya service_role yang boleh memanggil. Desain 3 `room_type` dengan `participant_b_identifier NOT NULL` setelah Blok 7c-2; AdminDev melihat semua room kecuali pj_to_dosen (termasuk user↔admin gedung). Migrasi `dosen:NIP:NIM` butuh dual-format di kode dulu (4 lokasi) sebelum SQL — backfill Blok 5/8 filter self-room. Search pakai `v_user_profiles` + `admin_gedung_mapping(admin_id, gedung_kode)` dengan cast eksplisit.
