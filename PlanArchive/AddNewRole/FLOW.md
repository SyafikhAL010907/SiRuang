# FLOW.md — Diagram Alur Fitur Tambah Role Baru (SiRuang)

> **Status:** Dokumen perencanaan — read-only, belum diimplementasikan.
> **Referensi file asli:** lihat `PLAN.md` dan `PRD.md` di folder yang sama.
> **Terakhir diperbarui:** 2026-11-21 (revisi: fokus SFD dulu, 2 file SQL, rollout LE, LS ditunda)

---

## 1. Alur Booking Baru (Paralel Approval)

Alur lama: `PJ → Dosen → Admin (sequential)`.
Alur baru: `PJ → Dosen + Admin Gedung (paralel)` → gate keduanya → check-in.
**AdminDev tidak terlibat dalam alur approval sama sekali.**

```mermaid
flowchart TD
    A["PJ Kelas mengisi form booking\n(src/app/pj/booking/page.tsx)"]
    B["POST /api/bookings\n(src/app/api/bookings/route.ts)"]
    C{"Validasi booking\n(slot, ruangan, konflik)"}
    D["INSERT bookings\nstatus = 'menunggu_approval'\napproval_dosen = 'pending'\napproval_admin_gedung = 'pending'\nLookup admin gedung:\nrooms.gedung → admin_gedung_mapping"]

    E["Kirim Email E1-DOSEN\nke dosen pengampu\n(mailer.ts)"]
    F["Kirim Email E1-ADMIN\nke Admin Gedung terkait\n(admin_sfd / admin_le / admin_ls\nsesuai rooms.gedung → admin_gedung_mapping)\nEmail dari profiles.email via v_user_profiles\n⚠️ Fase awal: hanya SFD aktif di mapping\n(mailer.ts)"]

    G["Dosen menerima email\nberisi link ACC dan link Tolak"]
    H["Admin Gedung menerima email\nberisi link ACC dan link Tolak\n(AdminDev TIDAK menerima email ini)"]

    I["Dosen mengambil keputusan"]
    J["Admin Gedung mengambil keputusan"]

    K["approval_dosen = 'disetujui'\ndosen_responded_at_v2 = NOW()"]
    L["approval_dosen = 'ditolak'\nalasan_tolak_dosen diisi wajib min 10 char\nditolak_oleh = 'dosen'\nditolak_at = NOW()\nToken dosen di-expire"]
    M["approval_admin_gedung = 'disetujui'\nadmin_gedung_responded_at = NOW()"]
    N["approval_admin_gedung = 'ditolak'\nalasan_tolak_admin_gedung diisi wajib min 10 char\nditolak_oleh = 'admin_gedung'\nditolak_at = NOW()\nToken admin gedung di-expire"]

    O{"Cek status gabungan\n(bookingEvaluator.ts)"}

    P{"Salah satu = ditolak?"}
    Q["UPDATE bookings\nstatus = 'ditolak'\nHanya token PIHAK YANG SUDAH BERAKSI\nyang di-expire.\nToken pihak lain yang masih pending\nTETAP AKTIF."]
    R["Kirim Email E-REJECT ke PJ\nberisi: siapa menolak + alasan\n(mailer.ts)"]
    R2["Server BLOCK aksi dari pihak\nyang masih pending:\njika status booking = 'ditolak',\nserver return pesan informatif"]

    S{"Keduanya = disetujui?"}
    T["UPDATE bookings\nstatus = 'dijadwalkan'\nINSERT check-in token\n(checkinToken.ts)"]
    U["Kirim Email E-CHECKIN ke PJ\nberisi link check-in\n(mailer.ts)"]

    V["Status tetap 'menunggu_approval'\nTidak ada email ke PJ\nTunggu approver lain\n⚠️ Jika jam booking terlewat → bookingEvaluator.ts\nmengevaluasi status menjadi 'hangus' saat di-fetch (lazy)"]

    A --> B --> C
    C -->|"Gagal validasi"| A
    C -->|"Valid"| D
    D --> E & F
    E --> G --> I
    F --> H --> J
    I -->|"ACC"| K
    I -->|"Tolak + alasan wajib"| L
    J -->|"ACC"| M
    J -->|"Tolak + alasan wajib"| N
    K --> O
    L --> O
    M --> O
    N --> O
    O --> P
    P -->|"Ya"| Q --> R --> R2
    P -->|"Tidak"| S
    S -->|"Ya"| T --> U
    S -->|"Belum lengkap"| V
```

---

## 2. Alur ACC — Sinkron Email & Web

Baik via email (token link) maupun via halaman web, keduanya menulis ke **kolom yang sama** di tabel `bookings` sehingga status selalu sinkron otomatis.

```mermaid
flowchart TD
    subgraph DOSEN["JALUR DOSEN"]
        D1["Email E1-DOSEN diterima\nberisi: link ACC dan link Tolak"]
        D2["Klik link ACC di email\nGET /api/bookings/id/review\n?token=...&action=setuju\n(bookings/id/review/route.ts — existing)"]
        D3["Buka halaman web\n/dosen/review/id\n(dosen/review/id/page.tsx — existing)"]
        D4["Klik tombol Setujui\nPOST /api/dosen/bookings/id\n{ action: 'approve' }"]
        D5["UPDATE bookings\nSET approval_dosen = 'disetujui'\ndosen_responded_at_v2 = NOW()"]
    end

    subgraph ADMIN_G["JALUR ADMIN GEDUNG (admin_sfd / admin_le / admin_ls)"]
        AG1["Email E1-ADMIN diterima\nberisi: link ACC dan link Tolak"]
        AG2["Klik link ACC di email\nGET /api/bookings/id/quick-action-admin\n?token=...&action=setuju\n(route BARU — mirror quick-action dosen)"]
        AG3["Buka halaman web\n/admin/review/id\n(halaman BARU — mirror dosen/review)"]
        AG4["Klik tombol Setujui\nPOST /api/admin/bookings/id\n{ action: 'approve' }"]
        AG5["UPDATE bookings\nSET approval_admin_gedung = 'disetujui'\nadmin_gedung_responded_at = NOW()"]
    end

    GATE{"Cek gabungan:\napproval_dosen = 'disetujui'\nDAN\napproval_admin_gedung = 'disetujui'?\n⚠️ Update wajib atomic:\ntransaction + WHERE status='menunggu_approval'\nAND approval_xxx='pending'\nuntuk cegah race condition"}
    NEXT["Lanjut ke alur dijadwalkan\n→ Email check-in ke PJ"]
    WAIT["Tunggu approver lain\n(tidak ada email ke PJ)"]

    D1 --> D2 --> D5
    D1 --> D3 --> D4 --> D5
    AG1 --> AG2 --> AG5
    AG1 --> AG3 --> AG4 --> AG5
    D5 --> GATE
    AG5 --> GATE
    GATE -->|"Keduanya disetujui"| NEXT
    GATE -->|"Salah satu masih pending"| WAIT
```

> [!NOTE]
> `approval_dosen` dan `approval_admin_gedung` adalah kolom di tabel `bookings` (rencana migrasi di `SQL.sql`).
> Karena keduanya menulis ke kolom yang sama, jalur email dan web selalu sinkron tanpa logika tambahan.

---

## 3. Alur Penolakan Wajib Alasan

**Ketentuan penting:**
- Alasan wajib min **10 karakter** untuk dosen maupun admin gedung (dikonfirmasi).
- Link Tolak di email **tidak langsung menolak** — selalu redirect ke halaman form alasan.
- Validasi di **dua lapis**: UI (tombol disabled) + Server (return 400).
- Hanya token **pihak yang sudah beraksi** yang di-expire. Token pihak yang belum klik tetap aktif, tapi server block aksi jika status booking sudah `ditolak`.

### 3.1 Penolakan oleh Dosen

```mermaid
flowchart TD
    subgraph EMAIL_D["Via Link Email (Dosen)"]
        ED1["Dosen klik link Tolak di email"]
        ED2["Redirect ke /dosen/review/id?action=tolak\n(dosen/review/id/page.tsx — existing)"]
        ED3["Modal alasan muncul otomatis\n(karena query param action=tolak)"]
        ED4["Dosen mengisi textarea alasan\n(min 10 karakter — UI counter)"]
        ED5{"Validasi UI:\nalasan.trim().length >= 10?"}
        ED6["Tombol Submit diaktifkan\nDosen klik Submit"]
        ED7["POST /api/bookings/id/review\n{ action: 'tolak', alasan: '...' }\n(bookings/id/review/route.ts)"]
    end

    subgraph WEB_D["Via Halaman Web (Dosen)"]
        WD1["Dosen buka /dosen/review/id"]
        WD2["Klik tombol Tolak"]
        WD3["Modal alasan muncul\n(dosen/review/id/page.tsx)"]
        WD4["Dosen mengisi alasan\n(min 10 karakter)"]
        WD5{"Validasi UI:\nalasan.trim().length >= 10?"}
        WD6["Klik Submit"]
        WD7["POST /api/dosen/bookings/id\n{ action: 'tolak', alasan: '...' }"]
    end

    SV_D["Validasi Server:\nalasan wajib + min 10 char\n→ 400 jika gagal"]
    DB_D["UPDATE bookings\nSET approval_dosen = 'ditolak'\nalasan_tolak_dosen = alasan\nditolak_oleh = 'dosen'\nditolak_at = NOW()\nstatus = 'ditolak'\ndosen_token_expires = NOW()"]
    EMAIL_PJ_D["Kirim Email E-REJECT ke PJ\n'Pengajuan ditolak oleh Dosen [Nama]'\n+ alasan_tolak_dosen\n(mailer.ts)"]
    INFO["Token pihak lain (admin gedung)\nTETAP AKTIF.\nSaat link dibuka → halaman tampilkan:\n'Booking ditolak oleh Dosen [Nama] — alasan: ...'\nTombol ACC/Tolak disabled/hidden.\nServer block aksi (cek status='ditolak' → HTTP 409 + pesan informatif)"]

    ED1 --> ED2 --> ED3 --> ED4 --> ED5
    ED5 -->|"Tidak — tombol disabled"| ED4
    ED5 -->|"Ya"| ED6 --> ED7 --> SV_D
    WD1 --> WD2 --> WD3 --> WD4 --> WD5
    WD5 -->|"Tidak — tombol disabled"| WD4
    WD5 -->|"Ya"| WD6 --> WD7 --> SV_D
    SV_D -->|"Valid"| DB_D --> EMAIL_PJ_D --> INFO
    SV_D -->|"Gagal validasi"| ERR_D["Return 400 Bad Request\nUI tampilkan pesan error"]
```

### 3.2 Penolakan oleh Admin Gedung

Pola identik dengan dosen. Min alasan juga **10 karakter** (dikonfirmasi sama dengan dosen).

```mermaid
flowchart TD
    subgraph EMAIL_AG["Via Link Email (Admin Gedung)"]
        EAG1["Admin Gedung klik link Tolak di email"]
        EAG2["Redirect ke /admin/review/id?action=tolak\n(halaman BARU — lihat PLAN.md Fase 3)"]
        EAG3["Modal alasan muncul otomatis\n(karena query param action=tolak)"]
        EAG4["Admin Gedung mengisi textarea alasan\n(min 10 karakter — UI counter)"]
        EAG5{"Validasi UI:\nalasan.trim().length >= 10?"}
        EAG6["Klik Submit"]
        EAG7["POST /api/bookings/id/quick-action-admin\n{ action: 'tolak', alasan: '...', token: '...' }\n(route BARU)"]
    end

    subgraph WEB_AG["Via Halaman Web (Admin Gedung)"]
        WAG1["Admin Gedung buka /admin/bookings\n(BookingManagementView.tsx — dimodifikasi)"]
        WAG2["Klik tombol Tolak pada baris booking"]
        WAG3["Modal alasan muncul\n(pola BookingManagementView)"]
        WAG4["Mengisi alasan (min 10 karakter)"]
        WAG5{"Validasi UI:\nalasan.trim().length >= 10?"}
        WAG6["Klik Submit"]
        WAG7["POST /api/admin/bookings/id\n{ action: 'tolak', alasan: '...' }\n(admin/bookings/id/route.ts)"]
    end

    SV_AG["Validasi Server:\nalasan wajib + min 10 char\n→ 400 jika gagal"]
    DB_AG["UPDATE bookings\nSET approval_admin_gedung = 'ditolak'\nalasan_tolak_admin_gedung = alasan\nditolak_oleh = 'admin_gedung'\nditolak_at = NOW()\nstatus = 'ditolak'\nadmin_gedung_token_expires = NOW()"]
    EMAIL_PJ_AG["Kirim Email E-REJECT ke PJ\n'Pengajuan ditolak oleh Admin Gedung [Nama]'\n+ alasan_tolak_admin_gedung\n(mailer.ts)"]
    INFO_AG["Token pihak lain (dosen)\nTETAP AKTIF.\nSaat link dibuka → halaman tampilkan:\n'Booking ditolak oleh Admin Gedung [Nama] — alasan: ...'\nTombol ACC/Tolak disabled/hidden.\nServer block aksi (cek status='ditolak' → HTTP 409 + pesan informatif)"]

    EAG1 --> EAG2 --> EAG3 --> EAG4 --> EAG5
    EAG5 -->|"Tidak"| EAG4
    EAG5 -->|"Ya"| EAG6 --> EAG7 --> SV_AG
    WAG1 --> WAG2 --> WAG3 --> WAG4 --> WAG5
    WAG5 -->|"Tidak"| WAG4
    WAG5 -->|"Ya"| WAG6 --> WAG7 --> SV_AG
    SV_AG -->|"Valid"| DB_AG --> EMAIL_PJ_AG --> INFO_AG
    SV_AG -->|"Gagal"| ERR_AG["Return 400 Bad Request"]
```

> [!IMPORTANT]
> **Dua lapis validasi wajib:** UI (tombol disabled) + Server (return 400).
> **Link Tolak di email tidak langsung menolak** — selalu redirect ke halaman form alasan.
> **Hanya token pihak yang sudah beraksi yang di-expire** — token pihak lain tetap aktif.
> Referensi pola existing: `src/app/api/bookings/id/review/route.ts` dan `src/app/dosen/review/id/page.tsx`.

---

## 4. Alur Chat Per Role

Berdasarkan analisis `BackEnd/internal/models/chat.go` dan `BackEnd/internal/handlers/chat.go`.

```mermaid
flowchart TD
    LOGIN["User Login\n→ role terdeteksi dari JWT\n(BackEnd/internal/middleware/auth.go)"]

    LOGIN --> R_USER["Role: user"]
    LOGIN --> R_DOSEN["Role: dosen"]
    LOGIN --> R_PJ["Role: pj_kelas"]
    LOGIN --> R_ADMIN["Role: admin_dev\nadmin_sfd / admin_le / admin_ls"]

    subgraph CHAT_USER["Chat — User Biasa"]
        U1["Buka sidebar chat (/user/chat)"]
        U2["Gunakan fitur Search\n(cari nama akun admin)\nEndpoint: GET /api/chat/search-admin?q=nama"]
        U3["Pilih admin dari hasil search\n(admin_dev, admin_sfd, admin_le, atau admin_ls)"]
        U4["Sistem cek: room sudah ada?\nquery chat_rooms:\nWHERE user_identifier = pemilik\nAND participant_b_identifier = admin_id\nAND room_type = 'user_to_admin'"]
        U5{"Room sudah ada?"}
        U6["Buka room yang sudah ada"]
        U7["INSERT chat_rooms baru\nroom_type = 'user_to_admin'\nparticipant_b_identifier = admin_id\nparticipant_b_role = 'admin_dev'/'admin_sfd'/'admin_le'/'admin_ls'"]
        U8["Mulai kirim pesan"]
    end

    subgraph CHAT_DOSEN["Chat — Dosen"]
        DOS1["Buka sidebar chat (/dosen/chat)"]
        DOS2["Tab: 'PJ Berelasi'\nauto-room dari relasi mata kuliah\nroom_type = 'pj_to_dosen'"]
        DOS3["Room PJ-Dosen dibuat otomatis\nsaat admin membuat relasi di\nRelasiMataKuliahView.tsx\n(atau di-backfill via SQL.sql STEP 8d)"]
        DOS4["Tab: 'Pesan Baru'\nSearch admin via nama\n(admin_dev, admin_sfd, admin_le, admin_ls)"]
        DOS5["Pilih admin → buka/buat room\nroom_type = 'user_to_admin'"]
    end

    subgraph CHAT_PJ["Chat — PJ Kelas"]
        PJ1["Buka sidebar chat (/pj/chat)"]
        PJ2["Tab: 'Dosen Saya'\nauto-room dari relasi mata kuliah\nroom_type = 'pj_to_dosen'"]
        PJ3["Tab: 'Chat Umum'\nchat biasa dengan sesama user\nroom_type = 'general'"]
        PJ4["Tab: 'Pesan Baru'\nSearch admin atau user lain"]
    end

    subgraph CHAT_ADMIN["Chat — Admin (semua tipe)"]
        ADM1["Buka sidebar chat (/admin/chat)"]
        ADM2["Lihat semua room yang melibatkan akun ini\nchat_rooms:\nWHERE participant_b_identifier = admin_identifier\nOR user_identifier = admin_identifier\n(admin_dev juga melihat room lama:\nparticipant_b_identifier IS NULL)"]
        ADM3["Balas pesan masuk\n(tidak ada batasan siapa yang dibalas)"]
    end

    R_USER --> CHAT_USER
    R_DOSEN --> CHAT_DOSEN
    R_PJ --> CHAT_PJ
    R_ADMIN --> CHAT_ADMIN

    U1 --> U2 --> U3 --> U4 --> U5
    U5 -->|"Ya"| U6 --> U8
    U5 -->|"Tidak"| U7 --> U8

    DOS1 --> DOS2 --> DOS3
    DOS1 --> DOS4 --> DOS5

    PJ1 --> PJ2
    PJ1 --> PJ3
    PJ1 --> PJ4

    ADM1 --> ADM2 --> ADM3
```

> [!NOTE]
> **Auto-room PJ-Dosen:** Dibuat saat relasi disimpan di `RelasiMataKuliahView.tsx`.
> **Backfill relasi existing:** SQL.sql STEP 8d membuat room PJ-dosen untuk semua relasi `official_schedules` yang sudah ada.
> **Room lama (menunjuk ke admin_dev):** Tetap valid — akun admin lama hanya di-rename role-nya, tidak dihapus.
> **Search admin:** Mengembalikan semua akun dengan role `admin_dev`, `admin_sfd`, `admin_le`, `admin_ls`.

---

## 5. Alur Hak Akses Menu (Sidebar & Route Guard)

Berdasarkan `src/lib/roleNavigation.ts`, `src/middleware.ts`, dan `src/components/Admin/Web&Tab/components/AdminSidebar.tsx`.

```mermaid
flowchart TD
    LOGIN2["User berhasil login\nJWT diterima di cookie 'auth-token'\n(BackEnd/internal/middleware/auth.go)"]
    DECODE["Decode JWT → ambil role\n(src/middleware.ts — Next.js)"]

    DECODE --> SW{"Switch role\n(src/lib/roleNavigation.ts)"}

    SW -->|"admin_dev"| ADV["Redirect ke /admin/dashboard"]
    SW -->|"admin_sfd"| ASFD["Redirect ke /admin/bookings\n(halaman ACC Pengajuan langsung,\nbukan stats/dashboard)"]
    SW -->|"admin_le"| ALE["Redirect ke /admin/bookings\n(halaman ACC Pengajuan langsung,\nbukan stats/dashboard)"]
    SW -->|"admin_ls"| ALS["Redirect ke /admin/bookings\n(halaman ACC Pengajuan langsung,\nbukan stats/dashboard)"]
    SW -->|"dosen"| DOS_R["Redirect ke /dosen/dashboard"]
    SW -->|"pj_kelas"| PJ_R["Redirect ke /pj/dashboard"]
    SW -->|"user"| USR_R["Redirect ke /user/dashboard"]

    ADV --> SIDEBAR_DEV["AdminSidebar.tsx — admin_dev:\n✅ Dashboard\n✅ Monitoring Peminjaman Ruang\n✅ Import SIAKAD\n✅ Manajemen Akun\n✅ Manajemen Role Akses\n✅ Relasi Mata Kuliah\n✅ ACC Pengajuan Ruangan (semua gedung — VIEW-ONLY, tanpa tombol ACC/Tolak)\n✅ Chat"]

    ASFD --> SIDEBAR_SFD["AdminSidebar.tsx — admin_sfd:\n✅ ACC Pengajuan Ruangan (gedung SFD — dapat ACC/Tolak)\n✅ Chat\n❌ Monitoring (hidden)\n❌ Import SIAKAD (hidden)\n❌ Manajemen Role Akses (hidden)\n❌ Relasi Mata Kuliah (hidden)\n❌ Manajemen Akun (hidden)"]

    ALE --> SIDEBAR_LE["AdminSidebar.tsx — admin_le:\n✅ ACC Pengajuan Ruangan (gedung LE — dapat ACC/Tolak)\n✅ Chat\n❌ Semua menu AdminDev (hidden)"]

    ALS --> SIDEBAR_LS["AdminSidebar.tsx — admin_ls:\n✅ ACC Pengajuan Ruangan (gedung LS — dapat ACC/Tolak)\n✅ Chat\n❌ Semua menu AdminDev (hidden)"]

    SIDEBAR_DEV --> ROUTE_CHECK["Route Guard\n(src/middleware.ts)"]
    SIDEBAR_SFD --> ROUTE_CHECK
    SIDEBAR_LE --> ROUTE_CHECK
    SIDEBAR_LS --> ROUTE_CHECK

    ROUTE_CHECK --> PROT{"Akses route yang dilindungi?"}

    PROT --> PROT_ADV{"Route khusus AdminDev?\n/admin/import-siakad\n/admin/role-access\n/admin/monitoring\n/api/admin/stats\n/api/admin/users\n/api/admin/relations\n/api/admin/schedules"}
    PROT_ADV -->|"Role = admin_dev"| ALLOW["✅ Izinkan akses\n(render halaman)"]
    PROT_ADV -->|"Role = admin_sfd / admin_le / admin_ls"| DENY["❌ Redirect ke /admin/bookings\natau return 403\n(src/middleware.ts)"]
    PROT_ADV -->|"Bukan role admin"| DENY2["❌ Redirect ke /login\natau halaman role masing-masing"]

    PROT --> PROT_REV{"Route review admin gedung?\n/admin/review/[id]"}
    PROT_REV -->|"Role = admin_sfd / admin_le / admin_ls"| ALLOW_REV["✅ Izinkan akses\n(form ACC/Tolak dengan alasan)"]
    PROT_REV -->|"Role = admin_dev"| DENY_REV["❌ Redirect ke /admin/bookings\natau return 403\n(admin_dev view-only, tidak ada form review)"]
    PROT_REV -->|"Bukan role admin"| DENY2
```

> [!IMPORTANT]
> **Tiga lapis perlindungan wajib diimplementasikan:**
> 1. **UI**: Menu disembunyikan di `AdminSidebar.tsx` berdasarkan role dari context/session.
> 2. **Route Guard**: `src/middleware.ts` cek role dari JWT sebelum render halaman.
> 3. **API Server**: Setiap endpoint `/api/admin/*` wajib verifikasi role + validasi gedung di server.
>
> Filter ACC Pengajuan untuk `admin_sfd`/`admin_le`/`admin_ls`: query booking di-filter
> berdasarkan `rooms.gedung` yang sesuai `admin_gedung_mapping` untuk admin login tersebut.

---

## 6. Alur Seeding Akun Admin Gedung

```mermaid
flowchart LR
    A["Jalankan STEP 0 di SQL.sql:\nSELECT DISTINCT gedung FROM rooms\nKonfirmasi nilai gedung aktual"]
    B["Generate bcrypt hash 3x\npassword '12345678'\n(1 hash per akun, salt berbeda)\ngo run gen_hash.go atau Node.js"]
    C["Jalankan STEP 6 di SQL.sql:\nCek bentrok NIP dulu\n(hasil harus 0 baris)"]
    D["Jalankan STEP 7 di SQL.sql:\nINSERT 3 akun:\nAdmin SFD (NIP: 980101000101)\nAdmin LE (NIP: 980101000201)\nAdmin LS (NIP: 980101000301)"]
    E["Jalankan STEP 7b di SQL.sql:\nINSERT admin_gedung_mapping:\nSFD → 'SFD', LE → 'LE', LS → 'LS'"]
    F["Verifikasi hasil:\nSELECT username, role, gedung_kode\nFROM admin_gedung_mapping\nJOIN authentication"]
    G["Ganti password manual\nsebelum akun diserahkan\n(force-change-password belum ada\n— lihat PLAN.md Fase 5)"]

    A --> B --> C --> D --> E --> F --> G
```

> **Cara generate hash bcrypt dari `12345678`:**
> ```bash
> # Node.js (jalankan 3x, hasilkan hash berbeda tiap run)
> node -e "const b=require('bcryptjs'); b.hash('12345678',10).then(h=>console.log(h))"
>
> # Go (via BackEnd project)
> cd BackEnd && go run gen_hash.go
> ```
> Hash asli **harus di-generate saat implementasi** — jangan pakai hash contoh/placeholder.

---

## Ringkasan Keterkaitan Alur

```mermaid
flowchart LR
    ROLE["Role System\n(user_role enum)\nadmin_dev, admin_sfd\nadmin_le, admin_ls"] --> ACCESS["Hak Akses Menu\n(Alur 5)"]
    ROLE --> CHAT["Aturan Chat\n(Alur 4)"]
    ROLE --> BOOKING["Alur Booking Paralel\n(Alur 1)"]
    BOOKING --> ACC["Jalur ACC\n(Alur 2)"]
    BOOKING --> TOLAK["Jalur Tolak\n(Alur 3)"]
    ACC --> CHECKIN["Email Check-in ke PJ\n(keduanya harus ACC)"]
    TOLAK --> NOTIF["Email Penolakan ke PJ\n(siapa menolak + alasan)"]
```

---

## Fase Rollout Gedung

```mermaid
flowchart LR
    SQL1["SQL-1 dijalankan\nBlok 5b: hanya SFD aktif di mapping"]
    SFD["✅ SFD AKTIF\nAdmin SFD menerima email\nfilter booking gedung SFD\n(dari admin_gedung_mapping)"]
    LE["⏳ Rollout LE\nSetelah SFD lolos test:\n1. Tambah ruangan LE di rooms\n2. Aktifkan baris LE di Blok 5b SQL-1\n3. Konfirmasi tidak ada hardcode SFD di kode"]
    LS["🚫 LS Ditunda\nAkun admin_ls sudah ter-seed\nAktif saat ada denah/ruangan LS"]

    SQL1 --> SFD --> LE --> LS
```

> [!NOTE]
> Email admin gedung selalu diambil dari `profiles.email` via `v_user_profiles`.
> Tidak ada hardcode `'SFD'` di kode — gedung dibaca dari `admin_gedung_mapping` berdasarkan akun admin yang login.
> Status `dibatalkan`, `dibatalkan_prioritas`, `kedaluwarsa` = terminal; tidak di-evaluate ulang ke `hangus` oleh `bookingEvaluator.ts`.

---

*Dokumen ini adalah bagian dari paket perencanaan fitur Tambah Role Baru.*
*File terkait: `PLAN.md` | `PRD.md` | `SQL.sql`*
*Semua nama file, route, tabel, dan kolom mengacu pada struktur nyata project SiRuang hasil analisis.*
