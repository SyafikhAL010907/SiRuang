| Fase | Nama | Bisa Paralel? | Prasyarat |
| --- | --- | :---: | --- |
| 0 | Persiapan (backup, cek) | — | — |
| SQL-1 | Jalankan database aman | — | Fase 0 ✅ |
| 1 | Kode: middleware + roleNavigation terima role baru | — | SQL-1 ✅ |
| 2 | Kode: Sidebar + route protection per role | ✅ paralel | Fase 1 ✅ |
| 3 | Kode: Booking paralel SFD (email ke dosen + admin gedung) | ✅ paralel | Fase 1 ✅ |
| 4 | Kode: UI admin gedung + halaman review + AdminDev view-only | ✅ paralel | Fase 1 ✅ |
| 5 | Kode: Chat (GetRooms, search-admin, auto-room PJ-dosen) | ✅ paralel | Fase 1 ✅ |
| 6 | Kode: Halaman PJ (status approval per pihak, ajukan ulang) | — | Fase 3 & 4 ✅ |
| SQL-2 | Rename admin→admin_dev + migrasi data + backfill chat | — | Fase 1–6 live & stable ✅ |
| T | Test SFD end-to-end oleh user | — | SQL-2 ✅ |
| LE | Rollout LE (insert rooms LE, aktifkan mapping) | — | Test SFD ✅ |
| LS | LS Ditunda (akun sudah ter-seed) | — | Rollout LE ✅ |