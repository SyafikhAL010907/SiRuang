# Dokumentasi Komprehensif: Metode Sistem Web & Machine Learning
## Aplikasi HelpDesk Admisi Universitas Negeri Jakarta (UNJ)

Dokumen ini disusun sebagai referensi teknis dan dasar teoritis/metodologis untuk penyusunan **Skripsi, Tugas Akhir, atau Jurnal Ilmiah**. Dokumen ini menjabarkan secara menyeluruh arsitektur sistem web, cara kerja aplikasi, dan metode *Machine Learning / Natural Language Processing (NLP)* pada bot penjawab otomatis (*auto-response*).

---

## DAFTAR ISI
1. [Gambaran Umum Website (Sistem HelpDesk Admisi)](#1-gambaran-umum-website-sistem-helpdesk-admisi)
2. [Arsitektur Sistem & Pola Rekayasa Web](#2-arsitektur-sistem--pola-rekayasa-web)
3. [Fitur Utama Sistem Berdasarkan Aktor (Role)](#3-fitur-utama-sistem-berdasarkan-aktor-role)
4. [Mekanisme Komunikasi Data & Real-Time (HTTP Short Polling)](#4-mekanisme-komunikasi-data--real-time-http-short-polling)
5. [Skema Basis Data & Keamanan Sistem](#5-skema-basis-data--keamanan-sistem)
6. [Metode Machine Learning & NLP pada AI Bot](#6-metode-machine-learning--nlp-pada-ai-bot)
7. [Alur Orkestrasi AI & Mode Hybrid (Backend-to-ML)](#7-alur-orkestrasi-ai--mode-hybrid-backend-to-ml)
8. [Panduan & Rekomendasi untuk Penulisan Jurnal Ilmiah](#8-panduan--rekomendasi-untuk-penulisan-jurnal-ilmiah)

---

## 1. Gambaran Umum Website (Sistem HelpDesk Admisi)

### 1.1 Latar Belakang & Tujuan Aplikasi
Aplikasi **HelpDesk Admisi** adalah platform layanan komunikasi dan konsultasi interaktif berbasis web yang dirancang khusus untuk memfasilitasi calon mahasiswa baru (*pendaftar/user*) dalam mengajukan pertanyaan, kendala, atau klarifikasi seputar proses seleksi masuk perguruan tinggi (SNBP, SNBT, Ujian Mandiri, verifikasi berkas, UKT, dan registrasi ulang).

Sistem ini menghubungkan pengguna secara langsung dengan tim petugas panitia (*Admin Admisi*) melalui ruang percakapan (*chat room*), serta diperkuat oleh asisten pintar (*AI Auto-Response Bot*) yang mampu memberikan jawaban instan secara otomatis terhadap pertanyaan-pertanyaan yang berulang (*frequently asked questions / FAQ*).

### 1.2 Karakteristik Utama Aplikasi
* **Tiga Layanan Terpisah (*Microservices/Decoupled Services*):** Frontend (Next.js), Backend API (Golang), dan AI Engine (Python FastAPI).
* **Responsive Multi-Layout:** Antarmuka secara spesifik membedakan render tampilan antara perangkat *Mobile* dan perangkat *Web & Tablet*.
* **Manajemen Sesi & Status Kehadiran (*Presence*):** Mendeteksi apakah pengguna sedang online atau offline melalui pencatatan sesi aktif.
* **Fleksibilitas Operasional AI (*Toggleable & Hybrid*):** Admin memiliki kendali penuh untuk mengaktifkan atau menonaktifkan AI sewaktu-waktu, serta sistem memiliki kecerdasan jadwal kerja (*work hours vs patrol mode*).

---

## 2. Arsitektur Sistem & Pola Rekayasa Web

Sistem HelpDesk Admisi mengadopsi arsitektur **Decoupled Three-Tier / Microservices-Oriented Architecture** yang memisahkan tanggung jawab sistem menjadi tiga lapis independen:

```
┌─────────────────────────────────────────────────────────────────┐
│                   PRESENTATION TIER (FRONTEND)                  │
│       Next.js 15 (React 19) + TypeScript + Tailwind CSS v4      │
│            • User Layout (Mobile / Web)                         │
│            • Admin Dashboard & Chat Console (Mobile / Web)       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ HTTP REST (JSON)
                                  │ Short Polling (3 detik)
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│               APPLICATION / LOGIC TIER (BACKEND)                │
│                   Golang (Gin Web Framework)                    │
│            • JWT Auth Middleware & Session Tracker              │
│            • Chat Room & Message Orchestrator                   │
│            • Background Worker / AI Scheduler (5 detik)         │
└──────────────┬──────────────────────────────────┬───────────────┘
               │                                  │
    SQL Query  │                                  │ Internal HTTP REST
    (MariaDB)  │                                  │ (/predict)
               ▼                                  ▼
┌───────────────────────────────┐  ┌──────────────────────────────┐
│       DATA TIER (DATABASE)    │  │       AI SERVICE (ML)        │
│             MySQL             │  │   Python 3 (FastAPI)         │
│  • authentication             │  │   • Slang Normalizer         │
│  • chat_rooms & chat_messages │  │   • Multi-Slot TF-IDF        │
│  • active_sessions & captcha  │  │   • Cosine Similarity        │
└───────────────────────────────┘  │   • Keyword Boosting         │
                                   │   • Context-Aware NLG Note   │
                                   └──────────────────────────────┘
```

### Penjelasan Komponen:
1. **Frontend (Next.js 15, React 19, TypeScript):**
   * Berjalan di port `3000`.
   * Menggunakan arsitektur modular: folder `src/components/Admin` dan `src/components/User` yang masing-masing memiliki layout khusus `Mobile` dan `Web&Tab`.
   * Styling modern menggunakan **Tailwind CSS v4** dengan animasi dinamis melalui **Framer Motion**.
2. **Backend (Golang Gin Framework):**
   * Berjalan di port `8080`.
   * Bertindak sebagai *API Gateway*, penyedia layanan otentikasi, validasi data, pengontrol sesi basis data, dan orkestrator yang menjembatani percakapan masuk ke microservice Machine Learning.
3. **Machine Learning Service (Python FastAPI):**
   * Berjalan di port `8000`.
   * Service mandiri yang mengeksekusi model *Natural Language Processing* (NLP) untuk menganalisis isi obrolan dan memberikan rekomendasi jawaban terakurasi secara komputasional.
4. **Cloudflare Tunnel Integration:**
   * Memungkinkan sistem lokal diakses secara aman dari internet publik melalui tunneling terenkripsi HTTPS tanpa membutuhkan IP publik statis.

---

## 3. Fitur Utama Sistem Berdasarkan Aktor (Role)

### 3.1 Sisi Pengguna (User / Calon Mahasiswa)
1. **Otentikasi & Registrasi:**
   * Pendaftaran akun menggunakan Username, Gmail, dan Password.
   * Dilengkapi pengujian tantangan matematika aritmetika sederhana (**Captcha System**) untuk mencegah registrasi bot otomatis (spam).
2. **Ruang Obrolan Personal (*Private Chat Room*):**
   * Setiap user otomatis mendapatkan satu ruang chat privat (*room*) yang terhubung langsung ke meja panitia admisi.
   * Mendukung pengiriman pesan teks (*text message*).
   * Mendukung pengiriman lampiran file/dokumen dan gambar (*image/file message*).
3. **Indikator Status Pesan:**
   * Pelacakan status pesan dibaca (*read receipts / is_read*).
   * Pembaruan obrolan secara otomatis tanpa perlu merefresh halaman web (*auto-sync*).

### 3.2 Sisi Petugas (Admin Admisi)
1. **Dashboard Manajemen Obrolan:**
   * Daftar seluruh ruang obrolan (*chat rooms*) yang disusun berdasarkan aktivitas terbaru (*updated_at DESC*).
   * Menampilkan jumlah pesan yang belum dibaca (*unread count badge*).
   * Menampilkan status online/offline user secara *real-time*.
   * Filter pencarian room berdasarkan nama atau email user.
   * Fitur menandai obrolan belum dibaca (*Mark as Unread*).
2. **Pusat Pengiriman Siaran (*Broadcast Message*):**
   * Mengirimkan satu pesan pengumuman sekaligus kepada:
     * *Waiting Room* (semua user yang sedang memiliki ruang percakapan aktif).
     * *All Users* (seluruh akun user terdaftar).
     * *Specific Users* (beberapa akun user terpilih berdasarkan daftar email).
3. **Panel Kendali AI (*AI Control Panel*):**
   * Tombol *Toggle Switch* untuk menyalakan/mematikan AI Auto-Response secara dinamis tanpa perlu merestart server.
   * Pemantauan latensi respon server (*Server Latency Indicator*).

---

## 4. Mekanisme Komunikasi Data & Real-Time (HTTP Short Polling)

Alih-alih menggunakan koneksi persistent yang berat seperti WebSocket mentah yang rentan putus pada jaringan seluler tidak stabil, sistem ini menerapkan metode **HTTP Short Polling** yang dirancang efisien dan teratur:

1. **Frontend Polling Interval (3 Detik):**
   * Komponen layout klien mengeksekusi fungsi `fetchMessages()` setiap `3000 ms` menggunakan `setInterval`.
   * Menjaga state obrolan tetap sinkron antara admin dan pengguna.
2. **Backend AI Worker Polling (5 Detik):**
   * Di dalam backend Go (`handlers.StartAIWorker`), terdapat *goroutine* berjadwal yang dipicu oleh `time.NewTicker(5 * time.Second)`.
   * Worker memeriksa seluruh ruangan apakah terdapat pesan terbaru dari pihak *user* yang belum mendapatkan balasan dari panitia maupun AI.
3. **Mekanisme Anti-Spam (*Cooldown Tracker*):**
   * Backend mengelola map memori `lastReplied[roomID]` yang dilindungi oleh `sync.Mutex`.
   * AI dibatasi agar tidak merespons bertubi-tubi pada ruangan yang sama dalam rentang waktu yang terlalu singkat, menjaga percakapan tetap nyaman bagi pengguna.

---

## 5. Skema Basis Data & Keamanan Sistem

Sistem menggunakan basis data relasional **MySQL / MariaDB** dengan struktur tabel terindeks sebagai berikut:

### 5.1 Struktur Tabel Inti
* `authentication`: Menyimpan identitas akun (`username`, `gmail`, `password` terenkripsi, `role: 'admin' | 'user'`).
* `active_sessions`: Mencatat token JWT dan waktu aktivitas terakhir (`last_activity`) untuk mendeteksi status pengguna aktif (*online tracking*).
* `captcha`: Menyimpan daftar pertanyaan matematika acak beserta kunci jawaban untuk verifikasi registrasi.
* `chat_rooms`: Menyimpan ruang obrolan per pengguna (`user_gmail`, ringkasan `last_message`, `is_marked_unread`, `updated_at`).
* `chat_messages`: Menyimpan seluruh rekam jejak pesan (`room_id`, `sender_gmail`, isi `message`, `message_type: 'text'|'file'|'image'`, `is_read`, `created_at`).

### 5.2 Standar Keamanan Data
* **Enkripsi Kata Sandi:** Menggunakan algoritma hashing satu arah **Bcrypt** dengan *cost factor* tinggi ($2a$14), memastikan kata sandi tidak dapat didekripsi bahkan jika basis data terekspos.
* **Otentikasi Stateless Berbasis Token (JWT):** Sesi login divalidasi melalui *JSON Web Token* dengan masa berlaku (*expiry time*) tertentu yang diperiksa oleh middleware backend pada setiap request terlindungi.

---

## 6. Metode Machine Learning & NLP pada AI Bot

Service cerdas pada folder `MachineLearning` bekerja dengan paradigma **Retrieval-Based Question Answering System (Information Retrieval)**. Pendekatan ini dipilih karena memberikan jaminan akurasi 100% pada informasi faktual kebijakan admisi universitas, sekaligus mengeliminasi risiko halusinasi (*hallucination*) yang kerap terjadi pada model generative LLM bebas.

Berikut adalah tahapan algoritma dan formulasi matematis yang digunakan:

```
[ Pesan Masuk Pengguna ]
           │
           ▼
┌────────────────────────────────────────────────────────┐
│ 1. NLP PREPROCESSING & SLANG NORMALIZATION             │
│    • Lowercase & Punctuation Removal                   │
│    • Kamus Bahasa Gaul Mahasiswa (SLANG_MAP)          │
│    • Sapaan Greeting Bypass Rule                      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. MULTI-SLOT TF-IDF VECTORIZATION                     │
│    • Slot 1: Keywords  (N-Gram 1-2)                   │
│    • Slot 2: Questions (N-Gram 1-3)                   │
│    • Slot 3: Responses (N-Gram 1-2)                   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 3. COSINE SIMILARITY CALCULATION                       │
│    • Sim_Keyword, Sim_Question, Sim_Response           │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 4. MULTI-SLOT WEIGHTED SCORING                         │
│    Score = 0.45*Sim_KW + 0.40*Sim_Q + 0.15*Sim_R       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 5. RULE-BASED KEYWORD EXACT-MATCH BOOSTING             │
│    Kecocokan kata kunci eksak -> Boost up to +0.25     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 6. CONTEXT-AWARE HUMAN NOTE GENERATOR (HEURISTIC NLG)  │
│    Salam Waktu (WIB) + Deteksi Emosi + Tips Kategori   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
[ Template Jawaban Terbaik & Catatan Kontekstual ]
```

### 6.1 Pembersihan & Normalisasi Teks (*Text Preprocessing*)
Sebelum diubah menjadi vektor numerik, kalimat masukan diproses melalui:
1. **Case Folding:** Mengubah seluruh karakter alfabet menjadi huruf kecil (*lowercase*).
2. **Punctuation & Delimiter Stripping:** Menghilangkan simbol baca menggunakan ekspresi reguler `re.sub(r"[^\w\s]", " ", text)` serta membersihkan pemisah gelembung chat (`|`).
3. **Slang Word Normalization (Kamus Slang Mahasiswa):** Mengonversi singkatan nonformal percakapan Indonesia menjadi istilah baku admisi.
   * Contoh:
     * `"gmn" / "gimana"` $\to$ `"bagaimana"`
     * `"dftr"` $\to$ `"daftar pendaftaran"`
     * `"ukt" / "spp"` $\to$ `"ukt biaya kuliah"`
     * `"kipk"` $\to$ `"kip beasiswa"`
     * `"ijazah"` $\to$ `"ijazah dokumen"`
4. **Greeting Bypass Rule:** Jika pesan hanya mengandung kata sapaan (misal: *"halo kak"*, *"assalamualaikum"*, *"p"*, *"selamat pagi"*), sistem langsung memilih template respon penyambutan standar (`c0`) dengan tingkat keyakinan (*confidence*) mutlak $1.0$.

### 6.2 Ekstraksi Fitur: TF-IDF (Term Frequency - Inverse Document Frequency)
TF-IDF digunakan untuk mengevaluasi seberapa penting suatu kata dalam sebuah kumpulan dokumen template.

* **Term Frequency ($TF$):** Mengukur frekuensi kemunculan kata $t$ dalam dokumen $d$:
  $$TF(t, d) = \frac{f_{t, d}}{\sum_{t' \in d} f_{t', d}}$$
* **Inverse Document Frequency ($IDF$):** Memberikan bobot tinggi pada kata-kata khusus dan memperkecil bobot kata yang terlalu sering muncul:
  $$IDF(t, D) = \ln\left(\frac{1 + |D|}{1 + |\{d \in D : t \in d\}|}\right) + 1$$
* **Bobot TF-IDF:**
  $$W(t, d, D) = TF(t, d) \times IDF(t, D)$$

#### Pendekatan Multi-Gram:
Model menerapkan rentang n-gram yang berbeda pada tiap slot:
* Slot Kata Kunci (*Keywords*): $N\text{-gram}(1, 2)$
* Slot Pertanyaan (*Questions*): $N\text{-gram}(1, 3)$
* Slot Jawaban (*Responses*): $N\text{-gram}(1, 2)$

### 6.3 Pengukuran Kemiripan: Cosine Similarity
Derajat kemiripan semantik antara vektor pesan pengguna ($\vec{u}$) dengan vektor template basis pengetahuan ($\vec{v}$) dihitung menggunakan sudut kosinus antar vektor:
$$\text{Cosine Similarity}(\vec{u}, \vec{v}) = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|} = \frac{\sum_{i=1}^{n} u_i v_i}{\sqrt{\sum_{i=1}^{n} u_i^2} \sqrt{\sum_{i=1}^{n} v_i^2}}$$

### 6.4 Multi-Slot Weighted Scoring & Keyword Boosting
Model membedakan bobot signifikansi berdasarkan letak kecocokan teks:
1. **Skor Gabungan Terbobot (*Weighted Score*):**
   $$\text{Score}_{\text{base}} = (0.45 \times \text{Sim}_{\text{keyword}}) + (0.40 \times \text{Sim}_{\text{question}}) + (0.15 \times \text{Sim}_{\text{response}})$$
2. **Keyword Exact-Match Boost:**
   Jika kata kunci spesifik atau sinonimnya terdeteksi hadir secara utuh (*exact whole word match*) dalam pesan pengguna, model memberikan dorongan nilai (*boost*) proporsional hingga sebesar $+0.25$:
   $$\text{Score}_{\text{final}} = \min\left(\text{Score}_{\text{base}} + \left(0.25 \times \frac{|\text{Matches}|}{\max(|\text{AllKeywords}|, 1)}\right), 1.0\right)$$

### 6.5 Pembangkit Catatan Kontekstual Manusiawi (*Heuristic Context-Aware NLG*)
Model tidak hanya mengembalikan teks template kaku, melainkan menghasilkan catatan personalisasi (*human note*) dinamis berdasarkan:
* **Salam Berbasis Waktu Operasional (WIB / UTC+7):** Pagi ($05.00-10.59$), Siang ($11.00-14.59$), Sore ($15.00-18.59$), atau Malam.
* **Deteksi Emosi / Tingkat Urgensi:** Mendeteksi indikasi kebingungan, kecemasan, atau kepanikan pengguna dari kata kunci masukan.
* **Ambang Batas Keyakinan (*Confidence Guardrail*):** Jika skor keyakinan berada di bawah $0.5$ ($50\%$), AI secara otomatis menyisipkan kalimat konfirmasi sopan agar pengguna bersedia memberikan penjelasan lebih mendalam jika jawaban yang disajikan kurang sesuai.

---

## 7. Alur Orkestrasi AI & Mode Hybrid (Backend-to-ML)

Backend Golang menghubungkan obrolan user dengan microservice Python melalui mekanisme cerdas:

1. **Agregasi Konteks Percakapan (*Recency Weighting*):**
   * Backend mengumpulkan hingga 8 gelembung chat (*bubbles*) terakhir dari room terkait.
   * Pesan paling terakhir dari user diduplikasi sebanyak 3 kali dalam satu payload teks. Hal ini memberikan bobot ekstra pada topik terbaru yang sedang ditanyakan pengguna tanpa melupakan konteks historis sebelumnya.
2. **Mode Hibrida Jadwal Kerja (*Hybrid Working Hour Schedule*):**
   * **Jam Kerja (Senin–Jumat, 09:00 – 15:59 WIB):** Sistem beroperasi dalam *Mode Efisien*, di mana kueri hanya memproses ruang obrolan yang aktif dalam 1 menit terakhir (`updated_at > NOW() - INTERVAL 1 MINUTE`). Ini menjaga beban server tetap ringan saat lalu lintas pendaftar sedang puncak.
   * **Luar Jam Kerja & Akhir Pekan:** Sistem beralih ke *Mode Patroli Penuh*, memindai semua ruangan obrolan yang belum terjawab untuk memastikan tidak ada pertanyaan calon mahasiswa yang terlewatkan.

---

## 8. Panduan & Rekomendasi untuk Penulisan Jurnal Ilmiah

Bagi keperluan sitasi, perumusan bab metodologi, atau penulisan naskah publikasi ilmiah, berikut ringkasan taksonomi metode yang dapat ditulis:

| Aspek Penelitian | Terminologi Ilmiah yang Tepat Digunakan |
|---|---|
| **Jenis Sistem** | *Web-Based Academic Helpdesk System with Retrieval-Based Chatbot* |
| **Metode Rekayasa Web** | *Microservices Architecture*, *Decoupled Client-Server*, *RESTful Web Services*, *HTTP Short Polling* |
| **Pendekatan Antarmuka** | *Mobile-First Responsive Web Design* |
| **Metode Natural Language Processing** | *Dictionary-Based Slang Normalization*, *N-Gram Feature Extraction*, *Rule-Based Heuristic Filtering* |
| **Algoritma Ekstraksi Fitur Teks** | *Term Frequency - Inverse Document Frequency (TF-IDF)* dengan skema *Multi-Slot Vectorization* |
| **Metode Pengukuran Kemiripan** | *Cosine Similarity Metric* |
| **Algoritma Pemeringkatan / Klasifikasi** | *Multi-Field Linear Weighted Scoring with Keyword Exact-Match Boosting* |
| **Metode Evaluasi Model yang Disarankan** | *Confusion Matrix*, *Precision*, *Recall*, *F1-Score*, dan pengujian *Mean Reciprocal Rank (MRR)* |

### Contoh Judul Jurnal yang Sangat Relevan:
1. *"Penerapan Metode TF-IDF dan Cosine Similarity pada Sistem Chatbot HelpDesk Admisi Perguruan Tinggi Berbasis Web"*
2. *"Rancang Bangun Sistem Layanan Konsultasi Akademik Berbasis Microservices dengan Integrasi Question Answering System"*
3. *"Pengaruh Normalisasi Bahasa Slang dan Pembobotan Multi-Slot TF-IDF terhadap Akurasi Respon Otomatis Chatbot Helpdesk"*
4. *"Penerapan Algoritma Cosine Similarity dan Rule-Based Boosting untuk Klasifikasi Pertanyaan Calon Mahasiswa Baru"*
