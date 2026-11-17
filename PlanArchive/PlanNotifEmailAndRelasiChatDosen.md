# 📋 SiRuang — Plan: Notifikasi Email, Relasi Chat Dosen & Fitur Profil

> **Dokumen Perencanaan — Belum Ada Perubahan Kode**  
> Tanggal: 15 November 2026  
> Versi: 1.0

---

## Daftar Isi

1. [Ringkasan Kondisi Saat Ini](#1-ringkasan-kondisi-saat-ini)
2. [Analisis: Chat Dosen ↔ PJ Kelas (Relasi)](#2-analisis-chat-dosen--pj-kelas-relasi)
3. [Sistem Email Notifikasi Lengkap](#3-sistem-email-notifikasi-lengkap)
4. [Fitur Update Profil (Email & WhatsApp Link)](#4-fitur-update-profil-email--whatsapp-link)
5. [Validasi Email Google Aktif](#5-validasi-email-google-aktif)
6. [Daftar Email Template (E1–E10)](#6-daftar-email-template-e1e10)
7. [Rencana Implementasi (Fase)](#7-rencana-implementasi-fase)

---

## 1. Ringkasan Kondisi Saat Ini

### A. Arsitektur Chat (Sudah Ada)

| Komponen | Status | Keterangan |
|---|---|---|
| **Chat PJ Kelas ↔ Admin** | ✅ Sudah ada | Room-based via `chat_rooms` + `chat_messages` di Supabase |
| **Chat Dosen ↔ Admin** | ✅ Sudah ada | Mekanisme sama, Dosen punya `useUserChat.ts` sendiri |
| **Chat PJ Kelas ↔ Dosen** | ❌ Belum ada | Tidak ada mekanisme direct chat PJ ↔ Dosen |
| **Broadcast Admin** | ✅ Sudah ada | Admin bisa kirim pesan ke semua/sebagian user |

**Arsitektur chat saat ini:** Setiap user (PJ/Dosen) punya **1 room** yang terhubung ke Admin. Chat bersifat **user ↔ Admin** saja (1-on-1 via `user_identifier` di `chat_rooms`).

**File terkait:**
- `BackEnd/internal/handlers/chat.go` — GetRooms, SendMessage, Broadcast
- `FrontEnd/src/components/PJKelas/Shared/hooks/useUserChat.ts`
- `FrontEnd/src/components/Dosen/Shared/hooks/useUserChat.ts`
- `FrontEnd/src/components/Admin/Shared/hooks/useAdminChat.ts`

### B. Sistem Email (Sudah Ada - Sebagian)

| Email | Trigger | Status |
|---|---|---|
| **E1** — Notif ke Dosen saat PJ booking (Ada Tombol ACC & Tolak) | PJ submit booking | ✅ Sudah ada |
| **E2** — Notif ke PJ saat Dosen ACC (Ada Tombol Buka Check-in) | Dosen approve booking | ✅ Sudah ada |
| **E3** — Notif ke PJ saat Dosen tolak | Dosen reject booking | ✅ Sudah ada |
| **E4** — Notif check-in ke Dosen | PJ check-in ruangan | ✅ Sudah ada |
| **E5** — Notif check-in ke PJ (konfirmasi) | PJ check-in ruangan | ✅ Sudah ada |
| **E6** — Notif pengajuan akun baru ke Admin (Ada Tombol ACC & Tolak) | Calon user signup | ✅ Sudah ada |
| **E7** — Notif ke user saat akun di-approve admin | Admin approve registrasi | ✅ Sudah ada |
| **E8** — Notif ke user saat akun di-reject admin | Admin reject registrasi | ✅ Sudah ada |
| **E6** — Notif booking hangus | Cron/evaluator | ❌ Belum ada |

**Infrastruktur email sudah siap:**
- `FrontEnd/src/lib/mailer.ts` — Nodemailer + SMTP, retry 3x, logging ke `email_logs`
- Env vars yang **wajib diset** di `.env.local` (local) & Environment Variables Vercel (production):
  ```env
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=emailanda@gmail.com
  SMTP_PASS=xxxx xxxx xxxx xxxx  # 16-digit Google App Password (bukan password login biasa)
  SMTP_FROM_NAME="SiRuang Gedung SFD"
  SMTP_FROM_EMAIL=emailanda@gmail.com
  ```
  *(Catatan: Tanpa variabel ini diset di `.env.local`, nodemailer akan fail-soft dan tidak bisa mengirim email fisik).*
- Tabel `email_logs` di Supabase — tracking status `sent`/`retrying`/`failed`

### C. Profil User (Status Implementasi)

| Halaman Profil | Status API | Status Fitur | Keterangan |
|---|---|---|---|
| `AdminProfile.tsx` | ✅ Terhubung | ✅ Lengkap | Email, Phone, WA Link (`wa.me`), Avatar Upload, Simpan |
| `UserProfile.tsx` | ✅ Terhubung | ✅ Lengkap | Email, Phone, WA Link (`wa.me`), Avatar Upload, Simpan |
| `PjProfile.tsx` | ✅ Terhubung | ✅ Lengkap | Email, Phone, WA Link (`wa.me`), Avatar Upload, Simpan |
| `DosenProfile.tsx` | ✅ Terhubung | ✅ Lengkap | Email, Phone, WA Link (`wa.me`), Avatar Upload, Simpan |

### D. Relasi Mata Kuliah (Sudah Ada)

- Tabel `course_relations` di Supabase
- Menyimpan relasi: `dosen_id`, `pj_id`, `mata_kuliah`, `kelas`, `jadwal_hari`, `jadwal_jam`, `semester`
- Dikelola oleh Admin via `RelasiMataKuliahView.tsx`
- API: `FrontEnd/src/app/api/admin/relations/route.ts`

---

## 2. Analisis: Chat Dosen ↔ PJ Kelas (Relasi)

### Pertanyaan Utama
> Apakah sistem chat PJ ↔ Dosen sebaiknya **dikunci berdasarkan relasi mata kuliah** (`course_relations`), atau **terbuka bebas**?

### Opsi A: Chat Berdasarkan Relasi (Recommended ✅)

**Mekanisme:**
- PJ Kelas hanya bisa chat dengan Dosen yang terhubung via `course_relations`
- Di sidebar chat PJ, muncul daftar Dosen berdasarkan relasi aktif
- Di sidebar chat Dosen, muncul daftar PJ Kelas berdasarkan relasi aktif

**Kelebihan:**
- Mencegah spam — PJ tidak bisa chat dosen sembarangan
- Kontekstual — chat langsung relevan dengan mata kuliah yang bersangkutan
- Privasi dosen — tidak semua mahasiswa bisa menghubungi
- Sesuai konsep SiRuang — sistem booking sudah berbasis relasi

**Kekurangan:**
- Butuh tabel baru `dosen_chat_rooms` / modifikasi `chat_rooms`
- Admin harus setup relasi terlebih dahulu
- Jika relasi belum dibuat, PJ tidak bisa chat Dosen

### Opsi B: Chat Bebas (Tidak Recommended ❌)

**Mekanisme:**
- PJ bisa chat ke semua Dosen terdaftar
- Dosen menerima chat dari semua PJ Kelas

**Kelebihan:**
- Mudah di-implement (extend model `chat_rooms` saja)
- Tidak bergantung pada admin setup relasi

**Kekurangan:**
- Dosen bisa dibanjiri chat dari PJ yang tidak terkait
- Tidak ada konteks mata kuliah
- Tidak sesuai dengan arsitektur SiRuang yang berbasis relasi

### Rekomendasi: **Opsi A — Chat Berdasarkan Relasi**

**Perubahan yang dibutuhkan:**

1. **Tabel baru** `dosen_pj_chats`:
   ```sql
   CREATE TABLE IF NOT EXISTS dosen_pj_chats (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     relation_id INT REFERENCES course_relations(id),
     dosen_id INT NOT NULL,
     pj_id INT NOT NULL,
     last_message TEXT,
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(dosen_id, pj_id, relation_id)
   );
   ```

2. **Tabel `dosen_pj_messages`** (atau reuse `chat_messages` dengan kolom `chat_type`):
   ```sql
   CREATE TABLE IF NOT EXISTS dosen_pj_messages (
     id SERIAL PRIMARY KEY,
     chat_id UUID REFERENCES dosen_pj_chats(id) ON DELETE CASCADE,
     sender_id INT NOT NULL,
     message TEXT NOT NULL,
     message_type message_type DEFAULT 'text',
     is_read BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. **API Routes baru:**
   - `GET /api/dosen/chats` — Daftar PJ yang bisa di-chat (berdasarkan relasi)
   - `GET /api/pj/chats` — Daftar Dosen yang bisa di-chat (berdasarkan relasi)
   - `GET /api/dosen/chats/[chatId]/messages` — Ambil pesan
   - `POST /api/dosen/chats/send` — Kirim pesan

4. **Frontend:**
   - Tab "Chat Dosen" baru di sidebar PJ Kelas (terpisah dari Chat Admin)
   - Tab "Chat PJ Kelas" baru di sidebar Dosen (terpisah dari Chat Admin)
   - Bisa reuse komponen `UserChatMessages`, `UserChatInput`, `UserChatHeader`

---

## 3. Sistem Email Notifikasi Lengkap

### Email yang Sudah Jalan ✅

#### E1 — Notifikasi Pengajuan Booking ke Dosen ✅
**Trigger:** PJ Kelas submit booking baru  
**Penerima:** Dosen pengampu (dari `bookings.dosen_id` → `v_user_profiles.email`)  
**File:** `FrontEnd/src/app/api/bookings/route.ts` (baris 350–387)  
**Konten:**
- Info ruangan, mata kuliah, SKS, waktu pelaksanaan
- Status bersyarat (jika menumpangi jadwal resmi)
- **Link "Tinjau Pengajuan Ruangan"** dengan token verifikasi (berlaku 7 hari)
- Dosen bisa langsung ACC/Tolak dari link di email

#### E2 — Notifikasi Booking Disetujui Dosen ke PJ ✅
**Trigger:** Dosen menyetujui (ACC) pengajuan booking  
**Penerima:** PJ Kelas (dari `bookings.pemohon_id` → `v_user_profiles.email`)  
**File:** `FrontEnd/src/app/api/bookings/[id]/review/route.ts` (baris 211–235)  
**Konten:**
- Info booking disetujui, ruangan & jadwal
- Status denah Kuning (menunggu check-in)
- Instruksi buka Denah Visual / Check-in Ruangan

#### E3 — Notifikasi Booking Ditolak Dosen ke PJ ✅
**Trigger:** Dosen menolak pengajuan booking  
**Penerima:** PJ Kelas (dari `bookings.pemohon_id` → `v_user_profiles.email`)  
**File:** `FrontEnd/src/app/api/bookings/[id]/review/route.ts` (baris 236–261)  
**Konten:**
- Info booking ditolak + **alasan penolakan** dari dosen
- Saran koordinasi ulang dengan dosen

#### E7 — Notifikasi Akun Disetujui Admin ✅
**Trigger:** Admin meng-approve pengajuan registrasi akun  
**Penerima:** User pemohon (dari `registration_requests.email`)  
**File:** `FrontEnd/src/app/api/admin/registrations/[id]/approve/route.ts`  
**Konten:**
- Selamat datang, akun disetujui
- Link "Masuk ke SiRuang"

#### E8 — Notifikasi Akun Ditolak Admin ✅
**Trigger:** Admin menolak pengajuan registrasi akun  
**Penerima:** User pemohon (dari `registration_requests.email` — sudah dihapus dari DB)  
**File:** `FrontEnd/src/app/api/admin/registrations/[id]/reject/route.ts`  
**Konten:**
- Info akun tidak disetujui + catatan admin (opsional)
- Link "Daftar Ulang di SiRuang"

---

### Email yang Perlu Ditambahkan ❌

#### E4 — Notifikasi Check-in ke Dosen ❌ TODO
**Trigger:** PJ Kelas berhasil check-in ruangan  
**Penerima:** Dosen pengampu (dari `bookings.dosen_id` → `v_user_profiles.email`)  
**File target:** `FrontEnd/src/app/api/bookings/[id]/checkin/route.ts`

**Konten email:**
- Info bahwa PJ Kelas sudah check-in
- Detail ruangan, mata kuliah, jam
- Status ruangan sekarang "Merah" (sedang digunakan)

**Perubahan kode:**
```typescript
// Setelah update status booking ke 'berlangsung' berhasil
// Ambil email dosen dari v_user_profiles
const { data: dosenProfile } = await supabaseServer
  .from('v_user_profiles')
  .select('email, full_name, identifier')
  .eq('user_id', booking.dosen_id)
  .maybeSingle();

if (dosenProfile?.email) {
  await sendEmail({
    to: dosenProfile.email,
    subject: `[SiRuang] Check-in Ruangan ${roomKode} — ${booking.mata_kuliah}`,
    template: 'E4',
    relatedId: booking.id,
    html: `...template E4...`,
  });
}
```

#### E5 — Konfirmasi Check-in ke PJ Kelas ❌ TODO
**Trigger:** PJ Kelas berhasil check-in  
**Penerima:** PJ Kelas (dari `bookings.pemohon_id` → `v_user_profiles.email`)  
**File target:** `FrontEnd/src/app/api/bookings/[id]/checkin/route.ts`

**Konten email:**
- Konfirmasi check-in berhasil
- Detail ruangan dan jadwal
- Reminder waktu selesai

#### E6 — Notifikasi Booking Hangus (Tidak Check-in) ❌ TODO
**Trigger:** Cron evaluator menandai booking sebagai hangus (lewat 30 menit tanpa check-in)  
**Penerima:** PJ Kelas + Dosen  
**File target:** `FrontEnd/src/lib/bookingEvaluator.ts` atau `FrontEnd/src/app/api/cron/evaluate-checkins/route.ts`

**Konten email:**
- Info bahwa booking hangus karena tidak check-in
- Detail ruangan dan jadwal
- Reminder untuk booking ulang jika diperlukan

---

### Sumber Email Penerima

| Email | Penerima | Sumber Email | Status |
|---|---|---|---|
| E1 (Booking baru) | Dosen | `v_user_profiles.email` via `dosen_id` | ✅ Done |
| E2 (Dosen ACC) | PJ Kelas | `v_user_profiles.email` via `pemohon_id` | ✅ Done |
| E3 (Dosen Tolak) | PJ Kelas | `v_user_profiles.email` via `pemohon_id` | ✅ Done |
| E4 (Check-in) | Dosen | `v_user_profiles.email` via `booking.dosen_id` | ❌ TODO |
| E5 (Check-in) | PJ Kelas | `v_user_profiles.email` via `booking.pemohon_id` | ❌ TODO |
| E6 (Hangus) | PJ + Dosen | `v_user_profiles.email` via keduanya | ❌ TODO |
| E7 (Akun ACC) | User | `registration_requests.email` | ✅ Done |
| E8 (Akun Tolak) | User | `registration_requests.email` (deleted) | ✅ Done |

> **Semua email bergantung pada field `email` di tabel `profiles`** (ditampilkan via view `v_user_profiles`). Jika user belum mengisi email di profil, notifikasi tidak terkirim (fail-soft).

---

## 4. Fitur Update Profil (Email & WhatsApp Link)

### Kondisi Saat Ini

**Backend (`profiles` tabel + `v_user_profiles` view):**
- ✅ Kolom `email`, `phone`, `whatsapp` sudah ada
- ✅ API `UpdateProfile` sudah validasi email & normalisasi WhatsApp
- ✅ WhatsApp dinormalisasi ke format `62xxxxxxxxx`

**Frontend (`PjProfile.tsx`):**
- ❌ Hanya 4 field: Nama, NIM, Kelas, Email
- ❌ Belum ada field Phone & WhatsApp
- ❌ Belum terhubung ke API backend (masih `useState` lokal hardcoded)
- ❌ Belum ada tombol Save

### Perubahan yang Dibutuhkan

#### A. Frontend — Tambah Field Phone & WhatsApp + Connect API

**File:** `FrontEnd/src/components/Profile/PJ/PjProfile.tsx`

1. **Ambil data profil dari API** saat komponen mount:
   ```typescript
   useEffect(() => {
     fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
       .then(res => res.json())
       .then(data => {
         setName(data.fullName);
         setEmail(data.email);
         setPhone(data.phone);
         setWhatsapp(data.whatsapp);
         // ...
       });
   }, []);
   ```

2. **Tambah field form:**
   - Nomor Telepon (Phone)
   - Nomor WhatsApp (bisa auto-fill dari phone)

3. **Tombol "Simpan Profil"** yang memanggil `PUT /api/profile`:
   ```typescript
   const handleSave = async () => {
     await fetch('/api/profile', {
       method: 'PUT',
       body: JSON.stringify({ fullName, email, phone, whatsapp, faculty }),
     });
   };
   ```

#### B. WhatsApp Link (wa.me)

**Mekanisme konversi nomor → link wa.me:**

Nomor WhatsApp sudah dinormalisasi oleh backend ke format `62xxxxxxxxx`. Frontend cukup menampilkan:

```typescript
const waLink = whatsapp ? `https://wa.me/${whatsapp}` : null;
```

**Dimana ditampilkan:**
- Halaman profil user (diri sendiri)
- Kartu detail booking (untuk admin/dosen melihat kontak PJ)
- Kartu relasi mata kuliah (admin melihat kontak dosen/PJ)

#### C. File yang Perlu Dimodifikasi

| File | Perubahan |
|---|---|
| `PjProfile.tsx` | Tambah field phone & whatsapp, connect ke API, tombol save |
| `DosenProfile.tsx` | Sama — tambah field phone & whatsapp, connect ke API |
| `AdminProfile.tsx` | Sama — tambah field phone & whatsapp, connect ke API |
| `UserProfile.tsx` | Sama — tambah field phone & whatsapp, connect ke API |
| `FrontEnd/src/app/api/profile/route.ts` | Pastikan endpoint GET/PUT sudah benar (kemungkinan sudah ada) |

---

## 5. Validasi Email Google Aktif

### Pertanyaan
> Apakah semua akun wajib menggunakan email Google (@gmail.com) yang aktif?

### Rekomendasi: **Validasi Domain Gmail — Opsional tapi Disarankan**

#### Opsi A: Wajibkan @gmail.com saja
```typescript
// Di service.go atau di frontend
if (!email.endsWith('@gmail.com')) {
  return error('Email harus menggunakan akun Google (@gmail.com)');
}
```

**Pro:** Sederhana, Gmail paling umum di kalangan mahasiswa Indonesia  
**Contra:** Beberapa kampus punya email institusi (contoh: `@mhs.unj.ac.id` yang Google Workspace)

#### Opsi B: Wajibkan Domain Google (Gmail + Google Workspace) ✅ Recommended
```typescript
// Cek MX Record atau izinkan domain yang diketahui
const GOOGLE_DOMAINS = ['gmail.com', 'mhs.unj.ac.id', 'unj.ac.id'];
const domain = email.split('@')[1];
if (!GOOGLE_DOMAINS.includes(domain)) {
  return error('Email harus menggunakan akun Google yang aktif');
}
```

**Pro:** Mengakomodasi email kampus UNJ yang berbasis Google Workspace  
**Contra:** Perlu maintanence daftar domain

#### Opsi C: Tidak Wajibkan — Hanya Validasi Format (Current)
Backend saat ini sudah validasi format email via `net/mail.ParseAddress()`. Tidak ada validasi domain.

### Lokasi Implementasi

| Lokasi | File | Keterangan |
|---|---|---|
| Backend Profile | `BackEnd/internal/profile/service.go` | Validasi saat update email profil |
| Frontend Profile | `PjProfile.tsx`, `DosenProfile.tsx`, dll | Tampilkan error jika bukan Gmail |
| Registrasi | Form sign-up di frontend | Wajibkan email aktif saat daftar |
| Registration Request | `registration_requests` tabel | Kolom `email` sudah ada |

---

## 6. Daftar Email Template (E1–E10)

| Kode | Nama | Status | Trigger | Penerima |
|---|---|---|---|---|
| **E1** | Pengajuan Booking ke Dosen | ✅ Done | PJ submit booking | Dosen |
| **E2** | Booking Disetujui Dosen | ✅ Done | Dosen approve | PJ Kelas |
| **E3** | Booking Ditolak Dosen | ✅ Done | Dosen reject | PJ Kelas |
| **E4** | Check-in Berhasil ke Dosen | ✅ Done | PJ check-in | Dosen |
| **E5** | Konfirmasi Check-in ke PJ | ✅ Done | PJ check-in | PJ Kelas |
| **E6** | Booking Hangus (Tidak Check-in) | ❌ TODO | Cron evaluator | PJ + Dosen |
| **E7** | Akun Disetujui Admin | ✅ Done | Admin approve reg | User |
| **E8** | Akun Ditolak Admin | ✅ Done | Admin reject reg | User |
| **E9** | Reminder Check-in (H-15 menit) | ❌ Opsional | Cron timer | PJ Kelas |
| **E10** | Booking Selesai | ❌ Opsional | Evaluator selesai | PJ + Dosen |

---

## 7. Rencana Implementasi (Fase)

### Fase 1 — Profil Update + WhatsApp Link (Prioritas Tinggi)
**Estimasi: 1–2 sesi kerja**

- [ ] Connect `PjProfile.tsx` ke API backend (`/api/profile`)
- [ ] Tambah field Phone & WhatsApp di form profil
- [ ] Tambah tombol "Simpan" dengan feedback toast
- [ ] Konversi nomor WhatsApp → link `https://wa.me/xxxxx` 
- [ ] Lakukan hal yang sama untuk `DosenProfile.tsx`, `AdminProfile.tsx`, `UserProfile.tsx`
- [ ] Validasi email format Google (Opsi B) di frontend + backend

### Fase 2 — Email Notifikasi Check-in (Prioritas Tinggi)
**Estimasi: 1 sesi kerja**

- [ ] Implementasi E4 — email ke Dosen saat PJ check-in
- [ ] Implementasi E5 — email konfirmasi ke PJ saat check-in berhasil
- [ ] Implementasi E6 — email booking hangus ke PJ + Dosen
- [ ] Testing SMTP dengan semua template baru

### Fase 3 — Chat Dosen ↔ PJ Kelas (Prioritas Sedang)
**Estimasi: 3–4 sesi kerja**

- [ ] Buat tabel `dosen_pj_chats` + `dosen_pj_messages` di Supabase
- [ ] Buat API routes untuk chat PJ ↔ Dosen (berdasarkan `course_relations`)
- [ ] Buat hook `useDosenPjChat.ts` (bisa extend dari `useUserChat.ts`)
- [ ] Tambah UI "Chat Dosen" di sidebar PJ Kelas
- [ ] Tambah UI "Chat PJ Kelas" di sidebar Dosen
- [ ] Realtime subscription via Supabase Realtime

### Fase 4 — Email Opsional + Polish (Prioritas Rendah)
**Estimasi: 1 sesi kerja**

- [ ] E9 — Reminder check-in (cron H-15 menit)
- [ ] E10 — Notifikasi booking selesai
- [ ] Email template styling yang konsisten (brand color `#183449`, `#588CBC`)
- [ ] Dashboard admin: monitoring email_logs

---

> **⚠️ Catatan:** Dokumen ini adalah **perencanaan saja**. Tidak ada kode yang diubah. Implementasi dimulai setelah diskusi dan persetujuan.

