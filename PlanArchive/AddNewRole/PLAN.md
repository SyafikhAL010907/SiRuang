# PLAN.md — Tambah Role Baru: AdminDev, Admin SFD, Admin LE, Admin LS
> Status: Dokumen Perencanaan · Hanya Baca, Jangan Implementasikan Sebelum Disetujui
> Terakhir diperbarui: 2026-11-21 (revisi: fokus SFD, 2 file SQL, fase rollout)

---

## 1. Ringkasan Eksekutif

Fitur ini menambahkan **tiga role admin gedung baru** (`admin_sfd`, `admin_le`, `admin_ls`) dan mengganti nama role `admin` menjadi `admin_dev`. Alur persetujuan booking berubah dari **satu approver sequensial (dosen → admin tunggal)** menjadi **dua approver paralel (admin gedung + dosen)**, dengan penolakan wajib alasan dan notifikasi PJ yang lebih informatif. Sistem chat diperluas agar PJ-dosen terkoneksi otomatis, sementara user dapat mencari admin melalui fitur search.

> **Catatan duplikasi:** Pesan awal menyebut "Admin LE" dua kali — telah dikonfirmasi bahwa yang kedua adalah **Admin LS**. Total ada 3 role admin gedung: `admin_sfd`, `admin_le`, `admin_ls`. Desain dibuat mudah untuk menambah role admin gedung baru lain di masa depan.

> **Fokus implementasi:** Data nyata `SELECT DISTINCT gedung FROM rooms` hanya mengembalikan `'SFD'`. Implementasi dimulai dari gedung SFD sampai lolos test, kemudian Rollout LE, kemudian LS (ditunda — belum ada denah/ruangan).

---

## 1b. Aturan Desain Generik (WAJIB dipatuhi di kode)

> [!IMPORTANT]
> **TIDAK BOLEH ada hardcode `'SFD'` di kode** (middleware, API route, komponen UI, query, email template).
> Semua logika filter gedung harus membaca dari `admin_gedung_mapping` berdasarkan `identifier` admin yang sedang login.
> Penambahan gedung LE atau LS cukup dengan INSERT 1 baris ke `admin_gedung_mapping` — tanpa ubah kode sama sekali.

> **Email admin gedung** diambil dari `profiles.email` (sama seperti dosen) melalui view `v_user_profiles`, bukan dari variabel environment.

> **`bookingEvaluator.ts` dan semua query** harus memperhitungkan status: `dibatalkan`, `dibatalkan_prioritas`, `kedaluwarsa` sebagai status terminal (tidak di-evaluate ulang ke `hangus`).

---

## 2. Analisis Kondisi Project Saat Ini

### 2.1 Database & Skema

| File | Keterangan |
|------|-----------|
| `BackEnd/internal/database/supabase_schema.sql` | Skema utama: tabel `authentication`, `active_sessions`, `captcha`, `chat_rooms`, `chat_messages` |
| `BackEnd/internal/database/profiles_setup.sql` | Tabel `profiles`, view `v_user_profiles`, bucket `avatars` |

**Enum `user_role` saat ini:**
```sql
CREATE TYPE user_role AS ENUM ('admin', 'user', 'dosen', 'pj_kelas');
```

**Tabel `authentication` (kolom kunci):**
- `id SERIAL PRIMARY KEY`
- `username VARCHAR(100)`
- `identifier VARCHAR(50) UNIQUE` — NIM atau NIP
- `identifier_type VARCHAR(10)` — `'nim'` atau `'nip'`
- `password VARCHAR(255)` — bcrypt hash
- `role user_role`

**Tabel `profiles` (kolom kunci):**
- `user_id INT4 NOT NULL UNIQUE` — FK ke `authentication.id`
- `full_name`, `email`, `phone`, `whatsapp`, `faculty`, `avatar_url`

**Tabel `chat_rooms`:**
- `id SERIAL PRIMARY KEY`
- `user_identifier VARCHAR(50)` — NIM/NIP pemilik room
- `last_message TEXT`, `updated_at`, `is_marked_unread BOOLEAN`

**Tabel `chat_messages`:**
- `room_id INTEGER REFERENCES chat_rooms(id)`
- `sender_identifier VARCHAR(50)` — NIM/NIP pengirim
- `message TEXT`, `message_type message_type`, `is_read BOOLEAN`

**Tabel `bookings` (di Supabase, diakses via supabaseClient):**
Kolom yang teridentifikasi dari kode:
- `id UUID`, `room_id`, `pemohon_id`, `dosen_id`, `relation_id`
- `nama_pemohon`, `nim_pemohon`, `mata_kuliah`, `kelas`, `prodi`, `fakultas`, `angkatan`
- `nama_dosen`, `tanggal`, `sks`, `jam_mulai`, `jam_selesai`
- `is_conditional BOOLEAN`, `official_schedule_id`
- `status` (VARCHAR/TEXT — **dikonfirmasi bukan PostgreSQL ENUM**; nilai lama: `menunggu_dosen`, `disetujui_dosen`, `dijadwalkan_admin`, `ditolak_dosen`, `ditolak_admin`; nilai baru: `menunggu_approval`, `dijadwalkan`, `ditolak`; universal: `menunggu_checkin`, `berlangsung`, `selesai`, `hangus`)
- `alasan_tolak TEXT` — alasan penolakan (saat ini hanya untuk dosen atau admin tunggal)
- `dosen_token_hash`, `dosen_token_expires`, `dosen_responded_at`
- `admin_id`, `admin_responded_at`
- `updated_at`, `created_at`

**Tabel lain yang teridentifikasi:**
- `rooms` — `id`, `kode`, `nama`, `gedung`, `lantai`, `bookable`
  - **Nilai kolom `gedung` (dikonfirmasi dari kode `FrontEnd/src/app/api/rooms/status/route.ts`):**
    - `'SFD'` — Gedung SFD
    - `'LE'` — Gedung L Elektro
    - `'LS'` — Gedung LS (dari routing `denah-ls`)
    - Query di kode: `.eq('gedung', gedung)` di mana nilai diambil via `.toUpperCase()`
- `official_schedules` — `id`, `mata_kuliah`, `kelas`, `nama_dosen`, `nama_pj`, `hari`, `jam_mulai`, `jam_selesai`, `room_id`, `is_active`, `pj_id`, **`dosen_id`** (dikonfirmasi dari kode API)
- `email_logs` — `template`, `to_email`, `subject`, `related_id`, `status`, `attempts`, `sent_at`, `error_message`
- `registration_requests` — `identifier`, `email`
- `push_subscriptions` — (file: `push_subscriptions.sql`)

### 2.2 Backend (Go — `BackEnd/`)

| File | Fungsi |
|------|--------|
| `cmd/api/main.go` | Entry point, router Gin, grup route `/api/admin` dilindungi `RoleMiddleware("admin")` |
| `internal/middleware/auth.go` | `AuthMiddleware()` validasi JWT + sesi; `RoleMiddleware(...roles)` cek role string |
| `internal/handlers/admin.go` | `AdminDashboard()` — minimal stub |
| `internal/handlers/chat.go` | CRUD chat: `GetRooms`, `GetOrCreateRoom`, `GetMessages`, `SendMessage`, `MarkAsRead`, `MarkAsUnread`, `GetAllUsers`, `BroadcastMessage`, `BulkDeleteRooms`, `GetAdminInfo` |
| `internal/handlers/auth.go` | Login/signup/logout |
| `internal/models/user.go` | Struct `User` dan `Claims` — field `Role string` |
| `internal/models/chat.go` | Struct `ChatRoom`, `ChatMessage` |

**Poin krusial Go:**
- `RoleMiddleware("admin")` di `main.go` → semua route admin hanya untuk role string `"admin"`. Perlu diperluas ke `"admin_dev"`, `"admin_sfd"`, `"admin_le"`, `"admin_ls"`.
- Route khusus AdminDev (Monitoring, Import, dll.) wajib menggunakan `RoleMiddleware("admin_dev")` tersendiri.
- **`GetAllUsers` di `chat.go`** (baris 242): query `WHERE role != 'admin' OR...` → perlu update ke `role NOT IN ('admin_dev', 'admin_sfd', 'admin_le', 'admin_ls')`.
- **`GetAdminInfo` di `chat.go`** (baris 269): query `WHERE a.role = 'admin'` → perlu logika untuk mengembalikan admin berdasarkan role (semua admin, atau admin spesifik yang dicari user).
- **`GetRooms` di `chat.go`** (baris 16–51): saat ini query semua `chat_rooms` tanpa filter admin. Setelah fitur ini perlu dipisah:
  - `admin_dev`: lihat room dengan `participant_b_identifier = identifier_admin_dev OR participant_b_identifier IS NULL` (IS NULL = room lama).
  - `admin_sfd/le/ls`: lihat room dengan `participant_b_identifier = identifier_mereka` saja.
- **`GetOrCreateRoom` di `chat.go`** (baris 53–87): saat ini buat/cari room berdasarkan `WHERE user_identifier = $1` saja (asumsi 1 user = 1 room). Setelah fitur ini harus cari berdasarkan `(user_identifier, participant_b_identifier)`. Tambah parameter `adminIdentifier` di request.
- **`SendMessage` / `BroadcastMessage` di `chat.go`**: perlu validasi siapa boleh mengirim ke room ini (cek `participant_a` atau `participant_b_identifier` sesuai role pengirim).
- **Endpoint baru: `GET /api/chat/search-admin?q=nama`**: query `authentication WHERE role IN ('admin_dev','admin_sfd','admin_le','admin_ls') AND username ILIKE '%q%'` JOIN `profiles` untuk ambil `full_name`. Implementasi di handler baru atau di `chat.go`.

### 2.3 Frontend (Next.js — `FrontEnd/`)

| File | Fungsi |
|------|--------|
| `src/middleware.ts` | Guard route: `/admin` → role `'admin'`; `/dosen`, `/pj`, `/user` juga dicek |
| `src/lib/roleNavigation.ts` | Switch `role` → path dashboard: `'admin'` → `'/admin'` |
| `src/lib/authHelper.ts` | Helper ambil user dari request |
| `src/lib/mailer.ts` | SMTP email sender dengan retry + log ke `email_logs` |
| `src/lib/bookingEvaluator.ts` | Lazy evaluator status booking (hangus, selesai) |
| `src/lib/checkinToken.ts` | HMAC token generate/verify untuk 1-klik check-in |
| `src/app/api/bookings/route.ts` | POST booking baru: insert ke `bookings`, kirim email E1 ke dosen saja (akan diubah: paralel ke dosen + admin gedung) |
| `src/app/api/bookings/[id]/review/route.ts` | GET detail booking (pakai token dosen); POST ACC/tolak via link email |
| `src/app/api/dosen/bookings/route.ts` | GET list booking untuk dosen |
| `src/app/api/dosen/bookings/[id]/route.ts` | POST ACC/tolak dosen via halaman web |
| `src/app/api/admin/bookings/route.ts` | GET list booking untuk admin |
| `src/app/api/admin/bookings/[id]/route.ts` | PUT ACC/tolak admin via halaman web |
| `src/app/dosen/review/[id]/page.tsx` | Halaman review dosen: modal ACC + modal tolak (dengan textarea alasan min 10 char) |
| `src/components/Admin/Web&Tab/components/AdminSidebar.tsx` | Sidebar admin |
| `src/components/Admin/Web&Tab/components/BookingManagementView.tsx` | Halaman ACC pengajuan |
| `src/components/Admin/Web&Tab/components/ImportJadwalResmiView.tsx` | Import SIAKAD |
| `src/components/Admin/Web&Tab/components/ManajemenAkunView.tsx` | Manajemen akun |
| `src/components/Admin/Web&Tab/components/RelasiMataKuliahView.tsx` | Relasi mata kuliah |
| `src/components/Admin/Web&Tab/components/RoleAccessView.tsx` | Manajemen Role Akses |
| `src/app/api/rooms/status/route.ts` | Query ruangan per gedung: `.eq('gedung', 'SFD'/'LE'/'LS')` — **dikonfirmasi nilai enum gedung** |

**Template email yang ada:**
- `E1` — Notifikasi pengajuan ke dosen (dengan link ACC/Tolak)
- `E2` — Konfirmasi disetujui ke PJ (dengan link check-in)
- `E3` — Pemberitahuan ditolak dosen ke PJ
- `E4` — Konfirmasi dijadwalkan admin ke PJ (dengan link check-in)
- `E5` — Pemberitahuan ditolak admin ke PJ
- `E10` — Pemberitahuan booking hangus ke PJ

---

## 3. Alur Approval Saat Ini vs. Alur Baru

### Saat Ini (Sequential)
```
PJ submit → status: menunggu_dosen
  → Email E1 ke Dosen (link ACC/Tolak)
  → Dosen ACC → status: disetujui_dosen → Email E2 ke PJ (link check-in)
  → Dosen Tolak → status: ditolak_dosen → Email E3 ke PJ (dengan alasan)
  
  Setelah disetujui_dosen:
  → Admin ACC (web) → status: dijadwalkan_admin → Email E4 ke PJ (link check-in)
  → Admin Tolak (web) → status: ditolak_admin → Email E5 ke PJ
```

### Alur Baru (Paralel — Dua Approver)
```
PJ submit → status: menunggu_approval
  → Email E1-Dosen ke Dosen (link ACC/Tolak dosen)
  → Email E1-Admin ke Admin Gedung terkait saja (berdasarkan rooms.gedung)
  
  Pihak yang terlibat di approval:
  - Dosen: approve/tolak via email (quick-action) atau web (/dosen/review/[id])
  - Admin Gedung (SFD/LE/LS): approve/tolak via email atau web (/admin/review/[id])
  - AdminDev: TIDAK menerima email pengajuan, TIDAK menjadi approver sama sekali
  
  Setiap approver menyimpan status per-approver:
  - approval_dosen: 'pending' | 'disetujui' | 'ditolak'
  - approval_admin_gedung: 'pending' | 'disetujui' | 'ditolak'
  - alasan_tolak_dosen: TEXT (wajib min 10 char jika ditolak)
  - alasan_tolak_admin_gedung: TEXT (wajib min 10 char jika ditolak)
  - ditolak_oleh: 'dosen' | 'admin_gedung' | NULL
  - ditolak_at: TIMESTAMP
  
  Status gabungan (dihitung dari dua per-approver):
  - Keduanya setuju → status: dijadwalkan → Email E-Checkin ke PJ
  - Salah satu tolak → status: ditolak → Email E-Tolak ke PJ (dengan info siapa & alasan)
  - Belum lengkap → status: menunggu_approval (tidak ada email ke PJ)
```

### Aturan Jika Salah Satu Menolak
Dikonfirmasi: Link email **hanya kedaluwarsa untuk pihak yang sudah melakukan aksi**. Pihak lain yang masih pending, linknya **tetap aktif**.

**Dampak ke logic server:**
- Saat salah satu tolak: status gabungan langsung `ditolak`, `ditolak_oleh` diisi.
- Approver yang masih pending bisa tetap membuka link emailnya. Halaman yang terbuka **harus menampilkan info**: "Pengajuan ini telah ditolak oleh [Dosen/Admin Gedung X beserta alasannya]". Tombol ACC/Tolak ditampilkan disabled atau disembunyikan.
- Server **memblock aksi ACC/tolak** jika `status = 'ditolak'`: cek kondisi ini sebelum memproses aksi, kembalikan response informatif (misal HTTP 409 + pesan "Booking ini sudah ditolak oleh [pihak lain]").
- **Kolom `approval_dosen` dan `approval_admin_gedung` tetap merekam respons akhir masing-masing** untuk keperluan audit, terlepas dari status gabungan.

### Pengajuan Ulang oleh PJ
Dikonfirmasi: PJ **boleh mengajukan ulang tanpa batas**. Booking lama tidak dihapus, disimpan dengan status `ditolak` sebagai riwayat. Pengajuan ulang = booking baru (INSERT baru ke tabel `bookings`).

### Tampilan Status di Halaman Booking PJ
Dikonfirmasi: Halaman booking PJ harus menampilkan:
- Rentang waktu booking
- Status approval dosen: sudah ACC / belum / ditolak (+ alasan jika ditolak)
- Status approval admin gedung: sudah ACC / belum / ditolak (+ alasan jika ditolak)
- Tombol "Ajukan Ulang" yang langsung bisa dipakai

---

## 4. Rencana Implementasi Bertahap

### Tabel Fase (Urutan Eksekusi)

| # | Fase | Isi | Paralel? | Prasyarat |
|---|------|-----|:--------:|-----------|
| 0 | **Persiapan** | Backup DB Supabase; konfirmasi `SELECT DISTINCT gedung FROM rooms` → `'SFD'`; baca semua dokumen ini | — | — |
| SQL-1 | **Database aman** | Jalankan `SQL-1-JALANKAN-SEKARANG.sql` blok 1–6 di Supabase SQL Editor | — | Fase 0 selesai |
| 1 | **Kompatibilitas role di kode** | `src/middleware.ts`: terima `admin_dev`, `admin_sfd`, `admin_le`, `admin_ls` di guard `/admin`; `roleNavigation.ts`: tambah case baru; admin gedung → redirect ke `/admin/bookings`; `RoleMiddleware` Go: diperluas; kode tetap bisa handle role `'admin'` lama selama SQL-2 belum jalan | — | SQL-1 |
| 2 | **Sidebar & route protection** | `AdminSidebar.tsx`: sembunyikan menu Monitoring/Import/RoleAccess/RelasiMK untuk admin gedung; lindungi route khusus AdminDev di middleware | Boleh paralel dengan 3 | Fase 1 |
| 3 | **Booking paralel — SFD** | `POST /api/bookings`: kirim email E1 ke dosen DAN admin SFD paralel; `quick-action-admin` route baru; `dosen/[id]/route.ts`: cek dua approval; status `menunggu_approval` | Boleh paralel dengan 2, 5 | Fase 1 |
| 4 | **UI admin gedung & AdminDev view-only** | Halaman `/admin/review/[id]` baru; `BookingManagementView.tsx`: view-only untuk admin_dev, filter per gedung untuk admin gedung; modal alasan tolak | Boleh paralel dengan 2, 5 | Fase 1 |
| 5 | **Chat** | `GetRooms`, `GetOrCreateRoom`, `SendMessage` Go; endpoint `search-admin`; auto-create room PJ-dosen saat relasi dibuat | Boleh paralel dengan 3, 4 | Fase 1 |
| 6 | **Halaman PJ** | Tampilan status approval per-pihak; tombol ajukan ulang; alasan penolakan per-approver | — | Fase 3, 4 |
| SQL-2 | **Migrasi data** | Jalankan `SQL-2-JALANKAN-SETELAH-KODE.sql` (rename admin→admin_dev, konversi status, backfill chat) | — | Fase 1–6 live & stable |
| T | **Test SFD** | Test manual seluruh alur dengan akun admin_sfd dan ruangan gedung SFD | — | SQL-2 |
| LE | **Rollout LE** | Tambah ruangan LE di `rooms` dengan `bookable` yang benar; aktifkan Blok 5b LE di SQL; konfirmasi tidak ada hardcode `'SFD'` di kode | — | Test SFD lolos |
| LS | **LS — Ditunda** | Aktifkan saat ada denah/ruangan/kode gedung LS. Akun admin_ls sudah ter-seed. | — | Rollout LE lolos |

> **Catatan paralel:** Fase 2, 3, 4, 5 dapat dikerjakan oleh developer yang berbeda secara bersamaan karena file yang diubah tidak overlap. Fase 6 bergantung pada hasil 3 dan 4.

---

### Detail Rollout LE — Aturan `bookable` Per Ruangan

> **Sumber analisis kode nyata:** `DenahL1LE.tsx` ln.29, `DenahL2LE.tsx` ln.14, `DenahL3LE.tsx` ln.14, `DenahL4LE.tsx` ln.14 — file denah LE sudah ada di project dan mendefinisikan `NON_BOOKABLE` per lantai.

**Ruangan NON-BOOKABLE yang sudah terdefinisi di kode denah LE:**

| Lantai | File | `NON_BOOKABLE` (kode) | Keterangan |
|--------|------|-----------------------|------------|
| L1 | `DenahL1LE.tsx` | `RUANG_DOSEN` | Ruang Dosen — tidak bisa di-booking |
| L2 | `DenahL2LE.tsx` | `TOILET_WANITA`, `TOILET_PRIA`, `RSTAFF` | Toilet + R. Staff Only |
| L3 | `DenahL3LE.tsx` | `TOILET_WANITA`, `TOILET_PRIA`, `R_TEKNISI` | Toilet + R. Teknisi |
| L4 | `DenahL4LE.tsx` | `TOILET`, + (lihat kode) | Toilet + area lain |

**Yang bisa di-booking gedung LE:** lab, kelas, dan ruangan dengan nomor yang tidak masuk `NON_BOOKABLE`.

**Mekanisme sudah ada — tidak perlu kode baru:**
- **UI:** `DenahL*LE.tsx` sudah handle `isBookable` per ruangan — non-bookable tampil disabled, `cursor-default`, tidak bisa diklik
- **Server:** `POST /api/bookings/route.ts` baris 195 & 212 sudah cek `if (!roomTarget.bookable) → return 400`. Validasi di server-side.
- **Kolom `rooms.bookable`:** sudah ada di schema, dipakai di semua query booking dan komponen denah

**Yang harus dilakukan saat Rollout LE (hanya data, bukan kode):**
1. `INSERT` semua ruangan LE ke tabel `rooms` Supabase:
   - `bookable = TRUE` → kelas bernomor dan lab
   - `bookable = FALSE` → `RUANG_DOSEN`, `RSTAFF`, toilet, ruang teknisi, semua yang ada di `NON_BOOKABLE` per lantai
2. Nilai kolom `kode` di `rooms` **harus persis sama** dengan konstanta di `DenahL*LE.tsx` (case-sensitive) agar denah dan DB sinkron
3. Uncomment baris LE di `SQL-1-JALANKAN-SEKARANG.sql` Blok 5b → jalankan INSERT mapping
4. Verifikasi: `SELECT kode, nama, bookable FROM rooms WHERE gedung = 'LE' ORDER BY bookable DESC, kode;`

> [!IMPORTANT]
> Jika `kode` di DB berbeda dari konstanta di `DenahL*LE.tsx` (misal DB pakai `LE-RUANG-DOSEN` tapi denah pakai `RUANG_DOSEN`), denah tidak akan bisa highlight status booking ruangan yang benar. Samakan persis.

---

### Checklist Fase 0 (Sebelum SQL-1)
- [ ] Backup Supabase (Dashboard → Settings → Backups, atau `pg_dump`)
- [ ] Konfirmasi `SELECT DISTINCT gedung FROM rooms;` → hanya `'SFD'`
- [ ] Konfirmasi nama constraint: `SELECT conname FROM pg_constraint WHERE conrelid = 'bookings'::regclass AND contype = 'c';`
- [ ] Konfirmasi `official_schedules` punya kolom `pj_id` dan `dosen_id`
- [ ] Siapkan email asli admin SFD untuk diisi di Blok 5 SQL-1

---

### Fase 1 — Database (SQL-1, sudah dipecah per blok)
Lihat `SQL-1-JALANKAN-SEKARANG.sql`. Blok wajib dijalankan satu per satu:
1. **Blok 1** — Tambah enum value (jalankan SENDIRIAN)
2. **Blok 2** — Kolom baru bookings (safe, DEFAULT tersedia)
3. **Blok 2b** — Constraint `chk_bookings_status` dengan semua status termasuk `dibatalkan`, `dibatalkan_prioritas`, `kedaluwarsa`
4. **Blok 3** — Tabel `admin_gedung_mapping`
5. **Blok 4** — Cek bentrok NIP (harus 0 baris)
6. **Blok 5** — Seed 3 akun (hash bcrypt via pgcrypto, email diisi di CTE atas)
   > ⚠️ **Email admin gedung wajib diisi di CTE sebelum jalankan Blok 5.** Email diambil dari `profiles.email` via `v_user_profiles`. Tanpa email, `mailer.ts` tidak bisa kirim notifikasi booking ke admin gedung.
7. **Blok 5b** — Mapping gedung SFD (LE dan LS diaktifkan saat fasenya)
8. **Blok 6** — Verifikasi semua

---

### Fase 2 — Backend Go
1. Update `RoleMiddleware` di `main.go`:
   - Route umum admin → `RoleMiddleware("admin_dev", "admin_sfd", "admin_le", "admin_ls")`
   - Route khusus AdminDev → `RoleMiddleware("admin_dev")`
2. Update `GetAllUsers` dan `GetAdminInfo` di `chat.go`
3. Tambah handler lookup admin gedung berdasarkan `rooms.gedung` → `admin_gedung_mapping`

---

### Fase 3 — Frontend API Routes
1. Update `src/middleware.ts`: `/admin` → role in `['admin_dev', 'admin_sfd', 'admin_le', 'admin_ls']`
2. Update `src/lib/roleNavigation.ts`: tambah case baru; admin gedung → `/admin/bookings`
3. Update `src/app/api/bookings/route.ts`: kirim email paralel ke dosen DAN admin gedung (lookup via `admin_gedung_mapping`, email dari `profiles.email`)
4. Buat `src/app/api/bookings/[id]/quick-action-admin/route.ts`: 1-klik ACC/tolak admin gedung dari email
5. Update `src/app/api/dosen/bookings/[id]/route.ts`: cek dua approval sebelum kirim email check-in
6. Update `src/app/api/admin/bookings/route.ts` dan `[id]/route.ts`: filter per gedung via `admin_gedung_mapping`, model paralel
7. Update `bookingEvaluator.ts`: sesuaikan status baru; status `dibatalkan`, `dibatalkan_prioritas`, `kedaluwarsa` → terminal, tidak di-evaluate ulang

---

### Fase 4 — Frontend UI
1. Update `AdminSidebar.tsx`: sembunyikan menu Monitoring/Import/RoleAccess/RelasiMK untuk `admin_sfd`/`admin_le`/`admin_ls`
2. Buat halaman review admin gedung: `src/app/admin/review/[id]/page.tsx`
3. Update `BookingManagementView.tsx`: filter per gedung untuk Admin SFD/LE/LS (server-side); **AdminDev di halaman ini: view-only — tidak ada tombol ACC/Tolak. AdminDev TIDAK memiliki akses ke `/admin/review/[id]`**.
4. Update halaman booking PJ: tampilkan status per-approver + alasan penolakan + tombol ajukan ulang
5. Update chat: fitur search admin, auto-create room PJ-dosen, backfill room existing

---

### Fase 5 — Force Change Password (Lanjutan)
> Dikonfirmasi: fitur force-change-password belum ada di project. **Jangan dibuat sekarang.**
> Rekomendasi: setelah akun Admin SFD/LE/LS dibuat, **ganti password secara manual via database** sebelum akun diserahkan ke pemilik akun.
> Implementasi force-change-password sebagai fitur terpisah di fase selanjutnya.

---

### Fase 6 — Testing & Rollback
- Test manual seluruh alur (booking, approval paralel via email dan web, penolakan dengan alasan, check-in)
- Test skenario: salah satu menolak → approver lain masih bisa buka link tapi diblock server
- Test: PJ ajukan ulang setelah ditolak → booking baru, riwayat lama tetap
- Siapkan script rollback SQL (lihat Blok F di `SQL-2-JALANKAN-SETELAH-KODE.sql`)

> **Catatan implementasi krusial (Fase 2–3):**
>
> **Atomic update approval:** Update kolom `approval_dosen` / `approval_admin_gedung` wajib menggunakan operasi atomic — PostgreSQL transaction atau Supabase `.update()` dengan kondisi `WHERE status = 'menunggu_approval' AND approval_xxx = 'pending'`. Ini mencegah race condition jika dua approver menekan tombol bersamaan (misal, dosen ACC tepat saat admin gedung juga sedang submit ACC).
>
> **Aturan hangus (bookingEvaluator.ts):** Status `hangus` dievaluasi secara lazy oleh `bookingEvaluator.ts` saat booking di-fetch, bukan via cron job. Jika booking berstatus `menunggu_approval` dan tanggal/jam booking sudah terlewat, status dievaluasi menjadi `hangus` secara otomatis. Status `dibatalkan`, `dibatalkan_prioritas`, `kedaluwarsa` adalah status terminal — tidak di-evaluate ulang ke hangus.

---

## 5. File yang Akan Diubah (Inventaris)

### Database (SQL)
- `BackEnd/internal/database/supabase_schema.sql` — referensi (tidak dijalankan langsung)
- SQL baru di `PlanArchive/AddNewRole/SQL.sql`

### Backend Go
| File | Perubahan |
|------|-----------|
| `BackEnd/cmd/api/main.go` | Update `RoleMiddleware`, pisah route admin_dev vs admin gedung |
| `BackEnd/internal/middleware/auth.go` | Tidak ada perubahan struct (role masih `string`) |
| `BackEnd/internal/handlers/chat.go` | Update query `GetAllUsers`, `GetAdminInfo`, logika routing chat |
| `BackEnd/internal/handlers/admin.go` | Tambah handler booking admin gedung |
| `BackEnd/internal/models/user.go` | Tidak ada perubahan (role masih `string`) |

### Frontend Next.js
| File | Perubahan |
|------|-----------|
| `src/middleware.ts` | Tambah role admin gedung di guard `/admin`; pisah guard route khusus AdminDev |
| `src/lib/roleNavigation.ts` | Tambah case `admin_dev`, `admin_sfd`, `admin_le`, `admin_ls` |
| `src/lib/authHelper.ts` | Mungkin perlu update helper cek role admin |
| `src/app/api/bookings/route.ts` | Kirim email paralel + status baru `menunggu_approval` |
| `src/app/api/bookings/[id]/review/route.ts` | Support token dosen (tidak berubah), server cek status ditolak sebelum proses |
| `src/app/api/dosen/bookings/[id]/route.ts` | Cek dua approval, kondisi kirim email check-in |
| `src/app/api/admin/bookings/route.ts` | Filter berdasarkan gedung untuk admin_sfd/le/ls |
| `src/app/api/admin/bookings/[id]/route.ts` | Update untuk model paralel + validasi gedung server-side |
| `src/app/dosen/review/[id]/page.tsx` | Tidak ada perubahan (sudah punya modal alasan min 10 char) |
| `src/components/Admin/Web&Tab/components/AdminSidebar.tsx` | Sembunyikan menu admin_dev untuk role lain |
| `src/components/Admin/Web&Tab/components/BookingManagementView.tsx` | Filter gedung server-side |
| **BARU** `src/app/admin/review/[id]/page.tsx` | Halaman review admin gedung (mirror dosen/review) |
| **BARU** `src/app/api/bookings/[id]/quick-action-admin/route.ts` | 1-klik admin gedung dari email |
| **BARU** `src/app/api/admin/[id]/buildings/route.ts` | Mapping admin gedung ke gedung |

---

## 6. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Rename enum PostgreSQL tidak bisa langsung | Downtime/error | Gunakan `ALTER TYPE ... RENAME VALUE` (PostgreSQL 14+); lihat SQL.sql |
| Token lama dosen (`quick-action`) menjadi invalid | Dosen tidak bisa ACC via email lama | Backward-compat: jika hanya token dosen valid → tetap proses, cek admin juga |
| Booking lama dengan `disetujui_dosen` tidak punya `approval_admin_gedung` | Inkonsistensi data | Seed `approval_admin_gedung = 'disetujui'` untuk booking lama yang sudah disetujui/dijadwalkan |
| Approver pending akses link setelah pihak lain menolak | Konflik status data | Server wajib cek `status = 'ditolak'` sebelum proses aksi; tampilkan pesan informatif, block aksi |
| Email dikirim paralel tapi SMTP rate-limited | Salah satu email gagal | Gunakan `Promise.allSettled`, log ke `email_logs` |
| Nilai `rooms.gedung` berbeda dari asumsi | Mapping admin gedung salah | Jalankan `SELECT DISTINCT gedung FROM rooms;` sebelum seed; update `admin_gedung_mapping` sesuai hasil |
| NIP Admin SFD/LE/LS bentrok | Gagal INSERT | Jalankan query cek bentrok di SQL.sql sebelum INSERT |

---

## 7. Script Rollback

Lihat bagian `-- ROLLBACK` di `SQL.sql`. Garis besar:
1. Revert data admin gedung kembali ke role `admin`
2. Drop kolom baru di `bookings`
3. Drop tabel `admin_gedung_mapping`
4. Rollback kolom chat_rooms
5. Rename enum kembali: `admin_dev` → `admin`, drop `admin_sfd`, `admin_le`, `admin_ls`
6. Hapus akun Admin SFD, Admin LE, Admin LS

---

## 8. Asumsi yang Tersisa

1. **Nilai `rooms.gedung` diasumsikan `'SFD'`, `'LE'`, `'LS'`** — dikonfirmasi dari kode `FrontEnd/src/app/api/rooms/status/route.ts` yang menggunakan `.toUpperCase()` dan default `'SFD'`. **Wajib diverifikasi** dengan menjalankan `SELECT DISTINCT gedung FROM rooms;` sebelum SQL dijalankan.

2. **AdminDev di halaman Monitoring** — diasumsikan hanya melihat (read-only), tidak ada aksi ACC/tolak di Monitoring. Perlu dikonfirmasi saat implementasi Fase 4.

3. **Force-change-password** — belum ada di project. Rekomendasi: ganti password manual via database setelah seeding. Implementasi fitur sebagai fase terpisah.

## 9. Konfirmasi Teknis (Bukan Asumsi)

4. **`bookings.status` tipe kolom** — **dikonfirmasi `VARCHAR/TEXT`**, bukan PostgreSQL ENUM, berdasarkan `.in('status', [...])` di `src/app/api/bookings/route.ts`. Migrasi status di SQL.sql STEP 3d menggunakan `UPDATE ... SET status = '...' WHERE ...` dan `CHECK constraint` biasa, bukan `ALTER TYPE`. Alur approval lama (dosen-only sequential) sudah sepenuhnya **digantikan** oleh model paralel baru; data lama dimigrasikan di STEP 3e.
