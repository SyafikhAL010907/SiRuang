import json
import re

with open("raw_data.txt", "r", encoding="utf-8") as f:
    text = f.read()

# Pisahkan berdasarkan double newline atau triple newline
blocks = re.split(r'\n\s*\n', text.strip())

templates = []
tid = 1

for block in blocks:
    block = block.strip()
    if not block:
        continue
    
    lines = block.split('\n')
    keyword_candidate = lines[0].strip()
    
    # Deteksi judul: Jika baris pertama huruf kapital semua (dan tidak ada titik), atau kata pendek tanpa koma
    # Contoh: "DEFER", "AKTIF DEFER", "SNBP LOLOS"
    if keyword_candidate.isupper() and len(keyword_candidate) < 50:
        keyword = keyword_candidate
        response = "\n".join(lines[1:]).strip()
    else:
        # Buat keyword otomatis dari teks pertama
        words = re.findall(r'\b\w+\b', block)
        keyword = " ".join(words[:4]).upper()
        response = block

    # Filter balasan kosong
    if not response:
        response = keyword
    
    # Categorize secara sederhana
    category = "Lainnya"
    lower_resp = response.lower()
    
    if "pascasarjana" in lower_resp or "magister" in lower_resp or "loa " in lower_resp:
        category = "Pascasarjana"
    elif "rpl" in lower_resp or "pindahan" in lower_resp or "ekstensi" in lower_resp:
        category = "RPL & Pindahan"
    elif "snbp" in lower_resp or "utbk" in lower_resp or "snbt" in lower_resp or "verifikasi akademik" in lower_resp:
        category = "Jalur Nasional"
    elif "mandiri" in lower_resp or "penmaba" in lower_resp or "rapor" in lower_resp or "prestasi" in lower_resp:
        category = "Jalur Mandiri"
    elif "ukt" in lower_resp or "ipi" in lower_resp or "bkt" in lower_resp or "pembayaran" in lower_resp or "tagihan" in lower_resp:
        category = "Keuangan & UKT"
    elif "kendala" in lower_resp or "error" in lower_resp or "server" in lower_resp or "login" in lower_resp:
        category = "Teknis & Kendala"
    elif "salah sambung" in lower_resp or "bukan ranah" in lower_resp:
        category = "Informasi Lintas Unit"
    else:
        category = "Informasi Umum"
        
    templates.append({
        "id": f"c{tid}",
        "category": category,
        "keyword": keyword,
        "question": f"Pertanyaan terkait {keyword.lower()}?",
        "synonyms": [keyword.lower()] + [w for w in re.findall(r'\b\w+\b', keyword.lower()) if len(w) > 3],
        "response": response
    })
    tid += 1

# --- GENERATE PYTHON FILE ---
py_content = '"""\nDataset Template AI Generated\n"""\n\nCANNED_RESPONSES = [\n'
for t in templates:
    resp_escaped = t["response"].replace('\\', '\\\\').replace('"', '\\"')
    py_content += '    {\n'
    py_content += f'        "id": "{t["id"]}",\n'
    py_content += f'        "category": "{t["category"]}",\n'
    py_content += f'        "keyword": "{t["keyword"]}",\n'
    py_content += f'        "question": "{t["question"]}",\n'
    py_content += f'        "synonyms": {json.dumps(t["synonyms"])},\n'
    py_content += f'        "response": """{t["response"]}""",\n'
    py_content += '    },\n'
py_content += ']\n\n'

# Sisipkan data catatan manusia yang sama
py_content += '''
EMOTION_NOTES = {
    "urgent": [
        "Kami memahami urgensi situasi Kakak. Tim kami akan segera menindaklanjuti.",
        "Tenang dulu ya Kak, kami di sini untuk membantu Kakak secepatnya."
    ],
    "confused": [
        "Wajar jika Kakak masih bingung, proses pendaftaran memang cukup banyak tahapannya.",
        "Silakan tanyakan lebih lanjut jika masih ada yang kurang jelas ya Kak."
    ],
    "polite": [
        "Terima kasih atas pertanyaan yang baik, Kak! Senang bisa membantu.",
        "Pertanyaan yang bagus, Kak! Berikut jawabannya."
    ],
    "frustrated": [
        "Kami mohon maaf atas ketidaknyamanan yang dialami. Kami akan bantu selesaikan.",
        "Kami mengerti perasaan Kakak dan akan berusaha memberikan solusi terbaik."
    ],
    "neutral": [
        "Semoga informasi ini bermanfaat untuk Kakak.",
        "Jika ada pertanyaan lain, jangan ragu untuk bertanya ya Kak."
    ],
}

CATEGORY_NOTES = {
    "Keuangan & UKT": [
        "Simpan bukti pembayaran hingga proses pendaftaran selesai ya Kak."
    ],
    "Teknis & Kendala": [
        "Coba gunakan mode incognito atau browser lain jika masalah berlanjut."
    ],
    "Jalur Mandiri": [
        "Pantau terus website penmaba.unj.ac.id untuk update jadwal terbaru."
    ]
}

TIME_GREETINGS = {
    "pagi": "Selamat pagi, Kak!",
    "siang": "Selamat siang, Kak!",
    "sore": "Selamat sore, Kak!",
    "malam": "Selamat malam, Kak!",
}

EMOTION_KEYWORDS = {
    "urgent": ["urgent", "darurat", "segera", "buru-buru", "mendesak", "besok", "hari ini"],
    "confused": ["bingung", "tidak mengerti", "ga ngerti", "kurang jelas", "gimana"],
    "polite": ["mohon", "minta tolong", "permisi", "terima kasih", "makasih"],
    "frustrated": ["kenapa", "kok bisa", "sudah coba", "tetap tidak bisa", "masih error"],
}
'''

with open("../app/core/templates.py", "w", encoding="utf-8") as f:
    f.write(py_content)

# --- GENERATE TYPESCRIPT FILE ---
ts_content = '// DATA TEMPLATE GENERATED AUTOMATICALLY DARI DOSEN\n\nexport const cannedResponses = [\n'
for t in templates:
    resp_escaped = t["response"].replace('\\', '\\\\').replace('`', '\\`').replace('$', '\\$')
    ts_content += '  {\n'
    ts_content += f'    id: "{t["id"]}",\n'
    ts_content += f'    category: "{t["category"]}",\n'
    ts_content += f'    keyword: "{t["keyword"]}",\n'
    ts_content += f'    question: "{t["question"]}",\n'
    ts_content += f'    response: `{resp_escaped}`\n'
    ts_content += '  },\n'
ts_content += '];\n'

with open("../../FrontEnd/src/constants/cannedResponses.ts", "w", encoding="utf-8") as f:
    f.write(ts_content)

print(f"✅ Sukses generate {len(templates)} templates ke Python & TypeScript!")
