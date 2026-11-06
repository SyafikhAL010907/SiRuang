http://localhost:3000/denah-sfd
http://localhost:3000/denah-le


# Cara Running Aplikasi HelpDesk Admisi (Lokal & Cloudflare Tunnel)

Dokumen ini berisi panduan cepat untuk menjalankan seluruh service (Backend, Frontend, Machine Learning) beserta Cloudflare Tunnel jika ingin diakses dari internet.

---

## 🛠️ Persiapan Awal
Pastikan database MySQL kamu (seperti XAMPP / Laragon) sudah menyala terlebih dahulu.

---

## 🚀 Langkah 1: Jalankan Semua Service Lokal

Buka terminal terpisah untuk setiap perintah berikut:

### 1. Backend (Go)
```bash
cd BackEnd
go run cmd/api/main.go
```
*Berjalan di port `8080`*

### 2. Frontend (Next.js)
```bash
cd FrontEnd
npm run dev
```
*Berjalan di port `3000` (Lokal: http://localhost:3000)*

### 3. Machine Learning AI (Python)
```bash
cd MachineLearning
.\run.bat
```
*Berjalan di port `8000` (Untuk auto-response AI)*

---

## 🌐 Langkah 2: Menjalankan Akses Online (Cloudflare Tunnel)

Setiap kali tunnel dijalankan ulang, Cloudflare akan memberikan URL acak baru. Ikuti langkah berikut untuk menghubungkannya:

1. **Jalankan Tunnel Frontend**:
   Buka terminal/CMD baru, lalu jalankan perintah ini:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   *(Jika perintah `cloudflared` tidak terbaca di terminal baru, gunakan path absolut: `& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000`)*

2. **Salin URL Cloudflare**:
   Cari baris link di terminal yang berakhiran `.trycloudflare.com` (contoh: `https://apple-banana-orange.trycloudflare.com`). **Copy** link tersebut.

3. **Update URL di `.env` Backend**:
   Buka file [BackEnd/.env](file:///c:/Project%20Coding%20Syafikh/Project%20Admisi/HelpDeskAdmisi/BackEnd/.env) dan perbarui nilai `FRONTEND_URL` dengan link baru tersebut:
   ```env
   FRONTEND_URL=https://[LINK-BARU-KAMU].trycloudflare.com
   ```

4. **Restart Backend Go**:
   Matikan server Go (`Ctrl + C` di terminal Backend), lalu jalankan ulang agar memuat konfigurasi URL baru:
   ```bash
   go run cmd/api/main.go
   ```

---

*Sekarang, aplikasi sudah bisa diakses lewat **localhost:3000** maupun **link Cloudflare baru** tersebut secara bersamaan!*
