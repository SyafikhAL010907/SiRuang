# PRD.md — Product Requirements Document
## Fitur: Tambah Role Baru (AdminDev, Admin SFD, Admin LE, Admin LS)
> Versi: 1.2 · Terakhir diperbarui: 2026-11-21 (revisi: fokus SFD dulu, LE menyusul, LS ditunda) · Status: Draft untuk Review

---

## 1. Latar Belakang

Sistem SiRuang saat ini hanya memiliki satu role admin (`admin`) yang mengelola seluruh aspek platform termasuk peminjaman ruangan, manajemen akun, dan import SIAKAD. Seiring bertambahnya gedung yang dikelola (SFD, LE, LS), dibutuhkan role admin gedung yang terbatas hanya pada gedungnya masing-masing.

**Data nyata:** `SELECT DISTINCT gedung FROM rooms` → hanya mengembalikan `'SFD'`. Implementasi dimulai dari gedung SFD, kemudian Rollout LE, LS ditunda.

**Desain generik:** Semua logika filter gedung dibaca dari `admin_gedung_mapping` berdasarkan akun admin yang login. Tidak ada hardcode `'SFD'` di kode. Email admin gedung diambil dari `profiles.email` via `v_user_profiles` (sama seperti dosen), bukan dari env.

---

## 2. Tujuan

1. Memisahkan tanggung jawab admin: `AdminDev` (admin sistem penuh) vs `Admin SFD` / `Admin LE` / `Admin LS` (admin gedung terbatas)
2. Mengintegrasikan admin gedung ke dalam alur persetujuan booking sebagai approver paralel bersama dosen
3. Memastikan penolakan selalu disertai alasan yang jelas (min 10 karakter), baik dari dosen maupun admin gedung
4. Memperjelas aturan chat antar role

---

## 3. User Story

### 3.1 AdminDev
- **Sebagai AdminDev**, saya dapat mengakses semua fitur admin yang ada sebelumnya, termasuk Monitoring Peminjaman Ruang, Import SIAKAD, Manajemen Role Akses, dan Relasi Mata Kuliah.
- **Sebagai AdminDev**, saya dapat **melihat** semua pengajuan booking dari seluruh gedung di halaman ACC Pengajuan Ruangan — **read-only, tanpa tombol ACC atau Tolak** (asumsi view-only, dikonfirmasi saat implementasi Fase 4).
- **Sebagai AdminDev**, saya **TIDAK** menerima email pengajuan booking, **TIDAK** menjadi approver, dan **TIDAK** memiliki akses ke halaman `/admin/review/[id]`.
- **Sebagai AdminDev**, saya dapat mengelola akun Admin SFD, Admin LE, dan Admin LS.

### 3.2 Admin SFD
- **Sebagai Admin SFD**, saya dapat login dan langsung diarahkan ke halaman ACC Pengajuan Ruangan yang hanya menampilkan ruangan di gedung SFD.
- **Sebagai Admin SFD**, saya menerima email notifikasi setiap kali ada pengajuan booking ruangan di gedung SFD. Email diambil dari `profiles.email` akun saya.
- **Sebagai Admin SFD**, saya dapat menyetujui atau menolak pengajuan booking via email (1-klik ACC, link tolak → wajib isi alasan min 10 karakter) atau via halaman web.
- **Sebagai Admin SFD**, saya TIDAK dapat mengakses menu Monitoring Peminjaman Ruang, Import SIAKAD, Manajemen Role Akses, Relasi Mata Kuliah, dan Manajemen Akun.

### 3.3 Admin LE *(Rollout LE — setelah SFD lolos test)*
*(Sama seperti Admin SFD, diganti "SFD" menjadi "LE". Aktif setelah ruangan LE ditambahkan ke `rooms` dan mapping diaktifkan di `admin_gedung_mapping`.)*

### 3.4 Admin LS *(Fase LS — Ditunda)*
*(Sama seperti Admin SFD, diganti "SFD" menjadi "LS". Ditunda — belum ada denah/ruangan/kode gedung LS. Akun admin_ls sudah ter-seed, menunggu fase ini.)*

### 3.5 PJ Kelas
- **Sebagai PJ Kelas**, saya mengajukan booking dan sistem otomatis mengirim notifikasi ke dosen pengampu DAN admin gedung terkait secara bersamaan (AdminDev tidak termasuk).
- **Sebagai PJ Kelas**, saya menerima email check-in HANYA jika kedua pihak (admin gedung DAN dosen) sudah ACC.
- **Sebagai PJ Kelas**, saya menerima email notifikasi penolakan yang menyebutkan siapa yang menolak (dosen atau admin gedung) beserta alasannya.
- **Sebagai PJ Kelas**, saya dapat melihat status approval per-pihak (dosen: sudah ACC/belum/ditolak + alasan, admin gedung: sudah ACC/belum/ditolak + alasan) langsung di halaman booking.
- **Sebagai PJ Kelas**, saya dapat mengajukan ulang booking setelah ditolak (tanpa batas), dan pengajuan lama tersimpan sebagai riwayat.
- **Sebagai PJ Kelas**, saya secara otomatis memiliki room chat dengan dosen yang berelasi dengan saya.
- **Sebagai PJ Kelas**, saya dapat chat langsung ke admin manapun melalui fitur search.

### 3.6 Dosen
- **Sebagai Dosen**, saya menerima email notifikasi pengajuan booking secara bersamaan dengan admin gedung.
- **Sebagai Dosen**, saya dapat ACC atau menolak booking via link email (ACC langsung, link tolak → wajib isi alasan di halaman `/dosen/review/[id]`) atau via halaman web dosen.
- **Sebagai Dosen**, saya secara otomatis memiliki room chat dengan PJ Kelas yang berelasi dengan saya.
- **Sebagai Dosen**, saya dapat chat ke admin melalui fitur search.

### 3.7 User (Mahasiswa)
- **Sebagai User**, saya dapat chat ke admin (AdminDev, Admin SFD, Admin LE, Admin LS) melalui fitur search berdasarkan nama akun.
- **Sebagai User**, saya TIDAK memiliki relasi ke dosen sehingga tidak bisa memulai chat ke dosen secara langsung.

---

## 4. Requirement Fungsional

### RF-01: Rename & Tambah Role
- Role `admin` di enum `user_role` diganti menjadi `admin_dev`
- Tambah role `admin_sfd`, `admin_le`, dan `admin_ls`
- Semua data lama yang menggunakan role `admin` otomatis menggunakan `admin_dev`
- Desain modular: menambah admin gedung baru cukup `ALTER TYPE user_role ADD VALUE 'admin_namagedung'` + satu baris di `admin_gedung_mapping`

### RF-02: Hak Akses Menu Admin
Lihat Matriks Akses di Bagian 6.

### RF-03: Alur Booking — Notifikasi Paralel
- Saat PJ submit booking, sistem **secara bersamaan** (paralel) mengirim:
  - Email E1-Dosen ke alamat email dosen pengampu (`profiles.email`)
  - Email E1-Admin ke alamat email admin gedung yang bertanggung jawab atas gedung ruangan yang di-booking (`profiles.email`, diambil via `v_user_profiles`)
- **AdminDev TIDAK menerima email pengajuan dan TIDAK menjadi approver**
- Status booking menjadi `menunggu_approval`
- Sistem menentukan admin gedung berdasarkan `rooms.gedung` → lookup `admin_gedung_mapping` → ambil `identifier` admin → ambil `email` dari `profiles` via `v_user_profiles`
- **Tidak ada hardcode `'SFD'` di kode** — gedung dibaca dinamis dari `admin_gedung_mapping`
- Fase awal: hanya gedung SFD yang punya mapping aktif; LE dan LS diaktifkan saat fasenya

### RF-04: Alur Persetujuan Paralel
- Setiap approver menyimpan status independen (`approval_dosen`, `approval_admin_gedung`)
- Status gabungan dihitung:
  - Keduanya `disetujui` → status booking `dijadwalkan` → kirim email E-Checkin ke PJ
  - Salah satu `ditolak` → status booking `ditolak` → kirim email E-Tolak ke PJ
  - Belum lengkap → status tetap `menunggu_approval`, tidak ada email ke PJ

### RF-05: Mekanisme ACC — Sinkron Email dan Web
- Dosen dapat ACC/tolak via:
  - Link email → `GET/POST /api/bookings/[id]/quick-action?token=...` (existing)
  - Halaman web → `src/app/dosen/review/[id]/page.tsx` (existing)
  - Kedua jalur mengubah kolom `approval_dosen` yang sama → otomatis sinkron
- Admin gedung dapat ACC/tolak via:
  - Link email → **BARU**: `GET/POST /api/bookings/[id]/quick-action-admin?token=...`
  - Halaman web → **BARU**: `src/app/admin/review/[id]/page.tsx`
  - Kedua jalur mengubah kolom `approval_admin_gedung` yang sama → otomatis sinkron

### RF-06: Penolakan Wajib Alasan
- **Tolak via web (dosen)**: Modal di `DosenReviewPage` sudah ada (`rejectReason`, min 10 karakter). Tombol submit disabled jika alasan kosong. Validasi juga di server: `POST /api/bookings/[id]/review` cek `alasan.length < 10`.
- **Tolak via email (dosen)**: Link tolak di email **HARUS DIUBAH**: harus membuka halaman `/dosen/review/[id]?token=...&action=tolak` (halaman ini sudah ada dan sudah menampilkan modal alasan), bukan langsung menolak.
- **Tolak via web (admin gedung)**: Modal baru di halaman `/admin/review/[id]` (sama dengan pola dosen). Min **10 karakter** (dikonfirmasi sama dengan dosen). Validasi di server.
- **Tolak via email (admin gedung)**: Link tolak di email **HARUS** membuka halaman `/admin/review/[id]?token=...&action=tolak` (halaman form alasan, bukan langsung menolak).
- Alasan disimpan terpisah: `alasan_tolak_dosen` dan `alasan_tolak_admin_gedung`
- Validasi wajib dilakukan di **server/API**, bukan hanya di UI
- **Jika salah satu menolak**: Hanya token pihak yang sudah beraksi yang di-expire. Token pihak lain yang masih pending **tetap aktif** tetapi server memblock aksi ACC/tolak jika `status = 'ditolak'`.

### RF-07: Notifikasi Penolakan ke PJ
- Email penolakan ke PJ mencantumkan:
  - Siapa yang menolak: `ditolak_oleh` (`'dosen'` atau `'admin_gedung'`)
  - Alasan penolakan: `alasan_tolak_dosen` atau `alasan_tolak_admin_gedung`
  - Nama approver yang menolak (dari kolom `nama_dosen` atau nama admin gedung)

### RF-08: Chat — Aturan Baru
| Pengirim | Dapat Chat Ke | Mekanisme |
|----------|---------------|-----------|
| User | Admin (AdminDev, Admin SFD, Admin LE, Admin LS) | Search berdasarkan nama akun |
| Dosen | PJ yang berelasi + Admin (via search) | Auto-room PJ-Dosen; Search untuk admin |
| PJ Kelas | Dosen yang berelasi (auto) + Admin (via search) | Auto-create room PJ-Dosen dari relasi; Search untuk admin |
| AdminDev | Semua user (via room list) | Existing |
| Admin SFD/LE/LS | Semua user (via room list) | Sama dengan AdminDev |

**Auto-create room PJ-Dosen:**
- Saat relasi PJ-Dosen dibuat (via `RelasiMataKuliahView.tsx`), sistem otomatis membuat room di `chat_rooms` dengan `room_type = 'pj_to_dosen'`, `user_identifier = pj_nim`, `participant_b_identifier = dosen_identifier`
- Backfill relasi existing: SQL.sql STEP 8d membuat room untuk semua relasi `official_schedules` yang sudah ada

**Search admin:**
- Endpoint baru: `GET /api/chat/search-admin?q=nama` → returns list akun dengan role `admin_dev`, `admin_sfd`, `admin_le`, atau `admin_ls`
- Hasil ditampilkan di sidebar sebagai daftar kontak yang bisa diklik untuk memulai chat

### RF-09: Seeding Akun Admin Gedung
- Akun Admin SFD dengan NIP `980101000101` (12 digit acak, unik — cek bentrok di SQL-1 Blok 4)
- Akun Admin LE dengan NIP `980101000201` (12 digit acak, unik)
- Akun Admin LS dengan NIP `980101000301` (12 digit acak, unik)
- Password awal: `12345678` (hash bcrypt via `pgcrypto.crypt()` langsung di SQL — tidak ada placeholder hash)
- Email diisi di CTE atas SQL-1 Blok 5 (satu tempat) sebelum dijalankan — tidak boleh NULL
- Mapping gedung: hanya SFD aktif sekarang; LE aktif di Rollout LE; LS aktif di fase LS
- Ganti password manual via database sebelum akun diserahkan ke pemilik (force-change-password belum ada — lihat PLAN.md)

---

## 5. Requirement Non-Fungsional

| ID | Requirement |
|----|-------------|
| RNF-01 | Validasi penolakan wajib dilakukan di server (API route), bukan hanya di client (UI) |
| RNF-02 | Email paralel menggunakan `Promise.allSettled` untuk fail-soft (satu gagal tidak memblok lainnya) |
| RNF-03 | Token admin gedung menggunakan mekanisme yang sama dengan token dosen (SHA256 hash, 7 hari expired) |
| RNF-04 | Hanya token pihak yang sudah beraksi (menolak) yang di-expire; token pihak pending tetap aktif namun server block aksi selanjutnya |
| RNF-05 | Semua operasi sensitif dicatat di `email_logs` |
| RNF-06 | Password admin gedung tidak boleh disimpan plaintext; wajib bcrypt hash |
| RNF-07 | Tidak ada perubahan pada fitur/UX yang sudah ada untuk role `user`, `dosen`, `pj_kelas` selain yang disebutkan di PRD ini |
| RNF-08 | Update `approval_dosen` / `approval_admin_gedung` wajib menggunakan operasi atomic (transaction + conditional WHERE `status = 'menunggu_approval' AND approval_xxx = 'pending'`) untuk mencegah race condition saat dua approver merespons bersamaan |
| RNF-09 | Booking berstatus `menunggu_approval` yang melewati tanggal/jam booking dievaluasi sebagai `hangus` oleh `bookingEvaluator.ts` secara lazy saat di-fetch (bukan via cron job). Tidak ada email otomatis untuk transisi hangus dari approval pending |
| RNF-10 | Admin gedung (`admin_sfd/le/ls`) tidak memiliki akses ke `/api/admin/stats`; setelah login langsung diarahkan ke halaman ACC Pengajuan Ruangan (bukan halaman dashboard statistik). `/api/admin/stats` hanya untuk `admin_dev` |

---

## 6. Matriks Hak Akses Per Role

### 6.1 Menu Sidebar Admin

| Menu | AdminDev | Admin SFD | Admin LE | Admin LS |
|------|:--------:|:---------:|:--------:|:--------:|
| Dashboard / Statistik | ✅ | ❌ (langsung ke ACC) | ❌ (langsung ke ACC) | ❌ (langsung ke ACC) |
| ACC Pengajuan Ruangan | ✅ (semua gedung, **view-only tanpa ACC/Tolak**) | ✅ (gedung SFD saja) | ✅ (gedung LE saja) | ✅ (gedung LS saja) |
| Chat (Room List) | ✅ | ✅ | ✅ | ✅ |
| Monitoring Peminjaman Ruang | ✅ | ❌ | ❌ | ❌ |
| Import SIAKAD | ✅ | ❌ | ❌ | ❌ |
| Manajemen Role Akses | ✅ | ❌ | ❌ | ❌ |
| Relasi Mata Kuliah | ✅ | ❌ | ❌ | ❌ |
| Manajemen Akun | ✅ | ❌ | ❌ | ❌ |

### 6.2 Route Protection

| Route | Izin Role |
|-------|-----------|
| `/admin` (semua halaman) | `admin_dev`, `admin_sfd`, `admin_le`, `admin_ls` |
| `/admin/review/[id]` | `admin_sfd`, `admin_le`, `admin_ls` saja — **admin_dev TIDAK memiliki akses** |
| `/api/admin/bookings` GET | `admin_dev` → semua (view-only); `admin_sfd/le/ls` → filter gedung sendiri |
| `/api/admin/bookings/[id]` PUT | `admin_sfd/le/ls` saja → hanya booking di gedungnya (validasi server wajib); **admin_dev tidak boleh PUT** |
| `/api/admin/stats` | `admin_dev` saja |
| `/api/admin/users` | `admin_dev` saja |
| `/api/admin/registrations` | `admin_dev` saja |
| `/api/admin/relations` | `admin_dev` saja |
| `/api/admin/schedules` | `admin_dev` saja |
| `/api/admin/ai/*` | `admin_dev` saja |

### 6.3 Hak Chat

| Role | Chat dengan |
|------|-------------|
| User | Admin (AdminDev, Admin SFD, Admin LE, Admin LS) — via search |
| Dosen | PJ berelasi (auto-room) + Admin (via search) |
| PJ Kelas | Dosen berelasi (auto-room) + Admin (via search) + sesama user biasa |
| AdminDev | Semua room |
| Admin SFD | Semua room |
| Admin LE | Semua room |
| Admin LS | Semua room |

---

## 7. Aturan Penolakan Wajib Alasan (Detail)

### 7.1 Pola Existing (Dosen) — Sebagai Referensi
Implementasi yang sudah ada dan dijadikan pola:
- **Kolom penyimpanan**: `bookings.alasan_tolak` (single column, akan dimigrasikan ke `alasan_tolak_dosen`)
- **Validasi server** (`/api/bookings/[id]/review` POST): `if (!alasan || alasan.trim().length < 10) → 400`
- **Validasi server** (`/api/dosen/bookings/[id]` POST): `if (!alasan || alasan.trim().length < 10) → 400`
- **UI Modal** (`src/app/dosen/review/[id]/page.tsx`): state `rejectReason`, textarea, counter karakter, tombol disabled jika < 10 char, state `rejectError`
- **Link email tolak**: harus membuka halaman review yang sudah punya modal alasan (bukan langsung reject)
- **Email ke PJ** (`E3`): selalu menyertakan `alasan` dalam body email

### 7.2 Implementasi Baru (Admin Gedung) — Mengikuti Pola Dosen
- **Kolom penyimpanan baru**: `bookings.alasan_tolak_admin_gedung` (terpisah dari `alasan_tolak_dosen`)
- **Kolom tambahan**: `bookings.ditolak_oleh`, `bookings.ditolak_at`
- **Validasi server** (`/api/bookings/[id]/quick-action-admin` POST): min **10 karakter** (dikonfirmasi sama dengan dosen)
- **UI Modal** (halaman `/admin/review/[id]`): clone dari `DosenReviewPage`, menggunakan token admin gedung, min 10 char
- **Link email tolak admin gedung**: harus membuka `/admin/review/[id]?token=...&action=tolak` (bukan langsung menolak)
- **Email ke PJ** (template baru E-Tolak-Paralel): menyebutkan nama approver yang menolak + alasannya

### 7.3 Alur Penolakan — Dampak ke Approver Lain
- Jika salah satu menolak → `ditolak_oleh` = `'dosen'` atau `'admin_gedung'`, `status = 'ditolak'`
- **Hanya token pihak yang sudah beraksi yang di-expire** (`token_expires = NOW()` hanya untuk yang menolak)
- Token pihak lain yang masih `pending` **tetap aktif**. Saat link dibuka, halaman menampilkan info booking dengan status ditolak beserta keterangan siapa yang menolak dan alasannya. Tombol ACC/Tolak ditampilkan disabled atau disembunyikan. **Server memblock aksi ACC/tolak** (cek `status = 'ditolak'` → return HTTP 409 + pesan informatif), sehingga data audit tetap bersih.
- Email E-Tolak dikirim ke PJ segera setelah salah satu menolak

---

## 8. Kriteria Penerimaan (Acceptance Criteria)

| ID | Kriteria |
|----|----------|
| AC-01 | Login dengan akun `admin_sfd` berhasil dan diarahkan ke `/admin` dengan sidebar yang hanya menampilkan menu yang diizinkan |
| AC-02 | Akses langsung ke `/api/admin/stats` oleh `admin_sfd` mengembalikan 403 Forbidden |
| AC-03 | Saat PJ submit booking gedung SFD, email dikirim ke dosen DAN admin_sfd secara bersamaan (< 5 detik); AdminDev tidak menerima email |
| AC-04 | Email check-in ke PJ TIDAK dikirim jika baru salah satu yang ACC |
| AC-05 | Email check-in ke PJ DIKIRIM setelah kedua pihak (dosen dan admin gedung) menyetujui |
| AC-06 | Tombol "Tolak" di halaman `/admin/review/[id]` TIDAK dapat di-submit jika alasan kosong atau < 10 karakter |
| AC-07 | `POST /api/bookings/[id]/quick-action-admin` dengan body `{action: "tolak", alasan: "abc"}` (< 10 char) mengembalikan HTTP 400 |
| AC-08 | Link tolak di email admin gedung membuka halaman form alasan, bukan langsung menolak |
| AC-09 | Penolakan oleh dosen: PJ menerima email yang menyebutkan "Dosen [Nama] menolak" dan alasan dosen |
| AC-10 | Penolakan oleh admin gedung: PJ menerima email yang menyebutkan "Admin Gedung [Nama] menolak" dan alasan admin |
| AC-11 | Setelah dosen menolak, link email milik dosen expired; link email milik admin gedung tetap aktif, halaman menampilkan status ditolak + info siapa yang menolak, tombol ACC/Tolak disabled, server return 409 jika aksi dipaksakan |
| AC-12 | PJ Kelas dapat melihat room chat dengan dosen pengampunya tanpa harus memulai chat manual |
| AC-13 | Search admin di sidebar menampilkan akun dengan role admin_dev, admin_sfd, admin_le, admin_ls |
| AC-14 | Akun Admin SFD dapat login dengan password `12345678` |
| AC-15 | Kolom password di database untuk akun Admin SFD/LE/LS adalah bcrypt hash, bukan plaintext |
| AC-16 | PJ dapat melihat status approval per-pihak (sudah ACC/belum/ditolak + alasan) langsung di halaman booking |
| AC-17 | PJ dapat mengajukan ulang setelah ditolak; booking lama tersimpan sebagai riwayat dengan status 'ditolak' |

---

## 9. Asumsi yang Tersisa

1. **Nilai `rooms.gedung`** — diasumsikan `'SFD'`, `'LE'`, `'LS'` berdasarkan analisis kode (`src/app/api/rooms/status/route.ts`). Wajib diverifikasi dengan `SELECT DISTINCT gedung FROM rooms;` sebelum SQL dijalankan.

2. **AdminDev di halaman Monitoring** — diasumsikan hanya melihat (read-only), tidak ada aksi ACC/tolak di Monitoring. Perlu dikonfirmasi saat implementasi Fase 4.

3. **Force-change-password** — belum ada di project. Rekomendasi: ganti password manual via database sebelum akun diserahkan. Implementasi sebagai fase terpisah (lihat PLAN.md Fase 5).
