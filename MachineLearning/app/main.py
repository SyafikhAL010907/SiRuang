# =============================================================================
# FILE: MachineLearning/main.py
# DESKRIPSI: FastAPI server — endpoint utama ML service HelpDesk Admisi UNJ
#
# ⚠️  CARA DISABLE SELURUH FITUR AI:
#   Lihat panduan lengkap di: MachineLearning/DISABLE_GUIDE.md
#
# ▶️  CARA JALANKAN:
#   python main.py          (langsung)
#   uvicorn main:app --reload (development)
# =============================================================================

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn

# Import model AI dari folder core
from app.core.model import get_model

# =============================================================================
# INISIALISASI APP
# =============================================================================
app = FastAPI(
    title="HelpDesk Admisi UNJ — AI Service",
    description="Machine Learning auto-response service untuk Admin HelpDesk UNJ",
    version="1.0.0",
)

# CORS — izinkan request dari Go backend (localhost:8080)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# SCHEMA REQUEST / RESPONSE
# =============================================================================
class PredictRequest(BaseModel):
    """Request body untuk endpoint /predict"""
    message: str                   # Pesan dari user
    room_id: Optional[int] = None  # ID room (opsional, untuk logging)


class PredictResponse(BaseModel):
    """Response dari endpoint /predict"""
    template_id: str       # ID template yang dipilih (c1–c8)
    confidence: float      # Tingkat keyakinan model (0.0–1.0)
    reply_text: str        # Teks template utama
    human_note: str        # Catatan tambahan kontekstual
    category: str          # Kategori template (Pendaftaran, Dokumen, dll)


# =============================================================================
# STARTUP — Load model saat server pertama kali start
# =============================================================================
@app.on_event("startup")
async def startup_event():
    """Pre-load model supaya request pertama tidak lambat."""
    print("[AI Service] Starting up HelpDesk AI...")
    get_model()  # Inisialisasi model TF-IDF
    print("[AI Service] ✅ Siap menerima request!")


# =============================================================================
# ENDPOINTS
# =============================================================================

# ─── GET /health ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    Go backend menggunakan ini untuk cek apakah ML service aktif.
    """
    return {
        "status": "ok",
        "service": "HelpDesk Admisi AI",
        "version": "1.0.0",
    }


# ─── POST /predict ────────────────────────────────────────────────────────────
@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    """
    Endpoint utama: terima pesan user, kembalikan template terbaik.

    Flow:
      1. Validasi input
      2. Panggil model TF-IDF
      3. Generate human-like note
      4. Return hasil ke Go backend
    """
    # Validasi: pesan tidak boleh kosong
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Pesan tidak boleh kosong")

    # Validasi: pesan tidak boleh terlalu pendek (kurang dari 3 karakter)
    if len(req.message.strip()) < 3:
        raise HTTPException(status_code=400, detail="Pesan terlalu pendek")

    try:
        model = get_model()
        result = model.predict(req.message)

        # Log request (untuk monitoring)
        print(
            f"[AI] Room#{req.room_id or '?'} | "
            f"Msg: '{req.message[:50]}...' | "
            f"Template: {result['template_id']} | "
            f"Confidence: {result['confidence']:.2f}"
        )

        return PredictResponse(
            template_id=result["template_id"],
            confidence=result["confidence"],
            reply_text=result["reply_text"],
            human_note=result["human_note"],
            category=result["category"],
        )

    except Exception as e:
        print(f"[AI ERROR] {e}")
        raise HTTPException(status_code=500, detail=f"Gagal proses prediksi: {str(e)}")


# ─── GET /templates ───────────────────────────────────────────────────────────
@app.get("/templates")
async def list_templates():
    """
    Daftar semua template yang tersedia.
    Berguna untuk debugging dan verifikasi sync dengan frontend.
    """
    from app.core.templates import CANNED_RESPONSES
    return {
        "count": len(CANNED_RESPONSES),
        "templates": [
            {
                "id": t["id"],
                "category": t["category"],
                "keyword": t["keyword"],
                "question": t["question"],
            }
            for t in CANNED_RESPONSES
        ],
    }


# =============================================================================
# ENTRYPOINT
# =============================================================================
if __name__ == "__main__":
    print("=" * 60)
    print("  HelpDesk Admisi UNJ — AI Auto-Response Service")
    print("  Running at: http://localhost:8000")
    print("  Docs at:    http://localhost:8000/docs")
    print("=" * 60)
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # Ganti True kalau mau development mode
        log_level="info",
    )
