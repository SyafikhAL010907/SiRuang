# =============================================================================
# FILE: MachineLearning/model.py
# DESKRIPSI: TF-IDF Classifier + Human-Like Note Generator (Enhanced v2)
#
# UPGRADE v2:
#   1. Keyword Exact-Match Boosting  → Skor naik drastis jika ada keyword persis
#   2. Multi-Slot TF-IDF             → Tiap slot (keyword/question/response) punya bobot
#   3. Slang Normalizer              → Normalisasi kata slang mahasiswa Indonesia
#
# ⚠️  CARA DISABLE: Lihat DISABLE_GUIDE.md
# =============================================================================

import random
import re
import numpy as np
from datetime import datetime
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.core.templates import (
    CANNED_RESPONSES,
    EMOTION_KEYWORDS,
    EMOTION_NOTES,
    CATEGORY_NOTES,
    TIME_GREETINGS,
)

# =============================================================================
# SLANG NORMALIZER — Kamus normalisasi kata slang mahasiswa Indonesia
# =============================================================================
SLANG_MAP = {
    # Sapaan / casual
    "kak": "kakak", "bro": "kakak", "gan": "kakak", "kk": "kakak",
    "bg": "kakak", "bang": "kakak", "min": "admin",
    "hallo": "halo", "haloo": "halo", "helo": "halo", "hello": "halo",
    "kaa": "kakak", "kakak": "kakak", "kka": "kakak", "kaka": "kakak",
    # Kata-kata umum
    "gmn": "bagaimana", "gimana": "bagaimana", "bgmn": "bagaimana",
    "kapan": "kapan", "kpn": "kapan",
    "udah": "sudah", "udh": "sudah", "blm": "belum", "blum": "belum",
    "dah": "sudah", "deh": "", "nih": "ini", "tuh": "itu",
    "emg": "memang", "emang": "memang", "mang": "memang",
    "gak": "tidak", "ga": "tidak", "nggak": "tidak", "enggak": "tidak",
    "ngga": "tidak", "tdk": "tidak", "gk": "tidak",
    "bisa": "bisa", "bs": "bisa", "bsa": "bisa",
    "mau": "ingin", "mo": "ingin", "pengen": "ingin", "mw": "ingin",
    "syarat": "syarat", "prasyarat": "syarat", "persyaratan": "syarat",
    # Topik admisi
    "daftar": "daftar pendaftaran", "dftr": "daftar pendaftaran",
    "ujian": "ujian seleksi", "uji": "ujian seleksi",
    "ukt": "ukt biaya kuliah", "spp": "ukt biaya kuliah",
    "beasiswa": "beasiswa bantuan dana",
    "kip": "kip beasiswa", "kipk": "kip beasiswa",
    "snbt": "snbt seleksi", "snmptn": "snmptn seleksi", "sbmptn": "sbmptn seleksi",
    "jalur": "jalur penerimaan", "mandiri": "jalur mandiri",
    "formulir": "formulir berkas", "berkas": "berkas dokumen",
    "verifikasi": "verifikasi dokumen", "upload": "unggah dokumen",
    "foto": "foto dokumen", "ijazah": "ijazah dokumen", "raport": "raport nilai",
    "skl": "surat keterangan lulus", "surat": "surat keterangan",
    "nim": "nomor induk mahasiswa", "ktm": "kartu tanda mahasiswa",
    "wisuda": "wisuda kelulusan", "dosen": "dosen pengajar",
    "info": "informasi", "infor": "informasi", "inform": "informasi",
    "tanya": "pertanyaan", "nanya": "pertanyaan", "tanyain": "pertanyaan",
    "tlg": "tolong", "mhon": "mohon", "mohon": "mohon",
    "selamat": "selamat",
    "pagi": "pagi", "siang": "siang", "sore": "sore", "malam": "malam",
}

# =============================================================================
# DAFTAR KATA SAPAAN UNTUK BYPASS RULE
# =============================================================================
GREETING_WORDS = {
    "halo", "hai", "hei", "helo", "hello", "hallo", "haloo", 
    "salam", "assalamualaikum", "assalam", "samlekom", "asalamualaikum", 
    "p", "ping", "test", "tes", "oy", "oi", "punten", "permisi", "misi",
    "kakak", "admin", "selamat", "pagi", "siang", "sore", "malam"
}

# =============================================================================
# KELAS UTAMA MODEL AI
# =============================================================================
class HelpDeskAIModel:
    """
    Model AI HelpDesk Admisi UNJ — Enhanced v2
    Cara kerja:
      1. Slang Normalizer  → Normalisasi kata slang sebelum diproses
      2. Multi-Slot TF-IDF → Vectorize keyword, question, response secara terpisah
      3. Weighted Scoring  → Gabungkan skor dari tiap slot dengan bobot berbeda
      4. Keyword Boosting  → Boost skor jika ada kata kunci eksak dalam pesan
      5. Human Note        → Catatan tambahan manusiawi berdasarkan konteks
    """

    # Bobot masing-masing slot TF-IDF
    WEIGHT_KEYWORD  = 0.45  # Keyword paling penting
    WEIGHT_QUESTION = 0.40  # Kalimat pertanyaan juga sangat relevan
    WEIGHT_RESPONSE = 0.15  # Response kurang relevan untuk matching
    KEYWORD_BOOST   = 0.25  # Boost tambahan jika keyword eksak ditemukan

    def __init__(self):
        # Tiga vectorizer terpisah untuk masing-masing slot
        self.vec_keyword  = TfidfVectorizer(
            analyzer="word", ngram_range=(1, 2),
            min_df=1, lowercase=True, strip_accents="unicode"
        )
        self.vec_question = TfidfVectorizer(
            analyzer="word", ngram_range=(1, 3),
            min_df=1, lowercase=True, strip_accents="unicode"
        )
        self.vec_response = TfidfVectorizer(
            analyzer="word", ngram_range=(1, 2),
            min_df=1, lowercase=True, strip_accents="unicode"
        )

        self.mat_keyword  = None
        self.mat_question = None
        self.mat_response = None
        self.templates = CANNED_RESPONSES
        self._build_index()

    # ─────────────────────────────────────────────────────────────────────────
    # BUILD INDEX — Latih ketiga vectorizer dari semua template
    # ─────────────────────────────────────────────────────────────────────────
    def _build_index(self):
        """Bangun tiga TF-IDF matrix: keyword, question, response."""
        keywords = []
        for t in self.templates:
            kw = t["keyword"]
            if isinstance(kw, list):
                kw_str = " ".join(kw)
            else:
                kw_str = kw
            synonyms_str = " ".join(t.get("synonyms", []))
            
            # PENTING: Preprocess juga keyword & sinonim agar sinkron dengan pesan user
            combined_kw = self._preprocess(kw_str + " " + synonyms_str)
            keywords.append(combined_kw)
        
        questions = [t["question"] for t in self.templates]
        responses = [t["response"][:200] for t in self.templates]  # Ambil 200 char pertama saja

        self.mat_keyword  = self.vec_keyword.fit_transform(keywords)
        self.mat_question = self.vec_question.fit_transform(questions)
        self.mat_response = self.vec_response.fit_transform(responses)

    # ─────────────────────────────────────────────────────────────────────────
    # PREDICT — Cari template terbaik untuk pesan masuk (dari 8 bubble konteks)
    # ─────────────────────────────────────────────────────────────────────────
    def predict(self, message: str) -> dict:
        """
        Input : teks konteks (8 bubble chat digabung) dari user
        Output: dict berisi template_id, confidence, reply_text, human_note
        """
        cleaned = self._preprocess(message)
        words = cleaned.split()

        # --- GREETING BYPASS RULE ---
        # Jika semua kata di dalam pesan (setelah diproses) adalah kata sapaan
        # (Kita longgarkan panjangnya karena backend Golang menduplikasi pesan terakhir jadi 3x lipat)
        if 0 < len(words) <= 15 and all(w in GREETING_WORDS for w in words):
            best_tmpl = next((t for t in self.templates if t["id"] == "c0"), self.templates[0])
            human_note = self._generate_human_note(message, best_tmpl, 1.0)
            return {
                "template_id": best_tmpl["id"],
                "confidence" : 1.0,
                "reply_text" : best_tmpl["response"],
                "human_note" : human_note,
                "category"   : best_tmpl["category"],
            }

        # --- Hitung similarity terhadap ketiga slot ---
        v_kw = self.vec_keyword.transform([cleaned])
        v_q  = self.vec_question.transform([cleaned])
        v_r  = self.vec_response.transform([cleaned])

        sim_kw = cosine_similarity(v_kw, self.mat_keyword)[0]
        sim_q  = cosine_similarity(v_q,  self.mat_question)[0]
        sim_r  = cosine_similarity(v_r,  self.mat_response)[0]

        # --- Gabungkan dengan bobot ---
        combined = (
            self.WEIGHT_KEYWORD  * sim_kw +
            self.WEIGHT_QUESTION * sim_q  +
            self.WEIGHT_RESPONSE * sim_r
        )

        # --- Keyword Exact-Match Boost ---
        combined = self._apply_keyword_boost(cleaned, combined)

        best_idx   = int(np.argmax(combined))
        best_score = float(combined[best_idx])
        best_tmpl  = self.templates[best_idx]

        # Buat catatan manusiawi
        human_note = self._generate_human_note(message, best_tmpl, best_score)

        return {
            "template_id": best_tmpl["id"],
            "confidence" : round(best_score, 4),
            "reply_text" : best_tmpl["response"],
            "human_note" : human_note,
            "category"   : best_tmpl["category"],
        }

    # ─────────────────────────────────────────────────────────────────────────
    # KEYWORD BOOST — Tambah skor jika keyword atau sinonim eksak ada di pesan
    # ─────────────────────────────────────────────────────────────────────────
    def _apply_keyword_boost(self, cleaned_msg: str, scores: np.ndarray) -> np.ndarray:
        """
        Scan setiap template: jika keyword atau salah satu sinonim ditemukan
        secara eksak (sebagai kata utuh) di dalam pesan, tambah KEYWORD_BOOST.
        """
        boosted = scores.copy()
        words_in_msg = set(cleaned_msg.split())

        for idx, tmpl in enumerate(self.templates):
            kw = tmpl["keyword"]
            if isinstance(kw, list):
                kw_str = " ".join(kw)
            else:
                kw_str = kw
            syn_str = " ".join(tmpl.get("synonyms", []))
            
            # Normalisasi kata kunci template agar sama dengan format pesan user
            normalized_kw = self._preprocess(kw_str + " " + syn_str)
            all_kw = set(normalized_kw.split())

            # Cek berapa banyak kata kunci yang ada di pesan
            matches = all_kw & words_in_msg
            if matches:
                # Boost proporsional dengan jumlah kecocokan
                boost = self.KEYWORD_BOOST * min(len(matches) / max(len(all_kw), 1), 1.0)
                boosted[idx] = min(boosted[idx] + boost, 1.0)

        return boosted

    # ─────────────────────────────────────────────────────────────────────────
    # PREPROCESS — Bersihkan + normalisasi slang sebelum diproses
    # ─────────────────────────────────────────────────────────────────────────
    def _preprocess(self, text: str) -> str:
        """
        1. Lowercase
        2. Hapus tanda baca
        3. Normalisasi slang kata per kata
        4. Normalisasi spasi
        5. Hapus separator antar bubble ("  |  ")
        """
        text = text.lower().strip()
        text = text.replace("|", " ")              # Hapus separator bubble
        text = re.sub(r"[^\w\s]", " ", text)       # Hapus tanda baca
        text = re.sub(r"\s+", " ", text).strip()   # Normalisasi spasi

        # Normalisasi slang kata per kata
        words = text.split()
        normalized = [SLANG_MAP.get(w, w) for w in words]
        return " ".join(normalized)

    # ─────────────────────────────────────────────────────────────────────────
    # HUMAN NOTE — Buat catatan tambahan kontekstual layaknya manusia
    # ─────────────────────────────────────────────────────────────────────────
    def _generate_human_note(self, original_msg: str, template: dict, confidence: float) -> str:
        """
        Buat catatan tambahan yang terasa manusiawi berdasarkan:
        - Emosi/urgensi yang terdeteksi dari pesan
        - Kategori template yang cocok
        - Waktu sekarang (salam pagi/siang/sore/malam)
        - Tingkat keyakinan model
        """
        msg_lower = original_msg.lower()
        parts = []

        detected_emotion = self._detect_emotion(msg_lower)
        greeting         = self._get_time_greeting()
        emotion_note     = random.choice(EMOTION_NOTES.get(detected_emotion, EMOTION_NOTES["neutral"]))
        cat_notes        = CATEGORY_NOTES.get(template["category"], [])
        category_note    = random.choice(cat_notes) if cat_notes else ""

        # Kalau confidence rendah, tambahkan kalimat klarifikasi
        if confidence < 0.5:
            parts.append(
                "Kami memastikan jawaban di atas sesuai dengan pertanyaan Kakak. "
                "Jika belum tepat, tolong jelaskan lebih detail ya Kak."
            )

        if greeting:
            parts.append(greeting)
        parts.append(emotion_note)
        if category_note:
            parts.append(category_note)

        return " ".join(parts)

    def _detect_emotion(self, msg: str) -> str:
        """Deteksi emosi dari kata kunci dalam pesan."""
        for emotion, keywords in EMOTION_KEYWORDS.items():
            if any(kw in msg for kw in keywords):
                return emotion
        return "neutral"

    def _get_time_greeting(self) -> str:
        """Salam berdasarkan jam sekarang (WIB = UTC+7)."""
        hour = datetime.now().hour
        if 5 <= hour < 11:
            return TIME_GREETINGS["pagi"]
        elif 11 <= hour < 15:
            return TIME_GREETINGS["siang"]
        elif 15 <= hour < 19:
            return TIME_GREETINGS["sore"]
        else:
            return TIME_GREETINGS["malam"]


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON — Satu instance model untuk seluruh aplikasi
# ─────────────────────────────────────────────────────────────────────────────
_model_instance = None


def get_model() -> HelpDeskAIModel:
    """Lazy initialization — model hanya dibuat satu kali."""
    global _model_instance
    if _model_instance is None:
        print("[AI] Menginisialisasi model TF-IDF HelpDesk Enhanced v2...")
        _model_instance = HelpDeskAIModel()
        print(f"[AI] Model siap! {len(CANNED_RESPONSES)} template dimuat dengan 3 slot TF-IDF.")
    return _model_instance
