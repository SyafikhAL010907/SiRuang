# FLOW — Chat Room Per Role (Revisi 3)
**File:** `PlanArchive/ChatRoomPerRole/FLOW.md`
**Dibuat:** 2026-11-22 | **Diperbarui:** 2026-11-22
**Referensi:** PLAN.md (Revisi 3), SQL.sql (Revisi 3)

---

## Daftar Diagram
1. [Room Per Role — Kepemilikan](#diagram-1-room-per-role--kepemilikan)
2. [Auto-Create Room Saat Login/Mount](#diagram-2-auto-create-room-saat-loginmount)
3. [Alur Search Admin Gedung](#diagram-3-alur-search-admin-gedung)
4. [Alur AdminDev Search & Inisiasi](#diagram-4-alur-admindev-search--inisiasi)
5. [Alur Kirim Pesan dan Update Preview](#diagram-5-alur-kirim-pesan-dan-update-preview)
6. [Validasi Akses Admin Gedung](#diagram-6-validasi-akses-admin-gedung)
7. [Realtime Multi-Room (Subscription)](#diagram-7-realtime-multi-room--subscription)
8. [Masa Transisi Format `dosen:NIP:NIM`](#diagram-8-masa-transisi-format-dosenipnim)
9. [Alur Deduplication Room](#diagram-9-alur-deduplication-room)
10. [Bug Preview — Sebelum dan Sesudah Fix](#diagram-10-bug-preview--sebelum-dan-sesudah-fix)
11. [Fungsi Atomik get_or_create_room](#diagram-11-fungsi-atomik-get_or_create_room)
12. [Label Matkul Gabungan per Pasangan PJ-Dosen](#diagram-12-label-matkul-gabungan-per-pasangan-pj-dosen)

---

## Diagram 1: Room Per Role — Kepemilikan

```mermaid
flowchart TD
    subgraph Roles["Aktor / Role"]
        U["👤 User Biasa"]
        PJ["🎓 PJ Kelas"]
        D["📚 Dosen"]
        AG["🏢 Admin Gedung\n(SFD / LE / LS)"]
        AD["⚙️ AdminDev"]
    end

    subgraph RoomTypes["Jenis Room"]
        R1["user_to_admin\n(user ↔ AdminDev)\narah: user=sisi A, AdminDev=sisi B"]
        R2["pj_to_dosen\narah: NIM_PJ=sisi A, NIP_Dosen=sisi B\nsatu per pasangan DISTINCT\nlabel: STRING_AGG matkul"]
        R3["user_to_building_admin\n(via search)\narah: user=sisi A, AG=sisi B\npart_b_id = identifier AG"]
    end

    U -- "1 room utama\notomatis" --> R1
    U -- "via search\ncreated_by=NIM_User" --> R3

    PJ -- "1 room utama\notomatis" --> R1
    PJ -- "N room, otomatis\nper DISTINCT dosen\ndari course_relations" --> R2
    PJ -- "via search\ncreated_by=NIM_PJ" --> R3

    D -- "1 room utama\notomatis" --> R1
    D -- "akses room yang SAMA\nquery: part_b_id=NIP_Dosen\ntidak buat baru" --> R2
    D -- "via search\ncreated_by=NIP_Dosen" --> R3

    AG -- "melihat room kepadanya\npart_b_id=identifier_AG" --> R3
    AG -- "1 room AdminDev\notomatis" --> R1

    AD -- "melihat SEMUA room\nkecuali pj_to_dosen" --> R1
    AD -- "melihat SEMUA room\nkecuali pj_to_dosen" --> R3
    AD -- "inisiasi via search\nke siapa pun\ntarget=sisi A, AD=sisi B" --> R1
    AD -- "inisiasi ke AG\nAG=sisi A, AD=sisi B" --> R3
```

---

## Diagram 2: Auto-Create Room Saat Login/Mount

```mermaid
flowchart TD
    Start["User login / komponen mount"]
    CheckRole{"role user?"}

    Start --> CheckRole

    CheckRole -- "user biasa" --> CreateUA1["get_or_create_room(\nuser_id=NIM, part_b=NIP_AdminDev,\ntype='user_to_admin')\nAtomik, ON CONFLICT DO NOTHING"]
    CheckRole -- "pj_kelas" --> CreatePJ["get_or_create_room(\nuser_id=NIM, part_b=NIP_AdminDev,\ntype='user_to_admin')"]
    CheckRole -- "dosen" --> CreateD["get_or_create_room(\nuser_id=NIP, part_b=NIP_AdminDev,\ntype='user_to_admin')"]
    CheckRole -- "admin_gedung" --> CreateAG["get_or_create_room(\nuser_id=identifier_AG,\npart_b=NIP_AdminDev,\ntype='user_to_admin')"]
    CheckRole -- "admin/admin_dev" --> ShowAll["Tampilkan semua room\nkecuali pj_to_dosen\ntanpa auto-create"]

    CreatePJ --> LoadRelPJ["Query course_relations\nSELECT DISTINCT dosen_id\nWHERE pj_id = auth.id\nAND is_active = TRUE"]
    LoadRelPJ --> ForEachDosen["Untuk tiap DISTINCT dosen:"]
    ForEachDosen --> UpsertPJDosen["get_or_create_room(\nuser_id=NIM_PJ,\npart_b=NIP_Dosen,\ntype='pj_to_dosen')\nON CONFLICT DO NOTHING"]

    CreateD --> LoadRelD["Query course_relations\nSELECT DISTINCT pj_id\nWHERE dosen_id = auth.id\nAND is_active = TRUE"]
    LoadRelD --> ForEachPJ["Untuk tiap DISTINCT PJ:"]
    ForEachPJ --> ReadExisting["SELECT room WHERE\npart_b_id=NIP_Dosen\nAND room_type='pj_to_dosen'\nTidak membuat room baru"]

    CreateUA1 --> ShowUA["Tampilkan:\n- Room AdminDev\n- Room Admin Gedung yg pernah dichat"]
    UpsertPJDosen --> ShowPJ["Tampilkan:\n- Room AdminDev\n- Room tiap Dosen + label matkul\n- Room Admin Gedung"]
    ReadExisting --> ShowD["Tampilkan:\n- Room AdminDev\n- Room tiap PJ + label matkul\n- Room Admin Gedung"]
    CreateAG --> ShowAG["Tampilkan:\n- Room AdminDev\n- Room PJ yang ditujukan ke AG\n- Room user yang ditujukan ke AG"]
```

> **Penting:** Semua create room menggunakan fungsi `get_or_create_room` (SQL Blok 7e) yang atomik — `INSERT ... ON CONFLICT DO NOTHING`. Hook frontend wajib punya guard `hasCreated.current` agar tidak memanggil create lebih dari sekali per sesi.

---

## Diagram 3: Alur Search Admin Gedung

```mermaid
flowchart TD
    UserSearch["User/PJ/Dosen\nmengetik di kotak search"]
    APISearch["GET /api/chat/search-admin-gedung?q=keyword"]
    CallRPC["RPC search_building_admins(query)\nSumber: v_user_profiles + admin_gedung_mapping\nFilter: role::text IN\n('admin_sfd','admin_le','admin_ls')"]
    ReturnResults["Kembalikan daftar:\nuser_id, full_name, username,\nidentifier, role, avatar_url,\ngedung_kode\n(tanpa password/email)"]
    UserPilih["User memilih admin gedung"]
    Upsert["get_or_create_room(\nuser_id=NIM/NIP_user,\npart_b=identifier_AG,\ntype='user_to_building_admin',\ncreated_by=identifier_user)\nON CONFLICT → ambil existing"]
    OpenRoom["Buka room chat\ndengan admin gedung"]

    UserSearch --> APISearch --> CallRPC --> ReturnResults --> UserPilih
    UserPilih --> Upsert --> OpenRoom
```

> **Kata kunci yang berfungsi:** "LS", "LE", "SFD", "admin gedung", nama lengkap, username. Cocokkan via `gedung_kode` dari `admin_gedung_mapping`, bukan hardcode. `participant_b_identifier` = `authentication.identifier`, bukan `username`.

---

## Diagram 4: Alur AdminDev Search & Inisiasi

```mermaid
flowchart TD
    ADSearch["AdminDev mengetik\ndi kotak search"]
    APISearch["GET /api/admin/chat/search?q=keyword"]
    CallRPC["RPC search_all_users(query, exclude_self)\nSumber: v_user_profiles + admin_gedung_mapping\nSemua role kecuali diri sendiri"]
    Results["Hasil: user_id, full_name, username,\nidentifier, role, avatar_url, gedung_kode"]
    ADPilih["AdminDev memilih akun target"]
    DetectDir{"Tentukan arah baku:\ntarget di sisi A,\nAdminDev di sisi B"}
    SetType{"room_type berdasarkan\ntarget role"}

    DetectDir -- "target = user/pj/dosen" --> TypeUA["room_type = 'user_to_admin'\nuser_id = identifier_target\npart_b = identifier_AdminDev"]
    DetectDir -- "target = admin_gedung" --> TypeBA["room_type = 'user_to_building_admin'\nuser_id = identifier_AG\npart_b = identifier_AdminDev"]

    SetType --> Upsert["get_or_create_room(\n...arah baku...,\ncreated_by = identifier_AdminDev)\nON CONFLICT → ambil existing"]
    TypeUA --> Upsert
    TypeBA --> Upsert
    Upsert --> OpenRoom["Buka room chat"]

    ADSearch --> APISearch --> CallRPC --> Results --> ADPilih --> DetectDir

    NoDup["Tidak membuat room\narah terbalik:\nunique index + arah baku\nmencegah duplikat"]
    Upsert -.-> NoDup
```

> **Kunci:** AdminDev selalu di sisi B (`participant_b_identifier`). Target di sisi A (`user_identifier`). `ON CONFLICT` pada `uq_rooms_pair` mencegah duplikat jika room sudah ada dari inisiasi target.

---

## Diagram 5: Alur Kirim Pesan dan Update Preview

```mermaid
sequenceDiagram
    participant UI as Frontend (Chat UI)
    participant API as /api/chat/send
    participant DB as Supabase DB
    participant RT as Realtime Channel
    participant Sidebar as Sidebar / Daftar Room

    UI->>API: POST {room_id, message, message_type}
    API->>DB: INSERT INTO chat_messages<br/>(room_id, sender_identifier, message, message_type, is_read=false)
    API->>DB: UPDATE chat_rooms<br/>SET last_message = preview, updated_at = NOW()<br/>WHERE id = room_id

    Note over API,DB: Preview format (send/route.ts baris 38-46):<br/>text → teks asli<br/>image → '🖼️ Gambar'<br/>file → '📄 Dokumen'<br/>multi_file → '📎 Lampiran File'

    DB-->>RT: Postgres change event<br/>table: chat_messages, event: INSERT
    RT-->>UI: Payload {room_id, message, ...}

    UI->>UI: Tambah pesan ke state<br/>chat.messages (room aktif saja)

    UI->>API: fetchRooms() — refresh daftar
    API->>DB: SELECT * FROM chat_rooms<br/>WHERE [filter per role]
    DB-->>API: Array rooms dengan last_message per room
    API-->>Sidebar: rooms[].last_message per room

    Sidebar->>Sidebar: Render preview DARI rooms[i].last_message<br/>(BUKAN dari chat.messages state)
```

> **Kunci perbaikan Bug B:** Sidebar membaca `rooms[i].last_message` dari array rooms (dari API), **bukan** dari `chat.messages` state hook yang hanya berisi pesan room aktif.

---

## Diagram 6: Validasi Akses Admin Gedung

```mermaid
flowchart TD
    Request["Request: buat/akses room\nAktor = Admin Gedung"]
    CheckType{"Jenis aksi?"}

    Request --> CheckType

    CheckType -- "Membalas pesan\ndi room yang sudah ada" --> CheckCreatedBy{"created_by room?"}
    CheckType -- "Membuat room baru\nke target" --> CheckTarget{"Target role?"}

    CheckCreatedBy -- "created_by = identifier_dosen\n(dosen yang memulai)" --> Allow1["✅ Izinkan\nAdmin Gedung balas dosen"]
    CheckCreatedBy -- "created_by = NIM_PJ\natau NIM_User" --> Allow2["✅ Izinkan\nAdmin Gedung balas PJ/User"]
    CheckCreatedBy -- "created_by = NULL\n(room lama/legacy)" --> Allow3["✅ Izinkan\ntanpa pembatasan inisiator"]
    CheckCreatedBy -- "created_by = identifier_AdminDev" --> Allow4["✅ Izinkan\nAdmin Gedung balas AdminDev"]

    CheckTarget -- "target = dosen" --> Deny["❌ TOLAK\nAdmin Gedung tidak boleh\nmemulai room ke dosen\nHTTP 403"]
    CheckTarget -- "target = user biasa" --> Allow5["✅ Izinkan\ncreated_by = identifier_AG"]
    CheckTarget -- "target = PJ Kelas" --> Allow6["✅ Izinkan\ncreated_by = identifier_AG"]
    CheckTarget -- "target = AdminDev" --> Allow7["✅ Izinkan\ncreated_by = identifier_AG"]
```

---

## Diagram 7: Realtime Multi-Room (Subscription)

```mermaid
flowchart TD
    UserMount["Komponen chat mount\nUser dengan N room"]
    CountRooms{"N = jumlah room?"}

    UserMount --> CountRooms

    CountRooms -- "N ≤ 10" --> PerRoom["Per-room channel:\nUntuk tiap room_id:\nsupabase.channel('room-' + id)\n.on(INSERT, chat_messages,\n  filter: room_id=eq.id)\n.subscribe()"]

    CountRooms -- "N > 10" --> SingleChannel["Single channel:\nsupabase.channel('my-messages')\n.on(INSERT, chat_messages,\n  tanpa filter room_id)\n.subscribe(handler)"]

    SingleChannel --> ClientFilter["Handler client-side:\nif myRoomIds.includes(payload.new.room_id):\n  update state room yang sesuai"]

    PerRoom --> OnMessage["Saat pesan masuk:\n- Tambah ke chat.messages jika room aktif\n- fetchRooms() untuk refresh preview sidebar"]
    SingleChannel --> OnMessage

    OnMessage --> UpdatePreview["Sidebar membaca\nrooms[i].last_message\ndari state rooms\n(bukan chat.messages)"]
```

> **Batas praktis Supabase Realtime:** ~20 channel per klien. Dosen dengan 30+ PJ → wajib single-channel.

---

## Diagram 8: Masa Transisi Format `dosen:NIP:NIM`

```mermaid
flowchart TD
    subgraph Sekarang["Format Sekarang - Legacy"]
        OldRoom["chat_rooms\nuser_identifier = 'dosen:NIP:NIM'\nroom_type = NULL\nparticipant_b_identifier = NULL"]
    end

    subgraph Transisi["Masa Transisi - Kode Dual-Format"]
        ReadBoth["Kode membaca KEDUA format:\nIF user_identifier STARTS WITH 'dosen:'\n  THEN parse: NIP = parts[1], NIM = parts[2]\nELSE\n  THEN baca participant_b_identifier"]
        Places["4 lokasi kode diupdate:\n1. dosen-room/route.ts baris 60-80, 148-168\n2. admin/chat/rooms/route.ts baris 182, 262\n3. lib/sendPush.ts baris 146-158\n4. handlers/chat.go baris 299, 342"]
    end

    subgraph Migrasi["Setelah SQL Blok 6"]
        NewRoom["chat_rooms\nuser_identifier = NIM_PJ\nroom_type = 'pj_to_dosen'\nparticipant_b_identifier = NIP_Dosen\ncreated_by = NIM_PJ"]
        SameID["room_id TETAP SAMA\nchat_messages tidak dipindah"]
    end

    subgraph Final["Final - Format Lama Dihapus"]
        CodeClean["Kode hanya baca:\nroom_type = 'pj_to_dosen'\nparticipant_b_identifier"]
    end

    OldRoom -->|"Step 1: Deploy kode dual-format\nWAJIB sebelum SQL Blok 6"| Transisi
    Transisi -->|"Step 2: Jalankan SQL Blok 6\nUPDATE user_identifier"| Migrasi
    Migrasi -->|"Step 3: Verifikasi OK\nlalu hapus kode format lama"| Final

    Places -.->|"Update kode"| ReadBoth
```

---

## Diagram 9: Alur Deduplication Room

```mermaid
flowchart TD
    Start["SQL Blok 2: Deduplication"]
    Backup["Blok 1: Backup bertanggal\nchat_rooms → chat_rooms_backup_YYYYMMDD\nchat_messages → chat_messages_backup_YYYYMMDD"]
    Identify["Identifikasi duplikat:\nGROUP BY user_identifier\nHAVING COUNT > 1"]
    SelectBest["Pilih room terbaik per user:\n1. Terbanyak pesan\n2. id terkecil sebagai tiebreaker"]
    MoveMessages["Pindahkan chat_messages\ndari room duplikat\nke room terpilih"]
    CheckMoved["SELECT cek:\nApakah semua pesan\nsudah di room terpilih?"]
    DeleteDups["DELETE room duplikat"]
    Done["Selesai:\nTiap user_identifier\nhanya punya 1 room"]

    Start --> Backup --> Identify --> SelectBest --> MoveMessages --> CheckMoved --> DeleteDups --> Done

    Warning["⚠️ TIDAK BISA ROLLBACK\ntanpa restore backup"]
    DeleteDups -.-> Warning
```

---

## Diagram 10: Bug Preview — Sebelum dan Sesudah Fix

```mermaid
flowchart TD
    subgraph Before["SEBELUM FIX - Bug"]
        HookState["useUserChat hook\nchat.messages = pesan room aktif SAJA"]
        Compute["WebTabLayout.tsx baris 233:\nlastMessage = chat.messages.at(-1)"]
        PassProp["Prop ke UserSidebar:\nlastMessage satu untuk semua room"]
        SidebarBug["UserSidebar menampilkan\nlastMessage yang SAMA\ndi semua room di sidebar"]
        Result1["❌ Room A dan Room B\nkeduanya menampilkan\npesan terakhir room aktif"]
    end

    subgraph After["SESUDAH FIX"]
        FetchRooms["fetchRooms API\nreturns rooms[] dengan\nlast_message per room dari DB"]
        RoomsState["state: rooms[]\narray semua room user"]
        PassRooms["Teruskan rooms[] ke UserSidebar"]
        SidebarFix["UserSidebar render:\nrooms.map room =>\n  preview: room.last_message"]
        Result2["✅ Tiap room menampilkan\npreview pesan yang benar"]
    end

    HookState --> Compute --> PassProp --> SidebarBug --> Result1
    FetchRooms --> RoomsState --> PassRooms --> SidebarFix --> Result2

    DBFix["SQL Blok 3:\nRecalculate last_message\ndari chat_messages per room"]
    DBFix -.->|"Memastikan rooms[i].last_message\ndari API sudah akurat"| FetchRooms

    Verify["Verifikasi:\n1. Buka 2 room PJ\n2. Kirim pesan di room A\n3. Cek preview room B\n   tidak berubah\n4. Mobile: sudah benar"]
    Result2 -.-> Verify
```

---

## Diagram 11: Fungsi Atomik get_or_create_room

```mermaid
flowchart TD
    Request["Request: buat/ambil room\nuntuk pasangan A ↔ B"]
    CallFunc["SELECT * FROM get_or_create_room(\np_user_identifier,\np_participant_b,\np_room_type,\np_participant_b_role,\np_created_by)"]
    TryInsert["INSERT INTO chat_rooms (...)\nON CONFLICT\n(user_identifier, participant_b_identifier)\nDO NOTHING\nRETURNING id"]
    CheckResult{"RETURNING\nmengembalikan id?"}
    ReturnNew["Return (room_id, is_new=TRUE)\nRoom baru berhasil dibuat"]
    SelectExist["SELECT id FROM chat_rooms\nWHERE user_identifier = p_user_identifier\nAND participant_b_identifier = p_participant_b"]
    ReturnExist["Return (room_id, is_new=FALSE)\nRoom sudah ada"]

    Request --> CallFunc --> TryInsert --> CheckResult
    CheckResult -- "Ya (room baru)" --> ReturnNew
    CheckResult -- "Tidak (conflict)" --> SelectExist --> ReturnExist

    IndexNote["Didukung oleh unique index\nNON-PARTIAL:\nuq_rooms_pair ON\n(user_identifier, participant_b_identifier)"]
    TryInsert -.-> IndexNote

    RaceNote["Race condition terselesaikan:\n2 request paralel → salah satu\nmenang INSERT, yang lain\nmendapat existing via SELECT"]
    CheckResult -.-> RaceNote
```

> **Mencegah duplikat dari semua jalur:** Go `GetOrCreateRoom`, Next.js `user-room`, `dosen-room`, `admin/chat/rooms`, PJ mount ganda, AdminDev inisiasi — semua memanggil fungsi ini.

---

## Diagram 12: Label Matkul Gabungan per Pasangan PJ-Dosen

```mermaid
flowchart TD
    subgraph Lama["Desain Lama - Per Relasi"]
        OldLoop["for const rel of relations\nsatu entry per baris course_relations"]
        OldRoom["roomKey = dosen:NIP:NIM\nsatu room per matkul?"]
        OldLabel["Label: satu matkul per entry\nDuplikasi entry jika > 1 matkul"]
    end

    subgraph Baru["Desain Baru - Per Pasangan DISTINCT"]
        NewDistinct["SELECT DISTINCT ON (pj_id, dosen_id)\nBackfill + auto-create:\nsatu room per pasangan"]
        NewRoom["user_identifier = NIM_PJ\npart_b_id = NIP_Dosen\nroom_type = 'pj_to_dosen'"]
        NewLabel["Label: STRING_AGG(DISTINCT mata_kuliah)\nContoh: 'Kalkulus, Aljabar Linear'"]
    end

    OldLoop --> OldRoom --> OldLabel
    NewDistinct --> NewRoom --> NewLabel

    QueryAgg["Query label dinamis:\nSELECT STRING_AGG(\n  DISTINCT crel.mata_kuliah, ', '\n) AS matkul_gabungan\nFROM course_relations crel\nWHERE crel.pj_id = auth.id\n  AND crel.dosen_id = dosen.user_id\n  AND crel.is_active = TRUE"]
    NewLabel -.-> QueryAgg

    IndexNote["Index pendukung:\n- idx_course_relations_pj (pj_id)\n- uq_course_relations (dosen_id leading)"]
    QueryAgg -.-> IndexNote

    DeleteNote["Jika relasi dihapus/nonaktif:\nRoom tetap ada, riwayat aman\nLEFT JOIN → matkul_gabungan = NULL\nUI: tampilkan room tanpa label matkul"]
    NewRoom -.-> DeleteNote
```

---

## Ringkasan Perubahan Per File

| File | Kondisi Sebelum | Kondisi Sesudah |
|------|----------------|----------------|
| `chat_rooms` (DB) | 6 kolom, format `dosen:NIP:NIM`, tidak ada constraint unik | +4 kolom baru, CHECK, unique index NON-partial, fungsi atomik |
| `chat_messages` (DB) | kolom `sender_identifier`, `is_read` | Tidak berubah (skema sudah benar) |
| `course_relations` (DB) | Index hanya `uq_course_relations` + PK | + `idx_course_relations_pj` (Blok 1b, SEKARANG) |
| `chat.go` | SELECT+INSERT tanpa upsert | Panggil `get_or_create_room` SQL function |
| `user-room/route.ts` | maybeSingle + insert | RPC `get_or_create_room` |
| `dosen-room/route.ts` | double insert bug + per-relasi + format lama | Fix: DISTINCT pasangan, hapus double-insert, `STRING_AGG` label |
| `admin/chat/rooms/route.ts` | filter `LIKE 'dosen:%'` | filter `room_type != 'pj_to_dosen'`; AdminDev search + inisiasi |
| `WebTabLayout.tsx` | `lastMessage` dari `chat.messages` (satu, shared) | `room.last_message` per room dari API |
| `MobileChatListView.tsx` | `room.last_message` per room — sudah benar | Tidak berubah (mobile sudah benar) |
| `sendPush.ts` | `startsWith('dosen:')` saja | dual-format support |
| `search-admin-gedung` (BARU) | — | RPC `search_building_admins` via `v_user_profiles` + `admin_gedung_mapping` |
| `admin/chat/search` (BARU) | — | RPC `search_all_users` (AdminDev, semua akun) |
