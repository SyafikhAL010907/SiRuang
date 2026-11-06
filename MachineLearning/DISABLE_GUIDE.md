# 🔴 Panduan Disable/Enable Fitur AI Auto-Response

> Dokumen ini berisi panduan lengkap untuk menonaktifkan fitur AI tanpa menghapus
> kode, sehingga bisa diaktifkan kembali kapan saja. Semua fungsi chat, auth,
> dan fitur lain **TIDAK AKAN TERPENGARUH** ketika AI dimatikan.

---

## 🗺️ Peta Lokasi Kode AI

```
HelpDeskAdmisi/
├── MachineLearning/
│   ├── main.py          ← Server Python FastAPI (AI Service)
│   ├── model.py         ← TF-IDF Classifier + Human Note Generator
│   ├── templates.py     ← Dataset template & keyword
│   ├── requirements.txt ← Dependencies Python
│   └── run.bat          ← Script jalankan AI service (Windows)
│
├── BackEnd/
│   ├── internal/handlers/
│   │   └── ai.go        ← Handler Go: toggle endpoint + background worker
│   └── cmd/api/
│       └── main.go      ← Route AI + StartAIWorker (baris ~75-90)
│
└── FrontEnd/src/components/Admin/
    ├── Web&Tab/WebTabLayout.tsx  ← Toggle UI + fetch AI status
    └── Mobile/MobileLayout.tsx  ← Toggle UI + fetch AI status (mobile)
```

---

## ⚡ OPSI 1 — Disable Cepat (Hanya Matikan Worker, Kode Tetap Ada)

Ini cara paling mudah dan aman. AI tidak akan auto-reply tapi kode tetap ada.

### 📄 File: `BackEnd/cmd/api/main.go` — Sekitar baris 83

**Comment baris ini:**
```go
// ⚠️ Comment baris di bawah untuk matikan AI worker
handlers.StartAIWorker(mlServiceURL) // ← COMMENT INI
```

**Setelah di-comment:**
```go
// handlers.StartAIWorker(mlServiceURL) // ← DIMATIKAN
```

✅ **Efek:** AI tidak akan auto-reply. Toggle di UI masih bisa diklik tapi tidak ada efek.

---

## 🔴 OPSI 2 — Disable Penuh (Matikan Semua Komponen AI)

### Step 1: Matikan Background Worker

**File:** `BackEnd/cmd/api/main.go` — Sekitar baris 83

```go
// handlers.StartAIWorker(mlServiceURL) // ⬅ COMMENT INI
```

### Step 2: Matikan Route API AI

**File:** `BackEnd/cmd/api/main.go` — Sekitar baris 70-72

```go
// admin.POST("/ai/toggle", handlers.ToggleAI)   // ⬅ COMMENT INI
// admin.GET("/ai/status", handlers.GetAIStatus)  // ⬅ COMMENT INI
```

### Step 3: Matikan Toggle di Frontend Web/Tab

**File:** `FrontEnd/src/components/Admin/Web&Tab/WebTabLayout.tsx`

**Baris ~90-93 (state):**
```tsx
// const [isAILoading, setIsAILoading] = useState(false); // ⬅ COMMENT INI
```

**Baris ~388-445 (fungsi):**
```tsx
// const fetchAIStatus = async (token: string) => { ... }; // ⬅ COMMENT INI
// const handleToggleAI = async (newState: boolean) => { ... }; // ⬅ COMMENT INI
```

**Baris ~281 (useEffect):**
```tsx
// fetchAIStatus(parsed.token); // ⬅ COMMENT INI
```

**Baris ~594 (toggle onClick):**
```tsx
// Ganti dari:
if (!isAILoading) handleToggleAI(!isInfoActive);
// Menjadi:
setIsInfoActive(!isInfoActive);
```

### Step 4: Matikan Toggle di Frontend Mobile

**File:** `FrontEnd/src/components/Admin/Mobile/MobileLayout.tsx`

Lakukan hal yang sama seperti Step 3 di atas (struktur kode identik).

### Step 5: Jangan jalankan Python ML Service

Cukup tidak jalankan `run.bat` atau `python main.py`.

---

## 🟢 OPSI 3 — Enable Kembali Setelah Di-Disable

Cukup **hapus tanda `//`** dari semua baris yang di-comment di atas, lalu:

```bash
# Terminal baru — jalankan ML service
cd MachineLearning
python main.py
# atau
run.bat
```

---

## 📋 Checklist Disable Cepat

| # | File | Baris | Aksi |
|---|------|-------|------|
| 1 | `BackEnd/cmd/api/main.go` | ~83 | Comment `handlers.StartAIWorker(...)` |
| 2 | `BackEnd/cmd/api/main.go` | ~70-72 | Comment 2 route `/ai/toggle` dan `/ai/status` |
| 3 | `WebTabLayout.tsx` | ~281 | Comment `fetchAIStatus(parsed.token)` |
| 4 | `WebTabLayout.tsx` | ~594 | Ganti `handleToggleAI` → `setIsInfoActive` |
| 5 | `MobileLayout.tsx` | ~294 | Comment `fetchAIStatus(parsed.token)` |
| 6 | `MobileLayout.tsx` | ~682 | Ganti `handleToggleAI` → `setIsInfoActive` |
| 7 | Jangan jalankan | `MachineLearning/run.bat` | Skip saja |

---

## ⚙️ Cara Running (Ketika AI Aktif)

```
Terminal 1 — ML Service Python
│  cd MachineLearning
│  pip install -r requirements.txt
│  python main.py
│  → Running di http://localhost:8000

Terminal 2 — Backend Go (sudah ada)
│  cd BackEnd
│  go run cmd/api/main.go
│  → Running di http://localhost:8080

Terminal 3 — Frontend Next.js (sudah ada)
│  cd FrontEnd
│  npm run dev
│  → Running di http://localhost:3000
```

---

## 🔍 Cara Verifikasi AI Berjalan

```bash
# Cek health ML service
curl http://localhost:8000/health
# → {"status":"ok","service":"HelpDesk Admisi AI"}

# Cek status AI dari backend
curl -H "Authorization: <token_admin>" http://localhost:8080/api/admin/ai/status
# → {"enabled":true,"message":"AI Auto-Response Aktif"}

# Test prediksi manual
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"message": "gimana cara daftar ke UNJ?"}'
# → {"template_id":"c1","confidence":0.85,"reply_text":"...","human_note":"..."}
```

---

## 🧠 Cara Kerja AI (Singkat)

```
User kirim pesan di chat room
        ↓
Go Worker (polling tiap 5 detik) mendeteksi pesan baru
        ↓
Cek: apakah pesan terakhir dari USER (bukan admin)?
        ↓
Kirim ke Python ML Service (POST /predict)
        ↓
TF-IDF Vectorizer → Cosine Similarity → Pilih template terbaik
        ↓
Generate catatan tambahan manusiawi berdasarkan konteks & emosi
        ↓
Confidence > 35%? → Kirim balasan ke database
Confidence ≤ 35%? → Skip, biarkan admin manual
        ↓
Frontend polling (tiap 3 detik) → Pesan muncul di chat room
```

---

## 🛡️ Fitur Safety yang Sudah Built-in

| Fitur | Keterangan |
|---|---|
| **Hanya template** | AI tidak bisa mengarang teks sendiri, hanya dari template yang sudah ada |
| **Threshold confidence** | Tidak reply jika keyakinan model < 35% |
| **Anti-double reply** | Cek apakah pesan terakhir sudah dari admin sebelum reply |
| **Anti-spam** | Tunggu minimal 10 detik antar auto-reply per room |
| **Graceful degradation** | Jika ML service mati, backend tetap jalan normal, toggle UI tidak crash |
| **Toggle on/off** | Admin bisa matikan AI kapan saja dari dashboard |

---

> **Dibuat untuk:** HelpDesk Admisi UNJ  
> **Versi:** 1.0.0  
> **Tanggal:** April 2026
