package handlers

// =============================================================================
// FILE: BackEnd/internal/handlers/ai.go
// DESKRIPSI: Handler untuk fitur AI Auto-Response HelpDesk Admisi UNJ
//
// ⚠️  CARA DISABLE FITUR AI INI SEPENUHNYA (tanpa hapus code):
//   Di file BackEnd/cmd/api/main.go, comment baris:
//     handlers.StartAIWorker(os.Getenv("ML_SERVICE_URL"))  // ← comment ini
//   Dan comment route-nya:
//     admin.POST("/ai/toggle", handlers.ToggleAI)          // ← comment ini
//     admin.GET("/ai/status", handlers.GetAIStatus)        // ← comment ini
//   Detail lengkap: MachineLearning/DISABLE_GUIDE.md
// =============================================================================

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"helpdesk-backend/internal/database"

	"github.com/gin-gonic/gin"
)

// =============================================================================
// STATE GLOBAL AI — Dilindungi mutex agar aman untuk concurrent access
// =============================================================================
var (
	aiEnabled    bool          // Status AI ON/OFF
	aiAdminGmail string        // Gmail admin yang mengaktifkan AI
	aiMutex      sync.RWMutex // Mutex untuk concurrent safety

	// Anti-spam: simpan waktu terakhir AI auto-reply per room
	// Key: room_id, Value: waktu terakhir reply
	lastReplied   = make(map[int]time.Time)
	lastRepliedMu sync.Mutex
)

// =============================================================================
// SCHEMA — Struktur data request/response ke ML Service
// =============================================================================
type mlRequest struct {
	Message string `json:"message"`
	RoomID  int    `json:"room_id"`
}

type mlResponse struct {
	TemplateID string  `json:"template_id"`
	Confidence float64 `json:"confidence"`
	ReplyText  string  `json:"reply_text"`
	HumanNote  string  `json:"human_note"`
	Category   string  `json:"category"`
}

// =============================================================================
// ENDPOINT: GET /api/admin/ai/status
// Kembalikan status AI aktif/non-aktif ke frontend
// =============================================================================
func GetAIStatus(c *gin.Context) {
	aiMutex.RLock()
	enabled := aiEnabled
	gmail := aiAdminGmail
	aiMutex.RUnlock()

	c.JSON(http.StatusOK, gin.H{
		"enabled":       enabled,
		"admin_gmail":   gmail,
		"message":       map[bool]string{true: "AI Auto-Response Aktif", false: "AI Auto-Response Non-Aktif"}[enabled],
	})
}

// =============================================================================
// ENDPOINT: POST /api/admin/ai/toggle
// Toggle AI ON/OFF dari dashboard admin
// Body: { "enabled": true/false }
// =============================================================================
func ToggleAI(c *gin.Context) {
	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format request tidak valid"})
		return
	}

	// Ambil gmail admin dari context JWT (di-set oleh middleware)
	gmailRaw, exists := c.Get("gmail")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin gmail tidak ditemukan"})
		return
	}
	adminGmail := fmt.Sprintf("%v", gmailRaw)

	// Update state AI
	aiMutex.Lock()
	aiEnabled = req.Enabled
	if req.Enabled {
		aiAdminGmail = adminGmail
	}
	aiMutex.Unlock()

	// Reset anti-spam tracker saat AI dinyalakan ulang
	if req.Enabled {
		lastRepliedMu.Lock()
		lastReplied = make(map[int]time.Time)
		lastRepliedMu.Unlock()
	}

	status := "Non-Aktif"
	if req.Enabled {
		status = "Aktif"
	}
	log.Printf("[AI] Status diubah menjadi: %s oleh %s", status, adminGmail)

	c.JSON(http.StatusOK, gin.H{
		"enabled": req.Enabled,
		"message": fmt.Sprintf("AI Auto-Response berhasil di%s", map[bool]string{true: "aktifkan", false: "nonaktifkan"}[req.Enabled]),
	})
}

// =============================================================================
// BACKGROUND WORKER — Polling otomatis setiap 5 detik
//
// ⚠️  DISABLE: Comment baris `handlers.StartAIWorker(...)` di main.go
//    Fungsi ini TIDAK AKAN JALAN jika tidak dipanggil dari main.go
// =============================================================================
func StartAIWorker(mlServiceURL string) {
	if mlServiceURL == "" {
		mlServiceURL = "http://localhost:8000"
	}

	log.Printf("[AI Worker] Dimulai, akan polling setiap 5 detik ke: %s", mlServiceURL)

	go func() {
		// Tunggu 3 detik biar server Go fully ready dulu
		time.Sleep(3 * time.Second)

		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			// Cek apakah AI aktif
			aiMutex.RLock()
			enabled := aiEnabled
			aiMutex.RUnlock()

			if !enabled {
				continue // AI mati, skip poll
			}

			// Proses semua room yang ada pesan baru dari user
			processAllRooms(mlServiceURL)
		}
	}()
}

// =============================================================================
// PROCESS ALL ROOMS — Cek semua room, cari yang perlu auto-reply
// =============================================================================
func processAllRooms(mlServiceURL string) {
	// ── Hybrid Mode: Cek Jam Kerja WIB (UTC+7) ───────────────────────────────
	loc := time.FixedZone("WIB", 7*3600)
	now := time.Now().In(loc)

	// Jam Kerja: Senin (1) - Jumat (5), pukul 09:00 sampai 15:59 WIB
	isWorkDay := now.Weekday() >= time.Monday && now.Weekday() <= time.Friday
	isWorkHour := now.Hour() >= 9 && now.Hour() < 16

	query := "SELECT id FROM chat_rooms" // Mode Patroli (Luar Jam Kerja)

	if isWorkDay && isWorkHour {
		// Mode Efisien (Jam Kerja): Cuma ambil yang aktif 1 menit terakhir
		// Supaya server UNJ tetep enteng pas pendaftar lagi rame-ramenya
		query = "SELECT id FROM chat_rooms WHERE updated_at > NOW() - INTERVAL 1 MINUTE"
		log.Printf("[AI Worker] Jam Kerja WIB: Menggunakan Mode Efisien (Filter 1 Menit)")
	} else {
		log.Printf("[AI Worker] Luar Jam Kerja: Menggunakan Mode Patroli (Cek Semua)")
	}

	rows, err := database.DB.Query(query)
	if err != nil {
		log.Printf("[AI Worker] Gagal ambil daftar room: %v", err)
		return
	}
	defer rows.Close()

	var roomIDs []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err == nil {
			roomIDs = append(roomIDs, id)
		}
	}

	// Proses setiap room secara paralel dengan Goroutine
	for _, roomID := range roomIDs {
		go processRoom(roomID, mlServiceURL)
	}
}

// =============================================================================
// PROCESS ROOM — Logic utama auto-reply untuk satu room
// =============================================================================
func processRoom(roomID int, mlServiceURL string) {
	// ── Anti-Spam: Tunggu minimal 10 detik antar reply per room ──────────────
	lastRepliedMu.Lock()
	if lastTime, ok := lastReplied[roomID]; ok {
		if time.Since(lastTime) < 10*time.Second {
			lastRepliedMu.Unlock()
			return
		}
	}
	lastRepliedMu.Unlock()

	// ── Ambil user_gmail dari room (untuk cek siapa yang kirim) ─────────────
	var userGmail string
	err := database.DB.QueryRow(
		"SELECT user_gmail FROM chat_rooms WHERE id = ?", roomID,
	).Scan(&userGmail)
	if err != nil {
		return
	}

	// ── Ambil pesan terakhir untuk cek apakah user yang kirim ────────────────
	var lastSenderGmail, lastMessage string
	err = database.DB.QueryRow(`
		SELECT sender_gmail, message 
		FROM chat_messages 
		WHERE room_id = ? 
		ORDER BY created_at DESC 
		LIMIT 1
	`, roomID).Scan(&lastSenderGmail, &lastMessage)
	if err != nil {
		return // Room kosong atau error
	}

	// ── Cek: Hanya reply jika pesan terakhir dari USER (bukan admin) ────────
	if lastSenderGmail != userGmail {
		return // Admin sudah reply atau room masih kosong
	}

	// ── Smart Context: Ambil pesan beruntun dari user saja sejak balasan admin terakhir ──
	rows, err := database.DB.Query(`
		SELECT sender_gmail, message 
		FROM chat_messages 
		WHERE room_id = ? 
		ORDER BY created_at DESC 
		LIMIT 8
	`, roomID)
	if err != nil {
		return
	}
	defer rows.Close()

	var userMessages []string
	for rows.Next() {
		var sGmail, msg string
		if err := rows.Scan(&sGmail, &msg); err == nil {
			// Jika ketemu pesan yang BUKAN dari user (berarti admin/AI sudah balas), STOP ambil konteks
			if sGmail != userGmail {
				break 
			}
			// Masukkan pesan user (yang panjangnya cukup) ke list
			if len(msg) >= 3 {
				userMessages = append(userMessages, msg)
			}
		}
	}

	if len(userMessages) == 0 {
		return
	}

	// Balik urutan: dari yang paling lama ke paling baru (kronologis)
	for i, j := 0, len(userMessages)-1; i < j; i, j = i+1, j-1 {
		userMessages[i], userMessages[j] = userMessages[j], userMessages[i]
	}

	// Gabungkan semua pesan user beruntun jadi satu konteks
	contextMessage := ""
	for idx, msg := range userMessages {
		if idx > 0 {
			contextMessage += " | "
		}
		contextMessage += msg
	}
	// Beri bobot extra pada pesan paling baru agar TF-IDF lebih akurat
	latestMsg := userMessages[len(userMessages)-1]
	contextMessage += " | " + latestMsg + " | " + latestMsg

	// ── Skip konteks terlalu pendek (kemungkinan bukan pertanyaan) ───────────
	if len(lastMessage) < 3 {
		return
	}

	// ── Ambil admin gmail yang akan digunakan untuk send reply ──────────────
	aiMutex.RLock()
	adminGmail := aiAdminGmail
	aiMutex.RUnlock()

	if adminGmail == "" {
		// Fallback: ambil dari DB jika state kosong
		database.DB.QueryRow(
			"SELECT gmail FROM authentication WHERE role = 'admin' LIMIT 1",
		).Scan(&adminGmail)
	}
	if adminGmail == "" {
		return
	}

	// ── Panggil ML Service dengan konteks 8 pesan terakhir ──────────────────
	mlResp, err := callMLService(mlServiceURL, contextMessage, roomID)
	if err != nil {
		log.Printf("[AI Worker] Gagal panggil ML service untuk room %d: %v", roomID, err)
		return
	}

	// ── Threshold confidence: skip jika model kurang yakin (< 35%) ──────────
	// Ubah nilai 0.35 untuk sesuaikan sensitivitas AI
	const confidenceThreshold = 0.35
	if mlResp.Confidence < confidenceThreshold {
		log.Printf("[AI Worker] Room %d: confidence %.2f terlalu rendah, skip auto-reply", roomID, mlResp.Confidence)
		return
	}

	// ── Rakit balasan: Template + Catatan Tambahan ───────────────────────────
	fullReply := mlResp.ReplyText
	if mlResp.HumanNote != "" {
		fullReply += "\n\n📝 Catatan Tambahan:\n" + mlResp.HumanNote
	}

	// ── Simpan auto-reply ke database ───────────────────────────────────────
	_, err = database.DB.Exec(
		"INSERT INTO chat_messages (room_id, sender_gmail, message, message_type) VALUES (?, ?, ?, 'text')",
		roomID, adminGmail, fullReply,
	)
	if err != nil {
		log.Printf("[AI Worker] Gagal simpan auto-reply room %d: %v", roomID, err)
		return
	}

	// ── Update last_message di chat_rooms ───────────────────────────────────
	preview := fullReply
	if len(preview) > 100 {
		preview = preview[:100] + "..."
	}
	database.DB.Exec(
		"UPDATE chat_rooms SET last_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		preview, roomID,
	)

	// ── Update anti-spam tracker ─────────────────────────────────────────────
	lastRepliedMu.Lock()
	lastReplied[roomID] = time.Now()
	lastRepliedMu.Unlock()

	log.Printf("[AI Worker] ✅ Auto-reply terkirim ke Room %d (template: %s, confidence: %.2f)",
		roomID, mlResp.TemplateID, mlResp.Confidence)
}

// =============================================================================
// CALL ML SERVICE — Kirim request HTTP ke Python FastAPI
// =============================================================================
func callMLService(mlServiceURL string, message string, roomID int) (*mlResponse, error) {
	reqBody, err := json.Marshal(mlRequest{
		Message: message,
		RoomID:  roomID,
	})
	if err != nil {
		return nil, fmt.Errorf("gagal marshal request: %w", err)
	}

	// Timeout 5 detik biar tidak blocking terlalu lama
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Post(
		mlServiceURL+"/predict",
		"application/json",
		bytes.NewReader(reqBody),
	)
	if err != nil {
		return nil, fmt.Errorf("gagal koneksi ke ML service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ML service error %d: %s", resp.StatusCode, string(body))
	}

	var result mlResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("gagal decode response ML: %w", err)
	}

	return &result, nil
}
