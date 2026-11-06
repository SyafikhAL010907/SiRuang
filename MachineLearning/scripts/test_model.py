"""
Test script untuk verifikasi model AI HelpDesk Admisi UNJ
Jalankan: python test_model.py
"""
import sys
import io
# Fix encoding untuk Windows terminal
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, '.')
from app.core.model import get_model

model = get_model()

test_cases = [
    "Halo kak, gimana cara daftar UNJ ya?",
    "Saya bingung soal jadwal pendaftaran kapan dibuka?",
    "KTP saya perlu dilegalisir tidak kak?",
    "Kalau ijazah belum keluar gimana?",
    "Cara bayar biaya pendaftarannya gimana?",
    "Sudah transfer tapi status belum berubah",
    "Lupa password akun saya kak tolong",
    "Website error terus tidak bisa dibuka",
    "Selamat pagi mau nanya soal UKT pembayaran",
]

print("=" * 65)
print("TEST PREDIKSI MODEL AI HelpDesk Admisi UNJ")
print("=" * 65)
passed = 0
for msg in test_cases:
    r = model.predict(msg)
    status = "[OK]  " if r["confidence"] >= 0.35 else "[LOW] "
    if r["confidence"] >= 0.35:
        passed += 1
    print(status + "Template:" + r["template_id"] + " | Confidence:" + str(round(r["confidence"], 2)))
    print("   Pesan : " + msg)
    print("   Balas : " + r["reply_text"][:70] + "...")
    print("   Catatan: " + r["human_note"][:80] + "...")
    print()

print("=" * 65)
print("Hasil: " + str(passed) + "/" + str(len(test_cases)) + " test passed (confidence >= 0.35)")
if passed == len(test_cases):
    print("SEMUA TEST LULUS! Model siap digunakan.")
else:
    print("Ada " + str(len(test_cases) - passed) + " pesan yang confidence-nya rendah.")
print("=" * 65)
