# Plan Refactor: Pemisahan Frontend Admin Gedung

> **Status:** Draft — Belum diimplementasi  
> **Branch target:** `feat/add-role-refac-admin-gedung` (branched from `feat/add-role-fase-6`)  
> **Tanggal:** 2026-11-22  
> **Scope:** Frontend only — tidak ada perubahan API, SQL, atau chat.go

---

## 1. Latar Belakang & Tujuan

Saat ini **semua role admin** (`admin`, `admin_dev`, `admin_sfd`, `admin_le`, `admin_ls`) diarahkan ke satu route `/admin` dan satu set komponen `Admin/`. Ini memaksa `WebTabLayout.tsx` menambah banyak conditional `isBuildingAdmin(role)` untuk menyembunyikan/membatasi fitur.

**Tujuan refactor:**
- Admin Gedung (SFD/LE/LS) punya route dan UI sendiri yang bersih — tidak ada fitur Admin Dev yang tersembunyi
- Admin Dev tetap di `/admin` (atau `/admin-dev`) dengan akses penuh
- Routing middleware memberi tahu user mereka login sebagai admin apa
- Tidak ada hardcode nama gedung di logika — selalu derived dari role atau data

---

## 2. Analisis Komponen Existing

### 2.1 Struktur Saat Ini

```
FrontEnd/src/
├── app/
│   └── admin/                    ← Satu-satunya route admin
│       ├── page.tsx              ← Render MainAdmin
│       └── review/[id]/          ← Approval booking (Fase 4)
├── components/Admin/
│   ├── MainAdmin.tsx             ← Entry point (mobile/web switch)
│   ├── Web&Tab/
│   │   ├── WebTabLayout.tsx      ← BESAR, banyak conditional role
│   │   └── components/
│   │       ├── AdminSidebar.tsx          ← Sidebar (ada isBuildingAdmin hide)
│   │       ├── AdminDashboardView.tsx    ← Dashboard (StatGrid + BuildingDenahGrid + menu cards)
│   │       ├── BookingManagementView.tsx ← Booking approval
│   │       ├── ChatHeader.tsx
│   │       ├── ChatMessagesArea.tsx
│   │       ├── ChatInputArea.tsx
│   │       ├── RoleAccessView.tsx        ← Admin Dev only
│   │       ├── ManajemenAkunView.tsx     ← Admin Dev only
│   │       ├── RelasiMataKuliahView.tsx  ← Admin Dev only
│   │       └── ImportJadwalResmiView.tsx ← Admin Dev only
│   ├── Mobile/
│   │   ├── MobileLayout.tsx
│   │   └── components/
│   │       ├── MobileChatListView.tsx
│   │       ├── MobileChatRoomView.tsx
│   │       └── MobileHeader.tsx
│   └── Shared/
│       ├── Cards/
│       │   ├── StatGrid.tsx             ← Cards Live Sync, Chat, Unread, dll
│       │   └── BuildingDenahGrid.tsx    ← Grid denah semua gedung
│       ├── hooks/
│       │   ├── useAdminChat.ts
│       │   ├── useAdminTools.ts
│       │   └── useAttachments.ts
│       ├── Modals/
│       │   ├── BlessChatModal.tsx
│       │   └── AIConfirmModal.tsx
│       └── utils.tsx
└── lib/
    └── roles.ts                         ← isAdminDev, isBuildingAdmin, isAnyAdmin
```

### 2.2 Pemetaan Role → Gedung

| Role | Gedung | Kode |
|------|--------|------|
| `admin_sfd` | Gedung SFD | `SFD` |
| `admin_le` | Gedung LE | `LE` |
| `admin_ls` | Gedung LS | `LS` |

> Kode gedung TIDAK dihardcode di komponen. Didapat dari `role.split('_')[1].toUpperCase()` atau lookup table di `roles.ts`.

### 2.3 Komponen Yang Perlu Dipecah

| Komponen | Nasib |
|----------|-------|
| `WebTabLayout.tsx` | Pecah jadi `AdminDevLayout.tsx` + `AdminGedungLayout.tsx` |
| `AdminSidebar.tsx` | Pecah jadi `AdminDevSidebar.tsx` + `AdminGedungSidebar.tsx` |
| `AdminDashboardView.tsx` | Pecah jadi `AdminDevDashboardView.tsx` + `AdminGedungLandingView.tsx` |
| `BookingManagementView.tsx` | Shared — dipakai keduanya (sudah ada filter per gedung) |
| Chat components | Shared — tidak berubah |
| Mobile components | Pecah paralel (MobileLayoutGedung) atau conditional di dalam |
| Modals, hooks, utils | Tetap di `Admin/Shared/` |

---

## 3. Struktur Folder Target

```
FrontEnd/src/
├── app/
│   ├── admin/                    ← Admin Dev (admin, admin_dev)
│   │   ├── page.tsx
│   │   └── review/[id]/          ← (tetap, dipakai semua admin)
│   ├── admin-sfd/                ← NEW
│   │   ├── page.tsx
│   │   └── review/[id]/          ← OPTIONAL (atau share dari /admin/review)
│   ├── admin-le/                 ← NEW
│   │   └── page.tsx
│   └── admin-ls/                 ← NEW
│       └── page.tsx
│
├── components/
│   ├── Admin/                    ← (TETAP) Admin Dev
│   │   ├── MainAdmin.tsx         ← Rename jadi MainAdminDev.tsx (opsional)
│   │   ├── Web&Tab/
│   │   │   ├── WebTabLayout.tsx  ← Bersihkan: hapus semua isBuildingAdmin conditional
│   │   │   └── components/       ← Semua komponen Admin Dev (tetap)
│   │   ├── Mobile/               ← Mobile Admin Dev (tetap)
│   │   └── Shared/               ← Shared semua admin (tetap)
│   │
│   ├── AdminGedung/              ← NEW: Shared base untuk semua admin gedung
│   │   ├── MainAdminGedung.tsx   ← Entry point (mobile/web switch, terima prop gedung/role)
│   │   ├── Web&Tab/
│   │   │   ├── AdminGedungLayout.tsx      ← Layout utama admin gedung (wrapper)
│   │   │   └── components/
│   │   │       ├── AdminGedungSidebar.tsx ← Sidebar: Beranda, ACC Pengajuan, Profil, Chat
│   │   │       ├── AdminGedungLandingView.tsx  ← Dashboard landing (spec di bawah)
│   │   │       └── AdminGedungBookingView.tsx  ← Shortcut ke BookingManagementView
│   │   └── Mobile/
│   │       ├── MobileAdminGedungLayout.tsx
│   │       └── components/
│   │           ├── MobileAdminGedungListView.tsx
│   │           └── MobileAdminGedungRoomView.tsx
│   │
│   ├── AdminSFD/                 ← NEW: Wrapper tipis untuk SFD
│   │   └── MainAdminSFD.tsx      ← Render <MainAdminGedung gedung="SFD" role="admin_sfd" />
│   │
│   ├── AdminLE/                  ← NEW: Wrapper tipis untuk LE
│   │   └── MainAdminLE.tsx       ← Render <MainAdminGedung gedung="LE" role="admin_le" />
│   │
│   └── AdminLS/                  ← NEW: Wrapper tipis untuk LS
│       └── MainAdminLS.tsx       ← Render <MainAdminGedung gedung="LS" role="admin_ls" />
```

> **Prinsip:** Semua logika bisnis ada di `AdminGedung/`. Folder `AdminSFD/`, `AdminLE/`, `AdminLS/` **hanya wrapper tipis** (1 file, ~5 baris) yang pass prop gedung ke komponen shared.

---

## 4. Spesifikasi Landing Page Admin Gedung

### 4.1 Layout (Desktop/Web)

```
┌─────────────────────────────────────────────────────────────┐
│  AdminGedungSidebar  │          Konten Utama                │
│  ─────────────────── │  ──────────────────────────────────  │
│  🏠 Beranda          │  Selamat datang, [Nama Admin]        │
│  ✅ ACC Pengajuan    │  Admin Gedung [SFD / LE / LS]        │
│  👤 Profil           │                                      │
│  💬 Chat             │  ┌──────────────────────────────┐    │
│                      │  │  Live Sync    [●AKTIF]       │    │
│                      │  │  Total Chat   [3]            │    │
│                      │  │  Perlu Respon [1]            │    │
│                      │  │  Terbaca      [2]            │    │
│                      │  │  Auto-Response[Aktif]        │    │
│                      │  │  User Online  [3]            │    │
│                      │  └──────────────────────────────┘    │
│                      │                                      │
│                      │  ┌──────────────┐ ┌──────────────┐  │
│                      │  │ Denah Gedung │ │ Pengajuan    │  │
│                      │  │ [SFD/LE/LS] │ │ Pending: [N] │  │
│                      │  │ [Mini Denah] │ │ [→ ACC]     │  │
│                      │  └──────────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Card Spesifikasi

#### Card 1-6: Live Sync & Chat Stats
Sama persis dengan `StatGrid` yang sudah ada di `Admin/Shared/Cards/StatGrid.tsx`. Reuse langsung.

Data source: `GET /api/admin/chat/rooms` (sudah difilter per gedung di server).

#### Card 7: Denah Gedung (hanya gedungnya sendiri)
- Komponen: `BuildingDenahGrid` yang sudah ada, **tapi difilter hanya 1 gedung**
- Atau buat `SingleBuildingDenahCard.tsx` yang lebih compact
- Route link: `/denah-sfd`, `/denah-le`, `/denah-ls` (sudah ada di `app/`)
- **TIDAK hardcode** — gedung dari prop `gedung` yang diterima

#### Card 8: Pengajuan Booking Pending
- Tampilkan count booking dengan `approval_admin_gedung = 'pending'` dan `status IN ('menunggu_approval', 'menunggu_dosen')`
- Data source: `GET /api/admin/bookings?gedung=[gedung]&status=pending&limit=1` (count saja)
- Tombol/link → navigasi ke tab ACC Pengajuan (`setMainView('booking-management')`)
- Badge merah jika count > 0

### 4.3 Konten ACC Pengajuan (Tab/View)
Reuse `BookingManagementView.tsx` yang sudah ada (sudah support filter per gedung).

---

## 5. Perubahan Route & Middleware

### 5.1 Route Baru (app/)

```typescript
// app/admin-sfd/page.tsx
import MainAdminSFD from '@/components/AdminSFD/MainAdminSFD';
export default function AdminSFDPage() { return <MainAdminSFD />; }

// app/admin-le/page.tsx
import MainAdminLE from '@/components/AdminLE/MainAdminLE';
export default function AdminLEPage() { return <MainAdminLE />; }

// app/admin-ls/page.tsx  
import MainAdminLS from '@/components/AdminLS/MainAdminLS';
export default function AdminLSPage() { return <MainAdminLS />; }
```

### 5.2 Perubahan middleware.ts

Tambahkan guard dan redirect per role:

```typescript
// TAMBAHAN di middleware.ts — setelah/di dalam blok /admin guard:

// Redirect admin gedung ke route masing-masing (jika mengakses /admin langsung)
if (pathname === '/admin' || pathname === '/admin/') {
  if (decoded && isBuildingAdmin(decoded.role)) {
    const gedungRoute = roleToRoute(decoded.role); // 'admin_sfd' → '/admin-sfd'
    return NextResponse.redirect(new URL(gedungRoute, request.url));
  }
}

// Guard /admin-sfd, /admin-le, /admin-ls
if (pathname.startsWith('/admin-sfd') || pathname.startsWith('/admin-le') || pathname.startsWith('/admin-ls')) {
  if (!decoded) {
    return NextResponse.redirect(new URL('/login?redirect=' + pathname, request.url));
  }
  // Admin Dev boleh lihat (view-only) ATAU redirect ke /admin — tergantung keputusan
  // Rekomendasi: admin dev redirect ke /admin
  if (isAdminDev(decoded.role)) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }
  // Admin gedung hanya boleh akses route miliknya
  const expectedRoute = roleToRoute(decoded.role);
  if (!pathname.startsWith(expectedRoute)) {
    return NextResponse.redirect(new URL(expectedRoute, request.url));
  }
  return NextResponse.next();
}
```

Helper `roleToRoute`:
```typescript
function roleToRoute(role: string): string {
  const map: Record<string, string> = {
    admin_sfd: '/admin-sfd',
    admin_le: '/admin-le',
    admin_ls: '/admin-ls',
    admin: '/admin',
    admin_dev: '/admin',
  };
  return map[role] ?? '/admin';
}
```

### 5.3 Info di UI: "Kamu login sebagai..."

Di `AdminGedungLandingView.tsx`, tampilkan badge/subtitle:
```
Admin Gedung SFD   ← derived dari prop gedung, BUKAN hardcode
```

Di route `/admin`, jika role adalah `admin_dev`, tampilkan:
```
Admin Developer
```

Ini cukup di level komponen UI — tidak perlu perubahan middleware.

---

## 6. File Yang Dibuat vs Dimodifikasi

### File BARU (tidak mengubah existing):

| File | Deskripsi |
|------|-----------|
| `app/admin-sfd/page.tsx` | Route page SFD |
| `app/admin-le/page.tsx` | Route page LE |
| `app/admin-ls/page.tsx` | Route page LS |
| `components/AdminGedung/MainAdminGedung.tsx` | Entry point shared (mobile/web switch) |
| `components/AdminGedung/Web&Tab/AdminGedungLayout.tsx` | Layout utama (chat + sidebar + konten) |
| `components/AdminGedung/Web&Tab/components/AdminGedungSidebar.tsx` | Sidebar minimal |
| `components/AdminGedung/Web&Tab/components/AdminGedungLandingView.tsx` | Dashboard landing |
| `components/AdminGedung/Web&Tab/components/AdminGedungBookingView.tsx` | Wrapper BookingManagement |
| `components/AdminGedung/Mobile/MobileAdminGedungLayout.tsx` | Layout mobile |
| `components/AdminGedung/Mobile/components/...` | Mobile views |
| `components/AdminSFD/MainAdminSFD.tsx` | Wrapper tipis SFD |
| `components/AdminLE/MainAdminLE.tsx` | Wrapper tipis LE |
| `components/AdminLS/MainAdminLS.tsx` | Wrapper tipis LS |
| `components/Admin/Shared/Cards/SingleBuildingDenahCard.tsx` | Card denah 1 gedung (opsional) |

### File DIMODIFIKASI:

| File | Perubahan |
|------|-----------|
| `middleware.ts` | Tambah guard `/admin-sfd`, `/admin-le`, `/admin-ls` + redirect logic |
| `components/Admin/Web&Tab/WebTabLayout.tsx` | Hapus semua `isBuildingAdmin` conditional (tidak perlu lagi) |
| `components/Admin/Web&Tab/components/AdminSidebar.tsx` | Hapus hide items untuk admin gedung |
| `components/Admin/MainAdmin.tsx` | Tambah cek role → redirect jika admin gedung |

> **Catatan:** `BookingManagementView.tsx` **TIDAK dimodifikasi** — dipakai as-is oleh AdminGedung.

---

## 7. Props Pattern: AdminGedung

```typescript
// MainAdminGedung.tsx
interface AdminGedungProps {
  gedung: 'SFD' | 'LE' | 'LS';  // derived dari role, dipass oleh wrapper
  role: 'admin_sfd' | 'admin_le' | 'admin_ls';
}

// Wrapper tipis (MainAdminSFD.tsx)
const MainAdminSFD = () => <MainAdminGedung gedung="SFD" role="admin_sfd" />;
```

Gedung kode untuk API calls:
```typescript
// Tidak hardcode di dalam AdminGedung — selalu dari prop gedung
fetch(`/api/admin/bookings?gedung=${gedung}&status=pending`)
fetch(`/api/admin/chat/rooms?gedung=${gedung}`)
```

---

## 8. Perilaku Chat di UI Admin Gedung

Berdasarkan requirement (request chat Fase 5):
- **Admin gedung** melihat chat dari **semua PJ Kelas** yang di gedungnya
- Tidak ada chat ke admin gedung lain
- Ada chat ke `admin_dev`
- Komponen chat yang dipakai: **sama** dengan yang ada di `Admin/Shared/hooks/useAdminChat.ts` (reuse, sudah difilter per gedung di API)

---

## 9. Tahapan Implementasi (Phased)

### Phase A — Siapkan Shared Base (AdminGedung/)
1. Buat `components/AdminGedung/` dengan `MainAdminGedung.tsx`, layout, sidebar, landing
2. Reuse `BookingManagementView.tsx` dan semua hooks/chat dari `Admin/Shared/`
3. Test: render lokal tanpa route middleware

### Phase B — Wrapper Per Gedung
1. Buat `AdminSFD/MainAdminSFD.tsx`, `AdminLE/MainAdminLE.tsx`, `AdminLS/MainAdminLS.tsx`
2. Buat `app/admin-sfd/page.tsx`, `app/admin-le/page.tsx`, `app/admin-ls/page.tsx`
3. Test: akses manual via URL `/admin-sfd` dll (tanpa middleware redirect dulu)

### Phase C — Update Middleware
1. Tambahkan guard dan redirect untuk route admin gedung
2. Test: login sebagai `admin_sfd` → otomatis redirect ke `/admin-sfd`
3. Test: login sebagai `admin` / `admin_dev` → tetap ke `/admin`

### Phase D — Bersihkan Admin Dev
1. Hapus semua `isBuildingAdmin` conditional di `WebTabLayout.tsx` dan `AdminSidebar.tsx`
2. Bersihkan `MainAdmin.tsx` (tidak perlu cek role building lagi)
3. Run `tsc --noEmit` + `npx next build --webpack`

### Phase E — Verifikasi End-to-End
1. Login tiap role, cek redirect benar
2. Admin gedung SFD tidak bisa akses `/admin-le`, `/admin`, dll
3. Admin dev tidak bisa akses `/admin-sfd` dll (redirect ke `/admin`)
4. Booking approval masih jalan

---

## 10. Checklist Kriteria Sukses

- [ ] `admin_sfd` login → redirect `/admin-sfd`, lihat UI khusus SFD
- [ ] `admin_le` login → redirect `/admin-le`, lihat UI khusus LE
- [ ] `admin_ls` login → redirect `/admin-ls`, lihat UI khusus LS
- [ ] `admin` / `admin_dev` login → tetap `/admin`, lihat UI full Admin Dev
- [ ] Dashboard admin gedung punya: StatGrid, Denah gedungnya saja, Card booking pending
- [ ] ACC Pengajuan: hanya booking gedungnya (filter sudah ada di API)
- [ ] Chat: hanya room dari user di gedungnya + admin_dev (sudah ada di API)
- [ ] Tidak ada hardcode `'SFD'`, `'LE'`, `'LS'` di logika (hanya dari prop/role)
- [ ] Tidak ada hardcode `'admin_dev'` di query enum Postgres
- [ ] `tsc --noEmit` ✅
- [ ] `npx next build --webpack` ✅
- [ ] Fase 3–6 yang sudah ada tidak rusak

---

## 11. Yang TIDAK Berubah

- Semua API route (`/api/admin/...`) — sudah support filter gedung
- `chat.go` — tidak disentuh
- `Admin/Shared/` hooks & utils — reused as-is
- `BookingManagementView.tsx` — reused as-is
- `app/admin/review/[id]/` — shared, dipakai semua admin gedung (tetap via link email)
- SQL — tidak ada perubahan (SQL-2 belum jalan)
- Status lama (`menunggu_dosen`, dll) — handling tetap ada di komponen booking

---

## 12. Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| Middleware order conflict antara `/admin` dan `/admin-sfd` | Guard `/admin-sfd` SEBELUM guard `/admin` di middleware |
| `isBuildingAdmin` conditional di Admin Dev ketinggalan | Phase D wajib grep + hapus semua |
| Admin gedung mengakses langsung `/admin` via URL | Middleware redirect jika login sebagai building admin |
| Chat hook tidak kefilter per gedung | Sudah dihandle di API — aman |
| SQL-2 belum jalan (enum `admin_dev` belum ada) | Tidak ada perubahan query DB; hanya UI |

---

*Document ini adalah rencana; implementasi dimulai setelah persetujuan.*

