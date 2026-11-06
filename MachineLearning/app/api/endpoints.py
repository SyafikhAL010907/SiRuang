# =============================================================================
# FILE: MachineLearning/app/api/endpoints.py
# DESKRIPSI: Draft API Endpoints (FastAPI) untuk integrasi dengan Golang Backend.
# 
# CATATAN: 
# Kode di bawah sengaja di-comment (dimatikan) sesuai request. 
# Jika nanti aplikasi mau di-online-kan dan AI butuh jalan sebagai 
# Microservice tersendiri, tinggal uncomment kode di bawah dan jalankan 
# server uvicorn.
# =============================================================================

# from fastapi import APIRouter, HTTPException
# from pydantic import BaseModel
# from app.core.model import get_model
# import logging
# 
# router = APIRouter()
# logger = logging.getLogger(__name__)
# 
# # Schema request dari Golang ke Python
# class ChatRequest(BaseModel):
#     message: str
#     context: list[str] = [] # Optional context dari bubble chat sebelumnya
# 
# # Schema response dari Python ke Golang
# class ChatResponse(BaseModel):
#     template_id: int
#     reply_text: str
#     human_note: str
#     confidence: float
#     category: str
# 
# @router.post("/predict", response_model=ChatResponse)
# async def predict_chat(req: ChatRequest):
#     """
#     Endpoint utama untuk meminta prediksi auto-response.
#     Golang backend akan nembak ke sini ngirim text user, 
#     lalu ML service ini balikin response terbaik.
#     """
#     try:
#         # Gabungkan message dengan konteks jika ada
#         full_text = " ".join(req.context[-7:]) + " " + req.message
#         
#         # Panggil model AI
#         model = get_model()
#         result = model.predict(full_text)
#         
#         return ChatResponse(
#             template_id=result["template_id"],
#             reply_text=result["reply_text"],
#             human_note=result["human_note"],
#             confidence=result["confidence"],
#             category=result["category"]
#         )
#     except Exception as e:
#         logger.error(f"Error during prediction: {e}")
#         raise HTTPException(status_code=500, detail="Internal ML Server Error")
# 
# @router.get("/status")
# async def get_status():
#     """
#     Endpoint untuk ngecek apakah service ML ini nyala dan siap dipakai.
#     Biasanya dipanggil oleh backend Golang buat health-check.
#     """
#     return {"status": "online", "model": "HelpDeskAI-v2"}
