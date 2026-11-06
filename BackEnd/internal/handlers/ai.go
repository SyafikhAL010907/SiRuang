package handlers

// =============================================================================
// FILE: BackEnd/internal/handlers/ai.go
// DESKRIPSI: Handler untuk fitur AI Auto-Response HelpDesk Admisi UNJ
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
	aiEnabled         bool
	aiAdminIdentifier string
	aiMutex           sync.RWMutex

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
// =============================================================================
func GetAIStatus(c *gin.Context) {
	aiMutex.RLock()
	enabled := aiEnabled
	identifier := aiAdminIdentifier
	aiMutex.RUnlock()

	c.JSON(http.StatusOK, gin.H{
		"enabled":          enabled,
		"admin_identifier": identifier,
		"admin_gmail":      identifier, // Backward-compat
		"message":          map[bool]string{true: "AI Auto-Response Aktif", false: "AI Auto-Response Non-Aktif"}[enabled],
	})
}

// =============================================================================
// ENDPOINT: POST /api/admin/ai/toggle
// =============================================================================
func ToggleAI(c *gin.Context) {
	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format request tidak valid"})
		return
	}

	identifierRaw, exists := c.Get("identifier")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin identifier tidak ditemukan"})
		return
	}
	adminIdentifier := fmt.Sprintf("%v", identifierRaw)

	aiMutex.Lock()
	aiEnabled = req.Enabled
	if req.Enabled {
		aiAdminIdentifier = adminIdentifier
	}
	aiMutex.Unlock()

	if req.Enabled {
		lastRepliedMu.Lock()
		lastReplied = make(map[int]time.Time)
		lastRepliedMu.Unlock()
	}

	status := "Non-Aktif"
	if req.Enabled {
		status = "Aktif"
	}
	log.Printf("[AI] Status diubah menjadi: %s oleh %s", status, adminIdentifier)

	c.JSON(http.StatusOK, gin.H{
		"enabled": req.Enabled,
		"message": fmt.Sprintf("AI Auto-Response berhasil di%s", map[bool]string{true: "aktifkan", false: "nonaktifkan"}[req.Enabled]),
	})
}

// =============================================================================
// BACKGROUND WORKER — Polling otomatis setiap 5 detik
// =============================================================================
func StartAIWorker(mlServiceURL string) {
	if mlServiceURL == "" {
		mlServiceURL = "http://localhost:8000"
	}

	log.Printf("[AI Worker] Dimulai, akan polling setiap 5 detik ke: %s", mlServiceURL)

	go func() {
		time.Sleep(3 * time.Second)

		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			aiMutex.RLock()
			enabled := aiEnabled
			aiMutex.RUnlock()

			if !enabled {
				continue
			}

			if database.DB == nil {
				continue
			}

			processAllRooms(mlServiceURL)
		}
	}()
}

// =============================================================================
// PROCESS ALL ROOMS
// =============================================================================
func processAllRooms(mlServiceURL string) {
	loc := time.FixedZone("WIB", 7*3600)
	now := time.Now().In(loc)

	isWorkDay := now.Weekday() >= time.Monday && now.Weekday() <= time.Friday
	isWorkHour := now.Hour() >= 9 && now.Hour() < 16

	query := "SELECT id FROM chat_rooms"

	if isWorkDay && isWorkHour {
		// PostgreSQL interval syntax
		query = "SELECT id FROM chat_rooms WHERE updated_at > NOW() - INTERVAL '1 MINUTE'"
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

	for _, roomID := range roomIDs {
		go processRoom(roomID, mlServiceURL)
	}
}

// =============================================================================
// PROCESS ROOM
// =============================================================================
func processRoom(roomID int, mlServiceURL string) {
	lastRepliedMu.Lock()
	if lastTime, ok := lastReplied[roomID]; ok {
		if time.Since(lastTime) < 10*time.Second {
			lastRepliedMu.Unlock()
			return
		}
	}
	lastRepliedMu.Unlock()

	var userIdentifier string
	err := database.DB.QueryRow(
		"SELECT user_identifier FROM chat_rooms WHERE id = $1", roomID,
	).Scan(&userIdentifier)
	if err != nil {
		return
	}

	var lastSenderIdentifier, lastMessage string
	err = database.DB.QueryRow(`
		SELECT sender_identifier, message 
		FROM chat_messages 
		WHERE room_id = $1 
		ORDER BY created_at DESC 
		LIMIT 1
	`, roomID).Scan(&lastSenderIdentifier, &lastMessage)
	if err != nil {
		return
	}

	if lastSenderIdentifier != userIdentifier {
		return
	}

	rows, err := database.DB.Query(`
		SELECT sender_identifier, message 
		FROM chat_messages 
		WHERE room_id = $1 
		ORDER BY created_at DESC 
		LIMIT 8
	`, roomID)
	if err != nil {
		return
	}
	defer rows.Close()

	var userMessages []string
	for rows.Next() {
		var sID, msg string
		if err := rows.Scan(&sID, &msg); err == nil {
			if sID != userIdentifier {
				break
			}
			if len(msg) >= 3 {
				userMessages = append(userMessages, msg)
			}
		}
	}

	if len(userMessages) == 0 {
		return
	}

	for i, j := 0, len(userMessages)-1; i < j; i, j = i+1, j-1 {
		userMessages[i], userMessages[j] = userMessages[j], userMessages[i]
	}

	contextMessage := ""
	for idx, msg := range userMessages {
		if idx > 0 {
			contextMessage += " | "
		}
		contextMessage += msg
	}
	latestMsg := userMessages[len(userMessages)-1]
	contextMessage += " | " + latestMsg + " | " + latestMsg

	if len(lastMessage) < 3 {
		return
	}

	aiMutex.RLock()
	adminIdentifier := aiAdminIdentifier
	aiMutex.RUnlock()

	if adminIdentifier == "" {
		database.DB.QueryRow(
			"SELECT identifier FROM authentication WHERE role = 'admin' LIMIT 1",
		).Scan(&adminIdentifier)
	}
	if adminIdentifier == "" {
		return
	}

	mlResp, err := callMLService(mlServiceURL, contextMessage, roomID)
	if err != nil {
		log.Printf("[AI Worker] Gagal panggil ML service untuk room %d: %v", roomID, err)
		return
	}

	const confidenceThreshold = 0.35
	if mlResp.Confidence < confidenceThreshold {
		log.Printf("[AI Worker] Room %d: confidence %.2f terlalu rendah, skip auto-reply", roomID, mlResp.Confidence)
		return
	}

	fullReply := mlResp.ReplyText
	if mlResp.HumanNote != "" {
		fullReply += "\n\n📝 Catatan Tambahan:\n" + mlResp.HumanNote
	}

	_, err = database.DB.Exec(
		"INSERT INTO chat_messages (room_id, sender_identifier, message, message_type) VALUES ($1, $2, $3, 'text')",
		roomID, adminIdentifier, fullReply,
	)
	if err != nil {
		log.Printf("[AI Worker] Gagal simpan auto-reply room %d: %v", roomID, err)
		return
	}

	preview := fullReply
	if len(preview) > 100 {
		preview = preview[:100] + "..."
	}
	database.DB.Exec(
		"UPDATE chat_rooms SET last_message = $1, updated_at = NOW() WHERE id = $2",
		preview, roomID,
	)

	lastRepliedMu.Lock()
	lastReplied[roomID] = time.Now()
	lastRepliedMu.Unlock()

	log.Printf("[AI Worker] ✅ Auto-reply terkirim ke Room %d (template: %s, confidence: %.2f)",
		roomID, mlResp.TemplateID, mlResp.Confidence)
}

// =============================================================================
// CALL ML SERVICE
// =============================================================================
func callMLService(mlServiceURL string, message string, roomID int) (*mlResponse, error) {
	reqBody, err := json.Marshal(mlRequest{
		Message: message,
		RoomID:  roomID,
	})
	if err != nil {
		return nil, fmt.Errorf("gagal marshal request: %w", err)
	}

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
